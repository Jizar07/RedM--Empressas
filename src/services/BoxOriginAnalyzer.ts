import { SupplyChainSession, SupplyChainTransaction, DetailedTimeline, DetailedTimelineEvent, UserPerformanceMetrics } from './SupplyChainService';
import fs from 'fs';
import path from 'path';

export interface BoxOriginAnalysis {
  sessionId: string;
  totalBoxesCreated: number;
  totalBoxesWithdrawn: number;
  totalPlantsUsed: number;
  expectedBoxesFromPlants: number;
  externalBoxesSuspected: number;
  suspicionLevel: 'low' | 'medium' | 'high';
  farmRevenueImpact: number; // estimated lost revenue to farm
  detectionFlags: string[];
  plantToBoxRatio: number;
}

export interface ExternalBoxSuspicion {
  isExternal: boolean;
  suspicionLevel: 'low' | 'medium' | 'high';
  suspectedQuantity: number;
  detectionMethod: string;
  confidence: number; // 0-100%
  evidenceReasons: string[];
}

export class BoxOriginAnalyzer {
  private static instance: BoxOriginAnalyzer | null = null;
  private readonly NORMAL_PLANT_TO_BOX_RATIO_MIN = 250; // minimum plants per box
  private readonly NORMAL_PLANT_TO_BOX_RATIO_MAX = 300; // maximum plants per box
  private readonly SUSPICIOUS_RATIO_MULTIPLIER = 1.5; // if boxes are 1.5x+ expected, flag as suspicious
  private readonly BOX_VALUE = 4.0; // $4 per box

  public static getInstance(): BoxOriginAnalyzer {
    if (!BoxOriginAnalyzer.instance) {
      BoxOriginAnalyzer.instance = new BoxOriginAnalyzer();
    }
    return BoxOriginAnalyzer.instance;
  }

  /**
   * Analyze a Ferrovia session for box origin and detect external box usage
   */
  public analyzeSession(session: SupplyChainSession): BoxOriginAnalysis {
    const plantsWithdrawn = session.transactions
      .filter(t => t.type === 'PLANTS_WITHDRAWN')
      .reduce((sum, t) => sum + t.quantity, 0);

    const boxesCreated = session.transactions
      .filter(t => t.type === 'BOXES_CREATED')
      .reduce((sum, t) => sum + t.quantity, 0);

    const boxesWithdrawn = session.transactions
      .filter(t => t.type === 'BOXES_WITHDRAWN')
      .reduce((sum, t) => sum + t.quantity, 0);

    // Calculate expected boxes based on plants used
    const expectedBoxes = Math.floor(plantsWithdrawn / 275); // average 275 plants per box
    const externalBoxesSuspected = Math.max(0, boxesWithdrawn - boxesCreated);

    // Calculate plant-to-box ratio for boxes created (not withdrawn)
    const plantToBoxRatio = boxesCreated > 0 ? plantsWithdrawn / boxesCreated : 0;

    const detectionFlags: string[] = [];
    let suspicionLevel: 'low' | 'medium' | 'high' = 'low';

    // Detection Flag 1: Box surplus (more boxes withdrawn than created)
    if (externalBoxesSuspected > 0) {
      detectionFlags.push(`Box surplus: ${externalBoxesSuspected} boxes appear without farm production`);
      suspicionLevel = externalBoxesSuspected > 10 ? 'high' : 'medium';
    }

    // Detection Flag 2: Abnormal plant-to-box ratio
    if (boxesCreated > 0 && (plantToBoxRatio < this.NORMAL_PLANT_TO_BOX_RATIO_MIN || plantToBoxRatio > this.NORMAL_PLANT_TO_BOX_RATIO_MAX)) {
      detectionFlags.push(`Abnormal plant-to-box ratio: ${plantToBoxRatio.toFixed(1)} (normal: ${this.NORMAL_PLANT_TO_BOX_RATIO_MIN}-${this.NORMAL_PLANT_TO_BOX_RATIO_MAX})`);
      suspicionLevel = plantToBoxRatio < 150 ? 'high' : 'medium';
    }

    // Detection Flag 3: Timeline gaps (boxes appear without recent plant activity)
    const timelineGaps = this.detectTimelineGaps(session);
    if (timelineGaps.length > 0) {
      detectionFlags.push(`Suspicious timeline gaps: ${timelineGaps.length} unexplained periods`);
      suspicionLevel = timelineGaps.length > 2 ? 'high' : 'medium';
    }

    // Calculate farm revenue impact
    const farmRevenueImpact = externalBoxesSuspected * this.BOX_VALUE * 0.5; // 50% of box value is farm's share

    return {
      sessionId: session.sessionId,
      totalBoxesCreated: boxesCreated,
      totalBoxesWithdrawn: boxesWithdrawn,
      totalPlantsUsed: plantsWithdrawn,
      expectedBoxesFromPlants: expectedBoxes,
      externalBoxesSuspected,
      suspicionLevel,
      farmRevenueImpact,
      detectionFlags,
      plantToBoxRatio
    };
  }

  /**
   * Detect external boxes based on plant-to-box ratio analysis
   */
  public detectExternalBoxes(plantsUsed: number, boxesWithdrawn: number, boxesCreated: number): ExternalBoxSuspicion {
    const expectedBoxes = Math.floor(plantsUsed / 275); // average 275 plants per box
    const surplusBoxes = boxesWithdrawn - boxesCreated;
    const plantToBoxRatio = boxesCreated > 0 ? plantsUsed / boxesCreated : 0;

    let suspicionLevel: 'low' | 'medium' | 'high' = 'low';
    let confidence = 0;
    const evidenceReasons: string[] = [];
    let detectionMethod = 'ratio_analysis';

    // Evidence 1: Direct box surplus
    if (surplusBoxes > 0) {
      evidenceReasons.push(`${surplusBoxes} boxes in possession without farm production`);
      confidence += surplusBoxes > 5 ? 80 : 60;
      suspicionLevel = surplusBoxes > 10 ? 'high' : 'medium';
      detectionMethod = 'direct_surplus';
    }

    // Evidence 2: Abnormal ratios
    if (boxesCreated > 0 && plantToBoxRatio < this.NORMAL_PLANT_TO_BOX_RATIO_MIN) {
      evidenceReasons.push(`Very efficient ratio: ${plantToBoxRatio.toFixed(1)} plants per box (normal: ${this.NORMAL_PLANT_TO_BOX_RATIO_MIN}+)`);
      confidence += plantToBoxRatio < 200 ? 70 : 40;
      suspicionLevel = plantToBoxRatio < 150 ? 'high' : suspicionLevel;
    }

    // Evidence 3: Too many boxes for plants used
    if (boxesWithdrawn > expectedBoxes * this.SUSPICIOUS_RATIO_MULTIPLIER) {
      evidenceReasons.push(`${boxesWithdrawn} boxes used but only ${expectedBoxes} expected from ${plantsUsed} plants`);
      confidence += 60;
      suspicionLevel = 'medium';
    }

    return {
      isExternal: confidence > 50,
      suspicionLevel,
      suspectedQuantity: Math.max(surplusBoxes, boxesWithdrawn - expectedBoxes),
      detectionMethod,
      confidence: Math.min(confidence, 100),
      evidenceReasons
    };
  }

  /**
   * Calculate user performance metrics across all sessions
   */
  public calculateUserRisk(userId: string, userName: string): UserPerformanceMetrics {
    try {
      // Load all active sessions for this user
      const sessionsDir = path.join(process.cwd(), 'data', 'supply-chain');
      const activeSessionsPath = path.join(sessionsDir, 'active-sessions.json');

      if (!fs.existsSync(activeSessionsPath)) {
        return this.createEmptyMetrics(userId, userName);
      }

      const activeSessionsData = JSON.parse(fs.readFileSync(activeSessionsPath, 'utf8'));
      const userSessions = activeSessionsData.sessions?.filter((s: any) => s.workerId === userId) || [];

      let totalBoxesExternal = 0;
      let totalFarmLoss = 0;
      let plantToBoxRatios: number[] = [];
      let flaggedSessions: string[] = [];
      let lastActivity = new Date(0);

      // Analyze each session
      for (const session of userSessions) {
        const analysis = this.analyzeSession(session);

        if (analysis.suspicionLevel !== 'low') {
          flaggedSessions.push(session.sessionId);
        }

        totalBoxesExternal += analysis.externalBoxesSuspected;
        totalFarmLoss += analysis.farmRevenueImpact;

        if (analysis.plantToBoxRatio > 0) {
          plantToBoxRatios.push(analysis.plantToBoxRatio);
        }

        // Track last activity
        const sessionDate = new Date(session.lastActivity || session.startDate);
        if (sessionDate > lastActivity) {
          lastActivity = sessionDate;
        }
      }

      // Calculate metrics
      const avgPlantToBoxRatio = plantToBoxRatios.length > 0
        ? plantToBoxRatios.reduce((sum, ratio) => sum + ratio, 0) / plantToBoxRatios.length
        : 0;

      const totalBoxes = userSessions.reduce((sum: number, s: any) => {
        return sum + s.transactions.filter((t: any) => t.type === 'BOXES_WITHDRAWN').reduce((boxSum: number, t: any) => boxSum + t.quantity, 0);
      }, 0);

      const externalBoxPercentage = totalBoxes > 0 ? (totalBoxesExternal / totalBoxes) * 100 : 0;

      // Determine suspicion level and recommended action
      let suspicionLevel: 'low' | 'medium' | 'high' = 'low';
      let recommendedAction: 'monitor' | 'warn' | 'investigate' | 'terminate' = 'monitor';

      if (externalBoxPercentage > 50 || flaggedSessions.length > 3) {
        suspicionLevel = 'high';
        recommendedAction = externalBoxPercentage > 75 ? 'terminate' : 'investigate';
      } else if (externalBoxPercentage > 25 || flaggedSessions.length > 1) {
        suspicionLevel = 'medium';
        recommendedAction = 'warn';
      }

      return {
        userId,
        userName,
        totalSessions: userSessions.length,
        avgPlantToBoxRatio,
        externalBoxPercentage,
        farmProfitContribution: Math.max(0, totalBoxes * this.BOX_VALUE * 0.5 - totalFarmLoss),
        totalExternalBoxes: totalBoxesExternal,
        totalFarmLoss,
        suspicionLevel,
        recommendedAction,
        lastActivity,
        flaggedSessions
      };
    } catch (error) {
      console.error('Error calculating user risk metrics:', error);
      return this.createEmptyMetrics(userId, userName);
    }
  }

  /**
   * Create detailed timeline with suspicious gap detection
   */
  public createDetailedTimeline(session: SupplyChainSession): DetailedTimeline {
    const events: DetailedTimelineEvent[] = [];

    // Convert all transactions to timeline events
    session.transactions.forEach(transaction => {
      let eventType: DetailedTimelineEvent['type'];
      let details: string;
      let suspiciousFlag = false;

      switch (transaction.type) {
        case 'PLANTS_WITHDRAWN':
          eventType = 'plants_withdrawn';
          details = `${transaction.quantity} ${transaction.itemName} retiradas`;
          break;
        case 'BOXES_CREATED':
          eventType = 'boxes_created';
          details = `${transaction.quantity} ${transaction.itemName} criadas`;
          break;
        case 'BOXES_WITHDRAWN':
          eventType = 'boxes_withdrawn';
          details = `${transaction.quantity} ${transaction.itemName} em posse`;
          // Check if this is suspicious (no recent plant activity)
          suspiciousFlag = this.isBoxWithdrawalSuspicious(transaction, session.transactions);
          break;
        case 'FERROVIA_MISSION_COMPLETED':
          eventType = 'mission_completed';
          details = `Missão completada (${transaction.quantity || 'N/A'} caixas)`;
          break;
        case 'REVENUE_COLLECTED':
          eventType = 'revenue_collected';
          details = `Receita coletada: $${transaction.amount?.toFixed(2) || '0.00'}`;
          break;
        case 'BOXES_RETURNED':
          eventType = 'boxes_returned';
          details = `${transaction.quantity} ${transaction.itemName} devolvidas`;
          break;
        default:
          return; // Skip unknown transaction types
      }

      events.push({
        timestamp: transaction.timestamp,
        type: eventType,
        details,
        quantity: transaction.quantity,
        amount: transaction.amount,
        suspiciousFlag,
        source: transaction.source || 'unknown'
      });
    });

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Detect suspicious gaps
    const suspiciousGaps = this.detectTimelineGaps(session);

    return {
      sessionId: session.sessionId,
      events,
      suspiciousGaps
    };
  }

  /**
   * Detect suspicious timeline gaps
   */
  private detectTimelineGaps(session: SupplyChainSession): Array<{ gapStart: Date; gapEnd: Date; gapHours: number; suspicionReason: string }> {
    const gaps: Array<{ gapStart: Date; gapEnd: Date; gapHours: number; suspicionReason: string }> = [];
    const transactions = session.transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < transactions.length - 1; i++) {
      const current = transactions[i];
      const next = transactions[i + 1];

      const hoursDiff = (next.timestamp.getTime() - current.timestamp.getTime()) / (1000 * 60 * 60);

      // Flag gaps larger than 8 hours between plant withdrawal and box activities
      if (current.type === 'PLANTS_WITHDRAWN' &&
          (next.type === 'BOXES_WITHDRAWN' || next.type === 'FERROVIA_MISSION_COMPLETED') &&
          hoursDiff > 8) {
        gaps.push({
          gapStart: current.timestamp,
          gapEnd: next.timestamp,
          gapHours: hoursDiff,
          suspicionReason: `Large gap between plant withdrawal and box usage (${hoursDiff.toFixed(1)}h)`
        });
      }

      // Flag boxes appearing without recent plant activity
      if (next.type === 'BOXES_WITHDRAWN' &&
          !this.hasRecentPlantActivity(next.timestamp, transactions, 6)) {
        gaps.push({
          gapStart: new Date(next.timestamp.getTime() - 6 * 60 * 60 * 1000), // 6 hours before
          gapEnd: next.timestamp,
          gapHours: 6,
          suspicionReason: `Boxes appeared without recent plant activity (6h window)`
        });
      }
    }

    return gaps;
  }

  /**
   * Check if a box withdrawal is suspicious based on timing
   */
  private isBoxWithdrawalSuspicious(boxTransaction: SupplyChainTransaction, allTransactions: SupplyChainTransaction[]): boolean {
    // Check if there was recent plant activity within 6 hours
    return !this.hasRecentPlantActivity(boxTransaction.timestamp, allTransactions, 6);
  }

  /**
   * Check if there was recent plant activity before a given timestamp
   */
  private hasRecentPlantActivity(timestamp: Date, transactions: SupplyChainTransaction[], hoursWindow: number): boolean {
    const windowStart = new Date(timestamp.getTime() - hoursWindow * 60 * 60 * 1000);

    return transactions.some(t =>
      t.type === 'PLANTS_WITHDRAWN' &&
      t.timestamp >= windowStart &&
      t.timestamp <= timestamp
    );
  }

  /**
   * Create empty metrics for users with no data
   */
  private createEmptyMetrics(userId: string, userName: string): UserPerformanceMetrics {
    return {
      userId,
      userName,
      totalSessions: 0,
      avgPlantToBoxRatio: 0,
      externalBoxPercentage: 0,
      farmProfitContribution: 0,
      totalExternalBoxes: 0,
      totalFarmLoss: 0,
      suspicionLevel: 'low',
      recommendedAction: 'monitor',
      lastActivity: new Date(0),
      flaggedSessions: []
    };
  }
}