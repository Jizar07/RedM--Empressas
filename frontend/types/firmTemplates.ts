export interface FirmTemplateComponent {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  settings?: Record<string, any>;
}

export interface FirmTemplateTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  iconStyle?: 'outline' | 'filled' | 'duotone';
}

export interface FirmTemplateConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  components: FirmTemplateComponent[];
  theme: FirmTemplateTheme;
  features: {
    dashboard: boolean;
    inventory: boolean;
    workers: boolean;
    analytics: boolean;
    payments: boolean;
    customFields?: Record<string, any>;
  };
  customization: {
    allowThemeChange: boolean;
    allowComponentToggle: boolean;
    allowCustomFields: boolean;
  };
  dataMapping: {
    channelIdField: string;
    authorField: string;
    timestampField: string;
    contentField: string;
    amountField?: string;
    itemField?: string;
  };
}

export interface FirmInstanceConfig extends FirmTemplateConfig {
  firmId: string;
  firmName: string;
  channelId: string;
  allowedRoles: string[];
  customSettings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type TemplateType = 'fazenda-bw' | 'generic' | 'custom';

export interface TemplatePreset {
  type: TemplateType;
  name: string;
  description: string;
  icon: string;
  config: FirmTemplateConfig;
  preview?: string;
}

export const DEFAULT_FAZENDA_BW_TEMPLATE: FirmTemplateConfig = {
  id: 'fazenda-bw-v1',
  name: 'Fazenda BW Template',
  description: 'Complete farm management dashboard with real-time monitoring',
  version: '1.0.0',
  author: 'System',
  components: [
    {
      id: 'dashboard',
      name: 'Dashboard Overview',
      enabled: true,
      order: 0,
      settings: {
        showMetrics: true,
        showRecentActivity: true,
        showWorkerStats: true,
        metricCards: ['revenue', 'activities', 'workers', 'inventory', 'bankBalance']
      }
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      enabled: true,
      order: 1,
      settings: {
        showAnimals: true,
        showCrops: true,
        showMaterials: true,
        allowManualEntry: false,
        groupByCategory: true
      }
    },
    {
      id: 'workers',
      name: 'Worker Management',
      enabled: true,
      order: 2,
      settings: {
        showPayments: true,
        showAnalytics: true,
        allowPaymentManagement: true,
        showWorkHistory: true
      }
    },
    {
      id: 'analytics',
      name: 'Analytics Dashboard',
      enabled: true,
      order: 3,
      settings: {
        showCharts: true,
        showTrends: true,
        timeRange: '30d',
        chartTypes: ['line', 'bar', 'pie']
      }
    },
    {
      id: 'payments',
      name: 'Payment Management',
      enabled: true,
      order: 4,
      settings: {
        allowBulkPayments: true,
        showPaymentHistory: true,
        requireApproval: false
      }
    }
  ],
  theme: {
    primaryColor: '#059669',
    secondaryColor: '#065f46',
    accentColor: '#10b981',
    backgroundColor: '#f0fdf4',
    textColor: '#1f2937',
    iconStyle: 'outline'
  },
  features: {
    dashboard: true,
    inventory: true,
    workers: true,
    analytics: true,
    payments: true,
    customFields: {
      bankingEnabled: true,
      itemTranslations: true,
      animalManagement: true,
      cropManagement: true
    }
  },
  customization: {
    allowThemeChange: true,
    allowComponentToggle: true,
    allowCustomFields: false
  },
  dataMapping: {
    channelIdField: 'channelId',
    authorField: 'autor',
    timestampField: 'timestamp',
    contentField: 'content',
    amountField: 'valor',
    itemField: 'item'
  }
};

export const DEFAULT_GENERIC_TEMPLATE: FirmTemplateConfig = {
  id: 'generic-v1',
  name: 'Generic Business Template',
  description: 'Basic business dashboard with essential features',
  version: '1.0.0',
  author: 'System',
  components: [
    {
      id: 'dashboard',
      name: 'Dashboard Overview',
      enabled: true,
      order: 0,
      settings: {
        showMetrics: true,
        showRecentActivity: true,
        metricCards: ['revenue', 'activities', 'users']
      }
    },
    {
      id: 'analytics',
      name: 'Analytics',
      enabled: true,
      order: 1,
      settings: {
        showCharts: true,
        timeRange: '7d',
        chartTypes: ['line', 'bar']
      }
    }
  ],
  theme: {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    accentColor: '#60a5fa',
    backgroundColor: '#f8fafc',
    textColor: '#1f2937',
    iconStyle: 'outline'
  },
  features: {
    dashboard: true,
    inventory: false,
    workers: false,
    analytics: true,
    payments: false
  },
  customization: {
    allowThemeChange: true,
    allowComponentToggle: true,
    allowCustomFields: true
  },
  dataMapping: {
    channelIdField: 'channelId',
    authorField: 'author',
    timestampField: 'timestamp',
    contentField: 'content',
    amountField: 'amount',
    itemField: 'item'
  }
};

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    type: 'fazenda-bw',
    name: 'Fazenda BW',
    description: 'Complete farm management system with inventory, workers, and analytics',
    icon: '🌾',
    config: DEFAULT_FAZENDA_BW_TEMPLATE
  },
  {
    type: 'generic',
    name: 'Generic Business',
    description: 'Basic business dashboard for general use',
    icon: '🏢',
    config: DEFAULT_GENERIC_TEMPLATE
  },
  {
    type: 'custom',
    name: 'Custom Template',
    description: 'Create your own template from scratch',
    icon: '🎨',
    config: DEFAULT_GENERIC_TEMPLATE // Will be customized
  }
];