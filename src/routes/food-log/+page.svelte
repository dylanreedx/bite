<script lang="ts">
	import {
		Search,
		Plus,
		Calendar,
		Utensils,
		Filter,
		ChevronDown,
		History,
		Loader2
	} from 'lucide-svelte';
	import { foodStore } from '$lib/stores/food.ts';
	import { nutritionStore } from '$lib/stores/nutrition.ts';
	import FoodSearch from '$lib/components/FoodSearch.svelte';
	import FoodLogEntry from '$lib/components/FoodLogEntry.svelte';
	import NutritionProgress from '$lib/components/NutritionProgress.svelte';
	import type { FoodSearchResult, FoodLogEntry as FoodLogEntryType } from '$lib/types/food.ts';

	let { data } = $props();

	// Component state
	let searchQuery = $state('');
	let selectedMeal = $state('all');
	let showMealFilter = $state(false);
	let showSearchModal = $state(false);
	let selectedDate = $state(new Date().toISOString().split('T')[0]);

	// Store state
	let todayLog = $state([]);
	let todayTotals = $state({ calories: 0, protein: 0, carbohydrate: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });
	let isLoadingLog = $state(false);
	let logError = $state(null);
	let recentFoods = $state([]);
	let isLoadingRecent = $state(false);
	let isLoggingFood = $state(false);

	// Subscribe to stores
	$effect(() => {
		const unsubscribeTodayLog = foodStore.todayLog.subscribe(log => {
			todayLog = log;
		});
		const unsubscribeTotals = foodStore.todayTotals.subscribe(totals => {
			todayTotals = totals;
		});
		const unsubscribeLoadingLog = foodStore.isLoadingLog.subscribe(loading => {
			isLoadingLog = loading;
		});
		const unsubscribeLogError = foodStore.logError.subscribe(error => {
			logError = error;
		});
		const unsubscribeRecentFoods = foodStore.recentFoods.subscribe(foods => {
			recentFoods = foods;
		});
		const unsubscribeLoadingRecent = foodStore.isLoadingRecent.subscribe(loading => {
			isLoadingRecent = loading;
		});
		const unsubscribeLoggingFood = foodStore.isLoggingFood.subscribe(logging => {
			isLoggingFood = logging;
		});

		return () => {
			unsubscribeTodayLog();
			unsubscribeTotals();
			unsubscribeLoadingLog();
			unsubscribeLogError();
			unsubscribeRecentFoods();
			unsubscribeLoadingRecent();
			unsubscribeLoggingFood();
		};
	});

	const meals = [
		{ id: 'breakfast', name: 'Breakfast', icon: '🌅' },
		{ id: 'lunch', name: 'Lunch', icon: '☀️' },
		{ id: 'dinner', name: 'Dinner', icon: '🌙' },
		{ id: 'snacks', name: 'Snacks', icon: '🍿' }
	];

	// Filter today's log by meal
	let filteredTodaysLog = $derived(() => {
		if (selectedMeal === 'all') {
			return todayLog;
		}
		return todayLog.filter(entry => entry.meal === selectedMeal);
	});

	// Handle date change
	$effect(() => {
		foodStore.setSelectedDate(selectedDate);
	});

	function getMealEmoji(meal: string): string {
		const mealData = meals.find(m => m.id === meal);
		return mealData?.icon || '🍽️';
	}

	function getMealName(meal: string): string {
		const mealData = meals.find(m => m.id === meal);
		return mealData?.name || meal;
	}

	async function handleFoodSelect(event: CustomEvent<FoodSearchResult>) {
		const food = event.detail;
		showSearchModal = false;
		
		try {
			// Get food details to show serving options
			const foodDetails = await foodStore.getFoodDetails(food.foodId);
			
			// For now, use the default serving with quantity 1
			// In a real app, you'd show a modal to select serving and quantity
			const defaultServing = foodDetails.servings.find(s => s.isDefault === 1) || foodDetails.servings[0];
			
			if (defaultServing) {
				await foodStore.logFood(
					food.foodId,
					defaultServing.servingId,
					1,
					selectedMeal === 'all' ? undefined : selectedMeal,
					selectedDate
				);
			} else {
				// If no servings available, this shouldn't happen due to our API fixes
				console.warn('No serving data available for food:', food.foodName);
			}
		} catch (error) {
			console.error('Failed to log food:', error);
			// Could show a user-friendly error message here
		}
	}

	async function handleQuickAdd(food: typeof recentFoods[0]) {
		try {
			await foodStore.quickAddFood(food, 1);
		} catch (error) {
			console.error('Failed to quick add food:', error);
		}
	}

	function handleEditEntry(event: CustomEvent<FoodLogEntryType>) {
		// TODO: Show edit modal
		console.log('Edit entry:', event.detail);
	}

	async function handleDuplicateEntry(event: CustomEvent<FoodLogEntryType>) {
		const entry = event.detail;
		try {
			await foodStore.logFood(
				entry.foodId,
				entry.servingId,
				entry.quantity,
				entry.meal || undefined,
				selectedDate
			);
		} catch (error) {
			console.error('Failed to duplicate entry:', error);
		}
	}

	function handleDeleteEntry(event: CustomEvent<number>) {
		// Entry is already deleted by the component
		console.log('Entry deleted:', event.detail);
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (dateString === today.toISOString().split('T')[0]) {
			return 'Today';
		} else if (dateString === yesterday.toISOString().split('T')[0]) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric'
			});
		}
	}
</script>

<div class="p-4 pb-28 sm:p-6">
	<header class="mb-6">
		<h1 class="text-3xl font-bold text-neutral-100 sm:text-4xl">Food Log</h1>
		<p class="mt-2 text-neutral-400">
			Track your daily nutrition intake{#if data?.user?.name}, {data.user.name}{/if}
		</p>
	</header>

	<!-- Date Selector and Add Button -->
	<section class="mb-6 flex items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<Calendar class="h-5 w-5 text-neutral-400" />
			<input
				type="date"
				bind:value={selectedDate}
				class="rounded-lg border border-neutral-600 bg-neutral-700 px-3 py-2 text-neutral-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
			/>
			<span class="text-sm text-neutral-400">{formatDate(selectedDate)}</span>
		</div>
		
		<button
			onclick={() => showSearchModal = true}
			class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
			disabled={isLoggingFood}
		>
			{#if isLoggingFood}
				<Loader2 class="h-4 w-4 animate-spin" />
			{:else}
				<Plus class="h-4 w-4" />
			{/if}
			Add Food
		</button>
	</section>

	<!-- Today's Summary -->
	{#if selectedDate === new Date().toISOString().split('T')[0]}
		<section class="mb-8">
			<NutritionProgress compact={true} />
		</section>
	{:else}
		<section class="mb-8 rounded-xl border border-neutral-700 bg-neutral-800 p-5 shadow-xl">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-neutral-100">Daily Summary</h2>
				<div class="flex items-center gap-2 text-sm text-neutral-400">
					<Calendar class="h-4 w-4" />
					{formatDate(selectedDate)}
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div class="text-center">
					<p class="text-2xl font-bold text-orange-400">{Math.round(todayTotals.calories)}</p>
					<p class="text-xs text-neutral-400">Calories</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-sky-400">{Math.round(todayTotals.protein)}g</p>
					<p class="text-xs text-neutral-400">Protein</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-purple-400">{Math.round(todayTotals.carbohydrate)}g</p>
					<p class="text-xs text-neutral-400">Carbs</p>
				</div>
				<div class="text-center">
					<p class="text-2xl font-bold text-green-400">{Math.round(todayTotals.fat)}g</p>
					<p class="text-xs text-neutral-400">Fat</p>
				</div>
			</div>
		</section>
	{/if}

	<!-- Meal Filter -->
	<section class="mb-6">
		<div class="flex items-center gap-3">
			<button
				onclick={() => showMealFilter = !showMealFilter}
				class="flex items-center gap-2 rounded-lg border border-neutral-600 bg-neutral-700 px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-600"
			>
				<Filter class="h-4 w-4" />
				Filter by meal
				<ChevronDown class="h-4 w-4 transition-transform {showMealFilter ? 'rotate-180' : ''}" />
			</button>
		</div>

		{#if showMealFilter}
			<div class="mt-3 flex flex-wrap gap-2">
				<button
					onclick={() => { selectedMeal = 'all'; showMealFilter = false; }}
					class="rounded-full bg-neutral-600 px-3 py-1 text-xs text-neutral-200 transition-colors hover:bg-neutral-500 {selectedMeal === 'all' ? 'bg-blue-600 text-white' : ''}"
				>
					All Meals
				</button>
				{#each meals as meal}
					<button
						onclick={() => { selectedMeal = meal.id; showMealFilter = false; }}
						class="rounded-full bg-neutral-600 px-3 py-1 text-xs text-neutral-200 transition-colors hover:bg-neutral-500 {selectedMeal === meal.id ? 'bg-blue-600 text-white' : ''}"
					>
						{meal.icon} {meal.name}
					</button>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Loading State -->
	{#if isLoadingLog}
		<div class="flex items-center justify-center p-8">
			<Loader2 class="h-6 w-6 animate-spin text-blue-400" />
			<span class="ml-2 text-neutral-400">Loading food log...</span>
		</div>
	<!-- Error State -->
	{:else if logError}
		<div class="rounded-lg border border-red-600 bg-red-900/20 p-4 text-center">
			<p class="text-red-400">{logError}</p>
			<button
				onclick={() => foodStore.loadTodayLog()}
				class="mt-2 text-sm text-blue-400 hover:text-blue-300"
			>
				Try again
			</button>
		</div>
	<!-- Food Entries -->
	{:else if filteredTodaysLog.length === 0}
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-8 text-center">
			<Utensils class="mx-auto mb-3 h-12 w-12 text-neutral-500" />
			<p class="text-neutral-400">No entries found for {selectedMeal === 'all' ? formatDate(selectedDate) : getMealName(selectedMeal)}</p>
			<p class="mt-1 text-sm text-neutral-500">Start logging your food to track your nutrition!</p>
			<button
				onclick={() => showSearchModal = true}
				class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
			>
				Add Your First Food
			</button>
		</div>
	{:else}
		<section class="mb-8">
			<h2 class="mb-4 text-xl font-semibold text-neutral-100">
				{selectedMeal === 'all' ? `${formatDate(selectedDate)} Entries` : getMealName(selectedMeal)}
			</h2>
			
			<div class="space-y-3">
				{#each filteredTodaysLog as entry (entry.id)}
					<FoodLogEntry 
						{entry}
						showMeal={selectedMeal === 'all'}
						showTime={true}
						showActions={true}
						on:edit={handleEditEntry}
						on:duplicate={handleDuplicateEntry}
						on:delete={handleDeleteEntry}
					/>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Recent & Quick Add Foods -->
	<section>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-neutral-100">Quick Add</h2>
			<button 
				class="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
				onclick={() => foodStore.loadRecentFoods('recent', 15)}
			>
				<History class="h-4 w-4" />
				Refresh
			</button>
		</div>

		{#if isLoadingRecent}
			<div class="flex items-center justify-center p-4">
				<Loader2 class="h-5 w-5 animate-spin text-blue-400" />
				<span class="ml-2 text-sm text-neutral-300">Loading recent foods...</span>
			</div>
		{:else if recentFoods.length > 0}
			<div class="space-y-3">
				{#each recentFoods as food (food.foodId)}
					<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-4 transition-colors hover:border-neutral-600">
						<div class="flex items-center justify-between">
							<div class="flex-grow min-w-0">
								<h3 class="font-medium text-neutral-100 truncate">{food.foodName}</h3>
								{#if food.brandName}
									<p class="text-sm text-neutral-400 truncate">{food.brandName}</p>
								{/if}
								<div class="flex items-center justify-between mt-1">
									{#if food.servingDescription}
										<p class="text-xs text-neutral-500">{food.servingDescription}</p>
									{/if}
									<p class="text-xs text-neutral-500">
										Last used {new Date(food.lastUsed).toLocaleDateString()}
									</p>
								</div>
								{#if food.calories || food.protein || food.carbohydrate || food.fat}
									<div class="mt-2 flex items-center gap-3 text-xs text-neutral-400">
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
							<button
								onclick={() => handleQuickAdd(food)}
								disabled={isLoggingFood}
								class="ml-4 flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
							>
								{#if isLoggingFood}
									<Loader2 class="h-3 w-3 animate-spin" />
								{:else}
									<Plus class="h-3 w-3" />
								{/if}
								Add
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-8 text-center">
				<History class="h-12 w-12 mx-auto mb-2 text-neutral-600" />
				<p class="text-sm text-neutral-400">No recent foods found</p>
				<p class="text-xs mt-1 text-neutral-500">Foods you log will appear here for quick access</p>
			</div>
		{/if}
	</section>
</div>

<!-- Search Modal -->
{#if showSearchModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-2xl rounded-lg border border-neutral-600 bg-neutral-800 p-6 shadow-2xl">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-neutral-100">Search Foods</h3>
				<button
					onclick={() => showSearchModal = false}
					class="rounded-lg p-2 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
				>
					✕
				</button>
			</div>
			
			<FoodSearch
				placeholder="Search for foods to add..."
				showRecentFoods={true}
				maxResults={15}
				autoFocus={true}
				on:select={handleFoodSelect}
				on:close={() => showSearchModal = false}
			/>
		</div>
	</div>
{/if}