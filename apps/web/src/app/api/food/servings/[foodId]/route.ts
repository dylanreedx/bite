import {fetchAndStoreServingsOnDemand} from '@suna/db/queries/externalFoods';

// Assuming fetchAndStoreServingsOnDemand returns an array of serving objects
// Define a type for clarity if you don't have one imported
interface Serving {
  serving_id: number;
  serving_description: string;
  // Add other serving properties (calories, protein, etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow other properties
}

export async function GET(
  request: Request, // Standard Request object
  context: {params: {foodId: string}} // Context contains route params
) {
  try {
    // No need to await context.params, it's directly available
    const foodId = context.params.foodId;
    const id = Number.parseInt(foodId);

    if (isNaN(id)) {
      return new Response(JSON.stringify({error: 'Invalid food ID'}), {
        status: 400,
        headers: {'Content-Type': 'application/json'},
      });
    }

    // This function needs to handle DB lookup AND potentially calling
    // the FatSecret proxy if servings aren't found locally.
    const servings: Serving[] = await fetchAndStoreServingsOnDemand(id);

    return new Response(JSON.stringify({servings}), {
      status: 200,
      headers: {'Content-Type': 'application/json'},
    });
  } catch (error) {
    console.error(
      `Error fetching servings for foodId ${context.params.foodId}:`,
      error
    );
    return new Response(JSON.stringify({error: 'Failed to fetch servings'}), {
      status: 500,
      headers: {'Content-Type': 'application/json'},
    });
  }
}
