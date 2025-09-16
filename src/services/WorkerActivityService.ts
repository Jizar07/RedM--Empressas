import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import PaymentAuditService from './PaymentAuditService';

interface PlantTransaction {
  type: 'seed_taken' | 'plant_deposited';
  itemName: string;
  quantity: number;
  timestamp: Date;
  transactionId: string;
}

interface AnimalTransaction {
  type: 'animals_taken' | 'delivery_completed';
  animalType?: string;
  quantity: number;
  amount?: number;
  cost?: number;
  timestamp: Date;
  transactionId: string;
}

interface SeedExpectation {
  seedType: string;
  seedQuantity: number;
  expectedPlantType: string;
  expectedPlantQuantity: number;
  plantsFulfilled: number;
  isComplete: boolean;
  transactionId: string;
}

interface AnimalExpectation {
  animalsTaken: number;
  animalsDelivered: number;
  isComplete: boolean;
  transactionId: string;
  takenTimestamp: Date;
}

interface WorkerSession {
  workerId: string;
  workerName: string;
  channelId: string;
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  status: 'active' | 'pending_payment' | 'paid' | 'rejected';
  plantTransactions: PlantTransaction[];
  animalTransactions: AnimalTransaction[];
  seedExpectations?: SeedExpectation[]; // Track seed-to-plant expectations
  animalExpectations?: AnimalExpectation[]; // Track animal-taking expectations
  totalCredits: number;
  embedMessageId?: string;
  notes?: string;
}

interface ServiceConfig {
  plantPrices: {
    basic: number;
    other: number;
  };
  basicPlants: string[];
  optimalAnimalIncome: number;
  animalTypes: string[];
}

interface WorkerPrices {
  plantPrice: number;
  animalPrice: number;
  animalCost: number;
}

export class WorkerActivityService {
  private client: Client;
  private activeSessions: Map<string, WorkerSession> = new Map();
  private dataDir: string;
  private serviceConfig!: ServiceConfig;
  private workerPricesCache: Map<string, { prices: WorkerPrices; fetchedAt: Date }> = new Map();
  private paymentAuditService: PaymentAuditService;

  constructor(client: Client) {
    this.client = client;
    this.dataDir = path.join(process.cwd(), 'data', 'worker-sessions');
    this.paymentAuditService = PaymentAuditService.getInstance();
    this.ensureDataDirectory();
    this.loadServiceConfig();
    this.loadActiveSessions();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('📁 Created worker sessions directory');
    }
  }

  private loadServiceConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'data', 'farm-service-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      this.serviceConfig = JSON.parse(configData);
      console.log('⚙️ Loaded farm service configuration');
    } catch (error) {
      console.error('❌ Error loading service config:', error);
      // Default configuration
      this.serviceConfig = {
        plantPrices: { basic: 0.25, other: 0.25 }, // Will be overridden by dynamic pricing
        basicPlants: ['Milho', 'Trigo', 'Junco'],
        optimalAnimalIncome: 60,
        animalTypes: ['Bovino', 'Ovino', 'Suino', 'Caprino', 'Equino', 'Avino']
      };
    }
  }

  private loadActiveSessions(): void {
    try {
      const sessionsFile = path.join(this.dataDir, 'active-sessions.json');
      if (fs.existsSync(sessionsFile)) {
        const data = fs.readFileSync(sessionsFile, 'utf8');
        const sessions = JSON.parse(data);

        let loadedCount = 0;
        let skippedCount = 0;

        // Convert to Map and restore Date objects - ONLY for active sessions
        Object.entries(sessions).forEach(([workerId, session]: [string, any]) => {
          // CRITICAL FIX: Only load sessions with 'active' status
          if (session.status !== 'active') {
            console.log(`⏭️ Skipping non-active session for ${session.workerName} (status: ${session.status})`);
            skippedCount++;
            return;
          }

          session.startTime = new Date(session.startTime);
          session.lastActivity = new Date(session.lastActivity);
          session.plantTransactions = session.plantTransactions.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          }));
          session.animalTransactions = session.animalTransactions.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          }));

          // Restore animal expectations with Date objects
          if (session.animalExpectations) {
            session.animalExpectations = session.animalExpectations.map((exp: any) => ({
              ...exp,
              takenTimestamp: new Date(exp.takenTimestamp)
            }));
          }

          this.activeSessions.set(workerId, session);
          loadedCount++;
        });

        console.log(`📊 Loaded ${loadedCount} active worker sessions (skipped ${skippedCount} non-active sessions)`);
      }
    } catch (error) {
      console.error('❌ Error loading active sessions:', error);
    }
  }

  private saveActiveSessions(): void {
    try {
      const sessionsFile = path.join(this.dataDir, 'active-sessions.json');

      // CRITICAL FIX: Only save sessions with 'active' status
      const activeSessionsOnly = new Map();
      this.activeSessions.forEach((session, workerId) => {
        if (session.status === 'active') {
          activeSessionsOnly.set(workerId, session);
        } else {
          console.log(`⏭️ Excluding non-active session from save: ${session.workerName} (status: ${session.status})`);
        }
      });

      const sessions = Object.fromEntries(activeSessionsOnly);
      fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
      console.log(`💾 Saved ${activeSessionsOnly.size} active sessions to file (excluded ${this.activeSessions.size - activeSessionsOnly.size} non-active)`);
    } catch (error) {
      console.error('❌ Error saving active sessions:', error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // Convert seed name to expected plant name and calculate expected quantity
  private createSeedExpectation(seedType: string, seedQuantity: number, transactionId: string): SeedExpectation {
    // Seed to plant conversion mapping (1 seed typically produces 10 plants)
    const seedToPlantMap: { [key: string]: { plantType: string; multiplier: number } } = {
      'Semente de Milho': { plantType: 'Milho', multiplier: 10 },
      'Semente de Trigo': { plantType: 'Trigo', multiplier: 10 },
      'Semente Trigo': { plantType: 'Trigo', multiplier: 10 }, // Alternative name
      'Semente de Junco': { plantType: 'Junco', multiplier: 10 },
      'Semente Junco': { plantType: 'Junco', multiplier: 10 } // Alternative name
    };

    const mapping = seedToPlantMap[seedType] || { plantType: seedType.replace('Semente de ', '').replace('Semente ', ''), multiplier: 10 };

    return {
      seedType,
      seedQuantity,
      expectedPlantType: mapping.plantType,
      expectedPlantQuantity: seedQuantity * mapping.multiplier,
      plantsFulfilled: 0,
      isComplete: false,
      transactionId
    };
  }

  // Update seed expectations when plants are deposited
  private updateSeedExpectations(session: WorkerSession, plantType: string, plantQuantity: number): number {
    if (!session.seedExpectations) {
      session.seedExpectations = [];
    }

    let validPlantCredits = 0;

    // Find matching incomplete seed expectations for this plant type
    const matchingExpectations = session.seedExpectations.filter(
      exp => exp.expectedPlantType === plantType && !exp.isComplete
    ).sort((a, b) => new Date(a.transactionId).getTime() - new Date(b.transactionId).getTime()); // FIFO

    let remainingPlants = plantQuantity;

    for (const expectation of matchingExpectations) {
      if (remainingPlants <= 0) break;

      const needed = expectation.expectedPlantQuantity - expectation.plantsFulfilled;
      const canFulfill = Math.min(needed, remainingPlants);

      expectation.plantsFulfilled += canFulfill;
      validPlantCredits += canFulfill;
      remainingPlants -= canFulfill;

      if (expectation.plantsFulfilled >= expectation.expectedPlantQuantity) {
        expectation.isComplete = true;
      }

      console.log(`🌱 Applied ${canFulfill} ${plantType} to seed expectation (${expectation.plantsFulfilled}/${expectation.expectedPlantQuantity})`);
    }

    // Log any excess plants (Ferrovia returns)
    if (remainingPlants > 0) {
      console.log(`🚂 ${remainingPlants} ${plantType} treated as Ferrovia return (no seed expectation)`);
    }

    return validPlantCredits;
  }

  // Create animal expectation when animals are taken
  private createAnimalExpectation(animalsTaken: number, transactionId: string): AnimalExpectation {
    return {
      animalsTaken,
      animalsDelivered: 0,
      isComplete: false,
      transactionId,
      takenTimestamp: new Date()
    };
  }

  // Update animal expectations when animals are delivered
  private updateAnimalExpectations(session: WorkerSession, animalsDelivered: number): number {
    if (!session.animalExpectations) {
      session.animalExpectations = [];
    }

    let validAnimalCredits = 0;

    // Find matching incomplete animal expectations
    const matchingExpectations = session.animalExpectations.filter(
      exp => !exp.isComplete
    ).sort((a, b) => a.takenTimestamp.getTime() - b.takenTimestamp.getTime()); // FIFO

    let remainingAnimals = animalsDelivered;

    for (const expectation of matchingExpectations) {
      if (remainingAnimals <= 0) break;

      const needed = expectation.animalsTaken - expectation.animalsDelivered;
      const canFulfill = Math.min(needed, remainingAnimals);

      expectation.animalsDelivered += canFulfill;
      validAnimalCredits += canFulfill;
      remainingAnimals -= canFulfill;

      if (expectation.animalsDelivered >= expectation.animalsTaken) {
        expectation.isComplete = true;
      }

      console.log(`🐄 Applied ${canFulfill} animals to expectation (${expectation.animalsDelivered}/${expectation.animalsTaken})`);
    }

    // Log any excess animals (unexpected deliveries)
    if (remainingAnimals > 0) {
      console.log(`❓ ${remainingAnimals} animals delivered without taking expectation`);
    }

    return validAnimalCredits;
  }

  // Smart formatting with summarization when hitting character limits
  private formatTransactionsWithSummarization(
    transactions: PlantTransaction[],
    _title: string, // Prefixed with _ to indicate intentionally unused
    formatItem: (t: PlantTransaction) => string,
    maxChars: number = 800
  ): string {
    if (transactions.length === 0) return 'Nenhuma transação';

    const lines: string[] = [];
    let currentLength = 0;
    let summarizeRemaining = false;
    let cutoffIndex = transactions.length;

    // Try to add individual transactions first
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const timeStr = new Date(transaction.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      const line = `• ${timeStr} - ${formatItem(transaction)}`;

      // Check if adding this line would exceed limit
      if (currentLength + line.length + 2 > maxChars) {
        summarizeRemaining = true;
        cutoffIndex = i;
        break;
      }

      lines.push(line);
      currentLength += line.length + 1; // +1 for newline
    }

    // If we need to summarize, group remaining by hour
    if (summarizeRemaining && cutoffIndex < transactions.length) {
      const remaining = transactions.slice(cutoffIndex);
      const hourlyGroups: { [hour: string]: { items: { [name: string]: number }, count: number } } = {};

      // Group remaining transactions by hour
      remaining.forEach(t => {
        const hour = new Date(t.timestamp).getHours();
        const hourKey = `${hour}:00`;

        if (!hourlyGroups[hourKey]) {
          hourlyGroups[hourKey] = { items: {}, count: 0 };
        }

        hourlyGroups[hourKey].items[t.itemName] = (hourlyGroups[hourKey].items[t.itemName] || 0) + t.quantity;
        hourlyGroups[hourKey].count++;
      });

      // Add summary lines
      lines.push('---');
      Object.entries(hourlyGroups).forEach(([hour, data]) => {
        const itemsSummary = Object.entries(data.items)
          .map(([name, qty]) => `${qty} ${name}`)
          .join(', ');
        lines.push(`• ${hour} - ${hour.split(':')[0]}:59: ${itemsSummary} (${data.count} transações)`);
      });
    }

    return lines.join('\n');
  }

  // Group plant transactions by type and time period for cleaner display
  private async groupPlantTransactionsByTypeAsync(transactions: PlantTransaction[]): Promise<{ [itemName: string]: { quantity: number; count: number; credits: number; firstTimestamp: Date; lastTimestamp: Date } }> {
    const grouped: { [itemName: string]: { quantity: number; count: number; credits: number; firstTimestamp: Date; lastTimestamp: Date } } = {};
    const prices = await this.getWorkerPrices();

    transactions.forEach(transaction => {
      const itemName = transaction.itemName;
      const credits = transaction.quantity * prices.plantPrice;

      if (!grouped[itemName]) {
        grouped[itemName] = {
          quantity: 0,
          count: 0,
          credits: 0,
          firstTimestamp: transaction.timestamp,
          lastTimestamp: transaction.timestamp
        };
      }

      grouped[itemName].quantity += transaction.quantity;
      grouped[itemName].count += 1;
      grouped[itemName].credits += credits;

      // Track time range
      if (transaction.timestamp < grouped[itemName].firstTimestamp) {
        grouped[itemName].firstTimestamp = transaction.timestamp;
      }
      if (transaction.timestamp > grouped[itemName].lastTimestamp) {
        grouped[itemName].lastTimestamp = transaction.timestamp;
      }
    });

    return grouped;
  }

  // Removed old seed expectation display methods - now using new transparent format with timestamps

  // Enhanced session state validation methods
  private isSessionActive(session: WorkerSession): boolean {
    return session.status === 'active';
  }

  private async validateEmbedState(session: WorkerSession): Promise<boolean> {
    try {
      // If no embed message ID, it's valid (will create new one)
      if (!session.embedMessageId) {
        return true;
      }

      // Check if the Discord message still exists
      const channel = await this.client.channels.fetch(session.channelId);
      if (!channel || !channel.isTextBased()) {
        console.log(`⚠️ Channel ${session.channelId} not found or not text-based for ${session.workerName}`);
        return false;
      }

      try {
        await channel.messages.fetch(session.embedMessageId);
        // Message exists, check if session is active
        return this.isSessionActive(session);
      } catch (error) {
        // Message doesn't exist anymore
        console.log(`⚠️ Embed message ${session.embedMessageId} no longer exists for ${session.workerName}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error validating embed state for ${session.workerName}:`, error);
      return false;
    }
  }

  private async cleanupPaidSession(workerId: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning up paid session for worker: ${workerId}`);
      
      // Remove any stale session from active sessions
      const existingSession = this.activeSessions.get(workerId);
      if (existingSession) {
        console.log(`🗑️ Removing stale session (status: ${existingSession.status}) for worker: ${workerId}`);
        
        // Clear the embed message ID to force creation of new embed
        existingSession.embedMessageId = undefined;
        
        // If session is not active, remove it completely
        if (!this.isSessionActive(existingSession)) {
          this.activeSessions.delete(workerId);
          this.saveActiveSessions();
        }
      }
    } catch (error) {
      console.error(`❌ Error cleaning up paid session for ${workerId}:`, error);
    }
  }

  private async getWorkerPrices(firmId: string = 'fazenda-cabra-da-peste'): Promise<WorkerPrices> {
    console.log(`🔍 getWorkerPrices called for firmId: ${firmId}`);

    // Check cache first (5 minute cache)
    const cached = this.workerPricesCache.get(firmId);
    if (cached && (Date.now() - cached.fetchedAt.getTime()) < 5 * 60 * 1000) {
      console.log(`📦 Using cached prices for ${firmId}:`, cached.prices);
      return cached.prices;
    }

    try {
      // Try to read from file first (backend sync)
      const pricesPath = path.join(process.cwd(), 'data', 'worker-prices', `${firmId}.json`);
      console.log(`📁 Checking file path: ${pricesPath}`);

      if (fs.existsSync(pricesPath)) {
        console.log(`✅ File exists, reading content...`);
        const data = fs.readFileSync(pricesPath, 'utf8');
        console.log(`📄 Raw file content:`, data);

        const prices = JSON.parse(data);
        console.log(`🔧 Parsed prices:`, prices);

        const workerPrices: WorkerPrices = {
          plantPrice: prices.plantPrice || 0.15,
          animalPrice: prices.animalPrice || 60.00,
          animalCost: prices.animalCost || 20.00
        };

        console.log(`💰 Final worker prices:`, workerPrices);

        // Update cache
        this.workerPricesCache.set(firmId, { prices: workerPrices, fetchedAt: new Date() });
        console.log(`💰 Loaded worker prices for ${firmId}:`, workerPrices);
        return workerPrices;
      } else {
        console.log(`❌ File does not exist: ${pricesPath}`);
      }
    } catch (error) {
      console.error('❌ Error loading worker prices:', error);
    }

    // Return defaults if file doesn't exist
    const defaultPrices: WorkerPrices = {
      plantPrice: 0.15,
      animalPrice: 60.00,
      animalCost: 20.00
    };

    console.log(`💰 Using default worker prices for ${firmId}:`, defaultPrices);
    return defaultPrices;
  }

  // Debug method to clear cache and force price reload
  public async clearPriceCacheAndReload(firmId: string = 'fazenda-cabra-da-peste'): Promise<WorkerPrices> {
    console.log(`🧹 Clearing price cache for ${firmId}`);
    this.workerPricesCache.delete(firmId);
    const prices = await this.getWorkerPrices(firmId);
    console.log(`🔄 Forced reload result:`, prices);
    return prices;
  }

  // @ts-ignore - Reserved for future use
  private calculateAnimalPayment(quantity: number, _animalType?: string): number {
    // For now, use the base rate per animal
    // Could be enhanced with per-animal-type rates in the future
    return quantity * (this.serviceConfig.optimalAnimalIncome / 4); // Assuming 4 animals per optimal income
  }

  private async recalculateSessionCredits(session: WorkerSession): Promise<void> {
    const prices = await this.getWorkerPrices();
    let totalCredits = 0;
    let totalCosts = 0;

    // Calculate plant credits - ONLY pay for plants matching seed expectations
    session.plantTransactions
      .filter(t => t.type === 'plant_deposited')
      .forEach(transaction => {
        // Get the number of valid plants (those matching seed expectations)
        const validPlants = this.updateSeedExpectations(session, transaction.itemName, transaction.quantity);

        // Only pay for valid plants, not Ferrovia returns
        if (validPlants > 0) {
          const plantCredit = validPlants * prices.plantPrice;
          totalCredits += plantCredit;
          console.log(`💰 Plant payment: ${validPlants} ${transaction.itemName} = $${plantCredit.toFixed(2)} (matched seed expectation)`);
        }

        const ferroviaReturns = transaction.quantity - validPlants;
        if (ferroviaReturns > 0) {
          console.log(`🚂 Ferrovia return: ${ferroviaReturns} ${transaction.itemName} (no payment - no seed expectation)`);
        }
      });

    // Calculate animal deliveries
    const animalsTaken = session.animalTransactions
      .filter(t => t.type === 'animals_taken')
      .reduce((sum, t) => sum + t.quantity, 0);
    
    const totalAnimalCost = animalsTaken * prices.animalCost;
    
    // Find completed deliveries
    const deliveryAmount = session.animalTransactions
      .filter(t => t.type === 'delivery_completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Apply payment logic:
    // If delivery >= cost, worker gets full delivery amount
    // If delivery < cost, worker gets $0 and owes the difference
    if (deliveryAmount > 0) {
      if (deliveryAmount >= totalAnimalCost) {
        totalCredits += deliveryAmount; // Full payment
      } else {
        // Worker owes money
        totalCosts = totalAnimalCost - deliveryAmount;
      }
    }

    session.totalCredits = Math.max(0, totalCredits - totalCosts);
  }

  public getOrCreateSession(workerId: string, workerName: string, channelId: string): WorkerSession {
    let session = this.activeSessions.get(workerId);
    
    // Enhanced: Validate existing session state
    if (session) {
      // If session is not active, treat it as if it doesn't exist
      if (!this.isSessionActive(session)) {
        console.log(`⚠️ Found non-active session (${session.status}) for ${workerName}, creating new session instead`);
        session = undefined;
      }
    }
    
    if (!session) {
      // Enhanced: Ensure completely clean session creation
      console.log(`🆕 Creating fresh session for worker ${workerName} (${workerId})`);
      
      session = {
        workerId,
        workerName,
        channelId,
        sessionId: this.generateSessionId(),
        startTime: new Date(),
        lastActivity: new Date(),
        status: 'active',
        plantTransactions: [],
        animalTransactions: [],
        totalCredits: 0,
        // Explicitly set embedMessageId to undefined to force new embed creation
        embedMessageId: undefined
      };
      
      this.activeSessions.set(workerId, session);
      this.saveActiveSessions();
      console.log(`✅ Created new active session for worker ${workerName} (${workerId})`);
    }

    return session;
  }

  public async addPlantTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<PlantTransaction, 'transactionId' | 'timestamp'>): Promise<void> {
    // Enhanced: Check for paid session and cleanup if needed
    const existingSession = this.activeSessions.get(workerId);
    if (existingSession && !this.isSessionActive(existingSession)) {
      console.log(`⚠️ Attempting to add plant transaction to non-active session (${existingSession.status}) for ${workerName}, cleaning up...`);
      await this.cleanupPaidSession(workerId);
    }

    const session = this.getOrCreateSession(workerId, workerName, channelId);
    
    const plantTransaction: PlantTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: new Date()
    };

    session.plantTransactions.push(plantTransaction);
    session.lastActivity = new Date();

    // Handle seed expectation tracking
    if (plantTransaction.type === 'seed_taken') {
      // Create new seed expectation
      if (!session.seedExpectations) {
        session.seedExpectations = [];
      }
      const seedExpectation = this.createSeedExpectation(
        plantTransaction.itemName,
        plantTransaction.quantity,
        plantTransaction.transactionId
      );
      session.seedExpectations.push(seedExpectation);
      console.log(`🌱 Created seed expectation: ${seedExpectation.seedQuantity} ${seedExpectation.seedType} → expecting ${seedExpectation.expectedPlantQuantity} ${seedExpectation.expectedPlantType}`);
    }

    await this.recalculateSessionCredits(session);
    this.saveActiveSessions();

    console.log(`🌱 Added plant transaction for ${workerName}: ${transaction.type} - ${transaction.quantity} ${transaction.itemName}`);

    // Update the embed
    this.updateWorkerEmbed(session);
  }

  public async addAnimalTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<AnimalTransaction, 'transactionId' | 'timestamp'>): Promise<void> {
    // Enhanced: Check for paid session and cleanup if needed
    const existingSession = this.activeSessions.get(workerId);
    if (existingSession && !this.isSessionActive(existingSession)) {
      console.log(`⚠️ Attempting to add animal transaction to non-active session (${existingSession.status}) for ${workerName}, cleaning up...`);
      await this.cleanupPaidSession(workerId);
    }

    const session = this.getOrCreateSession(workerId, workerName, channelId);
    
    const animalTransaction: AnimalTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: new Date()
    };

    session.animalTransactions.push(animalTransaction);
    session.lastActivity = new Date();

    // Handle animal expectation tracking
    if (animalTransaction.type === 'animals_taken') {
      // Create new animal expectation
      if (!session.animalExpectations) {
        session.animalExpectations = [];
      }
      const animalExpectation = this.createAnimalExpectation(
        animalTransaction.quantity,
        animalTransaction.transactionId
      );
      session.animalExpectations.push(animalExpectation);
      console.log(`🐄 Created animal expectation: ${animalExpectation.animalsTaken} animals taken → expecting delivery`);
    } else if (animalTransaction.type === 'delivery_completed') {
      // Update animal expectations
      this.updateAnimalExpectations(session, animalTransaction.quantity);
    }

    await this.recalculateSessionCredits(session);
    this.saveActiveSessions();
    
    const logMessage = transaction.type === 'animals_taken' 
      ? `🐄 Added animals taken for ${workerName}: ${transaction.quantity} ${transaction.animalType || 'animals'} - Cost: $${transaction.cost || 0}`
      : `💰 Added delivery completion for ${workerName}: ${transaction.quantity} animals - Earned: $${transaction.amount || 0}`;
    
    console.log(logMessage);
    
    // Update the embed
    this.updateWorkerEmbed(session);
  }

  private async updateWorkerEmbed(session: WorkerSession): Promise<void> {
    try {
      // Enhanced: Validate embed state before updating
      const embedIsValid = await this.validateEmbedState(session);
      if (!embedIsValid) {
        console.log(`⚠️ Invalid embed state for ${session.workerName}, clearing embedMessageId to force new embed creation`);
        session.embedMessageId = undefined;
      }

      // Enhanced: Don't update embeds for non-active sessions
      if (!this.isSessionActive(session)) {
        console.log(`⚠️ Skipping embed update for non-active session (${session.status}) for ${session.workerName}`);
        return;
      }

      const channel = await this.client.channels.fetch(session.channelId) as TextChannel;
      if (!channel) {
        console.error(`❌ Channel ${session.channelId} not found for worker ${session.workerName}`);
        return;
      }

      const embed = await this.createSessionEmbed(session);
      const buttons = this.createSessionButtons(session);
      const components = buttons.components.length > 0 ? [buttons] : [];

      if (session.embedMessageId) {
        // Update existing message
        try {
          const message = await channel.messages.fetch(session.embedMessageId);
          await message.edit({ embeds: [embed], components });
          console.log(`📝 Updated embed for ${session.workerName} in channel ${session.channelId}`);
        } catch (error) {
          console.error('❌ Failed to update existing embed, creating new one:', error);
          session.embedMessageId = undefined;
        }
      }

      if (!session.embedMessageId) {
        // Create new message
        const message = await channel.send({ embeds: [embed], components });
        session.embedMessageId = message.id;
        this.saveActiveSessions();

        // Pin the message to prevent deletion by /clear
        try {
          await message.pin();
          console.log(`📌 Pinned embed for ${session.workerName} in channel ${session.channelId}`);
        } catch (pinError) {
          console.warn(`⚠️ Failed to pin embed for ${session.workerName}:`, pinError);
        }

        console.log(`✨ Created new embed for ${session.workerName} in channel ${session.channelId}`);
      }

    } catch (error) {
      console.error(`❌ Error updating embed for ${session.workerName}:`, error);
    }
  }

  private async createSessionEmbed(session: WorkerSession): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
      .setTitle(`${this.getSessionIcon(session)} ${session.workerName} - ${this.getStatusText(session.status)}`)
      .setTimestamp(session.lastActivity)
      .setFooter({ text: `Sessão: ${session.sessionId.split('_')[1]}` });

    // Set color based on status
    switch (session.status) {
      case 'active':
        embed.setColor(0x00FF00); // Green
        break;
      case 'pending_payment':
        embed.setColor(0xFFAA00); // Orange
        break;
      case 'paid':
        embed.setColor(0x0088FF); // Blue
        break;
      case 'rejected':
        embed.setColor(0xFF0000); // Red
        break;
    }

    // Add session info
    embed.addFields({
      name: '📅 Informações da Sessão',
      value: `**Iniciado:** <t:${Math.floor(session.startTime.getTime() / 1000)}:R>\n**Última Atividade:** <t:${Math.floor(session.lastActivity.getTime() / 1000)}:R>`,
      inline: false
    });

    // Add seeds taken section with timestamps
    const seedsTaken = session.plantTransactions.filter(t => t.type === 'seed_taken');
    if (seedsTaken.length > 0) {
      const seedsDisplay = this.formatTransactionsWithSummarization(
        seedsTaken,
        '🌱 Sementes Retiradas',
        (t) => `${t.quantity} ${t.itemName}`,
        800
      );

      const totalSeeds = seedsTaken.reduce((sum, t) => sum + t.quantity, 0);
      const expectedPlants = totalSeeds * 10;
      const seedsSummary = `${seedsDisplay}\n**Total: ${totalSeeds} sementes → Esperado: ${expectedPlants} plantas**`;

      embed.addFields({
        name: '🌱 Sementes Retiradas',
        value: this.truncateFieldValue(seedsSummary),
        inline: false
      });
    }

    // Add seed expectations with strikethrough for completed
    if (session.seedExpectations && session.seedExpectations.length > 0) {
      const expectationLines: string[] = [];

      session.seedExpectations.forEach(exp => {
        const progress = `${exp.plantsFulfilled}/${exp.expectedPlantQuantity}`;
        const statusIcon = exp.isComplete ? '✅' : '⏳';
        const seedLine = `${exp.seedQuantity} ${exp.seedType} → ${exp.expectedPlantQuantity} ${exp.expectedPlantType}`;

        if (exp.isComplete) {
          expectationLines.push(`~~${seedLine}~~ ${statusIcon}`);
        } else {
          expectationLines.push(`${seedLine} (${progress}) ${statusIcon}`);
        }
      });

      if (expectationLines.length > 0) {
        embed.addFields({
          name: '🔄 Expectativas de Sementes',
          value: this.truncateFieldValue(expectationLines.join('\n')),
          inline: false
        });
      }
    }

    // Add plants deposited section with grouping by type
    const plantsDeposited = session.plantTransactions.filter(t => t.type === 'plant_deposited');
    if (plantsDeposited.length > 0) {
      const groupedPlants = await this.groupPlantTransactionsByTypeAsync(plantsDeposited);
      const plantLines: string[] = [];
      let totalPlantCredits = 0;

      Object.entries(groupedPlants).forEach(([itemName, data]) => {
        totalPlantCredits += data.credits;
        if (data.count === 1) {
          plantLines.push(`• ${data.quantity} ${itemName} ($${data.credits.toFixed(2)})`);
        } else {
          plantLines.push(`• ${data.quantity} ${itemName} (${data.count} depósitos) ($${data.credits.toFixed(2)})`);
        }
      });

      const totalPlants = plantsDeposited.reduce((sum, t) => sum + t.quantity, 0);
      plantLines.push(`**Total: ${totalPlants} plantas = $${totalPlantCredits.toFixed(2)}**`);

      embed.addFields({
        name: '🌾 Plantas Depositadas',
        value: this.truncateFieldValue(plantLines.join('\n')),
        inline: false
      });
    }

    // Add animal expectations with strikethrough for completed
    if (session.animalExpectations && session.animalExpectations.length > 0) {
      const animalExpectationLines: string[] = [];

      session.animalExpectations.forEach(exp => {
        const progress = `${exp.animalsDelivered}/${exp.animalsTaken}`;
        const statusIcon = exp.isComplete ? '✅' : '⏳';
        const animalLine = `${exp.animalsTaken} Animais Retirados → Aguardando Entrega`;

        if (exp.isComplete) {
          animalExpectationLines.push(`~~${animalLine}~~ ${statusIcon}`);
        } else {
          animalExpectationLines.push(`${animalLine} (${progress}) ${statusIcon}`);
        }
      });

      if (animalExpectationLines.length > 0) {
        embed.addFields({
          name: '🐄 Expectativas de Animais',
          value: this.truncateFieldValue(animalExpectationLines.join('\n')),
          inline: false
        });
      }
    }

    // Add animal deliveries section
    const animalDeliveries = session.animalTransactions.filter(t => t.type === 'delivery_completed');
    if (animalDeliveries.length > 0) {
      const animalSummary = animalDeliveries.map(t => {
        const timeStr = `<t:${Math.floor(t.timestamp.getTime() / 1000)}:t>`;
        return `• ${timeStr} - ${t.quantity} Animais → $${(t.amount || 0).toFixed(2)}`;
      });

      embed.addFields({
        name: '🐄 Entregas de Animais',
        value: this.truncateFieldValue(animalSummary.join('\n')),
        inline: false
      });
    }

    // Add totals section
    if (session.totalCredits > 0) {
      const isSessionPaid = session.status === 'paid';
      embed.addFields({
        name: isSessionPaid ? '💰 Total Pago' : '💰 Total a Receber',
        value: `**$${session.totalCredits.toFixed(2)}**`,
        inline: true
      });
    }

    return embed;
  }

  // Transform existing embed into permanent receipt
  private async transformEmbedToReceipt(session: WorkerSession, status: 'paid' | 'verified', managerName: string): Promise<void> {
    try {
      if (!session.embedMessageId) {
        console.log(`⚠️ No embed message ID found for ${session.workerName}, cannot transform to receipt`);
        return;
      }

      const channel = await this.client.channels.fetch(session.channelId) as TextChannel;
      if (!channel) {
        console.error(`❌ Channel ${session.channelId} not found for worker ${session.workerName}`);
        return;
      }

      // Create the receipt embed (similar to active embed but with receipt formatting)
      const receiptEmbed = await this.createReceiptEmbed(session, status, managerName);

      try {
        const message = await channel.messages.fetch(session.embedMessageId);
        // Transform the existing embed into a receipt with no buttons
        await message.edit({
          embeds: [receiptEmbed],
          components: [] // Remove all buttons
        });
        console.log(`✅ Transformed embed to receipt for ${session.workerName} - ${status} by ${managerName}`);
      } catch (error) {
        console.error('❌ Failed to transform embed to receipt:', error);
      }

    } catch (error) {
      console.error(`❌ Error transforming embed to receipt for ${session.workerName}:`, error);
    }
  }

  // Create receipt embed (permanent record)
  private async createReceiptEmbed(session: WorkerSession, status: 'paid' | 'verified', managerName: string): Promise<EmbedBuilder> {
    const embed = new EmbedBuilder()
      .setTitle(`${this.getSessionIcon(session)} ${session.workerName} - ${status === 'paid' ? 'Pago' : 'Verificado'}`)
      .setTimestamp(new Date())
      .setFooter({ text: `${status === 'paid' ? 'Pago' : 'Verificado'} por ${managerName} • Sessão: ${session.sessionId.split('_')[1]}` })
      .setColor(0x0088FF); // Blue for receipt

    // Add session info
    embed.addFields({
      name: '📅 Informações da Sessão',
      value: `**Iniciado:** <t:${Math.floor(session.startTime.getTime() / 1000)}:R>\n**Finalizado:** <t:${Math.floor(Date.now() / 1000)}:t>`,
      inline: false
    });

    // Add seeds taken section (same as active embed)
    const seedsTaken = session.plantTransactions.filter(t => t.type === 'seed_taken');
    if (seedsTaken.length > 0) {
      const seedsDisplay = this.formatTransactionsWithSummarization(
        seedsTaken,
        '🌱 Sementes Retiradas',
        (t) => `${t.quantity} ${t.itemName}`,
        800
      );

      const totalSeeds = seedsTaken.reduce((sum, t) => sum + t.quantity, 0);
      const expectedPlants = totalSeeds * 10;
      const seedsSummary = `${seedsDisplay}\n**Total: ${totalSeeds} sementes → Esperado: ${expectedPlants} plantas**`;

      embed.addFields({
        name: '🌱 Sementes Retiradas',
        value: this.truncateFieldValue(seedsSummary),
        inline: false
      });
    }

    // Add completed seed expectations (all as strikethrough since it's a receipt)
    if (session.seedExpectations && session.seedExpectations.length > 0) {
      const expectationLines: string[] = [];

      session.seedExpectations.forEach(exp => {
        const seedLine = `${exp.seedQuantity} ${exp.seedType} → ${exp.expectedPlantQuantity} ${exp.expectedPlantType}`;
        expectationLines.push(`~~${seedLine}~~ ✅`);
      });

      if (expectationLines.length > 0) {
        embed.addFields({
          name: '🔄 Expectativas de Sementes (Finalizadas)',
          value: this.truncateFieldValue(expectationLines.join('\n')),
          inline: false
        });
      }
    }

    // Add plants deposited section (same as active embed)
    const plantsDeposited = session.plantTransactions.filter(t => t.type === 'plant_deposited');
    if (plantsDeposited.length > 0) {
      const groupedPlants = await this.groupPlantTransactionsByTypeAsync(plantsDeposited);
      const plantLines: string[] = [];
      let totalPlantCredits = 0;

      Object.entries(groupedPlants).forEach(([itemName, data]) => {
        totalPlantCredits += data.credits;
        if (data.count === 1) {
          plantLines.push(`• ${data.quantity} ${itemName} ($${data.credits.toFixed(2)})`);
        } else {
          plantLines.push(`• ${data.quantity} ${itemName} (${data.count} depósitos) ($${data.credits.toFixed(2)})`);
        }
      });

      const totalPlants = plantsDeposited.reduce((sum, t) => sum + t.quantity, 0);
      plantLines.push(`**Total: ${totalPlants} plantas = $${totalPlantCredits.toFixed(2)}**`);

      embed.addFields({
        name: '🌾 Plantas Depositadas',
        value: this.truncateFieldValue(plantLines.join('\n')),
        inline: false
      });
    }

    // Add completed animal expectations (all as strikethrough since it's a receipt)
    if (session.animalExpectations && session.animalExpectations.length > 0) {
      const animalExpectationLines: string[] = [];

      session.animalExpectations.forEach(exp => {
        const animalLine = `${exp.animalsTaken} Animais Retirados → Entrega Completa`;
        animalExpectationLines.push(`~~${animalLine}~~ ✅`);
      });

      if (animalExpectationLines.length > 0) {
        embed.addFields({
          name: '🐄 Expectativas de Animais (Finalizadas)',
          value: this.truncateFieldValue(animalExpectationLines.join('\n')),
          inline: false
        });
      }
    }

    // Add animal deliveries section (same as active embed)
    const animalDeliveries = session.animalTransactions.filter(t => t.type === 'delivery_completed');
    if (animalDeliveries.length > 0) {
      const animalSummary = animalDeliveries.map(t => {
        const timeStr = `<t:${Math.floor(t.timestamp.getTime() / 1000)}:t>`;
        return `• ${timeStr} - ${t.quantity} Animais → $${(t.amount || 0).toFixed(2)}`;
      });

      embed.addFields({
        name: '🐄 Entregas de Animais',
        value: this.truncateFieldValue(animalSummary.join('\n')),
        inline: false
      });
    }

    // Add final total section
    if (session.totalCredits > 0) {
      embed.addFields({
        name: status === 'paid' ? '💰 Total Pago' : '💰 Total Verificado',
        value: `**$${session.totalCredits.toFixed(2)}**`,
        inline: true
      });
    }

    return embed;
  }

  private getSessionIcon(session: WorkerSession): string {
    if (session.animalTransactions.length > 0 && session.plantTransactions.length > 0) {
      return '🌾🐄'; // Mixed
    } else if (session.animalTransactions.length > 0) {
      return '🐄'; // Animals only
    } else {
      return '🌾'; // Plants only
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Sessão Ativa';
      case 'pending_payment': return 'Pendente Pagamento';
      case 'paid': return 'Pago';
      case 'rejected': return 'Rejeitado';
      default: return 'Status Desconhecido';
    }
  }

  private createSessionButtons(session: WorkerSession): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (session.status === 'active' && session.totalCredits > 0) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`worker_pay_${session.workerId}`)
          .setLabel('💰 Pagar Trabalhador')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`worker_edit_${session.workerId}`)
          .setLabel('✏️ Editar')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    return row;
  }

  public async payWorker(workerId: string, managerId: string, managerName: string): Promise<boolean> {
    const session = this.activeSessions.get(workerId);

    // Enhanced debugging for payment issues
    console.log(`🔍 Payment attempt for worker ${workerId}:`);
    console.log(`   📊 Total active sessions: ${this.activeSessions.size}`);
    console.log(`   🆔 Available worker IDs: [${Array.from(this.activeSessions.keys()).join(', ')}]`);
    if (session) {
      console.log(`   ✅ Session found: ${session.workerName} - Status: ${session.status}`);
      console.log(`   💰 Credits: $${session.totalCredits.toFixed(2)}`);
    } else {
      console.log(`   ❌ No session found for worker ID: ${workerId}`);
    }

    if (!session || session.status !== 'active') {
      console.log(`⚠️ Cannot pay worker ${workerId}: session not found or not active (${session?.status})`);
      return false;
    }

    console.log(`💰 Processing payment for ${session.workerName} - $${session.totalCredits.toFixed(2)}`);

    // Transform embed into permanent receipt
    await this.transformEmbedToReceipt(session, 'paid', managerName);

    console.log(`📋 Payment processed - embed transformed into permanent receipt for ${session.workerName}`);

    // Wait a moment to ensure embed is updated before archiving
    await new Promise(resolve => setTimeout(resolve, 500));

    // Archive the session
    await this.archiveSession(session, 'paid', `Pago por ${managerName} (${managerId})`);
    
    // Create payment record
    const paymentRecord = {
      sessionId: session.sessionId,
      workerId: session.workerId,
      workerName: session.workerName,
      amount: session.totalCredits,
      paidBy: managerId,
      paidByName: managerName,
      paidAt: new Date(),
      plantTransactions: session.plantTransactions,
      animalTransactions: session.animalTransactions
    };

    // Save payment record
    const paymentsDir = path.join(this.dataDir, 'payments');
    if (!fs.existsSync(paymentsDir)) {
      fs.mkdirSync(paymentsDir, { recursive: true });
    }
    
    const paymentFile = path.join(paymentsDir, `${session.sessionId}.json`);
    fs.writeFileSync(paymentFile, JSON.stringify(paymentRecord, null, 2));

    // NEW: Create payment audit for verification tracking
    try {
      await this.paymentAuditService.createPaymentAudit(
        session.sessionId,
        managerId,
        managerName,
        session.workerId,
        session.workerName,
        session.totalCredits
      );
      console.log(`📊 Created payment audit for verification tracking`);
    } catch (auditError) {
      console.error('❌ Failed to create payment audit:', auditError);
      // Don't fail the payment if audit creation fails
    }

    // Enhanced: Remove from active sessions with comprehensive cleanup
    this.activeSessions.delete(workerId);
    this.saveActiveSessions();

    console.log(`✅ Successfully paid worker ${session.workerName} $${session.totalCredits.toFixed(2)} - Session archived and cleaned up`);
    console.log(`📋 Payment completed by ${managerName} (${managerId}) - Receipt saved as ${session.sessionId}`);
    
    return true;
  }

  private async archiveSession(session: WorkerSession, finalStatus: string, notes?: string): Promise<void> {
    const archiveDir = path.join(this.dataDir, 'archived');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const archivedSession = {
      ...session,
      status: finalStatus,
      completedAt: new Date(),
      notes
    };

    const archiveFile = path.join(archiveDir, `${session.sessionId}.json`);
    fs.writeFileSync(archiveFile, JSON.stringify(archivedSession, null, 2));
  }

  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  public getAllActiveSessions(): WorkerSession[] {
    return Array.from(this.activeSessions.values());
  }

  public getWorkerSession(workerId: string): WorkerSession | undefined {
    return this.activeSessions.get(workerId);
  }

  /**
   * Edit a transaction item name (global save)
   */
  public async editTransaction(workerId: string, transactionId: string, newItemName?: string, newQuantity?: number, newAmount?: number): Promise<boolean> {
    try {
      const session = this.activeSessions.get(workerId);
      if (!session) {
        console.error(`❌ Worker session not found: ${workerId}`);
        return false;
      }

      let transactionFound = false;
      
      // Search plant transactions
      for (const transaction of session.plantTransactions) {
        if (transaction.transactionId === transactionId) {
          let changes: string[] = [];
          
          if (newItemName) {
            const oldItemName = transaction.itemName;
            transaction.itemName = newItemName;
            changes.push(`name: "${oldItemName}" → "${newItemName}"`);
          }
          
          if (newQuantity !== undefined) {
            const oldQuantity = transaction.quantity;
            transaction.quantity = newQuantity;
            changes.push(`quantity: ${oldQuantity} → ${newQuantity}`);
          }
          
          console.log(`✏️ Edited plant transaction ${transactionId}: ${changes.join(', ')}`);
          transactionFound = true;
          break;
        }
      }

      // Search animal transactions if not found in plants
      if (!transactionFound) {
        for (const transaction of session.animalTransactions) {
          if (transaction.transactionId === transactionId) {
            let changes: string[] = [];
            
            if (newItemName) {
              const oldAnimalType = transaction.animalType;
              transaction.animalType = newItemName;
              changes.push(`type: "${oldAnimalType}" → "${newItemName}"`);
            }
            
            if (newQuantity !== undefined) {
              const oldQuantity = transaction.quantity;
              transaction.quantity = newQuantity;
              changes.push(`quantity: ${oldQuantity} → ${newQuantity}`);
            }
            
            if (newAmount !== undefined) {
              const oldAmount = transaction.amount;
              transaction.amount = newAmount;
              changes.push(`amount: $${oldAmount} → $${newAmount}`);
            }
            
            console.log(`✏️ Edited animal transaction ${transactionId}: ${changes.join(', ')}`);
            transactionFound = true;
            break;
          }
        }
      }

      if (!transactionFound) {
        console.error(`❌ Transaction not found: ${transactionId}`);
        return false;
      }

      // Recalculate session totals after editing
      await this.recalculateSessionCredits(session);
      
      // Save globally to file
      this.saveActiveSessions();
      
      // Update Discord embed
      await this.updateWorkerEmbed(session);
      
      console.log(`💾 Transaction ${transactionId} edited and saved globally`);
      return true;

    } catch (error) {
      console.error('❌ Error editing transaction:', error);
      return false;
    }
  }

  /**
   * Delete a transaction (global save)
   */
  public async deleteTransaction(workerId: string, transactionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(workerId);
      if (!session) {
        console.error(`❌ Worker session not found: ${workerId}`);
        return false;
      }

      let transactionFound = false;
      let deletedValue = 0;
      
      // Search and delete from plant transactions
      const plantIndex = session.plantTransactions.findIndex(t => t.transactionId === transactionId);
      if (plantIndex !== -1) {
        const transaction = session.plantTransactions[plantIndex];
        
        // Calculate value to subtract from credits
        const prices = await this.getWorkerPrices('fazenda-cabra-da-peste');
        deletedValue = transaction.quantity * prices.plantPrice;
        
        session.plantTransactions.splice(plantIndex, 1);
        console.log(`🗑️ Deleted plant transaction ${transactionId}: ${transaction.itemName} x${transaction.quantity}`);
        transactionFound = true;
      }

      // Search and delete from animal transactions if not found in plants
      if (!transactionFound) {
        const animalIndex = session.animalTransactions.findIndex(t => t.transactionId === transactionId);
        if (animalIndex !== -1) {
          const transaction = session.animalTransactions[animalIndex];
          deletedValue = transaction.amount || 0;
          
          session.animalTransactions.splice(animalIndex, 1);
          console.log(`🗑️ Deleted animal transaction ${transactionId}: ${transaction.animalType} x${transaction.quantity}`);
          transactionFound = true;
        }
      }

      if (!transactionFound) {
        console.error(`❌ Transaction not found: ${transactionId}`);
        return false;
      }

      // Recalculate total credits globally
      session.totalCredits = Math.max(0, session.totalCredits - deletedValue);
      
      // Save globally to file
      this.saveActiveSessions();
      
      // Update Discord embed
      await this.updateWorkerEmbed(session);
      
      console.log(`💾 Transaction ${transactionId} deleted and credits recalculated globally (${deletedValue} subtracted)`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting transaction:', error);
      return false;
    }
  }

  // Helper method to truncate field values that exceed Discord's 1024 character limit
  private truncateFieldValue(content: string, maxLength: number = 1020): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Find a good breaking point (preferably at a newline)
    const lines = content.split('\n');
    let truncatedContent = '';
    let remainingCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineToAdd = (i === 0 ? '' : '\n') + lines[i];

      if ((truncatedContent + lineToAdd).length <= maxLength - 50) { // Leave room for "... (mais X entradas)"
        truncatedContent += lineToAdd;
      } else {
        remainingCount = lines.length - i;
        break;
      }
    }

    if (remainingCount > 0) {
      truncatedContent += `\n... (mais ${remainingCount} entradas)`;
    }

    return truncatedContent;
  }
}

export default WorkerActivityService;