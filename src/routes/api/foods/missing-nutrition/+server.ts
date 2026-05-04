import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { food, serving } from '$lib/db/schema.js';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json(
			{
				success: false,
				error: 'Authentication required'
			},
			{ status: 401 }
		);
	}

	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const type = url.searchParams.get('type') || 'missing'; // 'missing' or 'incomplete'

	try {
		let foodIds: number[] = [];

		if (type === 'missing') {
			// Foods that have no servings at all
			const foodsWithoutServings = await db
				.select({ foodId: food.foodId })
				.from(food)
				.leftJoin(serving, eq(food.foodId, serving.foodId))
				.where(isNull(serving.foodId))
				.limit(limit)
				.offset(offset);

			foodIds = foodsWithoutServings.map(f => f.foodId);
		} else if (type === 'incomplete') {
			// Foods that have servings but missing nutrition data
			const foodsWithIncompleteNutrition = await db
				.select({ foodId: food.foodId })
				.from(food)
				.innerJoin(serving, eq(food.foodId, serving.foodId))
				.where(
					and(
						or(
							isNull(serving.calories),
							eq(serving.calories, 0),
							isNull(serving.protein),
							isNull(serving.carbohydrate),
							isNull(serving.fat)
						)
					)
				)
				.groupBy(food.foodId)
				.limit(limit)
				.offset(offset);

			foodIds = foodsWithIncompleteNutrition.map(f => f.foodId);
		} else {
			// Get both types
			const [withoutServings, withIncompleteNutrition] = await Promise.all([
				db
					.select({ foodId: food.foodId })
					.from(food)
					.leftJoin(serving, eq(food.foodId, serving.foodId))
					.where(isNull(serving.foodId))
					.limit(Math.floor(limit / 2))
					.offset(offset),

				db
					.select({ foodId: food.foodId })
					.from(food)
					.innerJoin(serving, eq(food.foodId, serving.foodId))
					.where(
						and(
							or(
								isNull(serving.calories),
								eq(serving.calories, 0),
								isNull(serving.protein),
								isNull(serving.carbohydrate),
								isNull(serving.fat)
							)
						)
					)
					.groupBy(food.foodId)
					.limit(Math.ceil(limit / 2))
					.offset(offset)
			]);

			const missingIds = withoutServings.map(f => f.foodId);
			const incompleteIds = withIncompleteNutrition.map(f => f.foodId);
			foodIds = [...missingIds, ...incompleteIds];
		}

		// Get total counts for pagination
		const [totalMissing, totalIncomplete] = await Promise.all([
			db
				.select({ count: sql<number>`count(*)` })
				.from(food)
				.leftJoin(serving, eq(food.foodId, serving.foodId))
				.where(isNull(serving.foodId))
				.then(result => result[0]?.count || 0),

			db
				.select({ count: sql<number>`count(distinct ${food.foodId})` })
				.from(food)
				.innerJoin(serving, eq(food.foodId, serving.foodId))
				.where(
					and(
						or(
							isNull(serving.calories),
							eq(serving.calories, 0),
							isNull(serving.protein),
							isNull(serving.carbohydrate),
							isNull(serving.fat)
						)
					)
				)
				.then(result => result[0]?.count || 0)
		]);

		const totalCount = type === 'missing' ? totalMissing :
						  type === 'incomplete' ? totalIncomplete :
						  totalMissing + totalIncomplete;

		// Get food details for the returned IDs
		let foodDetails = [];
		if (foodIds.length > 0) {
			foodDetails = await db
				.select({
					foodId: food.foodId,
					foodName: food.foodName,
					brandName: food.brandName,
					foodType: food.foodType,
					servingCount: sql<number>`count(${serving.servingId})`,
					hasNutrition: sql<number>`sum(case when ${serving.calories} > 0 then 1 else 0 end)`
				})
				.from(food)
				.leftJoin(serving, eq(food.foodId, serving.foodId))
				.where(sql`${food.foodId} in (${sql.join(foodIds.map(id => sql`${id}`), sql`, `)})`)
				.groupBy(food.foodId, food.foodName, food.brandName, food.foodType);
		}

		// Calculate coverage statistics
		const totalFoods = await db
			.select({ count: sql<number>`count(*)` })
			.from(food)
			.then(result => result[0]?.count || 0);

		const foodsWithServings = await db
			.select({ count: sql<number>`count(distinct ${food.foodId})` })
			.from(food)
			.innerJoin(serving, eq(food.foodId, serving.foodId))
			.then(result => result[0]?.count || 0);

		const foodsWithNutrition = await db
			.select({ count: sql<number>`count(distinct ${food.foodId})` })
			.from(food)
			.innerJoin(serving, eq(food.foodId, serving.foodId))
			.where(
				and(
					sql`${serving.calories} > 0`,
					sql`${serving.protein} is not null`,
					sql`${serving.carbohydrate} is not null`,
					sql`${serving.fat} is not null`
				)
			)
			.then(result => result[0]?.count || 0);

		const coverage = {
			totalFoods,
			foodsWithServings,
			foodsWithNutrition,
			servingsCoverage: totalFoods > 0 ? (foodsWithServings / totalFoods) * 100 : 0,
			nutritionCoverage: totalFoods > 0 ? (foodsWithNutrition / totalFoods) * 100 : 0,
			missingServings: totalMissing,
			incompleteNutrition: totalIncomplete
		};

		return json({
			success: true,
			foodIds,
			foods: foodDetails,
			pagination: {
				limit,
				offset,
				total: totalCount,
				hasMore: offset + limit < totalCount
			},
			coverage,
			type
		});
	} catch (error) {
		console.error('Error fetching foods with missing nutrition:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch foods with missing nutrition'
			},
			{ status: 500 }
		);
	}
};

// POST endpoint to trigger sync for specific foods
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json(
			{
				success: false,
				error: 'Authentication required'
			},
			{ status: 401 }
		);
	}

	try {
		const { foodIds, priority = 'medium' } = await request.json();

		if (!Array.isArray(foodIds) || foodIds.length === 0) {
			return json(
				{
					success: false,
					error: 'foodIds array is required'
				},
				{ status: 400 }
			);
		}

		// Validate food IDs exist
		const existingFoods = await db
			.select({ foodId: food.foodId })
			.from(food)
			.where(sql`${food.foodId} in (${sql.join(foodIds.map((id: number) => sql`${id}`), sql`, `)})`);

		const existingFoodIds = existingFoods.map(f => f.foodId);
		const invalidIds = foodIds.filter((id: number) => !existingFoodIds.includes(id));

		if (invalidIds.length > 0) {
			return json(
				{
					success: false,
					error: `Invalid food IDs: ${invalidIds.join(', ')}`
				},
				{ status: 400 }
			);
		}

		// This endpoint just returns the food IDs to sync
		// The actual syncing will be handled by the client-side service
		return json({
			success: true,
			message: `Queued ${existingFoodIds.length} foods for sync`,
			foodIds: existingFoodIds,
			priority
		});
	} catch (error) {
		console.error('Error queuing foods for sync:', error);
		return json(
			{
				success: false,
				error: 'Failed to queue foods for sync'
			},
			{ status: 500 }
		);
	}
};
