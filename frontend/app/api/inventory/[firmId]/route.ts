import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { InventoryItem, InventoryTransaction, InventoryData, DEFAULT_INVENTORY_SETTINGS } from '@/types/inventory';

// Disable static generation for this API route
export const dynamic = 'force-dynamic';

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

// Store inventory data in firm-specific JSON files
const getInventoryFilePath = (firmId: string) => 
  path.join(process.cwd(), 'public', 'inventory-data', `${firmId}.json`);

const getBackupFilePath = (firmId: string) => 
  path.join(process.cwd(), 'public', 'inventory-data', 'backups', `${firmId}-${new Date().toISOString().split('T')[0]}.json`);

// Ensure directories exist
async function ensureDirectories(firmId: string) {
  const inventoryDir = path.join(process.cwd(), 'public', 'inventory-data');
  const backupDir = path.join(inventoryDir, 'backups');
  
  try {
    await fs.mkdir(inventoryDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });
  } catch (error) {
    // Directories already exist, ignore error
  }
}

// Read inventory data from file
async function readInventoryData(firmId: string): Promise<InventoryData> {
  try {
    await ensureDirectories(firmId);
    
    const filePath = getInventoryFilePath(firmId);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Ensure data structure is valid
    return {
      items: data.items || {},
      transactions: data.transactions || [],
      analytics: data.analytics || {
        totalItems: 0,
        totalQuantity: 0,
        totalValue: 0,
        categorias: {},
        workers: [],
        recentTransactions: [],
        lowStockAlerts: [],
        priceMatches: 0,
        unmatchedItems: []
      },
      settings: { ...DEFAULT_INVENTORY_SETTINGS, ...data.settings },
      lastUpdate: data.lastUpdate || new Date().toISOString(),
      totalItems: data.totalItems || 0,
      totalQuantity: data.totalQuantity || 0,
      activeWorkers: data.activeWorkers || []
    };
  } catch (error) {
    console.log(`Inventory file not found for firm ${firmId}, returning empty data`);
    return {
      items: {},
      transactions: [],
      analytics: {
        totalItems: 0,
        totalQuantity: 0,
        totalValue: 0,
        categorias: {},
        workers: [],
        recentTransactions: [],
        lowStockAlerts: [],
        priceMatches: 0,
        unmatchedItems: []
      },
      settings: DEFAULT_INVENTORY_SETTINGS,
      lastUpdate: new Date().toISOString(),
      totalItems: 0,
      totalQuantity: 0,
      activeWorkers: []
    };
  }
}

// Write inventory data to file with backup
async function writeInventoryData(firmId: string, data: InventoryData): Promise<void> {
  try {
    await ensureDirectories(firmId);
    
    const filePath = getInventoryFilePath(firmId);
    const backupPath = getBackupFilePath(firmId);
    
    // Create backup of existing data
    try {
      const existingData = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(backupPath, existingData);
    } catch (error) {
      // No existing file to backup, ignore error
    }
    
    // Write new data with timestamp
    const dataWithTimestamp = {
      ...data,
      lastUpdate: new Date().toISOString(),
      version: '1.0.0',
      firmId: firmId
    };
    
    await fs.writeFile(filePath, JSON.stringify(dataWithTimestamp, null, 2));
    console.log(`✅ Saved inventory data for firm ${firmId} with ${Object.keys(data.items).length} items`);
  } catch (error) {
    console.error(`Error writing inventory data for firm ${firmId}:`, error);
    throw error;
  }
}

// Calculate analytics from items and transactions
function calculateAnalytics(items: Record<string, InventoryItem>, transactions: InventoryTransaction[]) {
  const totalItems = Object.keys(items).length;
  const totalQuantity = Object.values(items).reduce((sum, item) => sum + item.quantidade, 0);
  const totalValue = Object.values(items).reduce((sum, item) => {
    const avgPrice = item.preco_medio || (item.preco_min + item.preco_max) / 2 || 0;
    return sum + (avgPrice * item.quantidade);
  }, 0);

  // Category breakdown
  const categorias: Record<string, { added: number; removed: number; net: number }> = {};
  
  // Recent transactions (last 50)
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  // Low stock alerts (items with quantity <= 10)
  const lowStockAlerts = Object.values(items).filter(item => item.quantidade <= 10 && item.ativo);

  // Price matches
  const priceMatches = Object.values(items).filter(item => item.preco_min && item.preco_max).length;
  const unmatchedItems = Object.values(items).filter(item => !item.preco_min && !item.preco_max).map(item => item.id);

  // Workers with activities
  const workerSet = new Set(transactions.map(t => t.autor));
  const workers = Array.from(workerSet).map(worker => ({
    nome: worker,
    totalTransactions: transactions.filter(t => t.autor === worker).length,
    lastActivity: transactions.filter(t => t.autor === worker).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0]?.timestamp || '',
    averagePerDay: 0 // Will be calculated based on date range
  }));

  return {
    totalItems,
    totalQuantity,
    totalValue,
    categorias,
    workers,
    recentTransactions,
    lowStockAlerts,
    priceMatches,
    unmatchedItems
  };
}

// GET - Retrieve inventory data for a specific firm
export async function GET(request: NextRequest, { params }: { params: { firmId: string } }) {
  try {
    const { firmId } = params;
    
    if (!firmId) {
      return withCors(NextResponse.json(
        { success: false, error: 'firmId is required' },
        { status: 400 }
      ));
    }
    
    const inventoryData = await readInventoryData(firmId);
    
    return withCors(NextResponse.json({
      success: true,
      data: inventoryData,
      firmId: firmId,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error reading inventory data:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to read inventory data' },
      { status: 500 }
    ));
  }
}

// POST - Add new inventory item
export async function POST(request: NextRequest, { params }: { params: { firmId: string } }) {
  try {
    const { firmId } = params;
    const body = await request.json();
    const { item } = body;
    
    if (!firmId || !item) {
      return withCors(NextResponse.json(
        { success: false, error: 'firmId and item data are required' },
        { status: 400 }
      ));
    }
    
    // Read current inventory data
    const inventoryData = await readInventoryData(firmId);
    
    // Create new item
    const newItem: InventoryItem = {
      id: item.id || item.nome || crypto.randomUUID(),
      nome: item.nome || '',
      displayName: item.displayName || item.nome || '',
      categoria: item.categoria || 'outros',
      quantidade: item.quantidade || 0,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      ultimo_autor: 'API',
      ativo: true,
      preco_min: item.preco_min,
      preco_max: item.preco_max,
      preco_medio: item.preco_medio,
      notas: item.notas,
      ...item
    };
    
    // Create transaction record
    const newTransaction: InventoryTransaction = {
      id: crypto.randomUUID(),
      itemId: newItem.id,
      tipo: 'criar',
      quantidade_anterior: 0,
      quantidade_posterior: newItem.quantidade,
      quantidade_mudanca: newItem.quantidade,
      autor: 'API',
      timestamp: new Date().toISOString(),
      origem: 'manual',
      detalhes: `Created item ${newItem.displayName}`
    };
    
    // Update inventory data
    const updatedItems = { ...inventoryData.items, [newItem.id]: newItem };
    const updatedTransactions = [...inventoryData.transactions, newTransaction];
    const updatedAnalytics = calculateAnalytics(updatedItems, updatedTransactions);
    
    const updatedInventoryData: InventoryData = {
      ...inventoryData,
      items: updatedItems,
      transactions: updatedTransactions,
      analytics: updatedAnalytics,
      totalItems: updatedAnalytics.totalItems,
      totalQuantity: updatedAnalytics.totalQuantity
    };
    
    // Save to file
    await writeInventoryData(firmId, updatedInventoryData);
    
    return withCors(NextResponse.json({
      success: true,
      message: 'Item added successfully',
      item: newItem,
      transaction: newTransaction,
      firmId: firmId,
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Error adding inventory item:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to add item' },
      { status: 500 }
    ));
  }
}

// PUT - Update existing inventory item
export async function PUT(request: NextRequest, { params }: { params: { firmId: string } }) {
  try {
    const { firmId } = params;
    const body = await request.json();
    const { itemId, updates } = body;
    
    if (!firmId || !itemId || !updates) {
      return withCors(NextResponse.json(
        { success: false, error: 'firmId, itemId, and updates are required' },
        { status: 400 }
      ));
    }
    
    // Read current inventory data
    const inventoryData = await readInventoryData(firmId);
    
    // Check if item exists
    const currentItem = inventoryData.items[itemId];
    if (!currentItem) {
      return withCors(NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      ));
    }
    
    // Create updated item
    const updatedItem: InventoryItem = {
      ...currentItem,
      ...updates,
      atualizado_em: new Date().toISOString(),
      ultimo_autor: 'API'
    };
    
    // Create transaction record
    const newTransaction: InventoryTransaction = {
      id: crypto.randomUUID(),
      itemId: itemId,
      tipo: 'editar',
      quantidade_anterior: currentItem.quantidade,
      quantidade_posterior: updatedItem.quantidade,
      quantidade_mudanca: updatedItem.quantidade - currentItem.quantidade,
      autor: 'API',
      timestamp: new Date().toISOString(),
      origem: 'manual',
      detalhes: `Updated item ${updatedItem.displayName}`
    };
    
    // Update inventory data
    const updatedItems = { ...inventoryData.items, [itemId]: updatedItem };
    const updatedTransactions = [...inventoryData.transactions, newTransaction];
    const updatedAnalytics = calculateAnalytics(updatedItems, updatedTransactions);
    
    const updatedInventoryData: InventoryData = {
      ...inventoryData,
      items: updatedItems,
      transactions: updatedTransactions,
      analytics: updatedAnalytics,
      totalItems: updatedAnalytics.totalItems,
      totalQuantity: updatedAnalytics.totalQuantity
    };
    
    // Save to file
    await writeInventoryData(firmId, updatedInventoryData);
    
    return withCors(NextResponse.json({
      success: true,
      message: 'Item updated successfully',
      item: updatedItem,
      transaction: newTransaction,
      firmId: firmId,
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to update item' },
      { status: 500 }
    ));
  }
}

// DELETE - Remove inventory item
export async function DELETE(request: NextRequest, { params }: { params: { firmId: string } }) {
  try {
    const { firmId } = params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    
    if (!firmId || !itemId) {
      return withCors(NextResponse.json(
        { success: false, error: 'firmId and itemId are required' },
        { status: 400 }
      ));
    }
    
    // Read current inventory data
    const inventoryData = await readInventoryData(firmId);
    
    // Check if item exists
    const currentItem = inventoryData.items[itemId];
    if (!currentItem) {
      return withCors(NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      ));
    }
    
    // Create transaction record
    const newTransaction: InventoryTransaction = {
      id: crypto.randomUUID(),
      itemId: itemId,
      tipo: 'deletar',
      quantidade_anterior: currentItem.quantidade,
      quantidade_posterior: 0,
      quantidade_mudanca: -currentItem.quantidade,
      autor: 'API',
      timestamp: new Date().toISOString(),
      origem: 'manual',
      detalhes: `Deleted item ${currentItem.displayName}`
    };
    
    // Update inventory data (remove item)
    const updatedItems = { ...inventoryData.items };
    delete updatedItems[itemId];
    const updatedTransactions = [...inventoryData.transactions, newTransaction];
    const updatedAnalytics = calculateAnalytics(updatedItems, updatedTransactions);
    
    const updatedInventoryData: InventoryData = {
      ...inventoryData,
      items: updatedItems,
      transactions: updatedTransactions,
      analytics: updatedAnalytics,
      totalItems: updatedAnalytics.totalItems,
      totalQuantity: updatedAnalytics.totalQuantity
    };
    
    // Save to file
    await writeInventoryData(firmId, updatedInventoryData);
    
    return withCors(NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
      deletedItem: currentItem,
      transaction: newTransaction,
      firmId: firmId,
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to delete item' },
      { status: 500 }
    ));
  }
}

export function OPTIONS(request: NextRequest) {
  return withCors(new Response(null, { status: 200 }));
}