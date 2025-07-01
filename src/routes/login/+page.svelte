<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth.js';
	
	let email = '';
	let password = '';
	let showPassword = false;
	let isLoading = false;
	let error = '';
	let isRegisterMode = false;
	let name = '';

	// Check if we should show register mode from URL params
	$: if ($page.url.searchParams.get('mode') === 'register') {
		isRegisterMode = true;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (isLoading) return;
		
		error = '';
		
		// Basic validation
		if (!email || !password) {
			error = 'Please fill in all required fields';
			return;
		}

		if (isRegisterMode && !name?.trim()) {
			error = 'Please enter your name';
			return;
		}

		isLoading = true;

		try {
			const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
			const body = isRegisterMode 
				? { email, password, name: name.trim() }
				: { email, password };

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			const data = await response.json();

			if (data.success) {
				// Update client store immediately for instant UI feedback
				authStore.setUser(data.user);
				// Refresh all server data to update layout with user info
				await invalidateAll();
				// Redirect to dashboard on successful auth
				goto('/');
			} else {
				error = data.error || 'Authentication failed';
			}
		} catch (err) {
			console.error('Auth error:', err);
			error = 'Network error. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function toggleMode() {
		isRegisterMode = !isRegisterMode;
		error = '';
		// Update URL without navigation
		const url = new URL(window.location.href);
		if (isRegisterMode) {
			url.searchParams.set('mode', 'register');
		} else {
			url.searchParams.delete('mode');
		}
		window.history.replaceState({}, '', url);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSubmit(new SubmitEvent('submit'));
		}
	}
</script>

<svelte:head>
	<title>{isRegisterMode ? 'Sign Up' : 'Sign In'} - Bite</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Logo/Brand -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-white mb-2">🍎 Bite</h1>
			<p class="text-neutral-400">Your nutrition tracking companion</p>
		</div>

		<!-- Auth Form -->
		<div class="bg-neutral-800 rounded-2xl border border-neutral-700 p-6 shadow-2xl">
			<div class="mb-6">
				<h2 class="text-2xl font-bold text-white mb-2">
					{isRegisterMode ? 'Create Account' : 'Welcome Back'}
				</h2>
				<p class="text-neutral-400 text-sm">
					{isRegisterMode 
						? 'Start your nutrition journey today' 
						: 'Sign in to continue tracking your nutrition'}
				</p>
			</div>

			<!-- Error Message -->
			{#if error}
				<div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
					<AlertCircle class="h-4 w-4 text-red-400 flex-shrink-0" />
					<p class="text-red-400 text-sm">{error}</p>
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-4">
				<!-- Name Field (Register Only) -->
				{#if isRegisterMode}
					<div>
						<label for="name" class="block text-sm font-medium text-neutral-300 mb-2">
							Full Name
						</label>
						<input
							id="name"
							type="text"
							bind:value={name}
							onkeydown={handleKeydown}
							placeholder="Enter your full name"
							class="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
							disabled={isLoading}
						/>
					</div>
				{/if}

				<!-- Email Field -->
				<div>
					<label for="email" class="block text-sm font-medium text-neutral-300 mb-2">
						Email Address
					</label>
					<div class="relative">
						<Mail class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
						<input
							id="email"
							type="email"
							bind:value={email}
							onkeydown={handleKeydown}
							placeholder="Enter your email"
							class="w-full pl-10 pr-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
							disabled={isLoading}
						/>
					</div>
				</div>

				<!-- Password Field -->
				<div>
					<label for="password" class="block text-sm font-medium text-neutral-300 mb-2">
						Password
					</label>
					<div class="relative">
						<Lock class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							onkeydown={handleKeydown}
							placeholder={isRegisterMode ? 'Create a strong password' : 'Enter your password'}
							class="w-full pl-10 pr-12 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
							disabled={isLoading}
						/>
						<button
							type="button"
							onclick={() => showPassword = !showPassword}
							class="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-300 transition-colors"
							disabled={isLoading}
						>
							{#if showPassword}
								<EyeOff class="h-5 w-5" />
							{:else}
								<Eye class="h-5 w-5" />
							{/if}
						</button>
					</div>
					{#if isRegisterMode}
						<p class="mt-1 text-xs text-neutral-500">
							Must be at least 8 characters with uppercase, lowercase, and numbers
						</p>
					{/if}
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isLoading}
					class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex items-center justify-center gap-2"
				>
					{#if isLoading}
						<Loader2 class="h-5 w-5 animate-spin" />
						{isRegisterMode ? 'Creating Account...' : 'Signing In...'}
					{:else}
						{isRegisterMode ? 'Create Account' : 'Sign In'}
					{/if}
				</button>
			</form>

			<!-- Toggle Auth Mode -->
			<div class="mt-6 text-center">
				<p class="text-neutral-400 text-sm">
					{isRegisterMode 
						? 'Already have an account?' 
						: "Don't have an account?"}
					<button
						onclick={toggleMode}
						class="text-blue-400 hover:text-blue-300 font-medium ml-1 transition-colors"
						disabled={isLoading}
					>
						{isRegisterMode ? 'Sign In' : 'Sign Up'}
					</button>
				</p>
			</div>
		</div>

		<!-- Footer -->
		<div class="mt-8 text-center">
			<p class="text-neutral-500 text-xs">
				By continuing, you agree to our Terms of Service and Privacy Policy
			</p>
		</div>
	</div>
</div>