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
  private configCache: Map<string, PaymentVerificationConfig> = new Map();
  private defaultConfig: PaymentVerificationConfig;

  private constructor() {
    this.dataDir = path.join(__dirname, '../../data');

    // Default configuration
    this.defaultConfig = {
      verificationWindowMinutes: 10, // 10 minutes to verify withdrawal
      allowedDiscrepancy: 0.01, // $0.01 acceptable difference
      autoExpireHours: 24, // 24 hours before expiring pending audits
      enablePrePaymentValidation: false, // Initially disabled for gradual rollout
      requiredManagerRoles: ['Admin', 'Moderator', 'Manager']
    };

    this.initialize();
  }

  /**
   * Get path for server-specific payment audits directory
   */
  private getAuditsDir(serverId?: string): string {
    if (serverId) {
      const serverPath = path.join(this.dataDir, 'payment-audits', serverId);
      if (fs.existsSync(serverPath)) {
        return serverPath;
      }
    }
    return path.join(this.dataDir, 'payment-audits');
  }

  /**
   * Get path for server-specific manager withdrawals directory
   */
  private getWithdrawalsDir(serverId?: string): string {
    if (serverId) {
      const serverPath = path.join(this.dataDir, 'manager-withdrawals', serverId);
      if (fs.existsSync(serverPath)) {
        return serverPath;
      }
    }
    return path.join(this.dataDir, 'manager-withdrawals');
  }

  /**
   * Get path for server-specific manager balances directory
   */
  private getBalancesDir(serverId?: string): string {
    if (serverId) {
      const serverPath = path.join(this.dataDir, 'manager-balances', serverId);
      if (fs.existsSync(serverPath)) {
        return serverPath;
      }
    }
    return path.join(this.dataDir, 'manager-balances');
  }

  public static getInstance(): PaymentAuditService {
    if (!PaymentAuditService.instance) {
      PaymentAuditService.instance = new PaymentAuditService();
    }
    return PaymentAuditService.instance;
  }

  private initialize(): void {
    try {
      // Create legacy directories if they don't exist
      const legacyDirs = [
        path.join(this.dataDir, 'payment-audits'),
        path.join(this.dataDir, 'manager-withdrawals'),
        path.join(this.dataDir, 'manager-balances')
      ];

      legacyDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        }
      });

      console.log('💰 PaymentAuditService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PaymentAuditService:', error);
    }
  }

  /**
   * Get configuration for a specific server
   */
  private getConfiguration(serverId?: string): PaymentVerificationConfig {
    // Check cache first
    const cacheKey = serverId || 'legacy';
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey)!;
    }

    const configPath = path.join(this.dataDir, 'payment-audit-config.json');

    if (fs.existsSync(configPath)) {
      try {
        const fileData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

        // Check if it's the new server-based structure
        if (fileData.servers && typeof fileData.servers === 'object') {
          if (serverId && fileData.servers[serverId]) {
            const config = { ...this.defaultConfig, ...fileData.servers[serverId] };
            this.configCache.set(cacheKey, config);
            return config;
          }
          // If serverId not found, use first available server or default
          const firstServerId = Object.keys(fileData.servers)[0];
          if (firstServerId) {
            const config = { ...this.defaultConfig, ...fileData.servers[firstServerId] };
            this.configCache.set(cacheKey, config);
            return config;
          }
        } else {
          // Legacy format - use as-is
          const config = { ...this.defaultConfig, ...fileData };
          this.configCache.set(cacheKey, config);
          return config;
        }
      } catch (error) {
        console.error('❌ Failed to load payment audit configuration:', error);
      }
    }

    // Return default config
    this.configCache.set(cacheKey, this.defaultConfig);
    return this.defaultConfig;
  }

  private saveConfiguration(config: PaymentVerificationConfig, serverId?: string): void {
    const configPath = path.join(this.dataDir, 'payment-audit-config.json');

    try {
      let fileData: any = {};

      // Load existing config if it exists
      if (fs.existsSync(configPath)) {
        fileData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }

      // Ensure servers structure exists
      if (!fileData.servers) {
        fileData.servers = {};
      }

      if (serverId) {
        // Save to specific server
        fileData.servers[serverId] = config;
      } else {
        // If no serverId, save to first available server or create legacy entry
        const firstServerId = Object.keys(fileData.servers)[0];
        if (firstServerId) {
          fileData.servers[firstServerId] = config;
        } else {
          // Fallback: save as legacy format (for backward compatibility during migration)
          fileData = config;
        }
      }

      fs.writeFileSync(configPath, JSON.stringify(fileData, null, 2));

      // Clear cache
      const cacheKey = serverId || 'legacy';
      this.configCache.delete(cacheKey);

      console.log(`💾 Saved payment audit configuration [${serverId || 'legacy'}]`);
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
    amountPaid: number,
    serverId?: string
  ): Promise<PaymentAudit> {
    const now = new Date();
    const paymentId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const config = this.getConfiguration(serverId);

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
        endTime: new Date(now.getTime() + (config.verificationWindowMinutes * 60 * 1000))
      }
    };

    // Save audit record
    await this.savePaymentAudit(audit, serverId);

    console.log(`💰 Created payment audit: ${paymentId} - ${managerName} paid $${amountPaid} to ${workerName} [${serverId || 'legacy'}]`);

    // Start verification process
    setTimeout(() => {
      this.verifyPayment(paymentId, serverId);
    }, config.verificationWindowMinutes * 60 * 1000);

    return audit;
  }

  // Record a manager withdrawal from Discord message
  public async recordManagerWithdrawal(
    managerId: string,
    managerName: string,
    amount: number,
    channelId: string,
    messageId: string,
    originalMessage: string,
    serverId?: string
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
    const withdrawalsDir = this.getWithdrawalsDir(serverId);

    // Ensure directory exists
    if (!fs.existsSync(withdrawalsDir)) {
      fs.mkdirSync(withdrawalsDir, { recursive: true });
    }

    const withdrawalFile = path.join(withdrawalsDir, `${withdrawalId}.json`);
    fs.writeFileSync(withdrawalFile, JSON.stringify(withdrawal, null, 2));

    console.log(`🏦 Recorded withdrawal: ${managerName} withdrew $${amount} [${serverId || 'legacy'}]`);

    // Check for pending payment audits that could match this withdrawal
    await this.matchWithdrawalToPayments(withdrawal, serverId);

    return withdrawal;
  }

  // Verify a specific payment by looking for matching withdrawals
  public async verifyPayment(paymentId: string, serverId?: string): Promise<void> {
    try {
      const audit = await this.getPaymentAudit(paymentId, serverId);
      if (!audit || audit.verificationStatus !== 'pending') {
        return;
      }

      const config = this.getConfiguration(serverId);

      // Look for withdrawals within the time window
      const matchingWithdrawals = await this.findMatchingWithdrawals(audit, serverId);

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

          if (amountDifference <= config.allowedDiscrepancy) {
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

      await this.savePaymentAudit(audit, serverId);

      console.log(`🔍 Payment verification completed: ${paymentId} - Status: ${audit.verificationStatus} [${serverId || 'legacy'}]`);

    } catch (error) {
      console.error(`❌ Error verifying payment ${paymentId}:`, error);
    }
  }

  // Check if a manager has sufficient balance for a payment (if pre-validation is enabled)
  public async validateManagerBalance(managerId: string, requiredAmount: number, serverId?: string): Promise<{
    canPay: boolean;
    reason?: string;
    lastKnownBalance?: number;
  }> {
    const config = this.getConfiguration(serverId);

    if (!config.enablePrePaymentValidation) {
      return { canPay: true };
    }

    try {
      const balance = await this.getManagerBalance(managerId, serverId);

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
  private async savePaymentAudit(audit: PaymentAudit, serverId?: string): Promise<void> {
    const auditsDir = this.getAuditsDir(serverId);

    // Ensure directory exists
    if (!fs.existsSync(auditsDir)) {
      fs.mkdirSync(auditsDir, { recursive: true });
    }

    const auditFile = path.join(auditsDir, `${audit.paymentId}.json`);
    fs.writeFileSync(auditFile, JSON.stringify(audit, null, 2));
  }

  private async getPaymentAudit(paymentId: string, serverId?: string): Promise<PaymentAudit | null> {
    const auditsDir = this.getAuditsDir(serverId);
    const auditFile = path.join(auditsDir, `${paymentId}.json`);

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

  private async findMatchingWithdrawals(audit: PaymentAudit, serverId?: string): Promise<ManagerWithdrawal[]> {
    const withdrawals: ManagerWithdrawal[] = [];
    const withdrawalsDir = this.getWithdrawalsDir(serverId);

    if (!fs.existsSync(withdrawalsDir)) {
      return withdrawals;
    }

    try {
      const files = fs.readdirSync(withdrawalsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const withdrawal = JSON.parse(fs.readFileSync(path.join(withdrawalsDir, file), 'utf-8'));

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

  private async matchWithdrawalToPayments(withdrawal: ManagerWithdrawal, serverId?: string): Promise<void> {
    try {
      const auditsDir = this.getAuditsDir(serverId);

      if (!fs.existsSync(auditsDir)) {
        return;
      }

      const files = fs.readdirSync(auditsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const audit = JSON.parse(fs.readFileSync(path.join(auditsDir, file), 'utf-8'));

        // Check if this withdrawal could match a pending audit
        if (audit.verificationStatus === 'pending' &&
            audit.managerId === withdrawal.managerId &&
            new Date(withdrawal.withdrawnAt) >= new Date(audit.timeWindow.startTime) &&
            new Date(withdrawal.withdrawnAt) <= new Date(audit.timeWindow.endTime)) {

          // Trigger verification for this audit
          await this.verifyPayment(audit.paymentId, serverId);
        }
      }
    } catch (error) {
      console.error('❌ Error matching withdrawal to payments:', error);
    }
  }

  private async getManagerBalance(managerId: string, serverId?: string): Promise<ManagerBalance | null> {
    const balancesDir = this.getBalancesDir(serverId);
    const balanceFile = path.join(balancesDir, `${managerId}.json`);

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
  public getConfigurationPublic(serverId?: string): PaymentVerificationConfig {
    return { ...this.getConfiguration(serverId) };
  }

  public async updateConfiguration(newConfig: Partial<PaymentVerificationConfig>, serverId?: string): Promise<void> {
    const currentConfig = this.getConfiguration(serverId);
    const updatedConfig = { ...currentConfig, ...newConfig };
    this.saveConfiguration(updatedConfig, serverId);
    console.log(`⚙️ Updated payment audit configuration [${serverId || 'legacy'}]`);
  }

  public async getAuditSummary(serverId?: string): Promise<PaymentAuditSummary> {
    try {
      const auditsDir = this.getAuditsDir(serverId);

      if (!fs.existsSync(auditsDir)) {
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

      const files = fs.readdirSync(auditsDir).filter(f => f.endsWith('.json'));
      const audits = files.map(file => {
        return JSON.parse(fs.readFileSync(path.join(auditsDir, file), 'utf-8'));
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