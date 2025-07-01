import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { food, serving, foodLog } from '$lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({
			success: false,
			error: 'Authentication required'
		}, { status: 401 });
	}

	const userId = locals.user.id;

	try {
		const requestBody = await request.json() as {
			foodId?: number;
			servingId?: number;
			quantity?: number;
			date?: string;
			meal?: string;
		};
		console.log('Food logging request body:', JSON.stringify(requestBody, null, 2));
		
		const { foodId, servingId, quantity, date, meal } = requestBody;

		// Validate required fields
		if (typeof foodId !== 'number' || typeof servingId !== 'number' || typeof quantity !== 'number') {
			return json({
				success: false,
				error: 'foodId, servingId, and quantity are required and must be numbers'
			}, { status: 400 });
		}

		// Validate quantity is positive
		if (quantity <= 0) {
			return json({
				success: false,
				error: 'Quantity must be a positive number'
			}, { status: 400 });
		}

		// Use provided date or default to today
		const logDate = date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

		// Verify the food exists
		const foodExists = await db
			.select()
			.from(food)
			.where(eq(food.foodId, parseInt(foodId)))
			.limit(1);

		if (foodExists.length === 0) {
			return json({
				success: false,
				error: 'Food not found'
			}, { status: 404 });
		}

		// Check if serving exists
		let servingExists = await db
			.select()
			.from(serving)
			.where(and(
				eq(serving.servingId, servingId),
				eq(serving.foodId, foodId)
			))
			.limit(1);

		// If serving doesn't exist OR has invalid nutrition data (NaN/null), try to re-fetch
		const needsRefresh = servingExists.length === 0 || 
			(servingExists[0] && (
				servingExists[0].calories === null || 
				isNaN(servingExists[0].calories) ||
				servingExists[0].protein === null ||
				isNaN(servingExists[0].protein)
			));

		if (needsRefresh) {
			console.log(`Serving ${servingId} needs refresh, attempting to re-fetch from FatSecret...`);
			
			// Try to re-fetch food details which will update the serving data
			try {
				const response = await fetch(`${process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : ''}/api/foods/${foodId}`);
				if (response.ok) {
					// Try to find the serving again after refresh
					servingExists = await db
						.select()
						.from(serving)
						.where(and(
							eq(serving.servingId, servingId),
							eq(serving.foodId, foodId)
						))
						.limit(1);
				}
			} catch (error) {
				console.error('Failed to re-fetch food details:', error);
			}
		}

		if (servingExists.length === 0) {
			return json({
				success: false,
				error: 'Serving not found for this food'
			}, { status: 404 });
		}

		const actualServingId = servingId;

		// Create the food log entry
		const newLogEntry = await db.insert(foodLog).values({
			userId,
			foodId,
			servingId: actualServingId,
			quantity,
			date: logDate
		}).returning();

		// Get the complete logged food information for response
		const loggedFoodInfo = await db
			.select({
				id: foodLog.id,
				userId: foodLog.userId,
				foodId: foodLog.foodId,
				servingId: foodLog.servingId,
				quantity: foodLog.quantity,
				loggedAt: foodLog.loggedAt,
				date: foodLog.date,
				// Food info
				foodName: food.foodName,
				brandName: food.brandName,
				foodType: food.foodType,
				// Serving info
				servingDescription: serving.servingDescription,
				calories: serving.calories,
				protein: serving.protein,
				carbohydrate: serving.carbohydrate,
				fat: serving.fat,
				fiber: serving.fiber,
				sugar: serving.sugar,
				sodium: serving.sodium,
				saturatedFat: serving.saturatedFat,
				cholesterol: serving.cholesterol
			})
			.from(foodLog)
			.innerJoin(food, eq(foodLog.foodId, food.foodId))
			.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
			.where(eq(foodLog.id, newLogEntry[0].id))
			.limit(1);

		const loggedFood = loggedFoodInfo[0];

		// Calculate actual nutrition values based on quantity
		const loggedFoodWithNutrition = loggedFood as typeof loggedFood & {
			calories?: number;
			protein?: number;
			carbohydrate?: number;
			fat?: number;
			fiber?: number;
			sugar?: number;
			sodium?: number;
			saturatedFat?: number;
			cholesterol?: number;
			servingDescription?: string;
		};

		const nutritionData = {
			calories: (loggedFoodWithNutrition.calories ?? 0) * quantity,
			protein: (loggedFoodWithNutrition.protein ?? 0) * quantity,
			carbohydrate: (loggedFoodWithNutrition.carbohydrate ?? 0) * quantity,
			fat: (loggedFoodWithNutrition.fat ?? 0) * quantity,
			fiber: (loggedFoodWithNutrition.fiber ?? 0) * quantity,
			sugar: (loggedFoodWithNutrition.sugar ?? 0) * quantity,
			sodium: (loggedFoodWithNutrition.sodium ?? 0) * quantity,
			saturatedFat: (loggedFoodWithNutrition.saturatedFat ?? 0) * quantity,
			cholesterol: (loggedFoodWithNutrition.cholesterol ?? 0) * quantity
		};

		return json({
			success: true,
			logEntry: {
				id: loggedFood.id,
				userId: loggedFood.userId,
				foodId: loggedFood.foodId,
				servingId: loggedFood.servingId,
				quantity: loggedFood.quantity,
				date: loggedFood.date,
				loggedAt: loggedFood.loggedAt,
				meal: meal || null,
				food: {
					foodName: loggedFood.foodName,
					brandName: loggedFood.brandName,
					foodType: loggedFood.foodType
				},
				serving: {
					servingDescription: loggedFoodWithNutrition.servingDescription || '1 serving',
					// Base nutrition per serving
					baseNutrition: {
						calories: loggedFoodWithNutrition.calories ?? 0,
						protein: loggedFoodWithNutrition.protein ?? 0,
						carbohydrate: loggedFoodWithNutrition.carbohydrate ?? 0,
						fat: loggedFoodWithNutrition.fat ?? 0,
						fiber: loggedFoodWithNutrition.fiber ?? 0,
						sugar: loggedFoodWithNutrition.sugar ?? 0,
						sodium: loggedFoodWithNutrition.sodium ?? 0,
						saturatedFat: loggedFoodWithNutrition.saturatedFat ?? 0,
						cholesterol: loggedFoodWithNutrition.cholesterol ?? 0
					}
				},
				// Calculated nutrition for the logged quantity
				nutrition: nutritionData
			}
		});

	} catch (error) {
		console.error('Error logging food:', error);
		return json({
			success: false,
			error: 'Failed to log food'
		}, { status: 500 });
	}
};

// GET route to fetch user's food log for a specific date
export const GET: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({
			success: false,
			error: 'Authentication required'
		}, { status: 401 });
	}

	const userId = locals.user.id;
	const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
	const limit = parseInt(url.searchParams.get('limit') || '50');

	try {
		const foodLogs = await db
			.select({
				id: foodLog.id,
				userId: foodLog.userId,
				foodId: foodLog.foodId,
				servingId: foodLog.servingId,
				quantity: foodLog.quantity,
				loggedAt: foodLog.loggedAt,
				date: foodLog.date,
				// Food info
				foodName: food.foodName,
				brandName: food.brandName,
				foodType: food.foodType,
				// Serving info
				servingDescription: serving.servingDescription,
				calories: serving.calories,
				protein: serving.protein,
				carbohydrate: serving.carbohydrate,
				fat: serving.fat,
				fiber: serving.fiber,
				sugar: serving.sugar,
				sodium: serving.sodium,
				saturatedFat: serving.saturatedFat,
				cholesterol: serving.cholesterol
			})
			.from(foodLog)
			.innerJoin(food, eq(foodLog.foodId, food.foodId))
			.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
			.where(and(
				eq(foodLog.userId, userId),
				eq(foodLog.date, date)
			))
			.orderBy(desc(foodLog.loggedAt))
			.limit(limit);

		// Process the results to include calculated nutrition
		const processedLogs = foodLogs.map(log => {
			const nutritionData = {
				calories: (log.calories ?? 0) * log.quantity,
				protein: (log.protein ?? 0) * log.quantity,
				carbohydrate: (log.carbohydrate ?? 0) * log.quantity,
				fat: (log.fat ?? 0) * log.quantity,
				fiber: (log.fiber ?? 0) * log.quantity,
				sugar: (log.sugar ?? 0) * log.quantity,
				sodium: (log.sodium ?? 0) * log.quantity,
				saturatedFat: (log.saturatedFat ?? 0) * log.quantity,
				cholesterol: (log.cholesterol ?? 0) * log.quantity
			};

			return {
				id: log.id,
				userId: log.userId,
				foodId: log.foodId,
				servingId: log.servingId,
				quantity: log.quantity,
				date: log.date,
				loggedAt: log.loggedAt,
				food: {
					foodName: log.foodName,
					brandName: log.brandName,
					foodType: log.foodType
				},
				serving: {
					servingDescription: log.servingDescription,
					baseNutrition: {
						calories: log.calories ?? 0,
						protein: log.protein ?? 0,
						carbohydrate: log.carbohydrate ?? 0,
						fat: log.fat ?? 0,
						fiber: log.fiber ?? 0,
						sugar: log.sugar ?? 0,
						sodium: log.sodium ?? 0,
						saturatedFat: log.saturatedFat ?? 0,
						cholesterol: log.cholesterol ?? 0
					}
				},
				nutrition: nutritionData
			};
		});

		// Calculate daily totals
		const dailyTotals = processedLogs.reduce((totals, log) => ({
			calories: totals.calories + log.nutrition.calories,
			protein: totals.protein + log.nutrition.protein,
			carbohydrate: totals.carbohydrate + log.nutrition.carbohydrate,
			fat: totals.fat + log.nutrition.fat,
			fiber: totals.fiber + log.nutrition.fiber,
			sugar: totals.sugar + log.nutrition.sugar,
			sodium: totals.sodium + log.nutrition.sodium,
			saturatedFat: totals.saturatedFat + log.nutrition.saturatedFat,
			cholesterol: totals.cholesterol + log.nutrition.cholesterol
		}), {
			calories: 0,
			protein: 0,
			carbohydrate: 0,
			fat: 0,
			fiber: 0,
			sugar: 0,
			sodium: 0,
			saturatedFat: 0,
									cholesterol: 0
		});

		return json({
			success: true,
			date,
			logs: processedLogs,
			dailyTotals,
			totalEntries: processedLogs.length
		});

	} catch (error) {
		console.error('Error fetching food log:', error);
		return json({
			success: false,
			error: 'Failed to fetch food log'
		}, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	const userId = locals.user.id;

	try {
		const { id, servingId, quantity, meal } = await request.json();

		if (!id || !servingId || !quantity) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		const updatedLog = await db
			.update(foodLog)
			.set({
				servingId,
				quantity,
				meal
			})
			.where(and(eq(foodLog.id, id), eq(foodLog.userId, userId)))
			.returning();

		if (updatedLog.length === 0) {
			return json({ success: false, error: 'Log entry not found or unauthorized' }, { status: 404 });
		}

		const logEntryInfo = await db
			.select({
				id: foodLog.id,
				userId: foodLog.userId,
				foodId: foodLog.foodId,
				servingId: foodLog.servingId,
				quantity: foodLog.quantity,
				loggedAt: foodLog.loggedAt,
				date: foodLog.date,
				meal: foodLog.meal,
				foodName: food.foodName,
				brandName: food.brandName,
				foodType: food.foodType,
				servingDescription: serving.servingDescription,
				calories: serving.calories,
				protein: serving.protein,
				carbohydrate: serving.carbohydrate,
				fat: serving.fat,
				fiber: serving.fiber,
				sugar: serving.sugar,
				sodium: serving.sodium,
				saturatedFat: serving.saturatedFat,
				cholesterol: serving.cholesterol
			})
			.from(foodLog)
			.innerJoin(food, eq(foodLog.foodId, food.foodId))
			.innerJoin(serving, eq(foodLog.servingId, serving.servingId))
			.where(eq(foodLog.id, id))
			.limit(1);

		const logEntry = logEntryInfo[0];

		const nutritionData = {
			calories: (logEntry.calories ?? 0) * logEntry.quantity,
			protein: (logEntry.protein ?? 0) * logEntry.quantity,
			carbohydrate: (logEntry.carbohydrate ?? 0) * logEntry.quantity,
			fat: (logEntry.fat ?? 0) * logEntry.quantity,
			fiber: (logEntry.fiber ?? 0) * logEntry.quantity,
			sugar: (logEntry.sugar ?? 0) * logEntry.quantity,
			sodium: (logEntry.sodium ?? 0) * logEntry.quantity,
			saturatedFat: (logEntry.saturatedFat ?? 0) * logEntry.quantity,
			cholesterol: (logEntry.cholesterol ?? 0) * logEntry.quantity
		};

		return json({
			success: true,
			logEntry: {
				...logEntry,
				nutrition: nutritionData
			}
		});
	} catch (error) {
		console.error('Error updating food log:', error);
		return json({ success: false, error: 'Failed to update food log entry' }, { status: 500 });
	}
};

// DELETE route to remove a food log entry
export const DELETE: RequestHandler = async ({ url, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json({
			success: false,
			error: 'Authentication required'
		}, { status: 401 });
	}

	const userId = locals.user.id;
	const logId = url.searchParams.get('id');

	if (!logId) {
		return json({
			success: false,
			error: 'Log ID is required'
		}, { status: 400 });
	}

	try {
		// Verify the log entry belongs to the user
		const logEntry = await db
			.select()
			.from(foodLog)
			.where(and(
				eq(foodLog.id, parseInt(logId)),
				eq(foodLog.userId, userId)
			))
			.limit(1);

		if (logEntry.length === 0) {
			return json({
				success: false,
				error: 'Log entry not found or unauthorized'
			}, { status: 404 });
		}

		// Delete the log entry
		await db
			.delete(foodLog)
			.where(and(
				eq(foodLog.id, parseInt(logId)),
				eq(foodLog.userId, userId)
			));

		return json({
			success: true,
			message: 'Food log entry deleted successfully'
		});

	} catch (error) {
		console.error('Error deleting food log:', error);
		return json({
			success: false,
			error: 'Failed to delete food log entry'
		}, { status: 500 });
	}
};