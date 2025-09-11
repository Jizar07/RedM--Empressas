// Unified inventory system types for Fazenda Cabra da Peste
export interface InventoryItem {
  id: string;
  nome: string; // Original item name/ID
  displayName: string; // Translated/formatted display name
  categoria: string;
  quantidade: number;
  preco_min?: number;
  preco_max?: number;
  preco_medio?: number;
  criado_em: string;
  atualizado_em: string;
  ultimo_autor: string;
  ativo: boolean;
  notas?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  tipo: 'adicionar' | 'remover' | 'editar' | 'criar' | 'deletar';
  quantidade_anterior: number;
  quantidade_posterior: number;
  quantidade_mudanca: number;
  autor: string;
  timestamp: string;
  origem: 'discord' | 'manual' | 'import' | 'system';
  detalhes?: string;
  metadata?: Record<string, any>;
}

export interface WorkerInventoryStats {
  userId: string;
  userName: string;
  totalTransactions: number;
  itemsAdded: number;
  itemsRemoved: number;
  netItems: number;
  categorias: Record<string, {
    added: number;
    removed: number;
    net: number;
  }>;
  firstActivity: string;
  lastActivity: string;
  mostActiveDay: string;
  averagePerDay: number;
}

export interface InventoryAnalytics {
  totalItems: number;
  totalQuantity: number;
  totalValue: number; // Based on average prices
  categorias: Record<string, {
    count: number;
    quantity: number;
    value: number;
  }>;
  workers: WorkerInventoryStats[];
  recentTransactions: InventoryTransaction[];
  lowStockAlerts: InventoryItem[];
  priceMatches: number;
  unmatchedItems: string[];
}

export interface InventorySettings {
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  showZeroQuantity: boolean;
  defaultCategory: string;
  autoCategorizationEnabled: boolean;
  priceMatchingEnabled: boolean;
  lowStockThreshold: number;
  notificationsEnabled: boolean;
  exportFormat: 'csv' | 'json';
  workerTrackingEnabled: boolean;
  globalTranslationsEnabled: boolean;
  backupEnabled: boolean;
  backupInterval: number; // hours
}

export interface PriceListItem {
  id: string;
  nome: string;
  categoria: string;
  preco_min: number;
  preco_max: number;
  atualizado_em: string;
}

export interface InventoryData {
  items: Record<string, InventoryItem>;
  transactions: InventoryTransaction[];
  analytics: InventoryAnalytics;
  settings: InventorySettings;
  lastUpdate: string;
  totalItems: number;
  totalQuantity: number;
  activeWorkers: string[];
}

// Activity data from Discord messages
export interface ParsedActivity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda' | 'compra';
  categoria?: 'inventario' | 'financeiro' | 'sistema';
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
  parseSuccess?: boolean;
  displayText?: string;
  confidence?: 'high' | 'medium' | 'low' | 'none';
  channelId?: string;
}

// Default categories mapping
export const INVENTORY_CATEGORIES = {
  'plantas': 'Plantas',
  'sementes': 'Sementes', 
  'racoes': 'Rações',
  'comidas': 'Comidas',
  'bebidas': 'Bebidas',
  'animais': 'Animais',
  'materiais': 'Materiais',
  'ferramentas': 'Ferramentas',
  'produtos': 'Produtos',
  'consumeveis': 'Consumíveis',
  'caixas': 'Caixas',
  'outros': 'Outros'
} as const;

// Price list categories for mapping
export const PRICE_CATEGORIES = {
  'ALIMENTACAO': 'Alimentação',
  'ARMARIAS': 'Armarias',
  'FAZENDAS': 'Fazendas',
  'ESTABLOS': 'Establos',
  'FERRARIAS': 'Ferrarias',
  'FOGOS': 'Fogos',
  'ARTESANATO': 'Artesanato',
  'MEDICOS': 'Médicos',
  'DOCERIA': 'Doceria',
  'GRAFICA': 'Gráfica',
  'MUNICAO_ESPECIAL': 'Munição Especial',
  'PADARIA': 'Padaria',
  'CAVALARIA': 'Cavalaria',
  'ATELIE': 'Ateliê',
  'JORNAL': 'Jornal',
  'MADEIREIRA': 'Madeireira',
  'TABACARIA': 'Tabacaria',
  'MINERADORA': 'Mineradora',
  'INDIGENAS': 'Indígenas'
} as const;

export type InventoryCategory = keyof typeof INVENTORY_CATEGORIES;
export type PriceCategory = keyof typeof PRICE_CATEGORIES;

// Default settings
export const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
  autoRefresh: true,
  refreshInterval: 30,
  showZeroQuantity: true,
  defaultCategory: 'outros',
  autoCategorizationEnabled: true,
  priceMatchingEnabled: true,
  lowStockThreshold: 5,
  notificationsEnabled: true,
  exportFormat: 'csv',
  workerTrackingEnabled: true,
  globalTranslationsEnabled: true,
  backupEnabled: true,
  backupInterval: 24
};