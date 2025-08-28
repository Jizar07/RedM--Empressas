 import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import SSEManager from '../sse-manager';

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

    // Read existing messages
    const existingMessages = readMessages();
    const existingIds = new Set(existingMessages.map(msg => msg.id));

    // Simple deduplication based only on message ID and timestamp
    const newMessages = body.messages.filter(msg => {
      // Only check if we've seen this exact message ID before
      if (existingIds.has(msg.id)) {
        return false;
      }
      
      // Also check for same timestamp to catch rapid duplicates
      const msgTimestamp = new Date(msg.timestamp).getTime();
      const duplicateByTime = existingMessages.some(existing => 
        Math.abs(new Date(existing.timestamp).getTime() - msgTimestamp) < 1000 // Within 1 second
        && existing.author === msg.author
      );
      
      return !duplicateByTime;
    });
    
    if (newMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new messages to process',
        total: existingMessages.length
      });
    }

    // Merge with existing messages
    const allMessages = [...existingMessages, ...newMessages];
    
    // Keep only the most recent 1000 messages to prevent file from growing too large
    const recentMessages = allMessages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 1000);

    // Write to file
    writeMessages(recentMessages);

    console.log(`📝 Processed ${newMessages.length} new messages from channel ${body.channelId}`);

    // Create a simple notification mechanism using a timestamp file
    // This will allow the frontend to detect when new data is available
    const notificationFile = path.join(process.cwd(), 'public', 'last-update.json');
    try {
      const updateInfo = {
        lastUpdate: new Date().toISOString(),
        newMessages: newMessages.length,
        totalMessages: recentMessages.length,
        timestamp: Date.now() // Add timestamp for easier comparison
      };
      fs.writeFileSync(notificationFile, JSON.stringify(updateInfo));
      console.log('📡 Created update notification for frontend');
      
      // NOTIFY SSE CLIENTS IMMEDIATELY
      try {
        SSEManager.getInstance().notifyAll({
          type: 'new-messages',
          count: newMessages.length,
          total: recentMessages.length,
          timestamp: new Date().toISOString()
        });
        console.log(`🚀 Notified SSE clients of ${newMessages.length} new messages`);
      } catch (sseError) {
        console.error('Failed to notify SSE clients:', sseError);
      }
    } catch (error) {
      console.warn('Could not write notification file:', error);
    }

    return withCors(NextResponse.json({
      success: true,
      message: `Processed ${newMessages.length} new messages`,
      newMessages: newMessages.length,
      total: recentMessages.length,
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
    const caixaMatch = content.match(/REGISTRO - fazenda_86\s*CAIXA ORGANIZAÇÃO\s*-\s*(DEPÓSITO|SAQUE)(.+?)Autor:(.+?)\s*\|\s*FIXO:\s*(\d+)/s);
    if (caixaMatch) {
      const transactionType = caixaMatch[1].trim();
      const actionPart = caixaMatch[2].trim();
      const autor = caixaMatch[3].trim();
      
      if (transactionType === 'DEPÓSITO') {
        // Parse DEPÓSITO (deposit money) - with "Ação:" (for sales/actions)
        const depositWithActionMatch = actionPart.match(/Valor depositado:\s*\$([0-9,.]+)\s*Ação:(.+?)Saldo após depósito:\s*\$([0-9,.]+)/);
        if (depositWithActionMatch) {
          const valor = parseFloat(depositWithActionMatch[1].replace(',', ''));
          const acao = depositWithActionMatch[2].trim();
          const saldo = parseFloat(depositWithActionMatch[3].replace(',', ''));
          
          return {
            ...message,
            parseSuccess: true,
            tipo: 'venda',
            categoria: 'financeiro',
            valor: valor,
            autor: autor,
            descricao: acao,
            displayText: `${autor} ${acao} por $${valor.toFixed(2)}`,
            confidence: 'high'
          };
        }
      } else if (transactionType === 'SAQUE') {
        // Parse SAQUE (withdraw money)
        const withdrawMatch = actionPart.match(/Valor sacado:\s*\$([0-9,.]+).*?Saldo após saque:\s*\$([0-9,.]+)/s);
        if (withdrawMatch) {
          const valor = parseFloat(withdrawMatch[1].replace(',', ''));
          const saldo = parseFloat(withdrawMatch[3].replace(',', ''));
          
          return {
            ...message,
            parseSuccess: true,
            tipo: 'saque',
            categoria: 'financeiro',
            valor: valor,
            autor: autor,
            descricao: `Saque de $${valor.toFixed(2)}`,
            displayText: `${autor} sacou $${valor.toFixed(2)} do caixa`,
            confidence: 'high'
          };
        }
      }
    }
    
    // Then try BAÚ messages (inventory) - they have "Autor:" field
    const spideyBotMatch = content.match(/REGISTRO - fazenda_86(.+?)Autor:(.+?)\s*\|\s*FIXO:\s*(\d+)/s);
    if (spideyBotMatch) {
      const actionPart = spideyBotMatch[1].trim();
      const autor = spideyBotMatch[2].trim();
      
      // Parse INSERIR ITEM (add item)
      const addMatch = actionPart.match(/INSERIR ITEM\s*Item adicionado:\s*(.+?)\s*x(\d+)/);
      if (addMatch) {
        return {
          ...message,
          parseSuccess: true,
          tipo: 'adicionar',
          categoria: 'inventario',
          item: addMatch[1].trim(),
          quantidade: parseInt(addMatch[2]),
          autor: autor,
          displayText: `${autor} adicionou ${addMatch[2]}x ${addMatch[1]}`
        };
      }
      
      // Parse REMOVER ITEM (remove item)  
      const removeMatch = actionPart.match(/REMOVER ITEM\s*Item removido:\s*(.+?)\s*x(\d+)/);
      if (removeMatch) {
        return {
          ...message,
          parseSuccess: true,
          tipo: 'remover',
          categoria: 'inventario',
          item: removeMatch[1].trim(),
          quantidade: parseInt(removeMatch[2]),
          autor: autor,
          displayText: `${autor} removeu ${removeMatch[2]}x ${removeMatch[1]}`
        };
      }
    }
    
    // Try to parse other message formats (fallback patterns)
    const itemAddPattern = /(?:Item adicionado|adicionou):\s*(.+?)\s*x(\d+)/i;
    const itemRemovePattern = /(?:Item removido|removeu):\s*(.+?)\s*x(\d+)/i;
    const moneyPattern = /\$([0-9,.]+)/;
    
    const addMatch = content.match(itemAddPattern);
    if (addMatch) {
      return {
        ...message,
        parseSuccess: true,
        tipo: 'adicionar',
        categoria: 'inventario',
        item: addMatch[1].trim(),
        quantidade: parseInt(addMatch[2]),
        autor: message.author || 'Sistema',
        displayText: `${message.author} adicionou ${addMatch[2]}x ${addMatch[1]}`,
      };
    }
    
    const removeMatch = content.match(itemRemovePattern);
    if (removeMatch) {
      return {
        ...message,
        parseSuccess: true,
        tipo: 'remover',
        categoria: 'inventario',
        item: removeMatch[1].trim(),
        quantidade: parseInt(removeMatch[2]),
        autor: message.author || 'Sistema',
        displayText: `${message.author} removeu ${removeMatch[2]}x ${removeMatch[1]}`,
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
    const messages = readMessages();
    
    // Parse all messages and return parsed activities
    const parsedMessages = messages.map(parseDiscordMessage);
    
    console.log(`📊 Parsed ${parsedMessages.length} messages, ${parsedMessages.filter(m => m.parseSuccess).length} successfully parsed`);
    
    return withCors(NextResponse.json({
      success: true,
      messages: parsedMessages,
      total: parsedMessages.length,
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