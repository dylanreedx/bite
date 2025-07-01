import { json } from '@sveltejs/kit';
import { db } from '$lib/db/index.js';
import { food, serving, foodLog } from '$lib/db/schema.js';
import { eq, like, desc, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const searchQuery = url.searchParams.get('search');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const type = url.searchParams.get('type') || 'search'; // 'search', 'recent', or 'frequent'
	
	// Get authenticated user
	if (!locals.user) {
		return json(
			{
				success: false,
				error: 'Authentication required'
			},
			{ status: 401 }
		);
	}
	
	const userId = locals.user.id;

	try {
		if (type === 'recent' || type === 'frequent') {
			// Redirect to the new recent foods endpoint
			const recentUrl = new URL(`/api/foods/recent`, url.origin);
			recentUrl.searchParams.set('type', type);
			recentUrl.searchParams.set('limit', limit.toString());
			
			// Forward the request internally
			const response = await fetch(recentUrl.toString(), {
				headers: {
					'Cookie': `session=${locals.session?.id}`
				}
			});
			
			return new Response(response.body, {
				status: response.status,
				headers: response.headers
			});
		} else if (searchQuery) {
			// Redirect to the new search endpoint
			const searchUrl = new URL(`/api/foods/search`, url.origin);
			searchUrl.searchParams.set('q', searchQuery);
			searchUrl.searchParams.set('limit', limit.toString());
			
			// Return search results using existing logic for compatibility
			const searchResults = await db
				.select({
					foodId: food.foodId,
					foodName: food.foodName,
					brandName: food.brandName,
					foodType: food.foodType,
					// Get default serving info
					calories: serving.calories,
					protein: serving.protein,
					carbohydrate: serving.carbohydrate,
					fat: serving.fat,
					servingDescription: serving.servingDescription
				})
				.from(food)
				.innerJoin(serving, and(
					eq(serving.foodId, food.foodId),
					eq(serving.isDefault, 1)
				))
				.where(
					like(food.foodName, `%${searchQuery}%`)
				)
				.limit(limit);

			return json({
				success: true,
				foods: searchResults.map(food => ({
					...food,
					calories: food.calories ?? 0,
					protein: food.protein ?? 0,
					carbohydrate: food.carbohydrate ?? 0,
					fat: food.fat ?? 0
				}))
			});
		} else {
			// Return popular/trending foods as default
			const popularFoods = await db
				.select({
					foodId: food.foodId,
					foodName: food.foodName,
					brandName: food.brandName,
					foodType: food.foodType,
					calories: serving.calories,
					protein: serving.protein,
					carbohydrate: serving.carbohydrate,
					fat: serving.fat,
					servingDescription: serving.servingDescription
				})
				.from(food)
				.innerJoin(serving, and(
					eq(serving.foodId, food.foodId),
					eq(serving.isDefault, 1)
				))
				.limit(limit);

			return json({
				success: true,
				foods: popularFoods.map(food => ({
					...food,
					calories: food.calories ?? 0,
					protein: food.protein ?? 0,
					carbohydrate: food.carbohydrate ?? 0,
					fat: food.fat ?? 0
				}))
			});
		}
	} catch (error) {
		console.error('Error fetching foods:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch foods'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check authentication
		if (!locals.user) {
			return json(
				{
					success: false,
					error: 'Authentication required'
				},
				{ status: 401 }
			);
		}

		const body = await request.json();
		
		// Redirect to the new food logging endpoint
		const logResponse = await fetch('/api/foods/log', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Cookie': request.headers.get('Cookie') || ''
			},
			body: JSON.stringify(body)
		});

		const result = await logResponse.json();
		return json(result, { status: logResponse.status });
		
	} catch (error) {
		console.error('Error logging food:', error);
		return json(
			{
				success: false,
				error: 'Failed to log food'
			},
			{ status: 500 }
		);
	}
};