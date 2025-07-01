<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
	
	type SizeType = 'small' | 'default' | 'large';
	
	let { message = 'Loading...', size = 'default' }: { message?: string; size?: SizeType } = $props();
	
	const sizeClasses: Record<SizeType, string> = {
		small: 'h-4 w-4',
		default: 'h-8 w-8',
		large: 'h-12 w-12'
	};
</script>

<div class="flex min-h-screen items-center justify-center bg-neutral-900">
	<div class="text-center">
		<Loader2 class="mx-auto mb-4 animate-spin text-blue-500 {sizeClasses[size]}" />
		<p class="text-neutral-400">{message}</p>
	</div>
</div>