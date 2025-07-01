<script lang="ts">
	import {
		TrendingUp,
		TrendingDown,
		Target,
		Calendar,
		BarChart3,
		PieChart,
		Activity,
		Award,
		AlertCircle,
		ChevronRight,
		Flame,
		Zap,
		Brain,
		Droplets
	} from 'lucide-svelte';

	let { data } = $props();

	// Mock data for insights - this will be replaced with real data from your database
	const weeklyStats = {
		avgCalories: 1875,
		avgProtein: 125,
		avgCarbs: 210,
		avgFat: 65,
		daysLogged: 6,
		targetDays: 7
	};

	const trends = [
		{
			title: 'Calorie Intake',
			value: 1875,
			change: +125,
			changePercent: 7.1,
			target: 2200,
			icon: Flame,
			color: 'text-orange-500',
			bgColor: 'bg-orange-500/10',
			trending: 'up'
		},
		{
			title: 'Protein',
			value: 125,
			change: +15,
			changePercent: 13.6,
			target: 150,
			icon: Zap,
			color: 'text-sky-500',
			bgColor: 'bg-sky-500/10',
			trending: 'up'
		},
		{
			title: 'Carbohydrates',
			value: 210,
			change: -20,
			changePercent: -8.7,
			target: 250,
			icon: Brain,
			color: 'text-purple-500',
			bgColor: 'bg-purple-500/10',
			trending: 'down'
		},
		{
			title: 'Fat',
			value: 65,
			change: +5,
			changePercent: 8.3,
			target: 70,
			icon: Droplets,
			color: 'text-green-500',
			bgColor: 'bg-green-500/10',
			trending: 'up'
		}
	];

	const insights = [
		{
			id: 1,
			type: 'achievement',
			title: 'Protein Goal Streak',
			description: 'You\'ve hit your protein target 5 days in a row!',
			icon: Award,
			color: 'text-green-400',
			bgColor: 'bg-green-500/10',
			actionable: false
		},
		{
			id: 2,
			type: 'warning',
			title: 'Low Fiber Intake',
			description: 'Your average fiber is 15g below the recommended 25g daily.',
			icon: AlertCircle,
			color: 'text-yellow-400',
			bgColor: 'bg-yellow-500/10',
			actionable: true,
			action: 'Add more vegetables and whole grains'
		},
		{
			id: 3,
			type: 'trend',
			title: 'Calorie Consistency',
			description: 'Your daily calorie intake has been very consistent this week.',
			icon: TrendingUp,
			color: 'text-blue-400',
			bgColor: 'bg-blue-500/10',
			actionable: false
		},
		{
			id: 4,
			type: 'suggestion',
			title: 'Weekend Logging',
			description: 'You tend to skip logging on weekends. Try quick-add for easier tracking.',
			icon: Calendar,
			color: 'text-purple-400',
			bgColor: 'bg-purple-500/10',
			actionable: true,
			action: 'Set weekend reminders'
		}
	];

	function getProgressPercentage(value: number, target: number): number {
		return Math.min((value / target) * 100, 100);
	}

	function formatChange(change: number, unit: string = ''): string {
		const prefix = change > 0 ? '+' : '';
		return `${prefix}${change}${unit}`;
	}
</script>

<div class="p-4 pb-28 sm:p-6">
	<header class="mb-6">
		<h1 class="text-3xl font-bold text-neutral-100 sm:text-4xl">Insights</h1>
		<p class="mt-2 text-neutral-400">
			Your nutrition analysis and trends{#if data?.user?.name}, {data.user.name}{/if}
		</p>
	</header>

	<!-- Weekly Overview -->
	<section class="mb-8 rounded-xl border border-neutral-700 bg-neutral-800 p-5 shadow-xl">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-neutral-100">This Week's Overview</h2>
			<div class="flex items-center gap-2 text-sm text-neutral-400">
				<Activity class="h-4 w-4" />
				{weeklyStats.daysLogged}/{weeklyStats.targetDays} days logged
			</div>
		</div>
		
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
			{#each trends as trend}
				<div class="rounded-lg border border-neutral-600 bg-neutral-700/50 p-4">
					<div class="mb-2 flex items-center justify-between">
						<div class={`rounded-md p-1.5 ${trend.bgColor}`}>
							<svelte:component this={trend.icon} class="h-4 w-4 {trend.color}" />
						</div>
						<div class="flex items-center gap-1 text-xs">
							{#if trend.trending === 'up'}
								<TrendingUp class="h-3 w-3 text-green-400" />
							{:else}
								<TrendingDown class="h-3 w-3 text-red-400" />
							{/if}
							<span class={trend.trending === 'up' ? 'text-green-400' : 'text-red-400'}>
								{Math.abs(trend.changePercent)}%
							</span>
						</div>
					</div>
					<p class="text-xs text-neutral-400">{trend.title}</p>
					<p class="text-lg font-semibold text-neutral-100">{trend.value}g</p>
					<div class="mt-2 h-1.5 w-full rounded-full bg-neutral-600">
						<div
							class={`${trend.color.replace('text-', 'bg-')} h-1.5 rounded-full transition-all duration-500`}
							style="width: {getProgressPercentage(trend.value, trend.target)}%"
						></div>
					</div>
					<p class="mt-1 text-xs text-neutral-500">
						{formatChange(trend.change, 'g')} from last week
					</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Insights & Recommendations -->
	<section class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-neutral-100">AI Insights</h2>
			<button class="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
				<BarChart3 class="h-4 w-4" />
				View detailed analysis
			</button>
		</div>

		<div class="space-y-3">
			{#each insights as insight}
				<div
					class="flex cursor-pointer items-start gap-4 rounded-lg border border-neutral-700 bg-neutral-800 p-4 shadow-lg transition-all hover:border-neutral-600 hover:bg-neutral-700"
				>
					<div class={`mt-0.5 flex-shrink-0 rounded-md p-2 ${insight.bgColor}`}>
						<svelte:component this={insight.icon} class="h-5 w-5 {insight.color}" />
					</div>
					<div class="flex-grow">
						<h3 class="text-sm font-medium text-neutral-100">{insight.title}</h3>
						<p class="mt-1 text-xs text-neutral-300">{insight.description}</p>
						{#if insight.actionable && insight.action}
							<p class="mt-2 text-xs font-medium text-blue-400">💡 {insight.action}</p>
						{/if}
					</div>
					<ChevronRight class="ml-auto h-4 w-4 self-center text-neutral-500" />
				</div>
			{/each}
		</div>
	</section>

	<!-- Quick Stats -->
	<section>
		<h2 class="mb-4 text-xl font-semibold text-neutral-100">Quick Stats</h2>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-blue-500/10 p-2">
						<Target class="h-5 w-5 text-blue-400" />
					</div>
					<div>
						<p class="text-sm text-neutral-400">Goal Hit Rate</p>
						<p class="text-lg font-semibold text-neutral-100">78%</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-green-500/10 p-2">
						<Calendar class="h-5 w-5 text-green-400" />
					</div>
					<div>
						<p class="text-sm text-neutral-400">Logging Streak</p>
						<p class="text-lg font-semibold text-neutral-100">12 days</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg border border-neutral-700 bg-neutral-800 p-4">
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-purple-500/10 p-2">
						<PieChart class="h-5 w-5 text-purple-400" />
					</div>
					<div>
						<p class="text-sm text-neutral-400">Foods Tracked</p>
						<p class="text-lg font-semibold text-neutral-100">247</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>