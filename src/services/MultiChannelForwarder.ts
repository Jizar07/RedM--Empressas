import { Message } from 'discord.js';
import { FirmConfigService } from './FirmConfigService';

interface WebhookData {
  raw_embeds: Array<{
    title: string | null;
    description: string | null;
    fields: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
  channel_id: string;
  author: {
    id: string;
    username: string;
    bot: boolean;
  };
  timestamp: string;
  message_id: string;
  content: string;
}

interface FirmMonitoringStats {
  messagesProcessed: number;
  errorsThisHour: number;
  lastMessageReceived: string | null;
  lastError: string | null;
  uptime: number;
  startTime: number;
}

export class MultiChannelForwarder {
  private static instance: MultiChannelForwarder;
  private firmConfigService: FirmConfigService;
  private monitoringStats: Map<string, FirmMonitoringStats>;
  private isInitialized: boolean = false;

  private constructor() {
    this.firmConfigService = FirmConfigService.getInstance();
    this.monitoringStats = new Map();
    this.initialize();
  }

  public static getInstance(): MultiChannelForwarder {
    if (!MultiChannelForwarder.instance) {
      MultiChannelForwarder.instance = new MultiChannelForwarder();
    }
    return MultiChannelForwarder.instance;
  }

  private initialize(): void {
    try {
      // Initialize monitoring stats for all enabled firms
      const firms = this.firmConfigService.getAllFirms();
      const currentTime = Date.now();
      
      Object.values(firms).forEach(firm => {
        if (firm.enabled && firm.monitoring.enabled) {
          this.monitoringStats.set(firm.id, {
            messagesProcessed: 0,
            errorsThisHour: 0,
            lastMessageReceived: null,
            lastError: null,
            uptime: 0,
            startTime: currentTime
          });
          
          console.log(`📡 Multi-Channel Forwarder: Initialized monitoring for ${firm.name} (${firm.id})`);
        }
      });

      this.isInitialized = true;
      console.log(`✅ Multi-Channel Forwarder initialized for ${this.monitoringStats.size} firms`);
    } catch (error) {
      console.error('❌ Failed to initialize Multi-Channel Forwarder:', error);
    }
  }

  public async processMessage(message: Message, channelId: string): Promise<void> {
    try {
      // Find the firm associated with this channel
      const firm = this.firmConfigService.getFirmByChannelId(channelId);
      
      if (!firm) {
        console.log(`⏭️ Multi-Channel Forwarder: No firm configured for channel ${channelId}`);
        return;
      }

      if (!firm.enabled || !firm.monitoring.enabled) {
        console.log(`⏭️ Multi-Channel Forwarder: Monitoring disabled for firm ${firm.name} (${firm.id})`);
        return;
      }

      console.log(`🔍 Multi-Channel Forwarder: Processing message for firm ${firm.name} from channel ${channelId}`);

      // Update monitoring stats
      this.updateStats(firm.id, 'message_received');

      // Extract author from message
      let realAuthor = message.author.username;
      
      // Check if this is a bot message with embeds that might contain author info
      if (message.author.bot && message.embeds.length > 0) {
        for (const embed of message.embeds) {
          if (embed.fields) {
            for (const field of embed.fields) {
              const cleanFieldName = field.name.replace(/[:`]/g, '').trim().toLowerCase();
              const cleanValue = field.value.replace(/```[a-z]*\n?|\n?```/g, '').trim();
              
              // Look for "Autor" field first
              if (cleanFieldName === 'autor' || cleanFieldName.includes('autor')) {
                realAuthor = cleanValue
                  .replace(/^:+\s*/, '')
                  .split('|')[0]
                  .trim();
                console.log(`🔍 Multi-Channel Forwarder: Found author from Autor field: "${realAuthor}"`);
                break;
              }
              
              // For animal services: Look for "Ação" field if no Autor field found
              if ((cleanFieldName === 'ação' || cleanFieldName === 'acao') && realAuthor === message.author.username) {
                // Check if this is an animal service message
                const isAnimalService = message.embeds.some(embed => 
                  (embed.author?.name || embed.title || embed.description || '')
                    .includes('CAIXA ORGANIZAÇÃO') && 
                  (embed.author?.name || embed.title || embed.description || '')
                    .includes('DEPÓSITO')
                );
                
                if (isAnimalService) {
                  const animalServiceMatch = cleanValue.match(/^(.+?)\s+vendeu\s+\d+\s+animais\s+no\s+matadouro/);
                  if (animalServiceMatch) {
                    realAuthor = animalServiceMatch[1].trim();
                    console.log(`🔍 Multi-Channel Forwarder: Found animal service author from Ação field: "${realAuthor}"`);
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // Extract content from embeds if message content is empty
      let extractedContent = message.content;
      if (!extractedContent && message.embeds.length > 0) {
        const embedContents: string[] = [];
        for (const embed of message.embeds) {
          const parts: string[] = [];
          if (embed.author?.name) parts.push(`REGISTRO - ${embed.author.name}`);
          if (embed.title) parts.push(embed.title);
          if (embed.description) parts.push(embed.description);
          if (embed.fields && embed.fields.length > 0) {
            for (const field of embed.fields) {
              const cleanValue = field.value.replace(/```prolog\n|```/g, '').trim();
              parts.push(`${field.name.replace(/`/g, '')}: ${cleanValue}`);
            }
          }
          if (parts.length > 0) {
            embedContents.push(parts.join('\n'));
          }
        }
        extractedContent = embedContents.join('\n\n');
      }

      // Prepare webhook data
      const webhookData: WebhookData = {
        raw_embeds: message.embeds.map(embed => ({
          title: embed.title,
          description: embed.description,
          fields: embed.fields ? embed.fields.map(field => ({
            name: field.name,
            value: field.value,
            inline: field.inline
          })) : []
        })),
        channel_id: channelId,
        author: {
          id: message.author.id,
          username: realAuthor, // Use the extracted real author
          bot: message.author.bot
        },
        timestamp: message.createdAt.toISOString(),
        message_id: message.id,
        content: extractedContent
      };

      // Send to firm's configured endpoint
      await this.sendToFirmEndpoint(firm.id, firm.monitoring.endpoint, webhookData);
      
      console.log(`✅ Multi-Channel Forwarder: Successfully processed message for firm ${firm.name}`);

    } catch (error) {
      console.error('❌ Multi-Channel Forwarder: Error processing message:', error);
      
      // Try to find firm for error logging
      const firm = this.firmConfigService.getFirmByChannelId(channelId);
      if (firm) {
        this.updateStats(firm.id, 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  private async sendToFirmEndpoint(firmId: string, endpoint: string, data: WebhookData): Promise<void> {
    try {
      // Transform data to match the expected webhook format
      const webhookPayload = {
        channelId: data.channel_id,
        messages: [{
          id: data.message_id,
          author: data.author.username,
          content: data.content,
          timestamp: data.timestamp,
          raw_embeds: data.raw_embeds
        }]
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        console.log(`✅ Multi-Channel Forwarder: Sent data to ${endpoint} for firm ${firmId}`);
        this.updateStats(firmId, 'message_sent');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Multi-Channel Forwarder: Failed to send to endpoint ${endpoint}:`, error);
      this.updateStats(firmId, 'error', error instanceof Error ? error.message : 'Network error');
      throw error;
    }
  }

  private updateStats(firmId: string, eventType: 'message_received' | 'message_sent' | 'error', errorMessage?: string): void {
    try {
      let stats = this.monitoringStats.get(firmId);
      
      if (!stats) {
        // Initialize stats if not exists
        stats = {
          messagesProcessed: 0,
          errorsThisHour: 0,
          lastMessageReceived: null,
          lastError: null,
          uptime: 0,
          startTime: Date.now()
        };
        this.monitoringStats.set(firmId, stats);
      }

      const now = new Date().toISOString();
      
      switch (eventType) {
        case 'message_received':
          stats.lastMessageReceived = now;
          break;
          
        case 'message_sent':
          stats.messagesProcessed++;
          break;
          
        case 'error':
          stats.errorsThisHour++;
          stats.lastError = errorMessage || 'Unknown error';
          break;
      }
      
      // Update uptime
      stats.uptime = Date.now() - stats.startTime;
      
      this.monitoringStats.set(firmId, stats);
    } catch (error) {
      console.error('❌ Multi-Channel Forwarder: Error updating stats:', error);
    }
  }

  public getMonitoringStats(firmId?: string): Map<string, FirmMonitoringStats> | FirmMonitoringStats | null {
    if (firmId) {
      return this.monitoringStats.get(firmId) || null;
    }
    return this.monitoringStats;
  }

  public resetStats(firmId?: string): void {
    if (firmId) {
      const stats = this.monitoringStats.get(firmId);
      if (stats) {
        stats.messagesProcessed = 0;
        stats.errorsThisHour = 0;
        stats.lastError = null;
        stats.startTime = Date.now();
        stats.uptime = 0;
        this.monitoringStats.set(firmId, stats);
      }
    } else {
      this.monitoringStats.clear();
      this.initialize();
    }
    
    console.log(`🔄 Multi-Channel Forwarder: Reset stats for ${firmId || 'all firms'}`);
  }

  public getMonitoredChannels(): Array<{ firmId: string; channelId: string; endpoint: string }> {
    return this.firmConfigService.getMonitoredChannels();
  }

  public reloadConfiguration(): void {
    try {
      this.firmConfigService.reloadConfig();
      this.monitoringStats.clear();
      this.initialize();
      console.log('🔄 Multi-Channel Forwarder: Configuration reloaded');
    } catch (error) {
      console.error('❌ Multi-Channel Forwarder: Error reloading configuration:', error);
    }
  }

  public isChannelMonitored(channelId: string): boolean {
    const firm = this.firmConfigService.getFirmByChannelId(channelId);
    return firm !== null && firm.enabled && firm.monitoring.enabled;
  }

  public getFirmByChannelId(channelId: string): any {
    return this.firmConfigService.getFirmByChannelId(channelId);
  }

  public getStatus(): {
    initialized: boolean;
    monitoredFirms: number;
    totalStats: {
      totalMessages: number;
      totalErrors: number;
      averageUptime: number;
    };
  } {
    const totalMessages = Array.from(this.monitoringStats.values()).reduce((sum, stats) => sum + stats.messagesProcessed, 0);
    const totalErrors = Array.from(this.monitoringStats.values()).reduce((sum, stats) => sum + stats.errorsThisHour, 0);
    const averageUptime = this.monitoringStats.size > 0 
      ? Array.from(this.monitoringStats.values()).reduce((sum, stats) => sum + stats.uptime, 0) / this.monitoringStats.size
      : 0;

    return {
      initialized: this.isInitialized,
      monitoredFirms: this.monitoringStats.size,
      totalStats: {
        totalMessages,
        totalErrors,
        averageUptime
      }
    };
  }
}