import {NextResponse} from 'next/server';
import {createUser, getUserByEmail} from '@suna/db/queries/auth';
import {sign} from 'jsonwebtoken';
import {cookies} from 'next/headers';

export async function POST(request: Request) {
  try {
    const {email, password, name} = await request.json();

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        {error: 'Email already registered'},
        {status: 400}
      );
    }

    // Create new user
    const user = await createUser({email, password, name});

    // Create and set auth token
    const token = sign({userId: user.id}, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    (await cookies()).set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({error: 'Something went wrong'}, {status: 500});
  }
}
