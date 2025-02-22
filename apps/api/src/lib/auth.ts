import {cookies} from 'next/headers';
import {verify} from 'jsonwebtoken';
import {getUserById} from '@suna/db/queries/auth';

export async function auth() {
  const token = (await cookies()).get('auth-token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET || 'secret') as {
      userId: number;
    };

    const user = await getUserById(decoded.userId);
    return user || null;
  } catch {
    return null;
  }
}
