import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { InventorySettings, DEFAULT_INVENTORY_SETTINGS } from '@/types/inventory';

// Disable static generation for this API route
export const dynamic = 'force-dynamic';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Origin, Accept',
  'Access-Control-Max-Age': '86400',
};

function withCors(response: Response) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Store settings in a JSON file in the public directory
const SETTINGS_FILE = path.join(process.cwd(), 'public', 'inventory-settings.json');

// Ensure the public directory exists
async function ensurePublicDirectory() {
  const publicDir = path.join(process.cwd(), 'public');
  try {
    await fs.mkdir(publicDir, { recursive: true });
  } catch (error) {
    // Directory already exists, ignore error
  }
}

// Read settings from file
async function readSettings(): Promise<Record<string, InventorySettings>> {
  try {
    await ensurePublicDirectory();
    
    const fileContent = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return data.settings || {};
  } catch (error) {
    console.log('Settings file not found, returning defaults');
    return {};
  }
}

// Write settings to file
async function writeSettings(settings: Record<string, InventorySettings>) {
  try {
    await ensurePublicDirectory();
    
    const data = {
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
      settings: settings
    };
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Saved inventory settings for ${Object.keys(settings).length} firms`);
  } catch (error) {
    console.error('Error writing settings file:', error);
    throw error;
  }
}

// GET - Retrieve settings for a specific firm or all firms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firmId = searchParams.get('firmId');
    
    const allSettings = await readSettings();
    
    if (firmId) {
      // Return settings for specific firm
      const firmSettings = allSettings[firmId] || DEFAULT_INVENTORY_SETTINGS;
      
      return withCors(NextResponse.json({
        success: true,
        settings: firmSettings,
        firmId: firmId,
        lastUpdated: new Date().toISOString()
      }));
    } else {
      // Return all settings
      return withCors(NextResponse.json({
        success: true,
        settings: allSettings,
        totalFirms: Object.keys(allSettings).length,
        lastUpdated: new Date().toISOString()
      }));
    }
  } catch (error) {
    console.error('Error reading inventory settings:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to read settings' },
      { status: 500 }
    ));
  }
}

// POST/PUT - Save settings for a specific firm
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firmId, settings } = body;
    
    if (!firmId || !settings) {
      return withCors(NextResponse.json(
        { success: false, error: 'firmId and settings are required' },
        { status: 400 }
      ));
    }
    
    // Validate settings structure
    const validatedSettings: InventorySettings = {
      ...DEFAULT_INVENTORY_SETTINGS,
      ...settings,
      // Ensure boolean values
      autoRefresh: Boolean(settings.autoRefresh ?? DEFAULT_INVENTORY_SETTINGS.autoRefresh),
      showZeroQuantity: Boolean(settings.showZeroQuantity ?? DEFAULT_INVENTORY_SETTINGS.showZeroQuantity),
      autoCategorizationEnabled: Boolean(settings.autoCategorizationEnabled ?? DEFAULT_INVENTORY_SETTINGS.autoCategorizationEnabled),
      priceMatchingEnabled: Boolean(settings.priceMatchingEnabled ?? DEFAULT_INVENTORY_SETTINGS.priceMatchingEnabled),
      notificationsEnabled: Boolean(settings.notificationsEnabled ?? DEFAULT_INVENTORY_SETTINGS.notificationsEnabled),
      workerTrackingEnabled: Boolean(settings.workerTrackingEnabled ?? DEFAULT_INVENTORY_SETTINGS.workerTrackingEnabled),
      globalTranslationsEnabled: Boolean(settings.globalTranslationsEnabled ?? DEFAULT_INVENTORY_SETTINGS.globalTranslationsEnabled),
      backupEnabled: Boolean(settings.backupEnabled ?? DEFAULT_INVENTORY_SETTINGS.backupEnabled),
      // Ensure numeric values
      refreshInterval: Number(settings.refreshInterval) || DEFAULT_INVENTORY_SETTINGS.refreshInterval,
      lowStockThreshold: Number(settings.lowStockThreshold) || DEFAULT_INVENTORY_SETTINGS.lowStockThreshold,
      backupInterval: Number(settings.backupInterval) || DEFAULT_INVENTORY_SETTINGS.backupInterval,
      // Ensure string values
      defaultCategory: settings.defaultCategory || DEFAULT_INVENTORY_SETTINGS.defaultCategory,
      exportFormat: ['csv', 'json'].includes(settings.exportFormat) ? settings.exportFormat : DEFAULT_INVENTORY_SETTINGS.exportFormat
    };
    
    // Read existing settings
    const allSettings = await readSettings();
    
    // Update settings for specific firm
    allSettings[firmId] = validatedSettings;
    
    // Save to file
    await writeSettings(allSettings);
    
    return withCors(NextResponse.json({
      success: true,
      message: `Settings updated for firm ${firmId}`,
      settings: validatedSettings,
      firmId: firmId,
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Error saving inventory settings:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    ));
  }
}

// PUT - Alias for POST
export async function PUT(request: NextRequest) {
  return POST(request);
}

// DELETE - Remove settings for a specific firm
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firmId = searchParams.get('firmId');
    
    if (!firmId) {
      return withCors(NextResponse.json(
        { success: false, error: 'firmId is required' },
        { status: 400 }
      ));
    }
    
    // Read existing settings
    const allSettings = await readSettings();
    
    // Check if firm settings exist
    if (!allSettings[firmId]) {
      return withCors(NextResponse.json(
        { success: false, error: `Settings not found for firm ${firmId}` },
        { status: 404 }
      ));
    }
    
    // Remove firm settings
    delete allSettings[firmId];
    
    // Save to file
    await writeSettings(allSettings);
    
    return withCors(NextResponse.json({
      success: true,
      message: `Settings removed for firm ${firmId}`,
      firmId: firmId,
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Error deleting inventory settings:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to delete settings' },
      { status: 500 }
    ));
  }
}

export function OPTIONS(request: NextRequest) {
  return withCors(new Response(null, { status: 200 }));
}