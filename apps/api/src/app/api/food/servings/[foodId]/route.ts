import {NextResponse} from 'next/server';
import {getFoodServings} from '@suna/db/queries/food';

export async function GET(
  request: Request,
  {params}: {params: {foodId: string}}
) {
  try {
    const foodId = Number.parseInt((await params).foodId);

    if (isNaN(foodId)) {
      return NextResponse.json({error: 'Invalid food ID'}, {status: 400});
    }

    const servings = await getFoodServings(foodId);
    return NextResponse.json({servings});
  } catch (error) {
    console.error('Error fetching servings:', error);
    return NextResponse.json(
      {error: 'Failed to fetch servings'},
      {status: 500}
    );
  }
}
