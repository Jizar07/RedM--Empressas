import { Client, GatewayIntentBits } from 'discord.js';
import config from './config/config';

async function testBot() {
  console.log('🔧 Testing Discord Bot Connection...\n');
  
  // Check if token is provided
  if (!config.discord.token) {
    console.error('❌ No Discord token found in .env file');
    process.exit(1);
  }
  
  console.log('✅ Discord Token found');
  console.log('📝 Client ID:', config.discord.clientId);
  
  // Create a simple client to test the connection
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });
  
  client.once('ready', () => {
    console.log('\n✅ Bot connected successfully!');
    console.log('🤖 Bot Username:', client.user?.tag);
    console.log('🆔 Bot ID:', client.user?.id);
    console.log('📊 Connected to', client.guilds.cache.size, 'server(s)');
    
    if (client.guilds.cache.size > 0) {
      console.log('\n📋 Servers:');
      client.guilds.cache.forEach(guild => {
        console.log(`  - ${guild.name} (ID: ${guild.id})`);
      });
    } else {
      console.log('\n⚠️  Bot is not in any servers yet.');
      console.log('Use this link to invite the bot:');
      console.log(`https://discord.com/oauth2/authorize?client_id=${config.discord.clientId}&permissions=8&integration_type=0&scope=bot+applications.commands`);
    }
    
    console.log('\n✅ Test complete! You can now run: npm run dev');
    client.destroy();
    process.exit(0);
  });
  
  client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
    process.exit(1);
  });
  
  // Try to login
  try {
    await client.login(config.discord.token);
  } catch (error) {
    console.error('❌ Failed to login:', error);
    console.error('\n📝 Please check:');
    console.error('  1. Your bot token is correct');
    console.error('  2. The bot hasn\'t been deleted');
    console.error('  3. You have internet connection');
    process.exit(1);
  }
}

testBot().catch(console.error);