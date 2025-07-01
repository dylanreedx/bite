<script lang="ts">
	import { TrendingUp, Lightbulb, Award, AlertCircle } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth';
	import { nutritionStore } from '$lib/stores/nutrition';
	import { foodStore } from '$lib/stores/food';
	import NutritionProgress from '$lib/components/NutritionProgress.svelte';

	let { data } = $props();

	// Store state
	import type { NutritionRecommendation, ProgressSummary, DailyTotals } from '$lib/types/food';
	import type { AuthState } from '$lib/stores/auth';

	let authState: AuthState = $state({ user: null, isLoading: false, isAuthenticated: false });
	let todayTotals: DailyTotals = $state({
		calories: 0,
		protein: 0,
		carbohydrate: 0,
		fat: 0,
		fiber: 0,
		sugar: 0,
		sodium: 0
	});
	let hasTodayLog: boolean = $state(false);
	let recommendations: NutritionRecommendation[] = $state([]);
	let summary: ProgressSummary | null = $state(null);

	// Subscribe to stores
	$effect(() => {
		const unsubscribeAuth = authStore.subscribe((state) => {
			authState = state;
		});
		const unsubscribeTotals = foodStore.todayTotals.subscribe((totals) => {
			todayTotals = totals;
		});
		const unsubscribeHasLog = foodStore.hasTodayLog.subscribe((hasLog) => {
			hasTodayLog = hasLog;
		});
		const unsubscribeRecommendations = nutritionStore.recommendations.subscribe((recs) => {
			recommendations = recs;
		});
		const unsubscribeSummary = nutritionStore.summary.subscribe((sum) => {
			summary = sum;
		});

		return () => {
			unsubscribeAuth();
			unsubscribeTotals();
			unsubscribeHasLog();
			unsubscribeRecommendations();
			unsubscribeSummary();
		};
	});

	// Use reliable auth state from both server and client
	let currentUser = $derived(data?.user || authState.user);

	// Mock heatmap data - this could be enhanced with real data from analytics API
	const heatmapData = [2, 1, 2, 0, 2, 2, 1].map((status, day) => {
		const d = new Date();
		d.setDate(d.getDate() - (6 - day));
		return {
			day: d.toLocaleString('en-US', { weekday: 'short' }).slice(0, 1),
			status,
			index: day
		};
	});

	// Enhanced insights with real data
	interface InsightItem {
		title: string;
		description: string;
		icon: typeof TrendingUp;
		type: string;
	}

	let insights = $derived.by(() => {
		const baseInsights: InsightItem[] = [];

		// Add recommendation-based insights
		if (recommendations && Array.isArray(recommendations)) {
			recommendations.forEach((rec) => {
				if (rec && rec.type === 'protein' && rec.message && rec.message.includes('Add')) {
					baseInsights.push({
						title: 'Protein Goal',
						description: rec.message,
						icon: TrendingUp,
						type: 'suggestion'
					});
				} else if (rec && rec.type === 'sodium' && rec.message && rec.message.includes('high')) {
					baseInsights.push({
						title: 'Sodium Alert',
						description: rec.message,
						icon: AlertCircle,
						type: 'warning'
					});
				}
			});
		}

		// Add summary-based insights
		if (summary && typeof summary === 'object') {
			if (summary.status === 'excellent') {
				baseInsights.push({
					title: 'Excellent Progress!',
					description: `You've reached ${summary.goalsReached || 0} out of ${summary.totalGoals || 0} nutrition goals today.`,
					icon: Award,
					type: 'positive'
				});
			} else if (summary.averageProgress && summary.averageProgress < 50) {
				baseInsights.push({
					title: 'Keep Going',
					description: 'Log more foods to track your complete nutrition intake.',
					icon: Lightbulb,
					type: 'suggestion'
				});
			}
		}

		// Default insights if no data
		if (baseInsights.length === 0) {
			baseInsights.push({
				title: 'Start Your Journey',
				description: 'Begin logging foods to get personalized nutrition insights.',
				icon: Lightbulb,
				type: 'suggestion'
			});
		}

		return baseInsights;
	});

	function getHeatmapColor(status: number): string {
		if (status === 2) return 'bg-blue-600';
		if (status === 1) return 'bg-blue-800';
		return 'bg-neutral-700';
	}

	function getInsightIcon(type: string): string {
		switch (type) {
			case 'positive':
				return 'text-green-400';
			case 'warning':
				return 'text-yellow-400';
			case 'suggestion':
				return 'text-blue-400';
			default:
				return 'text-neutral-400';
		}
	}

	function getInsightBg(type: string): string {
		switch (type) {
			case 'positive':
				return 'bg-green-500/10';
			case 'warning':
				return 'bg-yellow-500/10';
			case 'suggestion':
				return 'bg-blue-500/10';
			default:
				return 'bg-neutral-500/10';
		}
	}
</script>

<div
	class="p-4 pb-28 sm:p-6"
	style="padding-bottom: calc(7rem + max(env(safe-area-inset-bottom), 0px));"
>
	<header class="mb-6">
		<h1 class="text-3xl font-bold text-neutral-100 sm:text-4xl">
			Welcome back{#if currentUser?.name}, {currentUser.name}{/if}!
		</h1>
		<p class="mt-2 text-neutral-400">Your nutrition overview for today</p>
	</header>

	<!-- Today's Nutrition Progress -->
	<section class="mb-8">
		<NutritionProgress />
	</section>

	<!-- Your Week Section (Heatmap) -->
	<section class="mb-8">
		<h2 class="mb-4 text-xl font-semibold text-neutral-100">Your Week</h2>
		<div class="rounded-xl border border-neutral-700 bg-neutral-800 p-4 shadow-lg">
			<div class="flex items-center justify-around">
				{#each heatmapData as dayEntry (dayEntry.index)}
					<div class="group flex cursor-default flex-col items-center">
						<div
							class="h-9 w-9 rounded-lg sm:h-10 sm:w-10 {getHeatmapColor(
								dayEntry.status
							)} mb-1.5 transition-all duration-200 group-hover:scale-110"
							title="Status: {dayEntry.status === 2
								? 'Met Goal'
								: dayEntry.status === 1
									? 'Partial'
									: 'Missed'}"
						></div>
						<span class="text-xs text-neutral-400">{dayEntry.day}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Quick Stats -->
	{#if hasTodayLog}
		<section class="mb-8">
			<h2 class="mb-4 text-xl font-semibold text-neutral-100">Today's Summary</h2>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-center">
					<p class="text-2xl font-bold text-orange-400">{Math.round(todayTotals.calories)}</p>
					<p class="text-xs text-neutral-400">Calories</p>
				</div>
				<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-center">
					<p class="text-2xl font-bold text-sky-400">{Math.round(todayTotals.protein)}g</p>
					<p class="text-xs text-neutral-400">Protein</p>
				</div>
				<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-center">
					<p class="text-2xl font-bold text-purple-400">{Math.round(todayTotals.carbohydrate)}g</p>
					<p class="text-xs text-neutral-400">Carbs</p>
				</div>
				<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-center">
					<p class="text-2xl font-bold text-green-400">{Math.round(todayTotals.fat)}g</p>
					<p class="text-xs text-neutral-400">Fat</p>
				</div>
			</div>
		</section>
	{/if}

	<!-- Insights Section -->
	<section>
		<h2 class="mb-4 text-xl font-semibold text-neutral-100">Insights</h2>
		<div class="space-y-3">
			{#each insights as insight (insight.title)}
				<div
					class="flex cursor-pointer items-start gap-4 rounded-lg border border-neutral-700 bg-neutral-800 p-4 shadow-lg transition-colors hover:border-neutral-600 hover:bg-neutral-700"
				>
					<div class="mt-0.5 flex-shrink-0 rounded-md p-2 {getInsightBg(insight.type)}">
						<insight.icon class="h-5 w-5 {getInsightIcon(insight.type)}" />
					</div>
					<div class="flex-grow">
						<h3 class="text-sm font-medium text-neutral-100">{insight.title}</h3>
						<p class="mt-1 text-xs text-neutral-300">{insight.description}</p>
					</div>
				</div>
			{/each}

			<!-- Recommendations from nutrition store -->
			{#if recommendations && recommendations.length > 0}
				{#each recommendations.slice(0, 2) as rec (rec.type)}
					<div
						class="flex items-start gap-4 rounded-lg border border-neutral-700 bg-neutral-800 p-4 shadow-lg"
					>
						<div class="mt-0.5 flex-shrink-0 rounded-md bg-blue-500/10 p-2">
							<Lightbulb class="h-5 w-5 text-blue-400" />
						</div>
						<div class="flex-grow">
							<h3 class="text-sm font-medium text-neutral-100">Nutrition Tip</h3>
							<p class="mt-1 text-xs text-neutral-300">{rec.message}</p>
							{#if rec.suggestions.length > 0}
								<p class="mt-2 text-xs text-blue-400">
									💡 Try: {rec.suggestions.slice(0, 3).join(', ')}
								</p>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>
</div>
