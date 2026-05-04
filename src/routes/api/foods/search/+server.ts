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

function tokenizeQuery(query: string): string[] {
	// Split on spaces, commas, and other separators, filter out empty strings
	return query
		.toLowerCase()
		.split(/[\s,&\-\+]+/)
		.filter((token) => token.length > 0);
}

function calculateRelevanceScore(
	foodName: string,
	brandName: string | null,
	queryTokens: string[]
): number {
	const foodNameLower = foodName.toLowerCase();
	const brandNameLower = (brandName || '').toLowerCase();
	const combinedText = `${foodNameLower} ${brandNameLower}`.trim();

	let score = 0;

	// Exact phrase match gets highest score
	const originalQuery = queryTokens.join(' ');
	if (combinedText.includes(originalQuery)) {
		score += 100;
	}

	// Check each token
	for (const token of queryTokens) {
		if (token.length < 2) continue; // Skip very short tokens

		// Exact word match in food name
		if (foodNameLower.split(/\s+/).includes(token)) {
			score += 50;
		}
		// Exact word match in brand name
		else if (brandNameLower.split(/\s+/).includes(token)) {
			score += 40;
		}
		// Starts with token in food name
		else if (foodNameLower.includes(token)) {
			if (foodNameLower.startsWith(token)) {
				score += 30;
			} else {
				score += 20;
			}
		}
		// Starts with token in brand name
		else if (brandNameLower.includes(token)) {
			if (brandNameLower.startsWith(token)) {
				score += 25;
			} else {
				score += 15;
			}
		}
	}

	// Bonus for matching multiple tokens
	const matchedTokens = queryTokens.filter((token) =>
		combinedText.includes(token.toLowerCase())
	).length;

	if (matchedTokens === queryTokens.length) {
		score += 20; // All tokens matched
	} else if (matchedTokens > 1) {
		score += 10; // Multiple tokens matched
	}

	return score;
}

async function searchLocalFoods(query: string, limit: number = 10): Promise<FoodSearchResult[]> {
	try {
		const queryTokens = tokenizeQuery(query);

		// Build a more sophisticated search query
		const searchConditions = queryTokens.map(
			(token) =>
				sql`(${food.foodName} LIKE ${'%' + token + '%'} OR ${food.brandName} LIKE ${'%' + token + '%'})`
		);

		// Also search for the full query as a phrase
		const fullQueryCondition = sql`(${food.foodName} LIKE ${'%' + query + '%'} OR ${food.brandName} LIKE ${'%' + query + '%'})`;

		// Combine conditions with OR for individual tokens and include full phrase
		const whereCondition = sql`(${fullQueryCondition} OR ${sql.join(searchConditions, sql` OR `)})`;

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
			.leftJoin(serving, and(eq(serving.foodId, food.foodId), eq(serving.isDefault, 1)))
			.where(whereCondition)
			.limit(limit * 3); // Get more results for ranking

		// Calculate relevance scores and sort
		const scoredResults = results.map((item) => ({
			...item,
			calories: item.calories ?? 0,
			protein: item.protein ?? 0,
			carbohydrate: item.carbohydrate ?? 0,
			fat: item.fat ?? 0,
			source: 'local' as const,
			_score: calculateRelevanceScore(item.foodName, item.brandName, queryTokens)
		}));

		// Sort by relevance score (descending) and take the top results
		scoredResults.sort((a, b) => b._score - a._score);

		// Remove the _score property before returning
		return scoredResults.slice(0, limit).map(({ _score, ...item }) => item);
	} catch (error) {
		console.error('Error searching local foods:', error);
		return [];
	}
}

async function searchFatSecretFoods(
	query: string,
	limit: number = 10
): Promise<FoodSearchResult[]> {
	if (!PROXY_URL) {
		console.warn('FATSECRET_PROXY_URL not configured');
		return [];
	}

	try {
		const searchUrl = `${PROXY_URL}/search?q=${encodeURIComponent(query)}&max_results=${limit}`;
		console.log(`[FatSecret] Searching URL: ${searchUrl}`);

		const response = await fetch(searchUrl);

		if (!response.ok) {
			console.error(`FatSecret proxy error: ${response.status} ${response.statusText}`);
			const errorText = await response.text();
			console.error(`FatSecret proxy error response: ${errorText}`);
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
			foods = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];
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
			foodId:
				typeof (item.food_id || item.id) === 'string'
					? parseInt(item.food_id || item.id)
					: item.food_id || item.id,
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
		await db
			.insert(food)
			.values({
				foodId: foodData.foodId,
				foodName: foodData.foodName,
				brandName: foodData.brandName,
				foodType: foodData.foodType || 'Generic',
				foodUrl: foodData.foodUrl || '',
				foodSubCategories: foodData.foodSubCategories
			})
			.onConflictDoUpdate({
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

	// Special debug query to test proxy connection
	if (searchQuery === 'test_connection_debug') {
		console.log(`[DEBUG] Proxy connection test - PROXY_URL: ${PROXY_URL}`);
		console.log(`[DEBUG] Proxy configured: ${!!PROXY_URL}`);

		if (!PROXY_URL) {
			console.error('[DEBUG] ❌ FATSECRET_PROXY_URL environment variable not set');
			return json({
				success: false,
				error: 'FATSECRET_PROXY_URL not configured',
				debug: {
					proxyUrl: null,
					configured: false
				}
			});
		}

		try {
			const testUrl = `${PROXY_URL}/search?q=apple&max_results=1`;
			console.log(`[DEBUG] Testing proxy with: ${testUrl}`);

			const response = await fetch(testUrl);
			console.log(`[DEBUG] Proxy response: ${response.status} ${response.statusText}`);

			if (response.ok) {
				const data = await response.json();
				console.log(`[DEBUG] ✅ Proxy connection successful`);
				return json({
					success: true,
					foods: [],
					debug: {
						proxyUrl: PROXY_URL,
						configured: true,
						connectionTest: 'success',
						responseKeys: Object.keys(data)
					}
				});
			} else {
				console.log(`[DEBUG] ❌ Proxy connection failed: ${response.status}`);
				return json({
					success: false,
					error: `Proxy connection failed: ${response.status}`,
					debug: {
						proxyUrl: PROXY_URL,
						configured: true,
						connectionTest: 'failed',
						statusCode: response.status
					}
				});
			}
		} catch (error) {
			console.error(`[DEBUG] ❌ Proxy connection error:`, error);
			return json({
				success: false,
				error: `Proxy connection error: ${error.message}`,
				debug: {
					proxyUrl: PROXY_URL,
					configured: true,
					connectionTest: 'error',
					errorMessage: error.message
				}
			});
		}
	}

	try {
		console.log(`[Food Search] Searching for: "${searchQuery}"`);
		console.log(`[Food Search] PROXY_URL configured: ${!!PROXY_URL}`);
		if (!PROXY_URL) {
			console.warn(`[Food Search] ⚠️  FATSECRET_PROXY_URL not set - external search disabled`);
		} else {
			console.log(`[Food Search] PROXY_URL: ${PROXY_URL.substring(0, 50)}...`);
		}
		console.log(`[Food Search] Limit: ${limit}`);

		// Step 1: Search local database first
		const localResults = await searchLocalFoods(searchQuery, limit);
		console.log(`[Food Search] Found ${localResults.length} local results`);

		// Log sample local results
		if (localResults.length > 0) {
			console.log(`[Food Search] Sample local result:`, JSON.stringify(localResults[0], null, 2));
		}

		// Step 2: If we have sufficient local results, return them
		if (localResults.length >= 5) {
			console.log(
				`[Food Search] Sufficient local results found, returning without external search`
			);
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
		if (!PROXY_URL) {
			console.log(`[Food Search] ⚠️  Skipping external search - proxy not configured`);
		}
		const externalResults = await searchFatSecretFoods(searchQuery, limit);
		console.log(`[Food Search] Found ${externalResults.length} external results`);

		// Log sample external results
		if (externalResults.length > 0) {
			console.log(
				`[Food Search] Sample external result:`,
				JSON.stringify(externalResults[0], null, 2)
			);
		}

		// Step 4: Save ALL external results to database immediately
		if (externalResults.length > 0) {
			console.log(`[Food Search] Saving ${externalResults.length} external foods to database...`);
			try {
				await Promise.all(externalResults.map((foodData) => saveFoodToDatabase(foodData)));
				console.log(`[Food Search] Successfully saved external foods to database`);
			} catch (error) {
				console.error('[Food Search] Error saving external foods:', error);
			}
		}

		// Step 5: Combine results, prioritizing local first
		const allResults = [...localResults, ...externalResults];
		console.log(`[Food Search] Combined results: ${allResults.length} total`);

		// Step 6: Remove duplicates (favor local results)
		const uniqueResults = allResults.filter(
			(item, index, self) => index === self.findIndex((t) => t.foodId === item.foodId)
		);
		console.log(`[Food Search] After deduplication: ${uniqueResults.length} unique results`);

		// Step 7: Sort by source (local first) then alphabetically
		uniqueResults.sort((a, b) => {
			if (a.source === 'local' && b.source === 'fatsecret') return -1;
			if (a.source === 'fatsecret' && b.source === 'local') return 1;
			return a.foodName.localeCompare(b.foodName);
		});

		console.log(
			`[Food Search] Returning ${uniqueResults.length} total results (${localResults.length} local, ${externalResults.length} external)`
		);

		const response = {
			success: true,
			foods: uniqueResults.slice(0, limit),
			total: uniqueResults.length,
			sources: {
				local: localResults.length,
				external: externalResults.length
			}
		};

		console.log(`[Food Search] Final response structure:`, {
			success: response.success,
			foodCount: response.foods.length,
			total: response.total,
			sources: response.sources,
			firstFoodSample: response.foods[0]
				? {
						foodId: response.foods[0].foodId,
						foodName: response.foods[0].foodName,
						source: response.foods[0].source,
						hasNutrition: !!(response.foods[0].calories || response.foods[0].protein)
					}
				: null
		});

		return json(response);
	} catch (error) {
		console.error('[Food Search] ❌ Search error:', error);
		return json(
			{
				success: false,
				error: 'Failed to search foods',
				foods: [],
				debug: {
					proxyConfigured: !!PROXY_URL,
					searchQuery: searchQuery,
					errorMessage: error.message
				}
			},
			{ status: 500 }
		);
	}
};
