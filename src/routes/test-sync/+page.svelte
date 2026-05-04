<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		Database,
		Play,
		Pause,
		RefreshCw,
		Search,
		CheckCircle,
		AlertTriangle
	} from 'lucide-svelte';
	import { foodStore } from '$lib/stores/food';
	import { foodSyncService } from '$lib/services/foodSyncService';
	import { syncPatterns, getSyncStats, formatTimeRemaining } from '$lib/utils/nutritionSync';
	import FoodSyncStatus from '$lib/components/FoodSyncStatus.svelte';

	// Component state
	let missingNutritionData = $state<Record<string, unknown>[]>([]);
	let coverageStats = $state<Record<string, unknown> | null>(null);
	let isLoadingMissing = $state(false);
	let syncStatus = $state(getSyncStats());
	let testFoodId = $state('');
	let searchQuery = $state('ground beef');
	let searchResults = $state<Record<string, unknown>[]>([]);

	// Subscribe to sync status updates
	let unsubscribe: (() => void) | null = null;
	onMount(() => {
		loadMissingNutritionData();

		unsubscribe = foodSyncService.status.subscribe((status) => {
			syncStatus = status;
		});

		return () => {
			unsubscribe?.();
		};
	});

	async function loadMissingNutritionData() {
		isLoadingMissing = true;
		try {
			const response = await fetch('/api/foods/missing-nutrition?limit=20&type=both');
			const data = await response.json();

			if (data.success) {
				missingNutritionData = data.foods || [];
				coverageStats = data.coverage;
			}
		} catch (error) {
			console.error('Failed to load missing nutrition data:', error);
		} finally {
			isLoadingMissing = false;
		}
	}

	async function startBulkSync() {
		try {
			await syncPatterns.bulkSync(50);
			await loadMissingNutritionData(); // Refresh the list
		} catch (error) {
			console.error('Failed to start bulk sync:', error);
		}
	}

	async function syncSpecificFood() {
		const foodId = parseInt(testFoodId);
		if (!isNaN(foodId)) {
			try {
				await foodStore.queueFoodForSync(foodId, 'high');
			} catch (error) {
				console.error('Failed to sync specific food:', error);
			}
		}
	}

	async function searchAndSync() {
		if (!searchQuery.trim()) return;

		try {
			await foodStore.searchFoods(searchQuery, 10);
			// Get current search results from the store
			const storeResults = get(foodStore.searchResults) || [];
			searchResults = storeResults;

			// Auto-sync any results that need nutrition data
			await syncPatterns.onSearchResults(storeResults);
		} catch (error) {
			console.error('Failed to search and sync:', error);
		}
	}

	async function pauseSync() {
		foodSyncService.pauseProcessing();
	}

	async function resumeSync() {
		foodSyncService.resumeProcessing();
	}

	async function clearQueue() {
		foodSyncService.clearQueue();
		await loadMissingNutritionData();
	}

	function formatPercentage(value: number): string {
		return `${value.toFixed(1)}%`;
	}
</script>

<svelte:head>
	<title>Nutrition Sync Test - Bite</title>
</svelte:head>

<div class="min-h-screen bg-neutral-900 p-6">
	<div class="mx-auto max-w-6xl space-y-8">
		<!-- Header -->
		<div class="text-center">
			<h1 class="text-3xl font-bold text-neutral-100">Nutrition Data Sync Test</h1>
			<p class="mt-2 text-neutral-400">Test and monitor the async nutrition data syncing system</p>
		</div>

		<!-- Coverage Statistics -->
		{#if coverageStats}
			<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
				<h2 class="mb-4 text-xl font-semibold text-neutral-100">Database Coverage</h2>
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-400">
							{coverageStats?.totalFoods?.toLocaleString() || '0'}
						</div>
						<div class="text-sm text-neutral-400">Total Foods</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-green-400">
							{formatPercentage(coverageStats?.servingsCoverage || 0)}
						</div>
						<div class="text-sm text-neutral-400">Have Servings</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-purple-400">
							{formatPercentage(coverageStats?.nutritionCoverage || 0)}
						</div>
						<div class="text-sm text-neutral-400">Have Nutrition</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-red-400">
							{coverageStats?.missingServings?.toLocaleString() || '0'}
						</div>
						<div class="text-sm text-neutral-400">Missing Data</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Current Sync Status -->
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
			<h2 class="mb-4 text-xl font-semibold text-neutral-100">Sync Status</h2>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<div class="text-center">
					<div
						class="text-lg font-semibold {syncStatus.isActive
							? 'text-green-400'
							: 'text-neutral-400'}"
					>
						{syncStatus.isActive ? 'Active' : 'Idle'}
					</div>
					<div class="text-sm text-neutral-400">Status</div>
				</div>
				<div class="text-center">
					<div class="text-lg font-semibold text-blue-400">{syncStatus.queueSize}</div>
					<div class="text-sm text-neutral-400">Queue Size</div>
				</div>
				<div class="text-center">
					<div class="text-lg font-semibold text-green-400">{syncStatus.successCount}</div>
					<div class="text-sm text-neutral-400">Synced</div>
				</div>
				<div class="text-center">
					<div class="text-lg font-semibold text-red-400">{syncStatus.failureCount}</div>
					<div class="text-sm text-neutral-400">Failed</div>
				</div>
			</div>

			{#if syncStatus.estimatedTimeRemaining}
				<div class="mt-4 text-center">
					<div class="text-sm text-neutral-400">Estimated time remaining:</div>
					<div class="text-lg font-semibold text-purple-400">
						{formatTimeRemaining(syncStatus.estimatedTimeRemaining)}
					</div>
				</div>
			{/if}

			{#if syncStatus.lastError}
				<div class="mt-4 rounded border border-red-700 bg-red-900/20 p-3">
					<div class="flex items-center gap-2 text-red-400">
						<AlertTriangle class="h-4 w-4" />
						<span class="text-sm">{syncStatus.lastError}</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Control Panel -->
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
			<h2 class="mb-4 text-xl font-semibold text-neutral-100">Controls</h2>
			<div class="space-y-4">
				<!-- Bulk Operations -->
				<div class="flex flex-wrap gap-3">
					<button
						onclick={startBulkSync}
						disabled={isLoadingMissing}
						class="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
					>
						<Database class="h-4 w-4" />
						Start Bulk Sync (50 foods)
					</button>

					{#if syncStatus.isActive}
						<button
							onclick={pauseSync}
							class="flex items-center gap-2 rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
						>
							<Pause class="h-4 w-4" />
							Pause Sync
						</button>
					{:else if syncStatus.queueSize > 0}
						<button
							onclick={resumeSync}
							class="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						>
							<Play class="h-4 w-4" />
							Resume Sync
						</button>
					{/if}

					{#if syncStatus.queueSize > 0}
						<button
							onclick={clearQueue}
							class="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
						>
							<RefreshCw class="h-4 w-4" />
							Clear Queue
						</button>
					{/if}

					<button
						onclick={loadMissingNutritionData}
						disabled={isLoadingMissing}
						class="flex items-center gap-2 rounded bg-neutral-600 px-4 py-2 text-white hover:bg-neutral-700 disabled:opacity-50"
					>
						<RefreshCw class="h-4 w-4" />
						Refresh Data
					</button>
				</div>

				<!-- Individual Food Sync -->
				<div class="flex gap-3">
					<input
						bind:value={testFoodId}
						placeholder="Food ID (e.g., 123456)"
						class="rounded border border-neutral-600 bg-neutral-700 px-3 py-2 text-neutral-100 focus:border-blue-500 focus:outline-none"
					/>
					<button
						onclick={syncSpecificFood}
						disabled={!testFoodId.trim()}
						class="flex items-center gap-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
					>
						<RefreshCw class="h-4 w-4" />
						Sync This Food
					</button>
				</div>

				<!-- Search and Sync -->
				<div class="flex gap-3">
					<input
						bind:value={searchQuery}
						placeholder="Search foods (e.g., ground beef)"
						class="flex-1 rounded border border-neutral-600 bg-neutral-700 px-3 py-2 text-neutral-100 focus:border-blue-500 focus:outline-none"
					/>
					<button
						onclick={searchAndSync}
						disabled={!searchQuery.trim()}
						class="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
					>
						<Search class="h-4 w-4" />
						Search & Auto-Sync
					</button>
				</div>
			</div>
		</div>

		<!-- Foods Missing Nutrition Data -->
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
			<h2 class="mb-4 text-xl font-semibold text-neutral-100">Foods Missing Nutrition Data</h2>
			{#if isLoadingMissing}
				<div class="flex items-center justify-center py-8">
					<RefreshCw class="h-6 w-6 animate-spin text-neutral-400" />
					<span class="ml-2 text-neutral-400">Loading...</span>
				</div>
			{:else if missingNutritionData.length === 0}
				<div class="flex items-center justify-center py-8">
					<CheckCircle class="h-6 w-6 text-green-400" />
					<span class="ml-2 text-green-400">All foods have nutrition data!</span>
				</div>
			{:else}
				<div class="space-y-2">
					{#each missingNutritionData as food (food.foodId)}
						<div
							class="flex items-center justify-between rounded border border-neutral-600 bg-neutral-700 p-3"
						>
							<div>
								<div class="font-medium text-neutral-100">{food?.foodName}</div>
								<div class="text-sm text-neutral-400">
									ID: {food?.foodId}
									{#if food?.brandName}
										• {food.brandName}{/if}
									• {food?.servingCount} servings
									{#if food?.hasNutrition > 0}
										• {food.hasNutrition} with nutrition{/if}
								</div>
							</div>
							<button
								onclick={() => foodStore.queueFoodForSync(food?.foodId, 'high')}
								class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
							>
								Sync Now
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Search Results (if any) -->
		{#if searchResults.length > 0}
			<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-6">
				<h2 class="mb-4 text-xl font-semibold text-neutral-100">Search Results</h2>
				<div class="space-y-2">
					{#each searchResults as food (food.foodId)}
						<div
							class="flex items-center justify-between rounded border border-neutral-600 bg-neutral-700 p-3"
						>
							<div>
								<div class="font-medium text-neutral-100">{food?.foodName}</div>
								<div class="text-sm text-neutral-400">
									ID: {food?.foodId}
									{#if food?.brandName}
										• {food.brandName}{/if}
									{#if food?.calories}
										• {food.calories} cal{/if}
								</div>
							</div>
							<div class="flex gap-2">
								{#if !food?.calories || food?.calories === 0}
									<span class="rounded bg-red-600/20 px-2 py-1 text-xs text-red-400">
										Needs Sync
									</span>
								{:else}
									<span class="rounded bg-green-600/20 px-2 py-1 text-xs text-green-400">
										Has Nutrition
									</span>
								{/if}
								<button
									onclick={() => foodStore.queueFoodForSync(food?.foodId, 'medium')}
									class="rounded bg-purple-600 px-3 py-1 text-sm text-white hover:bg-purple-700"
								>
									Queue Sync
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Floating Sync Status -->
	<FoodSyncStatus position="bottom-right" autoHide={false} />
</div>
