console.log('=== LOCALSTORAGE QUOTA FIX ===');
console.log('Run this in your browser console on the frontend:');
console.log(`
// Clear all localStorage data first
localStorage.clear();
console.log('✅ Cleared all localStorage');

// Force page refresh to start fresh
window.location.reload();
`);