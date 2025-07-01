<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { X } from 'lucide-svelte';
	import FoodSearch from './FoodSearch.svelte';
	import type { FoodSearchResult } from '$lib/types/food';

	// Props
	interface Props {
		open?: boolean;
		title?: string;
		description?: string;
	}

	let {
		open = $bindable(false),
		title = 'Search Foods',
		description = 'Find foods to add to your log'
	}: Props = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		select: FoodSearchResult;
		close: void;
	}>();

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

	function handleFoodSelect(event: CustomEvent<FoodSearchResult>) {
		dispatch('select', event.detail);
		close();
	}

	function close() {
		open = false;
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			close();
		}
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/60"
		transition:fade={{ duration: 200 }}
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	>
		<!-- Modal Container - Mobile optimized -->
		<div class="flex min-h-screen items-center justify-center p-2 sm:p-4">
			<!-- Modal Content -->
			<div
				bind:this={modalElement}
				class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-800 shadow-2xl"
				transition:fly={{ duration: 300, y: 50, opacity: 0, easing: quintOut }}
				onclick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
				aria-describedby="modal-description"
				tabindex="-1"
			>
				<!-- Header -->
				<div class="flex-shrink-0 border-b border-neutral-700 p-3 sm:p-4">
					<div class="flex items-center justify-between">
						<div>
							<h2 id="modal-title" class="text-lg font-semibold text-neutral-100">
								{title}
							</h2>
							<p id="modal-description" class="mt-1 text-sm text-neutral-400">
								{description}
							</p>
						</div>
						<button
							onclick={close}
							class="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-200"
							aria-label="Close modal"
						>
							<X class="h-5 w-5" />
						</button>
					</div>
				</div>

				<!-- Search Content -->
				<div class="flex-1 overflow-hidden p-3 sm:p-4" style="min-height: 0;">
					<div class="h-full min-h-0">
						<FoodSearch
							placeholder="Search for foods to add..."
							showRecentFoods={true}
							maxResults={15}
							autoFocus={true}
							on:select={handleFoodSelect}
							on:close={close}
						/>
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

		/* Ensure modal content is properly sized on mobile */
		.max-h-\[90vh\] {
			max-height: 90vh !important;
		}
	}
</style>
