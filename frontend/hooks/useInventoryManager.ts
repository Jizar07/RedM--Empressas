'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { 
  InventoryItem, 
  InventoryTransaction, 
  InventoryData, 
  InventorySettings, 
  ParsedActivity,
  PriceListItem,
  DEFAULT_INVENTORY_SETTINGS,
  INVENTORY_CATEGORIES,
  WorkerInventoryStats 
} from '@/types/inventory';
import { FirmConfig } from '@/types/firms';
import { storageManager } from '@/utils/localStorage';

interface UseInventoryManagerProps {
  firm: FirmConfig;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Storage keys for localStorage backup
const getStorageKeys = (firmId: string) => ({
  inventoryData: `${firmId}_inventory_data`,
  lastSyncTime: `${firmId}_last_sync`,
  pendingChanges: `${firmId}_pending_changes`
});

export function useInventoryManager({ 
  firm, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: UseInventoryManagerProps) {
  // Core state
  const [inventoryData, setInventoryData] = useState<InventoryData>({
    items: {},
    transactions: [],
    analytics: {
      totalItems: 0,
      totalQuantity: 0,
      totalValue: 0,
      categorias: {},
      workers: [],
      recentTransactions: [],
      lowStockAlerts: [],
      priceMatches: 0,
      unmatchedItems: []
    },
    settings: DEFAULT_INVENTORY_SETTINGS,
    lastUpdate: '',
    totalItems: 0,
    totalQuantity: 0,
    activeWorkers: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemTranslations, setItemTranslations] = useState<Record<string, string>>({});
  const [priceList, setPriceList] = useState<Record<string, PriceListItem>>({});
  const [registeredWorkers, setRegisteredWorkers] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  // Load registered workers from backend
  const loadRegisteredWorkers = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3050/api/worker-activity/all-workers`, {
        headers: {
          'x-bot-token': process.env.NEXT_PUBLIC_DISCORD_TOKEN || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Wrap in startTransition to prevent flicker when this slow API completes
          startTransition(() => {
            setRegisteredWorkers(data.workers);
          });
          console.log(`✅ Loaded ${data.workers.length} registered workers`);
        }
      } else {
        console.error(`❌ Failed to load registered workers: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('❌ Error loading registered workers:', error);
    }
  }, []);

  // Load global translations with caching
  const loadTranslations = useCallback(async () => {
    try {
      if (firm?.display?.itemTranslations === "global") {
        // Check if translations are already cached in memory
        const cachedTranslations = (window as any).__translationsCache;
        if (cachedTranslations) {
          setItemTranslations(cachedTranslations);
          console.log('✅ Loaded', Object.keys(cachedTranslations).length, 'translations from cache');
          return;
        }

        console.log('🌍 Loading global translations for', firm.name);
        const response = await fetch('http://localhost:3050/api/localization/translations');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.custom_overrides) {
            // Cache translations in memory to prevent duplicate API calls
            (window as any).__translationsCache = data.data.custom_overrides;
            // Wrap in startTransition to prevent flicker
            startTransition(() => {
              setItemTranslations(data.data.custom_overrides);
            });
            console.log('✅ Loaded', Object.keys(data.data.custom_overrides).length, 'global translations');
          }
        }
      }
    } catch (error) {
      console.debug('Localization service not available:', error);
    }
  }, [firm]);

  // Load customizations (custom display names)
  const loadCustomizations = useCallback(async () => {
    try {
      console.log('🎨 Loading custom display names...');
      const response = await fetch('/api/customizations');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.display_names) {
          // Merge customizations with existing translations
          setItemTranslations(prev => {
            const newTranslations = {
              ...prev,
              ...data.data.display_names
            };
            console.log('✅ Loaded', Object.keys(data.data.display_names).length, 'custom display names');
            console.log('🔍 Sample customizations:', Object.entries(data.data.display_names).slice(0, 5));
            return newTranslations;
          });
        }
      }
    } catch (error) {
      console.debug('Customizations not available:', error);
    }
  }, []);

  // Load price list data
  const loadPriceList = useCallback(async () => {
    try {
      // Using the same price data structure from PriceList.tsx
      const mockPriceData = {
        "suco_com_fruta": { nome: "Suco com fruta", categoria: "ALIMENTACAO", preco_min: 0.45, preco_max: 0.65, atualizado_em: "2025-08-24T05:18:16.371Z" },
        "frango_caipira": { nome: "Frango Caipira", categoria: "ALIMENTACAO", preco_min: 0.98, preco_max: 1.47, atualizado_em: "2025-08-24T05:18:16.371Z" },
        "bulrush": { nome: "Junco", categoria: "FAZENDAS", preco_min: 0.15, preco_max: 0.25, atualizado_em: "2025-08-24T05:18:16.371Z" },
        "cornseed": { nome: "Semente de Milho", categoria: "FAZENDAS", preco_min: 0.20, preco_max: 0.30, atualizado_em: "2025-08-24T05:18:16.371Z" },
        // Add more items as needed from the price list
      };
      setPriceList(mockPriceData as Record<string, PriceListItem>);
    } catch (error) {
      console.error('Error loading price list:', error);
    }
  }, []);

  // Get best display name with translations
  const getBestDisplayName = useCallback((itemId?: string): string => {
    if (!itemId) return 'Item';
    
    // 1. Try custom translation first (highest priority)
    const customTranslation = itemTranslations[itemId] || itemTranslations[itemId.toLowerCase()];
    if (customTranslation && customTranslation.trim() !== '') {
      return customTranslation;
    }

    // 2. Try variations
    const variations = [
      itemId.replace(/_/g, ' '),
      itemId.replace(/_/g, ' ').toLowerCase()
    ];
    
    for (const variation of variations) {
      const translation = itemTranslations[variation];
      if (translation && translation.trim() !== '') {
        return translation;
      }
    }

    // 3. Fallback to normalized formatting
    return itemId
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, [itemTranslations]);

  // Auto-categorize items based on name patterns
  const getCategoryForItem = useCallback((itemName: string): string => {
    const name = itemName.toLowerCase();
    
    // Special cases - items that should not be auto-categorized by their name
    if (name === 'milk_weed') {
      return 'plantas'; // Milk_Weed is a plant, not a beverage
    }
    
    if (name.includes('seed') || name.includes('semente') || name.includes('bulrush') || name.includes('cornseed')) {
      return 'sementes';
    }
    if (name.includes('racao') || name.includes('feed') || name.includes('portion')) {
      return 'racoes';
    }
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') || name.includes('sheep') || name.includes('donkey') || name.includes('goat') || 
        name.includes('vaca') || name.includes('porco') || name.includes('galinha') || name.includes('ovelha') || name.includes('cabra') || name.includes('burro') ||
        name.includes('_male') || name.includes('_female')) {
      return 'animais';
    }
    if (name.includes('milk') || name.includes('leite') || name.includes('water') || name.includes('agua')) {
      return 'bebidas';
    }
    if (name.includes('bread') || name.includes('pao') || name.includes('food') || name.includes('comida')) {
      return 'comidas';
    }
    if (name.includes('hoe') || name.includes('enxada') || name.includes('tool') || name.includes('ferramenta') || 
        name.includes('wateringcan') || name.includes('regador')) {
      return 'ferramentas';
    }
    if (name.includes('caixa') || name.includes('box')) {
      return 'caixas';
    }
    if (name.includes('leather') || name.includes('couro') || name.includes('wood') || name.includes('madeira') || 
        name.includes('metal') || name.includes('ferro') || name.includes('cascalho') || name.includes('carvao')) {
      return 'materiais';
    }
    if (name.includes('plant') || name.includes('planta') || name.includes('trigo') || name.includes('milho') || name.includes('bulrush') || name.includes('corn')) {
      return 'plantas';
    }
    
    return 'outros';
  }, []);

  // Match item with price list
  const matchPrice = useCallback((itemId: string): { min: number; max: number; average: number } | null => {
    // Direct match
    if (priceList[itemId]) {
      const item = priceList[itemId];
      return {
        min: item.preco_min,
        max: item.preco_max,
        average: (item.preco_min + item.preco_max) / 2
      };
    }

    // Try variations
    const variations = [
      itemId.toLowerCase(),
      itemId.replace(/_/g, ' '),
      itemId.replace(/_/g, ' ').toLowerCase()
    ];

    for (const variation of variations) {
      if (priceList[variation]) {
        const item = priceList[variation];
        return {
          min: item.preco_min,
          max: item.preco_max,
          average: (item.preco_min + item.preco_max) / 2
        };
      }
    }

    return null;
  }, [priceList]);

  // Process Discord activities into inventory items and worker analytics
  const processActivities = useCallback((activities: ParsedActivity[]) => {
    const itemCounts: Record<string, InventoryItem> = {};
    const transactions: InventoryTransaction[] = [];
    const financialTransactions: InventoryTransaction[] = [];
    
    console.log('📦 Processing', activities.length, 'activities with', Object.keys(itemTranslations).length, 'translations');
    
    activities.forEach((activity, index) => {
      const content = activity.content || '';
      
      // Parse INSERIR ITEM (add item)
      if (content.includes('INSERIR ITEM') || content.includes('inserir item')) {
        const itemMatch = content.match(/Item adicionado:(.+?)\s*x(\d+)/i);
        if (itemMatch) {
          const rawItemName = itemMatch[1].trim();
          const itemName = rawItemName.replace(/^:\s*/, '').trim();
          const quantity = parseInt(itemMatch[2]);
          
          if (!itemCounts[itemName]) {
            const pricing = matchPrice(itemName);
            itemCounts[itemName] = {
              id: itemName,
              nome: itemName,
              displayName: getBestDisplayName(itemName),
              categoria: getCategoryForItem(itemName),
              quantidade: 0,
              preco_min: pricing?.min,
              preco_max: pricing?.max,
              preco_medio: pricing?.average,
              criado_em: activity.timestamp,
              atualizado_em: activity.timestamp,
              ultimo_autor: activity.autor,
              ativo: true
            };
          }
          
          const oldQuantity = itemCounts[itemName].quantidade;
          itemCounts[itemName].quantidade += quantity;
          itemCounts[itemName].atualizado_em = activity.timestamp;
          itemCounts[itemName].ultimo_autor = activity.autor;
          
          // Create transaction record
          transactions.push({
            id: `${activity.id}-add-${index}`,
            itemId: itemName,
            tipo: 'adicionar',
            quantidade_anterior: oldQuantity,
            quantidade_posterior: itemCounts[itemName].quantidade,
            quantidade_mudanca: quantity,
            autor: activity.autor,
            timestamp: activity.timestamp,
            origem: 'discord',
            detalhes: `Adicionou ${quantity}x ${getBestDisplayName(itemName)}`
          });
        }
      }
      
      // Parse REMOVER ITEM (remove item)
      if (content.includes('REMOVER ITEM') || content.includes('remover item')) {
        const itemMatch = content.match(/Item removido:(.+?)\s*x(\d+)/i);
        if (itemMatch) {
          const rawItemName = itemMatch[1].trim();
          const itemName = rawItemName.replace(/^:\s*/, '').trim();
          const quantity = parseInt(itemMatch[2]);
          
          if (!itemCounts[itemName]) {
            const pricing = matchPrice(itemName);
            itemCounts[itemName] = {
              id: itemName,
              nome: itemName,
              displayName: getBestDisplayName(itemName),
              categoria: getCategoryForItem(itemName),
              quantidade: 0,
              preco_min: pricing?.min,
              preco_max: pricing?.max,
              preco_medio: pricing?.average,
              criado_em: activity.timestamp,
              atualizado_em: activity.timestamp,
              ultimo_autor: activity.autor,
              ativo: true
            };
          }
          
          const oldQuantity = itemCounts[itemName].quantidade;
          itemCounts[itemName].quantidade = Math.max(0, itemCounts[itemName].quantidade - quantity);
          itemCounts[itemName].atualizado_em = activity.timestamp;
          itemCounts[itemName].ultimo_autor = activity.autor;
          
          // Create transaction record
          transactions.push({
            id: `${activity.id}-remove-${index}`,
            itemId: itemName,
            tipo: 'remover',
            quantidade_anterior: oldQuantity,
            quantidade_posterior: itemCounts[itemName].quantidade,
            quantidade_mudanca: -quantity,
            autor: activity.autor,
            timestamp: activity.timestamp,
            origem: 'discord',
            detalhes: `Removeu ${quantity}x ${getBestDisplayName(itemName)}`
          });
        }
      }
      
      // Process financial transactions (deposits, withdrawals, sales)
      if (activity.parseSuccess && activity.tipo && ['deposito', 'saque', 'venda'].includes(activity.tipo)) {
        // Create financial transaction record
        const financialTransaction: InventoryTransaction = {
          id: `${activity.id}-financial-${index}`,
          itemId: activity.tipo === 'venda' ? 'animais' : 'dinheiro',
          tipo: activity.tipo === 'deposito' ? 'adicionar' : 'remover',
          quantidade_anterior: 0, // Not tracking balance history yet
          quantidade_posterior: 0, // Not tracking balance history yet
          quantidade_mudanca: activity.valor || 0,
          autor: activity.autor || 'Sistema',
          timestamp: activity.timestamp,
          origem: 'discord',
          detalhes: activity.descricao || activity.displayText || 'Transação financeira',
          metadata: {
            tipo_transacao: activity.tipo,
            valor: activity.valor,
            categoria: activity.categoria
          }
        };
        
        financialTransactions.push(financialTransaction);
      }
    });

    return { itemCounts, transactions, financialTransactions };
  }, [itemTranslations, getBestDisplayName, getCategoryForItem, matchPrice]);

  // Calculate analytics including worker statistics
  const calculateAnalytics = useCallback((items: Record<string, InventoryItem>, transactions: InventoryTransaction[], financialTransactions: InventoryTransaction[] = []) => {
    const totalItems = Object.keys(items).length;
    const totalQuantity = Object.values(items).reduce((sum, item) => sum + item.quantidade, 0);
    const totalValue = Object.values(items).reduce((sum, item) => sum + (item.quantidade * (item.preco_medio || 0)), 0);
    
    // Category analysis
    const categorias: Record<string, { count: number; quantity: number; value: number }> = {};
    Object.values(items).forEach(item => {
      if (!categorias[item.categoria]) {
        categorias[item.categoria] = { count: 0, quantity: 0, value: 0 };
      }
      categorias[item.categoria].count++;
      categorias[item.categoria].quantity += item.quantidade;
      categorias[item.categoria].value += item.quantidade * (item.preco_medio || 0);
    });

    // Worker analysis - combine inventory and financial transactions
    const workerStats: Record<string, Partial<WorkerInventoryStats>> = {};
    const allTransactions = [...transactions, ...financialTransactions];
    
    allTransactions.forEach(transaction => {
      // Skip system/bot transactions, focus on actual workers
      if (!transaction.autor || transaction.autor === 'Sistema' || transaction.autor.toLowerCase().includes('bot')) {
        return;
      }
      
      if (!workerStats[transaction.autor]) {
        workerStats[transaction.autor] = {
          userId: transaction.autor.toLowerCase().replace(/\s+/g, '_'),
          userName: transaction.autor,
          totalTransactions: 0,
          itemsAdded: 0,
          itemsRemoved: 0,
          netItems: 0,
          categorias: {},
          firstActivity: transaction.timestamp,
          lastActivity: transaction.timestamp,
          mostActiveDay: transaction.timestamp,
          averagePerDay: 0
        };
      }
      
      const stats = workerStats[transaction.autor];
      stats.totalTransactions!++;
      stats.lastActivity = transaction.timestamp;
      
      // Update first activity if this is older
      if (new Date(transaction.timestamp) < new Date(stats.firstActivity!)) {
        stats.firstActivity = transaction.timestamp;
      }
      
      // Handle inventory transactions
      if (transaction.origem === 'discord' && ['adicionar', 'remover'].includes(transaction.tipo)) {
        if (transaction.tipo === 'adicionar') {
          stats.itemsAdded! += Math.abs(transaction.quantidade_mudanca);
          stats.netItems! += transaction.quantidade_mudanca;
        } else if (transaction.tipo === 'remover') {
          stats.itemsRemoved! += Math.abs(transaction.quantidade_mudanca);
          stats.netItems! += transaction.quantidade_mudanca; // Already negative
        }
        
        // Category tracking for inventory
        const itemId = transaction.itemId;
        const item = items[itemId];
        const categoria = item?.categoria || 'outros';
        
        if (!stats.categorias![categoria]) {
          stats.categorias![categoria] = { added: 0, removed: 0, net: 0 };
        }
        
        if (transaction.tipo === 'adicionar') {
          stats.categorias![categoria].added += Math.abs(transaction.quantidade_mudanca);
          stats.categorias![categoria].net += transaction.quantidade_mudanca;
        } else {
          stats.categorias![categoria].removed += Math.abs(transaction.quantidade_mudanca);
          stats.categorias![categoria].net += transaction.quantidade_mudanca;
        }
      }
      
      // Handle financial transactions (sales, deposits, withdrawals)
      if (transaction.metadata?.tipo_transacao) {
        const tipoFinanceiro = transaction.metadata.tipo_transacao as string;
        const categoria = tipoFinanceiro === 'venda' ? 'vendas' : 'financeiro';
        
        if (!stats.categorias![categoria]) {
          stats.categorias![categoria] = { added: 0, removed: 0, net: 0 };
        }
        
        if (tipoFinanceiro === 'venda' || tipoFinanceiro === 'deposito') {
          stats.categorias![categoria].added += Math.abs(transaction.quantidade_mudanca);
          stats.categorias![categoria].net += transaction.quantidade_mudanca;
        } else if (tipoFinanceiro === 'saque') {
          stats.categorias![categoria].removed += Math.abs(transaction.quantidade_mudanca);
          stats.categorias![categoria].net -= Math.abs(transaction.quantidade_mudanca);
        }
      }
    });
    
    // Calculate averagePerDay for each worker
    Object.values(workerStats).forEach(stats => {
      if (stats.firstActivity && stats.lastActivity) {
        const startDate = new Date(stats.firstActivity);
        const endDate = new Date(stats.lastActivity);
        const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        stats.averagePerDay = stats.totalTransactions! / daysDiff;
      } else {
        stats.averagePerDay = 0;
      }
    });

    // Low stock alerts (threshold from settings)
    const lowStockAlerts = Object.values(items).filter(
      item => item.quantidade <= inventoryData.settings.lowStockThreshold && item.ativo
    );

    // Price matches
    const priceMatches = Object.values(items).filter(item => item.preco_min && item.preco_max).length;
    const unmatchedItems = Object.values(items).filter(item => !item.preco_min && !item.preco_max).map(item => item.id);

    // Create name-to-discordId mapping for user consolidation
    const nameToDiscordId = new Map<string, string>();
    registeredWorkers.forEach(regWorker => {
      const normalizedName = regWorker.userName.toLowerCase().trim();
      nameToDiscordId.set(normalizedName, regWorker.userId);
    });

    // Merge registered workers with transaction-based workers
    const allWorkers: WorkerInventoryStats[] = [];
    const processedDiscordIds = new Set<string>();

    // First, process registered workers and merge with their transaction stats
    registeredWorkers.forEach(regWorker => {
      const normalizedName = regWorker.userName.toLowerCase().trim();

      // Look for transaction stats by exact name match
      const exactNameStats = workerStats[regWorker.userName];

      // Look for transaction stats by normalized name variations
      const nameBasedStats = Object.values(workerStats).find(stats =>
        stats.userName && stats.userName.toLowerCase().trim() === normalizedName
      );

      // Choose the best stats match (prefer exact name match)
      const existingStats = exactNameStats || nameBasedStats;

      if (existingStats) {
        // Worker has activity, merge with registration data
        allWorkers.push({
          ...existingStats,
          userId: regWorker.userId, // Use Discord ID as primary
          userName: regWorker.userName, // Use registered name as primary (always clean)
          registeredAt: regWorker.registeredAt,
          hasActiveSession: regWorker.hasActiveSession,
          totalPaid: regWorker.totalPaid
        } as WorkerInventoryStats);
      } else {
        // Registered worker with no activity yet
        allWorkers.push({
          userId: regWorker.userId,
          userName: regWorker.userName,
          totalTransactions: 0,
          itemsAdded: 0,
          itemsRemoved: 0,
          netItems: 0,
          categorias: {},
          firstActivity: regWorker.registeredAt,
          lastActivity: regWorker.lastActivity || regWorker.registeredAt,
          mostActiveDay: regWorker.registeredAt,
          averagePerDay: 0,
          registeredAt: regWorker.registeredAt,
          hasActiveSession: regWorker.hasActiveSession,
          totalPaid: regWorker.totalPaid,
          noActivity: true
        } as WorkerInventoryStats);
      }

      processedDiscordIds.add(regWorker.userId);
    });

    // Add any workers from transactions that weren't matched with registered workers (legacy data)
    Object.values(workerStats).forEach(stats => {
      const normalizedStatsName = stats.userName?.toLowerCase().trim();

      // Check if this transaction-based user was already merged with a registered worker
      const alreadyMerged = registeredWorkers.some(regWorker => {
        const normalizedRegName = regWorker.userName.toLowerCase().trim();
        return normalizedRegName === normalizedStatsName ||
               regWorker.userName === stats.userName;
      });

      // If not already merged, add as standalone transaction-based worker
      if (!alreadyMerged) {
        // Clean up corrupted userNames that look like Discord IDs or partial IDs
        let cleanUserName = stats.userName || '';

        // If userName looks like a Discord ID (long number) or corrupted, try to clean it
        if (/^\d{10,}$/.test(cleanUserName) || cleanUserName.includes('_')) {
          // For name-based IDs like "smith_ramirez", convert to proper name
          if (cleanUserName.includes('_')) {
            cleanUserName = cleanUserName.split('_').map(part =>
              part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join(' ');
          } else {
            // For Discord IDs, try to find a matching registration or use a fallback
            const matchingReg = registeredWorkers.find(reg => reg.userId === cleanUserName);
            if (matchingReg) {
              cleanUserName = matchingReg.userName;
            } else {
              cleanUserName = `User ${cleanUserName.slice(-4)}`; // Show last 4 digits
            }
          }
        }

        allWorkers.push({
          ...stats,
          userId: stats.userId, // Keep generated ID
          userName: cleanUserName, // Use cleaned name for display
          isLegacyUser: true // Flag to indicate this is transaction-only data
        } as WorkerInventoryStats);
      }
    });

    return {
      totalItems,
      totalQuantity,
      totalValue,
      categorias,
      workers: allWorkers,
      recentTransactions: transactions.slice(0, 50), // Last 50 transactions
      lowStockAlerts,
      priceMatches,
      unmatchedItems
    };
  }, [inventoryData.settings.lowStockThreshold, registeredWorkers]);

  // localStorage backup functions
  const backupToLocalStorage = useCallback((data: InventoryData) => {
    const storageKeys = getStorageKeys(firm.id);
    const backupData = {
      ...data,
      backupTimestamp: new Date().toISOString()
    };
    storageManager.setItem(storageKeys.inventoryData, JSON.stringify(backupData));
    storageManager.setItem(storageKeys.lastSyncTime, new Date().toISOString());
    console.log('💾 Backed up inventory data to localStorage for', firm.name);
  }, [firm.id, firm.name]);

  const loadFromLocalStorage = useCallback((): InventoryData | null => {
    try {
      const storageKeys = getStorageKeys(firm.id);
      const backupData = storageManager.getItem(storageKeys.inventoryData);
      if (backupData) {
        const parsed = JSON.parse(backupData);
        console.log('📂 Loaded inventory backup from localStorage for', firm.name);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
    }
    return null;
  }, [firm.id, firm.name]);


  // Fetch inventory data from API
  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // STEP 1: Load persistent inventory file first (contains category customizations)
      let persistentItems: Record<string, InventoryItem> = {};
      try {
        const persistentResponse = await fetch(`/api/inventory/${firm.id}`);
        if (persistentResponse.ok) {
          const persistentData = await persistentResponse.json();
          if (persistentData.success && persistentData.data?.items) {
            persistentItems = persistentData.data.items;
            console.log('📂 Loaded', Object.keys(persistentItems).length, 'items from persistent storage with customized categories');
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not load persistent inventory, will use Discord data only');
      }

      // STEP 2: Fetch Discord activities
      const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.messages && Array.isArray(data.messages)) {
          const activities = data.messages.filter((msg: ParsedActivity) =>
            msg.channelId === firm.channelId
          );

          console.log('📨 Found', activities.length, 'activities for', firm.name);

          const { itemCounts, transactions, financialTransactions } = processActivities(activities);

          // STEP 3: Merge persistent customizations with Discord data
          const mergedItems: Record<string, InventoryItem> = {};
          Object.entries(itemCounts).forEach(([itemId, discordItem]) => {
            const persistentItem = persistentItems[itemId];

            if (persistentItem) {
              // Item exists in persistent storage - preserve customizations
              mergedItems[itemId] = {
                ...discordItem,
                categoria: persistentItem.categoria, // PRESERVE custom category
                displayName: persistentItem.displayName || discordItem.displayName,
                nome: persistentItem.nome || discordItem.nome,
                notas: persistentItem.notas || discordItem.notas
              };
              console.log(`🔗 Merged ${itemId}: preserved category "${persistentItem.categoria}"`);
            } else {
              // New item from Discord - use auto-detected category
              mergedItems[itemId] = discordItem;
            }
          });

          const analytics = calculateAnalytics(mergedItems, transactions, financialTransactions);

          const newInventoryData: InventoryData = {
            items: mergedItems,
            transactions: [...transactions, ...financialTransactions],
            analytics,
            settings: inventoryData.settings,
            lastUpdate: new Date().toISOString(),
            totalItems: analytics.totalItems,
            totalQuantity: analytics.totalQuantity,
            activeWorkers: [...new Set(transactions.map(t => t.autor))]
          };

          setInventoryData(newInventoryData);

          // Backup to localStorage after successful fetch
          backupToLocalStorage(newInventoryData);

          console.log('📦 Updated inventory:', analytics.totalItems, 'items,', analytics.totalQuantity, 'total quantity,', analytics.workers.length, 'workers with activities');
        }
      } else {
        // If API fails, try loading from localStorage backup
        const backupData = loadFromLocalStorage();
        if (backupData) {
          setInventoryData(backupData);
          setError('Carregado do backup local - alguns dados podem estar desatualizados');
          console.log('📂 Loaded from localStorage backup due to API failure');
        } else {
          setError('Erro ao carregar dados do inventário');
        }
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      
      // Try loading from localStorage backup on error
      const backupData = loadFromLocalStorage();
      if (backupData) {
        setInventoryData(backupData);
        setError('Carregado do backup local - verifique sua conexão');
        console.log('📂 Loaded from localStorage backup due to network error');
      } else {
        setError('Erro ao carregar dados do inventário');
      }
    } finally {
      setLoading(false);
    }
  }, [firm.channelId, firm.name, processActivities, calculateAnalytics, inventoryData.settings, backupToLocalStorage, loadFromLocalStorage]);

  // CRUD operations
  const addItem = useCallback(async (itemData: Partial<InventoryItem>): Promise<boolean> => {
    try {
      console.log('🔄 Adding item to persistent storage:', itemData.nome);
      console.log('🔍 Using firm ID:', firm.id);
      console.log('🔍 Full API URL:', `/api/inventory/${firm.id}`);
      
      // Prepare item data with auto-filled properties
      const enrichedItemData = {
        ...itemData,
        id: itemData.id || itemData.nome || crypto.randomUUID(),
        displayName: itemData.displayName || getBestDisplayName(itemData.nome),
        categoria: itemData.categoria || getCategoryForItem(itemData.nome || ''),
      };

      // Add price matching if available
      const pricing = matchPrice(enrichedItemData.id);
      if (pricing) {
        enrichedItemData.preco_min = pricing.min;
        enrichedItemData.preco_max = pricing.max;
        enrichedItemData.preco_medio = pricing.average;
      }

      // Call API to add item with persistence
      const response = await fetch(`/api/inventory/${firm.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item: enrichedItemData })
      });

      if (!response.ok) {
        console.error('❌ API request failed with status:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('❌ API error details:', errorData);
        } catch (e) {
          console.error('❌ Could not parse error response');
        }
        return false;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Item added successfully to persistent storage:', result.item.displayName);
        
        // Refresh inventory data to reflect changes
        await fetchInventoryData();
        return true;
      } else {
        console.error('❌ Failed to add item:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error adding item:', error);
      
      // Check if it's a network error (API server not available)
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        console.log('🔄 API server unavailable, saving to localStorage backup only');
        
        // Add to pending changes for offline sync
        const storageKeys = getStorageKeys(firm.id);
        const pendingChanges = JSON.parse(storageManager.getItem(storageKeys.pendingChanges) || '[]');
        pendingChanges.push({
          type: 'add',
          data: itemData,
          timestamp: new Date().toISOString()
        });
        storageManager.setItem(storageKeys.pendingChanges, JSON.stringify(pendingChanges));
        
        // Update local state immediately for better UX
        const newItem: InventoryItem = {
          id: itemData.id || itemData.nome || crypto.randomUUID(),
          nome: itemData.nome || '',
          displayName: itemData.displayName || getBestDisplayName(itemData.nome),
          categoria: itemData.categoria || getCategoryForItem(itemData.nome || ''),
          quantidade: itemData.quantidade || 0,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          ultimo_autor: 'Local',
          ativo: itemData.ativo ?? true,
          preco_min: itemData.preco_min,
          preco_max: itemData.preco_max,
          preco_medio: itemData.preco_medio,
          notas: itemData.notas
        };
        
        // Update local inventory state
        setInventoryData(prev => ({
          ...prev,
          items: { ...prev.items, [newItem.id]: newItem },
          totalItems: prev.totalItems + 1,
          totalQuantity: prev.totalQuantity + (newItem.quantidade || 0)
        }));
        
        console.log('💾 Item saved to local state and queued for sync');
        return true;
      }
      
      return false;
    }
  }, [firm.id, getBestDisplayName, getCategoryForItem, matchPrice, fetchInventoryData]);

  const updateItem = useCallback(async (itemId: string, updates: Partial<InventoryItem>): Promise<boolean> => {
    try {
      console.log('🔄 Updating item in persistent storage:', itemId, updates);
      console.log('🔍 Using firm ID:', firm.id);
      console.log('🔍 Full API URL:', `/api/inventory/${firm.id}`);
      
      // Call API to update item with persistence
      const response = await fetch(`/api/inventory/${firm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId, updates })
      });

      if (!response.ok) {
        console.error('❌ Update API request failed with status:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('❌ Update API error details:', errorData);
          
          // If item not found (404), try to create it instead
          if (response.status === 404 && errorData.error === 'Item not found') {
            console.log('🔄 Item not found in backend, attempting to create it...');
            
            const currentItem = inventoryData.items[itemId];
            if (currentItem) {
              // Merge current item with updates and create new item
              const itemToCreate = { ...currentItem, ...updates };
              console.log('🔄 Creating item with data:', itemToCreate);
              
              const createResponse = await fetch(`/api/inventory/${firm.id}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ item: itemToCreate })
              });

              if (createResponse.ok) {
                const createResult = await createResponse.json();
                console.log('✅ Item created successfully:', createResult);

                // Update local state directly to preserve the category change
                setInventoryData(prev => ({
                  ...prev,
                  items: { ...prev.items, [itemId]: createResult.item }
                }));

                // Save category to backend if it was changed
                if (updates.categoria && updates.categoria.trim() !== '') {
                  try {
                    await fetch('http://localhost:3050/api/localization/category', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-bot-token': process.env.NEXT_PUBLIC_DISCORD_TOKEN || ''
                      },
                      body: JSON.stringify({
                        itemId: itemId,
                        category: updates.categoria.trim()
                      })
                    });
                    console.log('✅ Category saved to backend after item creation');
                  } catch (err) {
                    console.warn('⚠️ Failed to save category after creation:', err);
                  }
                }

                return true;
              } else {
                console.error('❌ Failed to create item as fallback');
              }
            }
          }
        } catch (e) {
          console.error('❌ Could not parse update error response');
        }
        return false;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Item updated successfully in persistent storage:', result.item.displayName);
        
        // Update local state directly instead of refreshing from Discord (which would overwrite changes)
        setInventoryData(prev => ({
          ...prev,
          items: { ...prev.items, [itemId]: result.item }
        }));
        
        // SAVE TO CUSTOMIZATION FILE: If displayName was changed, update custom_display_names.json
        if (updates.nome && updates.nome.trim() !== '') {
          try {
            const customizationResponse = await fetch('/api/customizations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: itemId,
                displayName: updates.nome.trim()
              })
            });

            if (customizationResponse.ok) {
              console.log('✅ Added to customization file:', itemId, '→', updates.nome);
            }
          } catch (customizationError) {
            console.warn('Failed to update customization file:', customizationError);
          }
        }

        // SAVE CATEGORY TO BACKEND: If category was changed, update backend ItemTranslationService
        if (updates.categoria && updates.categoria.trim() !== '') {
          try {
            const categoryResponse = await fetch('http://localhost:3050/api/localization/category', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-bot-token': process.env.NEXT_PUBLIC_DISCORD_TOKEN || ''
              },
              body: JSON.stringify({
                itemId: itemId,
                category: updates.categoria.trim()
              })
            });

            if (categoryResponse.ok) {
              const categoryResult = await categoryResponse.json();
              console.log('✅ Category saved to backend:', itemId, '→', updates.categoria);
              console.log('🌾 Backend now recognizes as plant:', categoryResult.data?.isPlant);
            } else {
              console.warn('⚠️ Failed to save category to backend:', await categoryResponse.text());
            }
          } catch (categoryError) {
            console.warn('⚠️ Failed to update category on backend:', categoryError);
          }
        }

        // Trigger global refresh for dashboard activities (notify other components)
        window.dispatchEvent(new CustomEvent('inventoryChanged', { 
          detail: { firmId: firm.id, itemId, updates, updatedItem: result.item } 
        }));
        console.log('📡 Dispatched inventory change event for dashboard refresh');
        
        return true;
      } else {
        console.error('❌ Failed to update item:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error updating item:', error);
      
      // Check if it's a network error (API server not available)
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        console.log('🔄 API server unavailable for update, saving to localStorage backup');
        
        // Add to pending changes for offline sync
        const storageKeys = getStorageKeys(firm.id);
        const pendingChanges = JSON.parse(storageManager.getItem(storageKeys.pendingChanges) || '[]');
        pendingChanges.push({
          type: 'update',
          itemId,
          updates,
          timestamp: new Date().toISOString()
        });
        storageManager.setItem(storageKeys.pendingChanges, JSON.stringify(pendingChanges));
        
        // Update local state immediately
        const currentItem = inventoryData.items[itemId];
        if (currentItem) {
          const updatedItem = {
            ...currentItem,
            ...updates,
            atualizado_em: new Date().toISOString(),
            ultimo_autor: 'Local'
          };
          
          setInventoryData(prev => ({
            ...prev,
            items: { ...prev.items, [itemId]: updatedItem }
          }));
          
          console.log('💾 Item update saved to local state and queued for sync');
          return true;
        }
      }
      
      return false;
    }
  }, [firm.id, fetchInventoryData]);

  const deleteItem = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      console.log('🔄 Deleting item from persistent storage:', itemId);
      
      // Call API to delete item with persistence
      const response = await fetch(`/api/inventory/${firm.id}?itemId=${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API error deleting item:', errorData.error);
        return false;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Item deleted successfully from persistent storage:', result.deletedItem.displayName);
        
        // Refresh inventory data to reflect changes
        await fetchInventoryData();
        return true;
      } else {
        console.error('❌ Failed to delete item:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error deleting item:', error);
      return false;
    }
  }, [firm.id, fetchInventoryData]);

  const updateSettings = useCallback((newSettings: Partial<InventorySettings>) => {
    setInventoryData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  // Handle offline changes - defined after CRUD operations
  const handleOfflineChanges = useCallback(async () => {
    try {
      const storageKeys = getStorageKeys(firm.id);
      const pendingChanges = storageManager.getItem(storageKeys.pendingChanges);
      
      if (pendingChanges) {
        const changes = JSON.parse(pendingChanges);
        console.log('🔄 Processing', changes.length, 'offline changes...');
        
        // Process each pending change when back online
        for (const change of changes) {
          if (change.type === 'add') {
            await addItem(change.data);
          } else if (change.type === 'update') {
            await updateItem(change.itemId, change.updates);
          } else if (change.type === 'delete') {
            await deleteItem(change.itemId);
          }
        }
        
        // Clear pending changes after successful sync
        storageManager.setItem(storageKeys.pendingChanges, JSON.stringify([]));
        console.log('✅ Processed all offline changes');
      }
    } catch (error) {
      console.error('❌ Error processing offline changes:', error);
    }
  }, [firm.id, addItem, updateItem, deleteItem]);

  // Initialize and set up auto-refresh
  useEffect(() => {
    // Try loading from backup FIRST for INSTANT load (synchronous)
    const backupData = loadFromLocalStorage();
    if (backupData) {
      setInventoryData(backupData);
      setLoading(false);
      console.log('📂 Loaded initial data from localStorage backup');
    }

    // DON'T load anything on initial mount - causes flicker
    // Load ONLY when component is actually visible/needed
    // Use a much longer delay to ensure page is stable
    const deferredLoad = setTimeout(() => {
      Promise.all([
        loadCustomizations(), // Load custom display names
        loadPriceList(),
        loadTranslations(), // Load from cached global translations
        loadRegisteredWorkers() // Load all registered workers with payment history
      ]).catch(error => {
        console.warn('Some resources failed to load:', error);
      });
    }, 500); // Longer delay ensures page is fully stable

    // Listen for customization updates
    const handleCustomizationUpdate = (event: CustomEvent) => {
      console.log('🔄 Customization updated, reloading display names...', event.detail);
      loadCustomizations();
    };

    window.addEventListener('customizationUpdated', handleCustomizationUpdate as EventListener);

    // Cleanup
    return () => {
      clearTimeout(deferredLoad);
      window.removeEventListener('customizationUpdated', handleCustomizationUpdate as EventListener);
    };
  }, [loadTranslations, loadCustomizations, loadPriceList, loadRegisteredWorkers, loadFromLocalStorage]);

  useEffect(() => {
    if (itemTranslations && Object.keys(itemTranslations).length > 0) {
      fetchInventoryData();
      
      // Process any offline changes when coming back online
      handleOfflineChanges();
    }
  }, [itemTranslations, fetchInventoryData, handleOfflineChanges]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online - syncing data...');
      fetchInventoryData();
      handleOfflineChanges();
    };

    const handleOffline = () => {
      console.log('📱 Gone offline - changes will be queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchInventoryData, handleOfflineChanges]);

  // Smart background sync - only sync when needed, not on a timer
  useEffect(() => {
    if (!autoRefresh || !inventoryData.settings.autoRefresh) return;

    let backgroundSyncInterval: NodeJS.Timeout;
    let lastActivity = Date.now();
    
    // Track user activity to avoid refreshing during active use
    const updateActivity = () => {
      lastActivity = Date.now();
    };
    
    // Listen for user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('click', updateActivity);
    
    // Only sync in background when user is inactive for 30+ seconds
    backgroundSyncInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity;
      const timeSinceLastUpdate = Date.now() - new Date(inventoryData.lastUpdate).getTime();
      
      // Sync conditions:
      // 1. User has been inactive for 30+ seconds
      // 2. Last update was more than 5 minutes ago
      // 3. No pending API calls
      if (timeSinceActivity > 30000 && timeSinceLastUpdate > 300000 && !loading) {
        console.log('🔄 Background sync: Refreshing inventory data due to inactivity');
        fetchInventoryData();
      }
    }, 60000); // Check every minute instead of every 30 seconds

    return () => {
      clearInterval(backgroundSyncInterval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [autoRefresh, inventoryData.settings.autoRefresh, inventoryData.lastUpdate, loading, fetchInventoryData]);

  // Memoized filtered data for performance
  const filteredData = useMemo(() => ({
    items: inventoryData.items,
    itemsArray: Object.values(inventoryData.items),
    categories: INVENTORY_CATEGORIES,
    translations: itemTranslations,
    priceList
  }), [inventoryData.items, itemTranslations, priceList]);

  return {
    // Data
    inventoryData,
    loading,
    error,
    filteredData,
    
    // Functions
    getBestDisplayName,
    getCategoryForItem,
    matchPrice,
    fetchInventoryData,
    
    // CRUD operations
    addItem,
    updateItem,
    deleteItem,
    updateSettings,
    
    // Utils
    refresh: fetchInventoryData,
    isReady: !loading && Object.keys(itemTranslations).length > 0
  };
}