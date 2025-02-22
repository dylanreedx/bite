import {NextResponse} from 'next/server';
import {searchFood} from '@suna/db/queries/food';

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({foods: []});
  }

  const foods = await searchFood(query);
  return NextResponse.json({foods});
}
