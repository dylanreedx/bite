'use client';

import {useRouter} from 'next/navigation';
import {Button} from '~/components/ui/button';
import {LogOut} from 'lucide-react';
import {toast} from 'sonner';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!res.ok) throw new Error();

      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch (error) {
      toast.error('Something went wrong');
    }
  }

  return (
    <Button
      variant='ghost'
      size='icon'
      onClick={handleLogout}
      className='text-muted-foreground hover:text-foreground'
    >
      <LogOut className='h-5 w-5' />
    </Button>
  );
}
