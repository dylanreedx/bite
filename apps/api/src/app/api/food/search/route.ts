import {NextResponse} from 'next/server';
import {db} from '@suna/db/db';
import {foodTable} from '@suna/db/schema';
import {eq} from 'drizzle-orm';
import {fatSecretClient as fsClient} from '@suna/db/queries/fatSecretClient';
import type {FatSecretSearchResponse} from '@suna/db/queries/fatSecretClient'; // if you have a type

// Example minimal shape for merged result
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

  // Query local DB (simple LIKE)
  const localResults = await db
    .select()
    .from(foodTable)
    .where(eq(foodTable.food_name, '%' + q + '%'))
    .limit(20)
    .execute();

  // If local results are too few, fallback to external
  let externalResults: MergedFood[] = [];
  if (localResults.length < 5) {
    try {
      const fsSearch = (await fsClient.getFoodSearch({
        searchExpression: q,
        maxResults: 10,
      })) as FatSecretSearchResponse; // or any
      externalResults = fsSearch.foods.map((item) => ({
        food_id: Number(item.id),
        food_name: item.name,
      }));
    } catch (error) {
      console.error('FatSecret search error:', error);
    }
  }

  // Merge or map the local and external
  const merged: MergedFood[] = [
    ...localResults.map((item) => ({
      food_id: item.food_id,
      food_name: item.food_name,
    })),
    ...externalResults,
  ];

  return NextResponse.json({foods: merged});
}
