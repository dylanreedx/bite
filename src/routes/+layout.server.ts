import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Always return fresh user data for reliable authentication state
	return {
		user: locals.user
	};
};

// Disable caching to ensure fresh user data on every request
export const ssr = true;
export const csr = true;