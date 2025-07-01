<script lang="ts">
	import '../../app.css';
	
	let { children } = $props();
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<!-- Auth-specific layout without navigation -->
<div class="min-h-screen bg-neutral-900 text-neutral-200">
	{@render children()}
</div>