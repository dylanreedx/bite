<script lang="ts">
	import '../app.css';
	import {
		LayoutDashboard,
		LineChart,
		Plus,
		LogOut,
		User,
		Loader2
	} from 'lucide-svelte';
	import Drawer from '$lib/components/drawer.svelte';
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.ts';
	import { foodStore } from '$lib/stores/food.ts';
	import { onMount } from 'svelte';

	let { children, data } = $props();
	let quickAddDrawerOpen = $state(false);
	let isInitializing = $state(true);

	// Check if we're on an auth page (login/register)
	let isAuthPage = $derived($page.url.pathname === '/login' || $page.url.pathname === '/register');

	// Update auth store when server data changes
	$effect(() => {
		if (data?.user) {
			authStore.setUser(data.user);
			isInitializing = false;
		} else if (data !== undefined) {
			authStore.setUser(null);
			isInitializing = false;
		}
	});

	// Store state
	let authState = $state({ user: null, isLoading: false, isAuthenticated: false });
	let recentFoods = $state([]);
	let isLoadingRecent = $state(false);
	let isLoggingFood = $state(false);

	// Subscribe to stores
	$effect(() => {
		const unsubscribeAuth = authStore.subscribe(state => {
			authState = state;
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
			unsubscribeAuth();
			unsubscribeRecentFoods();
			unsubscribeLoadingRecent();
			unsubscribeLoggingFood();
		};
	});

	// Use both server data and client store for reliable auth state
	let isAuthenticated = $derived(data?.user || authState.isAuthenticated);
	let currentUser = $derived(data?.user || authState.user);
	let isLoading = $derived(authState.isLoading);

	onMount(() => {
		// Mark as initialized after mount
		setTimeout(() => {
			isInitializing = false;
		}, 100);
	});

	async function handleLogout() {
		try {
			authStore.setLoading(true);
			
			const response = await fetch('/api/auth/logout', {
				method: 'POST'
			});

			if (response.ok) {
				authStore.logout();
				await invalidateAll();
				goto('/login');
			}
		} catch (error) {
			console.error('Logout error:', error);
			// Force redirect even if API fails
			authStore.logout();
			goto('/login');
		} finally {
			authStore.setLoading(false);
		}
	}

	// Determine active nav from current route
	let activeNav = $derived(
		$page.url.pathname === '/'
			? 'dashboard'
			: $page.url.pathname.includes('/insights')
				? 'insights'
				: $page.url.pathname.includes('/food-log')
					? 'food-log'
					: 'dashboard'
	);

	// Load recent foods when authenticated
	$effect(() => {
		if (isAuthenticated && !isInitializing) {
			foodStore.loadRecentFoods('recent', 10);
		}
	});

	async function handleQuickAdd(food: typeof recentFoods[0]) {
		try {
			await foodStore.quickAddFood(food, 1);
			quickAddDrawerOpen = false;
			// Optionally show success message
		} catch (error) {
			console.error('Failed to quick add food:', error);
			// Optionally show error message
		}
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
</script>

<div class="relative min-h-screen bg-neutral-900 text-neutral-200">
	{@render children()}

	<!-- Only show navigation and quick add for authenticated users -->
	{#if !isAuthPage && isAuthenticated && !isInitializing}
		<!-- User Menu (Top Right) -->
		<div class="fixed top-4 right-4 z-40">
			<div class="flex items-center gap-3">
				<span class="text-sm text-neutral-300 hidden sm:block">
					Welcome, {currentUser?.name || currentUser?.email}
				</span>
				<button
					onclick={handleLogout}
					disabled={isLoading}
					class="flex items-center gap-2 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors disabled:opacity-50"
					title="Sign Out"
				>
					<User class="h-4 w-4" />
					{#if isLoading}
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent"></div>
					{:else}
						<LogOut class="h-4 w-4" />
					{/if}
				</button>
			</div>
		</div>

		<!-- Bottom Navigation -->
		<footer
			class="fixed right-0 bottom-0 left-0 z-10 border-t border-neutral-700 bg-neutral-800 shadow-lg"
		>
			<nav class="mx-auto flex h-16 max-w-md items-center justify-around">
				<button
					onclick={() => goto('/')}
					class="flex h-full flex-col items-center justify-center px-3 transition-colors focus:outline-none {activeNav ===
					'dashboard'
						? 'text-blue-500'
						: 'text-neutral-400 hover:text-neutral-100'}"
				>
					<LayoutDashboard class="mb-0.5 h-6 w-6" />
					<span class="text-xs font-medium">Dashboard</span>
				</button>
				<button
					onclick={() => goto('/food-log')}
					aria-label="Log Food"
					class="relative -top-1 flex h-full flex-col items-center justify-center px-3 text-neutral-400 transition-colors hover:text-neutral-100 focus:outline-none"
				>
					<div class="rounded-full bg-blue-600 p-3 shadow-lg">
						<Plus class="h-6 w-6 text-white" />
					</div>
				</button>
				<button
					onclick={() => goto('/insights')}
					class="flex h-full flex-col items-center justify-center px-3 transition-colors focus:outline-none {activeNav ===
					'insights'
						? 'text-blue-500'
						: 'text-neutral-400 hover:text-neutral-100'}"
				>
					<LineChart class="mb-0.5 h-6 w-6" />
					<span class="text-xs font-medium">Insights</span>
				</button>
			</nav>
		</footer>

		<!-- Quick Add FAB (Drawer Trigger) -->
		<button
			onclick={() => (quickAddDrawerOpen = true)}
			class="focus:ring-opacity-50 fixed right-6 bottom-24 z-30 h-14 w-14 rounded-full bg-blue-600 p-0 text-white shadow-2xl transition-all duration-300 ease-out hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:outline-none sm:right-8 sm:bottom-24 sm:h-16 sm:w-16"
			aria-label="Quick Add Food"
		>
			<Plus class="mx-auto h-6 w-6 sm:h-7 sm:w-7" />
		</button>

		<!-- Custom Drawer for Quick Add -->
		<Drawer
			bind:open={quickAddDrawerOpen}
			position="bottom"
			on:close={() => (quickAddDrawerOpen = false)}
		>
			<svelte:fragment slot="title">Quick Add Food</svelte:fragment>
			<svelte:fragment slot="description">
				Select from your frequent items or log something new.
			</svelte:fragment>

			<div class="max-h-64 space-y-3 overflow-y-auto pr-2">
				{#if isLoadingRecent}
					<div class="flex items-center justify-center p-4">
						<Loader2 class="h-5 w-5 animate-spin text-blue-400" />
						<span class="ml-2 text-sm text-neutral-300">Loading recent foods...</span>
					</div>
				{:else if recentFoods.length > 0}
					{#each recentFoods as food (food.foodId)}
						<button
							onclick={() => handleQuickAdd(food)}
							disabled={isLoggingFood}
							class="flex w-full items-center gap-3 rounded-lg bg-neutral-700 p-3 text-left transition-colors hover:bg-neutral-600 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
						>
							<div class="flex-shrink-0 rounded-md bg-neutral-600 p-2">
								<Plus class="h-5 w-5 text-blue-400" />
							</div>
							<div class="min-w-0 flex-grow">
								<div class="flex items-center justify-between">
									<p class="truncate text-sm font-medium text-neutral-100">{food.foodName}</p>
									{#if food.calories}
										<p class="ml-2 text-xs text-orange-400">{Math.round(food.calories)} cal</p>
									{/if}
								</div>
								<div class="flex items-center justify-between">
									{#if food.brandName}
										<p class="text-xs text-neutral-400 truncate">{food.brandName}</p>
									{:else}
										<p class="text-xs text-neutral-400">{food.servingDescription || 'Standard serving'}</p>
									{/if}
									<p class="text-xs text-neutral-500">{getTimeAgo(food.lastUsed)}</p>
								</div>
							</div>
							{#if isLoggingFood}
								<Loader2 class="ml-2 h-4 w-4 flex-shrink-0 animate-spin text-neutral-400" />
							{:else}
								<Plus class="ml-2 h-5 w-5 flex-shrink-0 text-neutral-400" />
							{/if}
						</button>
					{/each}
				{:else}
					<div class="p-4 text-center text-neutral-500">
						<Plus class="h-8 w-8 mx-auto mb-2 text-neutral-600" />
						<p class="text-sm">No recent foods found</p>
						<p class="text-xs mt-1">Start logging foods to see them here</p>
					</div>
				{/if}
			</div>

			<svelte:fragment slot="footer">
				<button
					onclick={() => {
						quickAddDrawerOpen = false;
						goto('/food-log');
					}}
					class="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-800 focus:outline-none"
				>
					Search All Foods
				</button>
				<button
					onclick={() => (quickAddDrawerOpen = false)}
					class="mt-2 w-full rounded-lg border border-neutral-600 py-2.5 font-medium text-neutral-200 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
				>
					Cancel
				</button>
			</svelte:fragment>
		</Drawer>
	{/if}
</div>