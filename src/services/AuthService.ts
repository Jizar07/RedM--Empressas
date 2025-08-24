import axios from 'axios';
import { BotClient } from '../bot/BotClient';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  isInTargetGuild: boolean;
  roles: string[];
}

export class AuthService {
  private static instance: AuthService;
  private bot: BotClient;

  constructor(bot: BotClient) {
    this.bot = bot;
  }

  static getInstance(bot: BotClient): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(bot);
    }
    return AuthService.instance;
  }

  async verifyGuildMembership(discordId: string): Promise<{ isInGuild: boolean; roles: string[] }> {
    try {
      const guildId = process.env.DISCORD_GUILD_ID;
      if (!guildId) {
        throw new Error('Discord Guild ID not configured');
      }

      // Try to get member from bot's cache first
      const guild = this.bot.guilds.cache.get(guildId);
      if (guild) {
        const member = guild.members.cache.get(discordId);
        if (member) {
          return {
            isInGuild: true,
            roles: member.roles.cache.map(role => role.id).filter(id => id !== guildId) // Exclude @everyone role
          };
        }
      }

      // Fallback to Discord API
      const response = await axios.get(
        `https://discord.com/api/guilds/${guildId}/members/${discordId}`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`
          }
        }
      );

      return {
        isInGuild: true,
        roles: response.data.roles || []
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { isInGuild: false, roles: [] };
      }
      console.error('Error verifying guild membership:', error);
      return { isInGuild: false, roles: [] };
    }
  }

  async getUserGuilds(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get('https://discord.com/api/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user guilds:', error);
      return [];
    }
  }

  async refreshUserData(discordId: string): Promise<DiscordUser | null> {
    try {
      const membershipData = await this.verifyGuildMembership(discordId);
      
      if (!membershipData.isInGuild) {
        return null;
      }

      // Get user info from Discord API
      const userResponse = await axios.get(
        `https://discord.com/api/users/${discordId}`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_TOKEN}`
          }
        }
      );

      const userData = userResponse.data;

      return {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        isInTargetGuild: true,
        roles: membershipData.roles
      };
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  }

  isAdmin(roles: string[]): boolean {
    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || '123456789'; // Replace with actual admin role ID
    return roles.includes(adminRoleId);
  }

  isModerator(roles: string[]): boolean {
    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || '123456789';
    const moderatorRoleId = process.env.DISCORD_MODERATOR_ROLE_ID || '987654321'; // Replace with actual moderator role ID
    return roles.includes(adminRoleId) || roles.includes(moderatorRoleId);
  }

  hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
    return requiredRoles.some(roleId => userRoles.includes(roleId));
  }
}

export default AuthService;