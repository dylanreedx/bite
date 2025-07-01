import { json } from '@sveltejs/kit';
import { getUserByEmail, verifyPassword, generateSessionToken, createSession, setSessionTokenCookie, isValidEmail } from '$lib/auth/index.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();

		// Validate input
		if (!email || !password) {
			return json(
				{
					success: false,
					error: 'Email and password are required'
				},
				{ status: 400 }
			);
		}

		if (!isValidEmail(email)) {
			return json(
				{
					success: false,
					error: 'Invalid email format'
				},
				{ status: 400 }
			);
		}

		// Get user by email
		const user = await getUserByEmail(email);
		if (!user) {
			return json(
				{
					success: false,
					error: 'Invalid email or password'
				},
				{ status: 401 }
			);
		}

		// Verify password
		const isValidPassword = await verifyPassword(user.password, password);
		if (!isValidPassword) {
			return json(
				{
					success: false,
					error: 'Invalid email or password'
				},
				{ status: 401 }
			);
		}

		// Create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, user.id);

		// Set session cookie
		setSessionTokenCookie({ cookies } as any, sessionToken, session.expiresAt);

		// Return user data (without password)
		const { password: _, ...userWithoutPassword } = user;
		
		return json({
			success: true,
			user: userWithoutPassword
		});
	} catch (error) {
		console.error('Login error:', error);
		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};