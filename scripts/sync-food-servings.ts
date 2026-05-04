import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { food, serving } from '../src/lib/db/schema.js';
import { eq, sql, isNull } from 'drizzle-orm';
import { config } from 'dotenv';

// Load environment variables
config();

// Create the database client
const client = createClient({
	url: process.env.DATABASE_URL!,
	authToken: process.env.DATABASE_AUTH_TOKEN!
});

// Create the drizzle instance
const db = drizzle(client);

const PROXY_URL = process.env.FATSECRET_PROXY_URL;

// Configuration options
const BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE || '50'); // How many foods to process at once
const MAX_FOODS = parseInt(process.env.SYNC_MAX_FOODS || '0'); // 0 = no limit
const DELAY_MS = parseInt(process.env.SYNC_DELAY_MS || '1000'); // Delay between requests

interface FatSecretServing {
	id?: string | number;
	serving_id?: string | number;
	description?: string;
	serving_description?: string;
	url?: string;
	serving_url?: string;
	metricServingAmount?: string;
	metric_serving_amount?: string;
	metricServingUnit?: string;
	metric_serving_unit?: string;
	numberOfUnits?: string;
	number_of_units?: string;
	measurementDescription?: string;
	measurement_description?: string;
	calories?: number;
	carbohydrate?: number;
	protein?: number;
	fat?: number;
	saturatedFat?: number;
	saturated_fat?: number;
	polyunsaturatedFat?: number;
	polyunsaturated_fat?: number;
	monounsaturatedFat?: number;
	monounsaturated_fat?: number;
	transFat?: number;
	trans_fat?: number;
	cholesterol?: number;
	sodium?: number;
	potassium?: number;
	fiber?: number;
	sugar?: number;
	addedSugars?: number;
	added_sugars?: number;
	vitaminD?: number;
	vitamin_d?: number;
	vitaminA?: number;
	vitamin_a?: number;
	vitaminC?: number;
	vitamin_c?: number;
	calcium?: number;
	iron?: number;
}

async function getFoodFromFatSecret(foodId: number) {
	if (!PROXY_URL) {
		console.warn('FATSECRET_PROXY_URL not configured');
		return null;
	}

	try {
		// Try multiple endpoint patterns since proxy may only support limited endpoints
		const endpoints = [
			`${PROXY_URL}/food?food_id=${foodId}&format=json`,
			`${PROXY_URL}/get?id=${foodId}`,
			`${PROXY_URL}/detail?food_id=${foodId}`,
			`${PROXY_URL}/foods/${foodId}`,
			`${PROXY_URL}/food/${foodId}`
		];

		for (const url of endpoints) {
			console.log(`  Trying endpoint: ${url}`);
			try {
				const response = await fetch(url);

				if (response.ok) {
					const data = await response.json();
					console.log(`  ✅ Success with endpoint: ${url}`);

					// Handle both old and new response formats
					if (data.food) {
						// Old format: { food: { ... } }
						return data.food;
					} else if (data.id || data.food_id) {
						// New format: direct object
						return data;
					}
					return null;
				} else {
					console.log(`  ❌ Failed: ${response.status} ${response.statusText}`);
				}
			} catch (endpointError) {
				console.log(`  ❌ Error: ${endpointError}`);
			}
		}

		console.warn('  ⚠️  No working endpoint found for this food');
		return null;
	} catch (error) {
		console.error('  ❌ Error getting food from FatSecret:', error);
		return null;
	}
}

async function saveServingsToDatabase(foodId: number, servings: any[]) {
	if (servings.length === 0) {
		console.log('  No servings to save');
		return;
	}

	try {
		const servingValues = servings.map((srv: FatSecretServing) => {
			const servingId = srv.id || (srv as any).serving_id;
			const description = srv.description || (srv as any).serving_description;
			const url = srv.url || (srv as any).serving_url || '';

			return {
				servingId: typeof servingId === 'string' ? parseInt(servingId) : servingId,
				foodId: foodId,
				servingDescription: description,
				servingUrl: url,
				metricServingAmount:
					(srv.metricServingAmount || (srv as any).metric_serving_amount)?.toString() || null,
				metricServingUnit: srv.metricServingUnit || (srv as any).metric_serving_unit || null,
				numberOfUnits: (srv.numberOfUnits || (srv as any).number_of_units)?.toString() || null,
				measurementDescription:
					srv.measurementDescription || (srv as any).measurement_description || null,
				isDefault: 1, // Mark as default since FatSecret doesn't provide this field
				calories: srv.calories || null,
				carbohydrate: srv.carbohydrate || null,
				protein: srv.protein || null,
				fat: srv.fat || null,
				saturatedFat: srv.saturatedFat || (srv as any).saturated_fat || null,
				polyunsaturatedFat: srv.polyunsaturatedFat || (srv as any).polyunsaturated_fat || null,
				monounsaturatedFat: srv.monounsaturatedFat || (srv as any).monounsaturated_fat || null,
				transFat: srv.transFat || (srv as any).trans_fat || null,
				cholesterol: srv.cholesterol || null,
				sodium: srv.sodium || null,
				potassium: srv.potassium || null,
				fiber: srv.fiber || null,
				sugar: srv.sugar || null,
				addedSugars: srv.addedSugars || (srv as any).added_sugars || null,
				vitaminD: srv.vitaminD || (srv as any).vitamin_d || null,
				vitaminA: srv.vitaminA || (srv as any).vitamin_a || null,
				vitaminC: srv.vitaminC || (srv as any).vitamin_c || null,
				calcium: srv.calcium || null,
				iron: srv.iron || null
			};
		});

		await db.insert(serving).values(servingValues).onConflictDoNothing();
		console.log(`  ✅ Saved ${servings.length} servings to database`);
	} catch (error) {
		console.error('  ❌ Error saving servings to database:', error);
	}
}

async function syncFoodServings() {
	console.log('🚀 Starting food servings sync...\n');
	console.log(`⚙️  Configuration:`);
	console.log(`   Batch size: ${BATCH_SIZE}`);
	console.log(`   Max foods: ${MAX_FOODS === 0 ? 'No limit' : MAX_FOODS}`);
	console.log(`   Delay: ${DELAY_MS}ms\n`);

	if (!PROXY_URL) {
		console.error('❌ FATSECRET_PROXY_URL environment variable is not set');
		process.exit(1);
	}

	try {
		// Get foods without servings first
		console.log('🔍 Finding foods without servings...');
		const foodsWithoutServings = await db
			.select()
			.from(food)
			.leftJoin(serving, eq(food.foodId, serving.foodId))
			.where(isNull(serving.foodId))
			.limit(MAX_FOODS > 0 ? MAX_FOODS : undefined);

		console.log(`📊 Found ${foodsWithoutServings.length} foods without servings\n`);

		if (foodsWithoutServings.length === 0) {
			console.log('✅ All foods already have servings! Nothing to sync.');
			return;
		}

		let processedCount = 0;
		let successCount = 0;
		let errorCount = 0;

		// Process in batches
		for (let i = 0; i < foodsWithoutServings.length; i += BATCH_SIZE) {
			const batch = foodsWithoutServings.slice(i, i + BATCH_SIZE);
			const batchNum = Math.floor(i / BATCH_SIZE) + 1;
			const totalBatches = Math.ceil(foodsWithoutServings.length / BATCH_SIZE);

			console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} foods)`);

			for (const { food: foodItem } of batch) {
				processedCount++;
				console.log(
					`\n[${processedCount}/${foodsWithoutServings.length}] Processing: ${foodItem.foodName}`
				);
				console.log(`  Food ID: ${foodItem.foodId}`);
				console.log(`  Brand: ${foodItem.brandName || 'Generic'}`);

				console.log('  🔍 Fetching servings from FatSecret...');

				try {
					// Fetch food details from external API
					const foodData = await getFoodFromFatSecret(foodItem.foodId);

					if (foodData) {
						// Extract servings from the response
						let servings: any[] = [];

						// Handle different response formats
						if (foodData.servings) {
							if (Array.isArray(foodData.servings)) {
								servings = foodData.servings;
							} else if (foodData.servings.serving) {
								servings = Array.isArray(foodData.servings.serving)
									? foodData.servings.serving
									: [foodData.servings.serving];
							}
						}

						if (servings.length > 0) {
							await saveServingsToDatabase(foodItem.foodId, servings);
							successCount++;
						} else {
							console.log('  ⚠️  No servings data found in API response');
							errorCount++;
						}
					} else {
						console.log('  ❌ Failed to fetch food data from API');
						errorCount++;
					}
				} catch (error) {
					console.error(`  ❌ Error processing food: ${error}`);
					errorCount++;
				}

				// Add a delay to avoid rate limiting
				if (processedCount < foodsWithoutServings.length) {
					console.log(`  ⏱️  Waiting ${DELAY_MS}ms...`);
					await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
				}
			}

			// Batch completion message
			console.log(
				`\n✅ Batch ${batchNum} completed (${successCount} synced, ${errorCount} errors)`
			);

			// Longer delay between batches
			if (i + BATCH_SIZE < foodsWithoutServings.length) {
				console.log(`⏱️  Batch break - waiting ${DELAY_MS * 2}ms before next batch...`);
				await new Promise((resolve) => setTimeout(resolve, DELAY_MS * 2));
			}
		}

		console.log('\n🎉 Sync completed!');
		console.log('📈 Summary:');
		console.log(`  Foods processed: ${processedCount}`);
		console.log(`  Successfully synced: ${successCount}`);
		console.log(`  Errors/No data: ${errorCount}`);
		console.log(`  Success rate: ${((successCount / processedCount) * 100).toFixed(1)}%`);
	} catch (error) {
		console.error('❌ Fatal error during sync:', error);
		process.exit(1);
	}
}

// Run the sync
syncFoodServings()
	.then(() => {
		console.log('\n✅ Sync script completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Sync script failed:', error);
		process.exit(1);
	});
