import { Client } from 'discord.js';
import fs from 'fs';
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
  type: 'seed_taken' | 'plant_deposited' | 'animals_taken' | 'delivery_completed';
  itemName?: string;
  animalType?: string;
  quantity: number;
  amount?: number;
  cost?: number;
  timestamp: Date;
  originalMessage: any;
}

export class WorkerChannelService {
  // @ts-ignore - Used in child services
  private client: Client;
  private workerMappings: Map<string, WorkerChannelMapping> = new Map();
  private activityService: WorkerActivityService;
  private dataDir: string;
  private translationService: ItemTranslationService;

  constructor(client: Client) {
    this.client = client;
    this.dataDir = path.join(process.cwd(), 'data', 'worker-channels');
    this.ensureDataDirectory();
    this.loadWorkerMappings();
    this.activityService = new WorkerActivityService(client);
    this.translationService = ItemTranslationService.getInstance();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('📁 Created worker channels directory');
    }
  }

  private loadWorkerMappings(): void {
    try {
      const mappingsFile = path.join(this.dataDir, 'worker-mappings.json');
      if (fs.existsSync(mappingsFile)) {
        const data = fs.readFileSync(mappingsFile, 'utf8');
        const mappings = JSON.parse(data);
        
        // Convert to Map and restore Date objects
        Object.entries(mappings).forEach(([key, mapping]: [string, any]) => {
          mapping.createdAt = new Date(mapping.createdAt);
          if (mapping.lastActive) {
            mapping.lastActive = new Date(mapping.lastActive);
          }
          this.workerMappings.set(key, mapping);
        });
        
        console.log(`🗺️ Loaded ${this.workerMappings.size} worker channel mappings`);
      }
    } catch (error) {
      console.error('❌ Error loading worker mappings:', error);
    }
  }

  private saveWorkerMappings(): void {
    try {
      const mappingsFile = path.join(this.dataDir, 'worker-mappings.json');
      const mappings = Object.fromEntries(this.workerMappings);
      fs.writeFileSync(mappingsFile, JSON.stringify(mappings, null, 2));
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

  public registerWorkerChannel(workerId: string, workerName: string, channelId: string, registrationId?: string): void {
    const mapping: WorkerChannelMapping = {
      workerId,
      workerName,
      channelId,
      registrationId,
      createdAt: new Date()
    };

    this.workerMappings.set(workerId, mapping);
    this.saveWorkerMappings();
    
    console.log(`📝 Registered worker channel: ${workerName} (${workerId}) → ${channelId}`);
  }

  public getWorkerChannel(workerId: string): WorkerChannelMapping | undefined {
    return this.workerMappings.get(workerId);
  }

  public findWorkerByName(workerName: string): WorkerChannelMapping | undefined {
    console.log(`🔍 WorkerChannelService: Searching for worker: "${workerName}"`);
    console.log(`🗂️ WorkerChannelService: Available mappings:`, Array.from(this.workerMappings.values()).map(m => `${m.workerName} → ${m.channelId}`));
    
    // Try exact match first
    for (const mapping of this.workerMappings.values()) {
      console.log(`🔍 WorkerChannelService: Comparing "${mapping.workerName.toLowerCase()}" === "${workerName.toLowerCase()}"`);
      if (mapping.workerName.toLowerCase() === workerName.toLowerCase()) {
        console.log(`✅ WorkerChannelService: Found exact match!`);
        return mapping;
      }
    }

    // Enhanced: Try channel-normalized matching
    const normalizedSearchName = this.normalizeToChannelName(workerName);
    console.log(`🔍 WorkerChannelService: Trying channel-normalized search: "${workerName}" → "${normalizedSearchName}"`);
    
    for (const mapping of this.workerMappings.values()) {
      const normalizedMappingName = this.normalizeToChannelName(mapping.workerName);
      console.log(`🔍 WorkerChannelService: Comparing normalized "${normalizedMappingName}" === "${normalizedSearchName}"`);
      if (normalizedMappingName === normalizedSearchName) {
        console.log(`✅ WorkerChannelService: Found channel-normalized match!`);
        return mapping;
      }
    }

    // Try partial match (for variations in naming)
    for (const mapping of this.workerMappings.values()) {
      const mappingParts = mapping.workerName.toLowerCase().split(' ');
      const searchParts = workerName.toLowerCase().split(' ');
      
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

    console.log(`❌ WorkerChannelService: No match found for "${workerName}"`);
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
      this.saveWorkerMappings();

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
        
        // PATTERN: "Item adicionado:: Bulrush x500"
        const itemAdicionadoPattern = /Item adicionado::\s*([^x]+)\s*x(\d+)/i;
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
        
        // PATTERN: "Item removido:: Bulrush_Seed x1"
        const itemRemovidoPattern = /Item removido::\s*([^x]+)\s*x(\d+)/i;
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
}

export default WorkerChannelService;