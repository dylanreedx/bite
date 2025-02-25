import {eq} from 'drizzle-orm';
import {db} from '../db.ts';
import {usersTable, type User} from '../schema.ts';
import {compare, hash} from 'bcrypt';

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  return user;
}

export async function getUserById(id: number) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));

  return user;
}

export async function createUser({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name?: string;
}) {
  const hashedPassword = await hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      email,
      password: hashedPassword,
      name,
    })
    .returning();

  return user;
}

export async function verifyPassword(user: User, password: string) {
  return compare(password, user.password);
}

export type AuthUser = Omit<User, 'password'>;
