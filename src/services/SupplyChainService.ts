import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Types for supply chain management
export type SupplyChainTransactionType =
  | 'PLANTS_WITHDRAWN'          // Plants taken from inventory for box making
  | 'PLANTS_DEPOSITED'          // Plants deposited to inventory (new farming production)
  | 'PLANTS_RETURNED'           // Plants returned to inventory (leftover from box making)
  | 'SEEDS_WITHDRAWN'           // Seeds taken for farming (context tracking)
  | 'BOXES_CREATED'             // Boxes made from plants and added to inventory
  | 'BOXES_WITHDRAWN'           // Boxes taken from inventory for Ferrovia missions
  | 'BOXES_RETURNED'            // Boxes returned to inventory (unused from Ferrovia)
  | 'FERROVIA_MISSION_COMPLETED' // Mission completed using boxes
  | 'REVENUE_COLLECTED'         // Money collected from Ferrovia
  | 'REVENUE_DISTRIBUTED'       // Money distributed according to role rules
  | 'MONEY_WITHDRAWN_FROM_FERROVIA' // Money taken from Ferrovia by worker
  | 'MONEY_DEPOSITED_TO_INVENTORY'  // Money deposited to inventory
  | 'WORKER_PAYMENT_OWED';      // Amount owed to worker ($250 per mission)

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

export interface ExpectedProduction {
  boxType: string;
  portugueseName: string;
  expectedQuantity: number;
  status: 'pending' | 'complete' | 'partial' | 'overdelivered';
  deliveredQuantity: number;
}

export interface ResponsibilityTracking {
  plantsWithdrawn: { [plantName: string]: number };
  expectedProductions: ExpectedProduction[];
  plantsReturned: { [plantName: string]: number };
  boxesDelivered: { [boxType: string]: number };
  lastCalculated: Date;
}

export interface PlantExpectation {
  plantTypes: string[];
  plantQuantities: { [plantName: string]: number };
  expectedBoxType: string;
  expectedBoxQuantity: number;
  boxesFulfilled: number;
  isComplete: boolean;
  transactionId: string;
}

export interface RevenueExpectation {
  boxType: string;
  boxQuantity: number;
  expectedRevenue: number;
  revenueFulfilled: number;
  isComplete: boolean;
  role: WorkerRole;
  transactionId: string;
}

export interface OpenResponsibility {
  boxesTaken: number;
  moneyOwed: number;
  dueDate: Date;
  startDate: Date;
  // Add new responsibility tracking fields
  responsibilityTracking?: ResponsibilityTracking;
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
  plantExpectations?: PlantExpectation[]; // Track plant-to-box expectations
  revenueExpectations?: RevenueExpectation[]; // Track box-to-revenue expectations
  totalBoxesProcessed: number;
  totalRevenueGenerated: number;
  totalRevenueReturned: number;
  totalMoneyWithdrawn?: number; // Money taken from Ferrovia
  totalMoneyDeposited?: number; // Money deposited to inventory
  totalPaymentOwed?: number; // Amount owed to worker ($250 per mission)
  // Money verification tracking for managers
  moneyWithdrawalObligations?: number; // Amount manager must deposit (50% of withdrawals)
  moneyDepositVerified?: boolean; // Whether deposits match withdrawal obligations
  lastDepositVerification?: Date; // Last time deposit verification was checked
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
  private static instance: SupplyChainService | null = null;
  private sessionsFilePath: string;
  private archivedSessionsPath: string;
  private activeSessions: Map<string, SupplyChainSession> = new Map();

  private constructor() {
    this.sessionsFilePath = path.join(process.cwd(), 'data', 'supply-chain', 'active-sessions.json');
    this.archivedSessionsPath = path.join(process.cwd(), 'data', 'supply-chain', 'archived');
    this.ensureDirectories();
    this.loadActiveSessions();
  }

  public static getInstance(): SupplyChainService {
    if (!SupplyChainService.instance) {
      console.log('⛓️ Creating new SupplyChainService singleton instance');
      SupplyChainService.instance = new SupplyChainService();
    }
    return SupplyChainService.instance;
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
      const newSessionId = uuidv4();
      session = {
        sessionId: newSessionId,
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
        totalRevenueReturned: 0,
        totalMoneyWithdrawn: 0,
        totalMoneyDeposited: 0,
        totalPaymentOwed: 0
      };
      
      this.activeSessions.set(workerId, session);
      await this.saveActiveSessions();
      
      console.log(`📊 CREATED NEW SESSION for ${workerName} (${role}):`);
      console.log(`   🆔 Session ID: ${newSessionId.substring(0, 8)}`);
      console.log(`   ⏰ Start time: ${session.startTime.toISOString()}`);
      console.log(`   📊 Initial state: 0 transactions, 0 responsibilities, clean slate`);
    } else {
      // Update last activity timestamp for existing session
      session.lastActivity = new Date();
      console.log(`🔄 REUSING EXISTING SESSION for ${workerName}:`);
      console.log(`   🆔 Session ID: ${session.sessionId.substring(0, 8)}`);
      console.log(`   ⏰ Started: ${session.startTime.toISOString()}`);
      console.log(`   🔢 Current state: ${session.transactions.length} transactions, ${session.totalBoxesProcessed} boxes processed`);
      console.log(`   ⚠️ Responsibilities: ${session.openResponsibilities.boxesTaken} boxes, $${session.openResponsibilities.moneyOwed.toFixed(2)} owed`);
      
      // Extra verification for post-reset scenarios
      if (session.transactions.length === 0 && session.totalBoxesProcessed === 0) {
        console.log(`   ✅ Session appears to be freshly reset or new - ready for first transaction`);
      }
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
      case 'PLANTS_WITHDRAWN':
        // Plants taken for box making - create plant expectation
        const plantWithdrawals = { [transaction.itemName]: transaction.quantity };
        this.createPlantExpectation(session, plantWithdrawals, transaction.transactionId);
        break;

      case 'BOXES_CREATED':
        // Boxes made - update plant expectations
        this.updatePlantExpectations(session, transaction.itemName, transaction.quantity);
        break;

      case 'BOXES_WITHDRAWN':
        // Worker took boxes - create revenue expectation and add to their responsibility
        this.createRevenueExpectation(session, transaction.itemName, transaction.quantity, transaction.transactionId);
        session.openResponsibilities.boxesTaken += transaction.quantity;
        const revenue = this.calculateRevenueDistribution(transaction.quantity, session.role);
        session.openResponsibilities.moneyOwed += revenue.totalRevenue;
        session.totalBoxesProcessed += transaction.quantity;
        break;

      case 'BOXES_RETURNED':
        // Worker returned unused boxes - reduce responsibility
        session.openResponsibilities.boxesTaken -= transaction.quantity;
        const returnRevenue = this.calculateRevenueDistribution(transaction.quantity, session.role);
        session.openResponsibilities.moneyOwed -= returnRevenue.totalRevenue;

        // Ensure we don't go negative
        if (session.openResponsibilities.boxesTaken < 0) {
          session.openResponsibilities.boxesTaken = 0;
        }
        if (session.openResponsibilities.moneyOwed < 0) {
          session.openResponsibilities.moneyOwed = 0;
        }

        console.log(`📦 ${session.workerName} returned ${transaction.quantity} boxes, reduced responsibility`);
        break;

      case 'REVENUE_COLLECTED':
        // Money collected from Ferrovia - update revenue expectations
        if (transaction.amount) {
          const validRevenue = this.updateRevenueExpectations(session, transaction.amount);
          session.totalRevenueGenerated += validRevenue;

          // Any excess revenue (without expectation) should be logged
          if (validRevenue < transaction.amount) {
            console.log(`⚠️ Excess revenue of $${transaction.amount - validRevenue} without box expectation`);
          }
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

      case 'MONEY_WITHDRAWN_FROM_FERROVIA':
        // Money taken from Ferrovia by worker - track withdrawal
        if (transaction.amount) {
          session.totalMoneyWithdrawn = (session.totalMoneyWithdrawn || 0) + transaction.amount;
          console.log(`💸 ${session.workerName} withdrew $${transaction.amount} from Ferrovia`);
        }
        break;

      case 'MONEY_DEPOSITED_TO_INVENTORY':
        // Money deposited to inventory - track deposit
        if (transaction.amount) {
          session.totalMoneyDeposited = (session.totalMoneyDeposited || 0) + transaction.amount;
          console.log(`💳 ${session.workerName} deposited $${transaction.amount} to inventory`);
        }
        break;

      case 'WORKER_PAYMENT_OWED':
        // Payment owed to worker - track debt
        if (transaction.amount) {
          session.totalPaymentOwed = (session.totalPaymentOwed || 0) + transaction.amount;
          console.log(`💵 ${session.workerName} is owed $${transaction.amount}`);
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

  // Update responsibility tracking for a session
  public async updateResponsibilityTracking(workerId: string, tracking: ResponsibilityTracking): Promise<void> {
    const session = this.activeSessions.get(workerId);
    if (!session) return;

    // Initialize responsibility tracking if it doesn't exist
    if (!session.openResponsibilities.responsibilityTracking) {
      session.openResponsibilities.responsibilityTracking = tracking;
    } else {
      // Update existing tracking
      session.openResponsibilities.responsibilityTracking = {
        ...session.openResponsibilities.responsibilityTracking,
        ...tracking,
        lastCalculated: new Date()
      };
    }

    await this.saveSession(session);
    console.log(`📊 Updated responsibility tracking for ${session.workerName}`);
  }

  // Get responsibility tracking for a session
  public getResponsibilityTracking(workerId: string): ResponsibilityTracking | null {
    const session = this.activeSessions.get(workerId);
    return session?.openResponsibilities.responsibilityTracking || null;
  }

  // Calculate NET plants (withdrawn - deposited) from transactions
  public getPlantsWithdrawnFromSession(session: SupplyChainSession): { [plantName: string]: number } {
    const plantBalance: { [plantName: string]: number } = {};
    
    // Add withdrawn plants (positive)
    session.transactions
      .filter(t => t.type === 'PLANTS_WITHDRAWN')
      .forEach(t => {
        plantBalance[t.itemName] = (plantBalance[t.itemName] || 0) + t.quantity;
      });
    
    // Subtract deposited and returned plants (negative)
    session.transactions
      .filter(t => t.type === 'PLANTS_DEPOSITED' || t.type === 'PLANTS_RETURNED')
      .forEach(t => {
        plantBalance[t.itemName] = (plantBalance[t.itemName] || 0) - t.quantity;
      });
    
    // Only return plants with positive balance (net withdrawn)
    const netWithdrawn: { [plantName: string]: number } = {};
    Object.entries(plantBalance).forEach(([plant, balance]) => {
      if (balance > 0) {
        netWithdrawn[plant] = balance;
      }
    });
    
    return netWithdrawn;
  }

  // Calculate plants returned from transactions
  public getPlantsReturnedFromSession(session: SupplyChainSession): { [plantName: string]: number } {
    const plantsReturned: { [plantName: string]: number } = {};

    session.transactions
      .filter(t => t.type === 'PLANTS_DEPOSITED' || t.type === 'PLANTS_RETURNED')
      .forEach(t => {
        plantsReturned[t.itemName] = (plantsReturned[t.itemName] || 0) + t.quantity;
      });

    return plantsReturned;
  }

  // Calculate boxes created/delivered from transactions
  public getBoxesFromSession(session: SupplyChainSession): { [boxType: string]: number } {
    const boxes: { [boxType: string]: number } = {};
    
    session.transactions
      .filter(t => t.type === 'BOXES_CREATED')
      .forEach(t => {
        boxes[t.itemName] = (boxes[t.itemName] || 0) + t.quantity;
      });
    
    return boxes;
  }

  // Enhanced saveActiveSessions with better error handling and file locking
  private async saveActiveSessions(): Promise<void> {
    try {
      const sessions = Array.from(this.activeSessions.values());
      const tempFile = this.sessionsFilePath + '.tmp';
      
      // Write to temporary file first
      await fs.writeFile(tempFile, JSON.stringify(sessions, null, 2));
      
      // Atomic rename to avoid corruption
      await fs.rename(tempFile, this.sessionsFilePath);
      
      console.log(`💾 Saved ${sessions.length} active supply chain sessions`);
    } catch (error) {
      console.error('❌ Error saving active sessions:', error);
      throw error;
    }
  }

  // Create plant expectation when plants are withdrawn for box making
  public createPlantExpectation(session: SupplyChainSession, plantWithdrawals: { [plantName: string]: number }, transactionId: string): void {
    // Use RecipeService to determine what boxes can be made
    const RecipeService = require('./RecipeService').default;
    const recipeService = new RecipeService();

    const calculation = recipeService.calculateExpectedProduction(plantWithdrawals);

    if (calculation.expectedProductions.length > 0) {
      if (!session.plantExpectations) {
        session.plantExpectations = [];
      }

      // Create expectation for the optimal production
      const expectedProduction = calculation.expectedProductions[0]; // Take first/best option

      const plantExpectation: PlantExpectation = {
        plantTypes: Object.keys(plantWithdrawals),
        plantQuantities: plantWithdrawals,
        expectedBoxType: expectedProduction.boxType,
        expectedBoxQuantity: expectedProduction.expectedQuantity,
        boxesFulfilled: 0,
        isComplete: false,
        transactionId
      };

      session.plantExpectations.push(plantExpectation);
      console.log(`📦 Created plant expectation: ${Object.entries(plantWithdrawals).map(([p, q]) => `${q} ${p}`).join(', ')} → ${expectedProduction.expectedQuantity} ${expectedProduction.portugueseName}`);
    }
  }

  // Update plant expectations when boxes are created
  public updatePlantExpectations(session: SupplyChainSession, boxType: string, boxQuantity: number): void {
    if (!session.plantExpectations) return;

    // Find matching incomplete plant expectations for this box type
    const matchingExpectations = session.plantExpectations.filter(
      exp => exp.expectedBoxType === boxType && !exp.isComplete
    ).sort((a, b) => new Date(a.transactionId).getTime() - new Date(b.transactionId).getTime()); // FIFO

    let remainingBoxes = boxQuantity;

    for (const expectation of matchingExpectations) {
      if (remainingBoxes <= 0) break;

      const needed = expectation.expectedBoxQuantity - expectation.boxesFulfilled;
      const canFulfill = Math.min(needed, remainingBoxes);

      expectation.boxesFulfilled += canFulfill;
      remainingBoxes -= canFulfill;

      if (expectation.boxesFulfilled >= expectation.expectedBoxQuantity) {
        expectation.isComplete = true;
      }

      console.log(`📦 Applied ${canFulfill} ${boxType} to plant expectation (${expectation.boxesFulfilled}/${expectation.expectedBoxQuantity})`);
    }
  }

  // Create revenue expectation when boxes are withdrawn
  public createRevenueExpectation(session: SupplyChainSession, boxType: string, boxQuantity: number, transactionId: string): void {
    const revenuePerBox = 4; // $4 per box
    const totalRevenue = boxQuantity * revenuePerBox;

    if (!session.revenueExpectations) {
      session.revenueExpectations = [];
    }

    const revenueExpectation: RevenueExpectation = {
      boxType,
      boxQuantity,
      expectedRevenue: totalRevenue,
      revenueFulfilled: 0,
      isComplete: false,
      role: session.role,
      transactionId
    };

    session.revenueExpectations.push(revenueExpectation);
    console.log(`💰 Created revenue expectation: ${boxQuantity} ${boxType} → $${totalRevenue} expected`);
  }

  // Update revenue expectations when money is deposited
  public updateRevenueExpectations(session: SupplyChainSession, amount: number): number {
    if (!session.revenueExpectations) return 0;

    let validRevenue = 0;
    let remainingAmount = amount;

    // Find incomplete revenue expectations (FIFO)
    const incompleteExpectations = session.revenueExpectations.filter(exp => !exp.isComplete)
      .sort((a, b) => new Date(a.transactionId).getTime() - new Date(b.transactionId).getTime());

    for (const expectation of incompleteExpectations) {
      if (remainingAmount <= 0) break;

      const needed = expectation.expectedRevenue - expectation.revenueFulfilled;
      const canFulfill = Math.min(needed, remainingAmount);

      expectation.revenueFulfilled += canFulfill;
      validRevenue += canFulfill;
      remainingAmount -= canFulfill;

      if (expectation.revenueFulfilled >= expectation.expectedRevenue) {
        expectation.isComplete = true;
      }

      console.log(`💰 Applied $${canFulfill} to revenue expectation (${expectation.revenueFulfilled}/${expectation.expectedRevenue})`);
    }

    return validRevenue;
  }

  // Clear all session data for reset functionality
  public async clearSessionData(workerId: string): Promise<boolean> {
    try {
      const oldSession = this.activeSessions.get(workerId);
      if (!oldSession) {
        console.log(`🔍 Reset attempt for worker ${workerId} - no existing session found`);
        return false;
      }

      // Store worker info for fresh session creation
      const workerName = oldSession.workerName;
      const role = oldSession.role;

      // Pre-reset state logging for complete audit trail
      console.log(`🔄 RESET INITIATED for ${workerName} (${workerId}):`);
      console.log(`   📊 Pre-reset state - Session ID: ${oldSession.sessionId.substring(0, 8)}`);
      console.log(`   📦 Pre-reset boxes processed: ${oldSession.totalBoxesProcessed}`);
      console.log(`   💰 Pre-reset revenue generated: $${oldSession.totalRevenueGenerated.toFixed(2)}`);
      console.log(`   🔢 Pre-reset transactions: ${oldSession.transactions.length}`);
      console.log(`   ⚠️ Pre-reset responsibilities: ${oldSession.openResponsibilities.boxesTaken} boxes, $${oldSession.openResponsibilities.moneyOwed.toFixed(2)}`);

      // Backup old session data before deletion for potential recovery
      const sessionBackup = JSON.parse(JSON.stringify(oldSession));
      
      // Remove the old session completely from memory
      this.activeSessions.delete(workerId);
      console.log(`✅ Old session ${oldSession.sessionId.substring(0, 8)} removed from memory`);
      
      // Create a completely fresh session with new UUID and timestamps
      const freshSessionId = uuidv4();
      const freshSession = {
        sessionId: freshSessionId,
        workerId,
        workerName,
        role,
        status: 'active' as const,
        startTime: new Date(),
        lastActivity: new Date(),
        transactions: [],
        openResponsibilities: {
          boxesTaken: 0,
          moneyOwed: 0,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          startDate: new Date()
        },
        totalBoxesProcessed: 0,
        totalRevenueGenerated: 0,
        totalRevenueReturned: 0,
        totalMoneyWithdrawn: 0,
        totalMoneyDeposited: 0,
        totalPaymentOwed: 0
      };

      // Add fresh session to memory and save to disk
      await this.saveSession(freshSession);
      console.log(`✅ Fresh session ${freshSessionId.substring(0, 8)} created and saved`);
      
      // Comprehensive reset verification
      await this.verifyCompleteReset(workerId, sessionBackup, freshSession);
      
      console.log(`🗑️ RESET COMPLETED for ${workerName}:`);
      console.log(`   🔄 Session transition: ${sessionBackup.sessionId.substring(0, 8)} → ${freshSessionId.substring(0, 8)}`);
      console.log(`   📊 Data cleared: ${sessionBackup.transactions.length} transactions, ${sessionBackup.totalBoxesProcessed} boxes`);
      console.log(`   ✅ Fresh session ready for new transactions`);
      return true;
    } catch (error) {
      console.error('❌ Error clearing session data:', error);
      return false;
    }
  }

  // Comprehensive reset verification with detailed logging
  private async verifyCompleteReset(workerId: string, oldSession: SupplyChainSession, newSession: SupplyChainSession): Promise<void> {
    try {
      console.log(`🔍 RESET VERIFICATION for worker ${workerId}:`);

      // Verify memory state
      const memorySession = this.activeSessions.get(workerId);
      if (memorySession) {
        const sessionIdMatch = memorySession.sessionId === newSession.sessionId;
        const transactionsCleared = memorySession.transactions.length === 0;
        const responsibilitiesCleared = memorySession.openResponsibilities.boxesTaken === 0 && memorySession.openResponsibilities.moneyOwed === 0;
        const countersReset = memorySession.totalBoxesProcessed === 0 && memorySession.totalRevenueGenerated === 0 && memorySession.totalRevenueReturned === 0;
        
        console.log(`   ✅ Memory verification:`);
        console.log(`      🆔 New session ID: ${sessionIdMatch ? 'VALID' : 'INVALID'} (${memorySession.sessionId.substring(0, 8)})`);
        console.log(`      🔢 Transactions cleared: ${transactionsCleared ? 'YES' : 'NO'} (${memorySession.transactions.length} transactions)`);
        console.log(`      ⚠️ Responsibilities cleared: ${responsibilitiesCleared ? 'YES' : 'NO'} (${memorySession.openResponsibilities.boxesTaken} boxes, $${memorySession.openResponsibilities.moneyOwed.toFixed(2)})`);
        console.log(`      📊 Counters reset: ${countersReset ? 'YES' : 'NO'} (${memorySession.totalBoxesProcessed} boxes, $${memorySession.totalRevenueGenerated.toFixed(2)})`);

        if (!sessionIdMatch || !transactionsCleared || !responsibilitiesCleared || !countersReset) {
          console.error(`❌ Memory reset verification FAILED for worker ${workerId}`);
        }
      } else {
        console.error(`❌ No session found in memory after reset for worker ${workerId}`);
        return;
      }

      // Verify file persistence
      const fileData = await fs.readFile(this.sessionsFilePath, 'utf-8');
      const fileSessions: SupplyChainSession[] = JSON.parse(fileData);
      const fileSession = fileSessions.find(s => s.workerId === workerId);
      
      if (fileSession) {
        const fileSessionIdMatch = fileSession.sessionId === newSession.sessionId;
        const fileTransactionsCleared = fileSession.transactions.length === 0;
        const fileResponsibilitiesCleared = fileSession.openResponsibilities.boxesTaken === 0 && fileSession.openResponsibilities.moneyOwed === 0;
        const fileCountersReset = fileSession.totalBoxesProcessed === 0 && fileSession.totalRevenueGenerated === 0 && fileSession.totalRevenueReturned === 0;
        
        console.log(`   ✅ File verification:`);
        console.log(`      🆔 New session ID: ${fileSessionIdMatch ? 'VALID' : 'INVALID'} (${fileSession.sessionId.substring(0, 8)})`);
        console.log(`      🔢 Transactions cleared: ${fileTransactionsCleared ? 'YES' : 'NO'} (${fileSession.transactions.length} transactions)`);
        console.log(`      ⚠️ Responsibilities cleared: ${fileResponsibilitiesCleared ? 'YES' : 'NO'} (${fileSession.openResponsibilities.boxesTaken} boxes, $${fileSession.openResponsibilities.moneyOwed.toFixed(2)})`);
        console.log(`      📊 Counters reset: ${fileCountersReset ? 'YES' : 'NO'} (${fileSession.totalBoxesProcessed} boxes, $${fileSession.totalRevenueGenerated.toFixed(2)})`);

        if (fileSessionIdMatch && fileTransactionsCleared && fileResponsibilitiesCleared && fileCountersReset) {
          console.log(`✅ RESET VERIFICATION SUCCESSFUL for ${oldSession.workerName} - Clean session ready for new activity`);
        } else {
          console.error(`❌ File reset verification FAILED for worker ${workerId}`);
        }
      } else {
        console.error(`❌ Session not found in file after reset for worker ${workerId}`);
      }

      // Log session transition details
      console.log(`   📋 Session transition summary:`);
      console.log(`      🔄 Old → New Session ID: ${oldSession.sessionId.substring(0, 8)} → ${newSession.sessionId.substring(0, 8)}`);
      console.log(`      ⏰ Session start time: ${newSession.startTime.toISOString()}`);
      console.log(`      🆔 Worker: ${newSession.workerName} (${newSession.workerId})`);
      
    } catch (error) {
      console.error('❌ Error during reset verification:', error);
    }
  }

}

export default SupplyChainService;