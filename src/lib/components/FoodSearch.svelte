<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { Search, Loader2, AlertCircle, Plus, Clock } from 'lucide-svelte';
	import { foodStore } from '$lib/stores/food';
	import type { FoodSearchResult, RecentFood } from '$lib/types/food';

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
	let searchResults: FoodSearchResult[] = $state([]);
	let searchQuery = $state('');
	let isSearching = $state(false);
	let searchError: string | null = $state(null);

	let recentFoods: RecentFood[] = $state([]);
	let isLoadingRecent = $state(false);
	let hasSearchResults = $state(false);

	// Subscribe to stores
	$effect(() => {
		const unsubscribeSearchResults = foodStore.searchResults.subscribe((results) => {
			searchResults = results;
		});
		const unsubscribeSearchQuery = foodStore.searchQuery.subscribe((query) => {
			searchQuery = query;
		});
		const unsubscribeIsSearching = foodStore.isSearching.subscribe((searching) => {
			isSearching = searching;
		});
		const unsubscribeSearchError = foodStore.searchError.subscribe((error) => {
			searchError = error;
		});
		const unsubscribeRecentFoods = foodStore.recentFoods.subscribe((foods) => {
			recentFoods = foods;
		});
		const unsubscribeLoadingRecent = foodStore.isLoadingRecent.subscribe((loading) => {
			isLoadingRecent = loading;
		});
		const unsubscribeHasResults = foodStore.hasSearchResults.subscribe((hasResults) => {
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
			// Delay focus slightly to ensure proper keyboard handling
			setTimeout(() => {
				searchInput.focus();
			}, 100);
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

		// Shorter debounce for better responsiveness, but still avoid too many requests
		const debounceTime = query.length >= 4 ? 200 : 400; // Faster search for longer queries

		searchTimeout = setTimeout(() => {
			foodStore.searchFoods(query, maxResults);
		}, debounceTime);
	}

	function handleFoodSelect(food: FoodSearchResult) {
		dispatch('select', food);
		showDropdown = false;
		if (searchInput) {
			searchInput.value = '';
		}
		foodStore.clearSearch();
	}

	function handleRecentFoodSelect(food: (typeof recentFoods)[0]) {
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

	function highlightMatch(text: string, query: string): string {
		if (!query || !text) return text;

		const tokens = query
			.toLowerCase()
			.split(/[\s,&\-\+]+/)
			.filter((t) => t.length > 1);
		let highlightedText = text;

		tokens.forEach((token) => {
			const regex = new RegExp(`(${token})`, 'gi');
			highlightedText = highlightedText.replace(
				regex,
				'<mark class="bg-yellow-400/30 text-yellow-200">$1</mark>'
			);
		});

		return highlightedText;
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<!-- Search Input -->
	<div class="relative flex-shrink-0">
		<Search class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-neutral-400" />
		<input
			bind:this={searchInput}
			type="text"
			{placeholder}
			class="w-full rounded-lg border border-neutral-600 bg-neutral-700 py-3 pr-4 pl-10 text-neutral-100 placeholder-neutral-400 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
		/>
	</div>

	<!-- Search Results Container -->
	{#if showDropdown}
		<div
			class="scrollbar-thin scrollbar-track-neutral-800 scrollbar-thumb-neutral-600 hover:scrollbar-thumb-neutral-500 mt-2 flex-1 overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800 shadow-2xl"
			style="min-height: 200px; max-height: 400px;"
		>
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
					<div class="px-3 py-2 text-xs font-medium tracking-wide text-neutral-400 uppercase">
						Search Results
					</div>
					{#each searchResults as food: FoodSearchResult (`search-${food.foodId}`)}
						<button
							onclick={() => handleFoodSelect(food)}
							class="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none"
						>
							<div class="flex-shrink-0 rounded-md bg-neutral-600 p-2">
								<Search class="h-5 w-5 text-blue-400" />
							</div>
							<div class="min-w-0 flex-grow">
								<div class="flex items-center gap-2">
									<h3 class="truncate font-medium text-neutral-100">
										{@html highlightMatch(food.foodName, searchQuery)}
									</h3>
									{#if food.source === 'fatsecret'}
										<span class="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">New</span>
									{/if}
								</div>
								{#if food.brandName}
									<p class="truncate text-sm text-neutral-400">
										{@html highlightMatch(food.brandName, searchQuery)}
									</p>
								{/if}
								{#if food.servingDescription}
									<p class="text-xs text-neutral-500">{food.servingDescription}</p>
								{/if}
								{#if food.calories || food.protein || food.carbohydrate || food.fat}
									<div class="mt-1 flex items-center gap-3 text-xs text-neutral-400">
										{#if food.calories}
											<span class="text-orange-400">{Math.round(food.calories)} cal</span>
										{/if}
										{#if food.protein}
											<span class="text-sky-400">{Math.round(food.protein)}g P</span>
										{/if}
										{#if food.carbohydrate}
											<span class="text-purple-400">{Math.round(food.carbohydrate)}g C</span>
										{/if}
										{#if food.fat}
											<span class="text-green-400">{Math.round(food.fat)}g F</span>
										{/if}
									</div>
								{/if}
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
						<div
							class="flex items-center gap-2 px-3 py-2 text-xs font-medium tracking-wide text-neutral-400 uppercase"
						>
							<Clock class="h-3 w-3" />
							Recent Foods
						</div>
						{#each recentFoods as food (`recent-${food.foodId}`)}
							<button
								class="w-full px-3 py-3 text-left transition-colors hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none active:bg-neutral-600"
								onclick={() => handleRecentFoodSelect(food)}
							>
								<div class="flex items-start justify-between">
									<div class="min-w-0 flex-grow">
										<h3 class="truncate font-medium text-neutral-100">{food.foodName}</h3>
										{#if food.brandName}
											<p class="truncate text-sm text-neutral-400">{food.brandName}</p>
										{/if}
										<div class="mt-1 flex items-center justify-between">
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
													<span class="text-purple-400"
														>{formatNutrition(food.carbohydrate)}g C</span
													>
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
						<Clock class="mx-auto mb-2 h-8 w-8 text-neutral-600" />
						<p class="text-sm">No recent foods found</p>
						<p class="mt-1 text-xs">Start logging foods to see them here</p>
					</div>
				{/if}
				<!-- Empty State -->
			{:else if searchQuery && !hasSearchResults}
				<div class="p-4 text-center text-neutral-500">
					<Search class="mx-auto mb-2 h-8 w-8 text-neutral-600" />
					<p class="text-sm">No foods found for "{searchQuery}"</p>
					<p class="mt-1 text-xs">Try a different search term</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
