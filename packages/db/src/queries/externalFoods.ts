import FatSecret from 'fatsecret.js';
import {db} from '../db.js';
import {eq} from 'drizzle-orm';
import {foodTable, servingsTable} from '../schema.js';
import {config} from 'dotenv';

// Make sure your keys are set in your .env
config();
const {FATSECRET_CONSUMER_KEY, FATSECRET_CONSUMER_SECRET} = process.env;
if (!FATSECRET_CONSUMER_KEY || !FATSECRET_CONSUMER_SECRET) {
  throw new Error('FatSecret API keys are not defined.');
}

const client = new FatSecret.Client({
  credentials: {
    clientId: FATSECRET_CONSUMER_KEY,
    clientSecret: FATSECRET_CONSUMER_SECRET,
    scope: ['basic'],
  },
});

// Helper to gracefully handle rate-limit retries
async function getFoodWithRetry(foodId: number, retries = 3): Promise<any> {
  try {
    return await client.getFood({foodId: String(foodId)});
  } catch (error: any) {
    if (
      retries > 0 &&
      error.message &&
      error.message.includes('too many actions')
    ) {
      console.warn(
        `Rate limit hit for food_id=${foodId}. Waiting 60s, retries left: ${retries}`
      );
      await new Promise((resolve) => setTimeout(resolve, 60000));
      return getFoodWithRetry(foodId, retries - 1);
    }
    throw error;
  }
}

/**
 * fetchAndStoreServingsOnDemand:
 * 1) Check if food exists in your DB (foodTable).
 * 2) If it exists but has no servings, call external API to fetch.
 * 3) Store new servings in DB.
 * 4) Return the (newly inserted or existing) servings.
 */
export async function fetchAndStoreServingsOnDemand(foodId: number) {
  // First, does this food exist locally at all?
  const [food] = await db
    .select()
    .from(foodTable)
    .where(eq(foodTable.food_id, foodId))
    .execute();

  // If you ONLY want to handle the "food exists but is missing servings," you can check:
  // if (!food) {
  //   // optionally handle "food doesn't exist" flow here later
  //   return [];
  // }

  // Now check if we already have servings for this food
  const existingServings = await db
    .select()
    .from(servingsTable)
    .where(eq(servingsTable.food_id, foodId))
    .execute();

  if (existingServings.length > 0) {
    // Already have servings, just return them
    return existingServings;
  }

  // If we reach here, the food is in the DB but has no servings.
  // Let's fetch from FatSecret, then insert into our DB.
  let fetchedFood;
  try {
    fetchedFood = await getFoodWithRetry(foodId);
  } catch (err) {
    console.error(`Failed to fetch or retry food_id=${foodId}`, err);
    throw err;
  }

  if (!fetchedFood || !fetchedFood.servings) {
    console.error(`No serving data from external API for food_id=${foodId}`);
    return [];
  }

  // Optionally update basic food info if needed:
  await db
    .update(foodTable)
    .set({
      food_name: fetchedFood.name,
      brand_name: fetchedFood.brandName || null,
      food_type: fetchedFood.type,
      food_url: fetchedFood.url,
      food_sub_categories: '[]', // or handle subcategories as needed
    })
    .where(eq(foodTable.food_id, foodId))
    .execute();

  // Now insert the new servings
  for (const s of fetchedFood.servings) {
    await db
      .insert(servingsTable)
      .values({
        serving_id: Number(s.id),
        serving_description: s.description,
        serving_url: s.url,
        food_id: foodId,
        metric_serving_amount: s.metricServingAmount,
        metric_serving_unit: s.metricServingUnit,
        number_of_units: s.numberOfUnits,
        measurement_description: s.measurementDescription,
        calories: s.calories,
        carbohydrate: s.carbohydrate,
        protein: s.protein,
        fat: s.fat,
        saturated_fat: s.saturatedFat,
        polyunsaturated_fat: s.polyunsaturatedFat,
        monounsaturated_fat: s.monounsaturatedFat,
        trans_fat: s.transFat,
        cholesterol: s.cholesterol,
        sodium: s.sodium,
        potassium: s.potassium,
        fiber: s.fiber,
        sugar: s.sugar,
        added_sugars: s.addedSugars,
        vitamin_d: s.vitaminD,
        vitamin_a: s.vitaminA,
        vitamin_c: s.vitaminC,
        calcium: s.calcium,
        iron: s.iron,
      })
      .execute();
  }

  // Finally, retrieve & return the newly inserted servings from DB
  const newServings = await db
    .select()
    .from(servingsTable)
    .where(eq(servingsTable.food_id, foodId))
    .execute();

  return newServings;
}
