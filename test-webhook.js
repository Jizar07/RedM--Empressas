// Simple test script to test the webhook functionality
const axios = require('axios');

const API_BASE = 'http://localhost:3050/api/webhook';

async function testWebhook() {
  console.log('🧪 Testing webhook functionality...\n');

  // Test 1: Create/Update a message
  console.log('📤 Test 1: Creating/updating a message...');
  try {
    const response = await axios.post(`${API_BASE}/update-message`, {
      channelId: '1404492813290442902',
      messageType: 'server_status',
      title: '🔴 Server Status',
      description: 'RedM Server is currently **OFFLINE**',
      fields: [
        {
          name: 'Players',
          value: '0/32',
          inline: true
        },
        {
          name: 'Last Updated',
          value: new Date().toLocaleString(),
          inline: true
        }
      ],
      color: 0xff0000 // Red color
    });
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  // Wait a bit before next test
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Update the same message
  console.log('\n📤 Test 2: Updating the same message...');
  try {
    const response = await axios.post(`${API_BASE}/update-message`, {
      channelId: '1404492813290442902',
      messageType: 'server_status',
      title: '🟢 Server Status',
      description: 'RedM Server is now **ONLINE**',
      fields: [
        {
          name: 'Players',
          value: '15/32',
          inline: true
        },
        {
          name: 'Last Updated',
          value: new Date().toLocaleString(),
          inline: true
        }
      ],
      color: 0x00ff00 // Green color
    });
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  // Test 3: Check managed messages
  console.log('\n📋 Test 3: Getting managed messages...');
  try {
    const response = await axios.get(`${API_BASE}/managed-messages`);
    console.log('✅ Managed messages:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  // Test 4: Create a different message type
  console.log('\n📤 Test 4: Creating a different message type...');
  try {
    const response = await axios.post(`${API_BASE}/update-message`, {
      channelId: '1404492813290442902',
      messageType: 'announcements',
      title: '📢 Server Announcement',
      description: 'Welcome to the RedM server! New update available.',
      color: 0x0099ff // Blue color
    });
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  console.log('\n🎉 Testing completed!');
}

// Run the test
if (require.main === module) {
  testWebhook().catch(console.error);
}

module.exports = { testWebhook };