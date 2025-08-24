import { getFileStorage } from './FileStorageService';

export async function connectDatabase(): Promise<void> {
  try {
    // Initialize file-based storage
    getFileStorage();
    console.log('✅ Connected to file-based storage');
  } catch (error) {
    console.error('❌ Failed to initialize file storage:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    console.log('✅ File storage closed');
  } catch (error) {
    console.error('❌ Error closing file storage:', error);
  }
}