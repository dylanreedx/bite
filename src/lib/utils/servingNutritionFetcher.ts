import { FATSECRET_PROXY_URL } from '$env/static/private';

// Environment variables
const PROXY_URL = FATSECRET_PROXY_URL;

interface ServingNutritionData {
	calories?: number;
	protein?: number;
	carbohydrate?: number;
	fat?: number;
	saturatedFat?: number;
	cholesterol?: number;
	sodium?: number;
	fiber?: number;
	sugar?: number;
	[key: string]: any;
}

interface EnhancedServing {
	id?: string | number;
	serving_id?: string | number;
	description?: string;
	serving_description?: string;
	url?: string;
	serving_url?: string;
	calories?: number;
	protein?: number;
	carbohydrate?: number;
	fat?: number;
	[key: string]: any;
}

/**
 * Attempts to fetch detailed nutrition data for a specific serving
 */
export async function fetchServingNutrition(
	foodId: number,
	servingId: number | string,
	serving: EnhancedServing
): Promise<EnhancedServing> {
	if (!PROXY_URL) {
		console.warn('FATSECRET_PROXY_URL not configured');
		return serving;
	}

	// Check if serving already has nutrition data
	if (hasNutritionData(serving)) {
		console.log(`[ServingFetcher] Serving ${servingId} already has nutrition data`);
		return serving;
	}

	console.log(`[ServingFetcher] Fetching nutrition for serving ${servingId} of food ${foodId}`);

	// Strategy 1: Try serving-specific endpoints
	const servingResult = await tryServingEndpoints(servingId, serving);
	if (hasNutritionData(servingResult)) {
		console.log(`[ServingFetcher] Got nutrition from serving endpoints for ${servingId}`);
		return servingResult;
	}

	// Strategy 2: Try food endpoints with serving parameters
	const foodResult = await tryFoodWithServingEndpoints(foodId, servingId, serving);
	if (hasNutritionData(foodResult)) {
		console.log(`[ServingFetcher] Got nutrition from food+serving endpoints for ${servingId}`);
		return foodResult;
	}

	// Strategy 3: Try parsing serving URL for additional data
	const urlResult = await tryServingUrlParsing(serving);
	if (hasNutritionData(urlResult)) {
		console.log(`[ServingFetcher] Got nutrition from URL parsing for ${servingId}`);
		return urlResult;
	}

	// Strategy 4: Try alternative field names and formats
	const altResult = await tryAlternativeFormats(foodId, servingId, serving);
	if (hasNutritionData(altResult)) {
		console.log(`[ServingFetcher] Got nutrition from alternative formats for ${servingId}`);
		return altResult;
	}

	console.log(`[ServingFetcher] Could not fetch nutrition data for serving ${servingId}`);
	return serving;
}

/**
 * Checks if a serving has meaningful nutrition data
 */
function hasNutritionData(serving: EnhancedServing): boolean {
	return (
		(serving.calories !== null && serving.calories !== undefined && serving.calories > 0) ||
		(serving.protein !== null && serving.protein !== undefined && serving.protein > 0) ||
		(serving.carbohydrate !== null && serving.carbohydrate !== undefined && serving.carbohydrate > 0) ||
		(serving.fat !== null && serving.fat !== undefined && serving.fat > 0)
	);
}

/**
 * Strategy 1: Try serving-specific endpoints
 */
async function tryServingEndpoints(
	servingId: number | string,
	serving: EnhancedServing
): Promise<EnhancedServing> {
	const endpoints = [
		`${PROXY_URL}/serving?serving_id=${servingId}&format=json`,
		`${PROXY_URL}/servings/${servingId}?format=json`,
		`${PROXY_URL}/nutrition?serving_id=${servingId}`,
		`${PROXY_URL}/get?serving_id=${servingId}`,
		`${PROXY_URL}/api/serving/${servingId}`,
		`${PROXY_URL}/v1/serving?id=${servingId}`
	];

	for (const url of endpoints) {
		try {
			console.log(`[ServingFetcher] Trying serving endpoint: ${url}`);
			const response = await fetch(url);

			if (response.ok) {
				const data = await response.json();
				console.log(`[ServingFetcher] Serving endpoint response:`, JSON.stringify(data, null, 2));

				const enhanced = parseNutritionResponse(data, serving);
				if (hasNutritionData(enhanced)) {
					return enhanced;
				}
			}
		} catch (error) {
			console.log(`[ServingFetcher] Error with serving endpoint ${url}:`, error);
		}
	}

	return serving;
}

/**
 * Strategy 2: Try food endpoints with serving parameters
 */
async function tryFoodWithServingEndpoints(
	foodId: number,
	servingId: number | string,
	serving: EnhancedServing
): Promise<EnhancedServing> {
	const endpoints = [
		`${PROXY_URL}/food?food_id=${foodId}&serving_id=${servingId}&format=json`,
		`${PROXY_URL}/food/${foodId}?serving_id=${servingId}`,
		`${PROXY_URL}/foods/${foodId}/servings/${servingId}`,
		`${PROXY_URL}/get?food_id=${foodId}&serving_id=${servingId}`,
		`${PROXY_URL}/api/food/${foodId}/serving/${servingId}`,
		`${PROXY_URL}/nutrition?food_id=${foodId}&serving_id=${servingId}`
	];

	for (const url of endpoints) {
		try {
			console.log(`[ServingFetcher] Trying food+serving endpoint: ${url}`);
			const response = await fetch(url);

			if (response.ok) {
				const data = await response.json();
				console.log(`[ServingFetcher] Food+serving endpoint response:`, JSON.stringify(data, null, 2));

				const enhanced = parseNutritionResponse(data, serving);
				if (hasNutritionData(enhanced)) {
					return enhanced;
				}
			}
		} catch (error) {
			console.log(`[ServingFetcher] Error with food+serving endpoint ${url}:`, error);
		}
	}

	return serving;
}

/**
 * Strategy 3: Try parsing the serving URL for additional data
 */
async function tryServingUrlParsing(serving: EnhancedServing): Promise<EnhancedServing> {
	const servingUrl = serving.url || serving.serving_url;
	if (!servingUrl || typeof servingUrl !== 'string') {
		return serving;
	}

	try {
		// Extract portion ID and amount from FatSecret URLs
		const portionMatch = servingUrl.match(/portionid=(\d+)/);
		const amountMatch = servingUrl.match(/portionamount=([\d.]+)/);

		if (portionMatch && amountMatch) {
			const portionId = portionMatch[1];
			const amount = amountMatch[1];

			console.log(`[ServingFetcher] Extracted portion ID: ${portionId}, amount: ${amount}`);

			const endpoints = [
				`${PROXY_URL}/portion?id=${portionId}&amount=${amount}&format=json`,
				`${PROXY_URL}/nutrition?portion_id=${portionId}&amount=${amount}`,
				`${PROXY_URL}/get?portion_id=${portionId}&portion_amount=${amount}`
			];

			for (const url of endpoints) {
				try {
					console.log(`[ServingFetcher] Trying portion endpoint: ${url}`);
					const response = await fetch(url);

					if (response.ok) {
						const data = await response.json();
						console.log(`[ServingFetcher] Portion endpoint response:`, JSON.stringify(data, null, 2));

						const enhanced = parseNutritionResponse(data, serving);
						if (hasNutritionData(enhanced)) {
							return enhanced;
						}
					}
				} catch (error) {
					console.log(`[ServingFetcher] Error with portion endpoint ${url}:`, error);
				}
			}
		}
	} catch (error) {
		console.log(`[ServingFetcher] Error parsing serving URL:`, error);
	}

	return serving;
}

/**
 * Strategy 4: Try alternative formats and field names
 */
async function tryAlternativeFormats(
	foodId: number,
	servingId: number | string,
	serving: EnhancedServing
): Promise<EnhancedServing> {
	// Try different parameter formats
	const alternatives = [
		`${PROXY_URL}/nutrition/${foodId}/${servingId}`,
		`${PROXY_URL}/food-nutrition?food=${foodId}&serving=${servingId}`,
		`${PROXY_URL}/details?food_id=${foodId}&serving_id=${servingId}`,
		`${PROXY_URL}/api/v1/food/${foodId}/nutrition?serving=${servingId}`,
		`${PROXY_URL}/fatsecret/food?id=${foodId}&serving=${servingId}`,
		// Try with the serving description as a parameter
		`${PROXY_URL}/food?food_id=${foodId}&serving_description=${encodeURIComponent(serving.description || serving.serving_description || '')}`
	];

	for (const url of alternatives) {
		try {
			console.log(`[ServingFetcher] Trying alternative endpoint: ${url}`);
			const response = await fetch(url);

			if (response.ok) {
				const data = await response.json();
				console.log(`[ServingFetcher] Alternative endpoint response:`, JSON.stringify(data, null, 2));

				const enhanced = parseNutritionResponse(data, serving);
				if (hasNutritionData(enhanced)) {
					return enhanced;
				}
			}
		} catch (error) {
			console.log(`[ServingFetcher] Error with alternative endpoint ${url}:`, error);
		}
	}

	return serving;
}

/**
 * Parse nutrition data from various response formats
 */
function parseNutritionResponse(data: any, originalServing: EnhancedServing): EnhancedServing {
	if (!data) return originalServing;

	// Try different response structures
	const sources = [
		data.serving,
		data.nutrition,
		data.food?.serving,
		data.food?.nutrition,
		data.portion,
		data.servings?.[0],
		data
	].filter(Boolean);

	for (const source of sources) {
		const nutrition = extractNutritionData(source);
		if (nutrition && Object.keys(nutrition).length > 0) {
			return {
				...originalServing,
				...nutrition
			};
		}
	}

	return originalServing;
}

/**
 * Extract nutrition data from various field name formats
 */
function extractNutritionData(source: any): ServingNutritionData | null {
	if (!source || typeof source !== 'object') return null;

	const nutrition: ServingNutritionData = {};

	// Try different field name variations
	const fieldMappings = {
		calories: ['calories', 'energy', 'kcal', 'cal', 'calorie'],
		protein: ['protein', 'protein_g', 'proteinG', 'prot'],
		carbohydrate: ['carbohydrate', 'carbs', 'carb', 'carbohydrate_g', 'carbohydrateG'],
		fat: ['fat', 'total_fat', 'totalFat', 'fat_g', 'fatG'],
		saturatedFat: ['saturated_fat', 'saturatedFat', 'sat_fat', 'satFat'],
		cholesterol: ['cholesterol', 'chol'],
		sodium: ['sodium', 'salt'],
		fiber: ['fiber', 'fibre', 'dietary_fiber', 'dietaryFiber'],
		sugar: ['sugar', 'sugars', 'total_sugar', 'totalSugar']
	};

	let hasAnyNutrition = false;

	for (const [targetField, sourceFields] of Object.entries(fieldMappings)) {
		for (const sourceField of sourceFields) {
			const value = source[sourceField];
			if (value !== null && value !== undefined) {
				const numValue = typeof value === 'string' ? parseFloat(value) : value;
				if (!isNaN(numValue) && numValue >= 0) {
					nutrition[targetField as keyof ServingNutritionData] = numValue;
					hasAnyNutrition = true;
					break;
				}
			}
		}
	}

	return hasAnyNutrition ? nutrition : null;
}

/**
 * Batch fetch nutrition data for multiple servings
 */
export async function fetchMultipleServingNutrition(
	foodId: number,
	servings: EnhancedServing[]
): Promise<EnhancedServing[]> {
	console.log(`[ServingFetcher] Batch fetching nutrition for ${servings.length} servings of food ${foodId}`);

	// Process servings with a delay to respect rate limits
	const results: EnhancedServing[] = [];

	for (let i = 0; i < servings.length; i++) {
		const serving = servings[i];
		const servingId = serving.id || serving.serving_id;

		if (servingId) {
			try {
				const enhanced = await fetchServingNutrition(foodId, servingId, serving);
				results.push(enhanced);

				// Add delay between requests to respect rate limits
				if (i < servings.length - 1) {
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			} catch (error) {
				console.error(`[ServingFetcher] Error fetching nutrition for serving ${servingId}:`, error);
				results.push(serving); // Keep original serving on error
			}
		} else {
			console.warn(`[ServingFetcher] Serving ${i} has no ID, skipping nutrition fetch`);
			results.push(serving);
		}
	}

	const enhancedCount = results.filter(hasNutritionData).length;
	console.log(`[ServingFetcher] Enhanced ${enhancedCount} of ${servings.length} servings with nutrition data`);

	return results;
}

/**
 * Quick check if a food needs serving nutrition updates
 */
export function needsServingNutritionUpdate(servings: EnhancedServing[]): boolean {
	if (!servings || servings.length === 0) return true;

	return servings.some(serving => !hasNutritionData(serving));
}

/**
 * Get a summary of nutrition data status for servings
 */
export function getServingNutritionStatus(servings: EnhancedServing[]): {
	total: number;
	withNutrition: number;
	withoutNutrition: number;
	coverage: number;
} {
	if (!servings || servings.length === 0) {
		return { total: 0, withNutrition: 0, withoutNutrition: 0, coverage: 0 };
	}

	const withNutrition = servings.filter(hasNutritionData).length;
	const withoutNutrition = servings.length - withNutrition;
	const coverage = servings.length > 0 ? (withNutrition / servings.length) * 100 : 0;

	return {
		total: servings.length,
		withNutrition,
		withoutNutrition,
		coverage
	};
}
