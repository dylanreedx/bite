import { db } from '../src/lib/db/index.ts';
import { serving } from '../src/lib/db/schema.ts';
import { sql } from 'drizzle-orm';

async function cleanupNutritionData() {
	console.log('Starting nutrition data cleanup...');
	
	try {
		// Update all NaN values to NULL for each nutrition field
		const nutritionFields = [
			'calories', 'carbohydrate', 'protein', 'fat', 'saturated_fat',
			'polyunsaturated_fat', 'monounsaturated_fat', 'trans_fat',
			'cholesterol', 'sodium', 'potassium', 'fiber', 'sugar',
			'added_sugars', 'vitamin_d', 'vitamin_a', 'vitamin_c', 'calcium', 'iron'
		];

		for (const field of nutritionFields) {
			const result = await db
				.update(serving)
				.set({ [field]: null })
				.where(sql`${serving[field]} IS NOT ${serving[field]}`); // This checks for NaN
			
			console.log(`Cleaned ${field}: updated NaN values to NULL`);
		}

		// Also clean up any invalid numeric values (like empty strings converted to 0)
		// Set clearly invalid values (like 50.00000000 fat) to reasonable defaults
		await db
			.update(serving)
			.set({ fat: null })
			.where(sql`${serving.fat} > 100`); // Fat > 100g per serving is likely invalid

		console.log('Nutrition data cleanup completed successfully!');
		
	} catch (error) {
		console.error('Error during cleanup:', error);
	}
	
	process.exit(0);
}

cleanupNutritionData();