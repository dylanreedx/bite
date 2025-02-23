import {and, eq} from 'drizzle-orm';
import {db} from '../db.js';
import {foodLogsTable, foodTable, servingsTable} from '../schema.js';

export async function createFoodLog({
  userId,
  foodId,
  servingId,
  quantity,
}: {
  userId: number;
  foodId: number;
  servingId: number;
  quantity: number;
}) {
  const today = new Date().toISOString().split('T')[0];

  return db.insert(foodLogsTable).values({
    user_id: userId,
    food_id: foodId,
    serving_id: servingId,
    quantity,
    date: today,
  });
}

export async function deleteFoodLog({
  logId,
  userId,
}: {
  logId: number;
  userId: number;
}) {
  return db
    .delete(foodLogsTable)
    .where(and(eq(foodLogsTable.id, logId), eq(foodLogsTable.user_id, userId)));
}

export async function getTodaysFoodLogs(userId: number) {
  const today = new Date().toISOString().split('T')[0];

  return db
    .select({
      id: foodLogsTable.id,
      quantity: foodLogsTable.quantity,
      food_name: foodTable.food_name,
      serving_description: servingsTable.serving_description,
      calories: servingsTable.calories,
      protein: servingsTable.protein,
      carbohydrate: servingsTable.carbohydrate,
      fat: servingsTable.fat,
    })
    .from(foodLogsTable)
    .innerJoin(foodTable, eq(foodLogsTable.food_id, foodTable.food_id))
    .innerJoin(
      servingsTable,
      eq(foodLogsTable.serving_id, servingsTable.serving_id)
    )
    .where(
      and(eq(foodLogsTable.date, today), eq(foodLogsTable.user_id, userId))
    );
}

export type FoodLogEntry = Awaited<
  ReturnType<typeof getTodaysFoodLogs>
>[number];
