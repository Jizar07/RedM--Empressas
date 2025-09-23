import { Client, TextChannel, GatewayIntentBits, Partials, Collection, Message } from 'discord.js';
import { promises as fs } from 'fs';
import path from 'path';
import { FarmMessageParser } from '../src/services/FarmMessageParser';
import config from '../src/config/config';

// Import the ParsedActivity type
type ParsedActivity = {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda' | 'supply_chain';
  categoria?: 'inventario' | 'financeiro' | 'sistema' | 'supply_chain';
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
  parseSuccess: boolean;
  displayText?: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  supplyChainType?: 'PLANTS_WITHDRAWN' | 'PLANTS_DEPOSITED' | 'BOXES_CREATED' | 'BOXES_WITHDRAWN' | 'BOXES_RETURNED' | 'FERROVIA_MISSION_COMPLETED' | 'REVENUE_COLLECTED' | 'REVENUE_DISTRIBUTED' | 'MONEY_WITHDRAWN_FROM_FERROVIA' | 'MONEY_DEPOSITED_TO_INVENTORY' | 'WORKER_PAYMENT_OWED';
  workerRole?: 'manager' | 'worker';
};

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

class ChannelAnalyzer {
  private client: Client;
  private channelId: string;
  private parser: FarmMessageParser;
  private workerActivities: Map<string, WorkerActivity> = new Map();
  private detailedRecords: TransactionRecord[] = [];
  private startDate?: Date;
  private endDate?: Date;

  constructor(channelId: string, startDate?: string, endDate?: string) {
    this.channelId = channelId;
    this.parser = FarmMessageParser.getInstance();

    // Parse date filters
    if (startDate) {
      this.startDate = new Date(startDate + 'T00:00:00.000Z');
    }
    if (endDate) {
      this.endDate = new Date(endDate + 'T23:59:59.999Z');
    }

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
    if (this.startDate) {
      console.log(`📅 Start Date: ${this.startDate.toISOString().split('T')[0]}`);
    }
    if (this.endDate) {
      console.log(`📅 End Date: ${this.endDate.toISOString().split('T')[0]}`);
    }

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
   * Fetch all messages from the channel with pagination
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

        // Apply date filtering for each message
        for (const message of batchArray) {
          const messageDate = new Date(message.createdTimestamp);

          // Apply date filtering if dates are specified
          let includeMessage = true;

          if (this.startDate && messageDate < this.startDate) {
            // If message is before our start date and we've already collected some messages, we can stop
            if (messages.length > 0) {
              console.log(`📊 Reached start date boundary. Found ${messages.length} messages in date range`);
              return messages;
            }
            includeMessage = false;
          }

          if (this.endDate && messageDate > this.endDate) {
            includeMessage = false;
          }

          if (includeMessage) {
            messages.push(message);
          }
        }

        lastMessageId = batchArray[batchArray.length - 1].id;
        fetchCount++;

        console.log(`  📦 Batch ${fetchCount}: ${batch.size} messages (Total: ${messages.length} filtered)`);

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
   * Generate Excel-compatible reports
   */
  private async generateReports(): Promise<void> {
    // Generate filename suffix based on date range or timestamp
    let filenameSuffix: string;
    if (this.startDate && this.endDate) {
      const startStr = this.startDate.toISOString().split('T')[0];
      const endStr = this.endDate.toISOString().split('T')[0];
      filenameSuffix = `${startStr}-to-${endStr}`;
    } else if (this.startDate) {
      const startStr = this.startDate.toISOString().split('T')[0];
      filenameSuffix = `from-${startStr}`;
    } else if (this.endDate) {
      const endStr = this.endDate.toISOString().split('T')[0];
      filenameSuffix = `until-${endStr}`;
    } else {
      filenameSuffix = new Date().toISOString().replace(/[:.]/g, '-');
    }

    const outputDir = path.join(process.cwd(), 'exports');

    // Ensure exports directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    // Generate detailed transactions CSV
    await this.generateDetailedTransactionsCSV(outputDir, filenameSuffix);

    // Generate worker summary CSV
    await this.generateWorkerSummaryCSV(outputDir, filenameSuffix);

    // Generate activity breakdown CSV
    await this.generateActivityBreakdownCSV(outputDir, filenameSuffix);

    console.log(`📁 Reports saved to: ${outputDir}`);
  }

  /**
   * Generate detailed transactions CSV
   */
  private async generateDetailedTransactionsCSV(outputDir: string, timestamp: string): Promise<void> {
    const filename = path.join(outputDir, `detailed-transactions-${timestamp}.csv`);

    let csv = 'Worker Name,Transaction Type,Category,Item Name,Quantity,Amount,Timestamp,Message Content,Confidence\n';

    // Sort by timestamp
    this.detailedRecords.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const record of this.detailedRecords) {
      csv += `"${record.workerName}","${record.transactionType}","${record.category}","${record.itemName}",${record.quantity},${record.amount},"${record.timestamp.toISOString()}","${record.messageContent.replace(/"/g, '""')}","${record.confidence}"\n`;
    }

    await fs.writeFile(filename, csv, 'utf-8');
    console.log(`📄 Detailed transactions: ${filename}`);
  }

  /**
   * Generate worker summary CSV
   */
  private async generateWorkerSummaryCSV(outputDir: string, timestamp: string): Promise<void> {
    const filename = path.join(outputDir, `worker-summary-${timestamp}.csv`);

    let csv = 'Worker Name,Total Transactions,Plants Deposited Types,Plants Taken Types,Boxes Deposited Types,Boxes Taken Types,Money Deposits Count,Money Withdrawals Count,Misc Items Types\n';

    const sortedWorkers = Array.from(this.workerActivities.values())
      .sort((a, b) => a.workerName.localeCompare(b.workerName));

    for (const activity of sortedWorkers) {
      const plantsDepositedCount = Object.keys(activity.plantsDeposited).length;
      const plantsTakenCount = Object.keys(activity.plantsTakenOut).length;
      const boxesDepositedCount = Object.keys(activity.boxesDeposited).length;
      const boxesTakenCount = Object.keys(activity.boxesTakenOut).length;
      const moneyDepositsCount = activity.moneyDeposited.length;
      const moneyWithdrawalsCount = activity.moneyTakenOut.length;
      const miscItemsCount = Object.keys(activity.miscItemsTakenOut).length;

      csv += `"${activity.workerName}",${activity.totalTransactions},${plantsDepositedCount},${plantsTakenCount},${boxesDepositedCount},${boxesTakenCount},${moneyDepositsCount},${moneyWithdrawalsCount},${miscItemsCount}\n`;
    }

    await fs.writeFile(filename, csv, 'utf-8');
    console.log(`📄 Worker summary: ${filename}`);
  }

  /**
   * Generate activity breakdown CSV
   */
  private async generateActivityBreakdownCSV(outputDir: string, timestamp: string): Promise<void> {
    const filename = path.join(outputDir, `activity-breakdown-${timestamp}.csv`);

    let csv = 'Worker Name,Activity Type,Item Name,Total Quantity,Total Amount\n';

    const sortedWorkers = Array.from(this.workerActivities.values())
      .sort((a, b) => a.workerName.localeCompare(b.workerName));

    for (const activity of sortedWorkers) {
      // Plants deposited
      for (const [item, quantity] of Object.entries(activity.plantsDeposited)) {
        csv += `"${activity.workerName}","Plants Deposited","${item}",${quantity},0\n`;
      }

      // Plants taken out
      for (const [item, quantity] of Object.entries(activity.plantsTakenOut)) {
        csv += `"${activity.workerName}","Plants Taken Out","${item}",${quantity},0\n`;
      }

      // Boxes deposited
      for (const [item, quantity] of Object.entries(activity.boxesDeposited)) {
        csv += `"${activity.workerName}","Boxes Deposited","${item}",${quantity},0\n`;
      }

      // Boxes taken out
      for (const [item, quantity] of Object.entries(activity.boxesTakenOut)) {
        csv += `"${activity.workerName}","Boxes Taken Out","${item}",${quantity},0\n`;
      }

      // Money deposited
      for (const deposit of activity.moneyDeposited) {
        csv += `"${activity.workerName}","Money Deposited","Money",1,${deposit.amount}\n`;
      }

      // Money taken out
      for (const withdrawal of activity.moneyTakenOut) {
        csv += `"${activity.workerName}","Money Taken Out","Money",1,${withdrawal.amount}\n`;
      }

      // Miscellaneous items
      for (const [item, quantity] of Object.entries(activity.miscItemsTakenOut)) {
        csv += `"${activity.workerName}","Misc Items Taken Out","${item}",${quantity},0\n`;
      }
    }

    await fs.writeFile(filename, csv, 'utf-8');
    console.log(`📄 Activity breakdown: ${filename}`);
  }
}

// Main execution
async function main() {
  // Get command line arguments
  const channelId = process.argv[2] || '1412325130926948362'; // Default to Fazenda CDP
  const startDate = process.argv[3]; // Optional start date filter (YYYY-MM-DD)
  const endDate = process.argv[4]; // Optional end date filter (YYYY-MM-DD)

  console.log(`🎯 Target Channel ID: ${channelId}`);
  if (startDate) {
    console.log(`📅 Start Date: ${startDate}`);
  }
  if (endDate) {
    console.log(`📅 End Date: ${endDate}`);
  }

  const analyzer = new ChannelAnalyzer(channelId, startDate, endDate);

  try {
    await analyzer.analyze();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default ChannelAnalyzer;