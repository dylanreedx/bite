import {searchFood} from '@suna/db/queries/food';
import {db} from '@suna/db/db';
import {foodTable} from '@suna/db/schema';

// Define the structure for the response payload and internal merging
interface FoodItem {
  food_id: number;
  food_name: string;
  brand_name?: string | null;
  food_type?: string | null;
  food_url?: string | null;
  calories?: number | null; // From local search
  source: 'local' | 'fatsecret'; // Track origin
}

// Define the expected structure from the proxy search endpoint
// Adapt this based on what your proxy actually returns
interface ProxySearchFood {
  food_id: string | number; // Proxy might return string ID
  food_name: string;
  brand_name?: string;
  food_type?: string;
  food_url?: string;
  // Add other fields if your proxy returns them
}

interface ProxyResponse {
  // Assuming the proxy returns an object with a 'foods' array
  // Or adjust if it returns the array directly
  foods: ProxySearchFood[];
  // Or maybe it matches FatSecret's structure more closely:
  // foods?: { food?: ProxySearchFood[] };
}

const PROXY_URL = process.env.FATSECRET_PROXY_URL;

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return new Response(JSON.stringify({foods: []}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  }

  if (!PROXY_URL) {
    console.error('FATSECRET_PROXY_URL environment variable is not set.');
    // Fallback to only local search if proxy isn't configured
  }

  let localResults: FoodItem[] = [];
  try {
    const dbResults = await searchFood(q);
    localResults = dbResults.map((item: {calories: unknown}) => ({
      ...item,
      source: 'local',
      calories: item.calories ? Number(item.calories) : null, // Convert calories to number or null
    }));
  } catch (dbError) {
    console.error('Local DB search error:', dbError);
    return new Response(JSON.stringify({message: 'Database error'}), {
      status: 500,
      headers: {'Content-Type': 'application/json'},
    });
  }

  let externalResults: FoodItem[] = [];
  // Fetch from proxy if local results are few AND proxy is configured
  if (localResults.length < 5 && PROXY_URL) {
    try {
      const proxyResponse = await fetch(
        `${PROXY_URL}/search?q=${encodeURIComponent(q)}`
      );

      if (!proxyResponse.ok) {
        // Log proxy error but don't fail the request, just return local results
        console.error(
          `FatSecret proxy error: ${proxyResponse.status} ${proxyResponse.statusText}`
        );
        const errorBody = await proxyResponse.text();
        console.error(`Proxy error body: ${errorBody}`);
      } else {
        const proxyData: ProxyResponse = await proxyResponse.json();

        // --- Adapt this part based on your proxy's response structure ---
        const foodsFromProxy = proxyData.foods || []; // Adjust if structure is different
        // Example if nested: const foodsFromProxy = proxyData.foods?.food || [];

        externalResults = foodsFromProxy.map((item) => ({
          food_id: Number(item.food_id), // Ensure ID is number
          food_name: item.food_name,
          brand_name: item.brand_name || null,
          food_type: item.food_type || 'unknown', // Default type
          food_url: item.food_url || '', // Default URL
          calories: null, // Search usually doesn't provide this
          source: 'fatsecret',
        }));
      }
    } catch (fetchError) {
      console.error('FatSecret proxy fetch error:', fetchError);
      // Log fetch error but don't fail the request
    }
  }

  // Merge local and external results
  const mergedResults = [...localResults, ...externalResults];

  // Deduplicate based on food_id, keeping the first occurrence (local prioritized)
  const uniqueResults = mergedResults.filter(
    (item, index, self) =>
      index === self.findIndex((t) => t.food_id === item.food_id)
  );

  // Identify new foods from FatSecret to save
  const newFoodsToSave = uniqueResults.filter(
    (item) =>
      item.source === 'fatsecret' &&
      !localResults.some((local) => local.food_id === item.food_id)
  );

  // Asynchronously save new foods to the DB (fire and forget or await)
  if (newFoodsToSave.length > 0) {
    console.log(`Saving ${newFoodsToSave.length} new foods to DB...`);
    db.insert(foodTable)
      .values(
        newFoodsToSave.map((item) => ({
          // Map fields from FoodItem to your foodTable schema
          food_id: item.food_id,
          food_name: item.food_name,
          brand_name: item.brand_name,
          food_type: item.food_type ?? 'unknown', // Use default if null/undefined
          food_url: item.food_url ?? '', // Use default if null/undefined
          // Add defaults for any other required fields in foodTable
          // food_sub_categories: null,
        }))
      )
      .onConflictDoNothing() // Avoid errors if the food was somehow added between search and insert
      .catch((saveError: unknown) => {
        // Log errors during the save process, but don't fail the response to the user
        console.error('Error saving new foods to DB:', saveError);
      });
  }

  // Sort final results (optional)
  uniqueResults.sort((a, b) => a.food_name.localeCompare(b.food_name));

  // Return the combined, deduplicated list
  return new Response(JSON.stringify({foods: uniqueResults}), {
    status: 200,
    headers: {'Content-Type': 'application/json'},
  });
}
