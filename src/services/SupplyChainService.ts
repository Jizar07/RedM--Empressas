import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Types for supply chain management
export type SupplyChainTransactionType = 
  | 'PLANTS_WITHDRAWN'          // Plants taken from inventory for box making
  | 'PLANTS_DEPOSITED'          // Plants returned to inventory (Ferrovia returns)
  | 'SEEDS_WITHDRAWN'           // Seeds taken for farming (context tracking)
  | 'BOXES_CREATED'             // Boxes made from plants and added to inventory
  | 'BOXES_WITHDRAWN'           // Boxes taken from inventory for Ferrovia missions
  | 'FERROVIA_MISSION_COMPLETED' // Mission completed using boxes
  | 'REVENUE_COLLECTED'         // Money collected from Ferrovia
  | 'REVENUE_DISTRIBUTED';      // Money distributed according to role rules

export type WorkerRole = 'manager' | 'worker';
export type SessionStatus = 'active' | 'completed' | 'overdue';

export interface SupplyChainTransaction {
  transactionId: string;
  type: SupplyChainTransactionType;
  itemName: string;
  quantity: number;
  amount?: number;
  timestamp: Date;
  discordMessageId?: string;
  originalMessage?: string;
}

export interface OpenResponsibility {
  boxesTaken: number;
  moneyOwed: number;
  dueDate: Date;
  startDate: Date;
}

export interface SupplyChainSession {
  sessionId: string;
  workerId: string;
  workerName: string;
  role: WorkerRole;
  status: SessionStatus;
  startTime: Date;
  lastActivity: Date;
  transactions: SupplyChainTransaction[];
  openResponsibilities: OpenResponsibility;
  totalBoxesProcessed: number;
  totalRevenueGenerated: number;
  totalRevenueReturned: number;
  channelId?: string;
  messageId?: string;
}

export interface RevenueDistribution {
  totalRevenue: number;
  farmShare: number;
  workerShare: number;
  role: WorkerRole;
}

export class SupplyChainService {
  private sessionsFilePath: string;
  private archivedSessionsPath: string;
  private activeSessions: Map<string, SupplyChainSession> = new Map();

  constructor() {
    this.sessionsFilePath = path.join(process.cwd(), 'data', 'supply-chain', 'active-sessions.json');
    this.archivedSessionsPath = path.join(process.cwd(), 'data', 'supply-chain', 'archived');
    this.ensureDirectories();
    this.loadActiveSessions();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.sessionsFilePath), { recursive: true });
      await fs.mkdir(this.archivedSessionsPath, { recursive: true });
    } catch (error) {
      console.error('Error creating supply chain directories:', error);
    }
  }

  private async loadActiveSessions(): Promise<void> {
    try {
      const data = await fs.readFile(this.sessionsFilePath, 'utf-8');
      const sessions: SupplyChainSession[] = JSON.parse(data);
      
      sessions.forEach(session => {
        // Convert string dates back to Date objects
        session.startTime = new Date(session.startTime);
        session.lastActivity = new Date(session.lastActivity);
        session.openResponsibilities.dueDate = new Date(session.openResponsibilities.dueDate);
        session.openResponsibilities.startDate = new Date(session.openResponsibilities.startDate);
        session.transactions.forEach(transaction => {
          transaction.timestamp = new Date(transaction.timestamp);
        });
        
        this.activeSessions.set(session.workerId, session);
      });

      console.log(`📊 Loaded ${sessions.length} active supply chain sessions`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error loading supply chain sessions:', error);
      }
    }
  }

  private async saveActiveSessions(): Promise<void> {
    try {
      const sessions = Array.from(this.activeSessions.values());
      await fs.writeFile(this.sessionsFilePath, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('Error saving supply chain sessions:', error);
    }
  }

  // Calculate revenue distribution based on role
  public calculateRevenueDistribution(boxCount: number, role: WorkerRole): RevenueDistribution {
    const totalRevenue = boxCount * 4; // $4 per box
    
    if (role === 'manager') {
      // Manager: 50/50 split - $2000 to farm, $2000 to manager per 1000 boxes
      return {
        totalRevenue,
        farmShare: totalRevenue * 0.5,
        workerShare: totalRevenue * 0.5,
        role
      };
    } else {
      // Worker: 75/25 split - $3000 to farm, $1000 to worker per 1000 boxes
      return {
        totalRevenue,
        farmShare: totalRevenue * 0.75,
        workerShare: totalRevenue * 0.25,
        role
      };
    }
  }

  // Create or get existing session for a worker
  public async createOrGetSession(workerId: string, workerName: string, role: WorkerRole): Promise<SupplyChainSession> {
    let session = this.activeSessions.get(workerId);
    
    if (!session) {
      session = {
        sessionId: uuidv4(),
        workerId,
        workerName,
        role,
        status: 'active',
        startTime: new Date(),
        lastActivity: new Date(),
        transactions: [],
        openResponsibilities: {
          boxesTaken: 0,
          moneyOwed: 0,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          startDate: new Date()
        },
        totalBoxesProcessed: 0,
        totalRevenueGenerated: 0,
        totalRevenueReturned: 0
      };
      
      this.activeSessions.set(workerId, session);
      await this.saveActiveSessions();
      
      console.log(`📊 Created new supply chain session for ${workerName} (${role})`);
    }
    
    return session;
  }

  // Add transaction to a session
  public async addTransaction(
    workerId: string, 
    transaction: Omit<SupplyChainTransaction, 'transactionId' | 'timestamp'>
  ): Promise<boolean> {
    const session = this.activeSessions.get(workerId);
    if (!session) {
      console.error(`❌ No supply chain session found for worker ${workerId}`);
      return false;
    }

    const fullTransaction: SupplyChainTransaction = {
      ...transaction,
      transactionId: uuidv4(),
      timestamp: new Date()
    };

    session.transactions.push(fullTransaction);
    session.lastActivity = new Date();

    // Update session metrics based on transaction type
    await this.updateSessionMetrics(session, fullTransaction);

    await this.saveActiveSessions();
    
    console.log(`📊 Added ${transaction.type} transaction to session ${session.sessionId}`);
    return true;
  }

  private async updateSessionMetrics(session: SupplyChainSession, transaction: SupplyChainTransaction): Promise<void> {
    switch (transaction.type) {
      case 'BOXES_WITHDRAWN':
        // Worker took boxes - add to their responsibility
        session.openResponsibilities.boxesTaken += transaction.quantity;
        const revenue = this.calculateRevenueDistribution(transaction.quantity, session.role);
        session.openResponsibilities.moneyOwed += revenue.totalRevenue;
        session.totalBoxesProcessed += transaction.quantity;
        break;

      case 'REVENUE_COLLECTED':
        // Money collected from Ferrovia
        if (transaction.amount) {
          session.totalRevenueGenerated += transaction.amount;
        }
        break;

      case 'REVENUE_DISTRIBUTED':
        // Money properly distributed - reduce responsibility
        if (transaction.amount) {
          session.totalRevenueReturned += transaction.amount;
          session.openResponsibilities.moneyOwed -= transaction.amount;
          
          // If no more money owed, clear box responsibility
          if (session.openResponsibilities.moneyOwed <= 0) {
            session.openResponsibilities.boxesTaken = 0;
            session.openResponsibilities.moneyOwed = 0;
          }
        }
        break;
    }

    // Check if session should be marked as overdue
    if (session.openResponsibilities.boxesTaken > 0 && new Date() > session.openResponsibilities.dueDate) {
      session.status = 'overdue';
    }

    // Check if session is complete (no outstanding responsibilities)
    if (session.openResponsibilities.boxesTaken === 0 && session.openResponsibilities.moneyOwed <= 0) {
      session.status = 'completed';
    }
  }

  // Save a specific session (updates the session in memory and saves to file)
  public async saveSession(session: SupplyChainSession): Promise<void> {
    this.activeSessions.set(session.workerId, session);
    await this.saveActiveSessions();
  }

  // Get session by worker ID
  public getSession(workerId: string): SupplyChainSession | undefined {
    return this.activeSessions.get(workerId);
  }

  // Get all active sessions
  public getAllActiveSessions(): SupplyChainSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Get sessions with outstanding responsibilities
  public getSessionsWithResponsibilities(): SupplyChainSession[] {
    return this.getAllActiveSessions().filter(session => 
      session.openResponsibilities.boxesTaken > 0 || session.openResponsibilities.moneyOwed > 0
    );
  }

  // Get overdue sessions
  public getOverdueSessions(): SupplyChainSession[] {
    return this.getAllActiveSessions().filter(session => session.status === 'overdue');
  }

  // Archive completed session
  public async archiveSession(workerId: string, reason: string = 'Completed'): Promise<boolean> {
    const session = this.activeSessions.get(workerId);
    if (!session) {
      return false;
    }

    try {
      // Save to archived folder
      const archiveFileName = `session_${session.sessionId}_${Date.now()}.json`;
      const archivePath = path.join(this.archivedSessionsPath, archiveFileName);
      
      const archivedSession = {
        ...session,
        archivedAt: new Date(),
        archiveReason: reason
      };

      await fs.writeFile(archivePath, JSON.stringify(archivedSession, null, 2));
      
      // Remove from active sessions
      this.activeSessions.delete(workerId);
      await this.saveActiveSessions();
      
      console.log(`📦 Archived supply chain session ${session.sessionId} for ${session.workerName}`);
      return true;
    } catch (error) {
      console.error('Error archiving supply chain session:', error);
      return false;
    }
  }

  // Check for overdue sessions and update status
  public async checkAndUpdateOverdueSessions(): Promise<void> {
    const now = new Date();
    let updated = false;

    for (const session of this.activeSessions.values()) {
      if (session.openResponsibilities.boxesTaken > 0 && 
          now > session.openResponsibilities.dueDate && 
          session.status !== 'overdue') {
        session.status = 'overdue';
        updated = true;
        console.log(`⚠️ Session ${session.sessionId} for ${session.workerName} is now overdue`);
      }
    }

    if (updated) {
      await this.saveActiveSessions();
    }
  }

  // Get accountability summary for a worker
  public getAccountabilitySummary(workerId: string): {
    boxesTaken: number;
    moneyOwed: number;
    daysUntilDue: number;
    isOverdue: boolean;
    totalProcessed: number;
    completionRate: number;
  } | null {
    const session = this.activeSessions.get(workerId);
    if (!session) return null;

    const now = new Date();
    const daysUntilDue = Math.ceil((session.openResponsibilities.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const completionRate = session.totalBoxesProcessed > 0 
      ? (session.totalRevenueReturned / session.totalRevenueGenerated) * 100 
      : 0;

    return {
      boxesTaken: session.openResponsibilities.boxesTaken,
      moneyOwed: session.openResponsibilities.moneyOwed,
      daysUntilDue,
      isOverdue: session.status === 'overdue',
      totalProcessed: session.totalBoxesProcessed,
      completionRate
    };
  }

  // Get analytics data
  public getAnalytics(): {
    totalActiveSessions: number;
    totalBoxesInTransit: number;
    totalMoneyOwed: number;
    overdueSessions: number;
    completedSessions: number;
    averageCompletionTime: number;
  } {
    const sessions = this.getAllActiveSessions();
    const boxesInTransit = sessions.reduce((sum, s) => sum + s.openResponsibilities.boxesTaken, 0);
    const moneyOwed = sessions.reduce((sum, s) => sum + s.openResponsibilities.moneyOwed, 0);
    const overdue = sessions.filter(s => s.status === 'overdue').length;
    const completed = sessions.filter(s => s.status === 'completed').length;

    return {
      totalActiveSessions: sessions.length,
      totalBoxesInTransit: boxesInTransit,
      totalMoneyOwed: moneyOwed,
      overdueSessions: overdue,
      completedSessions: completed,
      averageCompletionTime: 0 // TODO: Calculate from archived sessions
    };
  }
}

export default SupplyChainService;