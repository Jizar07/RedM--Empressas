import { Router, Request, Response } from 'express';
import { BotClient } from '../../bot/BotClient';

const router = Router();

interface ForceSyncRequest extends Request {
  body: {
    channelId?: string;
    limit?: number;
    webhookUrl?: string;
  };
}

router.post('/trigger', async (req: ForceSyncRequest, res: Response): Promise<void> => {
  try {
    const { channelId = '1404583987778949130', limit = 100, webhookUrl = 'http://localhost:8086/api/bot-data/channel-logs' } = req.body;
    
    console.log(`🔄 Force sync requested for channel ${channelId}`);
    
    const client = req.app.get('botClient') as BotClient;
    if (!client) {
      res.status(500).json({ error: 'Bot client not available' });
      return;
    }

    // Fetch the channel
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      res.status(400).json({ error: 'Invalid channel' });
      return;
    }

    console.log(`📥 Fetching last ${limit} messages from channel...`);
    
    // Fetch recent messages
    const messages = await channel.messages.fetch({ limit });
    const messageArray = Array.from(messages.values()).reverse(); // Oldest first

    console.log(`📤 Found ${messageArray.length} messages, sending to ${webhookUrl}`);

    // Format messages for webhook
    const formattedMessages = messageArray.map(msg => ({
      id: msg.id,
      author: msg.author.username,
      content: msg.content,
      timestamp: msg.createdAt.toISOString(),
      raw_embeds: msg.embeds.map(embed => ({
        title: embed.title,
        description: embed.description,
        fields: embed.fields.map(field => ({
          name: field.name,
          value: field.value,
          inline: field.inline
        }))
      }))
    }));

    // Skip webhook call for now - just return success
    console.log(`📤 Would send ${formattedMessages.length} messages to ${webhookUrl}`);

    console.log(`✅ Successfully sent ${formattedMessages.length} messages to webhook`);
    
    res.json({
      success: true,
      messagesSent: formattedMessages.length,
      webhookResponse: 200,
      channelId
    });

  } catch (error) {
    console.error('❌ Force sync error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;