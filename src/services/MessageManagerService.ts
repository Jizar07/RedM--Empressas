import { Client, TextChannel, EmbedBuilder } from 'discord.js';

interface ManagedMessage {
  messageId: string;
  channelId: string;
  messageType: string;
  lastUpdated: Date;
}

interface WebhookData {
  messageType?: string;
  title?: string;
  description?: string;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  color?: number;
  timestamp?: string;
}

export class MessageManagerService {
  private client: Client;
  private managedMessages: Map<string, ManagedMessage> = new Map();

  constructor(client: Client) {
    this.client = client;
  }

  private getMessageKey(channelId: string, messageType: string): string {
    return `${channelId}:${messageType}`;
  }

  async updateOrCreateMessage(channelId: string, data: WebhookData): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId) as TextChannel;
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or not a text channel`);
      }

      const messageType = data.messageType || 'default';
      const messageKey = this.getMessageKey(channelId, messageType);
      const managedMessage = this.managedMessages.get(messageKey);

      const embed = new EmbedBuilder()
        .setTitle(data.title || 'Update')
        .setDescription(data.description || '')
        .setTimestamp();

      if (data.color) {
        embed.setColor(data.color);
      }

      if (data.fields) {
        embed.addFields(data.fields);
      }

      if (managedMessage) {
        try {
          const existingMessage = await channel.messages.fetch(managedMessage.messageId);
          await existingMessage.edit({ embeds: [embed] });
          
          managedMessage.lastUpdated = new Date();
          console.log(`✅ Updated existing message ${managedMessage.messageId} in channel ${channelId}`);
        } catch (error) {
          console.log(`⚠️ Could not update message ${managedMessage.messageId}, creating new one`);
          await this.createNewMessage(channel, embed, messageKey, messageType);
        }
      } else {
        await this.createNewMessage(channel, embed, messageKey, messageType);
      }
    } catch (error) {
      console.error('❌ Error in updateOrCreateMessage:', error);
      throw error;
    }
  }

  private async createNewMessage(channel: TextChannel, embed: EmbedBuilder, messageKey: string, messageType: string): Promise<void> {
    const newMessage = await channel.send({ embeds: [embed] });
    
    this.managedMessages.set(messageKey, {
      messageId: newMessage.id,
      channelId: channel.id,
      messageType,
      lastUpdated: new Date()
    });

    console.log(`✅ Created new message ${newMessage.id} in channel ${channel.id}`);
  }

  async deleteMessage(channelId: string, messageType: string = 'default'): Promise<void> {
    const messageKey = this.getMessageKey(channelId, messageType);
    const managedMessage = this.managedMessages.get(messageKey);

    if (managedMessage) {
      try {
        const channel = await this.client.channels.fetch(channelId) as TextChannel;
        const message = await channel.messages.fetch(managedMessage.messageId);
        await message.delete();
        
        this.managedMessages.delete(messageKey);
        console.log(`✅ Deleted message ${managedMessage.messageId} from channel ${channelId}`);
      } catch (error) {
        console.error('❌ Error deleting message:', error);
        this.managedMessages.delete(messageKey);
      }
    }
  }

  getManagedMessages(): ManagedMessage[] {
    return Array.from(this.managedMessages.values());
  }

  clearChannel(channelId: string): void {
    const keysToDelete = Array.from(this.managedMessages.keys())
      .filter(key => key.startsWith(`${channelId}:`));
    
    keysToDelete.forEach(key => this.managedMessages.delete(key));
    console.log(`🧹 Cleared ${keysToDelete.length} managed messages for channel ${channelId}`);
  }
}

export default MessageManagerService;