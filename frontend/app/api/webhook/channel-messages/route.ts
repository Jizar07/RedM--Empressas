 import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import SSEManager from '../sse-manager';
import ChannelMessageManager from '../../../../lib/ChannelMessageManager';

// Process worker activity by sending to bot via HTTP
async function processWorkerActivity(parsedMessage: any) {
  try {
    // Extract worker transaction data
    const transactionData = extractWorkerTransactionData(parsedMessage);
    if (!transactionData) {
      return;
    }

    console.log(`🔄 Sending worker activity to bot: ${transactionData.workerName} - ${transactionData.type}`);
    
    const authToken = process.env.BOT_WEBHOOK_TOKEN || process.env.DISCORD_TOKEN || 'default-token';
    console.log(`🔐 Frontend Auth Debug - Sending token: "${authToken.substring(0, 10)}..."`);
    console.log(`🔐 Frontend Auth Debug - BOT_WEBHOOK_TOKEN exists: ${!!process.env.BOT_WEBHOOK_TOKEN}`);
    console.log(`🔐 Frontend Auth Debug - DISCORD_TOKEN exists: ${!!process.env.DISCORD_TOKEN}`);

    // Send to bot's worker activity endpoint
    const response = await fetch('http://localhost:3050/api/worker-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bot-Token': authToken
      },
      body: JSON.stringify(transactionData)
    });

    if (response.ok) {
      console.log(`✅ Worker activity processed successfully for ${transactionData.workerName}`);
    } else {
      console.error(`❌ Failed to process worker activity: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ Error processing worker activity:', error);
  }
}

// Extract worker transaction data from parsed message
function extractWorkerTransactionData(parsedMessage: any): any {
  try {
    console.log(`🔍 Checking message for worker activity:`, {
      parseSuccess: parsedMessage.parseSuccess,
      categoria: parsedMessage.categoria,
      tipo: parsedMessage.tipo,
      autor: parsedMessage.autor,
      item: parsedMessage.item,
      quantidade: parsedMessage.quantidade,
      content: parsedMessage.content?.substring(0, 100) + '...'
    });
    // Handle animal deliveries
    if (parsedMessage.parseSuccess && parsedMessage.tipo === 'venda' && 
        parsedMessage.descricao && parsedMessage.descricao.includes('vendeu') && 
        parsedMessage.descricao.includes('animais') && parsedMessage.descricao.includes('matadouro')) {
      
      const workerName = parsedMessage.autor;
      const quantityMatch = parsedMessage.descricao.match(/vendeu\s+(\d+)\s+animais/);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 4;
      const amount = parsedMessage.valor || 0;

      return {
        workerName,
        type: 'animal_delivery',
        quantity,
        amount,
        timestamp: parsedMessage.timestamp || new Date().toISOString(),
        originalMessage: parsedMessage
      };
    }

    // Handle plant deposits
    if (parsedMessage.parseSuccess && parsedMessage.categoria === 'financeiro' && 
        parsedMessage.tipo === 'deposito') {
      
      const content = parsedMessage.content || '';
      const plantDepositPattern = /(.+?)\s+depositou\s+(\d+)\s+(.+?)\s+no\s+inventário|(.+?)\s+depositou\s+(\d+)\s+(milho|trigo|junco|milhos|trigos|juncos)/i;
      const match = content.match(plantDepositPattern);
      
      if (match) {
        const workerName = match[1] || match[4] || parsedMessage.autor;
        const quantity = parseInt(match[2] || match[5]);
        const itemName = match[3] || match[6];

        return {
          workerName,
          type: 'plant_deposited',
          itemName: normalizeItemName(itemName),
          quantity,
          timestamp: parsedMessage.timestamp || new Date().toISOString(),
          originalMessage: parsedMessage
        };
      }
    }

    // Handle seed withdrawals - check both inventario and estoque categories
    if (parsedMessage.parseSuccess && (parsedMessage.categoria === 'estoque' || parsedMessage.categoria === 'inventario')) {
      console.log(`✅ Message qualifies for seed withdrawal check - categoria: ${parsedMessage.categoria}`);
      
      // First try to use the parsed message fields directly (for "REMOVER ITEM" messages)
      if (parsedMessage.tipo === 'remover' && parsedMessage.autor && parsedMessage.item && parsedMessage.quantidade) {
        const itemName = parsedMessage.item;
        console.log(`🔍 Checking parsed fields - item: "${itemName}"`);
        
        // Check if the item is a seed type
        if (itemName && (itemName.toLowerCase().includes('semente') || itemName.toLowerCase().includes('seed'))) {
          console.log(`🌱 SEED WITHDRAWAL DETECTED via parsed fields: ${parsedMessage.autor} took ${parsedMessage.quantidade}x ${itemName}`);
          return {
            workerName: parsedMessage.autor,
            type: 'seed_taken',
            itemName: normalizeItemName(itemName),
            quantity: parsedMessage.quantidade,
            timestamp: parsedMessage.timestamp || new Date().toISOString(),
            originalMessage: parsedMessage
          };
        } else {
          console.log(`❌ Item "${itemName}" is not a seed type`);
        }
      } else {
        console.log(`❌ Parsed fields incomplete - tipo: ${parsedMessage.tipo}, autor: ${parsedMessage.autor}, item: ${parsedMessage.item}, quantidade: ${parsedMessage.quantidade}`);
      }

      // Fallback to content pattern matching
      const content = parsedMessage.content || '';
      console.log(`🔍 Trying pattern matching on content: "${content.substring(0, 150)}"`);
      
      const seedWithdrawPatterns = [
        // Pattern 1: "Jizar Stoffeliz removeu 100x Semente de Trigo"
        /(.+?)\s+removeu\s+(\d+)x?\s+(semente[^,]*|seed[^,]*)/i,
        // Pattern 2: Original pattern
        /(.+?)\s+retirou\s+(\d+)\s+(sementes?\s+de\s+\w+|\w+\s+sementes?)/i,
        // Pattern 3: "Jizar Stoffeliz retirou 100 Sementes de Trigo"
        /(.+?)\s+retirou\s+(\d+)\s+(semente[^,]*|seed[^,]*)/i
      ];
      
      for (let i = 0; i < seedWithdrawPatterns.length; i++) {
        const pattern = seedWithdrawPatterns[i];
        const match = content.match(pattern);
        console.log(`🔍 Pattern ${i + 1} test:`, match ? `MATCH - ${match[0]}` : 'NO MATCH');
        
        if (match) {
          const workerName = match[1].trim();
          const quantity = parseInt(match[2]);
          const itemName = match[3];
          console.log(`🌱 SEED WITHDRAWAL DETECTED via pattern ${i + 1}: ${workerName} took ${quantity}x ${itemName}`);

          return {
            workerName,
            type: 'seed_taken',
            itemName: normalizeItemName(itemName),
            quantity,
            timestamp: parsedMessage.timestamp || new Date().toISOString(),
            originalMessage: parsedMessage
          };
        }
      }
      console.log(`❌ No seed withdrawal patterns matched`);
    } else {
      console.log(`❌ Message doesn't qualify for seed withdrawal check - parseSuccess: ${parsedMessage.parseSuccess}, categoria: ${parsedMessage.categoria}`);
    }

    return null;
  } catch (error) {
    console.error('❌ Error extracting worker transaction data:', error);
    return null;
  }
}

// Normalize item names
function normalizeItemName(itemName: string): string {
  return itemName
    .replace(/^[:;\s]+|[:;\s]+$/g, '') // Remove leading/trailing colons, semicolons, and whitespace
    .replace(/sementes?\s+de\s+/gi, '')
    .replace(/\s+sementes?/gi, '')
    .replace(/s$/, '') // Remove plural 's'
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase()
    .replace(/^./, c => c.toUpperCase()); // Capitalize first letter
}

// Enhanced item name cleaning specifically for Berçário/Veterinária items
function cleanBercarioItemName(itemName: string): string {
  return itemName
    .replace(/^[:;\s]+|[:;\s]+$/g, '') // Remove leading/trailing punctuation and whitespace
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Disable static generation for this API route
export const dynamic = 'force-dynamic';

interface MessageData {
  id: string;
  timestamp: string;
  discordTimestamp?: string;
  author: string;
  content: string;
  channelId: string;
  source: string;
}

interface WebhookPayload {
  channelId: string;
  messages: MessageData[];
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Origin, Accept',
  'Access-Control-Max-Age': '86400',
};

function withCors(response: Response) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Store messages in a JSON file in the public directory
const MESSAGES_FILE = path.join(process.cwd(), 'public', 'discord-messages.json');

// Ensure the public directory exists
function ensurePublicDirectory() {
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
}

// Read existing messages from file
function readMessages(): MessageData[] {
  try {
    ensurePublicDirectory();
    
    if (!fs.existsSync(MESSAGES_FILE)) {
      return [];
    }
    
    const fileContent = fs.readFileSync(MESSAGES_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data.messages) ? data.messages : [];
  } catch (error) {
    console.error('Error reading messages file:', error);
    return [];
  }
}

// Write messages to file
function writeMessages(messages: MessageData[]) {
  try {
    ensurePublicDirectory();
    
    const data = {
      lastUpdated: new Date().toISOString(),
      totalMessages: messages.length,
      messages: messages
    };
    
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Saved ${messages.length} messages to discord-messages.json`);
  } catch (error) {
    console.error('Error writing messages file:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: WebhookPayload = await request.json();
    
    if (!body.channelId || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload format' },
        { status: 400 }
      );
    }

    const channelManager = new ChannelMessageManager();
    let processedCount = 0;

    // Process each message individually through the channel manager
    for (const message of body.messages) {
      try {
        console.log(`🔍 Processing message ${message.id} for channel ${message.channelId}`);
        console.log(`📝 Message content: ${message.content.substring(0, 200)}`);
        
        // Convert message to the format expected by ChannelMessageManager
        const discordMessage = {
          ...message,
          embedContent: message.content, // Preserve original content
          rawEmbeds: [] // Initialize empty embeds array
        };
        
        await channelManager.addMessage(discordMessage);
        
        // Parse message for worker activities
        const parsedMessage = parseDiscordMessage(message);
        if (parsedMessage.parseSuccess) {
          console.log(`📊 Parsed message: ${parsedMessage.tipo} - ${parsedMessage.displayText}`);
          
          // Check if this is a worker activity that should be tracked
          await processWorkerActivity(parsedMessage);
        }
        
        console.log(`✅ Successfully saved message ${message.id}`);
        processedCount++;
      } catch (error) {
        console.error(`❌ Failed to process message ${message.id}:`, error);
      }
    }

    // Get channel statistics for the response
    const channelMessages = await channelManager.getChannelMessages(body.channelId);
    const totalMessages = channelMessages.length;

    console.log(`📝 Processed ${processedCount} messages from channel ${body.channelId}, total in channel: ${totalMessages}`);

    // Create a simple notification mechanism using a timestamp file
    const notificationFile = path.join(process.cwd(), 'public', 'last-update.json');
    try {
      const updateInfo = {
        lastUpdate: new Date().toISOString(),
        newMessages: processedCount,
        totalMessages: totalMessages,
        channelId: body.channelId,
        timestamp: Date.now()
      };
      fs.writeFileSync(notificationFile, JSON.stringify(updateInfo));
      console.log('📡 Created update notification for frontend');
      
      // NOTIFY SSE CLIENTS IMMEDIATELY
      try {
        SSEManager.getInstance().notifyAll({
          type: 'new-messages',
          count: processedCount,
          total: totalMessages,
          channelId: body.channelId,
          timestamp: new Date().toISOString()
        });
        console.log(`🚀 Notified SSE clients of ${processedCount} new messages in channel ${body.channelId}`);
      } catch (sseError) {
        console.error('Failed to notify SSE clients:', sseError);
      }
    } catch (error) {
      console.warn('Could not write notification file:', error);
    }

    return withCors(NextResponse.json({
      success: true,
      message: `Processed ${processedCount} messages`,
      newMessages: processedCount,
      total: totalMessages,
      channelId: body.channelId,
      lastUpdate: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error processing webhook:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

export function OPTIONS(request: NextRequest) {
  return withCors(new Response(null, { status: 200 }));
}

// Discord message parser - converts raw messages to activity data
function parseDiscordMessage(message: MessageData): any {
  try {
    const content = message.content.trim();
    
    
    // Parse Spidey Bot messages for farm activities
    // Try CAIXA messages first (deposits/withdrawals) - they don't have "Autor:" field
    const caixaMatch = content.match(/REGISTRO - REGISTRO - fazenda_\d+\s*CAIXA ORGANIZAÇÃO - (DEPÓSITO|SAQUE)\s*(.+?)Data::/s);
    if (caixaMatch) {
      const transactionType = caixaMatch[1].trim();
      const actionPart = caixaMatch[2].trim();
      
      if (transactionType === 'DEPÓSITO') {
        // Parse DEPÓSITO (deposit money) - with "Ação::" (for sales/actions)
        const depositWithActionMatch = actionPart.match(/Valor depositado::\s*\$([0-9,.]+)\s*Ação::\s*(.+?)\s*Saldo após depósito::\s*\$([0-9,.]+)/s);
        if (depositWithActionMatch) {
          const valor = parseFloat(depositWithActionMatch[1].replace(',', ''));
          const acao = depositWithActionMatch[2].trim();
          const saldo = parseFloat(depositWithActionMatch[3].replace(',', ''));
          
          // Extract worker name from action like "BONNIE BENNETT vendeu 4 animais no matadouro"
          const vendeuMatch = acao.match(/^(.+?)\s+vendeu\s+(\d+)\s+animais\s+no\s+matadouro/);
          if (vendeuMatch) {
            const workerName = vendeuMatch[1].trim();
            const quantidade = vendeuMatch[2];
            
            return {
              ...message,
              parseSuccess: true,
              tipo: 'venda',
              categoria: 'financeiro',
              valor: valor,
              autor: workerName,
              descricao: `vendeu ${quantidade} animais no matadouro`,
              displayText: `${workerName} vendeu ${quantidade} animais no matadouro por $${valor.toFixed(2)}`,
              confidence: 'high'
            };
          }
          
          return {
            ...message,
            parseSuccess: true,
            tipo: 'venda',
            categoria: 'financeiro',
            valor: valor,
            autor: workerName,
            descricao: `vendeu ${quantidade} animais no matadouro`,
            displayText: `${workerName} vendeu ${quantidade} animais no matadouro por $${valor.toFixed(2)}`,
            confidence: 'high'
          };
        }
        
        // Try direct deposit pattern (no "Ação:" field)
        const directDepositMatch = actionPart.match(/Valor depositado::\s*\$([0-9,.]+)\s*Autor::\s*(.+?)\s*\|\s*FIXO:\s*\d+\s*Saldo após depósito::\s*\$([0-9,.]+)/s);
        if (directDepositMatch) {
          const valor = parseFloat(directDepositMatch[1].replace(',', ''));
          const autor = directDepositMatch[2].trim();
          const saldo = parseFloat(directDepositMatch[3].replace(',', ''));
          
          return {
            ...message,
            parseSuccess: true,
            tipo: 'deposito',
            categoria: 'financeiro',
            valor: valor,
            autor: autor,
            descricao: `Depósito direto`,
            displayText: `${autor} depositou $${valor.toFixed(2)}`,
            confidence: 'high'
          };
        }
      } else if (transactionType === 'SAQUE') {
        // Parse SAQUE (withdraw money)
        const withdrawMatch = actionPart.match(/Valor sacado::\s*\$([0-9,.]+)\s*Autor::\s*(.+?)\s*\|\s*FIXO:\s*\d+\s*Saldo após saque::\s*\$([0-9,.]+)/s);
        if (withdrawMatch) {
          const valor = parseFloat(withdrawMatch[1].replace(',', ''));
          const autor = withdrawMatch[2].trim();
          const saldo = parseFloat(withdrawMatch[3].replace(',', ''));
          
          return {
            ...message,
            parseSuccess: true,
            tipo: 'saque',
            categoria: 'financeiro',
            valor: valor,
            autor: autor,
            descricao: `Saque direto`,
            displayText: `${autor} sacou $${valor.toFixed(2)}`,
            confidence: 'high'
          };
        }
      }
    }
    
    // Then try BAÚ messages (inventory) - they have "Autor::" field
    const spideyBotMatch = content.match(/REGISTRO - REGISTRO - fazenda_\d+(.+?)Autor::\s*(.+?)\s*\|\s*FIXO:\s*(\d+)/s);
    if (spideyBotMatch) {
      const actionPart = spideyBotMatch[1].trim();
      const autor = spideyBotMatch[2].trim();
      
      // Parse INSERIR ITEM (add item)
      const addMatch = actionPart.match(/INSERIR ITEM\s*Item adicionado::?\s*\n?\s*(.+?)\s*x(\d+)/s);
      if (addMatch) {
        const cleanItem = cleanBercarioItemName(addMatch[1]);

        // Check if this is a box item for supply chain tracking
        const isBoxItem = cleanItem.toLowerCase().includes('caixa');
        const boxType = cleanItem.toLowerCase().includes('verdura') ? 'verduras' :
                       cleanItem.toLowerCase().includes('agro') || cleanItem.toLowerCase().includes('animal') ? 'agro' : null;

        return {
          ...message,
          parseSuccess: true,
          tipo: 'adicionar',
          categoria: 'inventario',
          item: cleanItem,
          quantidade: parseInt(addMatch[2]),
          autor: autor,
          displayText: `${autor} adicionou ${addMatch[2]}x ${cleanItem}`,
          // Box tracking fields
          isBoxItem: isBoxItem,
          boxType: boxType,
          isBoxAddition: isBoxItem
        };
      }

      // Parse REMOVER ITEM (remove item)
      const removeMatch = actionPart.match(/REMOVER ITEM\s*Item removido::?\s*\n?\s*(.+?)\s*x(\d+)/s);
      if (removeMatch) {
        const cleanItem = cleanBercarioItemName(removeMatch[1]);

        // Check if this is a box item for supply chain tracking
        const isBoxItem = cleanItem.toLowerCase().includes('caixa');
        const boxType = cleanItem.toLowerCase().includes('verdura') ? 'verduras' :
                       cleanItem.toLowerCase().includes('agro') || cleanItem.toLowerCase().includes('animal') ? 'agro' : null;

        return {
          ...message,
          parseSuccess: true,
          tipo: 'remover',
          categoria: 'inventario',
          item: cleanItem,
          quantidade: parseInt(removeMatch[2]),
          autor: autor,
          displayText: `${autor} removeu ${removeMatch[2]}x ${cleanItem}`,
          // Box tracking fields
          isBoxItem: isBoxItem,
          boxType: boxType,
          isBoxRemoval: isBoxItem
        };
      }
    }
    
    // Parse BERÇÁRIO/VETERINÁRIA inventory management (Mover Item para Loja)
    const bercarioInventoryMatch = content.match(/REGISTRO - REGISTRO - (?:Berçário e Veterinária|Berçário)\s+(.+?)\s*Mover Item para Loja\s*Item adicionado::\s*(.+?)\s*x(\d+)\s*Autor::\s*(.+?)\s*\|\s*FIXO:\s*(\d+)/s);
    if (bercarioInventoryMatch) {
      const empresa = bercarioInventoryMatch[1].trim(); // "Bowdin" etc
      const item = cleanBercarioItemName(bercarioInventoryMatch[2]);
      const quantidade = parseInt(bercarioInventoryMatch[3]);
      const autor = bercarioInventoryMatch[4].trim();

      return {
        ...message,
        parseSuccess: true,
        tipo: 'adicionar',
        categoria: 'inventario',
        item: item,
        quantidade: quantidade,
        autor: autor,
        empresa: empresa,
        descricao: `Adicionou ${quantidade}x ${item} para a loja`,
        displayText: `${autor} adicionou ${quantidade}x ${item}`,
        confidence: 'high'
      };
    }

    // Parse BERÇÁRIO/VETERINÁRIA inventory removal
    const bercarioRemovalMatch = content.match(/REGISTRO - REGISTRO - (?:Berçário e Veterinária|Berçário)\s+(.+?)\s*Mover Item para Loja\s*Item removido::\s*(.+?)\s*x(\d+)\s*Autor::\s*(.+?)\s*\|\s*FIXO:\s*(\d+)/s);
    if (bercarioRemovalMatch) {
      const empresa = bercarioRemovalMatch[1].trim(); // "Bowdin" etc
      const item = cleanBercarioItemName(bercarioRemovalMatch[2]);
      const quantidade = parseInt(bercarioRemovalMatch[3]);
      const autor = bercarioRemovalMatch[4].trim();

      return {
        ...message,
        parseSuccess: true,
        tipo: 'remover',
        categoria: 'inventario',
        item: item,
        quantidade: quantidade,
        autor: autor,
        empresa: empresa,
        descricao: `Removeu ${quantidade}x ${item} da loja`,
        displayText: `${autor} removeu ${quantidade}x ${item}`,
        confidence: 'high'
      };
    }

    // Parse BERÇARIO BRAITHWHAITE shop purchases (Compra na Loja)
    const shopPurchaseMatch = content.match(/REGISTRO - BERÇARIO BRAITHWHAITE(.+?)Compra na Loja\s*Item Comprado:\s*(.+?)\s*x(\d+)\s*Comprador:\s*(.+?)\s*\|\s*FIXO:\s*(\d+)\s*Preço Total:\s*\$([0-9,.]+)/s);
    if (shopPurchaseMatch) {
      const item = shopPurchaseMatch[2].trim();
      const quantidade = parseInt(shopPurchaseMatch[3]);
      const comprador = shopPurchaseMatch[4].trim();
      const preco = parseFloat(shopPurchaseMatch[6].replace(',', ''));

      return {
        ...message,
        parseSuccess: true,
        tipo: 'compra',
        categoria: 'financeiro',
        item: item,
        quantidade: quantidade,
        valor: preco,
        autor: comprador,
        descricao: `Comprou ${quantidade}x ${item} na loja`,
        displayText: `${comprador} comprou ${quantidade}x ${item} por $${preco.toFixed(2)}`,
        confidence: 'high'
      };
    }
    
    // Parse FERROVIA ATLANTA TREM messages
    // Pattern 1: COOPERATIVA - SACOU (Money Withdrawal)
    const ferroviaWithdrawMatch = content.match(/ATLANTA TREM\s*COOPERATIVA - SACOU\s*Empresa::\s*(.+?)\s*Ação::\s*(.+?)\s*Quantia::\s*([0-9,.]+)\s*Autor::\s*(.+?)\s*\|\s*FIXO:\s*(\d+)/s);
    if (ferroviaWithdrawMatch) {
      const empresa = ferroviaWithdrawMatch[1].trim();
      const acao = ferroviaWithdrawMatch[2].trim();
      const quantia = parseFloat(ferroviaWithdrawMatch[3].replace(',', ''));
      const autorCompleto = ferroviaWithdrawMatch[4].trim();
      
      return {
        ...message,
        parseSuccess: true,
        tipo: 'saque',
        categoria: 'financeiro',
        valor: quantia,
        autor: autorCompleto,
        empresa: empresa,
        descricao: `Saque da cooperativa`,
        displayText: `${autorCompleto} sacou $${quantia.toFixed(2)}`,
        confidence: 'high'
      };
    }
    
    // Pattern 2: ENTREGA COMPLETA - ROTAS (Route Completion)
    const ferroviaRouteMatch = content.match(/ATLANTA TREM\s*ENTREGA COMPLETA - \d+ ROTAS\s*Empresa::\s*(.+?)\s*Missão::\s*(\d+)\s*Entregas Completadas::\s*(\d+)\s*Recompensa::\s*([0-9,.]+)\s*Autor::\s*(.+?)\s*\|\s*FIXO:\s*(\d+)/s);
    if (ferroviaRouteMatch) {
      const empresa = ferroviaRouteMatch[1].trim();
      const missao = parseInt(ferroviaRouteMatch[2]);
      const entregas = parseInt(ferroviaRouteMatch[3]);
      const recompensa = parseFloat(ferroviaRouteMatch[4].replace(',', ''));
      const autorCompleto = ferroviaRouteMatch[5].trim();
      
      // Calculate boxes from payment - Recompensa is the payment amount, not box count
      const boxesDelivered = recompensa / 4; // $4 per box, so payment ÷ 4 = boxes delivered
      const expectedPayment = Math.floor(boxesDelivered / 250) * 1000; // Every 250 boxes = $1000
      const workerEarnings = boxesDelivered * 1; // $1 per box delivered
      
      return {
        ...message,
        parseSuccess: true,
        tipo: 'entrega',
        categoria: 'inventario', // Change to inventario to show in items activities
        valor: recompensa,
        quantidade: boxesDelivered, // Use calculated boxes for display
        item: `Entrega de ${boxesDelivered} caixas`,
        autor: autorCompleto,
        empresa: empresa,
        missao: missao,
        descricao: `Completou missão ${missao} (${boxesDelivered} caixas entregues)`,
        displayText: `${autorCompleto} completou missão ${missao} (${boxesDelivered} caixas entregues)`,
        confidence: 'high',
        // Supply chain tracking fields - use calculated boxes from Recompensa payment
        isDeliveryCompletion: true,
        deliveryCount: boxesDelivered, // Use calculated boxes
        boxesDelivered: boxesDelivered,
        workerEarnings: workerEarnings,
        expectedPayment: expectedPayment
      };
    }
    
    // Try to parse other message formats (fallback patterns)
    const itemAddPattern = /(?:Item adicionado|adicionou):\s*(.+?)\s*x(\d+)/i;
    const itemRemovePattern = /(?:Item removido|Item Retirado|removeu):\s*(.+?)\s*x(\d+)/i;
    const moneyPattern = /\$([0-9,.]+)/;
    
    const addMatch = content.match(itemAddPattern);
    if (addMatch) {
      const cleanItem = cleanBercarioItemName(addMatch[1]);
      return {
        ...message,
        parseSuccess: true,
        tipo: 'adicionar',
        categoria: 'inventario',
        item: cleanItem,
        quantidade: parseInt(addMatch[2]),
        autor: message.author || 'Sistema',
        displayText: `${message.author} adicionou ${addMatch[2]}x ${cleanItem}`,
      };
    }

    const removeMatch = content.match(itemRemovePattern);
    if (removeMatch) {
      const cleanItem = cleanBercarioItemName(removeMatch[1]);
      return {
        ...message,
        parseSuccess: true,
        tipo: 'remover',
        categoria: 'inventario',
        item: cleanItem,
        quantidade: parseInt(removeMatch[2]),
        autor: message.author || 'Sistema',
        displayText: `${message.author} removeu ${removeMatch[2]}x ${cleanItem}`,
      };
    }
    
    // Parse SAQUE (withdrawal) messages - format: Zero Bala sacou $2000 do caixa
    if (content.includes('SAQUE') && content.includes('Valor sacado:')) {
      const valorMatch = content.match(/Valor sacado:\s*\$([0-9,.]+)/);
      const autorMatch = content.match(/Autor:(.+?)\s*\|/);
      
      if (valorMatch && autorMatch) {
        const valor = parseFloat(valorMatch[1].replace(',', ''));
        const autorSaque = autorMatch[1].trim();
        
        return {
          ...message,
          parseSuccess: true,
          tipo: 'saque',
          categoria: 'financeiro',
          valor: valor,
          autor: autorSaque,
          descricao: `Saque de $${valor.toFixed(2)}`,
          displayText: `sacou do caixa`
        };
      }
    }
    
    // Parse DEPÓSITO (deposit) messages - format: jack sparrow vendeu 4 animais no matadouro por $160
    if (content.includes('DEPÓSITO') && content.includes('Valor depositado:')) {
      const valorMatch = content.match(/Valor depositado:\s*\$([0-9,.]+)/);
      const acaoMatch = content.match(/Ação:(.+?)Saldo após depósito:/);
      
      if (valorMatch && acaoMatch) {
        const valor = parseFloat(valorMatch[1].replace(',', ''));
        const acao = acaoMatch[1].trim();
        
        // Extract author from action "jack sparrow vendeu 4 animais no matadouro"
        const vendeuMatch = acao.match(/^(.+?)\s+vendeu\s+(\d+)\s+animais\s+no\s+matadouro/);
        if (vendeuMatch) {
          const autorDeposito = vendeuMatch[1].trim();
          const quantidade = vendeuMatch[2];
          
          return {
            ...message,
            parseSuccess: true,
            tipo: 'deposito',
            categoria: 'financeiro',
            valor: valor,
            autor: autorDeposito,
            descricao: `Vendeu ${quantidade} animais no matadouro`,
            displayText: `vendeu ${quantidade} animais no matadouro por`
          };
        }
        
        // Fallback for other deposit actions
        return {
          ...message,
          parseSuccess: true,
          tipo: 'deposito',
          categoria: 'financeiro',
          valor: valor,
          autor: 'Sistema',
          descricao: acao,
          displayText: `Sistema depositou $${valor.toFixed(2)} no caixa`
        };
      }
    }

    const moneyMatch = content.match(moneyPattern);
    if (moneyMatch && (content.toLowerCase().includes('deposit') || content.toLowerCase().includes('saque') || content.toLowerCase().includes('vendeu'))) {
      const valor = parseFloat(moneyMatch[1].replace(',', ''));
      return {
        ...message,
        parseSuccess: true,
        tipo: content.toLowerCase().includes('saque') ? 'saque' : 'deposito',
        categoria: 'financeiro',
        valor: valor,
        autor: message.author || 'Sistema',
        displayText: content.substring(0, 100),
      };
    }
    
    // Return unparsed message
    return {
      ...message,
      parseSuccess: false,
      categoria: 'sistema',
      displayText: content.substring(0, 100)
    };
    
  } catch (error) {
    console.error('Parse error:', error);
    return {
      ...message,
      parseSuccess: false,
      categoria: 'sistema',
      displayText: message.content.substring(0, 100)
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    
    const channelManager = new ChannelMessageManager();
    let messages;
    
    if (channelId) {
      messages = await channelManager.getChannelMessages(channelId);
      console.log(`🔍 Found ${messages.length} messages for channel ${channelId}`);
    } else {
      messages = await channelManager.getAllMessages();
      console.log(`🔍 Found ${messages.length} messages across all channels`);
    }
    
    // Parse filtered messages and return parsed activities
    const parsedMessages = messages.map(parseDiscordMessage);
    
    console.log(`📊 Parsed ${parsedMessages.length} messages, ${parsedMessages.filter(m => m.parseSuccess).length} successfully parsed`);
    
    return withCors(NextResponse.json({
      success: true,
      messages: parsedMessages,
      total: parsedMessages.length,
      channelId: channelId || 'all',
      lastUpdated: messages.length > 0 ? messages[0]?.timestamp : null,
      parsed: parsedMessages.filter(m => m.parseSuccess).length
    }));

  } catch (error) {
    console.error('Error reading messages:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to read messages' },
      { status: 500 }
    ));
  }
}