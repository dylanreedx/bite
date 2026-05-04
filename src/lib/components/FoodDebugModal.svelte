<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { X, Search, Database, Globe, AlertCircle, CheckCircle, Loader2 } from 'lucide-svelte';

	export let open: boolean = false;

	const dispatch = createEventDispatcher();

	let testQuery = 'ground beef';
	let isRunning = false;
	let results: any = {};
	let logs: string[] = [];

	function log(message: string) {
		logs = [...logs, `[${new Date().toLocaleTimeString()}] ${message}`];
		console.log(message);
	}

	function clearLogs() {
		logs = [];
		results = {};
	}

	async function runDiagnostics() {
		if (isRunning) return;

		isRunning = true;
		clearLogs();

		log('🚀 Starting food fetch diagnostics...');
		log(`Testing with query: "${testQuery}"`);

		try {
			// Test 1: Search API
			await testSearchAPI();

			// Test 2: If we got results, test food details
			if (results.searchResults?.foods?.length > 0) {
				const firstFood = results.searchResults.foods[0];
				await testFoodDetailsAPI(firstFood.foodId);
			}

			// Test 3: Test proxy connection directly if we have issues
			await testProxyConnection();

		} catch (error) {
			log(`❌ Diagnostic failed: ${error.message}`);
		} finally {
			isRunning = false;
			log('🏁 Diagnostics complete');
		}
	}

	async function testSearchAPI() {
		log('🔍 Testing search API...');

		try {
			const response = await fetch(`/api/foods/search?q=${encodeURIComponent(testQuery)}&limit=5`);
			const data = await response.json();

			results.searchResults = data;

			if (data.success) {
				log(`✅ Search API successful`);
				log(`📊 Found ${data.foods?.length || 0} foods`);
				log(`📈 Sources: ${data.sources?.local || 0} local, ${data.sources?.external || 0} external`);

				if (data.foods?.length > 0) {
					const firstFood = data.foods[0];
					log(`🥘 First result: ${firstFood.foodName} (ID: ${firstFood.foodId})`);
					log(`🏷️  Source: ${firstFood.source}`);
					log(`📊 Has nutrition: ${!!(firstFood.calories || firstFood.protein)}`);
				} else {
					log('⚠️  No foods found in search results');
				}
			} else {
				log(`❌ Search API failed: ${data.error}`);
			}
		} catch (error) {
			log(`❌ Search API request failed: ${error.message}`);
			results.searchError = error.message;
		}
	}

	async function testFoodDetailsAPI(foodId: number) {
		log(`🍽️  Testing food details API for ID: ${foodId}...`);

		try {
			const response = await fetch(`/api/foods/${foodId}`);
			const data = await response.json();

			results.foodDetails = data;

			if (data.success && data.food) {
				log(`✅ Food details API successful`);
				log(`📋 Food: ${data.food.foodName}`);
				log(`🍽️  Servings: ${data.food.servings?.length || 0}`);

				if (data.food.servings?.length > 0) {
					const firstServing = data.food.servings[0];
					log(`📊 First serving: ${firstServing.servingDescription}`);
					log(`🔢 Nutrition: ${firstServing.calories || 0} cal, ${firstServing.protein || 0}g protein`);

					if (!firstServing.calories && !firstServing.protein) {
						log('⚠️  No nutrition data in serving');
					}
				} else {
					log('⚠️  No servings found');
				}
			} else {
				log(`❌ Food details API failed: ${data.error}`);
			}
		} catch (error) {
			log(`❌ Food details API request failed: ${error.message}`);
			results.foodDetailsError = error.message;
		}
	}

	async function testProxyConnection() {
		log('🌐 Testing proxy connection diagnostics...');

		// This will trigger server-side logging that we can check in console
		try {
			const response = await fetch(`/api/foods/search?q=test_connection_debug&limit=1`);
			const data = await response.json();

			if (data.success) {
				log('📡 Proxy connection test completed (check server logs for details)');
			} else {
				log('⚠️  Proxy connection test had issues');
			}
		} catch (error) {
			log(`❌ Proxy connection test failed: ${error.message}`);
		}
	}

	function close() {
		open = false;
		dispatch('close');
	}

	function downloadLogs() {
		const logContent = logs.join('\n');
		const blob = new Blob([logContent], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `food-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	onMount(() => {
		if (open) {
			log('🔧 Food Debug Modal opened');
		}
	});
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/60"
		transition:fade={{ duration: 200 }}
		on:click={close}
		role="button"
		tabindex="-1"
	>
		<!-- Modal Container -->
		<div class="flex min-h-screen items-center justify-center p-4">
			<!-- Modal Content -->
			<div
				class="max-h-[90vh] w-full max-w-4xl overflow-hidden bg-neutral-800 shadow-2xl rounded-2xl border border-neutral-700"
				transition:fly={{ duration: 300, y: 20, opacity: 0, easing: quintOut }}
				on:click|stopPropagation
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				<!-- Header -->
				<div class="flex items-center justify-between border-b border-neutral-700 p-6">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-blue-600/20 p-2">
							<AlertCircle class="h-6 w-6 text-blue-400" />
						</div>
						<div>
							<h2 id="modal-title" class="text-xl font-bold text-white">
								Food Fetch Diagnostics
							</h2>
							<p class="text-sm text-neutral-400">Debug external food fetching issues</p>
						</div>
					</div>
					<button
						on:click={close}
						class="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-200"
						aria-label="Close modal"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<!-- Content -->
				<div class="flex h-[70vh] min-h-0">
					<!-- Left Panel - Controls -->
					<div class="flex w-80 flex-col border-r border-neutral-700 p-6">
						<div class="space-y-4">
							<div>
								<label for="testQuery" class="mb-2 block text-sm font-medium text-neutral-300">
									Test Query
								</label>
								<div class="flex gap-2">
									<input
										id="testQuery"
										type="text"
										bind:value={testQuery}
										disabled={isRunning}
										class="flex-1 rounded-lg border-neutral-600 bg-neutral-700 p-2.5 text-white disabled:opacity-50"
										placeholder="Enter food name..."
									/>
								</div>
							</div>

							<button
								on:click={runDiagnostics}
								disabled={isRunning || !testQuery.trim()}
								class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
							>
								{#if isRunning}
									<Loader2 class="h-4 w-4 animate-spin" />
									Running Diagnostics...
								{:else}
									<Search class="h-4 w-4" />
									Run Diagnostics
								{/if}
							</button>

							<div class="flex gap-2">
								<button
									on:click={clearLogs}
									disabled={isRunning}
									class="flex-1 rounded-lg border border-neutral-600 px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50"
								>
									Clear
								</button>
								<button
									on:click={downloadLogs}
									disabled={logs.length === 0}
									class="flex-1 rounded-lg border border-neutral-600 px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50"
								>
									Download
								</button>
							</div>
						</div>

						<!-- Status Summary -->
						{#if Object.keys(results).length > 0}
							<div class="mt-6 space-y-3">
								<h3 class="font-medium text-neutral-200">Status Summary</h3>

								<div class="space-y-2">
									<div class="flex items-center gap-2 text-sm">
										{#if results.searchResults?.success}
											<CheckCircle class="h-4 w-4 text-green-400" />
											<span class="text-green-400">Search API</span>
										{:else}
											<AlertCircle class="h-4 w-4 text-red-400" />
											<span class="text-red-400">Search API</span>
										{/if}
									</div>

									{#if results.foodDetails}
										<div class="flex items-center gap-2 text-sm">
											{#if results.foodDetails?.success}
												<CheckCircle class="h-4 w-4 text-green-400" />
												<span class="text-green-400">Food Details</span>
											{:else}
												<AlertCircle class="h-4 w-4 text-red-400" />
												<span class="text-red-400">Food Details</span>
											{/if}
										</div>
									{/if}

									<div class="flex items-center gap-2 text-sm">
										<Database class="h-4 w-4 text-blue-400" />
										<span class="text-neutral-300">
											Local: {results.searchResults?.sources?.local || 0}
										</span>
									</div>

									<div class="flex items-center gap-2 text-sm">
										<Globe class="h-4 w-4 text-purple-400" />
										<span class="text-neutral-300">
											External: {results.searchResults?.sources?.external || 0}
										</span>
									</div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Right Panel - Logs -->
					<div class="flex flex-1 flex-col">
						<div class="border-b border-neutral-700 p-4">
							<h3 class="font-medium text-neutral-200">Diagnostic Logs</h3>
							<p class="text-sm text-neutral-400">Real-time debugging information</p>
						</div>

						<div class="flex-1 overflow-y-auto p-4">
							{#if logs.length === 0}
								<div class="flex h-full items-center justify-center text-neutral-500">
									<div class="text-center">
										<Search class="mx-auto h-12 w-12 text-neutral-600" />
										<p class="mt-4">No logs yet</p>
										<p class="text-sm">Run diagnostics to see detailed information</p>
									</div>
								</div>
							{:else}
								<div class="space-y-1 font-mono text-sm">
									{#each logs as log}
										<div
											class="p-2 rounded border-l-2 {
												log.includes('✅') ? 'border-green-500 bg-green-500/10 text-green-300' :
												log.includes('❌') ? 'border-red-500 bg-red-500/10 text-red-300' :
												log.includes('⚠️') ? 'border-yellow-500 bg-yellow-500/10 text-yellow-300' :
												log.includes('🔍') || log.includes('🍽️') || log.includes('🌐') ? 'border-blue-500 bg-blue-500/10 text-blue-300' :
												log.includes('📊') || log.includes('📋') || log.includes('📈') ? 'border-purple-500 bg-purple-500/10 text-purple-300' :
												'border-neutral-600 bg-neutral-700/50 text-neutral-300'
											}"
										>
											{log}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="border-t border-neutral-700 p-6">
					<div class="flex justify-between">
						<div class="text-sm text-neutral-400">
							Use this tool to diagnose issues with external food fetching from FatSecret API
						</div>
						<button
							on:click={close}
							class="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700"
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
