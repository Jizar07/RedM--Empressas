import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3050';

export async function GET(req: NextRequest) {
  try {
    const serverId = req.nextUrl.searchParams.get('serverId');
    const endpoint = req.nextUrl.searchParams.get('endpoint') || 'by-category';

    const url = new URL(`${BACKEND_URL}/api/inventory-analytics/${endpoint}`);
    if (serverId) {
      url.searchParams.set('serverId', serverId);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error proxying inventory analytics:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
