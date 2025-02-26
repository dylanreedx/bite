import {eq, like, and} from 'drizzle-orm';
import {db} from '../db.ts';
import {foodTable, servingsTable} from '../schema.ts';

export async function searchFood(query: string) {
  return (
    db
      .select({
        food_id: foodTable.food_id,
        food_name: foodTable.food_name,
        brand_name: foodTable.brand_name,
        food_type: foodTable.food_type,
        food_url: foodTable.food_url,
        calories: servingsTable.calories,
      })
      .from(foodTable)
      // Join default serving (where is_default = 1)
      .leftJoin(
        servingsTable,
        and(
          eq(foodTable.food_id, servingsTable.food_id),
          eq(servingsTable.is_default, 1)
        )
      )
      // Use Drizzle's `like` helper
      .where(like(foodTable.food_name, `%${query}%`))
      .limit(20)
  );
}

export async function getFoodServings(foodId: number) {
  return db
    .select({
      serving_id: servingsTable.serving_id,
      serving_description: servingsTable.serving_description,
      calories: servingsTable.calories,
      protein: servingsTable.protein,
      carbohydrate: servingsTable.carbohydrate,
      fat: servingsTable.fat,
      fiber: servingsTable.fiber,
      sugar: servingsTable.sugar,
    })
    .from(servingsTable)
    .where(eq(servingsTable.food_id, foodId));
}

// Helper types
export type SearchFoodResult = Awaited<ReturnType<typeof searchFood>>[number];
export type FoodServingResult = Awaited<
  ReturnType<typeof getFoodServings>
>[number];
