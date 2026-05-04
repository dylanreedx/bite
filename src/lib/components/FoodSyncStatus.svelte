<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import {
		Loader2,
		CheckCircle,
		AlertTriangle,
		X,
		Play,
		Pause,
		RefreshCw,
		Clock,
		Database
	} from 'lucide-svelte';
	import { foodSyncService, type SyncStatus } from '$lib/services/foodSyncService';
	import { foodStore } from '$lib/stores/food';

	// Props
	interface Props {
		position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
		autoHide?: boolean;
	}

	let { position = 'bottom-right', autoHide = true }: Props = $props();

	// Component state
	let status = $state<SyncStatus>({
		isActive: false,
		queueSize: 0,
		currentFoodId: null,
		successCount: 0,
		failureCount: 0,
		lastError: null,
		startTime: null,
		estimatedTimeRemaining: null
	});
	let isExpanded = $state(false);
	let isVisible = $state(false);
	let unsubscribe: (() => void) | null = null;

	onMount(() => {
		// Subscribe to sync status updates
		unsubscribe = foodSyncService.status.subscribe((newStatus) => {
			status = newStatus;

			// Show when there's activity or errors
			if (newStatus.isActive || newStatus.queueSize > 0 || newStatus.lastError) {
				isVisible = true;
			} else if (autoHide && !newStatus.isActive && newStatus.queueSize === 0) {
				// Auto-hide after sync completes
				setTimeout(() => {
					if (!status.isActive && status.queueSize === 0 && !status.lastError) {
						isVisible = false;
						isExpanded = false;
					}
				}, 3000);
			}
		});

		// Check initial status
		const initialStatus = foodSyncService.getQueueStatus();
		if (initialStatus.isActive || initialStatus.queueSize > 0 || initialStatus.lastError) {
			isVisible = true;
		}
	});

	onDestroy(() => {
		unsubscribe?.();
	});

	function formatTime(ms: number | null): string {
		if (!ms) return '0s';

		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}

	function getPositionClasses(pos: string): string {
		switch (pos) {
			case 'top-right':
				return 'top-4 right-4';
			case 'bottom-right':
				return 'bottom-4 right-4';
			case 'bottom-left':
				return 'bottom-4 left-4';
			case 'top-left':
				return 'top-4 left-4';
			default:
				return 'bottom-4 right-4';
		}
	}

	function getStatusColor(): string {
		if (status.lastError) {
			return 'text-red-400';
		} else if (status.isActive) {
			return 'text-blue-400';
		} else if (status.successCount > 0 && status.queueSize === 0) {
			return 'text-green-400';
		} else {
			return 'text-neutral-400';
		}
	}

	function getStatusMessage(): string {
		if (status.lastError) {
			return 'Sync error occurred';
		} else if (status.isActive) {
			if (status.currentFoodId) {
				return `Syncing food #${status.currentFoodId}`;
			}
			return 'Syncing nutrition data...';
		} else if (status.queueSize > 0) {
			return `${status.queueSize} foods queued`;
		} else if (status.successCount > 0) {
			return `Synced ${status.successCount} foods`;
		} else {
			return 'No sync activity';
		}
	}

	async function pauseSync() {
		foodSyncService.pauseProcessing();
	}

	async function resumeSync() {
		foodSyncService.resumeProcessing();
	}

	async function startMissingNutritionSync() {
		try {
			await foodStore.syncMissingNutrition(50);
		} catch (error) {
			console.error('Failed to start missing nutrition sync:', error);
		}
	}

	function clearQueue() {
		foodSyncService.clearQueue();
	}

	function hidePanel() {
		isVisible = false;
		isExpanded = false;
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}
</script>

{#if isVisible}
	<div class="fixed z-50 {getPositionClasses(position)}" transition:fade={{ duration: 200 }}>
		<!-- Compact Status -->
		<div
			class="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/95 p-3 shadow-lg backdrop-blur-sm {!isExpanded
				? 'cursor-pointer'
				: ''}"
			onclick={!isExpanded ? toggleExpanded : undefined}
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					if (!isExpanded) toggleExpanded();
				}
			}}
		>
			<div class="flex items-center gap-2">
				{#if status.lastError}
					<AlertTriangle class="h-4 w-4 {getStatusColor()}" />
				{:else if status.isActive}
					<Loader2 class="h-4 w-4 {getStatusColor()} animate-spin" />
				{:else if status.successCount > 0 && status.queueSize === 0}
					<CheckCircle class="h-4 w-4 {getStatusColor()}" />
				{:else}
					<Database class="h-4 w-4 {getStatusColor()}" />
				{/if}
				<span class="text-sm text-neutral-200">
					{getStatusMessage()}
				</span>
			</div>

			{#if !isExpanded}
				<button
					onclick={(e) => {
						e.stopPropagation();
						toggleExpanded();
					}}
					class="ml-2 rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
					aria-label="Expand sync details"
				>
					<RefreshCw class="h-3 w-3" />
				</button>
			{/if}

			{#if !isExpanded}
				<button
					onclick={(e) => {
						e.stopPropagation();
						hidePanel();
					}}
					class="ml-1 rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
					aria-label="Hide sync status"
				>
					<X class="h-3 w-3" />
				</button>
			{/if}
		</div>

		<!-- Expanded Details -->
		{#if isExpanded}
			<div
				class="mt-2 w-80 rounded-lg border border-neutral-700 bg-neutral-800/95 p-4 shadow-lg backdrop-blur-sm"
				transition:slide={{ duration: 200 }}
			>
				<!-- Header -->
				<div class="mb-3 flex items-center justify-between">
					<h3 class="font-medium text-neutral-100">Nutrition Data Sync</h3>
					<button
						onclick={hidePanel}
						class="rounded p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
						aria-label="Close sync panel"
					>
						<X class="h-4 w-4" />
					</button>
				</div>

				<!-- Status Details -->
				<div class="space-y-3">
					<!-- Current Status -->
					<div class="flex items-center justify-between text-sm">
						<span class="text-neutral-400">Status:</span>
						<span class={getStatusColor()}>
							{status.isActive ? 'Active' : status.queueSize > 0 ? 'Queued' : 'Idle'}
						</span>
					</div>

					{#if status.queueSize > 0}
						<div class="flex items-center justify-between text-sm">
							<span class="text-neutral-400">Queue:</span>
							<span class="text-neutral-200">{status.queueSize} foods</span>
						</div>
					{/if}

					{#if status.estimatedTimeRemaining}
						<div class="flex items-center justify-between text-sm">
							<span class="text-neutral-400">Est. Time:</span>
							<span class="flex items-center gap-1 text-neutral-200">
								<Clock class="h-3 w-3" />
								{formatTime(status.estimatedTimeRemaining)}
							</span>
						</div>
					{/if}

					<!-- Progress -->
					{#if status.successCount > 0 || status.failureCount > 0}
						<div class="space-y-2">
							<div class="flex items-center justify-between text-sm">
								<span class="text-neutral-400">Progress:</span>
								<span class="text-neutral-200">
									{status.successCount + status.failureCount} processed
								</span>
							</div>

							<div class="flex gap-4 text-xs">
								{#if status.successCount > 0}
									<span class="flex items-center gap-1 text-green-400">
										<CheckCircle class="h-3 w-3" />
										{status.successCount} success
									</span>
								{/if}
								{#if status.failureCount > 0}
									<span class="flex items-center gap-1 text-red-400">
										<AlertTriangle class="h-3 w-3" />
										{status.failureCount} failed
									</span>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Error Message -->
					{#if status.lastError}
						<div class="rounded border border-red-700 bg-red-900/20 p-2">
							<p class="text-xs text-red-400">{status.lastError}</p>
						</div>
					{/if}
				</div>

				<!-- Controls -->
				<div class="mt-4 flex gap-2">
					{#if status.isActive}
						<button
							onclick={pauseSync}
							class="flex items-center gap-1 rounded bg-yellow-600 px-3 py-1 text-xs text-white hover:bg-yellow-700"
						>
							<Pause class="h-3 w-3" />
							Pause
						</button>
					{:else if status.queueSize > 0}
						<button
							onclick={resumeSync}
							class="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
						>
							<Play class="h-3 w-3" />
							Resume
						</button>
					{:else}
						<button
							onclick={startMissingNutritionSync}
							class="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
						>
							<Database class="h-3 w-3" />
							Sync Missing
						</button>
					{/if}

					{#if status.queueSize > 0}
						<button
							onclick={clearQueue}
							class="flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
						>
							<X class="h-3 w-3" />
							Clear Queue
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Ensure backdrop blur works */
	.backdrop-blur-sm {
		backdrop-filter: blur(4px);
	}
</style>
