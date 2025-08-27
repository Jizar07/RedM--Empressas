import { NextRequest, NextResponse } from 'next/server';

const SERVER_IP = '131.196.197.140';
const SERVER_PORT = '30120';

export async function GET() {
  try {
    // Use HTTP instead of HTTPS to avoid certificate issues
    const response = await fetch(`http://${SERVER_IP}:${SERVER_PORT}/players.json`, {
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
    console.error('Error fetching server players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server players', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}