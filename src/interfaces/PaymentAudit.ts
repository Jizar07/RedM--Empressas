// Payment audit interfaces for tracking manager payments and withdrawals

export interface ManagerWithdrawal {
  withdrawalId: string;
  managerId: string;
  managerName: string;
  amount: number;
  withdrawnAt: Date;
  channelId: string;
  messageId: string;
  originalMessage: string;
}

export interface PaymentAudit {
  paymentId: string;
  sessionId: string;
  managerId: string;
  managerName: string;
  workerId: string;
  workerName: string;
  amountPaid: number;
  paidAt: Date;
  withdrawalId?: string;
  amountWithdrawn?: number;
  withdrawnAt?: Date;
  verificationStatus: 'pending' | 'verified' | 'discrepancy' | 'expired';
  discrepancyReason?: string;
  auditedAt?: Date;
  timeWindow: {
    startTime: Date;
    endTime: Date;
  };
}

export interface PaymentVerificationConfig {
  verificationWindowMinutes: number; // How long to wait for withdrawal verification
  allowedDiscrepancy: number; // Acceptable difference between paid and withdrawn amounts
  autoExpireHours: number; // How long before pending audits expire
  enablePrePaymentValidation: boolean; // Require withdrawal before payment
  requiredManagerRoles: string[]; // Roles that can make payments
}

export interface ManagerBalance {
  managerId: string;
  managerName: string;
  lastKnownBalance?: number;
  lastUpdated?: Date;
  balanceSource: 'discord_message' | 'manual_entry' | 'unknown';
  channelId?: string;
}

export interface PaymentAuditSummary {
  totalPayments: number;
  totalAmountPaid: number;
  verifiedPayments: number;
  pendingPayments: number;
  discrepancyCount: number;
  expiredPayments: number;
  averageVerificationTime: number; // in minutes
}