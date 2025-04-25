import {auth} from '~/lib/auth';
import {redirect} from 'next/navigation';
import {DailyMacros} from './daily-macros';
import {SearchFood} from './search-food';
import {FoodLog} from './food-log';

export default async function DashboardPage() {
  const user = await auth();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className='container mx-auto py-6 space-y-6'>
      <DailyMacros userId={String(user.id)} />
      <SearchFood />
      <FoodLog userId={String(user.id)} />
    </div>
  );
}
