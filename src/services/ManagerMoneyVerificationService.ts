/**
 * Manager Money Verification Service
 * Tracks manager money withdrawals from Ferrovia and verifies corresponding deposits to inventory
 */

import fs from 'fs';
import path from 'path';
import SupplyChainService, { SupplyChainTransaction } from './SupplyChainService';

interface ManagerMoneyObligation {
  managerId: string;
  managerName: string;
  sessionId: string;
  withdrawalAmount: number;
  depositObligation: number; // Amount that must be deposited (50% for managers)
  withdrawalDate: Date;
  depositedAmount: number;
  lastDepositDate?: Date;
  status: 'pending' | 'fulfilled' | 'overdue';
  obligationDeadline: Date; // 24 hours after withdrawal
}

interface MoneyVerificationData {
  obligations: Map<string, ManagerMoneyObligation>; // keyed by sessionId
  lastUpdated: Date;
}

export class ManagerMoneyVerificationService {
  private static instance: ManagerMoneyVerificationService | null = null;
  private supplyChainService: SupplyChainService;
  private dataDir: string;
  private dataFile: string;
  private obligations: Map<string, ManagerMoneyObligation> = new Map();

  private constructor() {
    this.supplyChainService = SupplyChainService.getInstance();
    this.dataDir = path.join(process.cwd(), 'data', 'manager-money-verification');
    this.dataFile = path.join(this.dataDir, 'obligations.json');
    this.ensureDataDirectory();
    this.loadObligations();
  }

  public static getInstance(): ManagerMoneyVerificationService {
    if (!ManagerMoneyVerificationService.instance) {
      console.log('💰 Creating new ManagerMoneyVerificationService singleton instance');
      ManagerMoneyVerificationService.instance = new ManagerMoneyVerificationService();
    }
    return ManagerMoneyVerificationService.instance;
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('📁 Created manager money verification directory');
    }
  }

  private async loadObligations(): Promise<void> {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));

        // Convert stored data back to Map with proper Date objects
        if (data.obligations) {
          for (const [sessionId, obligation] of Object.entries(data.obligations as Record<string, any>)) {
            this.obligations.set(sessionId, {
              ...obligation,
              withdrawalDate: new Date(obligation.withdrawalDate),
              lastDepositDate: obligation.lastDepositDate ? new Date(obligation.lastDepositDate) : undefined,
              obligationDeadline: new Date(obligation.obligationDeadline)
            });
          }
        }

        console.log(`💰 Loaded ${this.obligations.size} manager money obligations`);
      }
    } catch (error) {
      console.error('❌ Error loading manager money obligations:', error);
    }
  }

  private async saveObligations(): Promise<void> {
    try {
      const data: MoneyVerificationData = {
        obligations: this.obligations,
        lastUpdated: new Date()
      };

      // Convert Map to plain object for JSON serialization
      const serializable = {
        obligations: Object.fromEntries(this.obligations.entries()),
        lastUpdated: data.lastUpdated.toISOString()
      };

      fs.writeFileSync(this.dataFile, JSON.stringify(serializable, null, 2));
      console.log(`💰 Saved ${this.obligations.size} manager money obligations`);
    } catch (error) {
      console.error('❌ Error saving manager money obligations:', error);
    }
  }

  /**
   * Record a manager money withdrawal from Ferrovia
   * This creates an obligation for the manager to deposit 50% to inventory
   */
  public async recordManagerWithdrawal(
    managerId: string,
    managerName: string,
    sessionId: string,
    withdrawalAmount: number
  ): Promise<void> {
    try {
      // Calculate deposit obligation (50% for managers)
      const depositObligation = withdrawalAmount * 0.5;

      // Set deadline as 24 hours from withdrawal
      const obligationDeadline = new Date();
      obligationDeadline.setHours(obligationDeadline.getHours() + 24);

      const obligation: ManagerMoneyObligation = {
        managerId,
        managerName,
        sessionId,
        withdrawalAmount,
        depositObligation,
        withdrawalDate: new Date(),
        depositedAmount: 0,
        status: 'pending',
        obligationDeadline
      };

      this.obligations.set(sessionId, obligation);
      await this.saveObligations();

      console.log(`💰 Recorded manager withdrawal: ${managerName} withdrew $${withdrawalAmount}, must deposit $${depositObligation} by ${obligationDeadline.toLocaleString()}`);

      // Add transaction to the session
      const withdrawalTransaction: SupplyChainTransaction = {
        transactionId: `money_withdraw_${Date.now()}`,
        type: 'MONEY_WITHDRAWN_FROM_FERROVIA',
        itemName: 'Money',
        quantity: 1,
        amount: withdrawalAmount,
        timestamp: new Date(),
        originalMessage: `Manager ${managerName} withdrew $${withdrawalAmount} from Ferrovia`
      };

      await this.supplyChainService.addTransaction(managerId, withdrawalTransaction);

    } catch (error) {
      console.error('❌ Error recording manager withdrawal:', error);
    }
  }

  /**
   * Record a manager money deposit to inventory
   * This reduces the obligation for the manager
   */
  public async recordManagerDeposit(
    managerId: string,
    managerName: string,
    sessionId: string,
    depositAmount: number
  ): Promise<void> {
    try {
      const obligation = this.obligations.get(sessionId);

      if (!obligation) {
        console.warn(`⚠️ No withdrawal obligation found for session ${sessionId}, creating deposit record anyway`);

        // Still record the deposit transaction
        const depositTransaction: SupplyChainTransaction = {
          transactionId: `money_deposit_${Date.now()}`,
          type: 'MONEY_DEPOSITED_TO_INVENTORY',
          itemName: 'Money',
          quantity: 1,
          amount: depositAmount,
          timestamp: new Date(),
          originalMessage: `Manager ${managerName} deposited $${depositAmount} to inventory`
        };

        // Update Ferrovia session's totalRevenueReturned field BEFORE adding transaction
        // This prevents double embed updates by having correct state when addTransaction triggers update
        const activeSessions = this.supplyChainService.getAllActiveSessions();
        const managerSession = activeSessions.find(s => s.workerId === managerId && s.status === 'active' && s.role === 'manager');

        if (managerSession) {
          managerSession.totalRevenueReturned += depositAmount;
          console.log(`💰 Pre-updated totalRevenueReturned (no obligation): +$${depositAmount} (total: $${managerSession.totalRevenueReturned})`);
        }

        // Add transaction (this will trigger automatic embed update with correct totals)
        await this.supplyChainService.addTransaction(managerId, depositTransaction);

        return;
      }

      // Update the obligation with the deposit
      obligation.depositedAmount += depositAmount;
      obligation.lastDepositDate = new Date();

      // Check if obligation is fulfilled
      if (obligation.depositedAmount >= obligation.depositObligation) {
        obligation.status = 'fulfilled';
        console.log(`✅ Manager ${managerName} fulfilled deposit obligation: $${obligation.depositedAmount}/$${obligation.depositObligation}`);
      } else {
        console.log(`📝 Partial deposit by ${managerName}: $${obligation.depositedAmount}/$${obligation.depositObligation} (remaining: $${obligation.depositObligation - obligation.depositedAmount})`);
      }

      await this.saveObligations();

      // Add transaction to the session
      const depositTransaction: SupplyChainTransaction = {
        transactionId: `money_deposit_${Date.now()}`,
        type: 'MONEY_DEPOSITED_TO_INVENTORY',
        itemName: 'Money',
        quantity: 1,
        amount: depositAmount,
        timestamp: new Date(),
        originalMessage: `Manager ${managerName} deposited $${depositAmount} to inventory`
      };

      // Update Ferrovia session's totalRevenueReturned field BEFORE adding transaction
      // This prevents double embed updates by having correct state when addTransaction triggers update
      const activeSessions = this.supplyChainService.getAllActiveSessions();
      const managerSession = activeSessions.find(s => s.workerId === managerId && s.status === 'active' && s.role === 'manager');

      if (managerSession) {
        managerSession.totalRevenueReturned += depositAmount;
        console.log(`💰 Pre-updated totalRevenueReturned: +$${depositAmount} (total: $${managerSession.totalRevenueReturned})`);
      } else {
        console.log(`⚠️ Could not find active manager session for ${managerName} to update totalRevenueReturned`);
      }

      // Add transaction (this will trigger automatic embed update with correct totals)
      await this.supplyChainService.addTransaction(managerId, depositTransaction);

      console.log(`🔄 Money deposit processed, session updated for ${managerName}`);

    } catch (error) {
      console.error('❌ Error recording manager deposit:', error);
    }
  }

  /**
   * Get the current money verification status for a manager session
   */
  public getSessionVerificationStatus(sessionId: string): {
    hasObligation: boolean;
    withdrawalAmount: number;
    depositObligation: number;
    depositedAmount: number;
    remainingObligation: number;
    status: 'pending' | 'fulfilled' | 'overdue';
    isOverdue: boolean;
    daysUntilDeadline: number;
  } {
    const obligation = this.obligations.get(sessionId);

    if (!obligation) {
      return {
        hasObligation: false,
        withdrawalAmount: 0,
        depositObligation: 0,
        depositedAmount: 0,
        remainingObligation: 0,
        status: 'fulfilled',
        isOverdue: false,
        daysUntilDeadline: 0
      };
    }

    // Check if overdue
    const now = new Date();
    const isOverdue = now > obligation.obligationDeadline && obligation.status !== 'fulfilled';
    if (isOverdue && obligation.status !== 'overdue') {
      obligation.status = 'overdue';
      this.saveObligations();
    }

    const daysUntilDeadline = Math.ceil((obligation.obligationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const remainingObligation = Math.max(0, obligation.depositObligation - obligation.depositedAmount);

    return {
      hasObligation: true,
      withdrawalAmount: obligation.withdrawalAmount,
      depositObligation: obligation.depositObligation,
      depositedAmount: obligation.depositedAmount,
      remainingObligation,
      status: obligation.status,
      isOverdue,
      daysUntilDeadline
    };
  }

  /**
   * Get all pending obligations for monitoring
   */
  public getPendingObligations(): ManagerMoneyObligation[] {
    return Array.from(this.obligations.values()).filter(
      obligation => obligation.status === 'pending' || obligation.status === 'overdue'
    );
  }

  /**
   * Get recent withdrawals by a manager within a time window
   */
  public getRecentManagerWithdrawals(managerId: string, minutesWindow: number = 30): Array<{
    sessionId: string;
    amount: number;
    timestamp: Date;
    depositObligation: number;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - minutesWindow * 60 * 1000);

    const recentWithdrawals: Array<{
      sessionId: string;
      amount: number;
      timestamp: Date;
      depositObligation: number;
    }> = [];

    // Check all obligations for this manager
    for (const [sessionId, obligation] of this.obligations.entries()) {
      if (obligation.managerId === managerId && obligation.withdrawalDate >= windowStart) {
        recentWithdrawals.push({
          sessionId,
          amount: obligation.withdrawalAmount,
          timestamp: obligation.withdrawalDate,
          depositObligation: obligation.depositObligation
        });
      }
    }

    console.log(`💰 Found ${recentWithdrawals.length} recent withdrawals for manager ${managerId} in last ${minutesWindow} minutes`);
    return recentWithdrawals;
  }

  /**
   * Find a withdrawal that matches a payment amount
   */
  public findMatchingWithdrawal(managerId: string, amount: number, tolerance: number = 0.01): {
    sessionId: string;
    amount: number;
    timestamp: Date;
  } | null {
    const recentWithdrawals = this.getRecentManagerWithdrawals(managerId, 30);

    for (const withdrawal of recentWithdrawals) {
      if (Math.abs(withdrawal.amount - amount) <= tolerance) {
        console.log(`✅ Found matching withdrawal: $${withdrawal.amount} matches payment $${amount}`);
        return withdrawal;
      }
    }

    console.log(`❌ No matching withdrawal found for $${amount}`);
    return null;
  }

  /**
   * Clean up old fulfilled obligations (older than 30 days)
   */
  public async cleanupOldObligations(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let cleaned = 0;
    for (const [sessionId, obligation] of this.obligations.entries()) {
      if (obligation.status === 'fulfilled' && obligation.lastDepositDate && obligation.lastDepositDate < thirtyDaysAgo) {
        this.obligations.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.saveObligations();
      console.log(`🧹 Cleaned up ${cleaned} old fulfilled money obligations`);
    }
  }

  /**
   * Process money transaction from Discord message
   * Determines if it's a withdrawal or deposit and updates tracking accordingly
   */
  public async processMoneyTransaction(
    authorId: string,
    authorName: string,
    content: string,
    _messageTimestamp: Date
  ): Promise<void> {
    try {
      console.log(`💰 DEBUG - Processing money transaction:`);
      console.log(`💰 Author: ${authorName} (ID: ${authorId})`);
      console.log(`💰 Content: "${content}"`);

      // Check for manager withdrawal pattern - could be embed or text format
      const withdrawalPattern = /(?:retirou\s+\$?([\d,\.]+)\s+da\s+ferrovia|Valor retirado:\s*\$?([\d,\.]+))/i;
      const withdrawalMatch = content.match(withdrawalPattern);
      console.log(`💰 Withdrawal pattern test: ${withdrawalPattern.test(content)}`);

      if (withdrawalMatch) {
        // Handle multiple capture groups from the alternative pattern
        const amount = parseFloat((withdrawalMatch[1] || withdrawalMatch[2]).replace(',', '.'));

        // Get the active session for this manager
        const activeSessions = this.supplyChainService.getAllActiveSessions();
        const session = activeSessions.find(s => s.workerId === authorId && s.status === 'active');
        if (session && session.role === 'manager') {
          await this.recordManagerWithdrawal(authorId, authorName, session.sessionId, amount);
        } else {
          console.log(`ℹ️ Money withdrawal by ${authorName} but no active manager session found`);
        }
        return;
      }

      // Check for manager deposit pattern - Farm channel format with double colons
      const depositPattern = /Valor depositado::\s*\$([0-9,.]+)\s*Autor::\s*(.+?)\s*\|\s*FIXO:\s*\d+/s;
      const depositMatch = content.match(depositPattern);
      console.log(`💰 Deposit pattern test: ${depositPattern.test(content)}`);

      if (depositMatch) {
        const amount = parseFloat(depositMatch[1].replace(',', '.'));
        const extractedAuthorName = depositMatch[2].trim(); // Extract author from pattern

        console.log(`💰 Deposit pattern matched: $${amount} by ${extractedAuthorName}`);

        // Get the active session for this manager
        const activeSessions = this.supplyChainService.getAllActiveSessions();

        // Debug logging for session lookup
        console.log(`🔍 DEBUG - Session lookup for money deposit:`);
        console.log(`🔍 Looking for: authorId="${authorId}", status="active", role="manager"`);
        console.log(`🔍 Total active sessions found: ${activeSessions.length}`);

        activeSessions.forEach((s, index) => {
          console.log(`🔍 Session ${index + 1}: workerId="${s.workerId}", status="${s.status}", role="${s.role}", workerName="${s.workerName}"`);
        });

        const session = activeSessions.find(s => s.workerId === authorId && s.status === 'active');
        console.log(`🔍 Initial session match (workerId + status): ${session ? 'FOUND' : 'NOT FOUND'}`);

        if (session) {
          console.log(`🔍 Found session details: role="${session.role}", workerId="${session.workerId}", sessionId="${session.sessionId}"`);
        }

        if (session && session.role === 'manager') {
          console.log(`✅ Manager session validated, recording deposit`);
          await this.recordManagerDeposit(authorId, extractedAuthorName, session.sessionId, amount);
        } else {
          console.log(`❌ Money deposit by ${extractedAuthorName} - no valid manager session found`);
          if (session) {
            console.log(`❌ Session found but role is "${session.role}" (expected "manager")`);
          } else {
            console.log(`❌ No session found with workerId="${authorId}" and status="active"`);
          }
        }
        return;
      }

      console.log(`🔍 Money transaction message from ${authorName} did not match withdrawal or deposit patterns:`);
      console.log(`🔍 Content: "${content}"`);
      console.log(`🔍 Withdrawal pattern test: ${withdrawalPattern.test(content)}`);
      console.log(`🔍 Deposit pattern test: ${depositPattern.test(content)}`);

    } catch (error) {
      console.error('❌ Error processing money transaction:', error);
    }
  }
}

export default ManagerMoneyVerificationService;