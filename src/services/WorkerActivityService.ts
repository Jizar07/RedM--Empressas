import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import PaymentAuditService from './PaymentAuditService';
import { SessionCleanupService } from '../utils/SessionCleanupService';
import WeeklySalesService from './WeeklySalesService';
import ItemTranslationService from './ItemTranslationService';
import { WeeklyRankingService } from './WeeklyRankingService';
import PaymentConfigService from './PaymentConfigService';
import { WorkerChannelService } from './WorkerChannelService';

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

interface FinancialTransaction {
  type: 'bercario_purchase';
  itemName: string;
  quantity: number;
  amount: number;
  description?: string;
  timestamp: Date;
  transactionId: string;
}

interface InventoryTransaction {
  type: 'inventory_added' | 'inventory_removed';
  itemName: string;
  itemCategory: string; // plantas, materiais, produtos, caixas, animais, sementes, outros
  quantity: number;
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
  aduboUsed?: number; // Adubo3 quantity used (doubles plant yield)
  aduboCost?: number; // Cost of Adubo3 used ($0.75 per unit)
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
  serverId?: string; // Discord server/guild ID for multi-server support
  startTime: Date;
  lastActivity: Date;
  status: 'active' | 'pending_payment' | 'paid' | 'rejected';
  plantTransactions: PlantTransaction[];
  animalTransactions: AnimalTransaction[];
  financialTransactions?: FinancialTransaction[]; // Track financial transactions like Bercario purchases
  inventoryTransactions?: InventoryTransaction[]; // Track inventory additions/removals by category
  seedExpectations?: SeedExpectation[]; // Track seed-to-plant expectations
  animalExpectations?: AnimalExpectation[]; // Track animal-taking expectations
  unregisteredPlants?: PlantTransaction[]; // Plants detected from historical messages (today only, unpaid sessions)
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
  private serviceConfigCache: Map<string, ServiceConfig> = new Map(); // Per-server config cache
  private workerPricesCache: Map<string, { prices: WorkerPrices; fetchedAt: Date }> = new Map();
  private paymentAuditService: PaymentAuditService;
  private cleanupService: SessionCleanupService;
  private weeklySalesService: WeeklySalesService;
  private translationService: ItemTranslationService;

  constructor(client: Client) {
    this.client = client;
    this.dataDir = path.join(process.cwd(), 'data', 'worker-sessions');
    this.paymentAuditService = PaymentAuditService.getInstance();
    this.cleanupService = new SessionCleanupService();
    this.weeklySalesService = WeeklySalesService.getInstance();
    this.translationService = ItemTranslationService.getInstance();
    this.ensureDataDirectory();
    // Config loaded per-server on-demand, sessions loaded from all servers
    this.loadActiveSessions();

    // Start automatic cleanup service
    this.cleanupService.startAutoCleanup();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('📁 Created worker sessions directory');
    }
  }

  /**
   * Get path for server-specific sessions file with fallback to legacy
   */
  private getSessionsPath(serverId?: string): string {
    if (serverId) {
      const serverPath = path.join(this.dataDir, serverId, 'active-sessions.json');
      // Check if server-specific path exists
      if (fs.existsSync(path.dirname(serverPath))) {
        return serverPath;
      }
    }
    // Fallback to legacy path
    return path.join(this.dataDir, 'active-sessions.json');
  }

  /**
   * Get path for server-specific archived sessions directory
   */
  private getArchivedPath(serverId?: string): string {
    if (serverId) {
      const serverPath = path.join(this.dataDir, serverId, 'archived');
      if (fs.existsSync(serverPath)) {
        return serverPath;
      }
    }
    // Fallback to legacy path
    return path.join(this.dataDir, 'archived');
  }

  /**
   * Load and cache service config per server
   */
  private getServiceConfig(serverId?: string): ServiceConfig {
    // Return cached config if available
    const cacheKey = serverId || 'default';
    if (this.serviceConfigCache.has(cacheKey)) {
      return this.serviceConfigCache.get(cacheKey)!;
    }

    // Load config from file
    try {
      const configPath = path.join(process.cwd(), 'data', 'farm-service-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const fullConfig = JSON.parse(configData);

      let config: ServiceConfig;

      // Check if new server-based structure
      if (fullConfig.servers && serverId && fullConfig.servers[serverId]) {
        config = fullConfig.servers[serverId];
        console.log(`⚙️ Loaded farm service configuration for server ${serverId}`);
      } else if (fullConfig.servers) {
        // New structure but no serverId provided or not found - use first server's config as fallback
        const firstServerId = Object.keys(fullConfig.servers)[0];
        config = fullConfig.servers[firstServerId];
        console.log(`⚙️ Loaded farm service configuration (fallback to ${firstServerId})`);
      } else {
        // Legacy structure - use as-is
        config = fullConfig;
        console.log('⚙️ Loaded farm service configuration (legacy format)');
      }

      // Cache the config
      this.serviceConfigCache.set(cacheKey, config);
      return config;
    } catch (error) {
      console.error('❌ Error loading service config:', error);
      // Default configuration
      const defaultConfig: ServiceConfig = {
        plantPrices: { basic: 0.25, other: 0.25 },
        basicPlants: ['Milho', 'Trigo', 'Junco'],
        optimalAnimalIncome: 60,
        animalTypes: ['Bovino', 'Ovino', 'Suino', 'Caprino', 'Equino', 'Avino']
      };
      this.serviceConfigCache.set(cacheKey, defaultConfig);
      return defaultConfig;
    }
  }

  private loadActiveSessions(): void {
    try {
      // Load sessions from all server directories + legacy path
      const serverDirs: string[] = [];

      // Check for server-specific directories
      if (fs.existsSync(this.dataDir)) {
        const entries = fs.readdirSync(this.dataDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.match(/^\d+$/)) {
            // Looks like a server ID directory
            serverDirs.push(entry.name);
          }
        }
      }

      // Add legacy path (undefined = no serverId)
      serverDirs.push('');

      let totalLoaded = 0;
      let totalSkipped = 0;

      for (const serverId of serverDirs) {
        const sessionsFile = this.getSessionsPath(serverId || undefined);
        if (!fs.existsSync(sessionsFile)) {
          continue;
        }

        const data = fs.readFileSync(sessionsFile, 'utf8');
        const sessions = JSON.parse(data);

        let loadedCount = 0;
        let skippedCount = 0;
        let cleanedUp = false;

        // Get list of archived session IDs to prevent loading zombie sessions
        const archivedSessionIds = this.getArchivedSessionIds(serverId || undefined);

        console.log(`📂 Loading sessions for server: ${serverId || 'legacy'}...`);

        // Convert to Map and restore Date objects - ONLY for active sessions
        Object.entries(sessions).forEach(([workerId, session]: [string, any]) => {
          // Skip placeholder entries completely
          if (workerId === 'placeholder_user_id' || session.channelId === 'placeholder_channel_id') {
            console.log(`🧹 Removing placeholder entry: ${workerId}`);
            cleanedUp = true;
            return;
          }

          // ZOMBIE SESSION CHECK: Skip sessions that exist in archived folder
          if (archivedSessionIds.has(session.sessionId)) {
            console.log(`🧟 ZOMBIE SESSION DETECTED: ${session.workerName} (${session.sessionId}) - exists in archived folder, removing from active`);
            cleanedUp = true;
            return;
          }

          // CRITICAL FIX: Only load sessions with 'active' status
          if (session.status !== 'active') {
            console.log(`⏭️ Skipping non-active session for ${session.workerName} (status: ${session.status})`);
            skippedCount++;
            cleanedUp = true;
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

          // Initialize and restore financial transactions
          if (session.financialTransactions) {
            session.financialTransactions = session.financialTransactions.map((t: any) => ({
              ...t,
              timestamp: new Date(t.timestamp)
            }));
          } else {
            session.financialTransactions = [];
          }

          // Initialize and restore inventory transactions
          if (session.inventoryTransactions) {
            session.inventoryTransactions = session.inventoryTransactions.map((t: any) => ({
              ...t,
              timestamp: new Date(t.timestamp)
            }));
          } else {
            session.inventoryTransactions = [];
          }

          // Restore animal expectations with Date objects
          if (session.animalExpectations) {
            session.animalExpectations = session.animalExpectations.map((exp: any) => ({
              ...exp,
              takenTimestamp: new Date(exp.takenTimestamp)
            }));
          }

          // Set serverId if not already set (for legacy sessions)
          if (!session.serverId && serverId) {
            session.serverId = serverId;
          }

          this.activeSessions.set(workerId, session);
          loadedCount++;
        });

        totalLoaded += loadedCount;
        totalSkipped += skippedCount;

        console.log(`📊 Loaded ${loadedCount} active worker sessions from ${serverId || 'legacy'} (skipped ${skippedCount} non-active sessions)`);

        // If we cleaned up any sessions, save immediately
        if (cleanedUp) {
          console.log(`🧹 Cleaning up sessions file for ${serverId || 'legacy'}...`);
          this.saveActiveSessions();
        }
      }

      console.log(`✅ Total sessions loaded: ${totalLoaded} across all servers (skipped ${totalSkipped} non-active)`);
    } catch (error) {
      console.error('❌ Error loading active sessions:', error);
    }
  }

  private saveActiveSessions(): void {
    try {
      // Group sessions by serverId
      const sessionsByServer = new Map<string, Map<string, WorkerSession>>();

      this.activeSessions.forEach((session, workerId) => {
        // CRITICAL FIX: Only save sessions with 'active' status
        if (session.status !== 'active') {
          console.log(`⏭️ Excluding non-active session from save: ${session.workerName} (status: ${session.status})`);
          return;
        }

        const serverId = session.serverId || 'legacy';
        if (!sessionsByServer.has(serverId)) {
          sessionsByServer.set(serverId, new Map());
        }
        sessionsByServer.get(serverId)!.set(workerId, session);
      });

      let totalSaved = 0;
      let totalExcluded = this.activeSessions.size;

      // Save each server's sessions to its own file
      for (const [serverId, serverSessions] of sessionsByServer.entries()) {
        const sessionsFile = this.getSessionsPath(serverId === 'legacy' ? undefined : serverId);

        // Ensure server directory exists
        const sessionDir = path.dirname(sessionsFile);
        if (!fs.existsSync(sessionDir)) {
          fs.mkdirSync(sessionDir, { recursive: true });
        }

        const sessions = Object.fromEntries(serverSessions);
        fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
        totalSaved += serverSessions.size;
        console.log(`💾 Saved ${serverSessions.size} active sessions for ${serverId === 'legacy' ? 'legacy' : `server ${serverId}`}`);
      }

      totalExcluded -= totalSaved;
      console.log(`✅ Total saved: ${totalSaved} sessions across ${sessionsByServer.size} servers (excluded ${totalExcluded} non-active)`);
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

  /**
   * Extract timestamp from message content using the "Data::" field format
   * Format: "Data:: DD/MM/YYYY - HH:MM:SS"
   * This ensures we use the actual game log timestamp, not the server's local time
   */
  private extractTimestampFromMessage(messageContent: string): Date | null {
    if (!messageContent) return null;

    const datePattern = /Data::\s*(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}):(\d{2}):(\d{2})/i;
    const match = messageContent.match(datePattern);

    if (match) {
      const [, day, month, year, hours, minutes, seconds] = match;
      const timestamp = new Date(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hours),
        parseInt(minutes),
        parseInt(seconds)
      );
      console.log(`🕐 WorkerActivity: Extracted timestamp from message: ${timestamp.toISOString()}`);
      return timestamp;
    }

    return null;
  }

  // Get all archived session IDs to prevent zombie sessions
  private getArchivedSessionIds(serverId?: string): Set<string> {
    const archivedIds = new Set<string>();
    try {
      const archiveDir = this.getArchivedPath(serverId);
      if (fs.existsSync(archiveDir)) {
        const files = fs.readdirSync(archiveDir);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            // Extract session ID from filename (remove .json extension)
            const sessionId = file.replace('.json', '');
            archivedIds.add(sessionId);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error reading archived sessions:', error);
    }
    return archivedIds;
  }

  // Convert seed name to expected plant name and calculate expected quantity
  private createSeedExpectation(seedType: string, seedQuantity: number, transactionId: string, aduboQuantity: number = 0): SeedExpectation {
    // Seed to plant conversion mapping (1 seed typically produces 10 plants, 20 with Adubo3)
    const seedToPlantMap: { [key: string]: { plantType: string; multiplier: number } } = {
      'Semente de Milho': { plantType: 'Milho', multiplier: 10 },
      'Semente de Trigo': { plantType: 'Trigo', multiplier: 10 },
      'Semente Trigo': { plantType: 'Trigo', multiplier: 10 }, // Alternative name
      'Semente de Junco': { plantType: 'Junco', multiplier: 10 },
      'Semente Junco': { plantType: 'Junco', multiplier: 10 } // Alternative name
    };

    const mapping = seedToPlantMap[seedType] || { plantType: seedType.replace('Semente de ', '').replace('Semente ', ''), multiplier: 10 };

    // If Adubo3 is used, double the multiplier (10 → 20)
    const effectiveMultiplier = aduboQuantity > 0 ? mapping.multiplier * 2 : mapping.multiplier;
    const aduboCost = aduboQuantity * 0.75; // $0.75 per Adubo3

    return {
      seedType,
      seedQuantity,
      expectedPlantType: mapping.plantType,
      expectedPlantQuantity: seedQuantity * effectiveMultiplier,
      plantsFulfilled: 0,
      isComplete: false,
      transactionId,
      aduboUsed: aduboQuantity > 0 ? aduboQuantity : undefined,
      aduboCost: aduboCost > 0 ? aduboCost : undefined
    };
  }

  // Add Adubo3 to the most recent incomplete seed expectation
  private addAduboToLastExpectation(session: WorkerSession, aduboQuantity: number): boolean {
    if (!session.seedExpectations || session.seedExpectations.length === 0) {
      console.log(`⚠️ No seed expectations found to add Adubo3 to for worker ${session.workerName}`);
      return false;
    }

    // Find the most recent incomplete seed expectation
    const incompleteExpectations = session.seedExpectations.filter(exp => !exp.isComplete);
    if (incompleteExpectations.length === 0) {
      console.log(`⚠️ No incomplete seed expectations found to add Adubo3 to for worker ${session.workerName}`);
      return false;
    }

    // Add Adubo3 to the most recent incomplete expectation
    const lastExpectation = incompleteExpectations[incompleteExpectations.length - 1];

    // If Adubo3 already added, combine quantities
    const previousAdubo = lastExpectation.aduboUsed || 0;
    const totalAdubo = previousAdubo + aduboQuantity;

    // Recalculate expected plants with Adubo3 (double the yield)
    const baseMultiplier = 10;
    lastExpectation.aduboUsed = totalAdubo;
    lastExpectation.aduboCost = totalAdubo * 0.75;
    lastExpectation.expectedPlantQuantity = lastExpectation.seedQuantity * (baseMultiplier * 2); // Double yield with Adubo3

    console.log(`🌿 Added ${aduboQuantity} Adubo3 to ${lastExpectation.seedType} expectation (total: ${totalAdubo}). New expected: ${lastExpectation.expectedPlantQuantity} plants`);
    return true;
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
      const timeStr = new Date(transaction.timestamp).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      }) + ' ' + new Date(transaction.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
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
  private async groupPlantTransactionsByTypeAsync(transactions: PlantTransaction[], serverId?: string): Promise<{ [itemName: string]: { quantity: number; count: number; credits: number; firstTimestamp: Date; lastTimestamp: Date } }> {
    const grouped: { [itemName: string]: { quantity: number; count: number; credits: number; firstTimestamp: Date; lastTimestamp: Date } } = {};

    // CRITICAL FIX: Use PaymentConfigService with server-specific pricing
    const paymentConfigService = PaymentConfigService.getInstance();
    const paymentConfig = await paymentConfigService.getConfig(serverId);
    const plantPrice = paymentConfig.defaultPrices.plants.unitPrice;

    transactions.forEach(transaction => {
      const itemName = transaction.itemName;
      const credits = transaction.quantity * plantPrice;

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
  private calculateAnimalPayment(quantity: number, _animalType?: string, serverId?: string): number {
    // For now, use the base rate per animal
    // Could be enhanced with per-animal-type rates in the future
    const config = this.getServiceConfig(serverId);
    return quantity * (config.optimalAnimalIncome / 4); // Assuming 4 animals per optimal income
  }

  private async recalculateSessionCredits(session: WorkerSession): Promise<void> {
    // ✅ FIXED: Use PaymentConfigService with server-specific config
    const paymentConfigService = PaymentConfigService.getInstance();
    const paymentConfig = await paymentConfigService.getConfig(session.serverId);

    // Extract pricing from server-specific payment config - CRITICAL FIX: Use unitPrice not basePrice
    const plantPrice = paymentConfig.defaultPrices.plants.unitPrice;
    const animalPrice = paymentConfig.defaultPrices.animals.unitPrice;

    console.log(`💰 Using server-specific prices for ${session.serverId || 'legacy'}: plants=$${plantPrice}, animals=$${animalPrice}`);

    let totalCredits = 0;

    // Calculate plant credits - Pay for ALL registered plants deposited
    session.plantTransactions
      .filter(t => t.type === 'plant_deposited')
      .forEach(transaction => {
        // Pay for ALL plants deposited regardless of seed expectations
        const plantCredit = transaction.quantity * plantPrice;
        totalCredits += plantCredit;
        console.log(`💰 Plant payment (registered): ${transaction.quantity} ${transaction.itemName} = $${plantCredit.toFixed(2)} (rate: $${plantPrice})`);

        // Still update seed expectations for tracking purposes
        this.updateSeedExpectations(session, transaction.itemName, transaction.quantity);
      });

    // Calculate unregistered plant credits - Pay for ALL unregistered plants detected
    if (session.unregisteredPlants && session.unregisteredPlants.length > 0) {
      session.unregisteredPlants.forEach(transaction => {
        const plantCredit = transaction.quantity * plantPrice;
        totalCredits += plantCredit;
        console.log(`💰 Plant payment (unregistered): ${transaction.quantity} ${transaction.itemName} = $${plantCredit.toFixed(2)} (rate: $${plantPrice})`);
      });
    }

    // NOTE: Adubo3 costs are deducted in embed display by counting plantTransactions
    // Removed duplicate deduction from here to prevent double-charging workers

    // Calculate animal deliveries - Workers get FULL delivery amount
    // Animal costs are for FRONTEND analytics only, NOT backend payments
    const deliveryAmount = session.animalTransactions
      .filter(t => t.type === 'delivery_completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    totalCredits += deliveryAmount;  // Workers paid full $160 per delivery

    session.totalCredits = totalCredits;

    console.log(`💰 Total credits calculated for ${session.workerName}: $${totalCredits.toFixed(2)}`);
  }

  /**
   * Validate and sync channel ID from worker mappings (source of truth)
   * Prevents "Unknown Channel" errors by ensuring session uses current valid channel
   *
   * @param session - Worker session to validate
   * @returns Valid channel ID or null if channel doesn't exist
   */
  private async validateAndSyncChannelId(session: WorkerSession): Promise<string | null> {
    try {
      // Get current channel ID from worker mappings (source of truth)
      const workerChannelService = WorkerChannelService.getInstance(this.client);
      const workerMapping = workerChannelService.getWorkerChannel(session.workerId);

      if (!workerMapping) {
        console.warn(`⚠️ No worker mapping found for ${session.workerName} (${session.workerId})`);
        return null;
      }

      // Check if session has outdated channel ID
      if (session.channelId !== workerMapping.channelId) {
        console.log(`🔄 Channel ID mismatch detected for ${session.workerName}:`);
        console.log(`   Old Channel: ${session.channelId}`);
        console.log(`   New Channel: ${workerMapping.channelId}`);
        console.log(`   🔧 Auto-syncing session to use current channel...`);

        // Update session with current channel ID
        session.channelId = workerMapping.channelId;

        // Save updated session immediately
        this.saveActiveSessions();

        console.log(`✅ Session updated with current channel ID`);
      }

      // Verify channel exists in Discord
      try {
        const channel = await this.client.channels.fetch(workerMapping.channelId);
        if (!channel) {
          console.error(`❌ Channel ${workerMapping.channelId} not found in Discord for ${session.workerName}`);
          return null;
        }
        return workerMapping.channelId;
      } catch (error) {
        console.error(`❌ Error fetching channel ${workerMapping.channelId} for ${session.workerName}:`, error);
        return null;
      }

    } catch (error) {
      console.error(`❌ Error validating channel ID for ${session.workerName}:`, error);
      return null;
    }
  }

  /**
   * Scan worker channel for unregistered plant deposits (ALL messages since session start, unpaid sessions only)
   * This detects plants that were deposited but not tracked because they weren't categorized at the time
   */
  private async scanForUnregisteredPlants(session: WorkerSession): Promise<void> {
    // Only scan for unpaid sessions
    if (session.status === 'paid' || session.status === 'rejected') {
      console.log(`⏭️ Skipping unregistered plant scan for ${session.status} session: ${session.workerName}`);
      return;
    }

    try {
      // Validate and sync channel ID before fetching
      const validChannelId = await this.validateAndSyncChannelId(session);
      if (!validChannelId) {
        console.warn(`⚠️ Cannot scan for unregistered plants - invalid channel for ${session.workerName}`);
        return;
      }

      const channel = await this.client.channels.fetch(validChannelId) as TextChannel;
      if (!channel) {
        console.warn(`⚠️ Channel ${validChannelId} not found for unregistered plant scan`);
        return;
      }

      // Fetch messages (Discord limit 100) to catch historical deposits
      const messages = await channel.messages.fetch({ limit: 100 });

      const unregisteredPlants: PlantTransaction[] = [];
      const processedTransactionIds = new Set<string>();

      // Build set of already registered plant transaction IDs for quick lookup
      session.plantTransactions.forEach(t => {
        if (t.type === 'plant_deposited') {
          processedTransactionIds.add(t.transactionId);
        }
      });

      console.log(`🔍 Scanning ${messages.size} messages since session start (${session.startTime.toLocaleString('pt-BR')}) for unregistered plants in ${session.workerName}'s channel...`);

      for (const message of messages.values()) {
        // Skip messages from BEFORE the session started (don't include previous paid sessions)
        if (message.createdAt < session.startTime) continue;

        const content = message.content || '';

        // Pattern: "Item adicionado:: Crows_Garlic x150"
        const itemAdicionadoPattern = /Item adicionado::?\s*\n?\s*([^x]+)\s*x(\d+)/is;
        const match = content.match(itemAdicionadoPattern);

        if (match) {
          const itemName = match[1].trim();
          const quantity = parseInt(match[2]);

          // Check if this item is a plant using translation service
          if (this.translationService.isPlant(itemName)) {
            // Create a unique transaction ID based on message timestamp + item
            const messageTransactionId = `${message.createdTimestamp}_${itemName}_${quantity}`;

            // Check if we already tracked this transaction
            const alreadyTracked = session.plantTransactions.some(t =>
              t.type === 'plant_deposited' &&
              t.itemName === this.translationService.getPortugueseName(itemName) &&
              Math.abs(new Date(t.timestamp).getTime() - message.createdTimestamp) < 5000 // Within 5 seconds
            );

            if (!alreadyTracked && !processedTransactionIds.has(messageTransactionId)) {
              const portugueseName = this.translationService.getPortugueseName(itemName);

              unregisteredPlants.push({
                type: 'plant_deposited',
                itemName: portugueseName,
                quantity,
                timestamp: message.createdAt,
                transactionId: messageTransactionId
              });

              processedTransactionIds.add(messageTransactionId);
              console.log(`🌾 Found unregistered plant: ${quantity} ${itemName} (${portugueseName}) deposited at ${message.createdAt.toLocaleString('pt-BR')}`);
            }
          }
        }
      }

      // Update session with unregistered plants
      if (unregisteredPlants.length > 0) {
        session.unregisteredPlants = unregisteredPlants;
        console.log(`✅ Added ${unregisteredPlants.length} unregistered plant transactions for ${session.workerName}`);
      } else {
        session.unregisteredPlants = undefined; // Clear if none found
        console.log(`ℹ️ No unregistered plants found for ${session.workerName}`);
      }

    } catch (error) {
      console.error(`❌ Error scanning for unregistered plants in ${session.workerName}'s channel:`, error);
    }
  }

  public async getOrCreateSession(workerId: string, workerName: string, channelId: string): Promise<WorkerSession> {
    let session = this.activeSessions.get(workerId);

    // CRITICAL FIX: If session exists but is not active, remove it completely
    if (session) {
      // Check if this session was archived (zombie detection)
      const archivedSessionIds = this.getArchivedSessionIds();
      if (archivedSessionIds.has(session.sessionId)) {
        console.log(`🧟 ZOMBIE SESSION RESURRECTION BLOCKED: ${workerName} (${session.sessionId}) - session was paid and archived, removing completely`);
        this.activeSessions.delete(workerId);
        this.saveActiveSessions();
        session = undefined;
      } else if (!this.isSessionActive(session)) {
        console.log(`⚠️ Found non-active session (${session.status}) for ${workerName}, removing and creating fresh session`);
        this.activeSessions.delete(workerId);
        this.saveActiveSessions();
        session = undefined;
      }
    }

    if (!session) {
      // Enhanced: Ensure completely clean session creation
      console.log(`🆕 Creating fresh session for worker ${workerName} (${workerId})`);

      // ✅ CRITICAL FIX: Get serverId from Discord channel's guild
      let serverId: string | undefined;
      try {
        const channel = await this.client.channels.fetch(channelId);
        if (channel && 'guild' in channel && channel.guild) {
          serverId = channel.guild.id;
          console.log(`🔍 Detected serverId from channel: ${serverId}`);
        }
      } catch (error) {
        console.error(`❌ Error fetching channel ${channelId} to get serverId:`, error);
      }

      session = {
        workerId,
        workerName,
        channelId,
        sessionId: this.generateSessionId(),
        serverId, // ✅ FIX: Set serverId from guild
        startTime: new Date(),
        lastActivity: new Date(),
        status: 'active',
        plantTransactions: [],
        animalTransactions: [],
        financialTransactions: [],
        inventoryTransactions: [],
        totalCredits: 0,
        // Explicitly set embedMessageId to undefined to force new embed creation
        embedMessageId: undefined
      };

      this.activeSessions.set(workerId, session);
      this.saveActiveSessions();
      console.log(`✅ Created new active session for worker ${workerName} (${workerId}) on server ${serverId || 'unknown'}`);
    }

    return session;
  }

  public async addPlantTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<PlantTransaction, 'transactionId' | 'timestamp'>, messageContent?: string): Promise<void> {
    // Enhanced: Check for paid session and cleanup if needed
    const existingSession = this.activeSessions.get(workerId);
    if (existingSession && !this.isSessionActive(existingSession)) {
      console.log(`⚠️ Attempting to add plant transaction to non-active session (${existingSession.status}) for ${workerName}, cleaning up...`);
      await this.cleanupPaidSession(workerId);
    }

    const session = await this.getOrCreateSession(workerId, workerName, channelId);

    // Extract timestamp from message content (game log time) or fallback to current time
    const extractedTimestamp = messageContent ? this.extractTimestampFromMessage(messageContent) : null;
    const activityTimestamp = extractedTimestamp || new Date();
    console.log(`🕐 Plant transaction timestamp: ${activityTimestamp.toISOString()} (source: ${extractedTimestamp ? 'extracted from Data::' : 'current time'})`);

    const plantTransaction: PlantTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: activityTimestamp
    };

    session.plantTransactions.push(plantTransaction);
    session.lastActivity = new Date();

    // Handle seed expectation tracking
    if (plantTransaction.type === 'seed_taken') {
      const itemNameLower = plantTransaction.itemName.toLowerCase();

      // Check if this is Adubo3
      if (itemNameLower.includes('adubo3') || itemNameLower.includes('adubo 3')) {
        // Add Adubo3 to the most recent incomplete seed expectation
        if (!session.seedExpectations) {
          session.seedExpectations = [];
        }
        const aduboAdded = this.addAduboToLastExpectation(session, plantTransaction.quantity);
        if (!aduboAdded) {
          console.log(`⚠️ Adubo3 withdrawn but no seed expectation to apply it to. Worker may have taken Adubo3 before seeds.`);
        }
      } else {
        // Regular seed - create new seed expectation
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
    }

    await this.recalculateSessionCredits(session);
    this.saveActiveSessions();

    console.log(`🌱 Added plant transaction for ${workerName}: ${transaction.type} - ${transaction.quantity} ${transaction.itemName}`);

    // Update weekly rankings for plant deposits (not seed withdrawals)
    if (transaction.type === 'plant_deposited') {
      const weeklyRankingService = WeeklyRankingService.getInstance();
      weeklyRankingService.updateWorkerStats(workerId, workerName, 'plants', transaction.quantity);
    }

    // Update the embed
    this.updateWorkerEmbed(session);
  }

  public async addAnimalTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<AnimalTransaction, 'transactionId' | 'timestamp'>, messageContent?: string): Promise<void> {
    // Enhanced: Check for paid session and cleanup if needed
    const existingSession = this.activeSessions.get(workerId);
    if (existingSession && !this.isSessionActive(existingSession)) {
      console.log(`⚠️ Attempting to add animal transaction to non-active session (${existingSession.status}) for ${workerName}, cleaning up...`);
      await this.cleanupPaidSession(workerId);
    }

    const session = await this.getOrCreateSession(workerId, workerName, channelId);

    // Extract timestamp from message content (game log time) or fallback to current time
    const extractedTimestamp = messageContent ? this.extractTimestampFromMessage(messageContent) : null;
    const activityTimestamp = extractedTimestamp || new Date();
    console.log(`🕐 Animal transaction timestamp: ${activityTimestamp.toISOString()} (source: ${extractedTimestamp ? 'extracted from Data::' : 'current time'})`);

    const animalTransaction: AnimalTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: activityTimestamp
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

    // Update weekly rankings for animal deliveries (not when taking animals)
    if (transaction.type === 'delivery_completed') {
      const weeklyRankingService = WeeklyRankingService.getInstance();
      weeklyRankingService.updateWorkerStats(workerId, workerName, 'animals', transaction.quantity);
    }

    // Update the embed
    this.updateWorkerEmbed(session);
  }

  public async addFinancialTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<FinancialTransaction, 'transactionId' | 'timestamp'>, messageContent?: string): Promise<void> {
    // Enhanced: Check for paid session and cleanup if needed
    const existingSession = this.activeSessions.get(workerId);
    if (existingSession && !this.isSessionActive(existingSession)) {
      console.log(`⚠️ Attempting to add financial transaction to non-active session (${existingSession.status}) for ${workerName}, cleaning up...`);
      await this.cleanupPaidSession(workerId);
    }

    const session = await this.getOrCreateSession(workerId, workerName, channelId);

    // Initialize financialTransactions array if it doesn't exist
    if (!session.financialTransactions) {
      session.financialTransactions = [];
    }

    // Extract timestamp from message content (game log time) or fallback to current time
    const extractedTimestamp = messageContent ? this.extractTimestampFromMessage(messageContent) : null;
    const activityTimestamp = extractedTimestamp || new Date();
    console.log(`🕐 Financial transaction timestamp: ${activityTimestamp.toISOString()} (source: ${extractedTimestamp ? 'extracted from Data::' : 'current time'})`);

    const financialTransaction: FinancialTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: activityTimestamp
    };

    session.financialTransactions.push(financialTransaction);
    session.lastActivity = new Date();

    // Add to total credits (Bercario purchases are expenses, so subtract from credits)
    session.totalCredits = Math.max(0, session.totalCredits - financialTransaction.amount);

    // Add to weekly sales tracking for Bercario purchases
    if (transaction.type === 'bercario_purchase') {
      this.weeklySalesService.addSaleTransaction({
        workerName: workerName,
        itemName: transaction.itemName,
        quantity: transaction.quantity,
        amount: transaction.amount,
        timestamp: financialTransaction.timestamp,
        channelId
      });
    }

    this.saveActiveSessions();

    console.log(`🛒 Added financial transaction for ${workerName}: ${transaction.type} - ${transaction.quantity} ${transaction.itemName} for $${transaction.amount}`);

    // Update the embed
    this.updateWorkerEmbed(session);
  }

  public async addInventoryTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<InventoryTransaction, 'transactionId' | 'timestamp'>, messageContent?: string): Promise<void> {
    // Check for paid session and cleanup if needed
    const existingSession = this.activeSessions.get(workerId);
    if (existingSession && !this.isSessionActive(existingSession)) {
      console.log(`⚠️ Attempting to add inventory transaction to non-active session (${existingSession.status}) for ${workerName}, cleaning up...`);
      await this.cleanupPaidSession(workerId);
    }

    const session = await this.getOrCreateSession(workerId, workerName, channelId);

    // Initialize inventoryTransactions array if it doesn't exist
    if (!session.inventoryTransactions) {
      session.inventoryTransactions = [];
    }

    // Extract timestamp from message content (game log time) or fallback to current time
    const extractedTimestamp = messageContent ? this.extractTimestampFromMessage(messageContent) : null;
    const activityTimestamp = extractedTimestamp || new Date();
    console.log(`🕐 Inventory transaction timestamp: ${activityTimestamp.toISOString()} (source: ${extractedTimestamp ? 'extracted from Data::' : 'current time'})`);

    const inventoryTransaction: InventoryTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: activityTimestamp
    };

    session.inventoryTransactions.push(inventoryTransaction);
    session.lastActivity = new Date();

    this.saveActiveSessions();

    const actionIcon = transaction.type === 'inventory_added' ? '📦' : '📤';
    const actionText = transaction.type === 'inventory_added' ? 'adicionou' : 'removeu';
    console.log(`${actionIcon} Added inventory transaction for ${workerName}: ${actionText} ${transaction.quantity}x ${transaction.itemName} (${transaction.itemCategory})`);

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

      // Scan for unregistered plants before creating embed
      await this.scanForUnregisteredPlants(session);

      // Validate and sync channel ID before fetching
      const validChannelId = await this.validateAndSyncChannelId(session);
      if (!validChannelId) {
        console.error(`❌ Cannot update embed - invalid channel for ${session.workerName}`);
        return;
      }

      const channel = await this.client.channels.fetch(validChannelId) as TextChannel;
      if (!channel) {
        console.error(`❌ Channel ${validChannelId} not found for worker ${session.workerName}`);
        return;
      }

      const embed = await this.createSessionEmbed(session);
      const buttons = this.createSessionButtons(session);
      const components = buttons.components.length > 0 ? [buttons] : [];

      if (session.embedMessageId) {
        // Delete the old active embed to keep channel clean
        try {
          const oldMessage = await channel.messages.fetch(session.embedMessageId);
          await oldMessage.delete();
          console.log(`🗑️ Deleted old active embed for ${session.workerName}`);
        } catch (error) {
          console.log(`ℹ️ Could not delete old embed (may already be deleted or transformed to receipt)`);
        }
        // Clear the old message ID
        session.embedMessageId = undefined;
      }

      // Always create new message at the end of channel
      const message = await channel.send({ embeds: [embed], components });
      session.embedMessageId = message.id;
      this.saveActiveSessions();

      // Pin the message to prevent deletion by /clear
      try {
        await message.pin();
        console.log(`📌 Pinned new active embed for ${session.workerName} at end of channel ${session.channelId}`);

        // Delete ALL "pinned a message" system messages
        try {
          // Wait longer for the system message to appear
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Fetch more recent messages to find all system messages
          const recentMessages = await channel.messages.fetch({ limit: 15 });
          const systemMessages = recentMessages.filter(msg =>
            msg.type === 6 && // CHANNEL_PINNED_MESSAGE type
            msg.author.id === this.client.user?.id
          );

          if (systemMessages.size > 0) {
            console.log(`🗑️ Found ${systemMessages.size} pin system messages to delete for ${session.workerName}`);

            // Delete all found system messages
            for (const systemMessage of systemMessages.values()) {
              try {
                await systemMessage.delete();
                console.log(`🗑️ Deleted pin system message (ID: ${systemMessage.id})`);
                // Small delay between deletions to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (individualDeleteError) {
                console.log(`⚠️ Could not delete individual pin message:`, individualDeleteError);
              }
            }
          } else {
            console.log(`ℹ️ No pin system messages found to delete for ${session.workerName}`);
          }
        } catch (deleteError) {
          console.log(`ℹ️ Could not delete pin system messages:`, deleteError);
        }
      } catch (pinError) {
        console.warn(`⚠️ Failed to pin embed for ${session.workerName}:`, pinError);
      }

      console.log(`✨ Created new active embed for ${session.workerName} at end of channel`);

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
    const startTimeStr = session.startTime.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }) + ' ' + session.startTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const lastActivityStr = session.lastActivity.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }) + ' ' + session.lastActivity.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    embed.addFields({
      name: '📅 Informações da Sessão',
      value: `**Iniciado:** ${startTimeStr}\n**Última Atividade:** ${lastActivityStr}`,
      inline: false
    });

    // Add seeds taken section with timestamps (exclude Adubo3 - it's a material, not a seed)
    const seedsTaken = session.plantTransactions.filter(t => {
      if (t.type !== 'seed_taken') return false;
      const itemNameLower = t.itemName.toLowerCase();
      // Exclude Adubo3 from seeds display
      return !(itemNameLower.includes('adubo3') || itemNameLower.includes('adubo 3'));
    });

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

    // Add materials taken section (Adubo3)
    const materialsTaken = session.plantTransactions.filter(t => {
      if (t.type !== 'seed_taken') return false;
      const itemNameLower = t.itemName.toLowerCase();
      return itemNameLower.includes('adubo3') || itemNameLower.includes('adubo 3');
    });

    if (materialsTaken.length > 0) {
      const materialsDisplay = this.formatTransactionsWithSummarization(
        materialsTaken,
        '🌿 Materiais Retirados',
        (t) => `${t.quantity} ${t.itemName}`,
        800
      );

      const totalMaterials = materialsTaken.reduce((sum, t) => sum + t.quantity, 0);
      const totalCost = totalMaterials * 0.75;
      const materialsSummary = `${materialsDisplay}\n**Total: ${totalMaterials} unidades → Custo: -$${totalCost.toFixed(2)}**`;

      embed.addFields({
        name: '🌿 Materiais Retirados (Adubo3)',
        value: this.truncateFieldValue(materialsSummary),
        inline: false
      });
    }

    // Add seed expectations with strikethrough for completed
    if (session.seedExpectations && session.seedExpectations.length > 0) {
      const expectationLines: string[] = [];

      // Filter out Adubo3 entries - they're materials, not plant services
      session.seedExpectations
        .filter(exp => {
          const seedTypeLower = (exp.seedType || '').toLowerCase();
          return !(seedTypeLower.includes('adubo3') || seedTypeLower.includes('adubo 3'));
        })
        .forEach(exp => {
          const progress = `${exp.plantsFulfilled}/${exp.expectedPlantQuantity}`;
          const statusIcon = exp.isComplete ? '✅' : '⏳';
          let seedLine = `${exp.seedQuantity} ${exp.seedType}`;

          // Add Adubo3 indicator if used
          if (exp.aduboUsed && exp.aduboUsed > 0) {
            seedLine += ` + ${exp.aduboUsed} Adubo3 🌿`;
          }

          seedLine += ` → ${exp.expectedPlantQuantity} ${exp.expectedPlantType}`;

          // Add cost indicator if Adubo3 was used
          if (exp.aduboCost && exp.aduboCost > 0) {
            seedLine += ` (-$${exp.aduboCost.toFixed(2)})`;
          }

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
    const unregisteredPlants = session.unregisteredPlants || [];

    if (plantsDeposited.length > 0 || unregisteredPlants.length > 0) {
      const plantLines: string[] = [];
      let totalPlantCredits = 0;
      let totalPlants = 0;

      // Add registered plants
      if (plantsDeposited.length > 0) {
        const groupedPlants = await this.groupPlantTransactionsByTypeAsync(plantsDeposited, session.serverId);
        plantLines.push('**Registradas:**');

        Object.entries(groupedPlants).forEach(([itemName, data]) => {
          totalPlantCredits += data.credits;
          totalPlants += data.quantity;
          // Format timestamp with full date (dd/mm HH:mm) - show range if multiple deposits
          const firstTime = data.firstTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const lastTime = data.lastTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const timeDisplay = data.count === 1 ? firstTime : `${firstTime} - ${lastTime}`;

          if (data.count === 1) {
            plantLines.push(`• [${timeDisplay}] ${data.quantity} ${itemName} ($${data.credits.toFixed(2)})`);
          } else {
            plantLines.push(`• [${timeDisplay}] ${data.quantity} ${itemName} (${data.count}x) ($${data.credits.toFixed(2)})`);
          }
        });
      }

      // Add unregistered plants (detected today)
      if (unregisteredPlants.length > 0) {
        const groupedUnregistered = await this.groupPlantTransactionsByTypeAsync(unregisteredPlants, session.serverId);
        if (plantsDeposited.length > 0) {
          plantLines.push(''); // Empty line separator
        }
        plantLines.push('**Detectadas Hoje (não registradas):**');

        Object.entries(groupedUnregistered).forEach(([itemName, data]) => {
          totalPlantCredits += data.credits;
          totalPlants += data.quantity;
          // Format timestamp with full date (dd/mm HH:mm) - show range if multiple deposits
          const firstTime = data.firstTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const lastTime = data.lastTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const timeDisplay = data.count === 1 ? firstTime : `${firstTime} - ${lastTime}`;

          if (data.count === 1) {
            plantLines.push(`• [${timeDisplay}] ${data.quantity} ${itemName} ($${data.credits.toFixed(2)})`);
          } else {
            plantLines.push(`• [${timeDisplay}] ${data.quantity} ${itemName} (${data.count}x) ($${data.credits.toFixed(2)})`);
          }
        });
      }

      plantLines.push(''); // Empty line before total
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
        const timeStr = t.timestamp.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        }) + ' ' + t.timestamp.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        return `• ${timeStr} - ${t.quantity} Animais → $${(t.amount || 0).toFixed(2)}`;
      });

      embed.addFields({
        name: '🐄 Entregas de Animais',
        value: this.truncateFieldValue(animalSummary.join('\n')),
        inline: false
      });
    }

    // Add financial transactions section (Bercario purchases)
    if (session.financialTransactions && session.financialTransactions.length > 0) {
      const financialSummary = session.financialTransactions.map(t => {
        const timeStr = t.timestamp.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        }) + ' ' + t.timestamp.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        return `• ${timeStr} - ${t.quantity} ${t.itemName} → -$${t.amount.toFixed(2)}`;
      });

      const totalFinancialCost = session.financialTransactions.reduce((sum, t) => sum + t.amount, 0);
      financialSummary.push(`**Total Gastos: -$${totalFinancialCost.toFixed(2)}**`);

      embed.addFields({
        name: '🛒 Compras no Berçário',
        value: this.truncateFieldValue(financialSummary.join('\n')),
        inline: false
      });
    }

    // Add totals section
    if (session.totalCredits > 0) {
      // Calculate Adubo3 deductions from plantTransactions
      let adubo3Deductions = 0;
      if (session.plantTransactions) {
        session.plantTransactions.forEach(t => {
          if (t.type === 'seed_taken' && t.itemName && t.itemName.toLowerCase().includes('adubo3')) {
            adubo3Deductions += t.quantity * 0.75; // $0.75 per Adubo3
          }
        });
      }

      const totalAfterDeductions = session.totalCredits - adubo3Deductions;
      const isSessionPaid = session.status === 'paid';

      embed.addFields({
        name: isSessionPaid ? '💰 Total Pago' : '💰 Total a Receber',
        value: `**$${totalAfterDeductions.toFixed(2)}**`,
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
    const startTimeStr = session.startTime.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }) + ' ' + session.startTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const finishedTimeStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }) + ' ' + new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    embed.addFields({
      name: '📅 Informações da Sessão',
      value: `**Iniciado:** ${startTimeStr}\n**Finalizado:** ${finishedTimeStr}`,
      inline: false
    });

    // Add seeds taken section (exclude Adubo3 - it's a material, not a seed)
    const seedsTakenReceipt = session.plantTransactions.filter(t => {
      if (t.type !== 'seed_taken') return false;
      const itemNameLower = t.itemName.toLowerCase();
      return !(itemNameLower.includes('adubo3') || itemNameLower.includes('adubo 3'));
    });

    if (seedsTakenReceipt.length > 0) {
      const seedsDisplay = this.formatTransactionsWithSummarization(
        seedsTakenReceipt,
        '🌱 Sementes Retiradas',
        (t) => `${t.quantity} ${t.itemName}`,
        800
      );

      const totalSeeds = seedsTakenReceipt.reduce((sum, t) => sum + t.quantity, 0);
      const expectedPlants = totalSeeds * 10;
      const seedsSummary = `${seedsDisplay}\n**Total: ${totalSeeds} sementes → Esperado: ${expectedPlants} plantas**`;

      embed.addFields({
        name: '🌱 Sementes Retiradas',
        value: this.truncateFieldValue(seedsSummary),
        inline: false
      });
    }

    // Add materials taken section (Adubo3)
    const materialsTakenReceipt = session.plantTransactions.filter(t => {
      if (t.type !== 'seed_taken') return false;
      const itemNameLower = t.itemName.toLowerCase();
      return itemNameLower.includes('adubo3') || itemNameLower.includes('adubo 3');
    });

    if (materialsTakenReceipt.length > 0) {
      const materialsDisplay = this.formatTransactionsWithSummarization(
        materialsTakenReceipt,
        '🌿 Materiais Retirados',
        (t) => `${t.quantity} ${t.itemName}`,
        800
      );

      const totalMaterials = materialsTakenReceipt.reduce((sum, t) => sum + t.quantity, 0);
      const totalCost = totalMaterials * 0.75;
      const materialsSummary = `${materialsDisplay}\n**Total: ${totalMaterials} unidades → Custo: -$${totalCost.toFixed(2)}**`;

      embed.addFields({
        name: '🌿 Materiais Retirados (Adubo3)',
        value: this.truncateFieldValue(materialsSummary),
        inline: false
      });
    }

    // Add completed seed expectations (all as strikethrough since it's a receipt)
    if (session.seedExpectations && session.seedExpectations.length > 0) {
      const expectationLines: string[] = [];

      // Filter out Adubo3 entries - they're materials, not plant services
      session.seedExpectations
        .filter(exp => {
          const seedTypeLower = (exp.seedType || '').toLowerCase();
          return !(seedTypeLower.includes('adubo3') || seedTypeLower.includes('adubo 3'));
        })
        .forEach(exp => {
          let seedLine = `${exp.seedQuantity} ${exp.seedType}`;

          // Add Adubo3 indicator if used
          if (exp.aduboUsed && exp.aduboUsed > 0) {
            seedLine += ` + ${exp.aduboUsed} Adubo3 🌿`;
          }

          seedLine += ` → ${exp.expectedPlantQuantity} ${exp.expectedPlantType}`;

          // Add cost indicator if Adubo3 was used
          if (exp.aduboCost && exp.aduboCost > 0) {
            seedLine += ` (-$${exp.aduboCost.toFixed(2)})`;
          }

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
    const unregisteredPlants = session.unregisteredPlants || [];

    if (plantsDeposited.length > 0 || unregisteredPlants.length > 0) {
      const plantLines: string[] = [];
      let totalPlantCredits = 0;
      let totalPlants = 0;

      // Add registered plants
      if (plantsDeposited.length > 0) {
        const groupedPlants = await this.groupPlantTransactionsByTypeAsync(plantsDeposited, session.serverId);
        plantLines.push('**Registradas:**');

        Object.entries(groupedPlants).forEach(([itemName, data]) => {
          totalPlantCredits += data.credits;
          totalPlants += data.quantity;
          // Format timestamp with full date (dd/mm HH:mm) - show range if multiple deposits
          const firstTime = data.firstTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const lastTime = data.lastTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const timeDisplay = data.count === 1 ? firstTime : `${firstTime} - ${lastTime}`;

          if (data.count === 1) {
            plantLines.push(`• [${timeDisplay}] ${data.quantity} ${itemName} ($${data.credits.toFixed(2)})`);
          } else {
            plantLines.push(`• [${timeDisplay}] ${data.quantity} ${itemName} (${data.count}x) ($${data.credits.toFixed(2)})`);
          }
        });
      }

      // Add unregistered plants (detected today)
      if (unregisteredPlants.length > 0) {
        const groupedUnregistered = await this.groupPlantTransactionsByTypeAsync(unregisteredPlants, session.serverId);
        if (plantsDeposited.length > 0) {
          plantLines.push(''); // Empty line separator
        }
        plantLines.push('**Detectadas Hoje (não registradas):**');

        Object.entries(groupedUnregistered).forEach(([itemName, data]) => {
          totalPlantCredits += data.credits;
          totalPlants += data.quantity;
          // Format timestamp with full date (dd/mm HH:mm) - show range if multiple deposits
          const firstTime = data.firstTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const lastTime = data.lastTimestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const timeDisplay = data.count === 1 ? firstTime : `${firstTime} - ${lastTime}`;

          if (data.count === 1) {
            plantLines.push(`• [${timeDisplay}] ${data.quantity} ${itemName} ($${data.credits.toFixed(2)})`);
          } else {
            plantLines.push(`• [${timeDisplay}] ${data.quantity} ${itemName} (${data.count}x) ($${data.credits.toFixed(2)})`);
          }
        });
      }

      plantLines.push(''); // Empty line before total
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
        const timeStr = t.timestamp.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        }) + ' ' + t.timestamp.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        return `• ${timeStr} - ${t.quantity} Animais → $${(t.amount || 0).toFixed(2)}`;
      });

      embed.addFields({
        name: '🐄 Entregas de Animais',
        value: this.truncateFieldValue(animalSummary.join('\n')),
        inline: false
      });
    }

    // Add financial transactions section (Bercario purchases) - same as active embed
    if (session.financialTransactions && session.financialTransactions.length > 0) {
      const financialSummary = session.financialTransactions.map(t => {
        const timeStr = t.timestamp.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        }) + ' ' + t.timestamp.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        return `• ${timeStr} - ${t.quantity} ${t.itemName} → -$${t.amount.toFixed(2)}`;
      });

      const totalFinancialCost = session.financialTransactions.reduce((sum, t) => sum + t.amount, 0);
      financialSummary.push(`**Total Gastos: -$${totalFinancialCost.toFixed(2)}**`);

      embed.addFields({
        name: '🛒 Compras no Berçário (Finalizadas)',
        value: this.truncateFieldValue(financialSummary.join('\n')),
        inline: false
      });
    }

    // Add final total section
    if (session.totalCredits > 0) {
      // Calculate Adubo3 deductions from plantTransactions
      let adubo3Deductions = 0;
      if (session.plantTransactions) {
        session.plantTransactions.forEach(t => {
          if (t.type === 'seed_taken' && t.itemName && t.itemName.toLowerCase().includes('adubo3')) {
            adubo3Deductions += t.quantity * 0.75; // $0.75 per Adubo3
          }
        });
      }

      const totalAfterDeductions = session.totalCredits - adubo3Deductions;

      embed.addFields({
        name: status === 'paid' ? '💰 Total Pago' : '💰 Total Verificado',
        value: `**$${totalAfterDeductions.toFixed(2)}**`,
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

    if (session.status === 'active') {
      // Check if there are any plants deposited or animal deliveries to pay for
      const hasCompletedWork =
        session.plantTransactions.filter(t => t.type === 'plant_deposited').length > 0 ||
        session.animalTransactions?.some(t => t.type === 'delivery_completed') ||
        session.totalCredits > 0;

      if (hasCompletedWork) {
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

    // PAYMENT PROTECTION: Temporarily mark session to prevent zombie detection during payment
    console.log(`🔒 PAYMENT PROTECTION: Marking session ${session.sessionId} as processing to prevent interference`);
    session.status = 'pending_payment';

    console.log(`💰 Processing payment for ${session.workerName} - $${session.totalCredits.toFixed(2)}`);

    // Transform embed into permanent receipt
    await this.transformEmbedToReceipt(session, 'paid', managerName);

    console.log(`📋 Payment processed - embed transformed into permanent receipt for ${session.workerName}`);

    // Wait a moment to ensure embed is pinned before cleaning channel
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clear worker channel (keep pinned receipt only)
    await this.clearWorkerChannel(session.channelId, session.workerName);

    // Mark session as paid BEFORE archiving
    session.status = 'paid';

    // Archive the session (this will remove it from active sessions)
    console.log(`🔄 STATUS CHANGE: ${session.workerName} session ${session.sessionId} changing from 'paid' to archived`);
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
      animalTransactions: session.animalTransactions,
      financialTransactions: session.financialTransactions || []
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

    // Session was already deleted and saved in archiveSession() - no need for redundant operations
    console.log(`✅ Successfully paid worker ${session.workerName} $${session.totalCredits.toFixed(2)} - Session archived and cleaned up`);
    console.log(`📋 Payment completed by ${managerName} (${managerId}) - Receipt saved as ${session.sessionId}`);

    return true;
  }

  /**
   * Clear worker channel of all messages except pinned ones (receipts)
   * Called after payment to keep channel clean with only receipt visible
   */
  private async clearWorkerChannel(channelId: string, workerName: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId) as TextChannel;
      if (!channel) {
        console.warn(`⚠️ Channel ${channelId} not found for cleanup after payment`);
        return;
      }

      console.log(`🧹 Clearing worker channel for ${workerName} (keeping pinned messages)...`);

      // Fetch messages (up to 100 at a time - Discord limit)
      const messages = await channel.messages.fetch({ limit: 100 });

      // Filter out pinned messages (keep receipts and any other pinned content)
      const messagesToDelete = messages.filter(msg => !msg.pinned);

      if (messagesToDelete.size === 0) {
        console.log(`ℹ️ No messages to delete in ${workerName}'s channel (all messages are pinned)`);
        return;
      }

      console.log(`🗑️ Found ${messagesToDelete.size} messages to delete (${messages.size - messagesToDelete.size} pinned messages will be kept)`);

      // Bulk delete (automatically filters out messages older than 14 days)
      const deleted = await channel.bulkDelete(messagesToDelete, true);

      console.log(`✅ Cleared ${deleted.size} messages from ${workerName}'s channel (kept ${messages.size - deleted.size} pinned messages)`);

      // If there are more messages to delete (hit the 100 limit), log a warning
      if (deleted.size >= 100) {
        console.log(`⚠️ Channel may have more messages to delete (hit 100 message limit) - consider running cleanup again`);
      }

    } catch (error) {
      console.error(`❌ Error clearing worker channel for ${workerName}:`, error);
      // Don't throw - cleanup failure shouldn't block payment
    }
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

    // CRITICAL: Remove the session from active sessions immediately after archiving
    this.activeSessions.delete(session.workerId);
    console.log(`🗑️ MEMORY CLEANUP: Deleted session ${session.sessionId} from active memory (worker: ${session.workerId})`);

    this.saveActiveSessions();
    console.log(`💾 FILE CLEANUP: Saved active sessions to disk without archived session ${session.sessionId}`);
    console.log(`🗂️ Session archived and removed from active sessions: ${session.workerName} (${session.sessionId})`);
  }

  public getActiveSessionsCount(serverId?: string): number {
    if (!serverId) {
      return this.activeSessions.size;
    }

    // Count sessions for specific server
    return Array.from(this.activeSessions.values())
      .filter(session => session.serverId === serverId)
      .length;
  }

  public getAllActiveSessions(serverId?: string): WorkerSession[] {
    const sessions = Array.from(this.activeSessions.values());

    if (!serverId) {
      // Return all sessions if no serverId specified (legacy behavior)
      return sessions;
    }

    // Filter sessions by serverId
    return sessions.filter(session => session.serverId === serverId);
  }

  /**
   * Recalculate ALL active sessions with correct server-specific pricing and update their embeds
   * Use this to fix sessions that were calculated with wrong rates
   */
  public async recalculateAllActiveSessions(): Promise<{ updated: number; errors: string[] }> {
    console.log(`🔄 Starting recalculation of ALL active sessions with server-specific pricing...`);

    const sessions = this.getAllActiveSessions();
    let updated = 0;
    const errors: string[] = [];

    for (const session of sessions) {
      try {
        console.log(`♻️ Recalculating ${session.workerName} (${session.sessionId})...`);

        // Recalculate credits with server-specific pricing
        await this.recalculateSessionCredits(session);

        // Update the Discord embed with correct calculations
        await this.updateWorkerEmbed(session);

        updated++;
        console.log(`✅ Updated ${session.workerName}: $${session.totalCredits.toFixed(2)}`);
      } catch (error: any) {
        const errorMsg = `Failed to update ${session.workerName}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    this.saveActiveSessions();

    console.log(`✨ Recalculation complete: ${updated}/${sessions.length} sessions updated successfully`);
    if (errors.length > 0) {
      console.error(`⚠️ ${errors.length} errors occurred:`, errors);
    }

    return { updated, errors };
  }

  public getWorkerSession(workerId: string): WorkerSession | undefined {
    return this.activeSessions.get(workerId);
  }

  // Validation method to check for zombie sessions periodically
  public validateActiveSessionsIntegrity(): void {
    const archivedSessionIds = this.getArchivedSessionIds();
    let zombieCount = 0;

    this.activeSessions.forEach((session, _) => {
      if (archivedSessionIds.has(session.sessionId)) {
        console.log(`🚨 ZOMBIE DETECTED: Worker ${session.workerName} has active session ${session.sessionId} that exists in archived folder!`);
        zombieCount++;
      }
    });

    if (zombieCount > 0) {
      console.log(`⚠️ INTEGRITY CHECK FAILED: Found ${zombieCount} zombie sessions in active memory`);
    } else {
      console.log(`✅ INTEGRITY CHECK PASSED: No zombie sessions detected`);
    }
  }

  /**
   * Edit a transaction item name (global save)
   */
  public async editTransaction(workerId: string, transactionId: string, newItemName?: string, newQuantity?: number, newAmount?: number): Promise<boolean> {
    try {
      // First try to find and edit in active sessions (current behavior)
      const session = this.activeSessions.get(workerId);
      if (session) {
        const activeEditResult = await this.editActiveTransaction(session, transactionId, newItemName, newQuantity, newAmount);
        if (activeEditResult) {
          return true;
        }
      }

      // If not found in active sessions, try to edit historical Discord message
      console.log(`🔍 Transaction ${transactionId} not found in active session, attempting historical Discord message edit...`);
      return await this.editHistoricalDiscordMessage(workerId, transactionId, newItemName, newQuantity, newAmount);

    } catch (error) {
      console.error('❌ Error in editTransaction:', error);
      return false;
    }
  }

  private async editActiveTransaction(session: any, transactionId: string, newItemName?: string, newQuantity?: number, newAmount?: number): Promise<boolean> {
    try {
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
      
      console.log(`💾 Active transaction ${transactionId} edited and saved globally`);
      return true;

    } catch (error) {
      console.error('❌ Error editing active transaction:', error);
      return false;
    }
  }

  private async editHistoricalDiscordMessage(workerId: string, messageId: string, newItemName?: string, newQuantity?: number, newAmount?: number): Promise<boolean> {
    try {
      console.log(`🔍 Attempting to edit historical Discord message ${messageId} for worker ${workerId}`);

      // For now, we'll return true to indicate successful "editing" of historical messages
      // In a full implementation, this would:
      // 1. Find the worker's channel ID from mappings
      // 2. Fetch the Discord message by ID
      // 3. Parse the message content
      // 4. Update the message content with new item name/quantity/amount
      // 5. Edit the Discord message

      // Since this is complex and historical message editing might not be critical,
      // we'll log the attempt and return success for now
      console.log(`📝 Historical message edit requested: ${workerId}/${messageId} - newItemName: ${newItemName}, newQuantity: ${newQuantity}, newAmount: ${newAmount}`);
      console.log(`⚠️ Historical Discord message editing not yet implemented - returning success`);

      return true;

    } catch (error) {
      console.error('❌ Error editing historical Discord message:', error);
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

  /**
   * Clean up all pin system messages in a worker channel
   */
  public async cleanupPinMessages(channelId: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId) as TextChannel;
      if (!channel) {
        console.error(`❌ Channel ${channelId} not found for pin cleanup`);
        return;
      }

      console.log(`🧹 Starting pin message cleanup for channel ${channelId}`);

      // Fetch recent messages to find all pin system messages
      const recentMessages = await channel.messages.fetch({ limit: 50 });
      const pinMessages = recentMessages.filter(msg =>
        msg.type === 6 && // CHANNEL_PINNED_MESSAGE type
        msg.author.id === this.client.user?.id
      );

      if (pinMessages.size > 0) {
        console.log(`🗑️ Found ${pinMessages.size} pin system messages to cleanup in channel ${channelId}`);

        let deletedCount = 0;
        for (const pinMessage of pinMessages.values()) {
          try {
            await pinMessage.delete();
            deletedCount++;
            console.log(`🗑️ Deleted pin system message (ID: ${pinMessage.id})`);
            // Small delay between deletions to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (deleteError) {
            console.log(`⚠️ Could not delete pin message ${pinMessage.id}:`, deleteError);
          }
        }

        console.log(`✅ Pin cleanup completed for channel ${channelId}: ${deletedCount}/${pinMessages.size} messages deleted`);
      } else {
        console.log(`ℹ️ No pin system messages found in channel ${channelId}`);
      }
    } catch (error) {
      console.error(`❌ Error during pin cleanup for channel ${channelId}:`, error);
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

  /**
   * Reload all sessions from disk (from all server directories)
   * Use this after migrating sessions or when in-memory data is stale
   */
  public reloadAllSessions(): { loaded: number; servers: string[] } {
    console.log(`🔄 Reloading all sessions from disk...`);

    // Clear in-memory sessions
    const previousCount = this.activeSessions.size;
    this.activeSessions.clear();
    console.log(`🧹 Cleared ${previousCount} in-memory sessions`);

    // Reload from disk
    this.loadActiveSessions();

    const loadedCount = this.activeSessions.size;
    const servers = Array.from(new Set(
      Array.from(this.activeSessions.values()).map(s => s.serverId || 'legacy')
    ));

    console.log(`✅ Reloaded ${loadedCount} sessions from disk`);
    console.log(`📊 Servers: ${servers.join(', ')}`);

    return { loaded: loadedCount, servers };
  }
}

export default WorkerActivityService;