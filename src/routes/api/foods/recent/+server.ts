import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { food, serving, foodLog } from '$lib/db/schema.js';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({
			success: false,
			error: 'Authentication required'
		}, { status: 401 });
	}

	const userId = locals.user.id;
	const type = url.searchParams.get('type') || 'recent'; // 'recent' or 'frequent'
	const limit = parseInt(url.searchParams.get('limit') || '10');

	try {
		if (type === 'frequent') {
			// Get most frequently logged foods
			const frequentFoods = await db
				.select({
					foodId: food.foodId,
					foodName: food.foodName,
					brandName: food.brandName,
					foodType: food.foodType,
					logCount: count(foodLog.id),
					lastUsed: sql<string>`MAX(${foodLog.loggedAt})`,
					// Get default serving info
					servingId: serving.servingId,
					servingDescription: serving.servingDescription,
					calories: serving.calories,
					protein: serving.protein,
					carbohydrate: serving.carbohydrate,
					fat: serving.fat
				})
				.from(foodLog)
				.innerJoin(food, eq(foodLog.foodId, food.foodId))
				.leftJoin(serving, and(
					eq(serving.foodId, food.foodId),
					eq(serving.isDefault, 1)
				))
				.where(eq(foodLog.userId, userId))
				.groupBy(food.foodId, food.foodName, food.brandName, food.foodType, 
						serving.servingId, serving.servingDescription, serving.calories, 
						serving.protein, serving.carbohydrate, serving.fat)
				.orderBy(desc(count(foodLog.id)), desc(sql`MAX(${foodLog.loggedAt})`))
				.limit(limit);

			const processedFoods = frequentFoods.map(food => ({
				...food,
				calories: food.calories ?? 0,
				protein: food.protein ?? 0,
				carbohydrate: food.carbohydrate ?? 0,
				fat: food.fat ?? 0,
				logCount: Number(food.logCount),
				lastUsed: new Date(food.lastUsed).toISOString()
			}));

			return json({
				success: true,
				foods: processedFoods,
				type: 'frequent'
			});

		} else {
			// Get most recently logged foods
			const recentFoods = await db
				.select({
					foodId: food.foodId,
					foodName: food.foodName,
					brandName: food.brandName,
					foodType: food.foodType,
					lastUsed: foodLog.loggedAt,
					lastQuantity: foodLog.quantity,
					// Get serving info from the last log entry
					servingId: serving.servingId,
					servingDescription: serving.servingDescription,
					calories: serving.calories,
					protein: serving.protein,
					carbohydrate: serving.carbohydrate,
					fat: serving.fat
				})
				.from(foodLog)
				.innerJoin(food, eq(foodLog.foodId, food.foodId))
				.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
				.where(eq(foodLog.userId, userId))
				.orderBy(desc(foodLog.loggedAt))
				.limit(limit);

			// Remove duplicates (keep most recent)
			const uniqueFoods = recentFoods.filter((food, index, self) =>
				index === self.findIndex(f => f.foodId === food.foodId)
			);

			const processedFoods = uniqueFoods.map(food => ({
				...food,
				calories: food.calories ?? 0,
				protein: food.protein ?? 0,
				carbohydrate: food.carbohydrate ?? 0,
				fat: food.fat ?? 0,
				lastUsed: new Date(food.lastUsed).toISOString()
			}));

			return json({
				success: true,
				foods: processedFoods,
				type: 'recent'
			});
		}

	} catch (error) {
		console.error('Error fetching user foods:', error);
		return json({
			success: false,
			error: 'Failed to fetch foods'
		}, { status: 500 });
	}
};