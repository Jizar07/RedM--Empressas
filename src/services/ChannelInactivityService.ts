import { Client, TextChannel, User, CategoryChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import WorkerChannelService from './WorkerChannelService';

interface InactivityConfig {
  enabled: boolean;
  inactivityThresholdDays: number;
  warningDays: number[];
  excludedWorkerIds: string[];
}

interface WorkerInactivityStatus {
  workerId: string;
  workerName: string;
  channelId: string;
  lastActive: string | null;
  daysInactive: number;
  shouldWarn: boolean;
  shouldDelete: boolean;
  warningLevel: number | null; // 7, 8, 9 days
}

export class ChannelInactivityService {
  private static instance: ChannelInactivityService;
  private client: Client | null = null;
  private checkTimer: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 86400000; // 24 hours in milliseconds
  private readonly CONFIG_DIR = 'data/worker-channels';

  private constructor() {}

  public static getInstance(): ChannelInactivityService {
    if (!ChannelInactivityService.instance) {
      ChannelInactivityService.instance = new ChannelInactivityService();
    }
    return ChannelInactivityService.instance;
  }

  public initialize(client: Client): void {
    this.client = client;
    console.log('✅ ChannelInactivityService initialized');
  }

  public startDailyCheck(): void {
    if (!this.client) {
      console.error('❌ ChannelInactivityService: Client not initialized');
      return;
    }

    // Run initial check after 1 minute (allow bot to fully initialize)
    setTimeout(() => {
      this.performAllServerChecks();
    }, 60000);

    // Schedule daily checks
    this.checkTimer = setInterval(() => {
      this.performAllServerChecks();
    }, this.CHECK_INTERVAL);

    console.log('🔄 ChannelInactivityService: Daily checks started');
  }

  public stopDailyCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
      console.log('⏹️ ChannelInactivityService: Daily checks stopped');
    }
  }

  private async performAllServerChecks(): Promise<void> {
    console.log('🔍 ChannelInactivityService: Starting daily inactivity check...');

    try {
      // Get all server directories
      const serversDir = this.CONFIG_DIR;
      if (!fs.existsSync(serversDir)) {
        console.log('⚠️ No worker-channels directory found');
        return;
      }

      const serverIds = fs.readdirSync(serversDir).filter(dir => {
        const fullPath = path.join(serversDir, dir);
        return fs.statSync(fullPath).isDirectory() && /^\d+$/.test(dir);
      });

      console.log(`📊 Found ${serverIds.length} servers to check`);

      for (const serverId of serverIds) {
        await this.performInactivityCheck(serverId);
      }

      console.log('✅ ChannelInactivityService: Daily check completed');
    } catch (error) {
      console.error('❌ Error during inactivity check:', error);
    }
  }

  private async performInactivityCheck(serverId: string): Promise<void> {
    console.log(`\n🔍 Checking inactivity for server ${serverId}`);

    try {
      // Load config
      const config = this.loadConfig(serverId);
      if (!config.enabled) {
        console.log(`⏭️ Inactivity checks disabled for server ${serverId}`);
        return;
      }

      // Get all inactive workers
      const inactiveWorkers = this.getInactiveWorkers(serverId, config);

      if (inactiveWorkers.length === 0) {
        console.log(`✅ No inactive workers found for server ${serverId}`);
        return;
      }

      console.log(`📋 Found ${inactiveWorkers.length} inactive workers`);

      // Process each inactive worker
      for (const worker of inactiveWorkers) {
        if (worker.shouldDelete) {
          await this.deleteInactiveChannel(serverId, worker);
        } else if (worker.shouldWarn && worker.warningLevel) {
          await this.sendWarning(serverId, worker, worker.warningLevel);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking inactivity for server ${serverId}:`, error);
    }
  }

  private getInactiveWorkers(serverId: string, config: InactivityConfig): WorkerInactivityStatus[] {
    const workerChannelService = WorkerChannelService.getInstance();
    const allMappings = workerChannelService.getAllWorkerMappings(serverId);
    const inactiveWorkers: WorkerInactivityStatus[] = [];
    const now = new Date();

    for (const [workerId, mapping] of Object.entries(allMappings)) {
      // Skip excluded workers
      if (config.excludedWorkerIds.includes(workerId)) {
        continue;
      }

      // Calculate inactivity
      let daysInactive: number;

      if (!mapping.lastActive) {
        // Never active - use creation date
        const createdAt = new Date(mapping.createdAt);
        daysInactive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        const lastActive = new Date(mapping.lastActive);
        daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Check if worker is inactive
      if (daysInactive >= config.warningDays[0]) {
        const status: WorkerInactivityStatus = {
          workerId,
          workerName: mapping.workerName,
          channelId: mapping.channelId,
          lastActive: mapping.lastActive || null,
          daysInactive,
          shouldWarn: false,
          shouldDelete: false,
          warningLevel: null
        };

        // Determine action
        if (daysInactive >= config.inactivityThresholdDays) {
          status.shouldDelete = true;
        } else if (config.warningDays.includes(daysInactive)) {
          status.shouldWarn = true;
          status.warningLevel = daysInactive;
        }

        if (status.shouldWarn || status.shouldDelete) {
          inactiveWorkers.push(status);
        }
      }
    }

    return inactiveWorkers;
  }

  private async sendWarning(serverId: string, worker: WorkerInactivityStatus, daysInactive: number): Promise<void> {
    if (!this.client) return;

    const daysRemaining = 10 - daysInactive;

    try {
      // Fetch user
      const user = await this.client.users.fetch(worker.workerId);

      // Get warning message
      const warningMessage = this.getWarningMessage(daysRemaining);

      // Send DM
      try {
        await user.send(warningMessage);
        console.log(`📨 Sent DM warning to ${worker.workerName} (${daysRemaining} days remaining)`);
      } catch (dmError) {
        console.warn(`⚠️ Could not send DM to ${worker.workerName}: ${dmError}`);
      }

      // Send message to their channel
      try {
        const channel = await this.client.channels.fetch(worker.channelId) as TextChannel;
        if (channel && channel.isTextBased()) {
          await channel.send(warningMessage);
          console.log(`📨 Sent channel warning to ${worker.workerName}'s channel (${daysRemaining} days remaining)`);
        }
      } catch (channelError) {
        console.warn(`⚠️ Could not send message to channel ${worker.channelId}: ${channelError}`);
      }

    } catch (error) {
      console.error(`❌ Error sending warning to worker ${worker.workerId}:`, error);
    }
  }

  private async deleteInactiveChannel(serverId: string, worker: WorkerInactivityStatus): Promise<void> {
    if (!this.client) return;

    try {
      console.log(`🗑️ Deleting inactive channel for ${worker.workerName} (${worker.daysInactive} days inactive)`);

      // Send final notification to user
      try {
        const user = await this.client.users.fetch(worker.workerId);
        await user.send('👋 Seu canal foi deletado devido a 10 dias de inatividade. Você pode se registrar novamente quando retornar ao servidor.');
        console.log(`📨 Sent deletion notification DM to ${worker.workerName}`);
      } catch (dmError: any) {
        // Ignore 10013 (Unknown User) - user may have left server
        if (dmError.code === 10013) {
          console.log(`ℹ️ User ${worker.workerName} not found (may have left server)`);
        } else {
          console.warn(`⚠️ Could not send deletion DM to ${worker.workerName}: ${dmError.message || dmError}`);
        }
      }

      // Delete the channel
      try {
        const channel = await this.client.channels.fetch(worker.channelId);
        if (channel) {
          await channel.delete('Inatividade de 10 dias');
          console.log(`✅ Deleted channel ${worker.channelId}`);
        }
      } catch (channelError: any) {
        // Handle missing channel gracefully (10003 = Unknown Channel)
        if (channelError.code === 10003) {
          console.log(`ℹ️ Channel ${worker.channelId} already deleted (cleaning up mapping)`);
        } else {
          console.error(`❌ Error deleting channel ${worker.channelId}: ${channelError.message || channelError}`);
        }
      }

      // Remove worker mapping (always do this, even if channel was already deleted)
      const mappingsPath = path.join(this.CONFIG_DIR, serverId, 'worker-mappings.json');

      if (fs.existsSync(mappingsPath)) {
        const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
        delete mappings[worker.workerId];
        fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
        console.log(`✅ Removed mapping for worker ${worker.workerId}`);
      }

      console.log(`✅ Successfully processed deletion for ${worker.workerName}`);
    } catch (error) {
      console.error(`❌ Error deleting inactive channel for worker ${worker.workerId}:`, error);
    }
  }

  private getWarningMessage(daysRemaining: number): string {
    switch (daysRemaining) {
      case 3:
        return '⚠️ **Aviso de Inatividade**\n\nSeu canal será deletado em **3 dias** devido à inatividade. Faça uma transação para manter o canal ativo.';
      case 2:
        return '⏰ **Aviso de Inatividade**\n\nSeu canal será deletado em **2 dias**! Última chance para manter seu canal fazendo uma transação.';
      case 1:
        return '🚨 **URGENTE: Aviso de Inatividade**\n\nSeu canal será deletado **AMANHÃ**! Faça uma transação agora para evitar a exclusão do canal.';
      default:
        return `⚠️ Seu canal será deletado em ${daysRemaining} dias devido à inatividade.`;
    }
  }

  private loadConfig(serverId: string): InactivityConfig {
    const configPath = path.join(this.CONFIG_DIR, serverId, 'inactivity-config.json');

    // Default config
    const defaultConfig: InactivityConfig = {
      enabled: true,
      inactivityThresholdDays: 10,
      warningDays: [7, 8, 9],
      excludedWorkerIds: []
    };

    try {
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(fileContent);
        return { ...defaultConfig, ...config };
      } else {
        // Create default config file
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(`✅ Created default inactivity config for server ${serverId}`);
        return defaultConfig;
      }
    } catch (error) {
      console.error(`❌ Error loading inactivity config for server ${serverId}:`, error);
      return defaultConfig;
    }
  }

  public addExcludedWorker(serverId: string, workerId: string): void {
    const config = this.loadConfig(serverId);
    if (!config.excludedWorkerIds.includes(workerId)) {
      config.excludedWorkerIds.push(workerId);
      this.saveConfig(serverId, config);
      console.log(`✅ Added worker ${workerId} to exclusion list`);
    }
  }

  public removeExcludedWorker(serverId: string, workerId: string): void {
    const config = this.loadConfig(serverId);
    const index = config.excludedWorkerIds.indexOf(workerId);
    if (index > -1) {
      config.excludedWorkerIds.splice(index, 1);
      this.saveConfig(serverId, config);
      console.log(`✅ Removed worker ${workerId} from exclusion list`);
    }
  }

  private saveConfig(serverId: string, config: InactivityConfig): void {
    const configPath = path.join(this.CONFIG_DIR, serverId, 'inactivity-config.json');
    const configDir = path.dirname(configPath);

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  // Manual trigger for testing
  public async checkServerNow(serverId: string): Promise<void> {
    console.log(`🔍 Manual inactivity check triggered for server ${serverId}`);
    await this.performInactivityCheck(serverId);
  }

  public getInactiveWorkersStatus(serverId: string): WorkerInactivityStatus[] {
    const config = this.loadConfig(serverId);
    return this.getInactiveWorkers(serverId, config);
  }
}

export default ChannelInactivityService;
