import { hash, verify } from '@node-rs/argon2';
import { encodeBase32LowerCaseNoPadding } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { db } from '$lib/db/index.js';
import { user, session } from '$lib/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';

export interface AuthUser {
	id: number;
	email: string;
	name: string | null;
	createdAt: string | null;
}

export interface SessionValidationResult {
	session: Session | null;
	user: AuthUser | null;
}

export interface Session {
	id: string;
	userId: number;
	expiresAt: Date;
}

// Password hashing options
const hashOptions = {
	memoryCost: 19456,
	timeCost: 2,
	outputLen: 32,
	parallelism: 1,
};

/**
 * Hash a password using Argon2
 */
export async function hashPassword(password: string): Promise<string> {
	return hash(password, hashOptions);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
	return verify(hashedPassword, password, hashOptions);
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

/**
 * Convert Uint8Array to hex string
 */
function bufferToHex(buffer: Uint8Array): string {
	return Array.from(buffer)
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Create a new session for a user
 */
export async function createSession(token: string, userId: number): Promise<Session> {
	const sessionId = bufferToHex(sha256(new TextEncoder().encode(token)));
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

	const sessionData = {
		id: sessionId,
		userId,
		expiresAt: expiresAt.getTime()
	};

	await db.insert(session).values(sessionData);

	return {
		id: sessionId,
		userId,
		expiresAt
	};
}

/**
 * Validate a session token
 */
export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = bufferToHex(sha256(new TextEncoder().encode(token)));
	
	try {
		const result = await db
			.select({
				session: {
					id: session.id,
					userId: session.userId,
					expiresAt: session.expiresAt
				},
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					createdAt: user.createdAt
				}
			})
			.from(session)
			.innerJoin(user, eq(session.userId, user.id))
			.where(eq(session.id, sessionId));

		if (result.length === 0) {
			return { session: null, user: null };
		}

		const { session: sessionData, user: userData } = result[0];
		
		// Check if session is expired
		if (Date.now() >= sessionData.expiresAt) {
			await db.delete(session).where(eq(session.id, sessionId));
			return { session: null, user: null };
		}

		return {
			session: {
				id: sessionData.id,
				userId: sessionData.userId,
				expiresAt: new Date(sessionData.expiresAt)
			},
			user: userData
		};
	} catch (error) {
		console.error('Error validating session:', error);
		return { session: null, user: null };
	}
}

/**
 * Invalidate a session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(session).where(eq(session.id, sessionId));
}

/**
 * Set session cookie
 */
export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set('session', token, {
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt,
		path: '/',
		secure: process.env.NODE_ENV === 'production'
	});
}

/**
 * Delete session cookie
 */
export function deleteSessionTokenCookie(event: RequestEvent): void {
	event.cookies.set('session', '', {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 0,
		path: '/',
		secure: process.env.NODE_ENV === 'production'
	});
}

/**
 * Create a new user account
 */
export async function createUser(email: string, password: string, name?: string): Promise<AuthUser> {
	const hashedPassword = await hashPassword(password);
	
	const result = await db.insert(user).values({
		email: email.toLowerCase(),
		password: hashedPassword,
		name: name || null
	}).returning({
		id: user.id,
		email: user.email,
		name: user.name,
		createdAt: user.createdAt
	});

	return result[0];
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<(AuthUser & { password: string }) | null> {
	const result = await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name,
			createdAt: user.createdAt,
			password: user.password
		})
		.from(user)
		.where(eq(user.email, email.toLowerCase()))
		.limit(1);

	return result[0] || null;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
	if (password.length < 8) {
		return { valid: false, message: 'Password must be at least 8 characters long' };
	}
	
	if (!/(?=.*[a-z])/.test(password)) {
		return { valid: false, message: 'Password must contain at least one lowercase letter' };
	}
	
	if (!/(?=.*[A-Z])/.test(password)) {
		return { valid: false, message: 'Password must contain at least one uppercase letter' };
	}
	
	if (!/(?=.*\d)/.test(password)) {
		return { valid: false, message: 'Password must contain at least one number' };
	}
	
	return { valid: true };
}