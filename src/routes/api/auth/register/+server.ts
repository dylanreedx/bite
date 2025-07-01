import { json } from '@sveltejs/kit';
import { createUser, getUserByEmail, generateSessionToken, createSession, setSessionTokenCookie, isValidEmail, isValidPassword } from '$lib/auth/index.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password, name } = await request.json();

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

		// Validate password strength
		const passwordValidation = isValidPassword(password);
		if (!passwordValidation.valid) {
			return json(
				{
					success: false,
					error: passwordValidation.message
				},
				{ status: 400 }
			);
		}

		// Check if user already exists
		const existingUser = await getUserByEmail(email);
		if (existingUser) {
			return json(
				{
					success: false,
					error: 'An account with this email already exists'
				},
				{ status: 409 }
			);
		}

		// Create new user
		const newUser = await createUser(email, password, name);

		// Create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, newUser.id);

		// Set session cookie
		setSessionTokenCookie({ cookies } as any, sessionToken, session.expiresAt);

		return json({
			success: true,
			user: newUser
		});
	} catch (error) {
		console.error('Registration error:', error);
		
		// Handle duplicate email error from database
		if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
			return json(
				{
					success: false,
					error: 'An account with this email already exists'
				},
				{ status: 409 }
			);
		}
		
		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};