require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

async function syncExistingPayments() {
  try {
    const frontendUrl = 'http://localhost:3051';
    
    const guild = client.guilds.cache.get('1205749564775211049'); // Your guild ID
    if (!guild) {
      console.error('Guild not found');
      return;
    }

    await guild.channels.fetch(); // Fetch all channels
    await guild.members.fetch(); // Fetch all members
    
    // Get all channels that look like worker channels (🌾・name format)
    const workerChannels = guild.channels.cache.filter(channel => 
      channel.isTextBased() && 
      channel.name && 
      channel.name.startsWith('🌾・')
    );

    console.log(`Found ${workerChannels.size} worker channels:`, workerChannels.map(c => c.name).join(', '));

    for (const [channelId, channel] of workerChannels) {
      try {
        console.log(`Checking channel: ${channel.name}`);
        
        // Special logging for Boris
        if (channel.name.includes('boris')) {
          console.log(`🔍 DETAILED CHECK FOR BORIS CHANNEL`);
        }
        
        // Fetch recent messages
        const messages = await channel.messages.fetch({ limit: 100 });
        
        // Look for "PAGAMENTO PROCESSADO" messages
        for (const [messageId, message] of messages) {
          if (channel.name.includes('boris')) {
            console.log(`Boris message created: ${message.createdAt}, content: ${message.content || 'embed'}, embeds: ${message.embeds.length}`);
            if (message.embeds.length > 0) {
              console.log(`Boris embed title: "${message.embeds[0].title}"`);
              console.log(`Boris embed description: "${message.embeds[0].description}"`);
            }
          }
          
          if (message.embeds.length > 0) {
            const embed = message.embeds[0];
            
            if (embed.title && embed.title.includes('PAGAMENTO PROCESSADO')) {
              console.log(`Found payment message for ${channel.name}`);
              
              // Extract payment info from embed
              const description = embed.description || '';
              const playerName = description.match(/\*\*Trabalhador:\*\* (.+)/)?.[1];
              const totalPaid = description.match(/\*\*Total Pago:\*\* \$([0-9.]+)/)?.[1];
              const servicesCount = description.match(/\*\*Serviços Realizados:\*\* ([0-9]+)/)?.[1];
              const paidBy = description.match(/\*\*💳 Pago por:\*\* (.+)/)?.[1];
              
              if (playerName && totalPaid && servicesCount) {
                // Extract actual Discord user ID from channel name or find user by name
                const playerNameFormatted = playerName.toLowerCase().replace(/\s+/g, '-');
                const expectedChannelName = `🌾・${playerNameFormatted}`;
                
                // Try to find the actual Discord user ID by searching guild members
                const guild = client.guilds.cache.first();
                let actualUserId = channelId; // fallback to channel ID
                
                if (guild) {
                  const member = guild.members.cache.find(m => 
                    m.displayName.toLowerCase() === playerName.toLowerCase() ||
                    m.user.username.toLowerCase() === playerName.toLowerCase()
                  );
                  if (member) {
                    actualUserId = member.id;
                    console.log(`Found Discord user ID for ${playerName}: ${actualUserId}`);
                  } else {
                    console.log(`Could not find Discord user for ${playerName}, using channel ID`);
                  }
                }
                
                const paymentData = {
                  userId: actualUserId,
                  userName: playerName,
                  payment: parseFloat(totalPaid),
                  serviceType: 'mixed',
                  itemType: `${servicesCount} services`,
                  quantity: parseInt(servicesCount),
                  receiptId: `sync_${channelId}_${message.id}`,
                  approvedBy: 'System',
                  paidBy: paidBy || 'Unknown',
                  timestamp: message.createdAt.toISOString(),
                  description: `Synced payment for ${servicesCount} services`
                };

                console.log(`Syncing payment: ${playerName} - $${totalPaid}`);
                
                const response = await fetch(`${frontendUrl}/api/webhook/farm-payment`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(paymentData)
                });

                if (response.ok) {
                  console.log(`✅ Synced ${playerName} payment`);
                } else {
                  console.error(`❌ Failed to sync ${playerName}: ${response.status}`);
                }
              }
            }
          }
        }
        
      } catch (error) {
        console.error(`Error processing channel ${channel.name}:`, error);
      }
    }
    
    console.log('Finished syncing existing payments');
    process.exit(0);
    
  } catch (error) {
    console.error('Error syncing payments:', error);
    process.exit(1);
  }
}

client.once('ready', () => {
  console.log('Bot connected, syncing existing payments...');
  syncExistingPayments();
});

client.login(process.env.DISCORD_TOKEN);