import { TextChannel, Client } from 'discord.js';
import axios, { AxiosInstance } from 'axios';

interface ParsedMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
  };
  timestamp: string;
  attachments: string[];
  embeds: any[];
}

interface WebhookPayload {
  messages: ParsedMessage[];
  channelId: string;
  channelName: string;
  guildName: string;
  parsedAt: string;
  totalMessages: number;
}

class ChannelParserService {
  private client: Client;
  private axios: AxiosInstance;

  constructor(client: Client) {
    this.client = client;
    this.axios = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async parseChannelMessages(channelId: string, limit: number = 100): Promise<ParsedMessage[]> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error('Channel not found or is not a text channel');
      }

      const textChannel = channel as TextChannel;
      const messages = await textChannel.messages.fetch({ limit });
      
      const parsedMessages: ParsedMessage[] = [];
      
      for (const [_, message] of messages) {
        // Extract content from embeds if message content is empty
        let content = message.content;
        if (!content && message.embeds.length > 0) {
          const embedContents: string[] = [];
          for (const embed of message.embeds) {
            const parts: string[] = [];
            if (embed.title) parts.push(`**${embed.title}**`);
            if (embed.description) parts.push(embed.description);
            if (embed.fields && embed.fields.length > 0) {
              for (const field of embed.fields) {
                parts.push(`**${field.name}**: ${field.value}`);
              }
            }
            if (parts.length > 0) {
              embedContents.push(parts.join('\n'));
            }
          }
          content = embedContents.join('\n\n');
        }

        const parsedMessage: ParsedMessage = {
          id: message.id,
          content: content,
          author: {
            id: message.author.id,
            username: message.author.username,
            displayName: message.author.displayName || message.author.username,
          },
          timestamp: message.createdAt.toISOString(),
          attachments: message.attachments.map(attachment => attachment.url),
          embeds: message.embeds.map(embed => embed.toJSON()),
        };
        
        parsedMessages.push(parsedMessage);
      }
      
      return parsedMessages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error parsing channel messages:', error);
      throw error;
    }
  }

  async sendToWebhook(webhookUrl: string, channelId: string, messages: ParsedMessage[]): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error('Channel not found or is not a text channel');
      }

      const textChannel = channel as TextChannel;
      
      const payload: WebhookPayload = {
        messages,
        channelId,
        channelName: textChannel.name,
        guildName: textChannel.guild.name,
        parsedAt: new Date().toISOString(),
        totalMessages: messages.length,
      };

      await this.axios.post(webhookUrl, payload);
      console.log(`Successfully sent ${messages.length} messages to webhook`);
    } catch (error) {
      console.error('Error sending to webhook:', error);
      throw error;
    }
  }

  async parseAndSendToWebhook(channelId: string, webhookUrl: string, limit: number = 100): Promise<void> {
    try {
      const messages = await this.parseChannelMessages(channelId, limit);
      await this.sendToWebhook(webhookUrl, channelId, messages);
    } catch (error) {
      console.error('Error in parseAndSendToWebhook:', error);
      throw error;
    }
  }

  async filterMessagesByUser(messages: ParsedMessage[], userId: string): Promise<ParsedMessage[]> {
    return messages.filter(message => message.author.id === userId);
  }

  async filterMessagesByKeyword(messages: ParsedMessage[], keyword: string): Promise<ParsedMessage[]> {
    return messages.filter(message => 
      message.content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  async filterMessagesByDateRange(messages: ParsedMessage[], startDate: Date, endDate: Date): Promise<ParsedMessage[]> {
    return messages.filter(message => {
      const messageDate = new Date(message.timestamp);
      return messageDate >= startDate && messageDate <= endDate;
    });
  }
}

export default ChannelParserService;
export { ParsedMessage, WebhookPayload };