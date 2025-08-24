import { Events, Client } from 'discord.js';
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
    
    // DISABLED - Don't process historical messages on startup
    // This was causing duplicate data to be sent to the webhook
    // await processAllChannelMessages(client);
  },
};