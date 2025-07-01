import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { food, serving } from '$lib/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { FATSECRET_PROXY_URL } from '$env/static/private';

// Environment variables
const PROXY_URL = FATSECRET_PROXY_URL;

// Log environment variable at startup
console.log('=== Environment Variables Check ===');
console.log('FATSECRET_PROXY_URL:', PROXY_URL);
console.log('PROXY_URL defined:', !!PROXY_URL);
console.log('===============================');

interface FatSecretServing {
	id: string | number;
	description: string;
	url: string;
	metricServingAmount?: number;
	metric_serving_amount?: number; // Added snake_case
	metricServingUnit?: string;
	metric_serving_unit?: string; // Added snake_case
	numberOfUnits?: number;
	number_of_units?: number; // Added snake_case
	measurementDescription?: string;
	measurement_description?: string; // Added snake_case
	calories?: number;
	carbohydrate?: number;
	protein?: number;
	fat?: number;
	saturatedFat?: number;
	saturated_fat?: number; // Added snake_case
	polyunsaturatedFat?: number;
	polyunsaturated_fat?: number; // Added snake_case
	monounsaturatedFat?: number;
	monounsaturated_fat?: number; // Added snake_case
	transFat?: number;
	trans_fat?: number; // Added snake_case
	cholesterol?: number;
	sodium?: number;
	potassium?: number;
	fiber?: number;
	sugar?: number;
	addedSugars?: number;
	added_sugars?: number; // Added snake_case
	vitaminD?: number;
	vitamin_d?: number; // Added snake_case
	vitaminA?: number;
	vitamin_a?: number; // Added snake_case
	vitaminC?: number;
	vitamin_c?: number; // Added snake_case
	calcium?: number;
	iron?: number;
}

interface FatSecretFoodDetail {
	id: string | number;
	name: string;
	brandName?: string;
	type?: string;
	url?: string;
	servings?: FatSecretServing[];
}

interface FatSecretDetailResponse {
	food?: FatSecretFoodDetail;
}

async function getFoodFromDatabase(foodId: number) {
	try {
		const foodData = await db
			.select()
			.from(food)
			.where(eq(food.foodId, foodId))
			.limit(1);

		if (foodData.length === 0) {
			return null;
		}

		const servingsData = await db
			.select()
			.from(serving)
			.where(eq(serving.foodId, foodId));

		return {
			...foodData[0],
			servings: servingsData
		};
	} catch (error) {
		console.error('Error getting food from database:', error);
		return null;
	}
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
			console.log('Trying FatSecret proxy endpoint:', url);
			try {
				const response = await fetch(url);
				
				if (response.ok) {
					const data = await response.json();
					console.log('FatSecret success with URL:', url);
					console.log('FatSecret response:', JSON.stringify(data, null, 2));
					
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
					console.log(`Failed with ${url}: ${response.status} ${response.statusText}`);
				}
			} catch (endpointError) {
				console.log(`Error with ${url}:`, endpointError);
			}
		}

		console.warn('FatSecret proxy does not support food details endpoint - nutrition data will be updated when available');
		return null;
	} catch (error) {
		console.error('Error getting food from FatSecret:', error);
		return null;
	}
}

async function saveFoodDetailToDatabase(foodData: any) {
	try {
		// Handle different response formats
		let foodId_val: number = 0;
		let foodName: string = '';
		let brandName: string | null = null;
		let foodType: string = 'Generic';
		let foodUrl: string = '';
		let servings: any[] = [];

		// Check if it's the new format (direct object) or old format
		if (foodData.id && foodData.name) {
			// New format from your proxy
			foodId_val = typeof foodData.id === 'string' ? parseInt(foodData.id) : foodData.id;
			foodName = foodData.name;
			brandName = foodData.brandName || null;
			foodType = foodData.type ?? 'Generic';
			foodUrl = foodData.url || '';
			servings = foodData.servings || [];
		} else if (foodData.food_id && foodData.food_name) {
			// Old format
			foodId_val = typeof foodData.food_id === 'string' ? parseInt(foodData.food_id) : foodData.food_id;
			foodName = foodData.food_name;
			brandName = foodData.brand_name || null;
			foodType = foodData.food_type || 'Generic';
			foodUrl = foodData.food_url || '';
			servings = foodData.servings?.serving || [];
		}

		// Save or update food
					await db.insert(food).values({
			foodId: foodId_val,
			foodName: foodName,
			brandName: brandName,
			foodType: foodType,
			foodUrl: foodUrl,
			foodSubCategories: null
		}).onConflictDoUpdate({
			target: food.foodId,
			set: {
				foodName: foodName,
				brandName: brandName,
				foodType: foodType,
				foodUrl: foodUrl,
				foodSubCategories: null
			}
		});

		// Save servings if they exist
		if (servings.length > 0) {
			const servingValues = servings.map((srv: FatSecretServing) => {
				const servingId = srv.id || (srv as any).serving_id;
				const description = srv.description || (srv as any).serving_description;
				const url = srv.url || (srv as any).serving_url || '';
				
				return {
					servingId: typeof servingId === 'string' ? parseInt(servingId) : servingId,
					foodId: foodId_val,
					servingDescription: description,
					servingUrl: url,
					metricServingAmount: (srv.metricServingAmount || (srv as any).metric_serving_amount)?.toString() || null,
					metricServingUnit: srv.metricServingUnit || (srv as any).metric_serving_unit || null,
					numberOfUnits: (srv.numberOfUnits || (srv as any).number_of_units)?.toString() || null,
					measurementDescription: srv.measurementDescription || (srv as any).measurement_description || null,
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
		}

		console.log(`Saved detailed food data for: ${foodName}`);
	} catch (error) {
		console.error('Error saving food detail to database:', error);
	}
}

export const GET: RequestHandler = async ({ params }) => {
	const foodId = parseInt(params.id);

	if (isNaN(foodId)) {
		return json({
			success: false,
			error: 'Invalid food ID'
		}, { status: 400 });
	}

	try {
		// Step 1: Try to get from local database first
		let foodData = await getFoodFromDatabase(foodId);

		// Step 2: If not found locally or no servings, try FatSecret
		if (!foodData || !foodData.servings || foodData.servings.length === 0) {
			const externalFoodData = await getFoodFromFatSecret(foodId);
			
			if (externalFoodData) {
				// Save to database and wait for completion
				try {
					await saveFoodDetailToDatabase(externalFoodData);
				} catch (error) {
					console.error('Error saving food detail to database:', error);
				}

				// Handle different response formats
				let foodId_val: number = 0;
				let foodName: string = '';
				let brandName: string | null = null;
				let foodType: string = 'Generic';
		let foodUrl: string = '';
				let servings: any[] = [];

				// Check if it's the new format (direct object) or old format
				if (externalFoodData.id && externalFoodData.name) {
					// New format from your proxy
					foodId_val = typeof externalFoodData.id === 'string' ? parseInt(externalFoodData.id) : externalFoodData.id;
					foodName = externalFoodData.name;
					brandName = externalFoodData.brandName || null;
					foodType = externalFoodData.type ?? 'Generic';
					foodUrl = externalFoodData.url || '';
					servings = externalFoodData.servings || [];
				} else if (externalFoodData.food_id && externalFoodData.food_name) {
					// Old format
					foodId_val = typeof externalFoodData.food_id === 'string' ? parseInt(externalFoodData.food_id) : externalFoodData.food_id;
					foodName = externalFoodData.food_name;
					brandName = externalFoodData.brand_name || null;
					foodType = externalFoodData.food_type || 'Generic';
					foodUrl = externalFoodData.food_url || '';
					servings = externalFoodData.servings?.serving || [];
				}
				
				// If we had local food data but no servings, merge with existing data
				const baseFood = foodData || {
					foodId: foodId_val,
					foodName: foodName,
					brandName: brandName,
					foodType: (foodType ?? 'Generic') as string,
					foodUrl: (foodUrl ?? '') as string,
					foodSubCategories: null
				};

				foodData = {
					...baseFood,
					servings: servings.map(srv => {
						// Handle both old and new serving formats
						const servingId = srv.id || srv.serving_id;
						const description = srv.description || srv.serving_description;
						const url = srv.url || srv.serving_url || '';
						
						return {
							servingId: typeof servingId === 'string' ? parseInt(servingId) : servingId,
							foodId: baseFood.foodId,
							servingDescription: description,
							servingUrl: url,
							metricServingAmount: (srv.metricServingAmount || srv.metric_serving_amount)?.toString() || null,
							metricServingUnit: srv.metricServingUnit || srv.metric_serving_unit || null,
							numberOfUnits: (srv.numberOfUnits || srv.number_of_units)?.toString() || null,
							measurementDescription: srv.measurementDescription || srv.measurement_description || null,
							isDefault: 1, // Mark as default since FatSecret doesn't provide this field
							calories: srv.calories || null,
							carbohydrate: srv.carbohydrate || null,
							protein: srv.protein || null,
							fat: srv.fat || null,
							saturatedFat: srv.saturatedFat || srv.saturated_fat || null,
							polyunsaturatedFat: srv.polyunsaturatedFat || srv.polyunsaturated_fat || null,
							monounsaturatedFat: srv.monounsaturatedFat || srv.monounsaturated_fat || null,
							transFat: srv.transFat || srv.trans_fat || null,
							cholesterol: srv.cholesterol || null,
							sodium: srv.sodium || null,
							potassium: srv.potassium || null,
							fiber: srv.fiber || null,
							sugar: srv.sugar || null,
							addedSugars: srv.addedSugars || srv.added_sugars || null,
							vitaminD: srv.vitaminD || srv.vitamin_d || null,
							vitaminA: srv.vitaminA || srv.vitamin_a || null,
							vitaminC: srv.vitaminC || srv.vitamin_c || null,
							calcium: srv.calcium || null,
							iron: srv.iron || null
						};
					})
				};
			}
		}

		if (!foodData) {
			return json({
				success: false,
				error: 'Food not found'
			}, { status: 404 });
		}

		// If still no servings, create a meaningful default serving
		if (!foodData.servings || foodData.servings.length === 0) {
			const brandPrefix = foodData.brandName ? `${foodData.brandName} ` : '';
			const servingDescription = foodData.brandName 
				? '1 serving' 
				: foodData.foodType === 'Brand' 
					? '1 serving' 
					: '100g';
			
			foodData.servings = [{
				servingId: 0, // Temporary ID for default serving
				foodId: foodData.foodId,
				servingDescription,
				servingUrl: '',
				metricServingAmount: foodData.foodType === 'Brand' ? null : '100',
				metricServingUnit: foodData.foodType === 'Brand' ? null : 'g',
				numberOfUnits: '1',
				measurementDescription: foodData.foodType === 'Brand' ? 'serving' : 'g',
				isDefault: 1,
				calories: 0,
				carbohydrate: 0,
				protein: 0,
				fat: 0,
				saturatedFat: 0,
				polyunsaturatedFat: 0,
				monounsaturatedFat: 0,
				transFat: 0,
				cholesterol: 0,
				sodium: 0,
				potassium: 0,
				fiber: 0,
				sugar: 0,
				addedSugars: 0,
				vitaminD: 0,
				vitaminA: 0,
				vitaminC: 0,
				calcium: 0,
				iron: 0
			}];
		}

		// Servings are now properly typed as numbers from the schema
		// But we need to handle NaN values from the migration
		const processedServings = foodData.servings.map(srv => ({
			...srv,
			calories: (srv.calories !== null && !isNaN(srv.calories)) ? srv.calories : null,
			carbohydrate: (srv.carbohydrate !== null && !isNaN(srv.carbohydrate)) ? srv.carbohydrate : null,
			protein: (srv.protein !== null && !isNaN(srv.protein)) ? srv.protein : null,
			fat: (srv.fat !== null && !isNaN(srv.fat)) ? srv.fat : null,
			saturatedFat: (srv.saturatedFat !== null && !isNaN(srv.saturatedFat)) ? srv.saturatedFat : null,
			polyunsaturatedFat: (srv.polyunsaturatedFat !== null && !isNaN(srv.polyunsaturatedFat)) ? srv.polyunsaturatedFat : null,
			monounsaturatedFat: (srv.monounsaturatedFat !== null && !isNaN(srv.monounsaturatedFat)) ? srv.monounsaturatedFat : null,
			transFat: (srv.transFat !== null && !isNaN(srv.transFat)) ? srv.transFat : null,
			cholesterol: (srv.cholesterol !== null && !isNaN(srv.cholesterol)) ? srv.cholesterol : null,
			sodium: (srv.sodium !== null && !isNaN(srv.sodium)) ? srv.sodium : null,
			potassium: (srv.potassium !== null && !isNaN(srv.potassium)) ? srv.potassium : null,
			fiber: (srv.fiber !== null && !isNaN(srv.fiber)) ? srv.fiber : null,
			sugar: (srv.sugar !== null && !isNaN(srv.sugar)) ? srv.sugar : null,
			addedSugars: (srv.addedSugars !== null && !isNaN(srv.addedSugars)) ? srv.addedSugars : null,
			vitaminD: (srv.vitaminD !== null && !isNaN(srv.vitaminD)) ? srv.vitaminD : null,
			vitaminA: (srv.vitaminA !== null && !isNaN(srv.vitaminA)) ? srv.vitaminA : null,
			vitaminC: (srv.vitaminC !== null && !isNaN(srv.vitaminC)) ? srv.vitaminC : null,
			calcium: (srv.calcium !== null && !isNaN(srv.calcium)) ? srv.calcium : null,
			iron: (srv.iron !== null && !isNaN(srv.iron)) ? srv.iron : null
		}));

		return json({
			success: true,
			food: {
				...foodData,
				servings: processedServings
			}
		});

	} catch (error) {
		console.error('Food detail error:', error);
		return json({
			success: false,
			error: 'Failed to get food details'
		}, { status: 500 });
	}
};