'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

interface UseInventoryManagerProps {
  firm: FirmConfig;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

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

  // Load global translations
  const loadTranslations = useCallback(async () => {
    try {
      if (firm?.display?.itemTranslations === "global") {
        console.log('🌍 Loading global translations for', firm.name);
        const response = await fetch('http://localhost:3050/api/localization/translations');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.custom_overrides) {
            setItemTranslations(data.data.custom_overrides);
            console.log('✅ Loaded', Object.keys(data.data.custom_overrides).length, 'global translations');
          }
        }
      }
    } catch (error) {
      console.debug('Localization service not available:', error);
    }
  }, [firm]);

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

  // Process Discord activities into inventory items
  const processActivities = useCallback((activities: ParsedActivity[]) => {
    const itemCounts: Record<string, InventoryItem> = {};
    const transactions: InventoryTransaction[] = [];
    
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
    });

    return { itemCounts, transactions };
  }, [itemTranslations, getBestDisplayName, getCategoryForItem, matchPrice]);

  // Calculate analytics
  const calculateAnalytics = useCallback((items: Record<string, InventoryItem>, transactions: InventoryTransaction[]) => {
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

    // Worker analysis
    const workerStats: Record<string, Partial<WorkerInventoryStats>> = {};
    transactions.forEach(transaction => {
      if (!workerStats[transaction.autor]) {
        workerStats[transaction.autor] = {
          userId: transaction.autor,
          userName: transaction.autor,
          totalTransactions: 0,
          itemsAdded: 0,
          itemsRemoved: 0,
          netItems: 0,
          categorias: {},
          firstActivity: transaction.timestamp,
          lastActivity: transaction.timestamp
        };
      }
      
      const stats = workerStats[transaction.autor];
      stats.totalTransactions!++;
      stats.lastActivity = transaction.timestamp;
      
      if (transaction.tipo === 'adicionar') {
        stats.itemsAdded! += transaction.quantidade_mudanca;
        stats.netItems! += transaction.quantidade_mudanca;
      } else if (transaction.tipo === 'remover') {
        stats.itemsRemoved! += Math.abs(transaction.quantidade_mudanca);
        stats.netItems! += transaction.quantidade_mudanca; // Already negative
      }
    });

    // Low stock alerts (threshold from settings)
    const lowStockAlerts = Object.values(items).filter(
      item => item.quantidade <= inventoryData.settings.lowStockThreshold && item.ativo
    );

    // Price matches
    const priceMatches = Object.values(items).filter(item => item.preco_min && item.preco_max).length;
    const unmatchedItems = Object.values(items).filter(item => !item.preco_min && !item.preco_max).map(item => item.id);

    return {
      totalItems,
      totalQuantity,
      totalValue,
      categorias,
      workers: Object.values(workerStats) as WorkerInventoryStats[],
      recentTransactions: transactions.slice(0, 50), // Last 50 transactions
      lowStockAlerts,
      priceMatches,
      unmatchedItems
    };
  }, [inventoryData.settings.lowStockThreshold]);

  // Fetch inventory data from API
  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
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
          
          const { itemCounts, transactions } = processActivities(activities);
          const analytics = calculateAnalytics(itemCounts, transactions);
          
          const newInventoryData: InventoryData = {
            items: itemCounts,
            transactions,
            analytics,
            settings: inventoryData.settings,
            lastUpdate: new Date().toISOString(),
            totalItems: analytics.totalItems,
            totalQuantity: analytics.totalQuantity,
            activeWorkers: [...new Set(transactions.map(t => t.autor))]
          };
          
          setInventoryData(newInventoryData);
          console.log('📦 Updated inventory:', analytics.totalItems, 'items,', analytics.totalQuantity, 'total quantity');
        }
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setError('Erro ao carregar dados do inventário');
    } finally {
      setLoading(false);
    }
  }, [firm.channelId, firm.name, processActivities, calculateAnalytics, inventoryData.settings]);

  // CRUD operations
  const addItem = useCallback(async (itemData: Partial<InventoryItem>): Promise<boolean> => {
    try {
      const newItem: InventoryItem = {
        id: itemData.id || itemData.nome || crypto.randomUUID(),
        nome: itemData.nome || '',
        displayName: itemData.displayName || getBestDisplayName(itemData.nome),
        categoria: itemData.categoria || getCategoryForItem(itemData.nome || ''),
        quantidade: itemData.quantidade || 0,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        ultimo_autor: 'Manual',
        ativo: true,
        ...itemData
      };

      // Add price matching if available
      const pricing = matchPrice(newItem.id);
      if (pricing) {
        newItem.preco_min = pricing.min;
        newItem.preco_max = pricing.max;
        newItem.preco_medio = pricing.average;
      }

      const newTransaction: InventoryTransaction = {
        id: crypto.randomUUID(),
        itemId: newItem.id,
        tipo: 'criar',
        quantidade_anterior: 0,
        quantidade_posterior: newItem.quantidade,
        quantidade_mudanca: newItem.quantidade,
        autor: 'Manual',
        timestamp: new Date().toISOString(),
        origem: 'manual',
        detalhes: `Criou item ${newItem.displayName}`
      };

      setInventoryData(prev => {
        const newItems = { ...prev.items, [newItem.id]: newItem };
        const newTransactions = [...prev.transactions, newTransaction];
        const newAnalytics = calculateAnalytics(newItems, newTransactions);
        
        return {
          ...prev,
          items: newItems,
          transactions: newTransactions,
          analytics: newAnalytics,
          lastUpdate: new Date().toISOString(),
          totalItems: newAnalytics.totalItems,
          totalQuantity: newAnalytics.totalQuantity
        };
      });

      return true;
    } catch (error) {
      console.error('Error adding item:', error);
      return false;
    }
  }, [getBestDisplayName, getCategoryForItem, matchPrice, calculateAnalytics]);

  const updateItem = useCallback(async (itemId: string, updates: Partial<InventoryItem>): Promise<boolean> => {
    try {
      const currentItem = inventoryData.items[itemId];
      if (!currentItem) return false;

      const updatedItem: InventoryItem = {
        ...currentItem,
        ...updates,
        atualizado_em: new Date().toISOString(),
        ultimo_autor: 'Manual'
      };

      const newTransaction: InventoryTransaction = {
        id: crypto.randomUUID(),
        itemId: itemId,
        tipo: 'editar',
        quantidade_anterior: currentItem.quantidade,
        quantidade_posterior: updatedItem.quantidade,
        quantidade_mudanca: updatedItem.quantidade - currentItem.quantidade,
        autor: 'Manual',
        timestamp: new Date().toISOString(),
        origem: 'manual',
        detalhes: `Editou ${updatedItem.displayName}`
      };

      setInventoryData(prev => {
        const newItems = { ...prev.items, [itemId]: updatedItem };
        const newTransactions = [...prev.transactions, newTransaction];
        const newAnalytics = calculateAnalytics(newItems, newTransactions);
        
        return {
          ...prev,
          items: newItems,
          transactions: newTransactions,
          analytics: newAnalytics,
          lastUpdate: new Date().toISOString(),
          totalItems: newAnalytics.totalItems,
          totalQuantity: newAnalytics.totalQuantity
        };
      });

      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      return false;
    }
  }, [inventoryData.items, calculateAnalytics]);

  const deleteItem = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      const currentItem = inventoryData.items[itemId];
      if (!currentItem) return false;

      const newTransaction: InventoryTransaction = {
        id: crypto.randomUUID(),
        itemId: itemId,
        tipo: 'deletar',
        quantidade_anterior: currentItem.quantidade,
        quantidade_posterior: 0,
        quantidade_mudanca: -currentItem.quantidade,
        autor: 'Manual',
        timestamp: new Date().toISOString(),
        origem: 'manual',
        detalhes: `Deletou ${currentItem.displayName}`
      };

      setInventoryData(prev => {
        const newItems = { ...prev.items };
        delete newItems[itemId];
        const newTransactions = [...prev.transactions, newTransaction];
        const newAnalytics = calculateAnalytics(newItems, newTransactions);
        
        return {
          ...prev,
          items: newItems,
          transactions: newTransactions,
          analytics: newAnalytics,
          lastUpdate: new Date().toISOString(),
          totalItems: newAnalytics.totalItems,
          totalQuantity: newAnalytics.totalQuantity
        };
      });

      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      return false;
    }
  }, [inventoryData.items, calculateAnalytics]);

  const updateSettings = useCallback((newSettings: Partial<InventorySettings>) => {
    setInventoryData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  // Initialize and set up auto-refresh
  useEffect(() => {
    loadTranslations();
    loadPriceList();
  }, [loadTranslations, loadPriceList]);

  useEffect(() => {
    if (itemTranslations && Object.keys(itemTranslations).length > 0) {
      fetchInventoryData();
    }
  }, [itemTranslations, fetchInventoryData]);

  useEffect(() => {
    if (!autoRefresh || !inventoryData.settings.autoRefresh) return;

    const interval = setInterval(() => {
      fetchInventoryData();
    }, inventoryData.settings.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, inventoryData.settings.autoRefresh, inventoryData.settings.refreshInterval, fetchInventoryData]);

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