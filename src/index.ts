import { BotClient } from './bot/BotClient';
import config, { validateConfig } from './config/config';
import { startApiServer } from './api/server';
import { connectDatabase } from './services/DatabaseService';

async function main() {
  try {
    console.log('🚀 Starting RedM Discord Bot...');
    console.log('📝 Version: 0.001');
    console.log('🌍 Environment:', config.environment.nodeEnv);
    
    // Validate configuration
    validateConfig();
    
    // Connect to database
    console.log('🔗 Connecting to database...');
    await connectDatabase();
    
    // Initialize Discord bot
    const bot = new BotClient();
    await bot.init();
    
    // Start API server
    console.log('🌐 Starting API server...');
    await startApiServer(bot);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⏹️ Shutting down gracefully...');
      bot.destroy();
      process.exit(0);
    });
    
    process.on('unhandledRejection', (error: Error) => {
      console.error('❌ Unhandled promise rejection:', error);
    });
    
    process.on('uncaughtException', (error: Error) => {
      console.error('❌ Uncaught exception:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

main();