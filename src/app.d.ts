// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: number;
				email: string;
				name: string | null;
				createdAt: string | null;
			} | null;
			session: {
				id: string;
				userId: number;
				expiresAt: Date;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Environment variables
declare module '$env/static/private' {
	export const FATSECRET_PROXY_URL: string;
	export const FATSECRET_CONSUMER_KEY: string;
	export const FATSECRET_CONSUMER_SECRET: string;
	export const DATABASE_URL: string;
	export const DATABASE_AUTH_TOKEN: string;
}

export {};
