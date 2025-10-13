import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3050';

export async function GET(req: NextRequest) {
  try {
    const serverId = req.nextUrl.searchParams.get('serverId');

    const url = new URL(`${BACKEND_URL}/api/worker-activity/sessions`);
    if (serverId) {
      url.searchParams.set('serverId', serverId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'x-bot-token': process.env.DISCORD_TOKEN || ''
      }
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error proxying worker sessions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
