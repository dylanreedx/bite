<script lang="ts">
	import { onMount } from 'svelte';
	import { Search, Loader2, CheckCircle, AlertTriangle, Database } from 'lucide-svelte';
	import { foodStore } from '$lib/stores/food';
	import { syncPatterns, needsNutritionSync } from '$lib/utils/nutritionSync';
	import type { FoodSearchResult, FoodDetails, FoodLogEntry } from '$lib/types/food';

	// Component state
	let step = $state(1);
	let searchResults = $state<FoodSearchResult[]>([]);
	let selectedFood = $state<FoodSearchResult | null>(null);
	let foodDetails = $state<FoodDetails | null>(null);
	let loggedEntry = $state<FoodLogEntry | null>(null);
	let isLoading = $state(false);
	let currentAction = $state('');
	let syncStatus = $state('');

	// Steps in the demo
	const steps = [
		'Search for ground beef',
		'Select a food item',
		'View food details',
		'Log the food',
		'Monitor sync progress'
	];

	onMount(() => {
		// Subscribe to food store updates
		const unsubscribeSearch = foodStore.searchResults.subscribe((results) => {
			searchResults = results;
		});

		return () => {
			unsubscribeSearch();
		};
	});

	async function searchGroundBeef() {
		isLoading = true;
		currentAction = 'Searching for ground beef...';

		try {
			await foodStore.searchFoods('ground beef', 10);

			// Auto-sync any results that need nutrition data
			const needsSyncResults = searchResults.filter(needsNutritionSync);
			if (needsSyncResults.length > 0) {
				currentAction = `Found ${needsSyncResults.length} foods needing nutrition sync`;
				await syncPatterns.onSearchResults(searchResults);
				syncStatus = `Queued ${needsSyncResults.length} foods for background sync`;
			} else {
				syncStatus = 'All search results have nutrition data';
			}

			step = 2;
		} catch (error) {
			console.error('Search failed:', error);
		} finally {
			isLoading = false;
			currentAction = '';
		}
	}

	async function selectFood(food: FoodSearchResult) {
		selectedFood = food;
		isLoading = true;
		currentAction = 'Loading food details...';

		try {
			// This will automatically queue for sync if nutrition is missing
			foodDetails = await foodStore.getFoodDetails(food.foodId, 'medium');

			if (needsNutritionSync(food)) {
				syncStatus = `Queued "${food.foodName}" for priority sync (missing nutrition)`;
			} else {
				syncStatus = `"${food.foodName}" has complete nutrition data`;
			}

			step = 3;
		} catch (error) {
			console.error('Failed to get food details:', error);
		} finally {
			isLoading = false;
			currentAction = '';
		}
	}

	async function logFood() {
		if (!selectedFood || !foodDetails?.servings?.[0]) return;

		isLoading = true;
		currentAction = 'Logging food entry...';

		try {
			const serving = foodDetails.servings[0];
			loggedEntry = await foodStore.logFood(selectedFood.foodId, serving.servingId, 1, 'lunch');

			// Check if the logged entry has nutrition data
			const hasNutrition =
				(loggedEntry.nutrition.calories && loggedEntry.nutrition.calories > 0) ||
				(loggedEntry.nutrition.protein && loggedEntry.nutrition.protein > 0) ||
				(loggedEntry.nutrition.carbohydrate && loggedEntry.nutrition.carbohydrate > 0) ||
				(loggedEntry.nutrition.fat && loggedEntry.nutrition.fat > 0);

			if (!hasNutrition) {
				syncStatus = `Food logged! Nutrition data missing - queued for HIGH PRIORITY sync`;
				// The food store automatically queues missing nutrition for high priority
			} else {
				syncStatus = `Food logged successfully with complete nutrition data!`;
			}

			step = 4;
		} catch (error) {
			console.error('Failed to log food:', error);
		} finally {
			isLoading = false;
			currentAction = '';
		}
	}

	function getStepIcon(stepNum: number) {
		if (stepNum < step) return CheckCircle;
		if (stepNum === step) return isLoading ? Loader2 : AlertTriangle;
		return Search;
	}

	function getStepColor(stepNum: number) {
		if (stepNum < step) return 'text-green-400';
		if (stepNum === step) return isLoading ? 'text-blue-400' : 'text-yellow-400';
		return 'text-neutral-400';
	}

	function resetDemo() {
		step = 1;
		searchResults = [];
		selectedFood = null;
		foodDetails = null;
		loggedEntry = null;
		syncStatus = '';
		currentAction = '';
		foodStore.clearSearch();
	}
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
	<!-- Header -->
	<div class="text-center">
		<h1 class="mb-2 text-2xl font-bold text-neutral-100">Ground Beef Sync Demo</h1>
		<p class="text-neutral-400">Demonstrates how the async nutrition sync system works</p>
	</div>

	<!-- Progress Steps -->
	<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-neutral-100">Demo Progress</h2>
			<button
				onclick={resetDemo}
				class="rounded bg-neutral-600 px-3 py-1 text-sm text-neutral-200 hover:bg-neutral-700"
			>
				Reset Demo
			</button>
		</div>

		<div class="space-y-3">
			{#each steps as stepText, index (index)}
				<div class="flex items-center gap-3">
					{#if getStepIcon(index + 1) === CheckCircle}
						<CheckCircle
							class="h-5 w-5 {getStepColor(index + 1)} {index + 1 === step && isLoading
								? 'animate-spin'
								: ''}"
						/>
					{:else if getStepIcon(index + 1) === Loader2}
						<Loader2
							class="h-5 w-5 {getStepColor(index + 1)} {index + 1 === step && isLoading
								? 'animate-spin'
								: ''}"
						/>
					{:else if getStepIcon(index + 1) === AlertTriangle}
						<AlertTriangle
							class="h-5 w-5 {getStepColor(index + 1)} {index + 1 === step && isLoading
								? 'animate-spin'
								: ''}"
						/>
					{:else}
						<Search
							class="h-5 w-5 {getStepColor(index + 1)} {index + 1 === step && isLoading
								? 'animate-spin'
								: ''}"
						/>
					{/if}
					<span class="text-neutral-200 {index + 1 === step ? 'font-medium' : ''}">{stepText}</span>
				</div>
			{/each}
		</div>

		{#if currentAction}
			<div class="mt-4 rounded border border-blue-700 bg-blue-900/20 p-3">
				<div class="flex items-center gap-2 text-blue-400">
					<Loader2 class="h-4 w-4 animate-spin" />
					<span class="text-sm">{currentAction}</span>
				</div>
			</div>
		{/if}

		{#if syncStatus}
			<div class="mt-4 rounded border border-purple-700 bg-purple-900/20 p-3">
				<div class="flex items-center gap-2 text-purple-400">
					<Database class="h-4 w-4" />
					<span class="text-sm">{syncStatus}</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Step 1: Search -->
	{#if step === 1}
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
			<h3 class="mb-4 text-lg font-semibold text-neutral-100">Step 1: Search for Ground Beef</h3>
			<p class="mb-4 text-neutral-400">
				This will search for ground beef and automatically queue any results that need nutrition
				data for background sync.
			</p>
			<button
				onclick={searchGroundBeef}
				disabled={isLoading}
				class="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
			>
				{#if isLoading}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<Search class="h-4 w-4" />
				{/if}
				Search Ground Beef
			</button>
		</div>
	{/if}

	<!-- Step 2: Select Food -->
	{#if step === 2}
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
			<h3 class="mb-4 text-lg font-semibold text-neutral-100">Step 2: Select a Food Item</h3>
			<p class="mb-4 text-neutral-400">
				Choose a ground beef option. Foods with missing nutrition data are marked and will be queued
				for sync.
			</p>
			<div class="space-y-2">
				{#each searchResults.slice(0, 5) as food (food.foodId)}
					<div
						class="flex items-center justify-between rounded border border-neutral-600 bg-neutral-700 p-3"
					>
						<div>
							<div class="font-medium text-neutral-100">{food.foodName}</div>
							<div class="text-sm text-neutral-400">
								{#if food.brandName}{food.brandName} •{/if}
								ID: {food.foodId}
								{#if food.calories}
									• {food.calories} cal{/if}
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if needsNutritionSync(food)}
								<span class="rounded bg-red-600/20 px-2 py-1 text-xs text-red-400">
									Needs Sync
								</span>
							{:else}
								<span class="rounded bg-green-600/20 px-2 py-1 text-xs text-green-400">
									Has Nutrition
								</span>
							{/if}
							<button
								onclick={() => selectFood(food)}
								class="rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
							>
								Select
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Step 3: Food Details -->
	{#if step === 3 && selectedFood && foodDetails}
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
			<h3 class="mb-4 text-lg font-semibold text-neutral-100">Step 3: Food Details Loaded</h3>
			<div class="mb-4 rounded border border-neutral-600 bg-neutral-700 p-4">
				<h4 class="mb-2 font-medium text-neutral-100">{selectedFood.foodName}</h4>
				{#if foodDetails && foodDetails.servings?.length > 0}
					<div class="mb-2 text-sm text-neutral-400">
						Available servings: {foodDetails.servings.length}
					</div>
					<div class="text-sm">
						First serving: {foodDetails.servings[0].servingDescription}
						{#if foodDetails.servings[0].calories}
							• {foodDetails.servings[0].calories} cal
						{:else}
							• <span class="text-red-400">No nutrition data</span>
						{/if}
					</div>
				{:else}
					<div class="text-sm text-red-400">No servings available</div>
				{/if}
			</div>
			<button
				onclick={logFood}
				disabled={isLoading || !foodDetails?.servings?.[0]}
				class="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
			>
				{#if isLoading}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<Database class="h-4 w-4" />
				{/if}
				Log This Food
			</button>
		</div>
	{/if}

	<!-- Step 4: Logged Entry -->
	{#if step === 4 && loggedEntry}
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
			<h3 class="mb-4 text-lg font-semibold text-neutral-100">Step 4: Food Logged Successfully!</h3>
			<div class="mb-4 rounded border border-neutral-600 bg-neutral-700 p-4">
				<h4 class="mb-2 font-medium text-neutral-100">Log Entry Created</h4>
				<div class="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span class="text-neutral-400">Food:</span>
						<span class="ml-2 text-neutral-200">{loggedEntry.food.foodName}</span>
					</div>
					<div>
						<span class="text-neutral-400">Serving:</span>
						<span class="ml-2 text-neutral-200">{loggedEntry.serving.servingDescription}</span>
					</div>
					<div>
						<span class="text-neutral-400">Calories:</span>
						<span class="ml-2 text-neutral-200">
							{loggedEntry.nutrition.calories || 'Syncing...'}
						</span>
					</div>
					<div>
						<span class="text-neutral-400">Protein:</span>
						<span class="ml-2 text-neutral-200">
							{loggedEntry.nutrition.protein || 'Syncing...'}g
						</span>
					</div>
				</div>
			</div>

			<div class="rounded border border-green-700 bg-green-900/20 p-4">
				<h5 class="mb-2 font-medium text-green-400">What Happens Next?</h5>
				<ul class="space-y-1 text-sm text-green-300">
					<li>• If nutrition data is missing, the food is queued for HIGH PRIORITY sync</li>
					<li>• The sync service will fetch data from FatSecret API (respecting rate limits)</li>
					<li>• Once synced, the nutrition values will automatically update in your log</li>
					<li>• Future logs of this food will have immediate nutrition data</li>
				</ul>
			</div>
		</div>
	{/if}

	<!-- Summary -->
	<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
		<h3 class="mb-4 text-lg font-semibold text-neutral-100">How the Async Sync System Helps</h3>
		<div class="grid gap-4 text-sm md:grid-cols-2">
			<div>
				<h4 class="mb-2 font-medium text-neutral-200">Without Async Sync:</h4>
				<ul class="space-y-1 text-neutral-400">
					<li>• User waits for each API call</li>
					<li>• Rate limits block the UI</li>
					<li>• Failed requests require manual retry</li>
					<li>• Poor user experience</li>
				</ul>
			</div>
			<div>
				<h4 class="mb-2 font-medium text-neutral-200">With Async Sync:</h4>
				<ul class="space-y-1 text-neutral-400">
					<li>• User can log food immediately</li>
					<li>• Nutrition data syncs in background</li>
					<li>• Automatic retry and rate limiting</li>
					<li>• Seamless user experience</li>
				</ul>
			</div>
		</div>
	</div>
</div>
