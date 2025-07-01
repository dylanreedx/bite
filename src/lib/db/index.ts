import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as schema from './schema.js';

// Create the database client
const client = createClient({
	url: env.DATABASE_URL!,
	authToken: env.DATABASE_AUTH_TOKEN!,
});

// Create the drizzle instance
export const db = drizzle(client, { schema });

// Export schema for use in other files
export * from './schema.js';