import {NextResponse} from 'next/server';
import {getUserByEmail, verifyPassword} from '@suna/db/queries/auth';
import {sign} from 'jsonwebtoken';
import {cookies} from 'next/headers';

export async function POST(request: Request) {
  try {
    const {email, password} = await request.json();

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        {error: 'Invalid email or password'},
        {status: 401}
      );
    }

    const validPassword = await verifyPassword(user, password);
    if (!validPassword) {
      return NextResponse.json(
        {error: 'Invalid email or password'},
        {status: 401}
      );
    }

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
    console.error('Login error:', error);
    return NextResponse.json({error: 'Something went wrong'}, {status: 500});
  }
}
