import { Events, Message } from 'discord.js';
import { loadConfig, ChannelLogMapping } from '../../api/routes/channel-logs-config';
import BotStatusService from '../../services/BotStatusService';
import { BotMessageForwarder } from '../../services/BotMessageForwarder';
import ManagerMoneyVerificationService from '../../services/ManagerMoneyVerificationService';
import { WeeklyRankingService } from '../../services/WeeklyRankingService';

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


// Function to parse worker activity and update weekly rankings
function parseAndUpdateWorkerActivity(content: string, _authorName: string): void {
  try {
    const weeklyService = WeeklyRankingService.getInstance();

    // Parse structured messages with "Autor::" pattern
    const authorMatch = content.match(/Autor::\s+([^|]+?)\s+\|\s+FIXO:/i);
    if (authorMatch) {
      const workerName = authorMatch[1].trim();

      // Check for Ferrovia activity (ATLANTA TREM, transport, etc.)
      if (content.includes('ATLANTA TREM') || content.includes('TREM') || content.includes('FERROVIA')) {
        console.log(`🚂 Weekly Rankings: ${workerName} completed Ferrovia mission`);
        weeklyService.updateWorkerStats('unknown', workerName, 'ferrovia', 1);
        return;
      }

      // Check for plant/material activities
      const quantiaMatch = content.match(/Quantia::\s+(\d+)/i);
      if (quantiaMatch && (content.includes('DEPOSITOU') || content.includes('SACOU'))) {
        const quantity = parseInt(quantiaMatch[1]);
        console.log(`🌱 Weekly Rankings: ${workerName} deposited ${quantity} plants`);
        weeklyService.updateWorkerStats('unknown', workerName, 'plants', quantity);
        return;
      }
    }

    // Fallback: Parse traditional patterns
    const plantMatch = content.match(/(\w+(?:\s+\w+)*)\s+depositou\s+(\d+)\s+(milho|junco|trigo|algodao|quartzo|ferro|carvao|madeira)/i);
    if (plantMatch) {
      const workerName = plantMatch[1].trim();
      const quantity = parseInt(plantMatch[2]);
      console.log(`🌱 Weekly Rankings: ${workerName} deposited ${quantity} plants (legacy format)`);
      weeklyService.updateWorkerStats('unknown', workerName, 'plants', quantity);
      return;
    }

    const animalMatch = content.match(/(\w+(?:\s+\w+)*)\s+vendeu\s+(\d+)\s+animais?\s+no\s+matadouro\s+por\s+\$?([\d,]+\.?\d*)/i);
    if (animalMatch) {
      const workerName = animalMatch[1].trim();
      const quantity = parseInt(animalMatch[2]);
      console.log(`🐄 Weekly Rankings: ${workerName} sold ${quantity} animals`);
      weeklyService.updateWorkerStats('unknown', workerName, 'animals', quantity);
      return;
    }

  } catch (error) {
    console.warn('⚠️ Error parsing worker activity for weekly rankings:', error);
  }
}

async function sendToConfiguredEndpoints(data: WebhookData, mappings: ChannelLogMapping[]): Promise<void> {
  for (const mapping of mappings) {
    if (!mapping.enabled) {
      console.log(`⏭️ Skipping disabled mapping for ${mapping.channelId}`);
      continue;
    }

    try {
      // Send ALL messages without any filtering
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

      const response = await fetch(mapping.systemEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });
      
      if (response.ok) {
        console.log(`✅ Successfully sent data to configured endpoint: ${mapping.systemEndpoint}`);
      } else {
        console.error(`❌ Configured endpoint error (${mapping.systemEndpoint}):`, response.status, response.statusText);
      }
    } catch (error) {
      console.log(`⚠️ Configured endpoint failed (${mapping.systemEndpoint}):`, error);
    }
  }
}

export default {
  name: Events.MessageCreate,
  execute: async (message: Message) => {
    // Debug: Log ALL messages to see what's happening
    console.log(`📨 Message received in channel ${message.channel.id} from ${message.author.username} (bot: ${message.author.bot})`);
    
    // Load channel logs configuration
    const config = await loadConfig();
    const channelMappings = config.mappings.filter(
      mapping => mapping.channelId === message.channel.id && mapping.enabled
    );
    
    // Check if we have old-style mappings OR if MultiChannelForwarder is monitoring this channel
    const client = message.client as any;
    const hasMultiChannelForwarder = client.multiChannelForwarder && client.multiChannelForwarder.isChannelMonitored(message.channel.id);
    
    if (channelMappings.length === 0 && !hasMultiChannelForwarder) {
      console.log(`⏭️ Skipping - no enabled mappings and not monitored by MultiChannelForwarder for channel ${message.channel.id}`);
      return;
    }
    
    // Process messages in configured channels
    console.log(`🔍 Processing message in channel ${message.channel.id} from ${message.author.username}`);
    if (channelMappings.length > 0) {
      console.log(`📋 Found ${channelMappings.length} active mapping(s) for this channel`);
    }
    if (hasMultiChannelForwarder) {
      console.log(`🏢 Channel monitored by MultiChannelForwarder`);
    }
    
    // Special handling for frontend endpoint (port 3051)
    const frontendMapping = channelMappings.find(
      mapping => mapping.systemEndpoint.includes('3051')
    );
    
    if (frontendMapping) {
      console.log(`🎯 Bot Monitor: Detected frontend endpoint, using specialized forwarder`);
      const forwarder = BotMessageForwarder.getInstance();
      await forwarder.processMessage(message, message.channel.id);
    }
    
    // NEW: Multi-Channel Forwarder for multi-firm monitoring
    // This runs in parallel with existing functionality
    try {
      const client = message.client as any;
      if (client.multiChannelForwarder && client.multiChannelForwarder.isChannelMonitored(message.channel.id)) {
        console.log(`🏢 Multi-Firm Monitor: Processing message for configured firm`);
        await client.multiChannelForwarder.processMessage(message, message.channel.id);
      }
    } catch (multiChannelError) {
      console.error('❌ Multi-Channel Forwarder error (non-blocking):', multiChannelError);
    }
    
    // Update status to show processing
    BotStatusService.processingMessages();

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

    // Special handling for Ferrovia money log channel (1414735729082499072)
    if (message.channel.id === '1414735729082499072') {
      console.log(`💰 Processing money transaction from Ferrovia money log channel`);
      console.log(`💰 Raw message content: "${message.content}"`);
      console.log(`💰 Extracted content: "${extractedContent}"`);
      console.log(`💰 Embed count: ${message.embeds.length}`);

      const moneyVerificationService = ManagerMoneyVerificationService.getInstance();

      // Extract author information from embeds or message
      let authorId = message.author.id;
      let authorName = message.author.username;

      // Check embeds for author information (more reliable for bot messages)
      if (message.embeds.length > 0) {
        for (const embed of message.embeds) {
          if (embed.fields) {
            const authorField = embed.fields.find(field => field.name.includes('Autor'));
            if (authorField) {
              // Extract name from "Jizar Stoffeliz | FIXO: 75119" format
              const authorMatch = authorField.value.match(/```prolog\n(.+?)\s*\|/);
              if (authorMatch) {
                authorName = authorMatch[1].trim();
                // TODO: Map Discord display name to user ID if needed
              }
            }
          }
        }
      }

      // Process the money transaction
      await moneyVerificationService.processMoneyTransaction(
        authorId,
        authorName,
        extractedContent || message.content,
        message.createdAt
      );
    }

    // Special handling for Farm channel money deposits (1412325130926948362)
    if (message.channel.id === '1412325130926948362') {
      console.log(`💰 Processing farm channel money transaction`);
      console.log(`💰 Raw message content: "${message.content}"`);
      console.log(`💰 Extracted content: "${extractedContent}"`);

      // Check for money deposit pattern using frontend's proven pattern
      const content = extractedContent || message.content;

      // Pattern: CAIXA ORGANIZAÇÃO - DEPÓSITO with Valor depositado:: format
      const directDepositPattern = /Valor depositado::\s*\$([0-9,.]+)\s*Autor::\s*(.+?)\s*\|\s*FIXO:\s*\d+\s*Saldo após depósito::\s*\$([0-9,.]+)/s;
      const depositMatch = content.match(directDepositPattern);

      if (depositMatch) {
        const amount = parseFloat(depositMatch[1].replace(',', '.'));
        const authorName = depositMatch[2].trim();

        console.log(`💰 Farm deposit detected: ${authorName} deposited $${amount}`);

        const moneyVerificationService = ManagerMoneyVerificationService.getInstance();

        // Process the deposit (this will handle both Ferrovia obligations and session tracking)
        await moneyVerificationService.processMoneyTransaction(
          message.author.id, // Use message author ID as fallback
          authorName,
          content,
          message.createdAt
        );
      } else {
        console.log(`💰 No farm deposit pattern matched in content`);
      }
    }

    // Send raw embed data directly to configured endpoints
    const rawEmbeds = message.embeds.map(embed => ({
      title: embed.title,
      description: embed.description,
      fields: embed.fields ? embed.fields.map(field => ({
        name: field.name,
        value: field.value,
        inline: field.inline
      })) : []
    }));
    
    // Prepare raw webhook data with extracted content
    const webhookData: WebhookData = {
      raw_embeds: rawEmbeds,
      channel_id: message.channel.id,
      author: {
        id: message.author.id,
        username: message.author.username,
        bot: message.author.bot
      },
      timestamp: message.createdAt.toISOString(),
      message_id: message.id,
      content: extractedContent // Add extracted content
    };
    
    // Parse worker activity for weekly rankings (only for worker channels)
    const workerChannelIds = [
      '1406811401036497036', // Example worker channel
      '1412325130926948362', // Farm channel
      '1414735729082499072', // Ferrovia channel
      '1416785592989257878', // Worker channels (add more as needed)
      '1416530771283546274',
      '1416847554544668815',
      '1416880519165120542'
    ];

    if (workerChannelIds.includes(message.channel.id) || hasMultiChannelForwarder) {
      parseAndUpdateWorkerActivity(extractedContent || message.content, message.author.username);
    }

    // Send to all non-frontend endpoints (backend, custom)
    const nonFrontendMappings = channelMappings.filter(
      mapping => !mapping.systemEndpoint.includes('3051')
    );

    if (nonFrontendMappings.length > 0) {
      BotStatusService.sendingData();
      await sendToConfiguredEndpoints(webhookData, nonFrontendMappings);
    }
  }
};