import {searchFood} from '@suna/db/queries/food';
import {db} from '@suna/db/db';
import {foodTable} from '@suna/db/schema';
// Import the type returned by searchFood if available, otherwise define it
// Assuming searchFood returns something like this:
type DbSearchResult = {
  food_id: number;
  food_name: string;
  brand_name: string | null;
  food_type: string;
  food_url: string;
  calories: string | null; // From the DB query join
};

// Define the structure for the final response payload
interface FoodItem {
  food_id: number;
  food_name: string;
  brand_name?: string | null;
  food_type?: string | null;
  food_url?: string | null;
  calories?: number | null; // Converted to number
  source: 'local' | 'fatsecret'; // Track origin
}

// Define the expected structure from the proxy search endpoint
interface ProxySearchFood {
  food_id: string | number;
  food_name: string;
  brand_name?: string;
  food_type?: string;
  food_url?: string;
}

// Define the expected structure of the proxy's response body
interface ProxyResponse {
  // Adjust based on your proxy's actual JSON response structure
  foods: ProxySearchFood[];
  // Example if nested: foods?: { food?: ProxySearchFood[] };
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

  let localResults: FoodItem[] = [];
  try {
    // 1. Fetch from local DB
    const dbResults: DbSearchResult[] = await searchFood(q);

    // 2. Map DB results to the FoodItem structure
    // REMOVED `: FoodItem` annotation from `item` here
    localResults = dbResults.map((item) => ({
      ...item, // Spread properties from dbResult
      source: 'local', // Add the source
      calories: item.calories ? Number(item.calories) : null, // Convert calories
    }));
  } catch (dbError) {
    console.error('Local DB search error:', dbError);
    return new Response(JSON.stringify({message: 'Database error'}), {
      status: 500,
      headers: {'Content-Type': 'application/json'},
    });
  }

  let externalResults: FoodItem[] = [];
  // 3. Fetch from proxy if needed
  if (localResults.length < 5) {
    if (!PROXY_URL) {
      console.warn('FATSECRET_PROXY_URL not set. Skipping external search.');
    } else {
      try {
        const proxyResponse = await fetch(
          `${PROXY_URL}/search?q=${encodeURIComponent(q)}`
        );

        if (!proxyResponse.ok) {
          console.error(
            `FatSecret proxy error: ${proxyResponse.status} ${proxyResponse.statusText}`
          );
          // Optionally log body: const errorBody = await proxyResponse.text(); console.error(errorBody);
        } else {
          const proxyData: ProxyResponse = await proxyResponse.json();
          // --- Adapt parsing based on your proxy's response structure ---
          const foodsFromProxy = proxyData.foods || []; // Adjust if needed

          externalResults = foodsFromProxy.map((item) => ({
            food_id: Number(item.food_id),
            food_name: item.food_name,
            brand_name: item.brand_name || null,
            food_type: item.food_type || 'unknown',
            food_url: item.food_url || '',
            calories: null, // Search usually doesn't provide calories
            source: 'fatsecret',
          }));
        }
      } catch (fetchError) {
        console.error('FatSecret proxy fetch error:', fetchError);
      }
    }
  }

  // 4. Merge and Deduplicate
  const mergedResults = [...localResults, ...externalResults];
  const uniqueResults = mergedResults.filter(
    (item, index, self) =>
      index === self.findIndex((t) => t.food_id === item.food_id)
  );

  // 5. Identify and Save New Foods (Async)
  const newFoodsToSave = uniqueResults.filter(
    (item) =>
      item.source === 'fatsecret' &&
      !localResults.some((local) => local.food_id === item.food_id)
  );

  if (newFoodsToSave.length > 0) {
    console.log(`Saving ${newFoodsToSave.length} new foods to DB...`);
    // Fire and forget (don't await) to avoid delaying response
    db.insert(foodTable)
      .values(
        newFoodsToSave.map((item) => ({
          food_id: item.food_id,
          food_name: item.food_name,
          brand_name: item.brand_name,
          food_type: item.food_type ?? 'unknown',
          food_url: item.food_url ?? '',
          // Add defaults for other required fields in foodTable schema
        }))
      )
      .onConflictDoNothing()
      .catch((saveError: unknown) => {
        console.error('Error saving new foods to DB:', saveError);
      });
  }

  // 6. Sort (Optional)
  uniqueResults.sort((a, b) => a.food_name.localeCompare(b.food_name));

  // 7. Return Response
  return new Response(JSON.stringify({foods: uniqueResults}), {
    status: 200,
    headers: {'Content-Type': 'application/json'},
  });
}
