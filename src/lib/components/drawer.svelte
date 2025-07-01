<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { X } from 'lucide-svelte'; // Using Lucide X for consistency
	import { browser } from '$app/environment'; // Import browser check
	export let open: boolean = false;
	export let position: 'bottom' | 'left' | 'right' = 'bottom';
	export let nonInteractiveBackdrop: boolean = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	function closeDrawer() {
		dispatch('close');
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

	let drawerElement: HTMLElement;

	$: if (open && drawerElement) {
		if (browser) {
			const focusable = drawerElement.querySelector(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			) as HTMLElement;
			if (focusable) {
				focusable.focus();
			} else {
				drawerElement.focus();
			}
		}
	}

	$: positionClasses = {
		bottom: 'inset-x-0 bottom-0 rounded-t-2xl border-t', // Simpler border
		left: 'inset-y-0 left-0 rounded-r-2xl border-r',
		right: 'inset-y-0 right-0 rounded-l-2xl border-l'
	}[position];

	$: transformProps = {
		bottom: { y: 200, x: 0 },
		left: { x: -200, y: 0 },
		right: { x: 200, y: 0 }
	};
</script>

{#if open}
	<!-- Backdrop -->
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-30 bg-black/70"
		aria-hidden="true"
		on:click={nonInteractiveBackdrop ? undefined : closeDrawer}
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
		class="fixed {positionClasses} z-40 flex max-h-[90vh] w-full flex-col border-neutral-700 bg-neutral-800 p-5 shadow-2xl {position ===
		'bottom'
			? 'sm:mx-auto sm:max-w-md'
			: 'max-w-xs sm:max-w-sm'}"
		role="dialog"
		aria-modal="true"
		aria-labelledby="drawer-title"
		aria-describedby="drawer-description"
		tabindex="-1"
	>
		<slot name="header">
			<div class="mb-4 flex items-center justify-between">
				<h3 id="drawer-title" class="text-lg font-semibold text-neutral-100">
					<slot name="title">Drawer Title</slot>
				</h3>
				<button
					on:click={closeDrawer}
					class="-mr-1 rounded-full p-1 text-neutral-400 transition-colors hover:text-neutral-200"
					aria-label="Close Drawer"
				>
					<X class="h-5 w-5" />
				</button>
			</div>
		</slot>

		<div id="drawer-description" class="sr-only">
			<slot name="description">Drawer content description.</slot>
		</div>

		<div class="scrollbar-thin-dark -mr-1 flex-grow overflow-y-auto pr-1">
			<slot />
		</div>

		<div class="mt-auto pt-4">
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
