import { json } from '@sveltejs/kit';
import { invalidateSession, deleteSessionTokenCookie, validateSessionToken } from '$lib/auth/index.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		const sessionToken = cookies.get('session');

		if (sessionToken) {
			// Validate the session to get the session ID
			const { session } = await validateSessionToken(sessionToken);
			
			if (session) {
				// Invalidate the session in the database
				await invalidateSession(session.id);
			}
		}

		// Delete the session cookie
		deleteSessionTokenCookie({ cookies } as any);

		return json({
			success: true,
			message: 'Logged out successfully'
		});
	} catch (error) {
		console.error('Logout error:', error);
		
		// Even if there's an error, we should still clear the cookie
		deleteSessionTokenCookie({ cookies } as any);
		
		return json({
			success: true,
			message: 'Logged out successfully'
		});
	}
};