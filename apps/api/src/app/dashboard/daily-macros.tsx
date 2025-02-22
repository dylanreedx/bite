'use client';

import {useFoodLogs} from '~/hooks/use-food';
import {Card, CardContent, CardHeader, CardTitle} from '~/components/ui/card';
import {extractNumber} from '~/lib/extract-number';

export function DailyMacros({userId}: {userId: string}) {
  const {data: logs = [], isLoading} = useFoodLogs(userId);
  console.log('logs', logs);

  // Compute total macros
  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + extractNumber(log.calories) * log.quantity,
      protein: acc.protein + extractNumber(log.protein) * log.quantity,
      carbs: acc.carbs + extractNumber(log.carbohydrate) * log.quantity,
      fat: acc.fat + extractNumber(log.fat) * log.quantity,
    }),
    {calories: 0, protein: 0, carbs: 0, fat: 0}
  );

  if (isLoading) {
    return <div className='text-center'>Loading macros...</div>;
  }

  return (
    <div className='grid gap-4 md:grid-cols-4'>
      <MacroCard
        title='Calories'
        value={Math.round(totals.calories)}
        unit='kcal'
      />
      <MacroCard title='Protein' value={Math.round(totals.protein)} unit='g' />
      <MacroCard title='Carbs' value={Math.round(totals.carbs)} unit='g' />
      <MacroCard title='Fat' value={Math.round(totals.fat)} unit='g' />
    </div>
  );
}

function MacroCard({
  title,
  value,
  unit,
}: {
  title: string;
  value: number;
  unit: string;
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>
          {value}
          {unit}
        </div>
      </CardContent>
    </Card>
  );
}
