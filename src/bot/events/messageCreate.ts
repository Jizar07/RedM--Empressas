import { Events, Message } from 'discord.js';
import { loadConfig, ChannelLogMapping } from '../../api/routes/channel-logs-config';
import BotStatusService from '../../services/BotStatusService';

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
    
    if (channelMappings.length === 0) {
      console.log(`⏭️ Skipping - no enabled mappings for channel ${message.channel.id}`);
      return;
    }
    
    // Process messages in configured channels
    console.log(`🔍 Processing message in configured channel ${message.channel.id} from ${message.author.username}`);
    console.log(`📋 Found ${channelMappings.length} active mapping(s) for this channel`);
    
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
    
    // Send to all configured endpoints for this channel
    BotStatusService.sendingData();
    await sendToConfiguredEndpoints(webhookData, channelMappings);
  }
};