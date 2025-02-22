import {NextResponse} from 'next/server';
import {
  createFoodLog,
  deleteFoodLog,
  getTodaysFoodLogs,
} from '@suna/db/queries/food-log';
import {auth} from '~/lib/auth';

export async function POST(request: Request) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {foodId, servingId, quantity} = await request.json();

  await createFoodLog({
    userId: user.id,
    foodId,
    servingId,
    quantity,
  });

  return NextResponse.json({success: true});
}

export async function DELETE(request: Request) {
  console.log('DELETE');
  const user = await auth();
  if (!user) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {searchParams} = new URL(request.url);
  const logId = searchParams.get('id');

  if (!logId) {
    return NextResponse.json({error: 'Log ID required'}, {status: 400});
  }

  console.log('logId', logId);

  await deleteFoodLog({
    logId: Number.parseInt(logId),
    userId: user.id,
  });

  return NextResponse.json({success: true});
}

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const userId = searchParams.get('userId');
  console.timeLog('userId', userId);

  if (!userId) {
    return NextResponse.json({error: 'User ID required'}, {status: 400});
  }

  const logs = await getTodaysFoodLogs(Number(userId));

  return NextResponse.json(logs);
}
