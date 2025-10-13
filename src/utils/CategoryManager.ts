import { Client, Guild, CategoryChannel, ChannelType } from 'discord.js';
import fs from 'fs';
import path from 'path';

interface RegistrationConfig {
  servers: {
    [serverId: string]: {
      functions: Array<{
        id: string;
        displayName: string;
        categoryId: string;
        categoryName: string;
        channelEmojiPrefix: string;
      }>;
    };
  };
}

export class CategoryManager {
  private static instance: CategoryManager;
  private readonly CONFIG_PATH = path.join(process.cwd(), 'data', 'registration-config.json');
  private readonly MAX_CHANNELS_PER_CATEGORY = 50; // Discord limit

  private constructor() {}

  public static getInstance(): CategoryManager {
    if (!CategoryManager.instance) {
      CategoryManager.instance = new CategoryManager();
    }
    return CategoryManager.instance;
  }

  /**
   * Check if a category has reached its channel capacity
   */
  public async checkCategoryCapacity(client: Client, guildId: string, categoryId: string): Promise<{ isFull: boolean; currentCount: number; maxCount: number }> {
    try {
      const guild = await client.guilds.fetch(guildId);
      const category = await guild.channels.fetch(categoryId) as CategoryChannel;

      if (!category || category.type !== ChannelType.GuildCategory) {
        console.error(`❌ Category ${categoryId} not found or invalid`);
        return { isFull: false, currentCount: 0, maxCount: this.MAX_CHANNELS_PER_CATEGORY };
      }

      const channelCount = category.children.cache.size;
      const isFull = channelCount >= this.MAX_CHANNELS_PER_CATEGORY;

      console.log(`📊 Category "${category.name}" has ${channelCount}/${this.MAX_CHANNELS_PER_CATEGORY} channels`);

      return {
        isFull,
        currentCount: channelCount,
        maxCount: this.MAX_CHANNELS_PER_CATEGORY
      };
    } catch (error) {
      console.error(`❌ Error checking category capacity:`, error);
      return { isFull: false, currentCount: 0, maxCount: this.MAX_CHANNELS_PER_CATEGORY };
    }
  }

  /**
   * Create a new overflow category when current one reaches capacity
   */
  public async createOverflowCategory(
    client: Client,
    guildId: string,
    currentCategoryName: string,
    currentCategoryId: string
  ): Promise<{ success: boolean; categoryId?: string; categoryName?: string; error?: string }> {
    try {
      const guild = await client.guilds.fetch(guildId);

      // Determine new category name
      const newCategoryName = this.getNextCategoryName(currentCategoryName);

      // Get the current category position
      const currentCategory = await guild.channels.fetch(currentCategoryId) as CategoryChannel;
      const position = currentCategory ? currentCategory.position + 1 : undefined;

      // Create new category
      const newCategory = await guild.channels.create({
        name: newCategoryName,
        type: ChannelType.GuildCategory,
        position: position,
        permissionOverwrites: currentCategory?.permissionOverwrites.cache.map(po => ({
          id: po.id,
          allow: po.allow,
          deny: po.deny
        })) || []
      });

      console.log(`✅ Created overflow category "${newCategoryName}" (ID: ${newCategory.id})`);

      return {
        success: true,
        categoryId: newCategory.id,
        categoryName: newCategoryName
      };
    } catch (error) {
      console.error(`❌ Error creating overflow category:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update registration config with new category ID
   */
  public updateRegistrationConfig(
    serverId: string,
    functionName: string,
    newCategoryId: string,
    newCategoryName: string
  ): boolean {
    try {
      // Read current config
      if (!fs.existsSync(this.CONFIG_PATH)) {
        console.error(`❌ Registration config not found at ${this.CONFIG_PATH}`);
        return false;
      }

      const config: RegistrationConfig = JSON.parse(fs.readFileSync(this.CONFIG_PATH, 'utf8'));

      // Find and update the function config for this server
      if (!config.servers[serverId]) {
        console.error(`❌ Server ${serverId} not found in registration config`);
        return false;
      }

      const functionConfig = config.servers[serverId].functions.find(
        f => f.displayName.toLowerCase() === functionName.toLowerCase()
      );

      if (!functionConfig) {
        console.error(`❌ Function "${functionName}" not found for server ${serverId}`);
        return false;
      }

      // Update category info
      const oldCategoryId = functionConfig.categoryId;
      const oldCategoryName = functionConfig.categoryName;

      functionConfig.categoryId = newCategoryId;
      functionConfig.categoryName = newCategoryName;

      // Write updated config
      fs.writeFileSync(this.CONFIG_PATH, JSON.stringify(config, null, 2));

      console.log(`✅ Updated registration config for server ${serverId}:`);
      console.log(`   Function: ${functionName}`);
      console.log(`   Old category: ${oldCategoryName} (${oldCategoryId})`);
      console.log(`   New category: ${newCategoryName} (${newCategoryId})`);

      return true;
    } catch (error) {
      console.error(`❌ Error updating registration config:`, error);
      return false;
    }
  }

  /**
   * Handle category overflow: check capacity, create new category if needed, update config
   */
  public async handleCategoryOverflow(
    client: Client,
    guildId: string,
    serverId: string,
    categoryId: string,
    categoryName: string,
    functionName: string
  ): Promise<{ success: boolean; newCategoryId?: string; newCategoryName?: string; wasOverflowNeeded: boolean }> {
    try {
      // Check if category is full
      const capacityCheck = await this.checkCategoryCapacity(client, guildId, categoryId);

      if (!capacityCheck.isFull) {
        console.log(`✅ Category "${categoryName}" has space (${capacityCheck.currentCount}/${capacityCheck.maxCount})`);
        return {
          success: true,
          wasOverflowNeeded: false
        };
      }

      console.log(`⚠️ Category "${categoryName}" is at capacity! Creating overflow category...`);

      // Create new overflow category
      const overflowResult = await this.createOverflowCategory(client, guildId, categoryName, categoryId);

      if (!overflowResult.success || !overflowResult.categoryId || !overflowResult.categoryName) {
        console.error(`❌ Failed to create overflow category`);
        return {
          success: false,
          wasOverflowNeeded: true
        };
      }

      // Update registration config
      const configUpdated = this.updateRegistrationConfig(
        serverId,
        functionName,
        overflowResult.categoryId,
        overflowResult.categoryName
      );

      if (!configUpdated) {
        console.error(`❌ Failed to update registration config`);
        return {
          success: false,
          wasOverflowNeeded: true
        };
      }

      console.log(`✅ Successfully handled category overflow for "${categoryName}"`);

      return {
        success: true,
        newCategoryId: overflowResult.categoryId,
        newCategoryName: overflowResult.categoryName,
        wasOverflowNeeded: true
      };
    } catch (error) {
      console.error(`❌ Error handling category overflow:`, error);
      return {
        success: false,
        wasOverflowNeeded: true
      };
    }
  }

  /**
   * Get the next category name in sequence
   * Examples:
   * - "FUNCIONARIOS 2.0" → "FUNCIONARIOS 3"
   * - "FUNCIONARIOS 3" → "FUNCIONARIOS 4"
   * - "FUNCIONARIOS" → "FUNCIONARIOS 2"
   */
  private getNextCategoryName(currentName: string): string {
    // Match patterns like "FUNCIONARIOS 2.0", "FUNCIONARIOS 3", "FUNCIONARIOS 2"
    const match = currentName.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);

    if (match) {
      const baseName = match[1]; // "FUNCIONARIOS"
      const currentNumber = parseFloat(match[2]); // 2.0, 3, etc.

      // Increment to next whole number
      const nextNumber = Math.floor(currentNumber) + 1;

      return `${baseName} ${nextNumber}`;
    }

    // No number found - add " 2"
    return `${currentName} 2`;
  }

  /**
   * Get current category configuration for a server function
   */
  public getCurrentCategoryConfig(serverId: string, functionName: string): {
    categoryId: string;
    categoryName: string;
  } | null {
    try {
      if (!fs.existsSync(this.CONFIG_PATH)) {
        console.error(`❌ Registration config not found`);
        return null;
      }

      const config: RegistrationConfig = JSON.parse(fs.readFileSync(this.CONFIG_PATH, 'utf8'));

      if (!config.servers[serverId]) {
        console.error(`❌ Server ${serverId} not found in config`);
        return null;
      }

      const functionConfig = config.servers[serverId].functions.find(
        f => f.displayName.toLowerCase() === functionName.toLowerCase()
      );

      if (!functionConfig) {
        console.error(`❌ Function "${functionName}" not found`);
        return null;
      }

      return {
        categoryId: functionConfig.categoryId,
        categoryName: functionConfig.categoryName
      };
    } catch (error) {
      console.error(`❌ Error reading category config:`, error);
      return null;
    }
  }

  /**
   * Check if overflow handling is needed before creating a new channel
   * Returns updated category info if overflow was handled
   */
  public async checkAndHandleOverflow(
    client: Client,
    guildId: string,
    serverId: string,
    functionName: string
  ): Promise<{ categoryId: string; categoryName: string } | null> {
    try {
      const currentConfig = this.getCurrentCategoryConfig(serverId, functionName);

      if (!currentConfig) {
        console.error(`❌ Could not get current category config`);
        return null;
      }

      const overflowResult = await this.handleCategoryOverflow(
        client,
        guildId,
        serverId,
        currentConfig.categoryId,
        currentConfig.categoryName,
        functionName
      );

      if (!overflowResult.success) {
        console.error(`❌ Overflow handling failed`);
        return null;
      }

      // Return new category if overflow was needed, otherwise return current
      if (overflowResult.wasOverflowNeeded && overflowResult.newCategoryId && overflowResult.newCategoryName) {
        return {
          categoryId: overflowResult.newCategoryId,
          categoryName: overflowResult.newCategoryName
        };
      }

      return currentConfig;
    } catch (error) {
      console.error(`❌ Error in checkAndHandleOverflow:`, error);
      return null;
    }
  }
}

export default CategoryManager;
