<script lang="ts">
	import { onMount } from 'svelte';
	import { Search, Database, AlertTriangle, CheckCircle } from 'lucide-svelte';

	// Component state
	let foodId = $state('1403');
	let isLoading = $state(false);
	let apiResponse = $state<any>(null);
	let proxyResponse = $state<any>(null);
	let error = $state('');

	async function testFoodApi() {
		if (!foodId) return;

		isLoading = true;
		error = '';
		apiResponse = null;
		proxyResponse = null;

		try {
			// Test the internal API endpoint
			console.log(`Testing internal API: /api/foods/${foodId}`);
			const internalResponse = await fetch(`/api/foods/${foodId}`, {
				headers: { 'Cache-Control': 'no-cache' }
			});

			const internalData = await internalResponse.json();
			apiResponse = {
				status: internalResponse.status,
				statusText: internalResponse.statusText,
				data: internalData
			};

			console.log(`Internal API response:`, apiResponse);

		} catch (err) {
			error = `Error testing API: ${err}`;
			console.error(error);
		}

		try {
			// Test the proxy directly if available
			const proxyUrl = 'your_proxy_url_here'; // You'll need to replace this
			if (proxyUrl && proxyUrl !== 'your_proxy_url_here') {
				console.log(`Testing proxy directly: ${proxyUrl}/food?food_id=${foodId}`);
				const directResponse = await fetch(`${proxyUrl}/food?food_id=${foodId}&format=json`);
				const directData = await directResponse.json();

				proxyResponse = {
					status: directResponse.status,
					statusText: directResponse.statusText,
					data: directData
				};

				console.log(`Direct proxy response:`, proxyResponse);
			}
		} catch (err) {
			console.warn(`Could not test proxy directly: ${err}`);
		}

		isLoading = false;
	}

	function analyzeNutritionData(servings: any[]) {
		if (!servings || servings.length === 0) return { hasNutrition: false, analysis: 'No servings found' };

		const analysis = servings.map((serving, index) => {
			const nutrition = {
				calories: serving.calories,
				protein: serving.protein,
				carbohydrate: serving.carbohydrate,
				fat: serving.fat
			};

			const hasAnyNutrition = Object.values(nutrition).some(val => val !== null && val !== undefined && val > 0);

			return {
				index: index + 1,
				servingId: serving.servingId,
				description: serving.servingDescription,
				nutrition,
				hasNutrition: hasAnyNutrition,
				raw: serving
			};
		});

		const hasNutrition = analysis.some(s => s.hasNutrition);

		return { hasNutrition, analysis };
	}

	onMount(() => {
		// Auto-test food 1403 on load
		testFoodApi();
	});
</script>

<svelte:head>
	<title>Food API Debug - Bite</title>
</svelte:head>

<div class="min-h-screen bg-neutral-900 p-6">
	<div class="mx-auto max-w-6xl space-y-8">
		<!-- Header -->
		<div class="text-center">
			<h1 class="text-3xl font-bold text-neutral-100">Food API Debug Tool</h1>
			<p class="mt-2 text-neutral-400">Debug nutrition data fetching for specific food IDs</p>
		</div>

		<!-- Input -->
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
			<h2 class="mb-4 text-xl font-semibold text-neutral-100">Test Food ID</h2>
			<div class="flex gap-3">
				<input
					bind:value={foodId}
					placeholder="Enter food ID (e.g., 1403)"
					class="flex-1 rounded border border-neutral-600 bg-neutral-700 px-3 py-2 text-neutral-100 focus:border-blue-500 focus:outline-none"
				/>
				<button
					onclick={testFoodApi}
					disabled={isLoading || !foodId.trim()}
					class="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{#if isLoading}
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
					{:else}
						<Search class="h-4 w-4" />
					{/if}
					Test Food API
				</button>
			</div>
		</div>

		<!-- Error Display -->
		{#if error}
			<div class="rounded-lg border border-red-700 bg-red-900/20 p-4">
				<div class="flex items-center gap-2 text-red-400">
					<AlertTriangle class="h-5 w-5" />
					<span class="font-medium">Error</span>
				</div>
				<p class="mt-2 text-red-300">{error}</p>
			</div>
		{/if}

		<!-- Internal API Response -->
		{#if apiResponse}
			<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
				<h2 class="mb-4 text-xl font-semibold text-neutral-100">Internal API Response (/api/foods/{foodId})</h2>

				<!-- Status -->
				<div class="mb-4 flex items-center gap-4">
					<div class="flex items-center gap-2">
						{#if apiResponse.status === 200}
							<CheckCircle class="h-5 w-5 text-green-400" />
						{:else}
							<AlertTriangle class="h-5 w-5 text-red-400" />
						{/if}
						<span class="text-neutral-200">Status: {apiResponse.status} {apiResponse.statusText}</span>
					</div>
				</div>

				<!-- Nutrition Analysis -->
				{#if apiResponse.data?.success && apiResponse.data?.food?.servings}
					{@const nutritionAnalysis = analyzeNutritionData(apiResponse.data.food.servings)}
					<div class="mb-4 rounded border border-neutral-600 bg-neutral-700 p-4">
						<h3 class="mb-2 font-medium text-neutral-100">Nutrition Analysis</h3>
						<div class="mb-2 flex items-center gap-2">
							{#if nutritionAnalysis.hasNutrition}
								<CheckCircle class="h-4 w-4 text-green-400" />
								<span class="text-green-400">Has nutrition data</span>
							{:else}
								<AlertTriangle class="h-4 w-4 text-red-400" />
								<span class="text-red-400">No nutrition data found</span>
							{/if}
						</div>

						<!-- Serving Details -->
						<div class="space-y-2">
							{#each nutritionAnalysis.analysis as serving}
								<div class="rounded border border-neutral-600 bg-neutral-800 p-3">
									<div class="mb-1 flex items-center justify-between">
										<span class="font-medium text-neutral-200">
											Serving {serving.index}: {serving.description}
										</span>
										{#if serving.hasNutrition}
											<CheckCircle class="h-4 w-4 text-green-400" />
										{:else}
											<AlertTriangle class="h-4 w-4 text-red-400" />
										{/if}
									</div>
									<div class="grid grid-cols-4 gap-2 text-sm">
										<div>
											<span class="text-neutral-400">Cal:</span>
											<span class="ml-1 text-neutral-200">{serving.nutrition.calories ?? 'null'}</span>
										</div>
										<div>
											<span class="text-neutral-400">Protein:</span>
											<span class="ml-1 text-neutral-200">{serving.nutrition.protein ?? 'null'}g</span>
										</div>
										<div>
											<span class="text-neutral-400">Carbs:</span>
											<span class="ml-1 text-neutral-200">{serving.nutrition.carbohydrate ?? 'null'}g</span>
										</div>
										<div>
											<span class="text-neutral-400">Fat:</span>
											<span class="ml-1 text-neutral-200">{serving.nutrition.fat ?? 'null'}g</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Raw Response -->
				<details class="rounded border border-neutral-600 bg-neutral-700">
					<summary class="cursor-pointer p-3 font-medium text-neutral-200">Raw API Response</summary>
					<pre class="overflow-auto p-3 text-xs text-neutral-300">{JSON.stringify(apiResponse.data, null, 2)}</pre>
				</details>
			</div>
		{/if}

		<!-- Proxy Response -->
		{#if proxyResponse}
			<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
				<h2 class="mb-4 text-xl font-semibold text-neutral-100">Direct Proxy Response</h2>

				<!-- Status -->
				<div class="mb-4 flex items-center gap-4">
					<div class="flex items-center gap-2">
						{#if proxyResponse.status === 200}
							<CheckCircle class="h-5 w-5 text-green-400" />
						{:else}
							<AlertTriangle class="h-5 w-5 text-red-400" />
						{/if}
						<span class="text-neutral-200">Status: {proxyResponse.status} {proxyResponse.statusText}</span>
					</div>
				</div>

				<!-- Raw Response -->
				<details class="rounded border border-neutral-600 bg-neutral-700">
					<summary class="cursor-pointer p-3 font-medium text-neutral-200">Raw Proxy Response</summary>
					<pre class="overflow-auto p-3 text-xs text-neutral-300">{JSON.stringify(proxyResponse.data, null, 2)}</pre>
				</details>
			</div>
		{/if}

		<!-- Debugging Tips -->
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
			<h2 class="mb-4 text-xl font-semibold text-neutral-100">Debugging Tips</h2>
			<div class="space-y-3 text-sm text-neutral-300">
				<div>
					<strong class="text-neutral-200">Common Issues:</strong>
					<ul class="ml-4 mt-1 list-disc space-y-1">
						<li>Nutrition values are null/undefined instead of 0</li>
						<li>Different field names in proxy response (e.g., snake_case vs camelCase)</li>
						<li>Serving exists but has no nutrition data in FatSecret</li>
						<li>Proxy returns success but empty/invalid nutrition fields</li>
					</ul>
				</div>
				<div>
					<strong class="text-neutral-200">What to Check:</strong>
					<ul class="ml-4 mt-1 list-disc space-y-1">
						<li>Are nutrition values truly > 0 or just not null?</li>
						<li>Check field names in the raw response</li>
						<li>Verify the serving actually has nutrition data in FatSecret</li>
						<li>Look for alternative field names (calories vs energy, etc.)</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
