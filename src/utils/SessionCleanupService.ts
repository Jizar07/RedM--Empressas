import fs from 'fs';
import path from 'path';

interface SessionCleanupConfig {
  maxActiveSessionAge: number; // in hours
  maxArchivedSessions: number; // max archived sessions per worker
  cleanupInterval: number; // in milliseconds
}

export class SessionCleanupService {
  private config: SessionCleanupConfig;
  private dataDir: string;
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.config = {
      maxActiveSessionAge: 48, // 48 hours for active sessions
      maxArchivedSessions: 10, // Keep last 10 archived sessions per worker
      cleanupInterval: 3600000 // Run cleanup every hour
    };
    this.dataDir = path.join(process.cwd(), 'data', 'worker-sessions');
  }

  public startAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Run initial cleanup
    this.performCleanup();

    // Schedule periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);

    console.log('🔄 Session cleanup service started (runs every hour)');
  }

  public stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      console.log('⏹️ Session cleanup service stopped');
    }
  }

  private performCleanup(): void {
    console.log('🧹 Starting session cleanup...');

    // Clean stale active sessions
    this.cleanStaleActiveSessions();

    // Clean old archived sessions
    this.cleanOldArchivedSessions();

    // Optimize session files
    this.optimizeSessionFiles();

    console.log('✅ Session cleanup completed');
  }

  private cleanStaleActiveSessions(): void {
    try {
      const sessionsFile = path.join(this.dataDir, 'active-sessions.json');
      if (!fs.existsSync(sessionsFile)) return;

      const data = fs.readFileSync(sessionsFile, 'utf8');
      const sessions = JSON.parse(data);
      const now = Date.now();
      const maxAge = this.config.maxActiveSessionAge * 60 * 60 * 1000;

      let cleanedCount = 0;
      const cleanedSessions: any = {};

      Object.entries(sessions).forEach(([workerId, session]: [string, any]) => {
        const lastActivity = new Date(session.lastActivity).getTime();
        const age = now - lastActivity;

        // Remove placeholder entries
        if (workerId === 'placeholder_user_id' || session.channelId === 'placeholder_channel_id') {
          cleanedCount++;
          return;
        }

        // Remove stale active sessions (older than maxAge)
        if (age > maxAge && session.status === 'active') {
          console.log(`⏰ Removing stale session for ${session.workerName} (inactive for ${Math.round(age / 3600000)} hours)`);
          cleanedCount++;

          // Archive the stale session
          this.archiveStaleSession(session);
          return;
        }

        // Remove non-active sessions that shouldn't be in active file
        if (session.status !== 'active') {
          console.log(`🔄 Removing non-active session for ${session.workerName} (status: ${session.status})`);
          cleanedCount++;
          return;
        }

        // Keep valid active sessions
        cleanedSessions[workerId] = session;
      });

      if (cleanedCount > 0) {
        fs.writeFileSync(sessionsFile, JSON.stringify(cleanedSessions, null, 2));
        console.log(`🧹 Cleaned ${cleanedCount} stale/invalid sessions from active sessions`);
      }
    } catch (error) {
      console.error('❌ Error cleaning stale active sessions:', error);
    }
  }

  private cleanOldArchivedSessions(): void {
    try {
      const archiveDir = path.join(this.dataDir, 'archived');
      if (!fs.existsSync(archiveDir)) return;

      const files = fs.readdirSync(archiveDir);

      // Group archived sessions by worker
      const sessionsByWorker: { [workerId: string]: { file: string; timestamp: number }[] } = {};

      files.forEach(file => {
        if (!file.endsWith('.json')) return;

        const filePath = path.join(archiveDir, file);
        const stats = fs.statSync(filePath);

        try {
          const data = fs.readFileSync(filePath, 'utf8');
          const session = JSON.parse(data);

          if (!sessionsByWorker[session.workerId]) {
            sessionsByWorker[session.workerId] = [];
          }

          sessionsByWorker[session.workerId].push({
            file: file,
            timestamp: stats.mtime.getTime()
          });
        } catch (error) {
          console.warn(`⚠️ Could not read archived session ${file}:`, error);
        }
      });

      // Keep only the most recent N sessions per worker
      let deletedCount = 0;
      Object.entries(sessionsByWorker).forEach(([_, sessions]) => {
        if (sessions.length > this.config.maxArchivedSessions) {
          // Sort by timestamp (newest first)
          sessions.sort((a, b) => b.timestamp - a.timestamp);

          // Delete old sessions
          const toDelete = sessions.slice(this.config.maxArchivedSessions);
          toDelete.forEach(session => {
            const filePath = path.join(archiveDir, session.file);
            fs.unlinkSync(filePath);
            deletedCount++;
          });
        }
      });

      if (deletedCount > 0) {
        console.log(`🗑️ Deleted ${deletedCount} old archived sessions`);
      }
    } catch (error) {
      console.error('❌ Error cleaning old archived sessions:', error);
    }
  }

  private optimizeSessionFiles(): void {
    try {
      const sessionsFile = path.join(this.dataDir, 'active-sessions.json');
      if (!fs.existsSync(sessionsFile)) return;

      const stats = fs.statSync(sessionsFile);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB > 1) {
        console.warn(`⚠️ Active sessions file is large (${fileSizeInMB.toFixed(2)} MB), consider archiving old sessions`);
      }

      // Reformat the file for optimal reading/writing
      const data = fs.readFileSync(sessionsFile, 'utf8');
      const sessions = JSON.parse(data);

      // Compact the JSON (smaller file size)
      if (Object.keys(sessions).length > 50) {
        fs.writeFileSync(sessionsFile, JSON.stringify(sessions)); // No formatting for large files
        console.log('📦 Compacted active sessions file for better performance');
      } else {
        fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2)); // Pretty print for small files
      }
    } catch (error) {
      console.error('❌ Error optimizing session files:', error);
    }
  }

  private archiveStaleSession(session: any): void {
    try {
      const archiveDir = path.join(this.dataDir, 'archived');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      const archivedSession = {
        ...session,
        status: 'stale',
        completedAt: new Date(),
        notes: 'Auto-archived due to inactivity'
      };

      const archiveFile = path.join(archiveDir, `${session.sessionId}.json`);
      fs.writeFileSync(archiveFile, JSON.stringify(archivedSession, null, 2));
      console.log(`📁 Archived stale session: ${session.sessionId}`);
    } catch (error) {
      console.error('❌ Error archiving stale session:', error);
    }
  }

  public getCleanupStats(): { activeSessionsCount: number; archivedSessionsCount: number; totalSizeInMB: number } {
    try {
      const sessionsFile = path.join(this.dataDir, 'active-sessions.json');
      const archiveDir = path.join(this.dataDir, 'archived');

      let activeSessionsCount = 0;
      let archivedSessionsCount = 0;
      let totalSize = 0;

      if (fs.existsSync(sessionsFile)) {
        const data = fs.readFileSync(sessionsFile, 'utf8');
        const sessions = JSON.parse(data);
        activeSessionsCount = Object.keys(sessions).length;
        totalSize += fs.statSync(sessionsFile).size;
      }

      if (fs.existsSync(archiveDir)) {
        const files = fs.readdirSync(archiveDir);
        archivedSessionsCount = files.filter(f => f.endsWith('.json')).length;

        files.forEach(file => {
          if (file.endsWith('.json')) {
            const filePath = path.join(archiveDir, file);
            totalSize += fs.statSync(filePath).size;
          }
        });
      }

      return {
        activeSessionsCount,
        archivedSessionsCount,
        totalSizeInMB: totalSize / (1024 * 1024)
      };
    } catch (error) {
      console.error('❌ Error getting cleanup stats:', error);
      return { activeSessionsCount: 0, archivedSessionsCount: 0, totalSizeInMB: 0 };
    }
  }
}