import fs from 'fs';
import path from 'path';

export interface VerificationResult {
  verified: boolean;
  autoAccept: boolean;
  declaredQuantity?: number;
  actualQuantity?: number;
  expectedEarnings?: number;
  actualEarnings?: number;
  loss?: number;
  playerResponsibility?: number;
  farmProfitImpact?: number;
  originalPayment?: number;
  adjustedPayment?: number;
  discrepancy?: number;
  transactions: any[];
  verificationMessage: string;
  recommendation: 'auto-accept' | 'partial-payment' | 'reject';
}

export interface VerificationLog {
  receiptId: string;
  playerName: string;
  timestamp: string;
  serviceType: 'animal' | 'planta';
  verification: {
    timeWindowUsed: number;
    discordTransactionsFound: number;
    exactMatch: boolean;
    discrepancy: number;
    lossAmount: number;
    adjustedPayment: number;
    decision: 'auto-approved' | 'partial-payment' | 'rejected';
    adminNotified: boolean;
  };
  discordTransactions: Array<{
    timestamp: string;
    author: string;
    item?: string;
    quantity?: number;
    value?: number;
  }>;
}

export interface Receipt {
  receiptId: string;
  timestamp: string;
  playerName: string;
  serviceType: 'animal' | 'planta';
  quantity: number;
  animalType?: string;
  plantName?: string;
  playerPayment: number;
  status: string;
}

export interface Activity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda';
  categoria?: 'inventario' | 'financeiro' | 'sistema';
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
  parseSuccess?: boolean;
  displayText?: string;
  confidence?: 'high' | 'medium' | 'low' | 'none';
}

class ActivityVerificationService {
  private farmConfig: any;
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'data', 'verification-logs');
    this.ensureLogsDirectory();
    this.loadFarmConfig();
  }

  private ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private loadFarmConfig() {
    try {
      const configPath = path.join(process.cwd(), 'data', 'farm-service-config.json');
      this.farmConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
      console.error('Failed to load farm config:', error);
      // Default fallback values
      this.farmConfig = {
        farmCost: 90,
        farmProfitRequired: 10,
        optimalAnimalIncome: 60,
        plantPrices: { basic: 0.15, other: 0.2 },
        basicPlants: ['Milho', 'Trigo', 'Junco']
      };
    }
  }

  // Removed unused function

  private calculateAnimalLossImpact(expectedIncome: number, actualIncome: number): {
    loss: number;
    playerResponsibility: number;
    farmProfitImpact: number;
    recommendation: 'auto-accept' | 'partial-payment' | 'reject';
  } {
    const loss = Math.max(0, expectedIncome - actualIncome);
    
    if (loss === 0) {
      return {
        loss: 0,
        playerResponsibility: 0, 
        farmProfitImpact: 0,
        recommendation: 'auto-accept'
      };
    }
    
    // Farm economics: calculate actual profit
    const actualProfit = actualIncome - this.farmConfig.farmCost;
    
    if (actualProfit >= this.farmConfig.farmProfitRequired) {
      // Farm still profitable, player gets reduced payment
      return {
        loss,
        playerResponsibility: loss,
        farmProfitImpact: 0,
        recommendation: 'partial-payment'
      };
    } else {
      // Farm becomes unprofitable, needs admin review
      return {
        loss,
        playerResponsibility: loss,
        farmProfitImpact: this.farmConfig.farmProfitRequired - actualProfit,
        recommendation: 'reject'
      };
    }
  }

  async getPlayerDiscordActivities(playerName: string, timestamp: string, windowMinutes: number = 5): Promise<Activity[]> {
    try {
      // Fetch from the frontend webhook API
      const response = await fetch('http://localhost:3051/api/webhook/channel-messages', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch Discord activities');
      }
      
      const data: any = await response.json();
      
      if (!data.success || !Array.isArray(data.messages)) {
        return [];
      }
      
      const timeWindow = windowMinutes * 60 * 1000; // Convert to milliseconds
      const submissionTime = new Date(timestamp).getTime();
      
      // Filter activities for specific player within time window
      return (data.messages as Activity[]).filter((activity: Activity) =>
        activity.autor?.toLowerCase() === playerName.toLowerCase() &&
        Math.abs(new Date(activity.timestamp).getTime() - submissionTime) < timeWindow
      );
    } catch (error) {
      console.error('Error fetching Discord activities:', error);
      return [];
    }
  }

  async verifyPlantService(receipt: Receipt, discordActivities: Activity[]): Promise<VerificationResult> {
    const timeWindow = 5 * 60 * 1000; // 5 minutes only
    const submissionTime = new Date(receipt.timestamp);
    
    // Find all plant deposits within 5-minute timeframe
    const plantDeposits = discordActivities.filter(activity => 
      activity.categoria === 'inventario' &&
      activity.tipo === 'adicionar' &&
      activity.item?.toLowerCase().includes(receipt.plantName?.toLowerCase() || '') &&
      Math.abs(new Date(activity.timestamp).getTime() - submissionTime.getTime()) < timeWindow
    );
    
    const totalDeposited = plantDeposits.reduce((sum, deposit) => 
      sum + (deposit.quantidade || 0), 0
    );
    
    // EXACT MATCH REQUIRED - no tolerance
    const exactMatch = totalDeposited === receipt.quantity;
    const discrepancy = totalDeposited - receipt.quantity;
    
    return {
      verified: exactMatch,
      autoAccept: exactMatch,
      declaredQuantity: receipt.quantity,
      actualQuantity: totalDeposited,
      discrepancy,
      adjustedPayment: exactMatch ? receipt.playerPayment : 0,
      transactions: plantDeposits,
      recommendation: exactMatch ? 'auto-accept' : 'reject',
      verificationMessage: exactMatch ? 
        `✅ EXACT MATCH: ${totalDeposited}x ${receipt.plantName}` :
        `❌ MISMATCH: Expected ${receipt.quantity}, found ${totalDeposited} (Δ${discrepancy})`
    };
  }

  async verifyAnimalService(receipt: Receipt, discordActivities: Activity[]): Promise<VerificationResult> {
    const timeWindow = 5 * 60 * 1000; // 5 minutes only
    const submissionTime = new Date(receipt.timestamp);
    
    // Find money deposits (sales) within 5-minute timeframe
    const moneyDeposits = discordActivities.filter(activity =>
      activity.categoria === 'financeiro' &&
      (activity.tipo === 'deposito' || activity.tipo === 'venda') &&
      Math.abs(new Date(activity.timestamp).getTime() - submissionTime.getTime()) < timeWindow
    );
    
    const totalEarned = moneyDeposits.reduce((sum, deposit) => 
      sum + (deposit.valor || 0), 0
    );
    
    const expectedEarnings = receipt.playerPayment;
    const lossAnalysis = this.calculateAnimalLossImpact(expectedEarnings, totalEarned);
    
    // Calculate final payment based on loss analysis
    let finalPayment = receipt.playerPayment;
    let autoAccept = false;
    
    switch (lossAnalysis.recommendation) {
      case 'auto-accept':
        autoAccept = true;
        finalPayment = receipt.playerPayment; // Full payment
        break;
        
      case 'partial-payment':
        autoAccept = true;
        finalPayment = Math.max(0, receipt.playerPayment - lossAnalysis.playerResponsibility);
        break;
        
      case 'reject':
        autoAccept = false;
        finalPayment = 0; // No payment due to farm becoming unprofitable
        break;
    }
    
    return {
      verified: totalEarned > 0,
      autoAccept,
      expectedEarnings,
      actualEarnings: totalEarned,
      loss: lossAnalysis.loss,
      playerResponsibility: lossAnalysis.playerResponsibility,
      farmProfitImpact: lossAnalysis.farmProfitImpact,
      originalPayment: receipt.playerPayment,
      adjustedPayment: finalPayment,
      transactions: moneyDeposits,
      recommendation: lossAnalysis.recommendation,
      verificationMessage: lossAnalysis.loss === 0 ?
        `✅ PERFECT: $${totalEarned.toFixed(2)} (Expected $${expectedEarnings.toFixed(2)})` :
        lossAnalysis.recommendation === 'partial-payment' ?
          `⚠️ LOSS: Expected $${expectedEarnings.toFixed(2)}, got $${totalEarned.toFixed(2)} | Player pays loss: $${lossAnalysis.playerResponsibility.toFixed(2)}` :
          `❌ UNPROFITABLE: Loss of $${lossAnalysis.loss.toFixed(2)} makes farm unprofitable | Needs admin review`
    };
  }

  async verifyServiceSubmission(receipt: Receipt): Promise<VerificationResult> {
    console.log(`🔍 Starting verification for receipt ${receipt.receiptId} (${receipt.serviceType})`);
    
    // Get Discord activities for this player within 5-minute window
    const discordActivities = await this.getPlayerDiscordActivities(
      receipt.playerName,
      receipt.timestamp,
      5
    );
    
    console.log(`📊 Found ${discordActivities.length} Discord activities for ${receipt.playerName}`);
    
    let verificationResult: VerificationResult;
    
    if (receipt.serviceType === 'planta') {
      verificationResult = await this.verifyPlantService(receipt, discordActivities);
    } else {
      verificationResult = await this.verifyAnimalService(receipt, discordActivities);
    }
    
    // Log the verification attempt
    await this.logVerificationAttempt(receipt, verificationResult);
    
    console.log(`✅ Verification complete: ${verificationResult.verificationMessage}`);
    return verificationResult;
  }

  async logVerificationAttempt(receipt: Receipt, verification: VerificationResult): Promise<void> {
    const log: VerificationLog = {
      receiptId: receipt.receiptId,
      playerName: receipt.playerName,
      timestamp: new Date().toISOString(),
      serviceType: receipt.serviceType,
      verification: {
        timeWindowUsed: 300, // 5 minutes in seconds
        discordTransactionsFound: verification.transactions.length,
        exactMatch: verification.verified,
        discrepancy: verification.discrepancy || verification.loss || 0,
        lossAmount: verification.loss || 0,
        adjustedPayment: verification.adjustedPayment || 0,
        decision: verification.autoAccept ? 
          (verification.loss === 0 ? 'auto-approved' : 'partial-payment') : 'rejected',
        adminNotified: !verification.autoAccept
      },
      discordTransactions: verification.transactions.map(t => ({
        timestamp: t.timestamp,
        author: t.autor,
        item: t.item,
        quantity: t.quantidade,
        value: t.valor
      }))
    };
    
    // Save to individual log file
    const logFileName = `${receipt.receiptId}_${Date.now()}.json`;
    const logPath = path.join(this.logsDir, logFileName);
    
    try {
      fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
      console.log(`📝 Verification log saved: ${logFileName}`);
    } catch (error) {
      console.error('Failed to save verification log:', error);
    }
    
    // Also append to daily log
    const dailyLogPath = path.join(this.logsDir, `daily_${new Date().toISOString().slice(0, 10)}.json`);
    try {
      let dailyLogs = [];
      if (fs.existsSync(dailyLogPath)) {
        dailyLogs = JSON.parse(fs.readFileSync(dailyLogPath, 'utf-8'));
      }
      dailyLogs.push(log);
      fs.writeFileSync(dailyLogPath, JSON.stringify(dailyLogs, null, 2));
    } catch (error) {
      console.error('Failed to append to daily log:', error);
    }
  }

  async getVerificationLogs(limit: number = 50): Promise<VerificationLog[]> {
    try {
      const logFiles = fs.readdirSync(this.logsDir)
        .filter(file => file.endsWith('.json') && !file.startsWith('daily_'))
        .sort((a, b) => fs.statSync(path.join(this.logsDir, b)).mtime.getTime() - 
                       fs.statSync(path.join(this.logsDir, a)).mtime.getTime())
        .slice(0, limit);
      
      const logs: VerificationLog[] = [];
      for (const file of logFiles) {
        try {
          const logContent = fs.readFileSync(path.join(this.logsDir, file), 'utf-8');
          logs.push(JSON.parse(logContent));
        } catch (error) {
          console.error(`Failed to read log file ${file}:`, error);
        }
      }
      
      return logs;
    } catch (error) {
      console.error('Failed to get verification logs:', error);
      return [];
    }
  }
}

export default ActivityVerificationService;
export { ActivityVerificationService };