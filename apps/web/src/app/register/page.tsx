import {auth} from '~/lib/auth';
import {redirect} from 'next/navigation';
import {AuthForm} from '~/components/auth-form';

export default async function RegisterPage() {
  // Redirect to dashboard if already logged in
  const user = await auth();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className='container flex h-screen w-screen flex-col items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Create an account
          </h1>
          <p className='text-sm text-muted-foreground'>
            Enter your email below to create your account
          </p>
        </div>
        <AuthForm mode='register' />
      </div>
    </div>
  );
}
