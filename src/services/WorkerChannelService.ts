import { Client } from 'discord.js';
import { promises as fs } from 'fs';
import path from 'path';
import WorkerActivityService from './WorkerActivityService';
import ItemTranslationService from './ItemTranslationService';

interface WorkerChannelMapping {
  workerId: string;
  workerName: string;
  channelId: string;
  registrationId?: string;
  createdAt: Date;
  lastActive?: Date;
}

interface TransactionData {
  workerName: string;
  type: 'seed_taken' | 'plant_deposited' | 'animals_taken' | 'delivery_completed' | 'bercario_purchase' | 'inventory_added' | 'inventory_removed';
  itemName?: string;
  itemCategory?: string; // plantas, materiais, produtos, caixas, animais, sementes, outros
  animalType?: string;
  quantity: number;
  amount?: number;
  cost?: number;
  timestamp: Date;
  originalMessage: any;
}

export class WorkerChannelService {
  private static instance: WorkerChannelService | null = null;

  // @ts-ignore - Used in child services
  private client: Client;
  private workerMappings: Map<string, WorkerChannelMapping> = new Map();
  private activityService: WorkerActivityService;
  private dataDir: string;
  private translationService: ItemTranslationService;

  private constructor(client: Client) {
    this.client = client;
    this.dataDir = path.join(process.cwd(), 'data', 'worker-channels');
    this.activityService = new WorkerActivityService(client);
    this.translationService = ItemTranslationService.getInstance();

    // Initialize async operations
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.ensureDataDirectory();
    await this.loadWorkerMappings();
  }

  public static getInstance(client?: Client): WorkerChannelService {
    if (!WorkerChannelService.instance) {
      if (!client) {
        throw new Error('WorkerChannelService: Client required for first initialization');
      }
      WorkerChannelService.instance = new WorkerChannelService(client);
      console.log('🔧 WorkerChannelService: Created singleton instance');
    }
    return WorkerChannelService.instance;
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log('📁 Created worker channels directory');
    } catch (error) {
      // Directory already exists or other error
      if ((error as any).code !== 'EEXIST') {
        console.error('❌ Error creating worker channels directory:', error);
      }
    }
  }

  private async loadWorkerMappings(): Promise<void> {
    try {
      const mappingsFile = path.join(this.dataDir, 'worker-mappings.json');

      try {
        const data = await fs.readFile(mappingsFile, 'utf8');
        const mappings = JSON.parse(data);

        // Clear existing mappings before reloading
        this.workerMappings.clear();

        // Convert to Map and restore Date objects
        Object.entries(mappings).forEach(([key, mapping]: [string, any]) => {
          mapping.createdAt = new Date(mapping.createdAt);
          if (mapping.lastActive) {
            mapping.lastActive = new Date(mapping.lastActive);
          }
          this.workerMappings.set(key, mapping);
        });

        console.log(`🗺️ Loaded ${this.workerMappings.size} worker channel mappings`);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log('📝 No existing worker mappings file, starting fresh');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Error loading worker mappings:', error);
    }
  }

  /**
   * Reload worker mappings from file - useful after new registrations
   */
  public async reloadMappings(): Promise<void> {
    console.log('🔄 Reloading worker mappings from file...');
    await this.loadWorkerMappings();
    console.log(`✅ Reloaded ${this.workerMappings.size} worker mappings`);
  }

  private async saveWorkerMappings(): Promise<void> {
    try {
      const mappingsFile = path.join(this.dataDir, 'worker-mappings.json');
      const tempFile = mappingsFile + '.tmp';
      const mappings = Object.fromEntries(this.workerMappings);

      // Write to temp file first, then atomic rename
      await fs.writeFile(tempFile, JSON.stringify(mappings, null, 2));
      await fs.rename(tempFile, mappingsFile);

      console.log('💾 Saved worker mappings to file');
    } catch (error) {
      console.error('❌ Error saving worker mappings:', error);
    }
  }

  // Enhanced: Channel name normalization function
  private normalizeToChannelName(name: string): string {
    // Convert name to Discord channel naming convention:
    // - Lowercase
    // - Spaces to hyphens
    // - Remove special characters that Discord doesn't allow
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')           // Spaces to hyphens
      .replace(/[^a-z0-9\-_]/g, '')   // Remove special chars except hyphens and underscores
      .replace(/-+/g, '-')            // Multiple hyphens to single hyphen
      .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
  }

  public async registerWorkerChannel(workerId: string, workerName: string, channelId: string, registrationId?: string): Promise<void> {
    const mapping: WorkerChannelMapping = {
      workerId,
      workerName,
      channelId,
      registrationId,
      createdAt: new Date()
    };

    this.workerMappings.set(workerId, mapping);
    await this.saveWorkerMappings();

    console.log(`📝 Registered worker channel: ${workerName} (${workerId}) → ${channelId}`);

    // Reload mappings to ensure all instances have the latest data
    await this.reloadMappings();
    console.log(`🔄 Mappings reloaded after registration - now tracking ${this.workerMappings.size} workers`);
  }

  public getWorkerChannel(workerId: string): WorkerChannelMapping | undefined {
    return this.workerMappings.get(workerId);
  }

  public findWorkerByName(workerName: string): WorkerChannelMapping | undefined {
    console.log(`🔍 WorkerChannelService: Searching for worker: "${workerName}"`);
    console.log(`🔍 Debug - Worker name length: ${workerName.length} chars`);
    console.log(`🔍 Debug - Worker char codes: [${workerName.split('').map(c => c.charCodeAt(0)).join(', ')}]`);
    console.log(`🗂️ WorkerChannelService: Available mappings:`, Array.from(this.workerMappings.values()).map(m => `${m.workerName} → ${m.channelId}`));

    // Apply sanitization to search name
    const sanitizedWorkerName = this.sanitizeWorkerName(workerName);
    console.log(`🔍 WorkerChannelService: Sanitized search name: "${sanitizedWorkerName}"`);

    // Try exact match first
    for (const mapping of this.workerMappings.values()) {
      const sanitizedMappingName = this.sanitizeWorkerName(mapping.workerName);

      console.log(`🔍 WorkerChannelService: Comparing "${sanitizedMappingName.toLowerCase()}" === "${sanitizedWorkerName.toLowerCase()}"`);
      console.log(`🔍 Debug - Mapping char codes: [${sanitizedMappingName.split('').map(c => c.charCodeAt(0)).join(', ')}]`);

      if (sanitizedMappingName.toLowerCase() === sanitizedWorkerName.toLowerCase()) {
        console.log(`✅ WorkerChannelService: Found exact match!`);
        return mapping;
      }
    }

    // Enhanced: Try channel-normalized matching
    const normalizedSearchName = this.normalizeToChannelName(sanitizedWorkerName);
    console.log(`🔍 WorkerChannelService: Trying channel-normalized search: "${sanitizedWorkerName}" → "${normalizedSearchName}"`);

    for (const mapping of this.workerMappings.values()) {
      const sanitizedMappingName = this.sanitizeWorkerName(mapping.workerName);
      const normalizedMappingName = this.normalizeToChannelName(sanitizedMappingName);
      console.log(`🔍 WorkerChannelService: Comparing normalized "${normalizedMappingName}" === "${normalizedSearchName}"`);
      if (normalizedMappingName === normalizedSearchName) {
        console.log(`✅ WorkerChannelService: Found channel-normalized match!`);
        return mapping;
      }
    }

    // Try partial match (for variations in naming)
    for (const mapping of this.workerMappings.values()) {
      const sanitizedMappingName = this.sanitizeWorkerName(mapping.workerName);
      const mappingParts = sanitizedMappingName.toLowerCase().split(' ');
      const searchParts = sanitizedWorkerName.toLowerCase().split(' ');

      console.log(`🔍 WorkerChannelService: Trying partial match - "${sanitizedMappingName}" vs "${sanitizedWorkerName}"`);

      // Check if all search parts match any part of the mapping name
      const allPartsMatch = searchParts.every(searchPart =>
        mappingParts.some(mappingPart =>
          mappingPart.includes(searchPart) || searchPart.includes(mappingPart)
        )
      );

      if (allPartsMatch) {
        console.log(`✅ WorkerChannelService: Found partial match!`);
        return mapping;
      }
    }

    // If no match found, try reloading mappings from file in case of new registrations
    console.log(`🔄 WorkerChannelService: No match found, attempting reload from file...`);
    const previousSize = this.workerMappings.size;
    this.reloadMappings();

    if (this.workerMappings.size > previousSize) {
      console.log(`📥 WorkerChannelService: Found ${this.workerMappings.size - previousSize} new mappings after reload`);

      // Try searching again with reloaded data
      for (const mapping of this.workerMappings.values()) {
        const sanitizedMappingName = this.sanitizeWorkerName(mapping.workerName);
        if (sanitizedMappingName.toLowerCase() === sanitizedWorkerName.toLowerCase()) {
          console.log(`✅ WorkerChannelService: Found match after reload!`);
          return mapping;
        }
      }
    }

    console.log(`❌ WorkerChannelService: No match found for "${workerName}" even after reload`);
    return undefined;
  }

  public async processWorkerTransaction(transaction: TransactionData): Promise<boolean> {
    try {
      console.log(`🔄 Processing transaction for worker: ${transaction.workerName}`);
      console.log(`📋 Transaction type: ${transaction.type}, Item: ${transaction.itemName || transaction.animalType}, Quantity: ${transaction.quantity}`);
      
      // Find worker channel mapping
      const workerMapping = this.findWorkerByName(transaction.workerName);
      if (!workerMapping) {
        console.log(`⚠️ No channel mapping found for worker: ${transaction.workerName}`);
        return false;
      }

      // Update last active timestamp
      workerMapping.lastActive = new Date();
      // Fire and forget - don't wait for save to complete
      this.saveWorkerMappings().catch(err => console.error('Error saving mappings:', err));

      console.log(`✅ Found channel mapping: ${workerMapping.workerName} → ${workerMapping.channelId}`);

      // Process the transaction based on type
      switch (transaction.type) {
        case 'seed_taken':
          if (!transaction.itemName) {
            console.error('❌ Seed transaction missing item name');
            return false;
          }
          
          await this.activityService.addPlantTransaction(
            workerMapping.workerId,
            workerMapping.workerName,
            workerMapping.channelId,
            {
              type: 'seed_taken',
              itemName: transaction.itemName,
              quantity: transaction.quantity
            }
          );
          break;

        case 'plant_deposited':
          if (!transaction.itemName) {
            console.error('❌ Plant transaction missing item name');
            return false;
          }
          
          await this.activityService.addPlantTransaction(
            workerMapping.workerId,
            workerMapping.workerName,
            workerMapping.channelId,
            {
              type: 'plant_deposited',
              itemName: transaction.itemName,
              quantity: transaction.quantity
            }
          );
          break;

        case 'animals_taken':
          await this.activityService.addAnimalTransaction(
            workerMapping.workerId,
            workerMapping.workerName,
            workerMapping.channelId,
            {
              type: 'animals_taken',
              animalType: transaction.animalType,
              quantity: transaction.quantity,
              cost: transaction.cost || (transaction.quantity * 20), // $20 per animal cost
              amount: 0 // No payment yet
            }
          );
          break;
          
        case 'delivery_completed':
          if (!transaction.amount) {
            console.error('❌ Delivery transaction missing amount');
            return false;
          }

          await this.activityService.addAnimalTransaction(
            workerMapping.workerId,
            workerMapping.workerName,
            workerMapping.channelId,
            {
              type: 'delivery_completed',
              quantity: transaction.quantity,
              amount: transaction.amount
            }
          );
          break;

        case 'bercario_purchase':
          if (!transaction.amount || !transaction.itemName) {
            console.error('❌ Bercario purchase missing amount or item name');
            return false;
          }

          await this.activityService.addFinancialTransaction(
            workerMapping.workerId,
            workerMapping.workerName,
            workerMapping.channelId,
            {
              type: 'bercario_purchase',
              itemName: transaction.itemName,
              quantity: transaction.quantity,
              amount: transaction.amount,
              description: `Comprou ${transaction.quantity} ${transaction.itemName} no Berçário`
            }
          );
          break;

        case 'inventory_added':
          if (!transaction.itemName || !transaction.itemCategory) {
            console.error('❌ Inventory addition missing item name or category');
            return false;
          }

          await this.activityService.addInventoryTransaction(
            workerMapping.workerId,
            workerMapping.workerName,
            workerMapping.channelId,
            {
              type: 'inventory_added',
              itemName: transaction.itemName,
              itemCategory: transaction.itemCategory,
              quantity: transaction.quantity
            }
          );
          break;

        case 'inventory_removed':
          if (!transaction.itemName || !transaction.itemCategory) {
            console.error('❌ Inventory removal missing item name or category');
            return false;
          }

          await this.activityService.addInventoryTransaction(
            workerMapping.workerId,
            workerMapping.workerName,
            workerMapping.channelId,
            {
              type: 'inventory_removed',
              itemName: transaction.itemName,
              itemCategory: transaction.itemCategory,
              quantity: transaction.quantity
            }
          );
          break;

        default:
          console.error(`❌ Unknown transaction type: ${transaction.type}`);
          return false;
      }

      console.log(`✅ Successfully processed ${transaction.type} transaction for ${workerMapping.workerName}`);
      return true;

    } catch (error) {
      console.error('❌ Error processing worker transaction:', error);
      return false;
    }
  }

  public parseWorkerTransactionFromMessage(parsedMessage: any): TransactionData | null {
    try {
      // Handle Bercario purchases: "Lion Clark comprou 40 common_portion_goat por $60.0"
      if (parsedMessage.parseSuccess && parsedMessage.tipo === 'compra' &&
          parsedMessage.categoria === 'financeiro' && parsedMessage.valor) {

        const workerName = parsedMessage.autor;
        const itemName = parsedMessage.item || 'item';
        const quantity = parsedMessage.quantidade || 1;
        const amount = parsedMessage.valor;

        // Apply Portuguese translation to item name
        const portugueseName = this.translationService.getPortugueseName(itemName);

        console.log(`🛒 WorkerChannelService: Found Bercario purchase - ${workerName} bought ${quantity} ${itemName} (${portugueseName}) for $${amount}`);
        return {
          workerName,
          type: 'bercario_purchase',
          itemName: portugueseName, // Use Portuguese name for display
          quantity,
          amount,
          timestamp: new Date(parsedMessage.timestamp || Date.now()),
          originalMessage: parsedMessage
        };
      }

      // Handle delivery completions: "BONNIE BENNETT vendeu 4 animais no matadouro por $160"
      if (parsedMessage.parseSuccess && parsedMessage.tipo === 'venda' &&
          parsedMessage.descricao && parsedMessage.descricao.includes('vendeu') &&
          parsedMessage.descricao.includes('animais') && parsedMessage.descricao.includes('matadouro')) {
        
        const workerName = parsedMessage.autor;
        const quantityMatch = parsedMessage.descricao.match(/vendeu\s+(\d+)\s+animais/);
        const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 4; // Default to 4 if not found
        const amount = parsedMessage.valor || 0;

        console.log(`💰 WorkerChannelService: Found delivery completion - ${workerName} sold ${quantity} animals for $${amount}`);
        return {
          workerName,
          type: 'delivery_completed',
          quantity,
          amount,
          timestamp: new Date(parsedMessage.timestamp || Date.now()),
          originalMessage: parsedMessage
        };
      }

      // Handle plant deposits: Extract from message content
      if (parsedMessage.parseSuccess && parsedMessage.categoria === 'financeiro' && 
          parsedMessage.tipo === 'deposito') {
        
        // Look for plant deposit patterns in the original message content
        const content = parsedMessage.content || '';
        const plantDepositPattern = /(.+?)\s+depositou\s+(\d+)\s+(.+?)\s+no\s+inventário|(.+?)\s+depositou\s+(\d+)\s+(milho|trigo|junco|milhos|trigos|juncos)/i;
        const match = content.match(plantDepositPattern);
        
        if (match) {
          const workerName = match[1] || match[4] || parsedMessage.autor;
          const quantity = parseInt(match[2] || match[5]);
          const itemName = match[3] || match[6];
          const portugueseName = this.translationService.getPortugueseName(itemName);

          return {
            workerName,
            type: 'plant_deposited',
            itemName: portugueseName, // Use Portuguese name for display
            quantity,
            timestamp: new Date(parsedMessage.timestamp || Date.now()),
            originalMessage: parsedMessage
          };
        }
      }

      // Handle plant deposits: Look for "Item adicionado" pattern
      if (parsedMessage.parseSuccess && (parsedMessage.categoria === 'estoque' || parsedMessage.categoria === 'inventario')) {
        const content = parsedMessage.content || '';
        
        // PATTERN: "Item adicionado:: Bulrush x500" or "Item adicionado:\nBulrush x500"
        // Supports both : and :: formats, and handles newlines
        const itemAdicionadoPattern = /Item adicionado::?\s*\n?\s*([^x]+)\s*x(\d+)/is;
        const itemAdicionadoMatch = content.match(itemAdicionadoPattern);
        
        if (itemAdicionadoMatch) {
          const itemName = itemAdicionadoMatch[1].trim();
          const quantity = parseInt(itemAdicionadoMatch[2]);
          const workerName = parsedMessage.autor;
          
          // Check if it's a plant item using translation service
          if (this.translationService.isPlant(itemName)) {
            const portugueseName = this.translationService.getPortugueseName(itemName);
            console.log(`🌾 WorkerChannelService: Found plant deposit - ${workerName} deposited ${quantity} ${itemName} (${portugueseName})`);
            return {
              workerName,
              type: 'plant_deposited',
              itemName: portugueseName,
              quantity,
              timestamp: new Date(parsedMessage.timestamp || Date.now()),
              originalMessage: parsedMessage
            };
          }
        }
        
        // PATTERN: "Item removido:: Bulrush_Seed x1" or "Item removido:\nBulrush_Seed x1"
        // Supports both : and :: formats, and handles newlines
        const itemRemovidoPattern = /Item removido::?\s*\n?\s*([^x]+)\s*x(\d+)/is;
        const itemRemovidoMatch = content.match(itemRemovidoPattern);
        
        if (itemRemovidoMatch) {
          const itemName = itemRemovidoMatch[1].trim();
          const quantity = parseInt(itemRemovidoMatch[2]);
          const workerName = parsedMessage.autor;

          // Check if it's a seed item using translation service
          if (this.translationService.isSeed(itemName)) {
            const portugueseName = this.translationService.getPortugueseName(itemName);
            console.log(`🌱 WorkerChannelService: Found seed withdrawal - ${workerName} removed ${quantity} ${itemName} (${portugueseName})`);
            return {
              workerName,
              type: 'seed_taken',
              itemName: portugueseName, // Use Portuguese name for display
              quantity,
              timestamp: new Date(parsedMessage.timestamp || Date.now()),
              originalMessage: parsedMessage
            };
          }
          
          // Check if it's an animal item using translation service
          if (this.translationService.isAnimal(itemName)) {
            const portugueseName = this.translationService.getPortugueseName(itemName);
            console.log(`🐄 WorkerChannelService: Found animal withdrawal - ${workerName} removed ${quantity} ${itemName} (${portugueseName})`);
            return {
              workerName,
              type: 'animals_taken',
              animalType: portugueseName, // Use Portuguese name for display
              quantity,
              cost: quantity * 20, // Animal cost: $20 per animal
              amount: 0, // No payment yet, only after delivery
              timestamp: new Date(parsedMessage.timestamp || Date.now()),
              originalMessage: parsedMessage
            };
          }
        }
        
        // FALLBACK PATTERN: "retirou sementes" 
        const seedWithdrawPattern = /(.+?)\s+retirou\s+(\d+)\s+(sementes?\s+de\s+\w+|\w+\s+sementes?)/i;
        const match = content.match(seedWithdrawPattern);
        
        if (match) {
          const workerName = match[1];
          const quantity = parseInt(match[2]);
          const itemName = match[3];
          const portugueseName = this.translationService.getPortugueseName(itemName);

          return {
            workerName,
            type: 'seed_taken',
            itemName: portugueseName, // Use Portuguese name for display
            quantity,
            timestamp: new Date(parsedMessage.timestamp || Date.now()),
            originalMessage: parsedMessage
          };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error parsing worker transaction from message:', error);
      return null;
    }
  }


  public getAllWorkerMappings(): WorkerChannelMapping[] {
    return Array.from(this.workerMappings.values());
  }

  public getActiveWorkersCount(): number {
    return this.workerMappings.size;
  }

  public getActivityService(): WorkerActivityService {
    return this.activityService;
  }

  // Enhanced: Worker name sanitization (similar to MultiChannelForwarder)
  private sanitizeWorkerName(name: string): string {
    if (!name) return name;

    return name
      // Remove invisible characters (zero-width spaces, non-breaking spaces, etc.)
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
      .replace(/[\u00A0]/g, ' ')             // Non-breaking space to regular space
      .replace(/[\u2000-\u200A]/g, ' ')      // En quad, em quad, en space, etc.

      // Normalize Unicode characters (composite to decomposed, then remove diacritics)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')       // Remove diacritical marks

      // Clean up whitespace
      .replace(/\s+/g, ' ')                  // Multiple spaces to single space
      .trim()                                // Remove leading/trailing spaces

      // Remove any remaining control characters
      .replace(/[\x00-\x1F\x7F]/g, '');
  }
}

export default WorkerChannelService;