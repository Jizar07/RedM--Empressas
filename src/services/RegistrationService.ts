import { Client, Role, CategoryChannel, PermissionsBitField } from 'discord.js';
import { UserRegistration, IRegistrationConfig, IUserRegistration } from '../models/Registration';
import { connectDatabase } from './DatabaseService';
import fs from 'fs';
import path from 'path';

// In-memory fallback storage when database is not available
const memoryConfig = {
  formId: 'registration_form',
  functions: [] as any[],
  settings: {
    oneTimeOnly: true,
    requiresVerification: false,
    welcomeMessage: 'Bem-vindo à Familia BlackGolden! Seu registro foi processado.',
    embedColor: '#FF0000'
  }
};

// File paths for persistent storage
const CONFIG_FILE = path.join(__dirname, '../../data/registration-config.json');
const REGISTRATIONS_FILE = path.join(__dirname, '../../data/registrations.json');
const DATA_DIR = path.dirname(CONFIG_FILE);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class RegistrationService {
  private client: Client | null = null;

  setClient(client: Client) {
    this.client = client;
  }

  // Load configuration from file
  private loadConfigFromFile(): any {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading config from file:', error);
    }
    return memoryConfig;
  }

  // Save configuration to file
  private saveConfigToFile(config: any): void {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving config to file:', error);
    }
  }

  // Get all roles from Discord server
  async getDiscordRoles(guildId: string): Promise<Role[]> {
    if (!this.client) throw new Error('Discord client not initialized');
    
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');
    
    // Fetch all roles and filter out @everyone
    const roles = Array.from(guild.roles.cache.values())
      .filter(role => role.name !== '@everyone')
      .sort((a, b) => b.position - a.position);
    
    return roles;
  }

  // Get all categories from Discord server
  async getDiscordCategories(guildId: string): Promise<CategoryChannel[]> {
    if (!this.client) throw new Error('Discord client not initialized');
    
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');
    
    // Fetch all categories and sort by position
    const categories = Array.from(guild.channels.cache.values())
      .filter(channel => channel.type === 4) // 4 = Category channel type
      .map(channel => channel as CategoryChannel)
      .sort((a, b) => a.position - b.position);
    
    return categories;
  }

  // Get registration form configuration
  async getFormConfig(): Promise<IRegistrationConfig | null> {
    // Use file-based storage for persistence
    console.log('Loading configuration from file storage');
    return this.loadConfigFromFile();
  }

  // Update registration form configuration
  async updateFormConfig(config: Partial<IRegistrationConfig>): Promise<IRegistrationConfig> {
    console.log('Updating configuration in file storage');
    console.log('Config to update:', JSON.stringify(config, null, 2));
    
    // Load current config, merge with updates, and save
    const currentConfig = this.loadConfigFromFile();
    console.log('Current config:', JSON.stringify(currentConfig, null, 2));
    
    // Deep merge the configurations
    const updatedConfig = {
      ...currentConfig,
      ...config,
      settings: {
        ...currentConfig.settings,
        ...(config.settings || {})
      },
      functions: config.functions !== undefined ? config.functions : currentConfig.functions
    };
    
    console.log('Updated config:', JSON.stringify(updatedConfig, null, 2));
    this.saveConfigToFile(updatedConfig);
    return updatedConfig as any;
  }

  // Check if user is already registered
  async isUserRegistered(_userId: string): Promise<boolean> {
    // For now, always return false since we're using file-based storage
    // and don't have user registration persistence implemented yet
    return false;
  }

  // Load registrations from file
  private loadRegistrationsFromFile(): IUserRegistration[] {
    try {
      if (fs.existsSync(REGISTRATIONS_FILE)) {
        const data = fs.readFileSync(REGISTRATIONS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading registrations from file:', error);
    }
    return [];
  }

  // Save registrations to file
  private saveRegistrationsToFile(registrations: IUserRegistration[]): void {
    try {
      fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(registrations, null, 2));
    } catch (error) {
      console.error('Error saving registrations to file:', error);
    }
  }

  // Submit a registration
  async submitRegistration(data: {
    userId: string;
    username: string;
    ingameName: string;
    mailId: string;
    functionId: string;
    invitedBy: string;
  }): Promise<IUserRegistration> {
    console.log('Submitting registration for user:', data.userId);
    
    // Get function details from config
    const config = await this.getFormConfig();
    if (!config) throw new Error('Registration form not configured');
    
    const selectedFunction = config.functions.find(f => f.id === data.functionId);
    if (!selectedFunction) throw new Error('Invalid function selected');
    
    // Create registration object
    const registration = {
      userId: data.userId,
      username: data.username,
      ingameName: data.ingameName,
      mailId: data.mailId,
      functionId: data.functionId,
      functionName: selectedFunction.displayName,
      invitedBy: data.invitedBy,
      approved: true,
      registeredAt: new Date()
    } as IUserRegistration;

    // Save to file-based storage only
    const registrations = this.loadRegistrationsFromFile();
    registrations.push(registration);
    this.saveRegistrationsToFile(registrations);

    console.log('Registration saved successfully for:', data.username);
    return registration;
  }

  // Assign Discord role to user
  async assignRole(userId: string, roleId: string, guildId?: string): Promise<boolean> {
    if (!this.client) throw new Error('Discord client not initialized');
    
    const targetGuildId = guildId || process.env.DISCORD_GUILD_ID;
    if (!targetGuildId) throw new Error('Guild ID not configured');
    
    try {
      const guild = this.client.guilds.cache.get(targetGuildId);
      if (!guild) throw new Error('Guild not found');
      
      const member = await guild.members.fetch(userId);
      if (!member) throw new Error('Member not found in guild');
      
      await member.roles.add(roleId);
      
      // Skip MongoDB metadata update for now (using file-based storage)
      console.log(`Successfully assigned role ${roleId} to user ${userId}`);
      
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      return false;
    }
  }

  // Get all registrations
  async getAllRegistrations(filter?: {
    approved?: boolean;
    functionId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IUserRegistration[]> {
    console.log('Loading registrations from file storage');
    
    let registrations = this.loadRegistrationsFromFile();
    
    if (filter) {
      if (typeof filter.approved === 'boolean') {
        registrations = registrations.filter(r => r.approved === filter.approved);
      }
      if (filter.functionId) {
        registrations = registrations.filter(r => r.functionId === filter.functionId);
      }
      if (filter.startDate || filter.endDate) {
        registrations = registrations.filter(r => {
          const regDate = new Date(r.registeredAt);
          if (filter.startDate && regDate < filter.startDate) return false;
          if (filter.endDate && regDate > filter.endDate) return false;
          return true;
        });
      }
    }
    
    // Sort by registration date (newest first)
    registrations.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
    
    console.log(`Loaded ${registrations.length} registrations from file storage`);
    return registrations;
  }

  // Approve a registration
  async approveRegistration(userId: string, approvedBy: string): Promise<IUserRegistration | null> {
    await connectDatabase();
    
    const registration = await UserRegistration.findOne({ userId });
    if (!registration) throw new Error('Registration not found');
    
    if (registration.approved) {
      throw new Error('Registration already approved');
    }

    // Get function details
    const config = await this.getFormConfig();
    if (!config) throw new Error('Registration form not configured');
    
    const selectedFunction = config.functions.find(f => f.id === registration.functionId);
    if (!selectedFunction) throw new Error('Function configuration not found');

    // Update registration
    registration.approved = true;
    registration.approvedBy = approvedBy;
    registration.approvedAt = new Date();
    await registration.save();

    // Assign role
    await this.assignRole(userId, selectedFunction.discordRoleId);

    return registration;
  }

  // Deny a registration
  async denyRegistration(userId: string, deniedBy: string, reason: string): Promise<IUserRegistration | null> {
    await connectDatabase();
    
    const registration = await UserRegistration.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          approved: false,
          approvedBy: deniedBy,
          approvedAt: new Date(),
          deniedReason: reason
        }
      },
      { new: true }
    );

    return registration;
  }

  // Get registration statistics
  async getStatistics(): Promise<{
    total: number;
    approved: number;
    pending: number;
    byFunction: { functionName: string; count: number }[];
    recentRegistrations: IUserRegistration[];
  }> {
    console.log('Loading registration statistics from file storage');
    
    const allRegistrations = this.loadRegistrationsFromFile();
    console.log(`Loaded ${allRegistrations.length} registrations from file storage for statistics`);
    
    const stats = {
      total: allRegistrations.length,
      approved: allRegistrations.filter(r => r.approved).length,
      pending: allRegistrations.filter(r => !r.approved).length,
      byFunction: [] as { functionName: string; count: number }[],
      recentRegistrations: allRegistrations
        .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
        .slice(0, 10)
    };

    // Count by function
    const functionCounts = new Map<string, number>();
    allRegistrations.forEach(reg => {
      const count = functionCounts.get(reg.functionName) || 0;
      functionCounts.set(reg.functionName, count + 1);
    });

    stats.byFunction = Array.from(functionCounts.entries()).map(([name, count]) => ({
      functionName: name,
      count
    }));

    console.log('Registration statistics:', stats);
    return stats;
  }

  // Update user registration
  async updateRegistration(userId: string, updates: Partial<IUserRegistration>): Promise<IUserRegistration | null> {
    await connectDatabase();
    
    const registration = await UserRegistration.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true }
    );

    return registration;
  }

  // Delete registration
  async deleteRegistration(userId: string): Promise<boolean> {
    await connectDatabase();
    
    const result = await UserRegistration.deleteOne({ userId });
    return result.deletedCount > 0;
  }

  // Create a Discord channel for user in specified category
  async createChannelForUser(
    userId: string, 
    channelName: string, 
    categoryId: string, 
    functionData: any,
    guildId?: string
  ): Promise<{ success: boolean; channelId?: string; error?: string }> {
    if (!this.client) throw new Error('Discord client not initialized');
    
    const targetGuildId = guildId || process.env.DISCORD_GUILD_ID;
    if (!targetGuildId) throw new Error('Guild ID not configured');
    
    try {
      const guild = this.client.guilds.cache.get(targetGuildId);
      if (!guild) throw new Error('Guild not found');
      
      // Apply emoji prefix if configured
      const emojiPrefix = functionData?.channelEmojiPrefix || '';
      
      // Sanitize channel name - keep more characters that Discord allows
      const sanitizedName = channelName
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
      
      // Create final channel name with emoji prefix
      // If emoji prefix is provided, use it as-is (including any separator like ・)
      let finalChannelName = emojiPrefix ? `${emojiPrefix}${sanitizedName}` : sanitizedName;
      finalChannelName = finalChannelName || 'user-channel';
      
      // Ensure channel name is within Discord limits (100 characters)
      if (finalChannelName.length > 100) {
        finalChannelName = finalChannelName.substring(0, 100);
      }
      
      // Check if category exists
      const category = guild.channels.cache.get(categoryId) as CategoryChannel;
      if (!category || category.type !== 4) {
        return { success: false, error: 'Category not found or invalid' };
      }
      
      // Build permission overwrites
      const permissionOverwrites = [
        // Deny everyone by default (private channel)
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
        },
        // Allow the user full access to their channel
        {
          id: userId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks]
        }
      ];

      // Add access for specific allowed roles
      if (functionData?.channelPermissions?.allowedRoles?.length) {
        for (const roleId of functionData.channelPermissions.allowedRoles) {
          permissionOverwrites.push({
            id: roleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles]
          });
        }
      }

      // Create channel topic from template
      let channelTopic = functionData?.channelPermissions?.channelTopic || 
        `Personal channel for {functionName} member`;
      
      // Create the text channel in the category
      const channel = await guild.channels.create({
        name: finalChannelName,
        type: 0, // Text channel
        parent: categoryId,
        topic: channelTopic,
        permissionOverwrites: permissionOverwrites,
        reason: `Registration channel for user ${userId}`
      });
      
      console.log(`Created channel ${channel.name} (${channel.id}) for user ${userId} in category ${category.name}`);
      
      return { success: true, channelId: channel.id };
    } catch (error: any) {
      console.error('Error creating channel:', error);
      return { success: false, error: error.message || 'Unknown error creating channel' };
    }
  }
}

export default new RegistrationService();