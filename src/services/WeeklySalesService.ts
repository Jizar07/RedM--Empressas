import fs from 'fs';
import path from 'path';

export interface SaleTransaction {
  transactionId: string;
  workerName: string;
  itemName: string;
  quantity: number;
  amount: number;
  timestamp: Date;
  channelId?: string;
}

export interface WeeklyData {
  weekStart: Date; // Sunday 00:01
  weekEnd: Date; // Saturday 23:59
  weekIdentifier: string; // YYYY-MM-DD format
  transactions: SaleTransaction[];
  totalSales: number;
  totalTransactions: number;
  createdAt: Date;
  lastUpdated: Date;
}

export class WeeklySalesService {
  private static instance: WeeklySalesService;
  private dataDir: string;

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'weekly-sales');
    this.ensureDataDirectory();
  }

  public static getInstance(): WeeklySalesService {
    if (!WeeklySalesService.instance) {
      WeeklySalesService.instance = new WeeklySalesService();
    }
    return WeeklySalesService.instance;
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('📁 Created weekly sales directory');
    }
  }

  /**
   * Get the start of the current week (Sunday 00:01)
   */
  private getCurrentWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = dayOfWeek;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToSubtract);
    weekStart.setHours(0, 1, 0, 0); // Sunday 00:01

    return weekStart;
  }

  /**
   * Get the end of the current week (Saturday 23:59)
   */
  private getCurrentWeekEnd(): Date {
    const weekStart = this.getCurrentWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999); // Saturday 23:59

    return weekEnd;
  }

  /**
   * Generate week identifier (YYYY-MM-DD format based on Sunday)
   */
  private getWeekIdentifier(date?: Date): string {
    let weekStart = this.getCurrentWeekStart();

    // If date is provided, calculate week start for that date
    if (date) {
      const dayOfWeek = date.getDay();
      const daysToSubtract = dayOfWeek;
      weekStart = new Date(date.getTime());
      weekStart.setDate(date.getDate() - daysToSubtract);
      weekStart.setHours(0, 1, 0, 0);
    }

    return weekStart.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Get the file path for a week's data
   */
  private getWeekFilePath(weekIdentifier: string): string {
    return path.join(this.dataDir, `week-${weekIdentifier}.json`);
  }

  /**
   * Load or create weekly data for the current week
   */
  public getCurrentWeekData(): WeeklyData {
    const weekIdentifier = this.getWeekIdentifier();
    const filePath = this.getWeekFilePath(weekIdentifier);

    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Restore Date objects
        data.weekStart = new Date(data.weekStart);
        data.weekEnd = new Date(data.weekEnd);
        data.createdAt = new Date(data.createdAt);
        data.lastUpdated = new Date(data.lastUpdated);
        data.transactions = data.transactions.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        }));

        return data;
      } catch (error) {
        console.error('❌ Error loading weekly data:', error);
      }
    }

    // Create new weekly data
    const weekData: WeeklyData = {
      weekStart: this.getCurrentWeekStart(),
      weekEnd: this.getCurrentWeekEnd(),
      weekIdentifier,
      transactions: [],
      totalSales: 0,
      totalTransactions: 0,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    this.saveWeekData(weekData);
    console.log(`📊 Created new weekly sales tracking for week ${weekIdentifier}`);

    return weekData;
  }

  /**
   * Save weekly data to file
   */
  private saveWeekData(weekData: WeeklyData): void {
    try {
      const filePath = this.getWeekFilePath(weekData.weekIdentifier);
      fs.writeFileSync(filePath, JSON.stringify(weekData, null, 2));
      console.log(`💾 Saved weekly sales data for week ${weekData.weekIdentifier}`);
    } catch (error) {
      console.error('❌ Error saving weekly data:', error);
    }
  }

  /**
   * Add a new sale transaction to the current week
   */
  public addSaleTransaction(transaction: Omit<SaleTransaction, 'transactionId'>): void {
    const weekData = this.getCurrentWeekData();

    const saleTransaction: SaleTransaction = {
      ...transaction,
      transactionId: `sale_${Date.now()}_${Math.random().toString(36).substring(7)}`
    };

    weekData.transactions.push(saleTransaction);
    weekData.totalSales += transaction.amount;
    weekData.totalTransactions++;
    weekData.lastUpdated = new Date();

    this.saveWeekData(weekData);

    console.log(`💰 Added sale to weekly tracking: ${transaction.workerName} - ${transaction.quantity}x ${transaction.itemName} = $${transaction.amount.toFixed(2)}`);
    console.log(`📊 Week ${weekData.weekIdentifier} totals: $${weekData.totalSales.toFixed(2)} (${weekData.totalTransactions} transactions)`);
  }

  /**
   * Get current week's total sales
   */
  public getCurrentWeekTotalSales(): number {
    const weekData = this.getCurrentWeekData();
    return weekData.totalSales;
  }

  /**
   * Get current week information
   */
  public getCurrentWeekInfo(): {
    weekIdentifier: string;
    weekStart: Date;
    weekEnd: Date;
    totalSales: number;
    totalTransactions: number;
    dateRange: string;
  } {
    const weekData = this.getCurrentWeekData();

    // Format date range for display (DD/MM - DD/MM)
    const startFormatted = weekData.weekStart.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
    const endFormatted = weekData.weekEnd.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });

    return {
      weekIdentifier: weekData.weekIdentifier,
      weekStart: weekData.weekStart,
      weekEnd: weekData.weekEnd,
      totalSales: weekData.totalSales,
      totalTransactions: weekData.totalTransactions,
      dateRange: `${startFormatted} - ${endFormatted}`
    };
  }

  /**
   * Get all weekly sales data for analytics
   */
  public getAllWeeklyData(): WeeklyData[] {
    try {
      const files = fs.readdirSync(this.dataDir)
        .filter(file => file.startsWith('week-') && file.endsWith('.json'))
        .sort(); // Sort by filename (which includes date)

      return files.map(file => {
        const filePath = path.join(this.dataDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Restore Date objects
        data.weekStart = new Date(data.weekStart);
        data.weekEnd = new Date(data.weekEnd);
        data.createdAt = new Date(data.createdAt);
        data.lastUpdated = new Date(data.lastUpdated);
        data.transactions = data.transactions.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        }));

        return data;
      });
    } catch (error) {
      console.error('❌ Error loading all weekly data:', error);
      return [];
    }
  }

  /**
   * Clean up old weekly data (optional - keep last 12 weeks)
   */
  public cleanupOldData(weeksToKeep: number = 12): void {
    try {
      const allData = this.getAllWeeklyData();

      if (allData.length > weeksToKeep) {
        const toDelete = allData.slice(0, allData.length - weeksToKeep);

        toDelete.forEach(week => {
          const filePath = this.getWeekFilePath(week.weekIdentifier);
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up old weekly data: ${week.weekIdentifier}`);
        });
      }
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error);
    }
  }
}

export default WeeklySalesService;