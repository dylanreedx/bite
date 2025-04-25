import {db} from '../db.ts';
import {eq} from 'drizzle-orm';
import {foodTable, servingsTable} from '../schema.ts';
// Remove direct FatSecret client import if no longer needed elsewhere here
// import FatSecret from 'fatsecret.js';

// Get Proxy URL from environment variables (MUST be set in Vercel)
const PROXY_URL = process.env.FATSECRET_PROXY_URL;

// Helper to call the proxy for food details with retry logic
async function getFoodViaProxyWithRetry(
  foodId: number,
  retries = 3
): Promise<any> {
  if (!PROXY_URL) {
    throw new Error(
      'FATSECRET_PROXY_URL environment variable is not set. Cannot fetch external food data.'
    );
  }

  const url = `${PROXY_URL}/get-food?id=${foodId}`;
  console.log(`Calling proxy to get food details: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Handle potential rate limiting from the proxy/FatSecret
      if (retries > 0 && response.status === 429) {
        // 429 Too Many Requests
        console.warn(
          `Rate limit hit via proxy for food_id=${foodId}. Waiting 60s, retries left: ${retries}`
        );
        await new Promise((resolve) => setTimeout(resolve, 60000));
        return getFoodViaProxyWithRetry(foodId, retries - 1);
      }
      // Throw an error for other non-ok statuses
      throw new Error(
        `Proxy error fetching food ${foodId}: ${response.status} ${response.statusText}`
      );
    }

    return await response.json(); // Parse the JSON response from the proxy
  } catch (error: any) {
    // Catch fetch errors or errors thrown above
    console.error(`Error fetching food ${foodId} via proxy: ${error.message}`);
    // If retries are exhausted or it's not a retryable error, re-throw
    throw error;
  }
}

export async function fetchAndStoreServingsOnDemand(foodId: number) {
  // ... (keep the initial DB checks for food and existing servings) ...
  const [food] = await db
    .select({food_id: foodTable.food_id}) // Select only needed field
    .from(foodTable)
    .where(eq(foodTable.food_id, foodId))
    .limit(1);

  if (!food) {
    console.log(`Food ${foodId} not found locally. Cannot fetch servings.`);
    // Or potentially call fetchAndStoreFoodOnDemand first? Depends on desired flow.
    return [];
  }

  const existingServings = await db
    .select({serving_id: servingsTable.serving_id}) // Select only needed field
    .from(servingsTable)
    .where(eq(servingsTable.food_id, foodId))
    .limit(1); // Just need to know if any exist

  if (existingServings.length > 0) {
    console.log(`Servings for ${foodId} found locally.`);
    // Retrieve and return all servings if needed
    return db
      .select()
      .from(servingsTable)
      .where(eq(servingsTable.food_id, foodId));
  }

  console.log(
    `Servings for ${foodId} not found locally. Fetching via proxy...`
  );
  let fetchedFoodData;
  try {
    // *** Replace direct call with proxy call ***
    fetchedFoodData = await getFoodViaProxyWithRetry(foodId);
  } catch (err) {
    console.error(
      `Failed to fetch food_id=${foodId} via proxy after retries`,
      err
    );
    // Decide how to handle failure: return empty, throw, etc.
    return []; // Return empty array if fetch fails
  }

  // *** IMPORTANT: Adapt parsing based on proxy response structure ***
  // Check the actual structure returned by fatSecretClient.getFood in your proxy
  const servingsFromApi = fetchedFoodData?.servings?.serving; // Example structure, adjust!
  const foodDetailsFromApi = fetchedFoodData?.food; // Example structure, adjust!

  if (
    !servingsFromApi ||
    !Array.isArray(servingsFromApi) ||
    servingsFromApi.length === 0
  ) {
    console.error(
      `No valid serving data received from proxy for food_id=${foodId}`
    );
    return []; // Return empty if no servings found via proxy
  }

  // Optionally update basic food info if needed (use foodDetailsFromApi)
  if (foodDetailsFromApi) {
    await db
      .update(foodTable)
      .set({
        food_name: foodDetailsFromApi.food_name, // Adjust field names
        brand_name: foodDetailsFromApi.brand_name || null,
        food_type: foodDetailsFromApi.food_type,
        food_url: foodDetailsFromApi.food_url,
        // food_sub_categories: '[]', // Handle as needed
      })
      .where(eq(foodTable.food_id, foodId));
  }

  // Now insert the new servings (use servingsFromApi)
  // Adapt the mapping based on the actual structure of servingsFromApi
  const servingsToInsert = servingsFromApi.map((s: any) => ({
    serving_id: Number(s.serving_id), // Adjust field names as needed
    serving_description: s.serving_description,
    serving_url: s.serving_url,
    food_id: foodId,
    metric_serving_amount: s.metric_serving_amount
      ? String(s.metric_serving_amount)
      : null,
    metric_serving_unit: s.metric_serving_unit,
    number_of_units: s.number_of_units ? String(s.number_of_units) : null,
    measurement_description: s.measurement_description,
    calories: s.calories ? String(s.calories) : null,
    carbohydrate: s.carbohydrate ? String(s.carbohydrate) : null,
    protein: s.protein ? String(s.protein) : null,
    fat: s.fat ? String(s.fat) : null,
    saturated_fat: s.saturated_fat ? String(s.saturated_fat) : null,
    polyunsaturated_fat: s.polyunsaturated_fat
      ? String(s.polyunsaturated_fat)
      : null,
    monounsaturated_fat: s.monounsaturated_fat
      ? String(s.monounsaturated_fat)
      : null,
    trans_fat: s.trans_fat ? String(s.trans_fat) : null,
    cholesterol: s.cholesterol ? String(s.cholesterol) : null,
    sodium: s.sodium ? String(s.sodium) : null,
    potassium: s.potassium ? String(s.potassium) : null,
    fiber: s.fiber ? String(s.fiber) : null,
    sugar: s.sugar ? String(s.sugar) : null,
    added_sugars: s.added_sugars ? String(s.added_sugars) : null, // Check if field exists
    vitamin_d: s.vitamin_d ? String(s.vitamin_d) : null,
    vitamin_a: s.vitamin_a ? String(s.vitamin_a) : null,
    vitamin_c: s.vitamin_c ? String(s.vitamin_c) : null,
    calcium: s.calcium ? String(s.calcium) : null,
    iron: s.iron ? String(s.iron) : null,
    is_default: s.is_default === '1' || s.is_default === true ? 1 : 0, // Handle default flag
  }));

  if (servingsToInsert.length > 0) {
    console.log(
      `Inserting ${servingsToInsert.length} new servings for food ${foodId}`
    );
    await db
      .insert(servingsTable)
      .values(servingsToInsert)
      .onConflictDoNothing(); // Use onConflictDoNothing or update
  }

  // Finally, retrieve & return the newly inserted servings from DB
  return db
    .select()
    .from(servingsTable)
    .where(eq(servingsTable.food_id, foodId));
}

export async function fetchAndStoreFoodOnDemand(foodId: number) {
  const [existing] = await db
    .select()
    .from(foodTable)
    .where(eq(foodTable.food_id, foodId))
    .limit(1);

  if (existing) {
    return existing;
  }

  console.log(`Food ${foodId} not found locally. Fetching via proxy...`);
  let fetchedFoodData;
  try {
    // *** Replace direct call with proxy call ***
    fetchedFoodData = await getFoodViaProxyWithRetry(foodId);
  } catch (err) {
    console.error(
      `Failed to fetch food_id=${foodId} via proxy after retries`,
      err
    );
    throw new Error(`Could not fetch foodId=${foodId} via proxy`); // Re-throw or handle differently
  }

  // *** IMPORTANT: Adapt parsing based on proxy response structure ***
  const foodDetailsFromApi = fetchedFoodData?.food; // Example structure, adjust!

  if (!foodDetailsFromApi) {
    throw new Error(
      `Could not parse food details from proxy response for foodId=${foodId}`
    );
  }

  // Insert minimal data for the new food row
  // Adapt field names based on actual proxy response (foodDetailsFromApi)
  const newFood = {
    food_id: foodId,
    food_name: foodDetailsFromApi.food_name, // Adjust field name
    brand_name: foodDetailsFromApi.brand_name || null, // Adjust field name
    food_type: foodDetailsFromApi.food_type || 'generic', // Adjust field name
    food_url: foodDetailsFromApi.food_url || '', // Adjust field name
    food_sub_categories: '[]', // Handle as needed
  };

  console.log(`Inserting new food ${foodId} fetched via proxy.`);
  await db.insert(foodTable).values(newFood).onConflictDoNothing();

  // Return the newly inserted row (or query again to be certain)
  return newFood; // Return the object we just inserted
}
