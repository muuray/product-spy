import { NextResponse } from 'next/server';
import { dailyLearning } from '../../lib/agent';

export async function GET(request) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await dailyLearning();
    return NextResponse.json({
      success: true,
      message: 'Daily learning completed',
      ...result,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
