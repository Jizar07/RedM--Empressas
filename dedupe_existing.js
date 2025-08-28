const fs = require('fs');

// Same deduplication logic as in the webhook
function createDedupeKey(msg) {
  const content = msg.content || '';
  
  // Extract username
  const usernameMatch = content.match(/Autor:\s*([^|\n]+)/);
  const username = usernameMatch ? usernameMatch[1].trim() : msg.author;
  
  // Extract exact timestamp (main pivot for duplications)
  const timestampMatch = content.match(/(\d{2}\/\d{2}\/\d{4},\s*\d{2}:\d{2}:\d{2})/);
  const exactTimestamp = timestampMatch ? timestampMatch[1] : '';
  
  // For inventory actions: extract quantity and item
  const quantityMatch = content.match(/(\d+)x/);
  const quantity = quantityMatch ? quantityMatch[1] : '';
  
  const itemMatch = content.match(/Item\s+(?:adicionado|removido):\s*([^\n]+)/);
  const item = itemMatch ? itemMatch[1].trim() : '';
  
  // For money transactions: extract amount
  const moneyMatch = content.match(/\$(\d+\.?\d*)/);
  const amount = moneyMatch ? moneyMatch[1] : '';
  
  // For animal sales: extract animal count
  const animalMatch = content.match(/(\d+)\s+animais/);
  const animalCount = animalMatch ? animalMatch[1] : '';
  
  // Create unique key based on user, timestamp, and transaction details
  return `${username}|${exactTimestamp}|${quantity}|${item}|${amount}|${animalCount}`;
}

// Read the messages file
const messagesPath = 'C:/Users/jizar/OneDrive/Documents/DiscordBot/frontend/public/discord-messages.json';
const data = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

console.log('Original message count:', data.messages.length);

// Remove duplicates using the same logic as the webhook
const seen = new Set();
const uniqueMessages = [];

data.messages.forEach((msg, index) => {
  const key = createDedupeKey(msg);
  if (!seen.has(key)) {
    seen.add(key);
    uniqueMessages.push(msg);
  } else {
    console.log(`Removing duplicate [${index}]:`, msg.author, '|', key);
  }
});

console.log('After removing duplicates:', uniqueMessages.length);
console.log('Removed:', data.messages.length - uniqueMessages.length, 'duplicates');

// Update the data
data.messages = uniqueMessages;
data.totalMessages = uniqueMessages.length;
data.lastUpdated = new Date().toISOString();

// Write back
fs.writeFileSync(messagesPath, JSON.stringify(data, null, 2));
console.log('✅ Removed duplicates from existing messages');