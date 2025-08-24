import fs from 'fs/promises';
import path from 'path';

interface FileStorageOptions {
  dataDir: string;
}

export class FileStorageService {
  private dataDir: string;

  constructor(options: FileStorageOptions) {
    this.dataDir = options.dataDir;
    this.ensureDataDirectory();
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${this.dataDir}`);
    }
  }

  private getFilePath(collection: string): string {
    return path.join(this.dataDir, `${collection}.json`);
  }

  async findAll<T>(collection: string): Promise<T[]> {
    try {
      const filePath = this.getFilePath(collection);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty, return empty array
      return [];
    }
  }

  async findOne<T>(collection: string, filter: (item: T) => boolean): Promise<T | null> {
    const items = await this.findAll<T>(collection);
    return items.find(filter) || null;
  }

  async findById<T extends { _id?: string }>(collection: string, id: string): Promise<T | null> {
    return this.findOne<T>(collection, (item) => item._id === id);
  }

  async create<T extends { _id?: string }>(collection: string, data: Omit<T, '_id'>): Promise<T> {
    const items = await this.findAll<T>(collection);
    const newItem = {
      ...data,
      _id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as T;

    items.push(newItem);
    await this.saveCollection(collection, items);
    return newItem;
  }

  async updateById<T extends { _id?: string }>(
    collection: string,
    id: string,
    update: Partial<T>
  ): Promise<T | null> {
    const items = await this.findAll<T>(collection);
    const index = items.findIndex((item) => item._id === id);
    
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...update,
      updatedAt: new Date().toISOString(),
    };

    await this.saveCollection(collection, items);
    return items[index];
  }

  async deleteById<T extends { _id?: string }>(collection: string, id: string): Promise<boolean> {
    const items = await this.findAll<T>(collection);
    const initialLength = items.length;
    const filteredItems = items.filter((item) => item._id !== id);
    
    if (filteredItems.length === initialLength) return false;

    await this.saveCollection(collection, filteredItems);
    return true;
  }

  async count(collection: string): Promise<number> {
    const items = await this.findAll(collection);
    return items.length;
  }

  private async saveCollection<T>(collection: string, items: T[]): Promise<void> {
    const filePath = this.getFilePath(collection);
    await fs.writeFile(filePath, JSON.stringify(items, null, 2));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Global instance
let fileStorageInstance: FileStorageService | null = null;

export function getFileStorage(): FileStorageService {
  if (!fileStorageInstance) {
    fileStorageInstance = new FileStorageService({
      dataDir: path.join(process.cwd(), 'data'),
    });
  }
  return fileStorageInstance;
}

export default FileStorageService;