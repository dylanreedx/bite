import {fetchAndStoreServingsOnDemand} from '@suna/db/queries/externalFoods';
import {NextResponse} from 'next/server';
export async function GET(
  request: Request,
  {params}: {params: {foodId: string}}
) {
  try {
    const foodId = Number.parseInt((await params).foodId);
    if (isNaN(foodId)) {
      return NextResponse.json({error: 'Invalid food ID'}, {status: 400});
    }

    // Call our fallback logic
    const servings = await fetchAndStoreServingsOnDemand(foodId);

    return NextResponse.json({servings});
  } catch (error) {
    console.error('Error fetching servings with fallback:', error);
    return NextResponse.json(
      {error: 'Failed to fetch servings'},
      {status: 500}
    );
  }
}
