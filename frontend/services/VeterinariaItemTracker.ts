/**
 * VeterinariaItemTracker Service
 * Tracks Veterinaria materials flow across Bercario and Fazenda
 */

export interface VeterinariaItem {
  itemName: string;
  takenFromVet: number;
  depositedToBercario: number;
  depositedToFazenda: number;
  returnedToVet: number;
  usedInRecipes: number;
  missing: number;
  transactions: VeterinariaTransaction[];
}

export interface VeterinariaTransaction {
  timestamp: string;
  action: 'take' | 'deposit' | 'craft' | 'return';
  source: 'veterinaria' | 'bercario' | 'fazenda';
  destination?: 'veterinaria' | 'bercario' | 'fazenda';
  itemName: string;
  quantity: number;
  author: string;
}

export interface RecipeAttempt {
  recipeName: string;
  recipeId: string;
  ingredientsRequired: { itemName: string; quantity: number; collected: number }[];
  isComplete: boolean;
  outputDeposited?: string;
  timestamp?: string;
}

export interface VeterinariaWorkerTracking {
  workerId: string;
  workerName: string;
  veterinariaItems: Map<string, VeterinariaItem>;
  recipeAttempts: RecipeAttempt[];
  suspiciousActivities: string[];
  totalItemsTaken: number;
  totalItemsDeposited: number;
  totalItemsMissing: number;
  lastActivity?: string;
}

// Veterinaria recipe definitions
const VETERINARIA_RECIPES = [
  {
    id: 'libidgel_bovino',
    name: 'Libidgel Bovino',
    output: 'libidgel_bovino',
    outputQuantity: 10,
    requirements: [
      { itemName: 'capsula_plastica', quantity: 20 },
      { itemName: 'rotulo', quantity: 20 },
      { itemName: 'seringa_de_vidro', quantity: 4 },
      { itemName: 'embalagem', quantity: 20 }
    ]
  },
  {
    id: 'libidgel_suino',
    name: 'Libidgel Suíno',
    output: 'libidgel_suino',
    outputQuantity: 10,
    requirements: [
      { itemName: 'capsula_plastica', quantity: 20 },
      { itemName: 'rotulo', quantity: 20 },
      { itemName: 'seringa_de_vidro', quantity: 4 },
      { itemName: 'embalagem', quantity: 20 }
    ]
  },
  {
    id: 'libidgel_aviario',
    name: 'Libidgel Aviário',
    output: 'libidgel_aviario',
    outputQuantity: 10,
    requirements: [
      { itemName: 'capsula_plastica', quantity: 20 },
      { itemName: 'rotulo', quantity: 20 },
      { itemName: 'seringa_de_vidro', quantity: 4 },
      { itemName: 'embalagem', quantity: 20 }
    ]
  },
  {
    id: 'libidgel_caprino',
    name: 'Libidgel Caprino',
    output: 'libidgel_caprino',
    outputQuantity: 10,
    requirements: [
      { itemName: 'capsula_plastica', quantity: 20 },
      { itemName: 'rotulo', quantity: 20 },
      { itemName: 'seringa_de_vidro', quantity: 4 },
      { itemName: 'embalagem', quantity: 20 }
    ]
  }
];

export class VeterinariaItemTracker {
  private veterinariaChannelId = '1419341131459723324';
  private bercarioChannelId = '1406811401036497036';
  private fazendaChannelId = '1412325130926948362';

  async trackWorkerActivity(workerId: string, workerName: string): Promise<VeterinariaWorkerTracking> {
    console.log(`🚀 Starting tracking for worker: ${workerName} (${workerId})`);

    // Fetch all channel logs
    const [vetData, bercarioData, fazendaData] = await Promise.all([
      this.fetchChannelData(this.veterinariaChannelId),
      this.fetchChannelData(this.bercarioChannelId),
      this.fetchChannelData(this.fazendaChannelId)
    ]);

    console.log(`📊 Channel data summary:
    - Veterinaria: ${vetData.messages?.length || 0} messages
    - Bercario: ${bercarioData.messages?.length || 0} messages
    - Fazenda: ${fazendaData.messages?.length || 0} messages`);


    // Initialize tracking object
    const tracking: VeterinariaWorkerTracking = {
      workerId,
      workerName,
      veterinariaItems: new Map(),
      recipeAttempts: [],
      suspiciousActivities: [],
      totalItemsTaken: 0,
      totalItemsDeposited: 0,
      totalItemsMissing: 0
    };

    // Process Veterinaria channel - track items taken
    const vetTransactions = this.extractWorkerTransactions(vetData, workerId, workerName);

    vetTransactions.forEach(transaction => {
      if (transaction.action === 'remover') {
        const item = this.getOrCreateItem(tracking.veterinariaItems, transaction.itemName);
        item.takenFromVet += transaction.quantity;
        item.transactions.push({
          timestamp: transaction.timestamp,
          action: 'take',
          source: 'veterinaria',
          itemName: transaction.itemName,
          quantity: transaction.quantity,
          author: workerName
        });
        tracking.totalItemsTaken += transaction.quantity;
      } else if (transaction.action === 'adicionar') {
        const item = this.getOrCreateItem(tracking.veterinariaItems, transaction.itemName);
        item.returnedToVet += transaction.quantity;
        item.transactions.push({
          timestamp: transaction.timestamp,
          action: 'return',
          source: 'veterinaria',
          destination: 'veterinaria',
          itemName: transaction.itemName,
          quantity: transaction.quantity,
          author: workerName
        });
      }
    });

    // Process Bercario channel - track deposits of Veterinaria items
    const bercarioTransactions = this.extractWorkerTransactions(bercarioData, workerId, workerName);

    bercarioTransactions.forEach(transaction => {
      const item = tracking.veterinariaItems.get(transaction.itemName);
      if (item && transaction.action === 'adicionar') {
        item.depositedToBercario += transaction.quantity;
        item.transactions.push({
          timestamp: transaction.timestamp,
          action: 'deposit',
          source: 'veterinaria',
          destination: 'bercario',
          itemName: transaction.itemName,
          quantity: transaction.quantity,
          author: workerName
        });
        tracking.totalItemsDeposited += transaction.quantity;
      }
    });

    // Process Fazenda channel - track deposits of Veterinaria items
    const fazendaTransactions = this.extractWorkerTransactions(fazendaData, workerId, workerName);

    fazendaTransactions.forEach(transaction => {
      const item = tracking.veterinariaItems.get(transaction.itemName);
      if (item && transaction.action === 'adicionar') {
        item.depositedToFazenda += transaction.quantity;
        item.transactions.push({
          timestamp: transaction.timestamp,
          action: 'deposit',
          source: 'veterinaria',
          destination: 'fazenda',
          itemName: transaction.itemName,
          quantity: transaction.quantity,
          author: workerName
        });
        tracking.totalItemsDeposited += transaction.quantity;
      }
    });

    // Calculate missing items and detect recipe attempts
    tracking.veterinariaItems.forEach((item, itemName) => {
      item.missing = item.takenFromVet -
                     (item.depositedToBercario + item.depositedToFazenda +
                      item.returnedToVet + item.usedInRecipes);

      if (item.missing > 0) {
        tracking.totalItemsMissing += item.missing;
        tracking.suspiciousActivities.push(
          `${item.missing}x ${itemName} taken but not accounted for`
        );
      }

      // Sort transactions by timestamp
      item.transactions.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });

    // Detect recipe attempts
    tracking.recipeAttempts = this.detectRecipeAttempts(tracking.veterinariaItems);

    // Update items used in recipes
    tracking.recipeAttempts.forEach(attempt => {
      if (attempt.isComplete) {
        attempt.ingredientsRequired.forEach(ing => {
          const item = tracking.veterinariaItems.get(ing.itemName);
          if (item) {
            item.usedInRecipes += ing.quantity;
          }
        });
      }
    });

    // Recalculate missing after accounting for recipes
    tracking.veterinariaItems.forEach(item => {
      item.missing = item.takenFromVet -
                     (item.depositedToBercario + item.depositedToFazenda +
                      item.returnedToVet + item.usedInRecipes);
    });

    // Get last activity timestamp
    let lastTimestamp: Date | null = null;
    tracking.veterinariaItems.forEach(item => {
      item.transactions.forEach(t => {
        const timestamp = new Date(t.timestamp);
        if (!lastTimestamp || timestamp > lastTimestamp) {
          lastTimestamp = timestamp;
        }
      });
    });

    if (lastTimestamp) {
      tracking.lastActivity = lastTimestamp.toISOString();
    }

    return tracking;
  }

  private async fetchChannelData(channelId: string): Promise<any> {
    try {
      const response = await fetch(`/channel-logs/${channelId}.json`);
      if (!response.ok) {
        console.error(`Failed to fetch channel ${channelId}:`, response.status);
        return { messages: [] };
      }
      const data = await response.json();
      console.log(`✅ Fetched ${data.messages?.length || 0} messages from channel ${channelId}`);
      return data;
    } catch (error) {
      console.error(`Error fetching channel ${channelId}:`, error);
      return { messages: [] };
    }
  }

  private extractWorkerTransactions(channelData: any, workerId: string, workerName: string): any[] {
    const transactions: any[] = [];

    if (!channelData.messages || !Array.isArray(channelData.messages)) {
      console.warn('No messages found in channel data');
      return transactions;
    }

    console.log(`🔍 Processing ${channelData.messages.length} messages for worker ${workerName}`);

    // First, let's see all unique authors in this channel
    const uniqueAuthors = new Set();
    channelData.messages.forEach((message: any) => {
      if (message.author) uniqueAuthors.add(message.author);
    });
    console.log(`👥 All unique authors in channel:`, Array.from(uniqueAuthors));

    channelData.messages.forEach((message: any, index: number) => {
      const content = message.content || '';
      const embedContent = message.embedContent || '';
      const fullContent = content + ' ' + embedContent;
      const author = message.author || '';

      // More flexible worker matching - normalize names
      const normalizedWorkerName = workerName.toLowerCase().trim();
      const normalizedAuthor = author.toLowerCase().trim();

      const isFromWorker =
        normalizedAuthor.includes(normalizedWorkerName) ||
        normalizedWorkerName.includes(normalizedAuthor) ||
        fullContent.toLowerCase().includes(normalizedWorkerName) ||
        fullContent.includes(workerId);

      // TEMPORARY: For debugging, show matching attempts
      if (index < 10) { // Show more messages for debugging
        console.log(`📋 Message ${index}: Author="${author}", Content="${fullContent.substring(0, 150)}..."`);
        console.log(`📋 Worker match for "${workerName}" vs "${author}": ${isFromWorker}`);
      }

      if (isFromWorker) {
        // Parse INSERIR ITEM (adding items) - more flexible pattern
        const insertMatch = fullContent.match(/Item adicionado::\s*([^x\s]+)\s*x(\d+)/i);
        if (insertMatch) {
          const itemName = insertMatch[1].trim().replace(/[:\s]*$/, '');
          const quantity = parseInt(insertMatch[2]);
          console.log(`📥 Found INSERT: ${itemName} x${quantity} by ${workerName}`);

          transactions.push({
            timestamp: message.timestamp,
            action: 'adicionar',
            itemName: itemName,
            quantity: quantity,
            author: workerName
          });
        }

        // Parse REMOVER ITEM (removing items) - more flexible pattern
        const removeMatch = fullContent.match(/Item removido::\s*([^x\s]+)\s*x(\d+)/i);
        if (removeMatch) {
          const itemName = removeMatch[1].trim().replace(/[:\s]*$/, '');
          const quantity = parseInt(removeMatch[2]);
          console.log(`📤 Found REMOVE: ${itemName} x${quantity} by ${workerName}`);

          transactions.push({
            timestamp: message.timestamp,
            action: 'remover',
            itemName: itemName,
            quantity: quantity,
            author: workerName
          });
        }
      }
    });

    console.log(`✅ Extracted ${transactions.length} transactions for ${workerName}`);
    return transactions;
  }

  private getOrCreateItem(itemsMap: Map<string, VeterinariaItem>, itemName: string): VeterinariaItem {
    if (!itemsMap.has(itemName)) {
      itemsMap.set(itemName, {
        itemName,
        takenFromVet: 0,
        depositedToBercario: 0,
        depositedToFazenda: 0,
        returnedToVet: 0,
        usedInRecipes: 0,
        missing: 0,
        transactions: []
      });
    }
    return itemsMap.get(itemName)!;
  }

  private detectRecipeAttempts(veterinariaItems: Map<string, VeterinariaItem>): RecipeAttempt[] {
    const attempts: RecipeAttempt[] = [];

    VETERINARIA_RECIPES.forEach(recipe => {
      const attempt: RecipeAttempt = {
        recipeName: recipe.name,
        recipeId: recipe.id,
        ingredientsRequired: recipe.requirements.map(req => {
          const item = veterinariaItems.get(req.itemName);
          const collected = item ? Math.min(item.takenFromVet, req.quantity) : 0;
          return {
            itemName: req.itemName,
            quantity: req.quantity,
            collected
          };
        }),
        isComplete: false
      };

      // Check if all ingredients are collected
      attempt.isComplete = attempt.ingredientsRequired.every(ing => ing.collected >= ing.quantity);

      // Only add attempt if at least one ingredient was collected
      const hasAnyIngredient = attempt.ingredientsRequired.some(ing => ing.collected > 0);
      if (hasAnyIngredient) {
        attempts.push(attempt);
      }
    });

    return attempts;
  }
}

export default new VeterinariaItemTracker();