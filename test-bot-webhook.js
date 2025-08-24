const axios = require('axios');

async function testBotWebhookConnection() {
  console.log('🧪 Testing Bot Webhook Connection');
  console.log('=================================\n');
  
  // Test with a webhook test service first
  const testUrl = 'https://webhook.site/unique'; // Replace with actual webhook.site URL
  
  try {
    console.log('📡 Testing bot force-sync with webhook.site...');
    
    const response = await axios.post('http://localhost:3050/api/force-sync/trigger', {
      channelId: '1404583987778949130',
      limit: 5,
      webhookUrl: testUrl
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    if (response.data.success) {
      console.log('✅ Bot webhook works with external service!');
      console.log('❌ Issue: Bot cannot reach localhost:8086 from its process');
      console.log('\n🔧 SOLUTION: Webbased system firewall/binding issue');
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Bot API error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Bot connection error:', error.message);
    }
  }
  
  // Test direct connection to webbased
  try {
    console.log('\n📡 Testing direct connection to webbased...');
    
    const directTest = await axios.post('http://localhost:8086/api/bot-data/channel-logs', {
      channelId: '1404583987778949130',
      messages: [{
        id: 'direct_test_' + Date.now(),
        author: 'DirectTest',
        content: 'Direct connection test',
        timestamp: new Date().toISOString(),
        raw_embeds: []
      }]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('✅ Direct connection to webbased works!');
    console.log('❌ Issue: Bot process cannot reach webbased process');
    
  } catch (error) {
    console.log('❌ Direct connection also fails:', error.message);
  }
}

testBotWebhookConnection();