import { Client, TextChannel, GatewayIntentBits, Partials, Collection, Message } from 'discord.js';
import { promises as fs } from 'fs';
import path from 'path';
import { FarmMessageParser, ParsedActivity } from '../src/services/FarmMessageParser';
import config from '../src/config/config';

// Interface for worker activity tracking
interface WorkerActivity {
  workerName: string;
  plantsDeposited: { [itemName: string]: number };
  plantsTakenOut: { [itemName: string]: number };
  boxesDeposited: { [itemName: string]: number };
  boxesTakenOut: { [itemName: string]: number };
  moneyDeposited: { amount: number; timestamp: Date; description: string }[];
  moneyTakenOut: { amount: number; timestamp: Date; description: string }[];
  miscItemsTakenOut: { [itemName: string]: number };
  totalTransactions: number;
}

// Interface for detailed transaction record
interface TransactionRecord {
  workerName: string;
  transactionType: 'Deposit' | 'Withdrawal';
  category: 'Plants' | 'Boxes' | 'Money' | 'Miscellaneous';
  itemName: string;
  quantity: number;
  amount: number;
  timestamp: Date;
  messageContent: string;
  confidence: string;
}

class ChannelExporter {
  private client: Client;
  private channelId: string;
  private parser: FarmMessageParser;
  private workerActivities: Map<string, WorkerActivity> = new Map();
  private detailedRecords: TransactionRecord[] = [];
  private fromDate: Date;
  private toDate: Date;

  constructor(channelId: string, fromDate: Date, toDate: Date) {
    this.channelId = channelId;
    this.fromDate = fromDate;
    this.toDate = toDate;
    this.parser = FarmMessageParser.getInstance();

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
      ],
    });
  }

  /**
   * Initialize and analyze the channel
   */
  async analyze(): Promise<void> {
    console.log('🚀 Starting Discord Channel Analysis...');
    console.log(`📋 Target Channel: ${this.channelId}`);
    console.log(`📅 Date Range: ${this.fromDate.toISOString()} to ${this.toDate.toISOString()}`);

    try {
      await this.client.login(config.discord.token);
      console.log('✅ Discord client logged in successfully');

      const channel = await this.client.channels.fetch(this.channelId) as TextChannel;
      if (!channel) {
        throw new Error(`Channel ${this.channelId} not found`);
      }

      console.log(`📺 Found channel: ${channel.name}`);
      console.log('📥 Fetching all messages...');

      const messages = await this.fetchAllMessages(channel);
      console.log(`📊 Retrieved ${messages.length} messages`);

      console.log('🔍 Parsing messages...');
      await this.parseMessages(messages);

      console.log('📈 Generating reports...');
      await this.generateReports();

      console.log('✅ Analysis complete!');
    } catch (error) {
      console.error('❌ Error during analysis:', error);
    } finally {
      await this.client.destroy();
    }
  }

  /**
   * Fetch all messages from the channel with pagination and date filtering
   */
  private async fetchAllMessages(channel: TextChannel): Promise<Message[]> {
    const messages: Message[] = [];
    let lastMessageId: string | undefined;
    let fetchCount = 0;

    while (true) {
      try {
        const options = { limit: 100 } as const;
        const optionsWithBefore = lastMessageId
          ? { ...options, before: lastMessageId }
          : options;

        const batch: Collection<string, Message> = await channel.messages.fetch(optionsWithBefore);

        if (batch.size === 0) {
          break; // No more messages
        }

        const batchArray = Array.from(batch.values());

        // Filter messages by date range
        const filteredBatch = batchArray.filter(message => {
          const messageDate = new Date(message.createdTimestamp);
          return messageDate >= this.fromDate && messageDate <= this.toDate;
        });

        messages.push(...filteredBatch);

        // Check if we've gone past our date range
        const oldestMessage = batchArray[batchArray.length - 1];
        if (new Date(oldestMessage.createdTimestamp) < this.fromDate) {
          console.log('📄 Reached messages older than start date, stopping fetch');
          break;
        }

        lastMessageId = batchArray[batchArray.length - 1].id;
        fetchCount++;

        console.log(`  📦 Batch ${fetchCount}: ${batch.size} messages (${filteredBatch.length} in date range, Total: ${messages.length})`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error fetching messages batch ${fetchCount}:`, error);
        break;
      }
    }

    // Sort messages by timestamp (oldest first)
    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    return messages;
  }

  /**
   * Parse all messages and extract worker activities
   */
  private async parseMessages(messages: Message[]): Promise<void> {
    let parseCount = 0;
    let successCount = 0;

    for (const message of messages) {
      parseCount++;

      if (parseCount % 100 === 0) {
        console.log(`  🔄 Processed ${parseCount}/${messages.length} messages (${successCount} parsed successfully)`);
      }

      try {
        // Try regular text parsing first
        const parsed = this.parser.parseMessage({
          id: message.id,
          content: message.content,
          author: {
            id: message.author.id,
            username: message.author.username,
            displayName: message.author.displayName || message.author.username
          },
          timestamp: message.createdAt.toISOString()
        });

        if (parsed.parseSuccess) {
          await this.processParsedActivity(parsed, message);
          successCount++;
        } else {
          // Try embed parsing for Spidey Bot messages
          const embedParsed = this.parseEmbedMessage(message);
          if (embedParsed.parseSuccess) {
            await this.processParsedActivity(embedParsed, message);
            successCount++;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error parsing message ${message.id}:`, error);
      }
    }

    console.log(`📊 Parsing complete: ${successCount}/${parseCount} messages successfully parsed`);
  }

  /**
   * Parse Discord embed messages from Spidey Bot
   */
  private parseEmbedMessage(message: Message): ParsedActivity {
    const base: ParsedActivity = {
      id: message.id,
      timestamp: message.createdAt.toISOString(),
      autor: '',
      content: '',
      parseSuccess: false,
      confidence: 'none'
    };

    if (message.embeds.length === 0) {
      return base;
    }

    const embed = message.embeds[0];
    const title = embed.title || '';
    const fields = embed.fields || [];

    // Extract author from embed fields
    const authorField = fields.find(f => f.name.includes('Autor'));
    if (authorField) {
      // Extract name from "Jizar Stoffeliz | FIXO: 75119" format
      const authorMatch = authorField.value.match(/```prolog\n(.+?)\s*\|/);
      if (authorMatch) {
        base.autor = authorMatch[1].trim();
      }
    }

    // Parse different embed types
    if (title.includes('CAIXA ORGANIZAÇÃO - DEPÓSITO')) {
      return this.parseMoneyDepositEmbed(fields, base);
    } else if (title.includes('CAIXA ORGANIZAÇÃO - SAQUE')) {
      return this.parseMoneyWithdrawalEmbed(fields, base);
    } else if (title.includes('BAÚ ORGANIZAÇÃO- INSERIR ITEM')) {
      return this.parseItemAddedEmbed(fields, base);
    } else if (title.includes('BAÚ ORGANIZAÇÃO - REMOVER ITEM')) {
      return this.parseItemRemovedEmbed(fields, base);
    }

    return base;
  }

  /**
   * Parse money deposit embed
   */
  private parseMoneyDepositEmbed(fields: any[], base: ParsedActivity): ParsedActivity {
    const valorField = fields.find(f => f.name.includes('Valor depositado'));
    if (valorField) {
      const valorMatch = valorField.value.match(/\$([0-9,.]+)/);
      if (valorMatch) {
        const amount = parseFloat(valorMatch[1].replace(/,/g, ''));
        return {
          ...base,
          tipo: 'deposito',
          categoria: 'financeiro',
          item: 'Money',
          valor: amount,
          parseSuccess: true,
          confidence: 'high',
          content: `${base.autor} depositou $${amount}`
        };
      }
    }
    return base;
  }

  /**
   * Parse money withdrawal embed
   */
  private parseMoneyWithdrawalEmbed(fields: any[], base: ParsedActivity): ParsedActivity {
    const valorField = fields.find(f => f.name.includes('Valor sacado'));
    if (valorField) {
      const valorMatch = valorField.value.match(/\$([0-9,.]+)/);
      if (valorMatch) {
        const amount = parseFloat(valorMatch[1].replace(/,/g, ''));
        return {
          ...base,
          tipo: 'saque',
          categoria: 'financeiro',
          item: 'Money',
          valor: amount,
          parseSuccess: true,
          confidence: 'high',
          content: `${base.autor} sacou $${amount}`
        };
      }
    }
    return base;
  }

  /**
   * Parse item added embed
   */
  private parseItemAddedEmbed(fields: any[], base: ParsedActivity): ParsedActivity {
    const itemField = fields.find(f => f.name.includes('Item adicionado'));
    if (itemField) {
      const itemMatch = itemField.value.match(/```prolog\n(.+?)\s+x(\d+)/);
      if (itemMatch) {
        const itemName = itemMatch[1].trim();
        const quantity = parseInt(itemMatch[2]);
        return {
          ...base,
          tipo: 'adicionar',
          categoria: 'inventario',
          item: itemName,
          quantidade: quantity,
          parseSuccess: true,
          confidence: 'high',
          content: `${base.autor} adicionou ${quantity}x ${itemName}`
        };
      }
    }
    return base;
  }

  /**
   * Parse item removed embed
   */
  private parseItemRemovedEmbed(fields: any[], base: ParsedActivity): ParsedActivity {
    const itemField = fields.find(f => f.name.includes('Item removido'));
    if (itemField) {
      const itemMatch = itemField.value.match(/```prolog\n(.+?)\s+x(\d+)/);
      if (itemMatch) {
        const itemName = itemMatch[1].trim();
        const quantity = parseInt(itemMatch[2]);
        return {
          ...base,
          tipo: 'remover',
          categoria: 'inventario',
          item: itemName,
          quantidade: quantity,
          parseSuccess: true,
          confidence: 'high',
          content: `${base.autor} removeu ${quantity}x ${itemName}`
        };
      }
    }
    return base;
  }

  /**
   * Process a parsed activity and update worker data
   */
  private async processParsedActivity(parsed: ParsedActivity, message: Message): Promise<void> {
    const workerName = this.normalizeWorkerName(parsed.autor);

    // Skip if no author found
    if (!workerName || workerName.trim() === '') {
      return;
    }

    // Get or create worker activity record
    if (!this.workerActivities.has(workerName)) {
      this.workerActivities.set(workerName, {
        workerName,
        plantsDeposited: {},
        plantsTakenOut: {},
        boxesDeposited: {},
        boxesTakenOut: {},
        moneyDeposited: [],
        moneyTakenOut: [],
        miscItemsTakenOut: {},
        totalTransactions: 0
      });
    }

    const activity = this.workerActivities.get(workerName)!;
    activity.totalTransactions++;

    // Process based on transaction type
    await this.categorizeAndRecord(parsed, message, activity);
  }

  /**
   * Categorize transaction and update records
   */
  private async categorizeAndRecord(parsed: ParsedActivity, message: Message, activity: WorkerActivity): Promise<void> {
    const timestamp = new Date(message.createdAt);
    const itemName = parsed.item || 'Unknown';
    const quantity = parsed.quantidade || 0;
    const amount = parsed.valor || 0;

    let transactionType: 'Deposit' | 'Withdrawal' = 'Deposit';
    let category: 'Plants' | 'Boxes' | 'Money' | 'Miscellaneous' = 'Miscellaneous';

    // Determine transaction type and category
    if (parsed.tipo === 'adicionar' || parsed.tipo === 'deposito') {
      transactionType = 'Deposit';
    } else if (parsed.tipo === 'remover' || parsed.tipo === 'saque') {
      transactionType = 'Withdrawal';
    }

    // Categorize by content and supply chain type
    if (parsed.categoria === 'supply_chain') {
      switch (parsed.supplyChainType) {
        case 'PLANTS_WITHDRAWN':
          category = 'Plants';
          transactionType = 'Withdrawal';
          activity.plantsTakenOut[itemName] = (activity.plantsTakenOut[itemName] || 0) + quantity;
          break;
        case 'PLANTS_DEPOSITED':
          category = 'Plants';
          transactionType = 'Deposit';
          activity.plantsDeposited[itemName] = (activity.plantsDeposited[itemName] || 0) + quantity;
          break;
        case 'BOXES_CREATED':
        case 'BOXES_RETURNED':
          category = 'Boxes';
          transactionType = 'Deposit';
          activity.boxesDeposited[itemName] = (activity.boxesDeposited[itemName] || 0) + quantity;
          break;
        case 'BOXES_WITHDRAWN':
          category = 'Boxes';
          transactionType = 'Withdrawal';
          activity.boxesTakenOut[itemName] = (activity.boxesTakenOut[itemName] || 0) + quantity;
          break;
        case 'MONEY_DEPOSITED_TO_INVENTORY':
        case 'REVENUE_DISTRIBUTED':
          category = 'Money';
          transactionType = 'Deposit';
          activity.moneyDeposited.push({
            amount,
            timestamp,
            description: parsed.displayText || message.content.substring(0, 100)
          });
          break;
        case 'MONEY_WITHDRAWN_FROM_FERROVIA':
        case 'REVENUE_COLLECTED':
          category = 'Money';
          transactionType = 'Withdrawal';
          activity.moneyTakenOut.push({
            amount,
            timestamp,
            description: parsed.displayText || message.content.substring(0, 100)
          });
          break;
      }
    } else {
      // Regular inventory transactions
      if (this.isPlantItem(itemName)) {
        category = 'Plants';
        if (transactionType === 'Deposit') {
          activity.plantsDeposited[itemName] = (activity.plantsDeposited[itemName] || 0) + quantity;
        } else {
          activity.plantsTakenOut[itemName] = (activity.plantsTakenOut[itemName] || 0) + quantity;
        }
      } else if (this.isBoxItem(itemName)) {
        category = 'Boxes';
        if (transactionType === 'Deposit') {
          activity.boxesDeposited[itemName] = (activity.boxesDeposited[itemName] || 0) + quantity;
        } else {
          activity.boxesTakenOut[itemName] = (activity.boxesTakenOut[itemName] || 0) + quantity;
        }
      } else if (parsed.categoria === 'financeiro') {
        category = 'Money';
        if (transactionType === 'Deposit') {
          activity.moneyDeposited.push({
            amount,
            timestamp,
            description: parsed.displayText || message.content.substring(0, 100)
          });
        } else {
          activity.moneyTakenOut.push({
            amount,
            timestamp,
            description: parsed.displayText || message.content.substring(0, 100)
          });
        }
      } else {
        // Miscellaneous items
        if (transactionType === 'Withdrawal') {
          activity.miscItemsTakenOut[itemName] = (activity.miscItemsTakenOut[itemName] || 0) + quantity;
        }
      }
    }

    // Add to detailed records
    this.detailedRecords.push({
      workerName: activity.workerName,
      transactionType,
      category,
      itemName,
      quantity,
      amount,
      timestamp,
      messageContent: message.content.substring(0, 200),
      confidence: parsed.confidence
    });
  }

  /**
   * Normalize worker names for consistency
   */
  private normalizeWorkerName(name: string): string {
    return name.trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if item is a plant
   */
  private isPlantItem(itemName: string): boolean {
    const plantItems = ['milho', 'trigo', 'junco', 'corn', 'wheat', 'bulrush', 'semente', 'seed'];
    return plantItems.some(plant => itemName.toLowerCase().includes(plant));
  }

  /**
   * Check if item is a box
   */
  private isBoxItem(itemName: string): boolean {
    const boxItems = ['caixa', 'box'];
    return boxItems.some(box => itemName.toLowerCase().includes(box));
  }

  /**
   * Generate CSV reports with date range in filename
   */
  private async generateReports(): Promise<void> {
    const fromDateStr = this.fromDate.toISOString().split('T')[0];
    const toDateStr = this.toDate.toISOString().split('T')[0];
    const dateRange = `${fromDateStr}-to-${toDateStr}`;
    const outputDir = path.join(process.cwd(), 'exports');

    // Ensure exports directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Generate fazenda transactions CSV (excluding ferrovia)
    await this.generateFazendaTransactionsCSV(outputDir, dateRange);

    // Generate ferrovia transactions CSV (only ferrovia)
    await this.generateFerroviaTransactionsCSV(outputDir, dateRange);

    console.log(`📁 Reports saved to: ${outputDir}`);
  }

  /**
   * Generate fazenda transactions CSV (non-ferrovia)
   */
  private async generateFazendaTransactionsCSV(outputDir: string, dateRange: string): Promise<void> {
    const filename = path.join(outputDir, `fazenda-transactions-${dateRange}.csv`);

    let csv = 'Worker Name,Transaction Type,Category,Item Name,Quantity,Amount,Timestamp,Message Content,Confidence\n';

    // Filter for non-ferrovia transactions and sort by timestamp
    const fazendaRecords = this.detailedRecords
      .filter(record => !record.messageContent.toLowerCase().includes('ferrovia'))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const record of fazendaRecords) {
      csv += `"${record.workerName}","${record.transactionType}","${record.category}","${record.itemName}",${record.quantity},${record.amount},"${record.timestamp.toISOString()}","${record.messageContent.replace(/"/g, '""')}","${record.confidence}"\n`;
    }

    await fs.writeFile(filename, csv, 'utf-8');
    console.log(`📄 Fazenda transactions (${fazendaRecords.length} records): ${filename}`);
  }

  /**
   * Generate ferrovia transactions CSV (only ferrovia)
   */
  private async generateFerroviaTransactionsCSV(outputDir: string, dateRange: string): Promise<void> {
    const filename = path.join(outputDir, `ferrovia-transactions-${dateRange}.csv`);

    let csv = 'Worker Name,Transaction Type,Category,Item Name,Quantity,Amount,Timestamp,Message Content,Confidence\n';

    // Filter for ferrovia transactions and sort by timestamp
    const ferroviaRecords = this.detailedRecords
      .filter(record => record.messageContent.toLowerCase().includes('ferrovia'))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const record of ferroviaRecords) {
      csv += `"${record.workerName}","${record.transactionType}","${record.category}","${record.itemName}",${record.quantity},${record.amount},"${record.timestamp.toISOString()}","${record.messageContent.replace(/"/g, '""')}","${record.confidence}"\n`;
    }

    await fs.writeFile(filename, csv, 'utf-8');
    console.log(`📄 Ferrovia transactions (${ferroviaRecords.length} records): ${filename}`);
  }
}

// Main execution
async function main() {
  // Get parameters from command line arguments
  const channelId = process.argv[2] || '1412325130926948362'; // Default to Fazenda CDP
  const fromDateStr = process.argv[3]; // Required start date
  const toDateStr = process.argv[4]; // Required end date

  if (!fromDateStr || !toDateStr) {
    console.error('❌ Usage: npm run export-data <channelId> <fromDate> <toDate>');
    console.error('Example: npm run export-data 1412325130926948362 2025-09-20 2025-09-21');
    process.exit(1);
  }

  const fromDate = new Date(fromDateStr + 'T00:00:00.000Z');
  const toDate = new Date(toDateStr + 'T23:59:59.999Z');

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    console.error('❌ Invalid date format. Use YYYY-MM-DD format.');
    process.exit(1);
  }

  console.log(`🎯 Target Channel ID: ${channelId}`);
  console.log(`📅 Date Range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);

  const exporter = new ChannelExporter(channelId, fromDate, toDate);

  try {
    await exporter.analyze();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default ChannelExporter;