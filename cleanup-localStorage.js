// Run this in browser console to clean up localStorage
console.log('Cleaning up localStorage...');

// Remove old deleted users data
localStorage.removeItem('fazenda_deleted_users');
localStorage.removeItem('fazenda_manually_deleted_users');
localStorage.removeItem('fazenda_deleted_user_timestamps');

// List all firms and remove their deleted users data too
const allKeys = Object.keys(localStorage);
const deletedUsersKeys = allKeys.filter(key => 
  key.endsWith('_deleted_users') || 
  key.endsWith('_manually_deleted_users') ||
  key.endsWith('_deleted_user_timestamps')
);

deletedUsersKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

console.log('Cleaned up:');
console.log('- fazenda_deleted_users');
console.log('- fazenda_manually_deleted_users'); 
console.log('- fazenda_deleted_user_timestamps');
console.log(`- ${deletedUsersKeys.length} firm-specific deletion tracking data`);
console.log('localStorage cleanup complete!');