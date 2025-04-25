import {fetchAndStoreServingsOnDemand} from '@suna/db/queries/externalFoods';
import {NextResponse} from 'next/server';

export async function GET(
  request: Request,
  context: {params: Promise<{foodId: string}>}
) {
  try {
    // Await the params promise to get the actual params object
    const {foodId} = await context.params;

    const id = Number.parseInt(foodId);
    if (isNaN(id)) {
      return NextResponse.json({error: 'Invalid food ID'}, {status: 400});
    }

    // Call your fallback logic
    const servings = await fetchAndStoreServingsOnDemand(id);

    return NextResponse.json({servings});
  } catch (error) {
    console.error('Error fetching servings with fallback:', error);
    return NextResponse.json(
      {error: 'Failed to fetch servings'},
      {status: 500}
    );
  }
}
