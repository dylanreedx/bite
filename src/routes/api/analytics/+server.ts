import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { foodLog, serving, food } from '$lib/db/schema.js';
import { eq, and, sql, desc, gte, lte, count } from 'drizzle-orm';
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
	const analysisType = url.searchParams.get('type') || 'weekly'; // 'weekly', 'monthly', 'trends'
	const startDate = url.searchParams.get('start_date');
	const endDate = url.searchParams.get('end_date');

	try {
		let analytics;

		switch (analysisType) {
			case 'weekly':
				analytics = await getWeeklyAnalytics(userId, startDate, endDate);
				break;
			case 'monthly':
				analytics = await getMonthlyAnalytics(userId, startDate, endDate);
				break;
			case 'trends':
				analytics = await getNutritionTrends(userId, startDate, endDate);
				break;
			case 'insights':
				analytics = await getNutritionInsights(userId);
				break;
			default:
				return json({
					success: false,
					error: 'Invalid analysis type'
				}, { status: 400 });
		}

		return json({
			success: true,
			type: analysisType,
			data: analytics
		});

	} catch (error) {
		console.error('Analytics error:', error);
		return json({
			success: false,
			error: 'Failed to generate analytics'
		}, { status: 500 });
	}
};

async function getWeeklyAnalytics(userId: number, startDate?: string | null, endDate?: string | null) {
	// Default to last 7 days if no dates provided
	const end = endDate || new Date().toISOString().split('T')[0];
	const start = startDate || new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	// Get daily nutrition totals for the week
	const dailyTotals = await db
		.select({
			date: foodLog.date,
			calories: sql<string>`COALESCE(SUM(${serving.calories} * ${foodLog.quantity}), 0)`,
			protein: sql<string>`COALESCE(SUM(${serving.protein} * ${foodLog.quantity}), 0)`,
			carbohydrate: sql<string>`COALESCE(SUM(${serving.carbohydrate} * ${foodLog.quantity}), 0)`,
			fat: sql<string>`COALESCE(SUM(${serving.fat} * ${foodLog.quantity}), 0)`,
			fiber: sql<string>`COALESCE(SUM(${serving.fiber} * ${foodLog.quantity}), 0)`,
			sugar: sql<string>`COALESCE(SUM(${serving.sugar} * ${foodLog.quantity}), 0)`,
			sodium: sql<string>`COALESCE(SUM(${serving.sodium} * ${foodLog.quantity}), 0)`,
			entryCount: count(foodLog.id)
		})
		.from(foodLog)
		.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
		.where(and(
			eq(foodLog.userId, userId),
			gte(foodLog.date, start),
			lte(foodLog.date, end)
		))
		.groupBy(foodLog.date)
		.orderBy(foodLog.date);

	// Calculate weekly averages
	const weeklyTotals = dailyTotals.reduce((acc, day) => ({
		calories: acc.calories + parseFloat(day.calories || '0'),
		protein: acc.protein + parseFloat(day.protein || '0'),
		carbohydrate: acc.carbohydrate + parseFloat(day.carbohydrate || '0'),
		fat: acc.fat + parseFloat(day.fat || '0'),
		fiber: acc.fiber + parseFloat(day.fiber || '0'),
		sugar: acc.sugar + parseFloat(day.sugar || '0'),
		sodium: acc.sodium + parseFloat(day.sodium || '0'),
		entryCount: acc.entryCount + Number(day.entryCount)
	}), {
		calories: 0, protein: 0, carbohydrate: 0, fat: 0, 
		fiber: 0, sugar: 0, sodium: 0, entryCount: 0
	});

	const daysWithData = dailyTotals.length;
	const weeklyAverages = daysWithData > 0 ? {
		calories: weeklyTotals.calories / daysWithData,
		protein: weeklyTotals.protein / daysWithData,
		carbohydrate: weeklyTotals.carbohydrate / daysWithData,
		fat: weeklyTotals.fat / daysWithData,
		fiber: weeklyTotals.fiber / daysWithData,
		sugar: weeklyTotals.sugar / daysWithData,
		sodium: weeklyTotals.sodium / daysWithData
	} : null;

	// Get top foods for the week
	const topFoods = await db
		.select({
			foodName: food.foodName,
			brandName: food.brandName,
			calories: sql<string>`SUM(${serving.calories} * ${foodLog.quantity})`,
			logCount: count(foodLog.id)
		})
		.from(foodLog)
		.innerJoin(food, eq(foodLog.foodId, food.foodId))
		.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
		.where(and(
			eq(foodLog.userId, userId),
			gte(foodLog.date, start),
			lte(foodLog.date, end)
		))
		.groupBy(food.foodId, food.foodName, food.brandName)
		.orderBy(desc(sql`SUM(CAST(${serving.calories} AS REAL) * ${foodLog.quantity})`))
		.limit(10);

	return {
		period: { start, end },
		dailyBreakdown: dailyTotals.map(day => ({
			...day,
			calories: parseFloat(day.calories || '0'),
			protein: parseFloat(day.protein || '0'),
			carbohydrate: parseFloat(day.carbohydrate || '0'),
			fat: parseFloat(day.fat || '0'),
			fiber: parseFloat(day.fiber || '0'),
			sugar: parseFloat(day.sugar || '0'),
			sodium: parseFloat(day.sodium || '0'),
			entryCount: Number(day.entryCount)
		})),
		weeklyTotals,
		weeklyAverages,
		topFoods: topFoods.map(food => ({
			...food,
			calories: parseFloat(food.calories || '0'),
			logCount: Number(food.logCount)
		})),
		daysLogged: daysWithData
	};
}

async function getMonthlyAnalytics(userId: number, startDate?: string | null, endDate?: string | null) {
	// Default to last 30 days if no dates provided
	const end = endDate || new Date().toISOString().split('T')[0];
	const start = startDate || new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	// Get weekly aggregates for the month
	const weeklyData = await db
		.select({
			week: sql<string>`strftime('%Y-W%W', ${foodLog.date})`,
			calories: sql<string>`AVG(daily_calories)`,
			protein: sql<string>`AVG(daily_protein)`,
			carbohydrate: sql<string>`AVG(daily_carbohydrate)`,
			fat: sql<string>`AVG(daily_fat)`,
			fiber: sql<string>`AVG(daily_fiber)`,
			entryCount: sql<string>`SUM(daily_entries)`
		})
		.from(
			db
				.select({
					date: foodLog.date,
					week: sql<string>`strftime('%Y-W%W', ${foodLog.date})`,
					daily_calories: sql<string>`SUM(${serving.calories} * ${foodLog.quantity})`,
					daily_protein: sql<string>`SUM(${serving.protein} * ${foodLog.quantity})`,
					daily_carbohydrate: sql<string>`SUM(${serving.carbohydrate} * ${foodLog.quantity})`,
					daily_fat: sql<string>`SUM(${serving.fat} * ${foodLog.quantity})`,
					daily_fiber: sql<string>`SUM(${serving.fiber} * ${foodLog.quantity})`,
					daily_entries: count(foodLog.id)
				})
				.from(foodLog)
				.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
				.where(and(
					eq(foodLog.userId, userId),
					gte(foodLog.date, start),
					lte(foodLog.date, end)
				))
				.groupBy(foodLog.date)
				.as('daily_data')
		)
		.groupBy(sql`strftime('%Y-W%W', date)`)
		.orderBy(sql`strftime('%Y-W%W', date)`);

	// Get food variety statistics
	const foodVariety = await db
		.select({
			uniqueFoods: count(sql`DISTINCT ${foodLog.foodId}`),
			totalEntries: count(foodLog.id)
		})
		.from(foodLog)
		.where(and(
			eq(foodLog.userId, userId),
			gte(foodLog.date, start),
			lte(foodLog.date, end)
		));

	return {
		period: { start, end },
		weeklyBreakdown: weeklyData.map(week => ({
			...week,
			calories: parseFloat(week.calories || '0'),
			protein: parseFloat(week.protein || '0'),
			carbohydrate: parseFloat(week.carbohydrate || '0'),
			fat: parseFloat(week.fat || '0'),
			fiber: parseFloat(week.fiber || '0'),
			entryCount: Number(week.entryCount)
		})),
		foodVariety: {
			uniqueFoods: Number(foodVariety[0].uniqueFoods),
			totalEntries: Number(foodVariety[0].totalEntries),
			varietyScore: Number(foodVariety[0].totalEntries) > 0 
				? Number(foodVariety[0].uniqueFoods) / Number(foodVariety[0].totalEntries)
				: 0
		}
	};
}

async function getNutritionTrends(userId: number, startDate?: string | null, endDate?: string | null) {
	// Default to last 14 days for trend analysis
	const end = endDate || new Date().toISOString().split('T')[0];
	const start = startDate || new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	const trendData = await db
		.select({
			date: foodLog.date,
			calories: sql<string>`COALESCE(SUM(${serving.calories} * ${foodLog.quantity}), 0)`,
			protein: sql<string>`COALESCE(SUM(${serving.protein} * ${foodLog.quantity}), 0)`,
			carbohydrate: sql<string>`COALESCE(SUM(${serving.carbohydrate} * ${foodLog.quantity}), 0)`,
			fat: sql<string>`COALESCE(SUM(${serving.fat} * ${foodLog.quantity}), 0)`
		})
		.from(foodLog)
		.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
		.where(and(
			eq(foodLog.userId, userId),
			gte(foodLog.date, start),
			lte(foodLog.date, end)
		))
		.groupBy(foodLog.date)
		.orderBy(foodLog.date);

	// Calculate trends (simple linear regression slope)
	const calculateTrend = (values: number[]) => {
		if (values.length < 2) return 0;
		
		const n = values.length;
		const sumX = values.reduce((sum, _, i) => sum + i, 0);
		const sumY = values.reduce((sum, val) => sum + val, 0);
		const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
		const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0);
		
		const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
		return slope;
	};

	const processedData = trendData.map(day => ({
		date: day.date,
		calories: parseFloat(day.calories || '0'),
		protein: parseFloat(day.protein || '0'),
		carbohydrate: parseFloat(day.carbohydrate || '0'),
		fat: parseFloat(day.fat || '0')
	}));

	const trends = {
		calories: calculateTrend(processedData.map(d => d.calories)),
		protein: calculateTrend(processedData.map(d => d.protein)),
		carbohydrate: calculateTrend(processedData.map(d => d.carbohydrate)),
		fat: calculateTrend(processedData.map(d => d.fat))
	};

	return {
		period: { start, end },
		data: processedData,
		trends,
		trendAnalysis: {
			calories: trends.calories > 1 ? 'increasing' : trends.calories < -1 ? 'decreasing' : 'stable',
			protein: trends.protein > 0.5 ? 'increasing' : trends.protein < -0.5 ? 'decreasing' : 'stable',
			carbohydrate: trends.carbohydrate > 1 ? 'increasing' : trends.carbohydrate < -1 ? 'decreasing' : 'stable',
			fat: trends.fat > 0.5 ? 'increasing' : trends.fat < -0.5 ? 'decreasing' : 'stable'
		}
	};
}

async function getNutritionInsights(userId: number) {
	const today = new Date().toISOString().split('T')[0];
	const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	// Get weekly averages
	const weeklyStats = await db
		.select({
			avgCalories: sql<string>`AVG(daily_calories)`,
			avgProtein: sql<string>`AVG(daily_protein)`,
			avgCarbs: sql<string>`AVG(daily_carbs)`,
			avgFat: sql<string>`AVG(daily_fat)`,
			avgFiber: sql<string>`AVG(daily_fiber)`,
			avgSodium: sql<string>`AVG(daily_sodium)`,
			daysLogged: count(sql`DISTINCT date`)
		})
		.from(
			db
				.select({
					date: foodLog.date,
					daily_calories: sql<string>`SUM(${serving.calories} * ${foodLog.quantity})`,
					daily_protein: sql<string>`SUM(${serving.protein} * ${foodLog.quantity})`,
					daily_carbs: sql<string>`SUM(${serving.carbohydrate} * ${foodLog.quantity})`,
					daily_fat: sql<string>`SUM(${serving.fat} * ${foodLog.quantity})`,
					daily_fiber: sql<string>`SUM(${serving.fiber} * ${foodLog.quantity})`,
					daily_sodium: sql<string>`SUM(${serving.sodium} * ${foodLog.quantity})`
				})
				.from(foodLog)
				.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
				.where(and(
					eq(foodLog.userId, userId),
					gte(foodLog.date, sevenDaysAgo)
				))
				.groupBy(foodLog.date)
				.as('daily_stats')
		);

	const stats = weeklyStats[0];
	const insights = [];

	// Generate insights based on data
	const avgCalories = parseFloat(stats.avgCalories || '0');
	const avgProtein = parseFloat(stats.avgProtein || '0');
	const avgFiber = parseFloat(stats.avgFiber || '0');
	const avgSodium = parseFloat(stats.avgSodium || '0');
	const daysLogged = Number(stats.daysLogged);

	// Calorie insights
	if (avgCalories > 2500) {
		insights.push({
			type: 'warning',
			title: 'High Calorie Intake',
			description: `Your average daily calories (${Math.round(avgCalories)}) are above typical recommendations.`,
			suggestion: 'Consider portion control or lighter meal options.'
		});
	} else if (avgCalories < 1200) {
		insights.push({
			type: 'warning',
			title: 'Low Calorie Intake',
			description: `Your average daily calories (${Math.round(avgCalories)}) may be too low.`,
			suggestion: 'Ensure you\'re eating enough to meet your nutritional needs.'
		});
	}

	// Protein insights
	if (avgProtein < 50) {
		insights.push({
			type: 'suggestion',
			title: 'Low Protein Intake',
			description: `Your protein intake (${Math.round(avgProtein)}g/day) could be increased.`,
			suggestion: 'Add more lean meats, fish, legumes, or protein-rich snacks.'
		});
	} else if (avgProtein > 120) {
		insights.push({
			type: 'positive',
			title: 'Excellent Protein Intake',
			description: `Great job maintaining high protein intake (${Math.round(avgProtein)}g/day)!`,
			suggestion: 'Keep up the good work for muscle maintenance and satiety.'
		});
	}

	// Fiber insights
	if (avgFiber < 25) {
		insights.push({
			type: 'suggestion',
			title: 'Increase Fiber Intake',
			description: `Your fiber intake (${Math.round(avgFiber)}g/day) is below the recommended 25g.`,
			suggestion: 'Add more vegetables, fruits, whole grains, and legumes to your diet.'
		});
	}

	// Sodium insights
	if (avgSodium > 2300) {
		insights.push({
			type: 'warning',
			title: 'High Sodium Intake',
			description: `Your sodium intake (${Math.round(avgSodium)}mg/day) exceeds recommendations.`,
			suggestion: 'Reduce processed foods and restaurant meals, cook more at home.'
		});
	}

	// Logging consistency insights
	if (daysLogged >= 6) {
		insights.push({
			type: 'positive',
			title: 'Excellent Logging Consistency',
			description: `You've logged ${daysLogged} out of 7 days this week!`,
			suggestion: 'Consistent tracking is key to reaching your nutrition goals.'
		});
	} else if (daysLogged <= 3) {
		insights.push({
			type: 'suggestion',
			title: 'Improve Logging Consistency',
			description: `You've only logged ${daysLogged} days this week.`,
			suggestion: 'Try setting daily reminders to log your meals consistently.'
		});
	}

	return {
		weeklyAverages: {
			calories: avgCalories,
			protein: avgProtein,
			carbohydrate: parseFloat(stats.avgCarbs || '0'),
			fat: parseFloat(stats.avgFat || '0'),
			fiber: avgFiber,
			sodium: avgSodium
		},
		daysLogged,
		insights,
		recommendations: insights.filter(i => i.type === 'suggestion'),
		achievements: insights.filter(i => i.type === 'positive'),
		warnings: insights.filter(i => i.type === 'warning')
	};
}