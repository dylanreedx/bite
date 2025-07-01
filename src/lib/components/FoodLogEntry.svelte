<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { MoreVertical, Edit3, Trash2, Copy, Clock } from 'lucide-svelte';
	import { foodStore } from '$lib/stores/food.ts';
	import type { FoodLogEntry } from '$lib/types/food.ts';

	// Props
	interface Props {
		entry: FoodLogEntry;
		showMeal?: boolean;
		showTime?: boolean;
		showActions?: boolean;
	}

	let {
		entry,
		showMeal = true,
		showTime = true,
		showActions = true
	}: Props = $props();

	// Component state
	let showDropdown = $state(false);
	let isDeleting = $state(false);

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		edit: FoodLogEntry;
		duplicate: FoodLogEntry;
		delete: number;
	}>();

	// Store state
	let isDeletingFromStore = $state(false);

	// Subscribe to stores
	$effect(() => {
		const unsubscribe = foodStore.isDeletingLog.subscribe(deleting => {
			isDeletingFromStore = deleting;
		});

		return () => {
			unsubscribe();
		};
	});

	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function formatNutrition(value: number | null | undefined): string {
		return value ? Math.round(value).toString() : '0';
	}

	function getMealEmoji(meal?: string | null): string {
		if (!meal) return '🍽️';
		
		switch (meal.toLowerCase()) {
			case 'breakfast':
				return '🌅';
			case 'lunch':
				return '☀️';
			case 'dinner':
				return '🌙';
			case 'snacks':
			case 'snack':
				return '🍿';
			default:
				return '🍽️';
		}
	}

	function getMealName(meal?: string | null): string {
		if (!meal) return 'Meal';
		return meal.charAt(0).toUpperCase() + meal.slice(1);
	}

	async function handleDelete() {
		if (isDeleting || isDeletingFromStore) return;
		
		isDeleting = true;
		showDropdown = false;

		try {
			await foodStore.deleteLogEntry(entry.id);
			dispatch('delete', entry.id);
		} catch (error) {
			console.error('Failed to delete entry:', error);
			// Could show a toast notification here
		} finally {
			isDeleting = false;
		}
	}

	function handleEdit() {
		showDropdown = false;
		dispatch('edit', entry);
	}

	function handleDuplicate() {
		showDropdown = false;
		dispatch('duplicate', entry);
	}

	function handleDropdownClick(event: Event) {
		event.stopPropagation();
		showDropdown = !showDropdown;
	}

	function handleClickOutside() {
		showDropdown = false;
	}

	// Close dropdown when clicking outside
	$effect(() => {
		if (showDropdown) {
			const handleClick = () => {
				showDropdown = false;
			};
			document.addEventListener('click', handleClick);
			return () => document.removeEventListener('click', handleClick);
		}
	});
</script>

<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-4 transition-colors hover:border-neutral-600">
	<div class="flex items-start justify-between">
		<div class="flex-grow min-w-0">
			<div class="flex items-center gap-2 mb-1">
				{#if showMeal && entry.meal}
					<span class="text-lg" title={getMealName(entry.meal)}>
						{getMealEmoji(entry.meal)}
					</span>
				{/if}
				<div class="min-w-0 flex-grow">
					<h3 class="font-medium text-neutral-100 truncate">{entry.food.foodName}</h3>
					<div class="flex items-center gap-2 text-sm text-neutral-400">
						{#if entry.food.brandName}
							<span class="truncate">{entry.food.brandName}</span>
							<span>•</span>
						{/if}
						<span>{entry.serving.servingDescription}</span>
						{#if entry.quantity !== 1}
							<span>• {entry.quantity}x</span>
						{/if}
					</div>
				</div>
			</div>
			
			<div class="flex items-center gap-4 text-sm mt-3">
				{#if showTime}
					<div class="flex items-center gap-1 text-neutral-500">
						<Clock class="h-3 w-3" />
						<span>{formatTime(entry.loggedAt)}</span>
					</div>
				{/if}
				<div class="flex items-center gap-4">
					{#if entry.nutrition.calories || entry.nutrition.protein || entry.nutrition.carbohydrate || entry.nutrition.fat}
						{#if entry.nutrition.calories}
							<span class="text-orange-400">{formatNutrition(entry.nutrition.calories)} cal</span>
						{/if}
						{#if entry.nutrition.protein}
							<span class="text-sky-400">{formatNutrition(entry.nutrition.protein)}g P</span>
						{/if}
						{#if entry.nutrition.carbohydrate}
							<span class="text-purple-400">{formatNutrition(entry.nutrition.carbohydrate)}g C</span>
						{/if}
						{#if entry.nutrition.fat}
							<span class="text-green-400">{formatNutrition(entry.nutrition.fat)}g F</span>
						{/if}
					{:else}
						<span class="text-neutral-500 italic text-xs">Nutrition data being processed...</span>
					{/if}
				</div>
			</div>
		</div>

		{#if showActions}
			<div class="relative ml-4">
				<button 
					class="rounded-full p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 transition-colors disabled:opacity-50"
					onclick={handleDropdownClick}
					disabled={isDeleting || isDeletingFromStore}
				>
					{#if isDeleting || isDeletingFromStore}
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent"></div>
					{:else}
						<MoreVertical class="h-4 w-4" />
					{/if}
				</button>

				{#if showDropdown}
					<div class="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border border-neutral-600 bg-neutral-700 py-1 shadow-xl">
						<button
							class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-600 transition-colors"
							onclick={handleEdit}
						>
							<Edit3 class="h-4 w-4" />
							Edit Entry
						</button>
						<button
							class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-600 transition-colors"
							onclick={handleDuplicate}
						>
							<Copy class="h-4 w-4" />
							Duplicate
						</button>
						<div class="my-1 border-t border-neutral-600"></div>
						<button
							class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-neutral-600 hover:text-red-300 transition-colors"
							onclick={handleDelete}
						>
							<Trash2 class="h-4 w-4" />
							Delete
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>