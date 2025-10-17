import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3050/api';

export async function GET(request: NextRequest) {
  try {
    const serverId = request.nextUrl.searchParams.get('serverId');
    const firmId = request.nextUrl.searchParams.get('firmId');

    console.log(`🔍 [comprehensive-analytics API] Request - serverId: ${serverId}, firmId: ${firmId}`);

    const url = new URL(`${API_BASE_URL}/comprehensive-analytics`);
    if (serverId) {
      url.searchParams.set('serverId', serverId);
    }
    if (firmId) {
      url.searchParams.set('firmId', firmId);
      console.log(`📊 [comprehensive-analytics API] Passing firmId to backend: ${firmId}`);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [comprehensive-analytics API] Successfully fetched data for firmId: ${firmId}`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [comprehensive-analytics API] Error fetching comprehensive analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comprehensive analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
