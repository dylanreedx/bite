<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { Search, Loader2, AlertCircle, Plus, Clock } from 'lucide-svelte';
	import { foodStore } from '$lib/stores/food.ts';
	import type { FoodSearchResult } from '$lib/types/food.ts';

	// Props
	interface Props {
		placeholder?: string;
		showRecentFoods?: boolean;
		maxResults?: number;
		autoFocus?: boolean;
	}

	let {
		placeholder = 'Search for foods...',
		showRecentFoods = true,
		maxResults = 20,
		autoFocus = false
	}: Props = $props();

	// Component state
	let searchInput = $state<HTMLInputElement>();
	let searchTimeout = $state<NodeJS.Timeout>();
	let showDropdown = $state(false);

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		select: FoodSearchResult;
		close: void;
	}>();

	// Store state
	let searchResults = $state([]);
	let searchQuery = $state('');
	let isSearching = $state(false);
	let searchError = $state(null);
	let recentFoods = $state([]);
	let isLoadingRecent = $state(false);
	let hasSearchResults = $state(false);

	// Subscribe to stores
	$effect(() => {
		const unsubscribeSearchResults = foodStore.searchResults.subscribe(results => {
			searchResults = results;
		});
		const unsubscribeSearchQuery = foodStore.searchQuery.subscribe(query => {
			searchQuery = query;
		});
		const unsubscribeIsSearching = foodStore.isSearching.subscribe(searching => {
			isSearching = searching;
		});
		const unsubscribeSearchError = foodStore.searchError.subscribe(error => {
			searchError = error;
		});
		const unsubscribeRecentFoods = foodStore.recentFoods.subscribe(foods => {
			recentFoods = foods;
		});
		const unsubscribeLoadingRecent = foodStore.isLoadingRecent.subscribe(loading => {
			isLoadingRecent = loading;
		});
		const unsubscribeHasResults = foodStore.hasSearchResults.subscribe(hasResults => {
			hasSearchResults = hasResults;
		});

		return () => {
			unsubscribeSearchResults();
			unsubscribeSearchQuery();
			unsubscribeIsSearching();
			unsubscribeSearchError();
			unsubscribeRecentFoods();
			unsubscribeLoadingRecent();
			unsubscribeHasResults();
		};
	});

	onMount(() => {
		if (autoFocus && searchInput) {
			searchInput.focus();
		}
		
		// Load recent foods on mount
		if (showRecentFoods) {
			foodStore.loadRecentFoods('recent', 10);
		}
	});

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const query = target.value.trim();

		// Clear existing timeout
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Show dropdown when user starts typing
		showDropdown = true;

		if (query.length === 0) {
			foodStore.clearSearch();
			return;
		}

		// Debounce search
		searchTimeout = setTimeout(() => {
			foodStore.searchFoods(query, maxResults);
		}, 300);
	}

	function handleFoodSelect(food: FoodSearchResult) {
		dispatch('select', food);
		showDropdown = false;
		if (searchInput) {
			searchInput.value = '';
		}
		foodStore.clearSearch();
	}

	function handleRecentFoodSelect(food: typeof recentFoods[0]) {
		// Convert recent food to search result format
		const searchResult: FoodSearchResult = {
			foodId: food.foodId,
			foodName: food.foodName,
			brandName: food.brandName,
			foodType: food.foodType,
			calories: food.calories,
			protein: food.protein,
			carbohydrate: food.carbohydrate,
			fat: food.fat,
			servingDescription: food.servingDescription,
			source: 'local'
		};
		handleFoodSelect(searchResult);
	}

	function handleFocus() {
		showDropdown = true;
	}

	function handleBlur() {
		// Delay hiding dropdown to allow clicks on results
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showDropdown = false;
			dispatch('close');
		}
	}

	function formatNutrition(value: number | null | undefined): string {
		return value ? Math.round(value).toString() : '0';
	}

	function getTimeAgo(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
		const diffInDays = Math.floor(diffInHours / 24);

		if (diffInDays > 0) {
			return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
		} else if (diffInHours > 0) {
			return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
		} else {
			return 'Recently';
		}
	}
</script>

<div class="relative w-full">
	<!-- Search Input -->
	<div class="relative">
		<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
		<input
			bind:this={searchInput}
			type="text"
			{placeholder}
			class="w-full rounded-lg border border-neutral-600 bg-neutral-700 py-3 pl-10 pr-4 text-neutral-100 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
		/>
	</div>

	<!-- Search Dropdown -->
	{#if showDropdown}
		<div class="absolute top-full left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 shadow-2xl scrollbar-thin scrollbar-track-neutral-800 scrollbar-thumb-neutral-600 hover:scrollbar-thumb-neutral-500">
			<!-- Loading State -->
			{#if isSearching}
				<div class="flex items-center justify-center p-4">
					<Loader2 class="h-5 w-5 animate-spin text-blue-400" />
					<span class="ml-2 text-sm text-neutral-300">Searching...</span>
				</div>
			<!-- Search Error -->
			{:else if searchError}
				<div class="flex items-center p-4 text-red-400">
					<AlertCircle class="h-5 w-5" />
					<span class="ml-2 text-sm">{searchError}</span>
				</div>
			<!-- Search Results -->
			{:else if hasSearchResults}
				<div class="py-2">
					<div class="px-3 py-2 text-xs font-medium text-neutral-400 uppercase tracking-wide">
						Search Results
					</div>
					{#each searchResults as food (food.foodId)}
						<button
							class="w-full px-3 py-3 text-left transition-colors hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none"
							onclick={() => handleFoodSelect(food)}
						>
							<div class="flex items-start justify-between">
								<div class="flex-grow min-w-0">
									<div class="flex items-center gap-2">
										<h3 class="font-medium text-neutral-100 truncate">{food.foodName}</h3>
										{#if food.source === 'fatsecret'}
											<span class="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">New</span>
										{/if}
									</div>
									{#if food.brandName}
										<p class="text-sm text-neutral-400 truncate">{food.brandName}</p>
									{/if}
									{#if food.servingDescription}
										<p class="text-xs text-neutral-500">{food.servingDescription}</p>
									{/if}
									{#if food.calories || food.protein || food.carbohydrate || food.fat}
										<div class="mt-1 flex items-center gap-3 text-xs text-neutral-400">
											{#if food.calories}
												<span class="text-orange-400">{formatNutrition(food.calories)} cal</span>
											{/if}
											{#if food.protein}
												<span class="text-sky-400">{formatNutrition(food.protein)}g P</span>
											{/if}
											{#if food.carbohydrate}
												<span class="text-purple-400">{formatNutrition(food.carbohydrate)}g C</span>
											{/if}
											{#if food.fat}
												<span class="text-green-400">{formatNutrition(food.fat)}g F</span>
											{/if}
										</div>
									{:else}
										<div class="mt-1 text-xs text-neutral-500 italic">
											Nutrition info will be loaded when logged
										</div>
									{/if}
								</div>
								<Plus class="ml-2 h-5 w-5 flex-shrink-0 text-neutral-400" />
							</div>
						</button>
					{/each}
				</div>
			<!-- Recent Foods (when no search query) -->
			{:else if showRecentFoods && !searchQuery}
				{#if isLoadingRecent}
					<div class="flex items-center justify-center p-4">
						<Loader2 class="h-5 w-5 animate-spin text-blue-400" />
						<span class="ml-2 text-sm text-neutral-300">Loading recent foods...</span>
					</div>
				{:else if recentFoods.length > 0}
					<div class="py-2">
						<div class="px-3 py-2 text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-2">
							<Clock class="h-3 w-3" />
							Recent Foods
						</div>
						{#each recentFoods as food (food.foodId)}
							<button
								class="w-full px-3 py-3 text-left transition-colors hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none"
								onclick={() => handleRecentFoodSelect(food)}
							>
								<div class="flex items-start justify-between">
									<div class="flex-grow min-w-0">
										<h3 class="font-medium text-neutral-100 truncate">{food.foodName}</h3>
										{#if food.brandName}
											<p class="text-sm text-neutral-400 truncate">{food.brandName}</p>
										{/if}
										<div class="flex items-center justify-between mt-1">
											{#if food.servingDescription}
												<p class="text-xs text-neutral-500">{food.servingDescription}</p>
											{/if}
											<p class="text-xs text-neutral-500">{getTimeAgo(food.lastUsed)}</p>
										</div>
										{#if food.calories || food.protein || food.carbohydrate || food.fat}
											<div class="mt-1 flex items-center gap-3 text-xs text-neutral-400">
												{#if food.calories}
													<span class="text-orange-400">{formatNutrition(food.calories)} cal</span>
												{/if}
												{#if food.protein}
													<span class="text-sky-400">{formatNutrition(food.protein)}g P</span>
												{/if}
												{#if food.carbohydrate}
													<span class="text-purple-400">{formatNutrition(food.carbohydrate)}g C</span>
												{/if}
												{#if food.fat}
													<span class="text-green-400">{formatNutrition(food.fat)}g F</span>
												{/if}
											</div>
										{:else}
											<div class="mt-1 text-xs text-neutral-500 italic">
												Nutrition info available when logged
											</div>
										{/if}
									</div>
									<Plus class="ml-2 h-5 w-5 flex-shrink-0 text-neutral-400" />
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="p-4 text-center text-neutral-500">
						<Clock class="h-8 w-8 mx-auto mb-2 text-neutral-600" />
						<p class="text-sm">No recent foods found</p>
						<p class="text-xs mt-1">Start logging foods to see them here</p>
					</div>
				{/if}
			<!-- Empty State -->
			{:else if searchQuery && !hasSearchResults}
				<div class="p-4 text-center text-neutral-500">
					<Search class="h-8 w-8 mx-auto mb-2 text-neutral-600" />
					<p class="text-sm">No foods found for "{searchQuery}"</p>
					<p class="text-xs mt-1">Try a different search term</p>
				</div>
			{/if}
		</div>
	{/if}
</div>