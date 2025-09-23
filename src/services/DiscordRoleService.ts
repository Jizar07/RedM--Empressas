import { Client, Guild, GuildMember } from 'discord.js';
import config from '../config/config';

interface RoleDetectionResult {
  role: 'manager' | 'worker' | 'unknown';
  hasManagerRole: boolean;
  hasWorkerRole: boolean;
  userId: string;
}

class DiscordRoleService {
  private client: Client;
  private static instance: DiscordRoleService | null = null;

  // Ferrovia role IDs from user requirements
  private readonly MANAGER_ROLE_ID = '1274479410107646008';
  private readonly WORKER_ROLE_ID = '1274479410107646009';

  private constructor(client: Client) {
    this.client = client;
  }

  public static getInstance(client: Client): DiscordRoleService {
    if (!DiscordRoleService.instance) {
      DiscordRoleService.instance = new DiscordRoleService(client);
    }
    return DiscordRoleService.instance;
  }

  /**
   * Detect user role based on Discord roles in the configured guild
   */
  public async detectUserRole(userId: string): Promise<RoleDetectionResult> {
    try {
      if (!this.client || !this.client.user) {
        console.warn('⚠️ Discord client not ready for role detection');
        return {
          role: 'unknown',
          hasManagerRole: false,
          hasWorkerRole: false,
          userId
        };
      }

      // Get the guild (Discord server)
      const guildId = config.discord.guildId;
      if (!guildId) {
        console.warn('⚠️ No guild ID configured for role detection');
        return {
          role: 'unknown',
          hasManagerRole: false,
          hasWorkerRole: false,
          userId
        };
      }

      const guild: Guild | null = await this.client.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        console.warn(`⚠️ Could not fetch guild ${guildId} for role detection`);
        return {
          role: 'unknown',
          hasManagerRole: false,
          hasWorkerRole: false,
          userId
        };
      }

      // Get the guild member
      const member: GuildMember | null = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        console.warn(`⚠️ Could not fetch member ${userId} from guild ${guildId}`);
        return {
          role: 'unknown',
          hasManagerRole: false,
          hasWorkerRole: false,
          userId
        };
      }

      // Check roles
      const hasManagerRole = member.roles.cache.has(this.MANAGER_ROLE_ID);
      const hasWorkerRole = member.roles.cache.has(this.WORKER_ROLE_ID);

      // Determine primary role (manager takes precedence)
      let role: 'manager' | 'worker' | 'unknown' = 'unknown';
      if (hasManagerRole) {
        role = 'manager';
      } else if (hasWorkerRole) {
        role = 'worker';
      }

      console.log(`🎭 Role detection for user ${userId}: ${role} (manager: ${hasManagerRole}, worker: ${hasWorkerRole})`);

      return {
        role,
        hasManagerRole,
        hasWorkerRole,
        userId
      };

    } catch (error) {
      console.error(`❌ Error detecting role for user ${userId}:`, error);
      return {
        role: 'unknown',
        hasManagerRole: false,
        hasWorkerRole: false,
        userId
      };
    }
  }

  /**
   * Batch detect roles for multiple users
   */
  public async detectMultipleUserRoles(userIds: string[]): Promise<Map<string, RoleDetectionResult>> {
    const results = new Map<string, RoleDetectionResult>();

    for (const userId of userIds) {
      const result = await this.detectUserRole(userId);
      results.set(userId, result);
    }

    return results;
  }

  /**
   * Check if user has manager role specifically
   */
  public async isManager(userId: string): Promise<boolean> {
    const result = await this.detectUserRole(userId);
    return result.hasManagerRole;
  }

  /**
   * Check if user has worker role specifically
   */
  public async isWorker(userId: string): Promise<boolean> {
    const result = await this.detectUserRole(userId);
    return result.hasWorkerRole;
  }
}

export default DiscordRoleService;
export type { RoleDetectionResult };