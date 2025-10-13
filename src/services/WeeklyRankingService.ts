import fs from 'fs';
import path from 'path';
import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { MessageManagerService } from './MessageManagerService';

interface WorkerWeeklyStats {
  workerId: string;
  workerName: string;
  plants: {
    thisWeek: number;
    allTime: number;
  };
  animals: {
    thisWeek: number;
    allTime: number;
  };
  ferrovia: {
    thisWeek: number;
    allTime: number;
  };
  lastActivity: string;
}

interface WeeklyRankings {
  weekStart: string; // ISO date string
  weekEnd: string;   // ISO date string
  weekNumber: number;
  year: number;
  plantRankings: WorkerWeeklyStats[];
  animalRankings: WorkerWeeklyStats[];
  ferroviaRankings: WorkerWeeklyStats[];
  lastUpdated: string;
}

interface PrizeStructure {
  category: 'plants' | 'animals' | 'ferrovia';
  prizes: {
    first: number;   // 2500
    second: number;  // 1500
    third: number;   // 1000
  };
}

interface WeeklyPrizeRecord {
  weekStart: string;
  category: string;
  winners: {
    first: { workerId: string; workerName: string; count: number; prize: number };
    second: { workerId: string; workerName: string; count: number; prize: number };
    third: { workerId: string; workerName: string; count: number; prize: number };
  };
  totalPaid: number;
  paidAt: string | null;
}

export class WeeklyRankingService {
  private static instance: WeeklyRankingService;
  private dataDir: string;
  private resetTimer?: NodeJS.Timeout;
  private updateTimer?: NodeJS.Timeout;
  private client: Client | null = null;
  private messageManager: MessageManagerService | null = null;
  private targetChannelId = '1419987899759464508';

  private prizeStructure: PrizeStructure = {
    category: 'plants',
    prizes: {
      first: 2500,
      second: 1500,
      third: 1000
    }
  };

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.ensureDirectories();
  }

  /**
   * Get path for server-specific weekly rankings directory
   */
  private getWeeklyDir(serverId?: string): string {
    if (serverId) {
      const serverPath = path.join(this.dataDir, 'weekly-rankings', serverId);
      if (fs.existsSync(serverPath)) {
        return serverPath;
      }
    }
    // Fallback to legacy path
    return path.join(this.dataDir, 'weekly-rankings');
  }

  /**
   * Get path for server-specific weekly prizes directory
   */
  private getPrizesDir(serverId?: string): string {
    if (serverId) {
      const serverPath = path.join(this.dataDir, 'weekly-prizes', serverId);
      if (fs.existsSync(serverPath)) {
        return serverPath;
      }
    }
    // Fallback to legacy path
    return path.join(this.dataDir, 'weekly-prizes');
  }

  /**
   * Get path for server-specific totals file
   */
  private getTotalsFile(serverId?: string): string {
    if (serverId) {
      const serverPath = path.join(this.dataDir, 'ranking-totals', `${serverId}.json`);
      if (fs.existsSync(path.dirname(serverPath))) {
        return serverPath;
      }
    }
    // Fallback to legacy path
    return path.join(this.dataDir, 'ranking-totals.json');
  }

  public static getInstance(): WeeklyRankingService {
    if (!WeeklyRankingService.instance) {
      WeeklyRankingService.instance = new WeeklyRankingService();
    }
    return WeeklyRankingService.instance;
  }

  public initialize(client: Client): void {
    this.client = client;
    this.messageManager = new MessageManagerService(client);
    this.startScheduledTasks();
    console.log('🏆 WeeklyRankingService initialized');
  }

  private ensureDirectories(): void {
    // Ensure legacy directories exist
    const legacyWeeklyDir = path.join(this.dataDir, 'weekly-rankings');
    const legacyPrizesDir = path.join(this.dataDir, 'weekly-prizes');
    const legacyTotalsFile = path.join(this.dataDir, 'ranking-totals.json');

    [legacyWeeklyDir, legacyPrizesDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Initialize legacy totals file if it doesn't exist
    if (!fs.existsSync(legacyTotalsFile)) {
      fs.writeFileSync(legacyTotalsFile, JSON.stringify({}));
    }

    // Ensure server-specific directories exist (will be created on first use)
    const rankingTotalsDir = path.join(this.dataDir, 'ranking-totals');
    if (!fs.existsSync(rankingTotalsDir)) {
      fs.mkdirSync(rankingTotalsDir, { recursive: true });
    }
  }

  /**
   * Get current week boundaries (Sunday 00:00 - Saturday 23:59)
   * Using Brazilian timezone (America/Sao_Paulo)
   */
  public getCurrentWeekBoundaries(): { start: Date; end: Date; weekNumber: number; year: number } {
    const now = new Date();

    // Convert to Brazilian timezone
    const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

    // Find the most recent Sunday (start of week)
    const dayOfWeek = brazilTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = dayOfWeek; // If it's Sunday (0), subtract 0 days

    const weekStart = new Date(brazilTime);
    weekStart.setDate(brazilTime.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Calculate week number
    const startOfYear = new Date(weekStart.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((weekStart.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

    return {
      start: weekStart,
      end: weekEnd,
      weekNumber,
      year: weekStart.getFullYear()
    };
  }

  /**
   * Get time until next Sunday reset
   */
  public getTimeUntilReset(): { days: number; hours: number; minutes: number; seconds: number } {
    const { end } = this.getCurrentWeekBoundaries();
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  }

  /**
   * Get current week's filename
   */
  private getCurrentWeekFilename(serverId?: string): string {
    const { start } = this.getCurrentWeekBoundaries();
    const dateStr = start.toISOString().split('T')[0]; // YYYY-MM-DD
    const weeklyDir = this.getWeeklyDir(serverId);
    return path.join(weeklyDir, `week-${dateStr}.json`);
  }

  /**
   * Load current week's rankings - CALCULATES FROM ARCHIVED SESSIONS BY DATE RANGE
   */
  public getCurrentWeekRankings(serverId?: string): WeeklyRankings {
    const filename = this.getCurrentWeekFilename(serverId);
    const { start, end, weekNumber, year } = this.getCurrentWeekBoundaries();

    if (fs.existsSync(filename)) {
      try {
        const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
        return data;
      } catch (error) {
        console.warn('⚠️ Failed to load weekly rankings, creating new:', error);
      }
    }

    // Create new week file by calculating from archived sessions within date range
    const weekStartTime = start.getTime();
    const weekEndTime = end.getTime();

    const newWeekData: WeeklyRankings = {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      weekNumber,
      year,
      plantRankings: [],
      animalRankings: [],
      ferroviaRankings: [],
      lastUpdated: new Date().toISOString()
    };

    // Calculate thisWeek stats by reading ALL sessions (active + archived) and filtering by timestamp
    const allTimeTotals = this.getAllTimeTotals(serverId);
    const thisWeekStats: Record<string, { plants: number; animals: number; ferrovia: number; workerName: string }> = {};

    // Helper function to process a session
    const processSession = (sessionData: any) => {
      const workerId = sessionData.workerId;
      const workerName = sessionData.workerName;

      if (!workerId) return;

      if (!thisWeekStats[workerId]) {
        thisWeekStats[workerId] = { plants: 0, animals: 0, ferrovia: 0, workerName: workerName || 'Unknown' };
      }

      // Count plant deposits within this week's date range
      if (sessionData.plantTransactions && Array.isArray(sessionData.plantTransactions)) {
        sessionData.plantTransactions
          .filter((tx: any) => tx.type === 'plant_deposited')
          .forEach((tx: any) => {
            const txTime = new Date(tx.timestamp).getTime();
            if (txTime >= weekStartTime && txTime <= weekEndTime) {
              thisWeekStats[workerId].plants += tx.quantity || 0;
            }
          });
      }

      // Count animal deliveries within this week's date range
      if (sessionData.animalTransactions && Array.isArray(sessionData.animalTransactions)) {
        sessionData.animalTransactions
          .filter((tx: any) => tx.type === 'delivery_completed')
          .forEach((tx: any) => {
            const txTime = new Date(tx.timestamp).getTime();
            if (txTime >= weekStartTime && txTime <= weekEndTime) {
              thisWeekStats[workerId].animals += tx.quantity || 0;
            }
          });
      }

      // Count ferrovia missions (if we have mission completion tracking)
      // For now, we'll check supply-chain active sessions separately
    };

    // Scan for server directories
    const serverDirsToCheck: string[] = [];
    const workerSessionsDir = path.join(this.dataDir, 'worker-sessions');

    if (serverId) {
      // If serverId provided, only check that server
      serverDirsToCheck.push(serverId);
    } else {
      // If no serverId, scan all server directories
      if (fs.existsSync(workerSessionsDir)) {
        const entries = fs.readdirSync(workerSessionsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.match(/^\d+$/)) {
            serverDirsToCheck.push(entry.name);
          }
        }
      }
      serverDirsToCheck.push(''); // Add legacy path
    }

    // 1. Read ACTIVE sessions from worker-sessions/{serverId}/active-sessions.json
    for (const serverDir of serverDirsToCheck) {
      const activeSessionsFile = serverDir
        ? path.join(workerSessionsDir, serverDir, 'active-sessions.json')
        : path.join(workerSessionsDir, 'active-sessions.json');

      if (fs.existsSync(activeSessionsFile)) {
        try {
          const activeSessions = JSON.parse(fs.readFileSync(activeSessionsFile, 'utf8'));
          if (Array.isArray(activeSessions)) {
            activeSessions.forEach(session => processSession(session));
          } else if (typeof activeSessions === 'object') {
            Object.values(activeSessions).forEach(session => processSession(session));
          }
          console.log(`📊 Processed active worker sessions for ${serverDir || 'legacy'}`);
        } catch (err) {
          console.warn(`⚠️ Failed to read active sessions for ${serverDir || 'legacy'}:`, err);
        }
      }

      // 2. Read ARCHIVED session files
      const archivedDir = serverDir
        ? path.join(workerSessionsDir, serverDir, 'archived')
        : path.join(workerSessionsDir, 'archived');

      if (fs.existsSync(archivedDir)) {
        const sessionFiles = fs.readdirSync(archivedDir).filter(file => file.endsWith('.json'));
        for (const file of sessionFiles) {
          try {
            const sessionPath = path.join(archivedDir, file);
            const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            processSession(sessionData);
          } catch (err) {
            console.warn(`⚠️ Failed to parse archived session ${file}:`, err);
          }
        }
        console.log(`📊 Processed ${sessionFiles.length} archived sessions for ${serverDir || 'legacy'}`);
      }
    }

    // 3. Read FERROVIA active sessions from supply-chain/{serverId}/active-sessions.json
    const supplyChainDir = path.join(this.dataDir, 'supply-chain');
    for (const serverDir of serverDirsToCheck) {
      const ferroviaSessionsFile = serverDir
        ? path.join(supplyChainDir, serverDir, 'active-sessions.json')
        : path.join(supplyChainDir, 'active-sessions.json');

      if (fs.existsSync(ferroviaSessionsFile)) {
        try {
          const ferroviaSessions = JSON.parse(fs.readFileSync(ferroviaSessionsFile, 'utf8'));
          if (Array.isArray(ferroviaSessions)) {
            ferroviaSessions.forEach((session: any) => {
              const workerId = session.workerId;
              if (!workerId) return;

              if (!thisWeekStats[workerId]) {
                thisWeekStats[workerId] = { plants: 0, animals: 0, ferrovia: 0, workerName: session.workerName || 'Unknown' };
              }

              // Count completed missions within date range
              if (session.missions && Array.isArray(session.missions)) {
                session.missions.forEach((mission: any) => {
                  if (mission.status === 'completed' && mission.completedAt) {
                    const missionTime = new Date(mission.completedAt).getTime();
                    if (missionTime >= weekStartTime && missionTime <= weekEndTime) {
                      thisWeekStats[workerId].ferrovia += 1;
                    }
                  }
                });
              }
            });
          } else if (typeof ferroviaSessions === 'object') {
            Object.values(ferroviaSessions).forEach((session: any) => {
              const workerId = session.workerId;
              if (!workerId) return;

              if (!thisWeekStats[workerId]) {
                thisWeekStats[workerId] = { plants: 0, animals: 0, ferrovia: 0, workerName: session.workerName || 'Unknown' };
              }

              // Count completed missions
              if (session.missions && Array.isArray(session.missions)) {
                session.missions.forEach((mission: any) => {
                  if (mission.status === 'completed' && mission.completedAt) {
                    const missionTime = new Date(mission.completedAt).getTime();
                    if (missionTime >= weekStartTime && missionTime <= weekEndTime) {
                      thisWeekStats[workerId].ferrovia += 1;
                    }
                  }
                });
              }
            });
          }
          console.log(`📊 Processed ferrovia sessions for ${serverDir || 'legacy'}`);
        } catch (err) {
          console.warn(`⚠️ Failed to read ferrovia sessions for ${serverDir || 'legacy'}:`, err);
        }
      }
    }

    // Build rankings from calculated thisWeek stats
    for (const workerId in thisWeekStats) {
      const stats = thisWeekStats[workerId];
      const allTimeData = allTimeTotals[workerId];

      // Use all-time data if available, otherwise create from thisWeek stats
      const workerData: WorkerWeeklyStats = {
        workerId,
        workerName: stats.workerName,
        plants: {
          thisWeek: stats.plants,
          allTime: allTimeData ? allTimeData.plants.allTime : stats.plants
        },
        animals: {
          thisWeek: stats.animals,
          allTime: allTimeData ? allTimeData.animals.allTime : stats.animals
        },
        ferrovia: {
          thisWeek: stats.ferrovia,
          allTime: allTimeData ? allTimeData.ferrovia.allTime : stats.ferrovia
        },
        lastActivity: allTimeData ? allTimeData.lastActivity : new Date().toISOString()
      };

      // Add to rankings arrays if they have activity this week
      if (stats.plants > 0) newWeekData.plantRankings.push({ ...workerData });
      if (stats.animals > 0) newWeekData.animalRankings.push({ ...workerData });
      if (stats.ferrovia > 0) newWeekData.ferroviaRankings.push({ ...workerData });
    }

    // Sort the rankings
    this.sortRankings(newWeekData);

    fs.writeFileSync(filename, JSON.stringify(newWeekData, null, 2));
    console.log(`📊 Created new week file with ${newWeekData.plantRankings.length} plant workers, ${newWeekData.animalRankings.length} animal workers`);
    return newWeekData;
  }

  /**
   * Load all-time totals
   */
  private getAllTimeTotals(serverId?: string): Record<string, WorkerWeeklyStats> {
    try {
      const totalsFile = this.getTotalsFile(serverId);
      const data = fs.readFileSync(totalsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  /**
   * Save all-time totals
   */
  private saveAllTimeTotals(totals: Record<string, WorkerWeeklyStats>, serverId?: string): void {
    const totalsFile = this.getTotalsFile(serverId);

    // Ensure directory exists
    const totalsDir = path.dirname(totalsFile);
    if (!fs.existsSync(totalsDir)) {
      fs.mkdirSync(totalsDir, { recursive: true });
    }

    fs.writeFileSync(totalsFile, JSON.stringify(totals, null, 2));
  }

  /**
   * Update worker statistics
   */
  public updateWorkerStats(
    workerId: string,
    workerName: string,
    type: 'plants' | 'animals' | 'ferrovia',
    count: number,
    serverId?: string
  ): void {
    // Update weekly rankings
    const weeklyData = this.getCurrentWeekRankings(serverId);
    const allTimeTotals = this.getAllTimeTotals(serverId);

    // Initialize worker if not exists
    if (!allTimeTotals[workerId]) {
      allTimeTotals[workerId] = {
        workerId,
        workerName,
        plants: { thisWeek: 0, allTime: 0 },
        animals: { thisWeek: 0, allTime: 0 },
        ferrovia: { thisWeek: 0, allTime: 0 },
        lastActivity: new Date().toISOString()
      };
    }

    // Update all-time totals
    allTimeTotals[workerId][type].allTime += count;
    allTimeTotals[workerId][type].thisWeek += count; // CRITICAL: Also update thisWeek counter
    allTimeTotals[workerId].lastActivity = new Date().toISOString();
    allTimeTotals[workerId].workerName = workerName; // Update name in case it changed

    // Update weekly stats
    let weeklyWorker = this.findOrCreateWeeklyWorker(weeklyData, workerId, workerName, allTimeTotals[workerId]);
    weeklyWorker[type].thisWeek += count;
    weeklyWorker[type].allTime = allTimeTotals[workerId][type].allTime;
    weeklyWorker.lastActivity = new Date().toISOString();

    // Sort rankings
    this.sortRankings(weeklyData);

    // Save data
    weeklyData.lastUpdated = new Date().toISOString();
    const filename = this.getCurrentWeekFilename(serverId);

    // Ensure directory exists
    const weeklyDir = path.dirname(filename);
    if (!fs.existsSync(weeklyDir)) {
      fs.mkdirSync(weeklyDir, { recursive: true });
    }

    fs.writeFileSync(filename, JSON.stringify(weeklyData, null, 2));
    this.saveAllTimeTotals(allTimeTotals, serverId);

    // Trigger Discord update
    this.scheduleDiscordUpdate();

    console.log(`📊 Updated ${workerName}: +${count} ${type} (weekly: ${weeklyWorker[type].thisWeek}, total: ${weeklyWorker[type].allTime}) [${serverId || 'legacy'}]`);
  }

  private findOrCreateWeeklyWorker(
    weeklyData: WeeklyRankings,
    workerId: string,
    workerName: string,
    allTimeStats: WorkerWeeklyStats
  ): WorkerWeeklyStats {
    // Check all ranking arrays
    const arrays = [weeklyData.plantRankings, weeklyData.animalRankings, weeklyData.ferroviaRankings];

    for (const array of arrays) {
      const existing = array.find(w => w.workerId === workerId);
      if (existing) {
        // Update name and all-time stats
        existing.workerName = workerName;
        existing.plants.allTime = allTimeStats.plants.allTime;
        existing.animals.allTime = allTimeStats.animals.allTime;
        existing.ferrovia.allTime = allTimeStats.ferrovia.allTime;
        return existing;
      }
    }

    // Create new worker entry
    const newWorker: WorkerWeeklyStats = {
      workerId,
      workerName,
      plants: { thisWeek: 0, allTime: allTimeStats.plants.allTime },
      animals: { thisWeek: 0, allTime: allTimeStats.animals.allTime },
      ferrovia: { thisWeek: 0, allTime: allTimeStats.ferrovia.allTime },
      lastActivity: new Date().toISOString()
    };

    // Add to all arrays
    weeklyData.plantRankings.push(newWorker);
    weeklyData.animalRankings.push(newWorker);
    weeklyData.ferroviaRankings.push(newWorker);

    return newWorker;
  }

  private sortRankings(weeklyData: WeeklyRankings): void {
    // Filter and sort plant rankings (only workers with plant activity this week)
    weeklyData.plantRankings = weeklyData.plantRankings
      .filter(worker => worker.plants.thisWeek > 0)
      .sort((a, b) => b.plants.thisWeek - a.plants.thisWeek);

    // Filter and sort animal rankings (only workers with animal activity this week)
    weeklyData.animalRankings = weeklyData.animalRankings
      .filter(worker => worker.animals.thisWeek > 0)
      .sort((a, b) => b.animals.thisWeek - a.animals.thisWeek);

    // Filter and sort ferrovia rankings (only workers with ferrovia activity this week)
    weeklyData.ferroviaRankings = weeklyData.ferroviaRankings
      .filter(worker => worker.ferrovia.thisWeek > 0)
      .sort((a, b) => b.ferrovia.thisWeek - a.ferrovia.thisWeek);
  }

  /**
   * Reset weekly rankings (called every Sunday)
   */
  public resetWeeklyRankings(serverId?: string): WeeklyPrizeRecord | null {
    console.log(`🔄 Resetting weekly rankings for ${serverId || 'legacy'}...`);

    const currentWeek = this.getCurrentWeekRankings(serverId);
    let prizeRecord: WeeklyPrizeRecord | null = null;

    // Calculate and save prize records before reset
    if (currentWeek.plantRankings.length > 0) {
      prizeRecord = this.calculateWeeklyPrizes(currentWeek);
      if (prizeRecord) {
        const prizesDir = this.getPrizesDir(serverId);

        // Ensure directory exists
        if (!fs.existsSync(prizesDir)) {
          fs.mkdirSync(prizesDir, { recursive: true });
        }

        const prizeFile = path.join(prizesDir, `prize-${currentWeek.weekStart.split('T')[0]}.json`);
        fs.writeFileSync(prizeFile, JSON.stringify(prizeRecord, null, 2));
      }
    }

    // Archive current week
    const weeklyDir = this.getWeeklyDir(serverId);

    // Ensure directory exists
    if (!fs.existsSync(weeklyDir)) {
      fs.mkdirSync(weeklyDir, { recursive: true });
    }

    const archiveFile = path.join(weeklyDir, `archive-week-${currentWeek.weekStart.split('T')[0]}.json`);
    fs.writeFileSync(archiveFile, JSON.stringify(currentWeek, null, 2));

    // Remove current week file to force creation of new week
    const currentFile = this.getCurrentWeekFilename(serverId);
    if (fs.existsSync(currentFile)) {
      fs.unlinkSync(currentFile);
    }

    // CRITICAL: Reset all "thisWeek" counters to 0 in ranking-totals
    const allTimeTotals = this.getAllTimeTotals(serverId);
    for (const workerId in allTimeTotals) {
      allTimeTotals[workerId].plants.thisWeek = 0;
      allTimeTotals[workerId].animals.thisWeek = 0;
      allTimeTotals[workerId].ferrovia.thisWeek = 0;
    }
    this.saveAllTimeTotals(allTimeTotals, serverId);
    console.log(`🔄 Reset thisWeek counters to 0 for all workers [${serverId || 'legacy'}]`);

    // Trigger Discord update with new week
    this.scheduleDiscordUpdate();

    console.log(`✅ Weekly rankings reset completed for ${serverId || 'legacy'}`);
    return prizeRecord;
  }

  private calculateWeeklyPrizes(weeklyData: WeeklyRankings): WeeklyPrizeRecord | null {
    const plantTop3 = weeklyData.plantRankings.slice(0, 3);

    if (plantTop3.length < 3) {
      console.log('⚠️ Not enough participants for prizes (need at least 3)');
      return null;
    }

    return {
      weekStart: weeklyData.weekStart,
      category: 'plants',
      winners: {
        first: {
          workerId: plantTop3[0].workerId,
          workerName: plantTop3[0].workerName,
          count: plantTop3[0].plants.thisWeek,
          prize: this.prizeStructure.prizes.first
        },
        second: {
          workerId: plantTop3[1].workerId,
          workerName: plantTop3[1].workerName,
          count: plantTop3[1].plants.thisWeek,
          prize: this.prizeStructure.prizes.second
        },
        third: {
          workerId: plantTop3[2].workerId,
          workerName: plantTop3[2].workerName,
          count: plantTop3[2].plants.thisWeek,
          prize: this.prizeStructure.prizes.third
        }
      },
      totalPaid: this.prizeStructure.prizes.first + this.prizeStructure.prizes.second + this.prizeStructure.prizes.third,
      paidAt: null
    };
  }

  private startScheduledTasks(): void {
    // Clear any existing timers
    if (this.resetTimer) clearInterval(this.resetTimer);
    if (this.updateTimer) clearInterval(this.updateTimer);

    // Schedule Sunday resets - check every hour
    this.resetTimer = setInterval(() => {
      this.checkForWeeklyReset();
    }, 60 * 60 * 1000); // Every hour

    // Schedule Discord updates - every 5 minutes when needed
    this.updateTimer = setInterval(() => {
      this.updateDiscordRankings();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Initial Discord update
    setTimeout(() => this.updateDiscordRankings(), 5000); // 5 seconds after start

    console.log('⏰ Weekly ranking scheduler started');
  }

  private checkForWeeklyReset(): void {
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

    // Check if it's Sunday between 00:00 and 01:00
    if (brazilTime.getDay() === 0 && brazilTime.getHours() === 0) {
      const lastResetFile = path.join(this.dataDir, 'last-weekly-reset.txt');
      const today = brazilTime.toISOString().split('T')[0];

      let lastReset = '';
      if (fs.existsSync(lastResetFile)) {
        lastReset = fs.readFileSync(lastResetFile, 'utf8').trim();
      }

      if (lastReset !== today) {
        const prizeRecord = this.resetWeeklyRankings();
        fs.writeFileSync(lastResetFile, today);

        if (prizeRecord) {
          this.announceWeeklyPrizes(prizeRecord);
        }
      }
    }
  }

  private discordUpdateScheduled = false;

  private scheduleDiscordUpdate(): void {
    if (this.discordUpdateScheduled) return;

    this.discordUpdateScheduled = true;
    setTimeout(() => {
      this.updateDiscordRankings();
      this.discordUpdateScheduled = false;
    }, 2000); // 2 second delay to batch updates
  }

  private async updateDiscordRankings(): Promise<void> {
    if (!this.client || !this.messageManager) return;

    try {
      const weeklyData = this.getCurrentWeekRankings();
      const timeUntilReset = this.getTimeUntilReset();
      const embed = this.createRankingEmbed(weeklyData, timeUntilReset);

      // Send message directly to channel instead of using MessageManager
      const channel = await this.client.channels.fetch(this.targetChannelId) as TextChannel;
      if (!channel) {
        throw new Error(`Target channel ${this.targetChannelId} not found`);
      }

      // Try to find and update existing ranking message
      if (!this.client.user) {
        throw new Error('Bot user not available');
      }

      const messages = await channel.messages.fetch({ limit: 10 });
      const botUserId = this.client.user.id;
      const existingMessage = messages.find(msg =>
        msg.author.id === botUserId &&
        msg.embeds.some(e => e.title?.includes('RANCHO CABRAS DA PESTE'))
      );

      if (existingMessage) {
        await existingMessage.edit({ embeds: [embed] });
      } else {
        await channel.send({ embeds: [embed] });
      }

      console.log('📢 Discord rankings updated');
    } catch (error) {
      console.error('❌ Failed to update Discord rankings:', error);
    }
  }

  private createRankingEmbed(
    weeklyData: WeeklyRankings,
    timeUntilReset: { days: number; hours: number; minutes: number; seconds: number }
  ): EmbedBuilder {
    const weekStart = new Date(weeklyData.weekStart);
    const weekEnd = new Date(weeklyData.weekEnd);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const embed = new EmbedBuilder()
      .setTitle('✨🐐  RANCHO CABRAS DA PESTE  🐐✨')
      .setDescription(`📅 **Semana:** ${formatDate(weekStart)} - ${formatDate(weekEnd)} de ${weekEnd.getFullYear()}`)
      .setColor(0xFFD700)
      .setTimestamp();

    // Plant rankings
    const plantTop3 = weeklyData.plantRankings.slice(0, 3);
    if (plantTop3.length > 0) {
      const plantText = plantTop3.map((worker, index) => {
        const emoji = ['🥇', '🥈', '🥉'][index];
        const thisWeek = worker.plants.thisWeek.toLocaleString('pt-BR');
        const allTime = worker.plants.allTime.toLocaleString('pt-BR');
        return `${emoji} ${worker.workerName} • ${thisWeek} plantas esta semana • ${allTime} total`;
      }).join('\n');

      embed.addFields({
        name: '🌱 **TOP PLANTAÇÃO**',
        value: plantText,
        inline: false
      });
    }

    // Animal rankings
    const animalTop3 = weeklyData.animalRankings.slice(0, 3).filter(w => w.animals.thisWeek > 0);
    if (animalTop3.length > 0) {
      const animalText = animalTop3.map((worker, index) => {
        const emoji = ['🥇', '🥈', '🥉'][index];
        const thisWeek = worker.animals.thisWeek.toLocaleString('pt-BR');
        const allTime = worker.animals.allTime.toLocaleString('pt-BR');
        return `${emoji} ${worker.workerName} • ${thisWeek} animais esta semana • ${allTime} total`;
      }).join('\n');

      embed.addFields({
        name: '🐄 **TOP ANIMAIS**',
        value: animalText,
        inline: false
      });
    }

    // Ferrovia rankings
    const ferroviaTop3 = weeklyData.ferroviaRankings.slice(0, 3).filter(w => w.ferrovia.thisWeek > 0);
    if (ferroviaTop3.length > 0) {
      const ferroviaText = ferroviaTop3.map((worker, index) => {
        const emoji = ['🥇', '🥈', '🥉'][index];
        const thisWeek = worker.ferrovia.thisWeek.toLocaleString('pt-BR');
        const allTime = worker.ferrovia.allTime.toLocaleString('pt-BR');
        return `${emoji} ${worker.workerName} • ${thisWeek} missões esta semana • ${allTime} total`;
      }).join('\n');

      embed.addFields({
        name: '🚂 **TOP FERROVIA**',
        value: ferroviaText,
        inline: false
      });
    }

    // Prize information
    embed.addFields({
      name: '💰 **PREMIAÇÃO SEMANAL**',
      value: `🏆 **TOP 3 PLANTAÇÃO:** R$ ${this.prizeStructure.prizes.first.toLocaleString('pt-BR')} | R$ ${this.prizeStructure.prizes.second.toLocaleString('pt-BR')} | R$ ${this.prizeStructure.prizes.third.toLocaleString('pt-BR')}`,
      inline: false
    });

    // Countdown
    const { days, hours, minutes } = timeUntilReset;
    embed.addFields({
      name: '⏰ **PRÓXIMO RESET**',
      value: `${days}d ${hours}h ${minutes}m`,
      inline: true
    });

    embed.setFooter({
      text: `Última atualização: ${new Date().toLocaleString('pt-BR')} | Sistema de Rankings Semanal`
    });

    return embed;
  }

  private async announceWeeklyPrizes(prizeRecord: WeeklyPrizeRecord): Promise<void> {
    if (!this.client) return;

    try {
      const channel = await this.client.channels.fetch(this.targetChannelId) as TextChannel;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle('🎉 PREMIAÇÃO SEMANAL - RANCHO CABRAS DA PESTE')
        .setDescription('**Parabéns aos vencedores desta semana!**')
        .setColor(0x00FF00)
        .addFields(
          {
            name: '🥇 **PRIMEIRO LUGAR**',
            value: `${prizeRecord.winners.first.workerName}\n${prizeRecord.winners.first.count.toLocaleString('pt-BR')} plantas\n💰 **R$ ${prizeRecord.winners.first.prize.toLocaleString('pt-BR')}**`,
            inline: true
          },
          {
            name: '🥈 **SEGUNDO LUGAR**',
            value: `${prizeRecord.winners.second.workerName}\n${prizeRecord.winners.second.count.toLocaleString('pt-BR')} plantas\n💰 **R$ ${prizeRecord.winners.second.prize.toLocaleString('pt-BR')}**`,
            inline: true
          },
          {
            name: '🥉 **TERCEIRO LUGAR**',
            value: `${prizeRecord.winners.third.workerName}\n${prizeRecord.winners.third.count.toLocaleString('pt-BR')} plantas\n💰 **R$ ${prizeRecord.winners.third.prize.toLocaleString('pt-BR')}**`,
            inline: true
          }
        )
        .addFields({
          name: '💎 **TOTAL DISTRIBUÍDO**',
          value: `R$ ${prizeRecord.totalPaid.toLocaleString('pt-BR')}`,
          inline: false
        })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      console.log('🏆 Weekly prizes announced');
    } catch (error) {
      console.error('❌ Failed to announce weekly prizes:', error);
    }
  }

  /**
   * Public API methods
   */
  public getWeeklyRankings(serverId?: string): WeeklyRankings {
    return this.getCurrentWeekRankings(serverId);
  }

  public getAllTimeStats(serverId?: string): Record<string, WorkerWeeklyStats> {
    return this.getAllTimeTotals(serverId);
  }

  public getPrizeHistory(serverId?: string): WeeklyPrizeRecord[] {
    const prizesDir = this.getPrizesDir(serverId);

    if (!fs.existsSync(prizesDir)) {
      return [];
    }

    const prizeFiles = fs.readdirSync(prizesDir)
      .filter(file => file.startsWith('prize-') && file.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    return prizeFiles.map(file => {
      const data = fs.readFileSync(path.join(prizesDir, file), 'utf8');
      return JSON.parse(data);
    });
  }

  public stopScheduledTasks(): void {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
      this.resetTimer = undefined;
    }
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    console.log('⏹️ Weekly ranking scheduler stopped');
  }
}