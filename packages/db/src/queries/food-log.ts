import {and, eq, sql} from 'drizzle-orm';
import {db} from '../db.ts';
import {foodLogsTable, foodTable, servingsTable} from '../schema.ts';
import {
  fetchAndStoreFoodOnDemand,
  fetchAndStoreServingsOnDemand,
} from '../queries/externalFoods.ts';

/**
 * Create a new food log for a user.
 * Throws an error if the referenced food or serving doesn't exist.
 */
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
  // 1) Make sure the referenced food/serving rows actually exist
  const [foodExists] = await db
    .select({
      count: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(foodTable)
    .where(eq(foodTable.food_id, foodId));

  if (!foodExists || foodExists.count === 0) {
    throw new Error(`No food found in 'food' table with food_id = ${foodId}`);
  }

  const [servingExists] = await db
    .select({
      count: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(servingsTable)
    .where(eq(servingsTable.serving_id, servingId));

  if (!servingExists || servingExists.count === 0) {
    throw new Error(
      `No serving found in 'serving' table with serving_id = ${servingId}`
    );
  }

  // 2) If we make it here, foreign key references exist. Proceed with the insert.
  const today = new Date().toISOString().split('T')[0];

  return db.insert(foodLogsTable).values({
    user_id: userId,
    food_id: foodId,
    serving_id: servingId,
    quantity,
    date: today,
  });
}

/**
 * Delete a single food log, given log ID & user ID.
 */
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

/**
 * Fetch all the user's food logs for "today" (YYYY-MM-DD).
 */
export async function getTodaysFoodLogs(userId: number) {
  const today = new Date().toISOString().split('T')[0];

  try {
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
  } catch (error) {
    console.error('Failed to fetch food logs:', error);
    return [];
  }
}

export type FoodLogEntry = Awaited<
  ReturnType<typeof getTodaysFoodLogs>
>[number];

/**
 * Create a food log, ensuring the food + serving exist in local DB first.
 */
export async function createFoodLogOnDemand({
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
  // 1) Ensure the food row exists. If not, fetch/insert from FatSecret.
  await fetchAndStoreFoodOnDemand(foodId);

  // 2) Ensure the servings for that food exist.
  //    This will insert any missing servings from FatSecret.
  await fetchAndStoreServingsOnDemand(foodId);

  // 3) Now check that the specific servingId is actually in the DB
  //    (If the user passed a serving that doesn't exist in the FatSecret data,
  //     you'll still throw here. That’s usually correct, but up to you.)
  const [servingExists] = await db
    .select({count: sql<number>`COUNT(*)`.mapWith(Number)})
    .from(servingsTable)
    .where(eq(servingsTable.serving_id, servingId));

  if (!servingExists || servingExists.count === 0) {
    throw new Error(
      `No serving found in DB with serving_id=${servingId} (even after fetch)`
    );
  }

  // 4) Finally insert the log row
  const today = new Date().toISOString().split('T')[0];

  return db.insert(foodLogsTable).values({
    user_id: userId,
    food_id: foodId,
    serving_id: servingId,
    quantity,
    date: today,
  });
}
