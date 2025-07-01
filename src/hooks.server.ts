import { validateSessionToken } from '$lib/auth/index.js';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

// Routes that don't require authentication
const publicRoutes = [
	'/login',
	'/register',
	'/api/auth/login',
	'/api/auth/register'
];

// API routes that don't require authentication
const publicApiRoutes = [
	'/api/auth/login',
	'/api/auth/register'
];

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('session');
	
	// Validate session if token exists
	if (sessionToken) {
		const { session, user } = await validateSessionToken(sessionToken);
		
		if (session && user) {
			// Set user in locals for access in routes
			event.locals.user = user;
			event.locals.session = session;
		} else {
			// Invalid session, clear the cookie
			event.cookies.delete('session', { path: '/' });
		}
	}

	// Check if route requires authentication
	const { pathname } = event.url;
	
	// Allow public routes
	if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
		return resolve(event);
	}

	// Allow public API routes
	if (publicApiRoutes.some(route => pathname.startsWith(route))) {
		return resolve(event);
	}

	// For API routes, return 401 if not authenticated
	if (pathname.startsWith('/api/')) {
		if (!event.locals.user) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Authentication required'
				}),
				{
					status: 401,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		return resolve(event);
	}

	// For regular routes, redirect to login if not authenticated
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}

	return resolve(event);
};