import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { user, foodLog, food, serving } from '$lib/db/schema.js';
import { eq, and, count, sql, desc, gte } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET user profile and statistics
export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({
			success: false,
			error: 'Authentication required'
		}, { status: 401 });
	}

	const userId = locals.user.id;
	const includeStats = url.searchParams.get('stats') === 'true';

	try {
		// Get user basic info
		const userData = await db
			.select({
				id: user.id,
				email: user.email,
				name: user.name,
				createdAt: user.createdAt
			})
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		if (userData.length === 0) {
			return json({
				success: false,
				error: 'User not found'
			}, { status: 404 });
		}

		const userInfo = userData[0];
		const response: any = {
			success: true,
			user: userInfo
		};

		// Include statistics if requested
		if (includeStats) {
			const stats = await getUserStatistics(userId);
			response.statistics = stats;
		}

		return json(response);

	} catch (error) {
		console.error('Error fetching user data:', error);
		return json({
			success: false,
			error: 'Failed to fetch user data'
		}, { status: 500 });
	}
};

// PATCH user profile (update name, etc.)
export const PATCH: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({
			success: false,
			error: 'Authentication required'
		}, { status: 401 });
	}

	const userId = locals.user.id;

	try {
		const { name } = await request.json();

		if (!name || name.trim().length === 0) {
			return json({
				success: false,
				error: 'Name is required'
			}, { status: 400 });
		}

		// Update user name
		const updatedUser = await db
			.update(user)
			.set({ name: name.trim() })
			.where(eq(user.id, userId))
			.returning({
				id: user.id,
				email: user.email,
				name: user.name,
				createdAt: user.createdAt
			});

		if (updatedUser.length === 0) {
			return json({
				success: false,
				error: 'User not found'
			}, { status: 404 });
		}

		return json({
			success: true,
			user: updatedUser[0],
			message: 'Profile updated successfully'
		});

	} catch (error) {
		console.error('Error updating user profile:', error);
		return json({
			success: false,
			error: 'Failed to update profile'
		}, { status: 500 });
	}
};

async function getUserStatistics(userId: number) {
	try {
		// Get current date for time-based queries
		const today = new Date().toISOString().split('T')[0];
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

		// Total foods logged all time
		const totalLogsResult = await db
			.select({ count: count() })
			.from(foodLog)
			.where(eq(foodLog.userId, userId));

		// Unique foods tried
		const uniqueFoodsResult = await db
			.select({ count: count(sql`DISTINCT ${foodLog.foodId}`) })
			.from(foodLog)
			.where(eq(foodLog.userId, userId));

		// Days with logs (streak calculation)
		const daysWithLogsResult = await db
			.select({ 
				date: foodLog.date,
				count: count()
			})
			.from(foodLog)
			.where(eq(foodLog.userId, userId))
			.groupBy(foodLog.date)
			.orderBy(desc(foodLog.date));

		// Calculate current streak
		let currentStreak = 0;
		const daysWithLogs = daysWithLogsResult.map(d => d.date);
		
		// Start from today and go backwards
		let checkDate = new Date();
		while (true) {
			const dateStr = checkDate.toISOString().split('T')[0];
			if (daysWithLogs.includes(dateStr)) {
				currentStreak++;
				checkDate.setDate(checkDate.getDate() - 1);
			} else {
				break;
			}
		}

		// This week's nutrition totals
		const weeklyNutrition = await db
			.select({
				calories: sql<string>`SUM(${serving.calories} * ${foodLog.quantity})`,
				protein: sql<string>`SUM(${serving.protein} * ${foodLog.quantity})`,
				carbohydrate: sql<string>`SUM(${serving.carbohydrate} * ${foodLog.quantity})`,
				fat: sql<string>`SUM(${serving.fat} * ${foodLog.quantity})`,
				fiber: sql<string>`SUM(${serving.fiber} * ${foodLog.quantity})`,
				sugar: sql<string>`SUM(${serving.sugar} * ${foodLog.quantity})`,
				sodium: sql<string>`SUM(${serving.sodium} * ${foodLog.quantity})`
			})
			.from(foodLog)
			.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
			.where(and(
				eq(foodLog.userId, userId),
				gte(foodLog.date, sevenDaysAgo)
			));

		// Today's nutrition totals
		const todayNutrition = await db
			.select({
				calories: sql<string>`SUM(${serving.calories} * ${foodLog.quantity})`,
				protein: sql<string>`SUM(${serving.protein} * ${foodLog.quantity})`,
				carbohydrate: sql<string>`SUM(${serving.carbohydrate} * ${foodLog.quantity})`,
				fat: sql<string>`SUM(${serving.fat} * ${foodLog.quantity})`,
				fiber: sql<string>`SUM(${serving.fiber} * ${foodLog.quantity})`,
				sugar: sql<string>`SUM(${serving.sugar} * ${foodLog.quantity})`,
				sodium: sql<string>`SUM(${serving.sodium} * ${foodLog.quantity})`
			})
			.from(foodLog)
			.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
			.where(and(
				eq(foodLog.userId, userId),
				eq(foodLog.date, today)
			));

		// Most logged foods
		const topFoods = await db
			.select({
				foodName: food.foodName,
				brandName: food.brandName,
				logCount: count(foodLog.id)
			})
			.from(foodLog)
			.innerJoin(food, eq(foodLog.foodId, food.foodId))
			.where(eq(foodLog.userId, userId))
			.groupBy(food.foodId, food.foodName, food.brandName)
			.orderBy(desc(count(foodLog.id)))
			.limit(5);

		// Days logged this week
		const daysLoggedThisWeek = await db
			.select({ 
				count: count(sql`DISTINCT ${foodLog.date}`)
			})
			.from(foodLog)
			.where(and(
				eq(foodLog.userId, userId),
				gte(foodLog.date, sevenDaysAgo)
			));

		// Helper function to safely parse nutrition values
		const parseNutrition = (value: string | null) => {
			return value ? parseFloat(value) : 0;
		};

		const weeklyNutritionData = weeklyNutrition[0];
		const todayNutritionData = todayNutrition[0];

		return {
			totalLogs: totalLogsResult[0].count,
			uniqueFoods: uniqueFoodsResult[0].count,
			currentStreak,
			daysLoggedThisWeek: daysLoggedThisWeek[0].count,
			topFoods: topFoods.map(f => ({
				...f,
				logCount: Number(f.logCount)
			})),
			weeklyTotals: {
				calories: parseNutrition(weeklyNutritionData.calories),
				protein: parseNutrition(weeklyNutritionData.protein),
				carbohydrate: parseNutrition(weeklyNutritionData.carbohydrate),
				fat: parseNutrition(weeklyNutritionData.fat),
				fiber: parseNutrition(weeklyNutritionData.fiber),
				sugar: parseNutrition(weeklyNutritionData.sugar),
				sodium: parseNutrition(weeklyNutritionData.sodium)
			},
			todayTotals: {
				calories: parseNutrition(todayNutritionData.calories),
				protein: parseNutrition(todayNutritionData.protein),
				carbohydrate: parseNutrition(todayNutritionData.carbohydrate),
				fat: parseNutrition(todayNutritionData.fat),
				fiber: parseNutrition(todayNutritionData.fiber),
				sugar: parseNutrition(todayNutritionData.sugar),
				sodium: parseNutrition(todayNutritionData.sodium)
			},
			weeklyAverages: {
				calories: parseNutrition(weeklyNutritionData.calories) / 7,
				protein: parseNutrition(weeklyNutritionData.protein) / 7,
				carbohydrate: parseNutrition(weeklyNutritionData.carbohydrate) / 7,
				fat: parseNutrition(weeklyNutritionData.fat) / 7,
				fiber: parseNutrition(weeklyNutritionData.fiber) / 7,
				sugar: parseNutrition(weeklyNutritionData.sugar) / 7,
				sodium: parseNutrition(weeklyNutritionData.sodium) / 7
			}
		};
	} catch (error) {
		console.error('Error calculating user statistics:', error);
		return null;
	}
}