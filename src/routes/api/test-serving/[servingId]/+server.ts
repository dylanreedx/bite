import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { serving } from '$lib/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { fetchServingNutrition } from '$lib/utils/servingNutritionFetcher.js';

export const GET: RequestHandler = async ({ params }) => {
	const servingId = parseInt(params.servingId);

	if (isNaN(servingId)) {
		return json(
			{
				success: false,
				error: 'Invalid serving ID'
			},
			{ status: 400 }
		);
	}

	try {
		console.log(`[TestServing] Testing nutrition fetch for serving ID: ${servingId}`);

		// First, get the serving from database
		const servingData = await db
			.select()
			.from(serving)
			.where(eq(serving.servingId, servingId))
			.limit(1);

		if (servingData.length === 0) {
			return json(
				{
					success: false,
					error: 'Serving not found in database'
				},
				{ status: 404 }
			);
		}

		const originalServing = servingData[0];
		console.log(`[TestServing] Original serving data:`, JSON.stringify(originalServing, null, 2));

		// Check if serving already has nutrition data
		const hasOriginalNutrition =
			(originalServing.calories !== null && originalServing.calories > 0) ||
			(originalServing.protein !== null && originalServing.protein > 0) ||
			(originalServing.carbohydrate !== null && originalServing.carbohydrate > 0) ||
			(originalServing.fat !== null && originalServing.fat > 0);

		console.log(`[TestServing] Original serving has nutrition: ${hasOriginalNutrition}`);

		// Try to fetch enhanced nutrition data
		const enhancedServing = await fetchServingNutrition(
			originalServing.foodId,
			servingId,
			originalServing
		);

		console.log(`[TestServing] Enhanced serving data:`, JSON.stringify(enhancedServing, null, 2));

		// Check if enhancement was successful
		const hasEnhancedNutrition =
			(enhancedServing.calories !== null && enhancedServing.calories !== undefined && enhancedServing.calories > 0) ||
			(enhancedServing.protein !== null && enhancedServing.protein !== undefined && enhancedServing.protein > 0) ||
			(enhancedServing.carbohydrate !== null && enhancedServing.carbohydrate !== undefined && enhancedServing.carbohydrate > 0) ||
			(enhancedServing.fat !== null && enhancedServing.fat !== undefined && enhancedServing.fat > 0);

		const nutritionImproved = !hasOriginalNutrition && hasEnhancedNutrition;

		return json({
			success: true,
			servingId,
			foodId: originalServing.foodId,
			servingDescription: originalServing.servingDescription,
			analysis: {
				hadOriginalNutrition: hasOriginalNutrition,
				hasEnhancedNutrition: hasEnhancedNutrition,
				nutritionImproved: nutritionImproved,
				enhancementSuccessful: hasEnhancedNutrition
			},
			original: {
				calories: originalServing.calories,
				protein: originalServing.protein,
				carbohydrate: originalServing.carbohydrate,
				fat: originalServing.fat,
				saturatedFat: originalServing.saturatedFat,
				cholesterol: originalServing.cholesterol,
				sodium: originalServing.sodium,
				fiber: originalServing.fiber,
				sugar: originalServing.sugar
			},
			enhanced: {
				calories: enhancedServing.calories,
				protein: enhancedServing.protein,
				carbohydrate: enhancedServing.carbohydrate,
				fat: enhancedServing.fat,
				saturatedFat: enhancedServing.saturatedFat,
				cholesterol: enhancedServing.cholesterol,
				sodium: enhancedServing.sodium,
				fiber: enhancedServing.fiber,
				sugar: enhancedServing.sugar
			}
		});
	} catch (error) {
		console.error(`[TestServing] Error testing serving ${servingId}:`, error);
		return json(
			{
				success: false,
				error: 'Failed to test serving nutrition fetch',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
