<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { FoodDetails, FoodLogEntry, Serving } from '$lib/types/food';
	import { foodStore } from '$lib/stores/food';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Loader2, Calculator, X } from 'lucide-svelte';

	export let open: boolean = false;
	export let foodLog: FoodLogEntry | null = null;
	export let foodDetails: FoodDetails | null = null;

	const dispatch = createEventDispatcher();

	let selectedServingId: number | null = null;
	let quantity: number = 1;
	let meal: string = 'breakfast';
	let date: string = new Date().toISOString().split('T')[0];
	let isLoading = false;
	let error: string | null = null;
	let isEditing = false;
	let modalElement: HTMLDivElement;
	let isMobile = false;

	onMount(() => {
		// Detect if mobile device
		isMobile =
			window.innerWidth < 768 ||
			/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

		// Handle viewport changes for mobile keyboard
		const handleViewportChange = () => {
			if (open && modalElement && isMobile) {
				// Scroll modal into view when keyboard appears
				setTimeout(() => {
					modalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}, 100);
			}
		};

		window.addEventListener('resize', handleViewportChange);
		return () => window.removeEventListener('resize', handleViewportChange);
	});

	// Computed nutrition values based on selected serving and quantity
	$: selectedServing = foodDetails?.servings.find((s) => s.servingId === selectedServingId);
	$: calculatedNutrition =
		selectedServing && quantity > 0
			? {
					calories: (selectedServing.calories || 0) * quantity,
					protein: (selectedServing.protein || 0) * quantity,
					carbohydrate: (selectedServing.carbohydrate || 0) * quantity,
					fat: (selectedServing.fat || 0) * quantity,
					fiber: (selectedServing.fiber || 0) * quantity,
					sugar: (selectedServing.sugar || 0) * quantity,
					sodium: (selectedServing.sodium || 0) * quantity
				}
			: null;

	$: if (open) {
		if (foodLog) {
			// Editing existing entry
			isEditing = true;
			selectedServingId = foodLog.servingId;
			quantity = foodLog.quantity;
			meal = foodLog.meal || 'breakfast';
			date = foodLog.date;
			if (!foodDetails) {
				foodStore.getFoodDetails(foodLog.foodId).then((details) => {
					foodDetails = details;
				});
			}
		} else if (foodDetails) {
			// Adding new entry
			isEditing = false;
			const defaultServing =
				foodDetails.servings.find((s) => s.isDefault) || foodDetails.servings[0];
			selectedServingId = defaultServing?.servingId || null;
			quantity = 1;
			meal = 'breakfast';
			date = new Date().toISOString().split('T')[0];
		}
	}

	async function handleSubmit() {
		if (!foodDetails || !selectedServingId) return;

		isLoading = true;
		error = null;

		try {
			let result;
			if (isEditing && foodLog) {
				// Update existing entry
				result = await foodStore.updateLogEntry(
					foodLog.id,
					selectedServingId,
					quantity,
					meal,
					date
				);
			} else {
				// Create new entry
				result = await foodStore.logFood(
					foodDetails.foodId,
					selectedServingId,
					quantity,
					meal,
					date
				);
			}
			dispatch('save', result);
			close();
		} catch (e: any) {
			error = e.message || 'Failed to save entry.';
		} finally {
			isLoading = false;
		}
	}

	function close() {
		open = false;
		foodLog = null;
		foodDetails = null;
		isEditing = false;
		error = null;
		dispatch('close');
	}

	function formatNutrition(value: number): string {
		return Math.round(value).toString();
	}
</script>

{#if open && foodDetails}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/60"
		transition:fade={{ duration: 200 }}
		on:click={close}
		role="button"
		tabindex="-1"
	>
		<!-- Modal Container - Mobile optimized -->
		<div class="flex min-h-screen items-start justify-center p-0 sm:items-center sm:p-4">
			<!-- Modal Content -->
			<div
				bind:this={modalElement}
				class="max-h-screen w-full overflow-y-auto bg-neutral-800 shadow-2xl sm:max-h-[95vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-neutral-700"
				transition:fly={{ duration: 300, y: isMobile ? '100vh' : 20, opacity: 0, easing: quintOut }}
				on:click|stopPropagation
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-neutral-700 p-4 sm:p-6">
					<h2 id="modal-title" class="text-lg font-bold text-white sm:text-xl">
						{isEditing ? 'Edit' : 'Add'} Food Entry
					</h2>
					<button
						on:click={close}
						class="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-200"
						aria-label="Close modal"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<!-- Content -->
				<div class="p-4 sm:p-6">
					<div class="space-y-4">
						<div>
							<label for="foodName" class="mb-1 block text-sm font-medium text-neutral-400"
								>Food</label
							>
							<input
								type="text"
								id="foodName"
								value={foodDetails.foodName}
								readonly
								class="w-full rounded-lg border-neutral-600 bg-neutral-700 p-2.5 text-white"
							/>
						</div>

						<div>
							<label for="serving" class="mb-1 block text-sm font-medium text-neutral-400"
								>Serving</label
							>
							<select
								id="serving"
								bind:value={selectedServingId}
								class="w-full rounded-lg border-neutral-600 bg-neutral-700 p-2.5 text-white focus:border-blue-500 focus:ring-blue-500"
							>
								{#each foodDetails.servings as serving}
									<option value={serving.servingId}>{serving.servingDescription}</option>
								{/each}
							</select>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label for="quantity" class="mb-1 block text-sm font-medium text-neutral-400"
									>Quantity</label
								>
								<input
									type="number"
									id="quantity"
									bind:value={quantity}
									min="0.1"
									step="0.1"
									class="w-full rounded-lg border-neutral-600 bg-neutral-700 p-2.5 text-white"
								/>
							</div>

							<!-- Live nutrition preview -->
							{#if calculatedNutrition}
								<div class="flex flex-col justify-end">
									<div class="bg-neutral-750 rounded-lg border border-neutral-600 p-2.5">
										<div class="mb-1 flex items-center gap-1">
											<Calculator class="h-3 w-3 text-blue-400" />
											<span class="text-xs font-medium text-neutral-300">Nutrition</span>
										</div>
										<div class="grid grid-cols-2 gap-1 text-xs">
											<span class="text-orange-400"
												>{formatNutrition(calculatedNutrition.calories)} cal</span
											>
											<span class="text-sky-400"
												>{formatNutrition(calculatedNutrition.protein)}g P</span
											>
											<span class="text-purple-400"
												>{formatNutrition(calculatedNutrition.carbohydrate)}g C</span
											>
											<span class="text-green-400"
												>{formatNutrition(calculatedNutrition.fat)}g F</span
											>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- Detailed nutrition info -->
						{#if calculatedNutrition}
							<div class="bg-neutral-750 rounded-lg border border-neutral-600 p-4">
								<h3 class="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-200">
									<Calculator class="h-4 w-4 text-blue-400" />
									Nutrition Facts ({quantity} serving{quantity !== 1 ? 's' : ''})
								</h3>
								<div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
									<div class="flex justify-between">
										<span class="text-neutral-400">Calories:</span>
										<span class="font-medium text-orange-400"
											>{formatNutrition(calculatedNutrition.calories)}</span
										>
									</div>
									<div class="flex justify-between">
										<span class="text-neutral-400">Protein:</span>
										<span class="font-medium text-sky-400"
											>{formatNutrition(calculatedNutrition.protein)}g</span
										>
									</div>
									<div class="flex justify-between">
										<span class="text-neutral-400">Carbs:</span>
										<span class="font-medium text-purple-400"
											>{formatNutrition(calculatedNutrition.carbohydrate)}g</span
										>
									</div>
									<div class="flex justify-between">
										<span class="text-neutral-400">Fat:</span>
										<span class="font-medium text-green-400"
											>{formatNutrition(calculatedNutrition.fat)}g</span
										>
									</div>
									{#if calculatedNutrition.fiber > 0}
										<div class="flex justify-between">
											<span class="text-neutral-400">Fiber:</span>
											<span class="font-medium text-emerald-400"
												>{formatNutrition(calculatedNutrition.fiber)}g</span
											>
										</div>
									{/if}
									{#if calculatedNutrition.sugar > 0}
										<div class="flex justify-between">
											<span class="text-neutral-400">Sugar:</span>
											<span class="font-medium text-pink-400"
												>{formatNutrition(calculatedNutrition.sugar)}g</span
											>
										</div>
									{/if}
									{#if calculatedNutrition.sodium > 0}
										<div class="flex justify-between">
											<span class="text-neutral-400">Sodium:</span>
											<span class="font-medium text-amber-400"
												>{formatNutrition(calculatedNutrition.sodium)}mg</span
											>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label for="meal" class="mb-1 block text-sm font-medium text-neutral-400"
									>Meal</label
								>
								<select
									id="meal"
									bind:value={meal}
									class="w-full rounded-lg border-neutral-600 bg-neutral-700 p-2.5 text-white focus:border-blue-500 focus:ring-blue-500"
								>
									<option value="breakfast">Breakfast</option>
									<option value="lunch">Lunch</option>
									<option value="dinner">Dinner</option>
									<option value="snacks">Snacks</option>
								</select>
							</div>

							<div>
								<label for="date" class="mb-1 block text-sm font-medium text-neutral-400"
									>Date</label
								>
								<input
									type="date"
									id="date"
									bind:value={date}
									class="w-full rounded-lg border-neutral-600 bg-neutral-700 p-2.5 text-white"
								/>
							</div>
						</div>
					</div>

					{#if error}
						<p class="mt-4 text-sm text-red-400">{error}</p>
					{/if}

					<!-- Actions -->
					<div class="border-t border-neutral-700 p-4 sm:p-6">
						<div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
							<button
								on:click={close}
								class="order-2 rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700 sm:order-1"
							>
								Cancel
							</button>
							<button
								on:click={handleSubmit}
								disabled={isLoading}
								class="order-1 flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:order-2"
							>
								{#if isLoading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								{isEditing ? 'Save Changes' : 'Add to Log'}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body:has(.fixed.inset-0.z-50)) {
		overflow: hidden;
	}

	/* Mobile specific adjustments */
	@media (max-width: 767px) {
		:global(.fixed.inset-0.z-50) {
			/* Ensure modal covers viewport properly on mobile */
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			right: 0 !important;
			bottom: 0 !important;
		}
	}
</style>
