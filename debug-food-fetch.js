// Simple Node.js debugging script to test FatSecret proxy
// Run with: node debug-food-fetch.js

// You'll need to set your FATSECRET_PROXY_URL here
const PROXY_URL = process.env.FATSECRET_PROXY_URL || 'YOUR_PROXY_URL_HERE';

console.log('=== Food Fetch Debug Script ===');
console.log('PROXY_URL:', PROXY_URL);
console.log('Proxy configured:', !!PROXY_URL && PROXY_URL !== 'YOUR_PROXY_URL_HERE');

async function testSearch(query) {
	console.log(`\n--- Testing Search: "${query}" ---`);

	if (!PROXY_URL || PROXY_URL === 'YOUR_PROXY_URL_HERE') {
		console.error('❌ FATSECRET_PROXY_URL not configured');
		console.error('   Set it with: export FATSECRET_PROXY_URL=https://your-proxy.com');
		return;
	}

	try {
		const searchUrl = `${PROXY_URL}/search?q=${encodeURIComponent(query)}&max_results=5`;
		console.log('🔍 Search URL:', searchUrl);

		const response = await fetch(searchUrl);
		console.log('📡 Response status:', response.status, response.statusText);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('❌ Error response:', errorText);
			return;
		}

		const data = await response.json();
		console.log('✅ Search successful');
		console.log('📊 Response structure:', {
			keys: Object.keys(data),
			hasResults: !!(data.foods || data.foods_search?.results?.food)
		});

		// Extract foods from different possible response formats
		let foods = [];
		if (data.foods_search?.results?.food) {
			foods = Array.isArray(data.foods_search.results.food)
				? data.foods_search.results.food
				: [data.foods_search.results.food];
		} else if (data.foods?.food) {
			foods = Array.isArray(data.foods.food) ? data.foods.food : [data.foods.food];
		} else if (data.foods && Array.isArray(data.foods)) {
			foods = data.foods;
		} else if (Array.isArray(data)) {
			foods = data;
		}

		console.log(`📋 Found ${foods.length} foods`);

		if (foods.length > 0) {
			const firstFood = foods[0];
			console.log('🥘 First result:', {
				id: firstFood.food_id || firstFood.id,
				name: firstFood.food_name || firstFood.name,
				brand: firstFood.brand_name || firstFood.brandName,
				type: firstFood.food_type || firstFood.type
			});

			// Test fetching details for the first food
			await testFoodDetails(firstFood.food_id || firstFood.id);
		}
	} catch (error) {
		console.error('❌ Search failed:', error.message);
	}
}

async function testFoodDetails(foodId) {
	console.log(`\n--- Testing Food Details: ${foodId} ---`);

	const endpoints = [
		`${PROXY_URL}/food?food_id=${foodId}&format=json`,
		`${PROXY_URL}/get?id=${foodId}`,
		`${PROXY_URL}/detail?food_id=${foodId}`,
		`${PROXY_URL}/foods/${foodId}`,
		`${PROXY_URL}/food/${foodId}`
	];

	let successCount = 0;
	let detailsFound = false;

	for (const url of endpoints) {
		try {
			console.log(`🔍 Trying: ${url}`);
			const response = await fetch(url);

			if (response.ok) {
				const data = await response.json();
				successCount++;

				// Check if this response has detailed nutrition data
				const hasNutrition = !!(
					data.servings?.length > 0 ||
					data.food?.servings?.length > 0 ||
					data.servings?.serving?.length > 0
				);

				console.log(`✅ Success with ${url}`);
				console.log('📊 Response has nutrition data:', hasNutrition);

				if (hasNutrition) {
					detailsFound = true;
					const servings = data.servings || data.food?.servings || data.servings?.serving || [];
					console.log(`🍽️  Found ${servings.length} servings`);

					if (servings.length > 0) {
						const firstServing = Array.isArray(servings) ? servings[0] : servings;
						console.log('📋 First serving:', {
							id: firstServing.id || firstServing.serving_id,
							description: firstServing.description || firstServing.serving_description,
							calories: firstServing.calories,
							protein: firstServing.protein,
							carbs: firstServing.carbohydrate,
							fat: firstServing.fat
						});
					}
					break; // Found detailed data, stop trying other endpoints
				}
			} else {
				console.log(`❌ Failed: ${response.status} ${response.statusText}`);
			}
		} catch (error) {
			console.log(`❌ Error: ${error.message}`);
		}
	}

	console.log(`📊 Summary: ${successCount}/${endpoints.length} endpoints worked`);
	console.log(`🍽️  Nutrition details found: ${detailsFound}`);
}

// Test with multiple search terms
async function runTests() {
	const testQueries = ['ground beef', 'chicken breast', 'apple', 'banana'];

	for (const query of testQueries) {
		await testSearch(query);
		await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second between tests
	}

	console.log('\n=== Debug Complete ===');
}

// Run the tests
runTests().catch(console.error);
