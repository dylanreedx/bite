<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// Redirect to login page with register mode
		goto('/login?mode=register');
	});
</script>

<svelte:head>
	<title>Sign Up - Bite</title>
</svelte:head>

<!-- Loading state while redirecting -->
<div class="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
	<div class="text-center">
		<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
		<p class="text-neutral-400">Redirecting to sign up...</p>
	</div>
</div>