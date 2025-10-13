import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// Helper function for server-specific customizations path
function getCustomizationsPath(serverId?: string): string {
  const basePath = path.join(process.cwd(), '..', 'data');
  if (serverId) {
    return path.join(basePath, 'customizations', serverId, 'custom_display_names.json');
  }
  return path.join(basePath, 'custom_display_names.json');
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Origin, Accept, Authorization',
  'Access-Control-Max-Age': '86400',
};

function withCors(response: Response) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Read customizations file
async function readCustomizations(serverId?: string) {
  try {
    const filePath = getCustomizationsPath(serverId);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Return default structure if file doesn't exist
    return {
      display_names: {},
      ultima_atualizacao: new Date().toISOString()
    };
  }
}

// Write customizations file
async function writeCustomizations(data: any, serverId?: string) {
  try {
    const filePath = getCustomizationsPath(serverId);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    const updatedData = {
      ...data,
      ultima_atualizacao: new Date().toISOString()
    };
    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing customizations file:', error);
    return false;
  }
}

// GET - Read all customizations
export async function GET(request: NextRequest) {
  try {
    const serverId = request.nextUrl.searchParams.get('serverId') || undefined;
    const customizations = await readCustomizations(serverId);

    return withCors(NextResponse.json({
      success: true,
      data: customizations,
      timestamp: new Date().toISOString(),
      serverId: serverId || 'legacy'
    }));
  } catch (error) {
    console.error('Error reading customizations:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to read customizations' },
      { status: 500 }
    ));
  }
}

// POST - Add or update customization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, displayName, serverId } = body;

    if (!itemId || !displayName) {
      return withCors(NextResponse.json(
        { success: false, error: 'itemId and displayName are required' },
        { status: 400 }
      ));
    }

    // Read current customizations
    const customizations = await readCustomizations(serverId);

    // Add/update the customization
    customizations.display_names[itemId] = displayName;

    // Write back to file
    const writeSuccess = await writeCustomizations(customizations, serverId);

    if (writeSuccess) {
      return withCors(NextResponse.json({
        success: true,
        message: `Customization added: ${itemId} → ${displayName}`,
        itemId,
        displayName,
        timestamp: new Date().toISOString(),
        serverId: serverId || 'legacy'
      }));
    } else {
      return withCors(NextResponse.json(
        { success: false, error: 'Failed to write customization' },
        { status: 500 }
      ));
    }

  } catch (error) {
    console.error('Error adding customization:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to add customization' },
      { status: 500 }
    ));
  }
}

// DELETE - Remove customization
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const serverId = searchParams.get('serverId') || undefined;

    if (!itemId) {
      return withCors(NextResponse.json(
        { success: false, error: 'itemId is required' },
        { status: 400 }
      ));
    }

    // Read current customizations
    const customizations = await readCustomizations(serverId);

    // Check if customization exists
    if (!customizations.display_names[itemId]) {
      return withCors(NextResponse.json(
        { success: false, error: 'Customization not found' },
        { status: 404 }
      ));
    }

    // Remove the customization
    const oldDisplayName = customizations.display_names[itemId];
    delete customizations.display_names[itemId];

    // Write back to file
    const writeSuccess = await writeCustomizations(customizations, serverId);

    if (writeSuccess) {
      return withCors(NextResponse.json({
        success: true,
        message: `Customization removed: ${itemId}`,
        itemId,
        oldDisplayName,
        timestamp: new Date().toISOString(),
        serverId: serverId || 'legacy'
      }));
    } else {
      return withCors(NextResponse.json(
        { success: false, error: 'Failed to remove customization' },
        { status: 500 }
      ));
    }

  } catch (error) {
    console.error('Error removing customization:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to remove customization' },
      { status: 500 }
    ));
  }
}

export function OPTIONS(request: NextRequest) {
  return withCors(new Response(null, { status: 200 }));
}