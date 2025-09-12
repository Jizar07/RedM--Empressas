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
  type: 'animal_delivery';
  animalType?: string;
  quantity: number;
  amount: number;
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

export class WorkerActivityService {
  private client: Client;
  private activeSessions: Map<string, WorkerSession> = new Map();
  private dataDir: string;
  private serviceConfig!: ServiceConfig;
  private translationService: ItemTranslationService;

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
        plantPrices: { basic: 0.15, other: 0.2 },
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

  private recalculateSessionCredits(session: WorkerSession): void {
    let totalCredits = 0;

    // Calculate plant credits
    session.plantTransactions
      .filter(t => t.type === 'plant_deposited')
      .forEach(transaction => {
        const price = this.calculatePlantPrice(transaction.itemName);
        totalCredits += transaction.quantity * price;
      });

    // Calculate animal credits
    session.animalTransactions.forEach(transaction => {
      totalCredits += transaction.amount;
    });

    session.totalCredits = totalCredits;
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

  public addPlantTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<PlantTransaction, 'transactionId' | 'timestamp'>): void {
    const session = this.getOrCreateSession(workerId, workerName, channelId);
    
    const plantTransaction: PlantTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: new Date()
    };

    session.plantTransactions.push(plantTransaction);
    session.lastActivity = new Date();
    
    this.recalculateSessionCredits(session);
    this.saveActiveSessions();
    
    console.log(`🌱 Added plant transaction for ${workerName}: ${transaction.type} - ${transaction.quantity} ${transaction.itemName}`);
    
    // Update the embed
    this.updateWorkerEmbed(session);
  }

  public addAnimalTransaction(workerId: string, workerName: string, channelId: string, transaction: Omit<AnimalTransaction, 'transactionId' | 'timestamp'>): void {
    const session = this.getOrCreateSession(workerId, workerName, channelId);
    
    const animalTransaction: AnimalTransaction = {
      ...transaction,
      transactionId: this.generateTransactionId(),
      timestamp: new Date()
    };

    session.animalTransactions.push(animalTransaction);
    session.lastActivity = new Date();
    
    this.recalculateSessionCredits(session);
    this.saveActiveSessions();
    
    console.log(`🐄 Added animal transaction for ${workerName}: ${transaction.quantity} animals - $${transaction.amount}`);
    
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
        return `• ${timeStr} - ${t.quantity}${typeStr} Animais → $${t.amount.toFixed(2)}`;
      });

      embed.addFields({
        name: '🐄 Entregas de Animais',
        value: animalSummary.join('\n'),
        inline: false
      });
    }

    // Add totals section
    if (session.totalCredits > 0) {
      embed.addFields({
        name: '💰 Total a Receber',
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
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`worker_reject_${session.workerId}`)
          .setLabel('❌ Rejeitar')
          .setStyle(ButtonStyle.Danger)
      );
    }

    return row;
  }

  public async payWorker(workerId: string, managerId: string, managerName: string): Promise<boolean> {
    const session = this.activeSessions.get(workerId);
    if (!session || session.status !== 'active') {
      return false;
    }

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
}

export default WorkerActivityService;