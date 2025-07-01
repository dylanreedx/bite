import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { serving } from '$lib/db/schema.js';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action } = await request.json();
		
		if (action !== 'cleanup-nutrition') {
			return json({
				success: false,
				error: 'Invalid action'
			}, { status: 400 });
		}

		// NOTE: Auth temporarily disabled for cleanup - re-enable in production
		console.log('WARNING: Running cleanup without authentication');

		console.log('Starting nutrition data cleanup...');
		
		// Get count of NaN values before cleanup
		const beforeStats = await db
			.select({
				total: sql<number>`COUNT(*)`,
				nanCalories: sql<number>`SUM(CASE WHEN calories != calories THEN 1 ELSE 0 END)`,
				nanProtein: sql<number>`SUM(CASE WHEN protein != protein THEN 1 ELSE 0 END)`,
				nanCarbs: sql<number>`SUM(CASE WHEN carbohydrate != carbohydrate THEN 1 ELSE 0 END)`,
				nanFat: sql<number>`SUM(CASE WHEN fat != fat THEN 1 ELSE 0 END)`
			})
			.from(serving);

		// Update NaN values to NULL for all nutrition fields
		const nutritionFields = [
			'calories', 'carbohydrate', 'protein', 'fat', 'saturatedFat',
			'polyunsaturatedFat', 'monounsaturatedFat', 'transFat',
			'cholesterol', 'sodium', 'potassium', 'fiber', 'sugar',
			'addedSugars', 'vitaminD', 'vitaminA', 'vitaminC', 'calcium', 'iron'
		];

		const cleanupResults = [];
		
		for (const field of nutritionFields) {
			try {
				await db
					.update(serving)
					.set({ [field]: null })
					.where(sql`${serving[field]} != ${serving[field]}`); // This checks for NaN
				
				cleanupResults.push(`${field}: cleaned NaN values`);
			} catch (error) {
				cleanupResults.push(`${field}: error - ${error.message}`);
			}
		}

		// Clean up obviously invalid values
		await db
			.update(serving)
			.set({ fat: null })
			.where(sql`${serving.fat} > 100`);

		await db
			.update(serving)
			.set({ protein: null })
			.where(sql`${serving.protein} > 200`);

		await db
			.update(serving)
			.set({ carbohydrate: null })
			.where(sql`${serving.carbohydrate} > 500`);

		await db
			.update(serving)
			.set({ calories: null })
			.where(sql`${serving.calories} > 2000`);

		// Get stats after cleanup
		const afterStats = await db
			.select({
				total: sql<number>`COUNT(*)`,
				validCalories: sql<number>`COUNT(calories)`,
				validProtein: sql<number>`COUNT(protein)`,
				validCarbs: sql<number>`COUNT(carbohydrate)`,
				validFat: sql<number>`COUNT(fat)`
			})
			.from(serving);

		console.log('Nutrition data cleanup completed successfully!');
		
		return json({
			success: true,
			message: 'Nutrition data cleanup completed',
			before: beforeStats[0],
			after: afterStats[0],
			cleanupResults
		});
		
	} catch (error) {
		console.error('Error during cleanup:', error);
		return json({
			success: false,
			error: 'Cleanup failed',
			details: error.message
		}, { status: 500 });
	}
};