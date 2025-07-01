<script lang="ts">
	import { Flame, Zap, Brain, Droplets } from 'lucide-svelte';
	import { nutritionStore } from '$lib/stores/nutrition.ts';
	import type { NutritionGoals, NutrientProgress } from '$lib/types/food.ts';

	// Props
	interface Props {
		showGoals?: boolean;
		compact?: boolean;
	}

	let {
		showGoals = true,
		compact = false
	}: Props = $props();

	// Store state with proper initial values
	let progress = $state({
		calories: { current: 0, target: 2200, percentage: 0, remaining: 2200, exceeded: false },
		protein: { current: 0, target: 150, percentage: 0, remaining: 150, exceeded: false },
		carbohydrate: { current: 0, target: 250, percentage: 0, remaining: 250, exceeded: false },
		fat: { current: 0, target: 70, percentage: 0, remaining: 70, exceeded: false },
		fiber: { current: 0, target: 25, percentage: 0, remaining: 25, exceeded: false },
		sugar: { current: 0, target: 50, percentage: 0, remaining: 50, exceeded: false },
		sodium: { current: 0, target: 2300, percentage: 0, remaining: 2300, exceeded: false }
	});
	let goals = $state({
		calories: 2200,
		protein: 150,
		carbohydrate: 250,
		fat: 70,
		fiber: 25,
		sugar: 50,
		sodium: 2300
	});
	let summary = $state(null);

	// Subscribe to stores
	$effect(() => {
		const unsubscribeProgress = nutritionStore.progress.subscribe(prog => {
			if (prog && typeof prog === 'object') {
				progress = prog;
			}
		});
		const unsubscribeGoals = nutritionStore.goals.subscribe(g => {
			if (g && typeof g === 'object') {
				goals = g;
			}
		});
		const unsubscribeSummary = nutritionStore.summary.subscribe(sum => {
			summary = sum;
		});

		return () => {
			unsubscribeProgress();
			unsubscribeGoals();
			unsubscribeSummary();
		};
	});

	// Macro configuration
	const macroConfig = {
		calories: {
			icon: Flame,
			color: 'text-orange-500',
			bgColor: 'bg-orange-500',
			unit: 'kcal'
		},
		protein: {
			icon: Zap,
			color: 'text-sky-500',
			bgColor: 'bg-sky-500',
			unit: 'g'
		},
		carbohydrate: {
			icon: Brain,
			color: 'text-purple-500',
			bgColor: 'bg-purple-500',
			unit: 'g'
		},
		fat: {
			icon: Droplets,
			color: 'text-green-500',
			bgColor: 'bg-green-500',
			unit: 'g'
		}
	};

	function getProgressColor(percentage: number): string {
		if (percentage >= 100) return 'bg-green-500';
		if (percentage >= 80) return 'bg-blue-500';
		if (percentage >= 50) return 'bg-yellow-500';
		return 'bg-red-500';
	}

	function formatNumber(value: number): string {
		return Math.round(value).toString();
	}

	function getStatusText(nutrientProgress: NutrientProgress): string {
		if (!nutrientProgress) return '0 left';
		if (nutrientProgress.exceeded) {
			return `+${formatNumber(nutrientProgress.current - nutrientProgress.target)}`;
		} else if (nutrientProgress.percentage >= 100) {
			return 'Complete';
		} else {
			return `${formatNumber(nutrientProgress.remaining)} left`;
		}
	}

	function getStatusColor(nutrientProgress: NutrientProgress): string {
		if (!nutrientProgress) return 'text-neutral-400';
		if (nutrientProgress.exceeded) return 'text-orange-400';
		if (nutrientProgress.percentage >= 100) return 'text-green-400';
		if (nutrientProgress.percentage >= 80) return 'text-blue-400';
		return 'text-neutral-400';
	}
</script>

<div class="rounded-xl border border-neutral-700 bg-neutral-800 p-5 shadow-xl">
	<div class="mb-5 flex items-center justify-between">
		<h2 class="text-xl font-semibold text-neutral-100">
			{compact ? 'Today' : "Today's Nutrition"}
		</h2>
		{#if !compact && summary}
			<div class="text-sm text-neutral-400">
				{summary.goalsReached}/{summary.totalGoals} goals reached
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 gap-5 {compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}">
		{#each Object.entries(macroConfig) as [nutrient, config] (nutrient)}
			{@const nutrientProgress = progress[nutrient as keyof typeof progress]}
			{@const goal = goals[nutrient as keyof typeof goals]}
			
			{#if nutrientProgress && goal}
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-neutral-700 p-2.5 {config.color}">
						<svelte:component this={config.icon} class="h-5 w-5 sm:h-6 sm:w-6" />
					</div>
					<div class="flex-grow min-w-0">
						<div class="mb-1 flex items-baseline justify-between">
							<h3 class="text-sm font-medium text-neutral-200 capitalize truncate">
								{nutrient === 'carbohydrate' ? 'Carbs' : nutrient}
							</h3>
							{#if showGoals}
								<p class="text-xs text-neutral-400 ml-2">
									{formatNumber(nutrientProgress.current)} / {formatNumber(goal)}{config.unit}
								</p>
							{:else}
								<p class="text-xs {getStatusColor(nutrientProgress)} ml-2">
									{getStatusText(nutrientProgress)}
								</p>
							{/if}
						</div>
						<div class="h-2 w-full rounded-full bg-neutral-600">
							<div
								class="{getProgressColor(nutrientProgress.percentage)} h-2 rounded-full transition-all duration-500 ease-out"
								style="width: {Math.min(nutrientProgress.percentage, 100)}%"
							></div>
						</div>
						{#if !compact}
							<div class="mt-1 text-xs {getStatusColor(nutrientProgress)}">
								{Math.round(nutrientProgress.percentage)}% 
								{#if nutrientProgress.exceeded}
									(over goal)
								{:else if nutrientProgress.percentage >= 100}
									✓
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{/each}
	</div>

	{#if !compact && summary}
		<div class="mt-5 pt-4 border-t border-neutral-700">
			<div class="flex items-center justify-between text-sm">
				<span class="text-neutral-400">Overall Progress</span>
				<span class="font-medium {
					summary.status === 'excellent' ? 'text-green-400' :
					summary.status === 'good' ? 'text-blue-400' :
					summary.status === 'fair' ? 'text-yellow-400' :
					'text-red-400'
				}">
					{Math.round(summary.averageProgress)}% 
					({summary.status.replace('-', ' ')})
				</span>
			</div>
			<div class="mt-2 h-2 w-full rounded-full bg-neutral-600">
				<div
					class="{getProgressColor(summary.averageProgress)} h-2 rounded-full transition-all duration-500 ease-out"
					style="width: {Math.min(summary.averageProgress, 100)}%"
				></div>
			</div>
		</div>
	{/if}
</div>