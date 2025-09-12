import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import ItemTranslationService from './ItemTranslationService';

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
  private translationService: ItemTranslationService;
  private workerPricesCache: Map<string, { prices: WorkerPrices; fetchedAt: Date }> = new Map();

  constructor(client: Client) {
    this.client = client;
    this.dataDir = path.join(process.cwd(), 'data', 'worker-sessions');
    this.ensureDataDirectory();
    this.loadServiceConfig();
    this.loadActiveSessions();
    this.translationService = ItemTranslationService.getInstance();
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
        
        // Convert to Map and restore Date objects
        Object.entries(sessions).forEach(([workerId, session]: [string, any]) => {
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
          
          this.activeSessions.set(workerId, session);
        });
        
        console.log(`📊 Loaded ${this.activeSessions.size} active worker sessions`);
      }
    } catch (error) {
      console.error('❌ Error loading active sessions:', error);
    }
  }

  private saveActiveSessions(): void {
    try {
      const sessionsFile = path.join(this.dataDir, 'active-sessions.json');
      const sessions = Object.fromEntries(this.activeSessions);
      fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
      console.log('💾 Saved active sessions to file');
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

  private async getWorkerPrices(firmId: string = 'fazenda-cabra-da-peste'): Promise<WorkerPrices> {
    // Check cache first (5 minute cache)
    const cached = this.workerPricesCache.get(firmId);
    if (cached && (Date.now() - cached.fetchedAt.getTime()) < 5 * 60 * 1000) {
      return cached.prices;
    }

    try {
      // Try to read from file first (backend sync)
      const pricesPath = path.join(process.cwd(), 'data', 'worker-prices', `${firmId}.json`);
      if (fs.existsSync(pricesPath)) {
        const data = fs.readFileSync(pricesPath, 'utf8');
        const prices = JSON.parse(data);
        const workerPrices: WorkerPrices = {
          plantPrice: prices.plantPrice || 2.50,
          animalPrice: prices.animalPrice || 40.00,
          animalCost: prices.animalCost || 20.00
        };
        
        // Update cache
        this.workerPricesCache.set(firmId, { prices: workerPrices, fetchedAt: new Date() });
        console.log(`💰 Loaded worker prices for ${firmId}:`, workerPrices);
        return workerPrices;
      }
    } catch (error) {
      console.error('❌ Error loading worker prices:', error);
    }

    // Return defaults if file doesn't exist
    const defaultPrices: WorkerPrices = {
      plantPrice: 2.50,
      animalPrice: 40.00,
      animalCost: 20.00
    };
    
    console.log(`💰 Using default worker prices for ${firmId}`);
    return defaultPrices;
  }

  private calculatePlantPrice(plantName: string): number {
    // Use translation service to check if it's a basic plant
    const isBasicPlant = this.translationService.isBasicPlant(plantName);
    return isBasicPlant ? this.serviceConfig.plantPrices.basic : this.serviceConfig.plantPrices.other;
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

    // Calculate plant credits (plants deposited × price per plant)
    session.plantTransactions
      .filter(t => t.type === 'plant_deposited')
      .forEach(transaction => {
        // Use configured price per plant
        totalCredits += transaction.quantity * prices.plantPrice;
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
    
    if (!session) {
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
        totalCredits: 0
      };
      
      this.activeSessions.set(workerId, session);
      this.saveActiveSessions();
      console.log(`🆕 Created new session for worker ${workerName} (${workerId})`);
    }

    return session;
  }

  public async addPlantTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<PlantTransaction, 'transactionId' | 'timestamp'>): Promise<void> {
    const session = this.getOrCreateSession(workerId, workerName, channelId);
    
    const plantTransaction: PlantTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: new Date()
    };

    session.plantTransactions.push(plantTransaction);
    session.lastActivity = new Date();
    
    await this.recalculateSessionCredits(session);
    this.saveActiveSessions();
    
    console.log(`🌱 Added plant transaction for ${workerName}: ${transaction.type} - ${transaction.quantity} ${transaction.itemName}`);
    
    // Update the embed
    this.updateWorkerEmbed(session);
  }

  public async addAnimalTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<AnimalTransaction, 'transactionId' | 'timestamp'>): Promise<void> {
    const session = this.getOrCreateSession(workerId, workerName, channelId);
    
    const animalTransaction: AnimalTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: new Date()
    };

    session.animalTransactions.push(animalTransaction);
    session.lastActivity = new Date();
    
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
      const channel = await this.client.channels.fetch(session.channelId) as TextChannel;
      if (!channel) {
        console.error(`❌ Channel ${session.channelId} not found for worker ${session.workerName}`);
        return;
      }

      const embed = this.createSessionEmbed(session);
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
        console.log(`✨ Created new embed for ${session.workerName} in channel ${session.channelId}`);
      }

    } catch (error) {
      console.error(`❌ Error updating embed for ${session.workerName}:`, error);
    }
  }

  private createSessionEmbed(session: WorkerSession): EmbedBuilder {
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

    // Add plant transactions section
    if (session.plantTransactions.length > 0) {
      const seedsTaken = this.getSeedsTokenSummary(session);
      const plantsDeposited = this.getPlantsDepositedSummary(session);
      
      let plantSection = '';
      if (seedsTaken.length > 0) {
        plantSection += `**🌱 SEMENTES RETIRADAS:**\n${seedsTaken.join('\n')}\n\n`;
      }
      if (plantsDeposited.length > 0) {
        plantSection += `**🌾 PLANTAS DEPOSITADAS:**\n${plantsDeposited.join('\n')}`;
      }

      if (plantSection) {
        embed.addFields({
          name: '🌾 Atividade de Plantas',
          value: plantSection,
          inline: false
        });
      }
    }

    // Add animal transactions section
    if (session.animalTransactions.length > 0) {
      const animalSummary = session.animalTransactions.map(t => {
        const timeStr = `<t:${Math.floor(t.timestamp.getTime() / 1000)}:t>`;
        const typeStr = t.animalType ? ` ${t.animalType}` : '';
        return `• ${timeStr} - ${t.quantity}${typeStr} Animais → $${(t.amount || 0).toFixed(2)}`;
      });

      embed.addFields({
        name: '🐄 Entregas de Animais',
        value: animalSummary.join('\n'),
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

  private getSeedsTokenSummary(session: WorkerSession): string[] {
    const seedsMap = new Map<string, number>();
    
    session.plantTransactions
      .filter(t => t.type === 'seed_taken')
      .forEach(t => {
        const current = seedsMap.get(t.itemName) || 0;
        seedsMap.set(t.itemName, current + t.quantity);
      });

    return Array.from(seedsMap.entries()).map(([item, quantity]) => 
      `• ${quantity} ${item}`
    );
  }

  private getPlantsDepositedSummary(session: WorkerSession): string[] {
    const plantsMap = new Map<string, { quantity: number, credits: number }>();
    
    session.plantTransactions
      .filter(t => t.type === 'plant_deposited')
      .forEach(t => {
        const current = plantsMap.get(t.itemName) || { quantity: 0, credits: 0 };
        const price = this.calculatePlantPrice(t.itemName);
        const credits = t.quantity * price;
        
        plantsMap.set(t.itemName, {
          quantity: current.quantity + t.quantity,
          credits: current.credits + credits
        });
      });

    return Array.from(plantsMap.entries()).map(([item, data]) => 
      `• ${data.quantity} ${item} → $${data.credits.toFixed(2)}`
    );
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
    if (!session || session.status !== 'active') {
      return false;
    }

    // Update session status to paid and update embed
    session.status = 'paid';
    await this.updateWorkerEmbed(session);

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

    // Remove from active sessions
    this.activeSessions.delete(workerId);
    this.saveActiveSessions();

    console.log(`💰 Paid worker ${session.workerName} $${session.totalCredits.toFixed(2)} - Session archived`);
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
}

export default WorkerActivityService;