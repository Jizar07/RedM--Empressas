const fs = require('fs');

// Read the messages file
const messagesPath = 'C:/Users/jizar/OneDrive/Documents/DiscordBot/frontend/public/discord-messages.json';
const data = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

console.log('Original message count:', data.messages.length);

// Remove test users
const testUsers = ['TestUser', 'SSETestUser', 'LiveTestUser'];
const filteredMessages = data.messages.filter(msg => 
  !testUsers.includes(msg.author) && 
  msg.channelId !== 'test123' &&
  !msg.content.includes('Test notification message')
);

console.log('After removing test users:', filteredMessages.length);

// Update the data
data.messages = filteredMessages;
data.totalMessages = filteredMessages.length;
data.lastUpdated = new Date().toISOString();

// Write back
fs.writeFileSync(messagesPath, JSON.stringify(data, null, 2));
console.log('✅ Cleaned up test users from messages');