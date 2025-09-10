// Script to remove users with channel IDs from frontend

const frontendUrl = 'http://localhost:3051';

// Function to check if an ID looks like a Discord channel ID (long numeric string)
function isChannelId(id) {
  // Channel IDs are typically 18-19 digit numbers
  return /^\d{18,19}$/.test(id);
}

// Clear payments with channel IDs as user IDs
async function cleanupChannelIdPayments() {
  try {
    const response = await fetch(`${frontendUrl}/api/webhook/farm-payment`);
    if (response.ok) {
      const data = await response.json();
      const paymentsToDelete = data.payments.filter(payment => isChannelId(payment.userId));
      
      if (paymentsToDelete.length > 0) {
        console.log(`Found ${paymentsToDelete.length} payments with channel IDs to remove`);
        
        const receiptIds = paymentsToDelete.map(p => p.receiptId);
        await fetch(`${frontendUrl}/api/webhook/farm-payment`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiptIds })
        });
        
        console.log('✅ Cleaned up payments with channel IDs');
      } else {
        console.log('No payments with channel IDs found');
      }
    }
  } catch (error) {
    console.error('Error cleaning payments:', error);
  }
}

console.log('=== CLEANUP SCRIPT ===');
console.log('1. First run this to clean payments:');
cleanupChannelIdPayments();

console.log('\n2. Then run this in your browser console on the frontend:');
console.log(`
// Get current data
const usuarios = JSON.parse(localStorage.getItem('fazenda_usuarios') || '{"usuarios":{}, "funcoes":{}}');
const pagamentos = JSON.parse(localStorage.getItem('fazenda_pagamentos') || '{"usuarios":{}}');

// Function to check if ID is a channel ID
function isChannelId(id) {
  return /^\\d{18,19}$/.test(id);
}

// Clean users - remove those with channel IDs
let cleanedUsers = false;
const newUsuarios = { ...usuarios };
Object.keys(newUsuarios.usuarios).forEach(userId => {
  if (isChannelId(userId)) {
    console.log('Removing user with channel ID:', userId, newUsuarios.usuarios[userId].nome);
    delete newUsuarios.usuarios[userId];
    cleanedUsers = true;
  }
});

// Clean funcoes - remove channel ID references
Object.keys(newUsuarios.funcoes).forEach(funcao => {
  newUsuarios.funcoes[funcao] = newUsuarios.funcoes[funcao].filter(userId => !isChannelId(userId));
});

// Clean payments - remove those with channel IDs
let cleanedPayments = false;
const newPagamentos = { ...pagamentos };
Object.keys(newPagamentos.usuarios).forEach(userId => {
  if (isChannelId(userId)) {
    console.log('Removing payments for channel ID:', userId);
    delete newPagamentos.usuarios[userId];
    cleanedPayments = true;
  }
});

// Save cleaned data
if (cleanedUsers) {
  localStorage.setItem('fazenda_usuarios', JSON.stringify(newUsuarios));
  console.log('✅ Cleaned users');
}

if (cleanedPayments) {
  localStorage.setItem('fazenda_pagamentos', JSON.stringify(newPagamentos));
  console.log('✅ Cleaned payments');
}

if (cleanedUsers || cleanedPayments) {
  console.log('🔄 Refreshing page...');
  window.location.reload();
} else {
  console.log('ℹ️ No channel ID users found to clean');
}
`);