import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serverIp = searchParams.get('serverIp');
    const serverPort = searchParams.get('serverPort') || '30120';

    if (!serverIp) {
      return NextResponse.json(
        { error: 'Server IP is required. Please select a server first.' },
        { status: 400 }
      );
    }

    // Use HTTP instead of HTTPS to avoid certificate issues
    const response = await fetch(`http://${serverIp}:${serverPort}/dynamic.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching server dynamic info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server dynamic info', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}