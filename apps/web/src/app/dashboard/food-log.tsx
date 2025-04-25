'use client';

import {Trash2} from 'lucide-react';
import {toast} from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {Button} from '~/components/ui/button';
import {useFoodLogs, useDeleteFoodLog} from '~/hooks/use-food';
import {extractNumber} from '~/lib/extract-number';

export function FoodLog({userId}: {userId: string}) {
  const {data: logs = [], isLoading, isError} = useFoodLogs(userId);
  const {mutate: deleteLog, isPending: isDeleting} = useDeleteFoodLog();

  function confirmDelete(id: number, foodName: string) {
    toast.warning(`Delete "${foodName}"?`, {
      action: {
        label: 'Delete',
        onClick: () => deleteLog(id),
      },
    });
  }

  if (isLoading)
    return <div className='text-center py-4'>Loading food logs...</div>;
  if (isError)
    return (
      <div className='text-center py-4 text-red-500'>Failed to load logs</div>
    );

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Food</TableHead>
            <TableHead>Serving</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Calories</TableHead>
            <TableHead className='w-[50px]'></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length > 0 ? (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.food_name}</TableCell>
                <TableCell>{log.serving_description}</TableCell>
                <TableCell>{log.quantity}</TableCell>
                <TableCell>
                  {Math.round(extractNumber(log.calories) * log.quantity)}
                </TableCell>
                <TableCell>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => confirmDelete(log.id, log.food_name)}
                    disabled={isDeleting}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className='text-center py-4'>
                No food logs yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
