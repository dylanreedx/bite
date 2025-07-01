import { writable } from 'svelte/store';
import type { AuthUser } from '$lib/auth/index.js';

interface AuthState {
	user: AuthUser | null;
	isLoading: boolean;
	isAuthenticated: boolean;
}

const createAuthStore = () => {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		isLoading: false,
		isAuthenticated: false
	});

	return {
		subscribe,
		setUser: (user: AuthUser | null) => {
			set({
				user,
				isLoading: false,
				isAuthenticated: !!user
			});
		},
		setLoading: (isLoading: boolean) => {
			update(state => ({ ...state, isLoading }));
		},
		logout: () => {
			set({
				user: null,
				isLoading: false,
				isAuthenticated: false
			});
		},
		reset: () => {
			set({
				user: null,
				isLoading: false,
				isAuthenticated: false
			});
		}
	};
};

export const authStore = createAuthStore();