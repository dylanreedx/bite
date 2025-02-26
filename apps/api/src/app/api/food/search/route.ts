import {NextResponse} from 'next/server';
import {searchFood} from '@suna/db/queries/food';
import {fatSecretClient as fsClient} from '@suna/db/queries/fatSecretClient';
import type {FatSecretSearchResponse} from '@suna/db/queries/fatSecretClient';

interface MergedFood {
  food_id: number;
  food_name: string;
}

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  if (!q) {
    return NextResponse.json({foods: []} satisfies {foods: MergedFood[]});
  }

  // Query local DB using `searchFood` helper function
  const localResults = await searchFood(q);

  // If local results are too few, fetch from FatSecret
  let externalResults: MergedFood[] = [];
  if (localResults.length < 5) {
    try {
      const fsSearch = (await fsClient.getFoodSearch({
        searchExpression: q,
        maxResults: 10,
      })) as FatSecretSearchResponse;

      externalResults = fsSearch.foods.map((item) => ({
        food_id: Number(item.id),
        food_name: item.name,
      }));
    } catch (error) {
      console.error('FatSecret search error:', error);
    }
  }

  // Merge both results, prioritizing local DB results
  const merged: MergedFood[] = [
    ...localResults.map((item) => ({
      food_id: item.food_id,
      food_name: item.food_name,
    })),
    ...externalResults,
  ];

  return NextResponse.json({foods: merged});
}
