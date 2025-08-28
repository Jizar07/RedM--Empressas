import { Message } from 'discord.js';

interface ProcessedMessage {
  id: string;
  timestamp: string;
  author: string;
  content: string;
  source: 'bot-monitor';
  channelId: string;
  // Additional fields from embeds
  embedContent?: string;
  rawEmbeds?: any[];
}

export class BotMessageForwarder {
  private static instance: BotMessageForwarder;
  private frontendEndpoint: string = 'http://localhost:3051/api/webhook/channel-messages';
  private processedMessageIds = new Set<string>();

  private constructor() {}

  static getInstance(): BotMessageForwarder {
    if (!BotMessageForwarder.instance) {
      BotMessageForwarder.instance = new BotMessageForwarder();
    }
    return BotMessageForwarder.instance;
  }

  /**
   * Process and forward a Discord message to the frontend
   * Handles the bot's format with embeds differently than the extension
   */
  async processMessage(message: Message, channelId: string): Promise<void> {
    try {
      // Skip if already processed
      if (this.processedMessageIds.has(message.id)) {
        console.log(`⏭️ Bot Monitor: Skipping already processed message ${message.id}`);
        return;
      }

      // Extract content from message and embeds
      let extractedContent = message.content || '';
      let realAuthor = message.author.username; // Default to bot username
      const embedContents: string[] = [];
      
      // Process embeds if present (bot-specific format)
      if (message.embeds && message.embeds.length > 0) {
        for (const embed of message.embeds) {
          const parts: string[] = [];
          
          // Build the same format as the extension sees
          if (embed.author?.name) {
            parts.push(`REGISTRO - ${embed.author.name}`);
          }
          
          if (embed.title) {
            parts.push(embed.title);
          }
          
          if (embed.description) {
            parts.push(embed.description);
          }
          
          // Process fields - this is where the farm data usually is
          if (embed.fields && embed.fields.length > 0) {
            for (const field of embed.fields) {
              // Clean up field values (remove code blocks)
              const cleanValue = field.value
                .replace(/```prolog\n|```/g, '')
                .replace(/`/g, '')
                .trim();
              
              // Clean field name - remove leading/trailing colons and spaces
              const cleanFieldName = field.name
                .replace(/`/g, '')
                .replace(/^:+\s*/, '') // Remove leading colons and spaces
                .replace(/\s*:+$/, '') // Remove trailing colons and spaces
                .trim();
              
              // Look for "Autor" field to get real username
              if (cleanFieldName.toLowerCase() === 'autor' || cleanFieldName.toLowerCase().includes('autor')) {
                // Extract the actual author, removing any colons prefix and FIXO part
                realAuthor = cleanValue
                  .replace(/^:+\s*/, '') // Remove leading colons
                  .split('|')[0] // Take only part before | (removes | FIXO: 75119)
                  .trim();
                console.log(`🔍 Bot Monitor: Found real author: "${realAuthor}" from Autor field (cleaned from "${cleanValue}")`);
              }
              
              // For animal service completions: Look for "Ação" field if no Autor field found
              if ((cleanFieldName.toLowerCase() === 'ação' || cleanFieldName.toLowerCase() === 'acao') && realAuthor === message.author.username) {
                // Only extract from Ação if we haven't found an Autor field yet (still using bot username)
                // And only if this is a CAIXA DEPÓSITO message (animal service)
                const isAnimalService = parts.some(part => part.includes('CAIXA ORGANIZAÇÃO') && part.includes('DEPÓSITO'));
                if (isAnimalService) {
                  // Extract author from "Jizar Stoffeliz vendeu X animais no matadouro"
                  const animalServiceMatch = cleanValue.match(/^(.+?)\s+vendeu\s+\d+\s+animais\s+no\s+matadouro/);
                  if (animalServiceMatch) {
                    realAuthor = animalServiceMatch[1].trim();
                    console.log(`🔍 Bot Monitor: Found animal service author: "${realAuthor}" from Ação field (action: "${cleanValue}")`);
                  }
                }
              }
              
              // Format as "FieldName: Value" but clean both sides
              parts.push(`${cleanFieldName}: ${cleanValue}`);
            }
          }
          
          if (parts.length > 0) {
            embedContents.push(parts.join('\n'));
          }
        }
        
        // If no regular content but has embed content, use that
        if (!extractedContent && embedContents.length > 0) {
          extractedContent = embedContents.join('\n\n');
        }
      }

      // Skip empty messages
      if (!extractedContent.trim()) {
        console.log(`⏭️ Bot Monitor: Skipping empty message ${message.id}`);
        return;
      }

      // Create message in the same format as the extension
      const processedMessage: ProcessedMessage = {
        id: message.id,
        timestamp: message.createdAt.toISOString(),
        author: realAuthor, // Use the extracted real author
        content: extractedContent,
        source: 'bot-monitor',
        channelId: channelId,
        embedContent: embedContents.join('\n\n'),
        rawEmbeds: message.embeds.map(embed => ({
          title: embed.title,
          description: embed.description,
          fields: embed.fields?.map(f => ({
            name: f.name,
            value: f.value,
            inline: f.inline
          }))
        }))
      };

      // Mark as processed
      this.processedMessageIds.add(message.id);
      
      // Send to frontend webhook (same endpoint as extension)
      await this.sendToFrontend(processedMessage);
      
      console.log(`✅ Bot Monitor: Forwarded message ${message.id} to frontend`);
      
    } catch (error) {
      console.error(`❌ Bot Monitor: Error processing message ${message.id}:`, error);
    }
  }

  /**
   * Send processed message to frontend
   * Uses the same format as the extension for compatibility
   */
  private async sendToFrontend(message: ProcessedMessage): Promise<void> {
    try {
      const payload = {
        channelId: message.channelId,
        messages: [message]
      };

      const response = await fetch(this.frontendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Frontend responded with status ${response.status}`);
      }

      console.log(`📡 Bot Monitor: Sent to frontend - ${message.content.substring(0, 50)}...`);
      
    } catch (error) {
      console.error('❌ Bot Monitor: Failed to send to frontend:', error);
    }
  }

  /**
   * Clear processed messages cache (useful for testing)
   */
  clearCache(): void {
    this.processedMessageIds.clear();
    console.log('🗑️ Bot Monitor: Cleared processed messages cache');
  }

  /**
   * Update frontend endpoint if needed
   */
  setFrontendEndpoint(endpoint: string): void {
    this.frontendEndpoint = endpoint;
    console.log(`🔧 Bot Monitor: Updated frontend endpoint to ${endpoint}`);
  }
}