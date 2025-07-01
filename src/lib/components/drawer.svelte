<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { X } from 'lucide-svelte'; // Using Lucide X for consistency
	import { browser } from '$app/environment'; // Import browser check

	let {
		open = $bindable(false),
		position = 'bottom',
		nonInteractiveBackdrop = false,
		onclose
	}: {
		open?: boolean;
		position?: 'bottom' | 'left' | 'right';
		nonInteractiveBackdrop?: boolean;
		onclose?: () => void;
	} = $props();

	function closeDrawer() {
		open = false;
		onclose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			closeDrawer();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('keydown', handleKeydown);
		}
	});

	let drawerElement = $state<HTMLElement>();

	$effect(() => {
		if (open && drawerElement && browser) {
			const focusable = drawerElement.querySelector(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			) as HTMLElement;
			if (focusable) {
				focusable.focus();
			} else {
				drawerElement.focus();
			}
		}
	});

	let positionClasses = $derived(
		{
			bottom: 'inset-x-0 bottom-0 sm:rounded-t-2xl border-t', // Simpler border, no rounding on mobile
			left: 'inset-y-0 left-0 rounded-r-2xl border-r',
			right: 'inset-y-0 right-0 rounded-l-2xl border-l'
		}[position]
	);

	let transformProps = $derived({
		bottom: { y: 200, x: 0 },
		left: { x: -200, y: 0 },
		right: { x: 200, y: 0 }
	});
</script>

{#if open}
	<!-- Backdrop -->
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-30 bg-black/70"
		aria-hidden="true"
		onclick={nonInteractiveBackdrop ? undefined : closeDrawer}
	></div>

	<!-- Drawer Panel -->
	<div
		bind:this={drawerElement}
		transition:fly={{
			duration: 300,
			easing: quintOut,
			y: position === 'bottom' ? transformProps[position].y : 0,
			x: position !== 'bottom' ? transformProps[position].x : 0
		}}
		class="fixed {positionClasses} z-40 flex max-h-[90vh] w-full flex-col border-neutral-700 bg-neutral-800 p-4 shadow-2xl sm:p-5 {position ===
		'bottom'
			? 'sm:mx-auto sm:max-w-md'
			: 'max-w-xs sm:max-w-sm'}"
		style={position === 'bottom'
			? 'padding-bottom: calc(1rem + max(env(safe-area-inset-bottom), 0px));'
			: ''}
		role="dialog"
		aria-modal="true"
		aria-labelledby="drawer-title"
		aria-describedby="drawer-description"
		tabindex="-1"
	>
		<div class="mb-3 flex items-center justify-between sm:mb-4">
			<h3 id="drawer-title" class="text-base font-semibold text-neutral-100 sm:text-lg">
				<slot name="title">Drawer Title</slot>
			</h3>
			<button
				onclick={closeDrawer}
				class="-mr-1 rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-200 active:scale-95"
				aria-label="Close Drawer"
			>
				<X class="h-5 w-5" />
			</button>
		</div>

		<div id="drawer-description" class="sr-only">
			<slot name="description">Drawer content description.</slot>
		</div>

		<div class="scrollbar-thin-dark pb-safe -mr-1 flex-grow overflow-y-auto pr-1">
			<slot />
		</div>

		<div class="mt-auto pt-3 sm:pt-4">
			<slot name="footer" />
		</div>
	</div>
{/if}

<style>
	/* Standard Tailwind scrollbar utilities are preferred if available,
     otherwise, these custom styles can be used.
     The theme() function might not work here without specific setup in v4.
     Using direct hex or rgb values for scrollbar if theme() fails.
  */
	.scrollbar-thin-dark::-webkit-scrollbar {
		width: 6px;
	}
	.scrollbar-thin-dark::-webkit-scrollbar-track {
		background: transparent;
	}
	.scrollbar-thin-dark::-webkit-scrollbar-thumb {
		background-color: #4b5563; /* neutral-600 */
		border-radius: 3px;
	}
	.scrollbar-thin-dark::-webkit-scrollbar-thumb:hover {
		background-color: #6b7280; /* neutral-500 */
	}
	.scrollbar-thin-dark {
		scrollbar-width: thin;
		scrollbar-color: #4b5563 transparent; /* neutral-600 and transparent */
	}
</style>
