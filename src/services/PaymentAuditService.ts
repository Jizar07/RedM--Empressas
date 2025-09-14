import * as fs from 'fs';
import * as path from 'path';
import {
  PaymentAudit,
  ManagerWithdrawal,
  PaymentVerificationConfig,
  ManagerBalance,
  PaymentAuditSummary
} from '../interfaces/PaymentAudit';

export class PaymentAuditService {
  private static instance: PaymentAuditService;
  private dataDir: string;
  private auditsDir: string;
  private withdrawalsDir: string;
  private balancesDir: string;
  private config: PaymentVerificationConfig;

  private constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.auditsDir = path.join(this.dataDir, 'payment-audits');
    this.withdrawalsDir = path.join(this.dataDir, 'manager-withdrawals');
    this.balancesDir = path.join(this.dataDir, 'manager-balances');

    // Default configuration
    this.config = {
      verificationWindowMinutes: 10, // 10 minutes to verify withdrawal
      allowedDiscrepancy: 0.01, // $0.01 acceptable difference
      autoExpireHours: 24, // 24 hours before expiring pending audits
      enablePrePaymentValidation: false, // Initially disabled for gradual rollout
      requiredManagerRoles: ['Admin', 'Moderator', 'Manager']
    };

    this.initialize();
  }

  public static getInstance(): PaymentAuditService {
    if (!PaymentAuditService.instance) {
      PaymentAuditService.instance = new PaymentAuditService();
    }
    return PaymentAuditService.instance;
  }

  private initialize(): void {
    try {
      // Create directories if they don't exist
      [this.auditsDir, this.withdrawalsDir, this.balancesDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        }
      });

      // Load configuration if it exists
      this.loadConfiguration();

      console.log('💰 PaymentAuditService initialized');
      console.log(`   📊 Verification window: ${this.config.verificationWindowMinutes} minutes`);
      console.log(`   🔍 Pre-payment validation: ${this.config.enablePrePaymentValidation ? 'ENABLED' : 'DISABLED'}`);
    } catch (error) {
      console.error('❌ Failed to initialize PaymentAuditService:', error);
    }
  }

  private loadConfiguration(): void {
    const configPath = path.join(this.dataDir, 'payment-audit-config.json');

    if (fs.existsSync(configPath)) {
      try {
        const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.config = { ...this.config, ...savedConfig };
        console.log('⚙️ Loaded payment audit configuration');
      } catch (error) {
        console.error('❌ Failed to load payment audit configuration:', error);
      }
    } else {
      // Save default configuration
      this.saveConfiguration();
    }
  }

  private saveConfiguration(): void {
    const configPath = path.join(this.dataDir, 'payment-audit-config.json');

    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      console.log('💾 Saved payment audit configuration');
    } catch (error) {
      console.error('❌ Failed to save payment audit configuration:', error);
    }
  }

  // Create a payment audit record when a payment is made
  public async createPaymentAudit(
    sessionId: string,
    managerId: string,
    managerName: string,
    workerId: string,
    workerName: string,
    amountPaid: number
  ): Promise<PaymentAudit> {
    const now = new Date();
    const paymentId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const audit: PaymentAudit = {
      paymentId,
      sessionId,
      managerId,
      managerName,
      workerId,
      workerName,
      amountPaid,
      paidAt: now,
      verificationStatus: 'pending',
      timeWindow: {
        startTime: new Date(now.getTime() - (5 * 60 * 1000)), // 5 minutes before payment
        endTime: new Date(now.getTime() + (this.config.verificationWindowMinutes * 60 * 1000))
      }
    };

    // Save audit record
    await this.savePaymentAudit(audit);

    console.log(`💰 Created payment audit: ${paymentId} - ${managerName} paid $${amountPaid} to ${workerName}`);

    // Start verification process
    setTimeout(() => {
      this.verifyPayment(paymentId);
    }, this.config.verificationWindowMinutes * 60 * 1000);

    return audit;
  }

  // Record a manager withdrawal from Discord message
  public async recordManagerWithdrawal(
    managerId: string,
    managerName: string,
    amount: number,
    channelId: string,
    messageId: string,
    originalMessage: string
  ): Promise<ManagerWithdrawal> {
    const withdrawalId = `withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const withdrawal: ManagerWithdrawal = {
      withdrawalId,
      managerId,
      managerName,
      amount,
      withdrawnAt: new Date(),
      channelId,
      messageId,
      originalMessage
    };

    // Save withdrawal record
    const withdrawalFile = path.join(this.withdrawalsDir, `${withdrawalId}.json`);
    fs.writeFileSync(withdrawalFile, JSON.stringify(withdrawal, null, 2));

    console.log(`🏦 Recorded withdrawal: ${managerName} withdrew $${amount}`);

    // Check for pending payment audits that could match this withdrawal
    await this.matchWithdrawalToPayments(withdrawal);

    return withdrawal;
  }

  // Verify a specific payment by looking for matching withdrawals
  public async verifyPayment(paymentId: string): Promise<void> {
    try {
      const audit = await this.getPaymentAudit(paymentId);
      if (!audit || audit.verificationStatus !== 'pending') {
        return;
      }

      // Look for withdrawals within the time window
      const matchingWithdrawals = await this.findMatchingWithdrawals(audit);

      if (matchingWithdrawals.length === 0) {
        // No matching withdrawal found
        const now = new Date();
        if (now > audit.timeWindow.endTime) {
          audit.verificationStatus = 'expired';
          audit.discrepancyReason = 'No matching withdrawal found within verification window';
          audit.auditedAt = now;
        }
      } else {
        // Found potential matches, verify amounts
        const bestMatch = this.selectBestWithdrawalMatch(audit, matchingWithdrawals);

        if (bestMatch) {
          const amountDifference = Math.abs(audit.amountPaid - bestMatch.amount);

          if (amountDifference <= this.config.allowedDiscrepancy) {
            audit.verificationStatus = 'verified';
            audit.withdrawalId = bestMatch.withdrawalId;
            audit.amountWithdrawn = bestMatch.amount;
            audit.withdrawnAt = bestMatch.withdrawnAt;
            audit.auditedAt = new Date();
          } else {
            audit.verificationStatus = 'discrepancy';
            audit.discrepancyReason = `Amount mismatch: Paid $${audit.amountPaid}, Withdrawn $${bestMatch.amount}`;
            audit.withdrawalId = bestMatch.withdrawalId;
            audit.amountWithdrawn = bestMatch.amount;
            audit.withdrawnAt = bestMatch.withdrawnAt;
            audit.auditedAt = new Date();
          }
        }
      }

      await this.savePaymentAudit(audit);

      console.log(`🔍 Payment verification completed: ${paymentId} - Status: ${audit.verificationStatus}`);

    } catch (error) {
      console.error(`❌ Error verifying payment ${paymentId}:`, error);
    }
  }

  // Check if a manager has sufficient balance for a payment (if pre-validation is enabled)
  public async validateManagerBalance(managerId: string, requiredAmount: number): Promise<{
    canPay: boolean;
    reason?: string;
    lastKnownBalance?: number;
  }> {
    if (!this.config.enablePrePaymentValidation) {
      return { canPay: true };
    }

    try {
      const balance = await this.getManagerBalance(managerId);

      if (!balance || balance.lastKnownBalance === undefined) {
        return {
          canPay: false,
          reason: 'No balance information available for this manager'
        };
      }

      if (balance.lastKnownBalance < requiredAmount) {
        return {
          canPay: false,
          reason: `Insufficient funds: $${balance.lastKnownBalance} < $${requiredAmount}`,
          lastKnownBalance: balance.lastKnownBalance
        };
      }

      return {
        canPay: true,
        lastKnownBalance: balance.lastKnownBalance
      };
    } catch (error) {
      console.error('❌ Error validating manager balance:', error);
      return {
        canPay: false,
        reason: 'Error checking balance information'
      };
    }
  }

  // Helper methods
  private async savePaymentAudit(audit: PaymentAudit): Promise<void> {
    const auditFile = path.join(this.auditsDir, `${audit.paymentId}.json`);
    fs.writeFileSync(auditFile, JSON.stringify(audit, null, 2));
  }

  private async getPaymentAudit(paymentId: string): Promise<PaymentAudit | null> {
    const auditFile = path.join(this.auditsDir, `${paymentId}.json`);

    if (!fs.existsSync(auditFile)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
    } catch (error) {
      console.error(`❌ Error reading payment audit ${paymentId}:`, error);
      return null;
    }
  }

  private async findMatchingWithdrawals(audit: PaymentAudit): Promise<ManagerWithdrawal[]> {
    const withdrawals: ManagerWithdrawal[] = [];

    try {
      const files = fs.readdirSync(this.withdrawalsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const withdrawal = JSON.parse(fs.readFileSync(path.join(this.withdrawalsDir, file), 'utf-8'));

        // Check if withdrawal matches criteria
        if (withdrawal.managerId === audit.managerId &&
            new Date(withdrawal.withdrawnAt) >= audit.timeWindow.startTime &&
            new Date(withdrawal.withdrawnAt) <= audit.timeWindow.endTime) {
          withdrawals.push(withdrawal);
        }
      }
    } catch (error) {
      console.error('❌ Error finding matching withdrawals:', error);
    }

    return withdrawals;
  }

  private selectBestWithdrawalMatch(audit: PaymentAudit, withdrawals: ManagerWithdrawal[]): ManagerWithdrawal | null {
    if (withdrawals.length === 0) return null;

    // Sort by amount difference and time proximity
    return withdrawals.sort((a, b) => {
      const amountDiffA = Math.abs(audit.amountPaid - a.amount);
      const amountDiffB = Math.abs(audit.amountPaid - b.amount);

      if (amountDiffA !== amountDiffB) {
        return amountDiffA - amountDiffB;
      }

      // If amounts are equally close, prefer the one closer in time
      const timeDiffA = Math.abs(audit.paidAt.getTime() - new Date(a.withdrawnAt).getTime());
      const timeDiffB = Math.abs(audit.paidAt.getTime() - new Date(b.withdrawnAt).getTime());

      return timeDiffA - timeDiffB;
    })[0];
  }

  private async matchWithdrawalToPayments(withdrawal: ManagerWithdrawal): Promise<void> {
    try {
      const files = fs.readdirSync(this.auditsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const audit = JSON.parse(fs.readFileSync(path.join(this.auditsDir, file), 'utf-8'));

        // Check if this withdrawal could match a pending audit
        if (audit.verificationStatus === 'pending' &&
            audit.managerId === withdrawal.managerId &&
            new Date(withdrawal.withdrawnAt) >= new Date(audit.timeWindow.startTime) &&
            new Date(withdrawal.withdrawnAt) <= new Date(audit.timeWindow.endTime)) {

          // Trigger verification for this audit
          await this.verifyPayment(audit.paymentId);
        }
      }
    } catch (error) {
      console.error('❌ Error matching withdrawal to payments:', error);
    }
  }

  private async getManagerBalance(managerId: string): Promise<ManagerBalance | null> {
    const balanceFile = path.join(this.balancesDir, `${managerId}.json`);

    if (!fs.existsSync(balanceFile)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(balanceFile, 'utf-8'));
    } catch (error) {
      console.error(`❌ Error reading manager balance for ${managerId}:`, error);
      return null;
    }
  }

  // Public methods for external access
  public getConfiguration(): PaymentVerificationConfig {
    return { ...this.config };
  }

  public async updateConfiguration(newConfig: Partial<PaymentVerificationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    this.saveConfiguration();
    console.log('⚙️ Updated payment audit configuration');
  }

  public async getAuditSummary(): Promise<PaymentAuditSummary> {
    try {
      const files = fs.readdirSync(this.auditsDir).filter(f => f.endsWith('.json'));
      const audits = files.map(file => {
        return JSON.parse(fs.readFileSync(path.join(this.auditsDir, file), 'utf-8'));
      });

      const summary: PaymentAuditSummary = {
        totalPayments: audits.length,
        totalAmountPaid: audits.reduce((sum, audit) => sum + audit.amountPaid, 0),
        verifiedPayments: audits.filter(a => a.verificationStatus === 'verified').length,
        pendingPayments: audits.filter(a => a.verificationStatus === 'pending').length,
        discrepancyCount: audits.filter(a => a.verificationStatus === 'discrepancy').length,
        expiredPayments: audits.filter(a => a.verificationStatus === 'expired').length,
        averageVerificationTime: this.calculateAverageVerificationTime(audits)
      };

      return summary;
    } catch (error) {
      console.error('❌ Error generating audit summary:', error);
      return {
        totalPayments: 0,
        totalAmountPaid: 0,
        verifiedPayments: 0,
        pendingPayments: 0,
        discrepancyCount: 0,
        expiredPayments: 0,
        averageVerificationTime: 0
      };
    }
  }

  private calculateAverageVerificationTime(audits: PaymentAudit[]): number {
    const verifiedAudits = audits.filter(a => a.verificationStatus === 'verified' && a.auditedAt);

    if (verifiedAudits.length === 0) return 0;

    const totalTime = verifiedAudits.reduce((sum, audit) => {
      const paidAt = new Date(audit.paidAt).getTime();
      const auditedAt = new Date(audit.auditedAt!).getTime();
      return sum + (auditedAt - paidAt);
    }, 0);

    return Math.round(totalTime / verifiedAudits.length / (60 * 1000)); // Convert to minutes
  }
}

export default PaymentAuditService;