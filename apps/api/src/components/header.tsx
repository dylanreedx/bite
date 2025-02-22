'use client';
import {Button} from '~/components/ui/button';
// create a header with only a button on the right to logout
export default function Header() {
  // call '/api/auth/logout' to logout
  const logout = () => {
    fetch('/api/auth/logout', {
      method: 'POST',
    }).then(() => {
      window.location.href = '/login';
    });
  };

  return (
    <header className='flex justify-between items-center p-4'>
      <nav>
        <ul>
          <li>
            <Button onClick={logout}>Logout</Button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
