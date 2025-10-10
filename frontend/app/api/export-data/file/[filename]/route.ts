import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3050';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    const serverId = req.nextUrl.searchParams.get('serverId');

    if (!serverId) {
      return NextResponse.json(
        { success: false, error: 'serverId is required' },
        { status: 400 }
      );
    }

    const url = new URL(`${BACKEND_URL}/api/export-data/file/${filename}`);
    url.searchParams.set('serverId', serverId);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error proxying export file delete:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
