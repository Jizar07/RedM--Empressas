import { Events, Client, TextChannel } from 'discord.js';
import BotStatusService from '../../services/BotStatusService';

// Removed processAllChannelMessages function - was causing duplicate historical data

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    console.log(`✅ Bot is ready! Logged in as ${client.user?.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} guilds`);
    
    // Initialize dynamic status system
    BotStatusService.setClient(client);
    
    // Test channel access
    const testChannelId = '1412325130926948362';
    try {
      const channel = await client.channels.fetch(testChannelId);
      if (channel) {
        console.log(`✅ Successfully accessed channel ${testChannelId} - Type: ${channel.type}`);
        if (channel.isTextBased()) {
          console.log(`✅ Channel is text-based and bot should receive messages`);
          // Try to fetch last message
          const textChannel = channel as TextChannel;
          const messages = await textChannel.messages.fetch({ limit: 1 });
          console.log(`✅ Can fetch messages from channel - Last message: ${messages.size > 0 ? 'Found' : 'No messages'}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Cannot access channel ${testChannelId}:`, error.message);
    }
    
    // DISABLED - Don't process historical messages on startup
    // This was causing duplicate data to be sent to the webhook
    // await processAllChannelMessages(client);
  },
};