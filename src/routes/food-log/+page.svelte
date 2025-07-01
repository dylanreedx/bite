<script lang="ts">
	import { Plus, Calendar, Utensils, Filter, ChevronDown, History, Loader2 } from 'lucide-svelte';
	import { foodStore } from '$lib/stores/food';
	import FoodLogEntry from '$lib/components/FoodLogEntry.svelte';
	import FoodLogEditModal from '$lib/components/FoodLogEditModal.svelte';
	import FoodSearchModal from '$lib/components/FoodSearchModal.svelte';
	import NutritionProgress from '$lib/components/NutritionProgress.svelte';
	import type {
		FoodSearchResult,
		FoodLogEntry as FoodLogEntryType,
		FoodDetails,
		DailyTotals,
		RecentFood
	} from '$lib/types/food';

	let { data } = $props();

	// Component state
	let selectedMeal = $state('all');
	let showMealFilter = $state(false);
	let showSearchModal = $state(false);
	let showEditModal = $state(false);
	let selectedDate = $state(new Date().toISOString().split('T')[0]);
	let editingEntry: FoodLogEntryType | null = $state(null);
	let editingFoodDetails: FoodDetails | null = $state(null);

	// Store state
	let todayLog: FoodLogEntryType[] = $state([]);
	let todayTotals: DailyTotals = $state({
		calories: 0,
		protein: 0,
		carbohydrate: 0,
		fat: 0,
		fiber: 0,
		sugar: 0,
		sodium: 0
	});
	let isLoadingLog = $state(false);
	let logError: string | null = $state(null);
	let recentFoods: RecentFood[] = $state([]);
	let isLoadingRecent = $state(false);
	let isLoggingFood = $state(false);

	// Subscribe to stores
	$effect(() => {
		const unsubscribeTodayLog = foodStore.todayLog.subscribe((log) => {
			todayLog = log;
		});
		const unsubscribeTotals = foodStore.todayTotals.subscribe((totals) => {
			todayTotals = totals;
		});
		const unsubscribeLoadingLog = foodStore.isLoadingLog.subscribe((loading) => {
			isLoadingLog = loading;
		});
		const unsubscribeLogError = foodStore.logError.subscribe((error) => {
			logError = error;
		});
		const unsubscribeRecentFoods = foodStore.recentFoods.subscribe((foods) => {
			recentFoods = foods;
		});
		const unsubscribeLoadingRecent = foodStore.isLoadingRecent.subscribe((loading) => {
			isLoadingRecent = loading;
		});
		const unsubscribeLoggingFood = foodStore.isLoggingFood.subscribe((logging) => {
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
	// Filtered entries based on selected meal
	let filteredTodaysLog = $derived.by(() => {
		if (selectedMeal === 'all') {
			return todayLog;
		}
		return todayLog.filter((entry) => entry.meal === selectedMeal);
	});

	// Handle date change
	$effect(() => {
		foodStore.setSelectedDate(selectedDate);
	});

	function getMealName(meal: string): string {
		const mealData = meals.find((m) => m.id === meal);
		return mealData?.name || meal;
	}

	async function handleFoodSelect(event: CustomEvent<FoodSearchResult>) {
		const food = event.detail;
		showSearchModal = false;

		try {
			// Get food details to show serving options
			const foodDetails = await foodStore.getFoodDetails(food.foodId);
			editingFoodDetails = foodDetails;
			editingEntry = null; // Not editing, adding new
			showEditModal = true;
		} catch (error) {
			console.error('Failed to get food details:', error);
		}
	}

	async function handleEditEntry(event: CustomEvent<FoodLogEntryType>) {
		const entry = event.detail;
		try {
			// Get food details for the entry
			const foodDetails = await foodStore.getFoodDetails(entry.foodId);
			editingFoodDetails = foodDetails;
			editingEntry = entry;
			showEditModal = true;
		} catch (error) {
			console.error('Failed to get food details for editing:', error);
		}
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
		// Entry is already deleted by the component, just refresh the log
		foodStore.loadTodayLog();
	}

	function handleEditModalClose() {
		showEditModal = false;
		editingEntry = null;
		editingFoodDetails = null;
	}

	function handleEditModalSave() {
		foodStore.loadTodayLog(); // Refresh the log after saving
		showEditModal = false;
		editingEntry = null;
		editingFoodDetails = null;
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

<div
	class="p-4 pb-28 sm:p-6"
	style="padding-bottom: calc(7rem + max(env(safe-area-inset-bottom), 0px));"
>
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
				class="rounded-lg border border-neutral-600 bg-neutral-700 px-3 py-2 text-neutral-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
			/>
			<span class="text-sm text-neutral-400">{formatDate(selectedDate)}</span>
		</div>

		<button
			onclick={() => (showSearchModal = true)}
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
				onclick={() => (showMealFilter = !showMealFilter)}
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
					onclick={() => {
						selectedMeal = 'all';
						showMealFilter = false;
					}}
					class="rounded-full bg-neutral-600 px-3 py-1 text-xs text-neutral-200 transition-colors hover:bg-neutral-500 {selectedMeal ===
					'all'
						? 'bg-blue-600 text-white'
						: ''}"
				>
					All Meals
				</button>
				{#each meals as meal (meal.id)}
					<button
						onclick={() => {
							selectedMeal = meal.id;
							showMealFilter = false;
						}}
						class="rounded-full bg-neutral-600 px-3 py-1 text-xs text-neutral-200 transition-colors hover:bg-neutral-500 {selectedMeal ===
						meal.id
							? 'bg-blue-600 text-white'
							: ''}"
					>
						{meal.icon}
						{meal.name}
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
			<p class="text-neutral-400">
				No entries found for {selectedMeal === 'all'
					? formatDate(selectedDate)
					: getMealName(selectedMeal)}
			</p>
			<p class="mt-1 text-sm text-neutral-500">Start logging your food to track your nutrition!</p>
			<button
				onclick={() => (showSearchModal = true)}
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
					<div
						class="rounded-lg border border-neutral-700 bg-neutral-800 p-4 transition-colors hover:border-neutral-600"
					>
						<div class="flex items-center justify-between">
							<div class="min-w-0 flex-grow">
								<h3 class="truncate font-medium text-neutral-100">{food.foodName}</h3>
								{#if food.brandName}
									<p class="truncate text-sm text-neutral-400">{food.brandName}</p>
								{/if}
								<div class="mt-1 flex items-center justify-between">
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
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-8 text-center">
				<History class="mx-auto mb-2 h-12 w-12 text-neutral-600" />
				<p class="text-sm text-neutral-400">No recent foods found</p>
				<p class="mt-1 text-xs text-neutral-500">Foods you log will appear here for quick access</p>
			</div>
		{/if}
	</section>
</div>

<!-- Search Modal -->
<FoodSearchModal
	bind:open={showSearchModal}
	title="Search Foods"
	description="Find foods to add to your log"
	on:select={handleFoodSelect}
	on:close={() => (showSearchModal = false)}
/>

<!-- Edit Modal -->
<FoodLogEditModal
	bind:open={showEditModal}
	foodDetails={editingFoodDetails}
	foodLog={editingEntry}
	on:close={handleEditModalClose}
	on:save={handleEditModalSave}
/>
