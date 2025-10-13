import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3050';

export async function GET(
  req: NextRequest,
  { params }: { params: { workerId: string } }
) {
  try {
    const { workerId } = params;
    const serverId = req.nextUrl.searchParams.get('serverId');
    const includeActivities = req.nextUrl.searchParams.get('includeActivities');
    const includeTransfers = req.nextUrl.searchParams.get('includeTransfers');
    const includeRecipes = req.nextUrl.searchParams.get('includeRecipes');
    const limit = req.nextUrl.searchParams.get('limit');

    const url = new URL(`${BACKEND_URL}/api/global-worker-analytics/worker/${workerId}`);

    // Add query parameters
    if (serverId) url.searchParams.set('serverId', serverId);
    if (includeActivities) url.searchParams.set('includeActivities', includeActivities);
    if (includeTransfers) url.searchParams.set('includeTransfers', includeTransfers);
    if (includeRecipes) url.searchParams.set('includeRecipes', includeRecipes);
    if (limit) url.searchParams.set('limit', limit);

    const response = await fetch(url.toString(), {
      headers: {
        'x-bot-token': process.env.DISCORD_TOKEN || ''
      }
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error proxying global worker analytics:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
