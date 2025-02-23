import {url} from '@/utils/url';

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password}),
  });
  console.log('login', res);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to log in');
  }
  const data = await res.json();
  if (data.success) {
    return {userId: data.userId};
  }
  throw new Error('Login failed');
}

export async function signupUser(
  email: string,
  password: string,
  name?: string
) {
  const res = await fetch(`${url}/api/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password, name}),
  });
  console.log('signup', res);
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to sign up');
  }
  const data = await res.json();
  if (data.success) {
    return {userId: data.userId};
  }
  throw new Error('Signup failed');
}
