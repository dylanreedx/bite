import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { food, serving } from '../src/lib/db/schema.js';
import { eq, sql, isNull, and, gte, lt } from 'drizzle-orm';
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

// Configuration options - targeting mid-range foods with better success rates
const BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE || '10'); // Small batches for better control
const MAX_FOODS = parseInt(process.env.SYNC_MAX_FOODS || '100'); // Process in smaller chunks
const DELAY_MS = parseInt(process.env.SYNC_DELAY_MS || '2000'); // Longer delay to avoid rate limits

// Target ID ranges with higher success rates based on analysis
const TARGET_RANGES = [
	{ name: 'Mid Range', min: 30001, max: 50000, priority: 1 }, // 73.6% success rate
	{ name: 'Brand Range', min: 20001, max: 30000, priority: 2 } // 77.3% success rate
];

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
		// Primary endpoint that has been working
		const url = `${PROXY_URL}/food?food_id=${foodId}&format=json`;

		console.log(`  Trying primary endpoint: ${url}`);
		const response = await fetch(url);

		if (response.ok) {
			const data = await response.json();
			console.log(`  ✅ Success with primary endpoint`);

			// Handle both old and new response formats
			if (data.food) {
				return data.food;
			} else if (data.id || data.food_id) {
				return data;
			}
			return null;
		} else {
			console.log(`  ❌ Primary endpoint failed: ${response.status} ${response.statusText}`);
			return null;
		}
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
				isDefault: 1,
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

async function syncMidRangeFoods() {
	console.log('🚀 Starting targeted mid-range food servings sync...\n');
	console.log(`⚙️  Configuration:`);
	console.log(`   Batch size: ${BATCH_SIZE}`);
	console.log(`   Max foods: ${MAX_FOODS === 0 ? 'No limit' : MAX_FOODS}`);
	console.log(`   Delay: ${DELAY_MS}ms`);
	console.log(`   Target ranges: ${TARGET_RANGES.map(r => r.name).join(', ')}\n`);

	if (!PROXY_URL) {
		console.error('❌ FATSECRET_PROXY_URL environment variable is not set');
		process.exit(1);
	}

	try {
		let totalProcessed = 0;
		let totalSuccess = 0;
		let totalErrors = 0;

		// Process each target range in priority order
		for (const range of TARGET_RANGES.sort((a, b) => a.priority - b.priority)) {
			console.log(`\n🎯 Processing ${range.name} (${range.min}-${range.max})`);

			// Get foods without servings in this range
			const foodsInRange = await db
				.select()
				.from(food)
				.leftJoin(serving, eq(food.foodId, serving.foodId))
				.where(
					and(
						isNull(serving.foodId),
						gte(food.foodId, range.min),
						lt(food.foodId, range.max)
					)
				)
				.limit(MAX_FOODS);

			console.log(`📊 Found ${foodsInRange.length} foods without servings in ${range.name}\n`);

			if (foodsInRange.length === 0) {
				console.log(`✅ No foods to sync in ${range.name}!`);
				continue;
			}

			// Process in batches
			for (let i = 0; i < foodsInRange.length; i += BATCH_SIZE) {
				const batch = foodsInRange.slice(i, i + BATCH_SIZE);
				const batchNum = Math.floor(i / BATCH_SIZE) + 1;
				const totalBatches = Math.ceil(foodsInRange.length / BATCH_SIZE);

				console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} foods) from ${range.name}`);

				for (const { food: foodItem } of batch) {
					totalProcessed++;
					console.log(
						`\n[${totalProcessed}] Processing: ${foodItem.foodName}`
					);
					console.log(`  Food ID: ${foodItem.foodId} (${range.name})`);
					console.log(`  Brand: ${foodItem.brandName || 'Generic'}`);

					console.log('  🔍 Fetching servings from FatSecret...');

					try {
						const foodData = await getFoodFromFatSecret(foodItem.foodId);

						if (foodData) {
							// Extract servings from the response
							let servings: any[] = [];

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
								totalSuccess++;
							} else {
								console.log('  ⚠️  No servings data found in API response');
								totalErrors++;
							}
						} else {
							console.log('  ❌ Failed to fetch food data from API');
							totalErrors++;
						}
					} catch (error) {
						console.error(`  ❌ Error processing food: ${error}`);
						totalErrors++;
					}

					// Add delay between requests
					if (totalProcessed < foodsInRange.length) {
						console.log(`  ⏱️  Waiting ${DELAY_MS}ms...`);
						await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
					}

					// Check if we've hit the max foods limit
					if (MAX_FOODS > 0 && totalProcessed >= MAX_FOODS) {
						console.log(`\n🚫 Reached max foods limit (${MAX_FOODS}). Stopping sync.`);
						break;
					}
				}

				// Break if we've hit the limit
				if (MAX_FOODS > 0 && totalProcessed >= MAX_FOODS) {
					break;
				}

				// Batch completion message
				console.log(
					`\n✅ Batch ${batchNum} completed from ${range.name}`
				);

				// Longer delay between batches
				if (i + BATCH_SIZE < foodsInRange.length) {
					console.log(`⏱️  Batch break - waiting ${DELAY_MS * 2}ms before next batch...`);
					await new Promise((resolve) => setTimeout(resolve, DELAY_MS * 2));
				}
			}

			// Break if we've hit the limit
			if (MAX_FOODS > 0 && totalProcessed >= MAX_FOODS) {
				break;
			}
		}

		console.log('\n🎉 Targeted sync completed!');
		console.log('📈 Summary:');
		console.log(`  Foods processed: ${totalProcessed}`);
		console.log(`  Successfully synced: ${totalSuccess}`);
		console.log(`  Errors/No data: ${totalErrors}`);
		console.log(`  Success rate: ${totalProcessed > 0 ? ((totalSuccess / totalProcessed) * 100).toFixed(1) : 0}%`);
	} catch (error) {
		console.error('❌ Fatal error during sync:', error);
		process.exit(1);
	}
}

// Run the sync
syncMidRangeFoods()
	.then(() => {
		console.log('\n✅ Targeted sync script completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Targeted sync script failed:', error);
		process.exit(1);
	});
