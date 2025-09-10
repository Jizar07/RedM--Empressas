// Clean up duplicate users and payments with wrong IDs

// Clear the webhook queue first
fetch('http://localhost:3051/api/webhook/farm-payment', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
}).then(() => {
  console.log('✅ Cleared payment webhook queue');
}).catch(console.error);

console.log('Run this in browser console on the frontend:');
console.log(`
// Clear localStorage data
localStorage.removeItem('fazenda_pagamentos');
localStorage.removeItem('fazenda_usuarios');
console.log('✅ Cleared localStorage data');

// Force page refresh
window.location.reload();
`);