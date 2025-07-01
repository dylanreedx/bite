import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { food, serving } from '$lib/db/schema.js';
import { eq, like, and, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { FATSECRET_PROXY_URL } from '$env/static/private';

// Environment variables
const PROXY_URL = FATSECRET_PROXY_URL;

// Define types for FatSecret API response
interface FatSecretFood {
	food_id: string | number;
	food_name: string;
	brand_name?: string;
	food_type?: string;
	food_url?: string;
	food_sub_categories?: string;
}

interface FatSecretResponse {
	foods_search?: {
		max_results?: string;
		total_results?: string;
		page_number?: string;
		results?: {
			food?: FatSecretFood[];
		};
	};
}

interface FoodSearchResult {
	foodId: number;
	foodName: string;
	brandName?: string | null;
	foodType?: string | null;
	foodUrl?: string | null;
	foodSubCategories?: string | null;
	calories?: number | null;
	protein?: number | null;
	carbohydrate?: number | null;
	fat?: number | null;
	servingDescription?: string | null;
	source: 'local' | 'fatsecret';
}

async function searchLocalFoods(query: string, limit: number = 10): Promise<FoodSearchResult[]> {
	try {
		const results = await db
			.select({
				foodId: food.foodId,
				foodName: food.foodName,
				brandName: food.brandName,
				foodType: food.foodType,
				foodUrl: food.foodUrl,
				foodSubCategories: food.foodSubCategories,
				calories: serving.calories,
				protein: serving.protein,
				carbohydrate: serving.carbohydrate,
				fat: serving.fat,
				servingDescription: serving.servingDescription
			})
			.from(food)
			.leftJoin(serving, and(
				eq(serving.foodId, food.foodId),
				eq(serving.isDefault, 1)
			))
			.where(
				sql`(${food.foodName} LIKE ${'%' + query + '%'} OR ${food.brandName} LIKE ${'%' + query + '%'})`
			)
			.limit(limit);

		return results.map(item => ({
			...item,
			calories: item.calories ?? 0,
			protein: item.protein ?? 0,
			carbohydrate: item.carbohydrate ?? 0,
			fat: item.fat ?? 0,
			source: 'local' as const
		}));
	} catch (error) {
		console.error('Error searching local foods:', error);
		return [];
	}
}

async function searchFatSecretFoods(query: string, limit: number = 10): Promise<FoodSearchResult[]> {
	if (!PROXY_URL) {
		console.warn('FATSECRET_PROXY_URL not configured');
		return [];
	}

	try {
		const response = await fetch(`${PROXY_URL}/search?q=${encodeURIComponent(query)}&max_results=${limit}`);
		
		if (!response.ok) {
			console.error(`FatSecret proxy error: ${response.status} ${response.statusText}`);
			return [];
		}

		const data = await response.json();
		console.log(`[FatSecret] Raw response:`, JSON.stringify(data, null, 2));
		
		// Handle different response formats
		let foods = [];
		
		if (data.foods_search?.results?.food) {
			// Old FatSecret API format
			foods = Array.isArray(data.foods_search.results.food) 
				? data.foods_search.results.food 
				: [data.foods_search.results.food];
		} else if (data.foods?.food) {
			// Alternative format
			foods = Array.isArray(data.foods.food) 
				? data.foods.food 
				: [data.foods.food];
		} else if (data.foods && Array.isArray(data.foods)) {
			// Direct foods array format from proxy
			foods = data.foods;
		} else if (Array.isArray(data)) {
			// Direct array format from proxy
			foods = data;
		} else if (data.food) {
			// Single food object
			foods = [data.food];
		} else {
			console.warn('[FatSecret] Unknown response format:', data);
			return [];
		}

		return foods.map((item: any) => ({
			foodId: typeof (item.food_id || item.id) === 'string' 
				? parseInt(item.food_id || item.id) 
				: (item.food_id || item.id),
			foodName: item.food_name || item.name || 'Unknown Food',
			brandName: item.brand_name || item.brandName || null,
			foodType: item.food_type || item.type || 'Generic',
			foodUrl: item.food_url || item.url || '',
			foodSubCategories: item.food_sub_categories || item.foodSubCategories || null,
			calories: null, // Will be populated when we get detailed info
			protein: null,
			carbohydrate: null,
			fat: null,
			servingDescription: null,
			source: 'fatsecret' as const
		}));
	} catch (error) {
		console.error('Error searching FatSecret foods:', error);
		return [];
	}
}

async function saveFoodToDatabase(foodData: FoodSearchResult): Promise<void> {
	try {
		// Validate required data
		if (!foodData.foodId || !foodData.foodName) {
			console.warn('Invalid food data, skipping save:', foodData);
			return;
		}

		// Use upsert (insert or update on conflict) to handle duplicates gracefully
		await db.insert(food).values({
			foodId: foodData.foodId,
			foodName: foodData.foodName,
			brandName: foodData.brandName,
			foodType: foodData.foodType || 'Generic',
			foodUrl: foodData.foodUrl || '',
			foodSubCategories: foodData.foodSubCategories
		}).onConflictDoUpdate({
			target: food.foodId,
			set: {
				foodName: foodData.foodName,
				brandName: foodData.brandName,
				foodType: foodData.foodType || 'Generic',
				foodUrl: foodData.foodUrl || '',
				foodSubCategories: foodData.foodSubCategories
			}
		});

		console.log(`[Database] Saved/updated food: ${foodData.foodName} (ID: ${foodData.foodId})`);
	} catch (error) {
		console.error(`[Database] Error saving food ${foodData.foodName}:`, error);
		// Don't throw - we want to continue with other foods even if one fails
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const searchQuery = url.searchParams.get('q')?.trim();
	const limit = parseInt(url.searchParams.get('limit') || '20');

	if (!searchQuery) {
		return json({
			success: true,
			foods: [],
			message: 'No search query provided'
		});
	}

	try {
		console.log(`[Food Search] Searching for: "${searchQuery}"`);
		
		// Step 1: Search local database first
		const localResults = await searchLocalFoods(searchQuery, limit);
		console.log(`[Food Search] Found ${localResults.length} local results`);
		
		// Step 2: If we have sufficient local results, return them
		if (localResults.length >= 5) {
			return json({
				success: true,
				foods: localResults,
				total: localResults.length,
				sources: {
					local: localResults.length,
					external: 0
				}
			});
		}
		
		// Step 3: Search FatSecret proxy for more results
		console.log(`[Food Search] Searching FatSecret proxy for additional results...`);
		const externalResults = await searchFatSecretFoods(searchQuery, limit);
		console.log(`[Food Search] Found ${externalResults.length} external results`);
		
		// Step 4: Save ALL external results to database immediately
		if (externalResults.length > 0) {
			console.log(`[Food Search] Saving ${externalResults.length} external foods to database...`);
			try {
				await Promise.all(
					externalResults.map(foodData => saveFoodToDatabase(foodData))
				);
				console.log(`[Food Search] Successfully saved external foods to database`);
			} catch (error) {
				console.error('[Food Search] Error saving external foods:', error);
			}
		}
		
		// Step 5: Combine results, prioritizing local first
		const allResults = [...localResults, ...externalResults];
		
		// Step 6: Remove duplicates (favor local results)
		const uniqueResults = allResults.filter((item, index, self) =>
			index === self.findIndex(t => t.foodId === item.foodId)
		);

		// Step 7: Sort by source (local first) then alphabetically
		uniqueResults.sort((a, b) => {
			if (a.source === 'local' && b.source === 'fatsecret') return -1;
			if (a.source === 'fatsecret' && b.source === 'local') return 1;
			return a.foodName.localeCompare(b.foodName);
		});

		console.log(`[Food Search] Returning ${uniqueResults.length} total results (${localResults.length} local, ${externalResults.length} external)`);

		return json({
			success: true,
			foods: uniqueResults.slice(0, limit),
			total: uniqueResults.length,
			sources: {
				local: localResults.length,
				external: externalResults.length
			}
		});

	} catch (error) {
		console.error('Food search error:', error);
		return json({
			success: false,
			error: 'Failed to search foods',
			foods: []
		}, { status: 500 });
	}
};