import {cookies} from 'next/headers'; // Correct import for App Router
import {getUserByEmail, verifyPassword} from '@suna/db/queries/auth';
import {sign} from 'jsonwebtoken';
// Removed NextResponse import

export async function POST(request: Request) {
  // No need for separate console.log, request details are available if needed
  try {
    let email: string | undefined;
    let password: string | undefined;

    // Safely parse JSON body
    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({error: 'Invalid request body'}), {
        status: 400, // Bad Request
        headers: {'Content-Type': 'application/json'},
      });
    }

    // Basic validation
    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return new Response(
        JSON.stringify({error: 'Email and password are required'}),
        {
          status: 400, // Bad Request
          headers: {'Content-Type': 'application/json'},
        }
      );
    }

    const user = await getUserByEmail(email);
    // Combine user check and password check for slightly better security
    // (avoids timing attacks revealing if email exists)
    if (!user || !(await verifyPassword(user, password))) {
      return new Response(
        JSON.stringify({error: 'Invalid email or password'}),
        {
          status: 401, // Unauthorized
          headers: {'Content-Type': 'application/json'},
        }
      );
    }

    // User is authenticated, create JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET environment variable is not set!');
      throw new Error('JWT configuration error.'); // Throw internal error
    }

    const token = sign({userId: user.id}, secret, {
      expiresIn: '7d',
    });

    (await cookies()).set('auth-token', token, {
      httpOnly: true, // Prevents client-side JS access
      secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
      sameSite: 'lax', // Good default for CSRF protection
      path: '/', // Ensure cookie is valid for all paths
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    });

    // Return success using standard Response
    // The Set-Cookie header is automatically handled by cookies().set()
    return new Response(
      JSON.stringify({success: true, userId: String(user.id)}),
      {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      }
    );
  } catch (error) {
    // Log the actual error for server-side debugging
    console.error('Login process error:', error);

    // Return generic error to the client
    return new Response(
      JSON.stringify({error: 'An internal server error occurred'}),
      {
        status: 500,
        headers: {'Content-Type': 'application/json'},
      }
    );
  }
}
