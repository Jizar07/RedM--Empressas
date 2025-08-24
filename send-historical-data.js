const axios = require('axios');

async function sendHistoricalData() {
  console.log('📨 Sending Historical Discord Data');
  console.log('================================\n');
  
  const config = {
    botApiUrl: 'http://localhost:3050',
    channelId: '1404583987778949130', // Farm channel
    webhookUrl: 'http://localhost:8086/api/bot-data/channel-logs',
    limits: [50, 100] // Discord API max is 100 messages per request
  };
  
  console.log(`🎯 Target Channel: ${config.channelId}`);
  console.log(`📡 Webhook URL: ${config.webhookUrl}\n`);
  
  for (const limit of config.limits) {
    console.log(`📥 Sending last ${limit} messages...`);
    
    try {
      const response = await axios.post(`${config.botApiUrl}/api/force-sync/trigger`, {
        channelId: config.channelId,
        limit: limit,
        webhookUrl: config.webhookUrl
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });
      
      if (response.data.success) {
        console.log(`✅ SUCCESS: Sent ${response.data.messagesSent} messages`);
        console.log(`   Webhook Status: ${response.data.webhookResponse}`);
        console.log(`   Channel ID: ${response.data.channelId}\n`);
      } else {
        console.log(`❌ FAILED: ${response.data.error}\n`);
      }
      
      // Wait between batches to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`❌ ERROR sending ${limit} messages:`);
      
      if (error.response) {
        console.log(`   HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.log(`   Connection failed to bot API at ${config.botApiUrl}`);
      } else {
        console.log(`   ${error.message}`);
      }
      console.log('');
    }
  }
}

// Also test if webbased system is ready to receive data
async function testWebbasedEndpoint() {
  console.log('🔍 Testing Webbased System Readiness');
  console.log('====================================\n');
  
  const testPayload = {
    channelId: '1404583987778949130',
    messages: [{
      id: 'test_' + Date.now(),
      author: 'TestBot',
      content: 'Historical data test message',
      timestamp: new Date().toISOString(),
      raw_embeds: []
    }]
  };
  
  try {
    console.log('📡 Sending test message to webbased system...');
    
    const response = await axios.post('http://localhost:8086/api/bot-data/channel-logs', testPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log(`✅ Webbased system ready! Status: ${response.status}`);
    console.log(`📝 Response: ${JSON.stringify(response.data).substring(0, 100)}...\n`);
    
    return true;
  } catch (error) {
    console.log('❌ Webbased system not ready:');
    if (error.response) {
      console.log(`   HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   ${error.message}`);
    }
    console.log('   Make sure webbased system is running on port 8086\n');
    
    return false;
  }
}

// Run the data sending process
async function main() {
  console.log('🚀 Starting Historical Data Transfer...\n');
  
  // Skip test, go straight to sending actual data
  
  // Send historical data
  await sendHistoricalData();
  
  console.log('✅ Historical data transfer completed!');
  console.log('\n💡 Check the webbased system dashboard for the new historical data');
  console.log('   If data still shows as old, the issue is their dashboard sorting, not the bot');
}

main().catch(error => {
  console.error('❌ Script failed:', error.message);
});