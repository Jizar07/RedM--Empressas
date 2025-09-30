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

export type TemplateType = 'fazenda' | 'ferrovia' | 'bercario' | 'veterinaria';

export interface TemplatePreset {
  type: TemplateType;
  name: string;
  description: string;
  icon: string;
  config: FirmTemplateConfig;
  preview?: string;
}

// Template based on Fazenda Cabra da Peste (working system)
export const FAZENDA_TEMPLATE: FirmTemplateConfig = {
  id: 'fazenda-v1',
  name: 'Fazenda',
  description: 'Sistema completo de gestão de fazenda com inventário, trabalhadores e análises',
  version: '1.0.0',
  author: 'System',
  components: [
    {
      id: 'dashboard',
      name: 'Dashboard',
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
      name: 'Estoque',
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
      name: 'Trabalhadores',
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
      name: 'Análises',
      enabled: true,
      order: 3,
      settings: {
        showCharts: true,
        showTrends: true,
        timeRange: '30d',
        chartTypes: ['line', 'bar', 'pie']
      }
    }
  ],
  theme: {
    primaryColor: '#16a34a',
    secondaryColor: '#15803d',
    accentColor: '#22c55e',
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

// Template based on Ferrovia (working system)
export const FERROVIA_TEMPLATE: FirmTemplateConfig = {
  id: 'ferrovia-v1',
  name: 'Ferrovia',
  description: 'Sistema de gestão de ferrovia com missões, caixas e pagamentos',
  version: '1.0.0',
  author: 'System',
  components: [
    {
      id: 'dashboard',
      name: 'Dashboard',
      enabled: true,
      order: 0,
      settings: {
        showMetrics: true,
        showRecentActivity: true,
        showMissionStats: true,
        metricCards: ['missions', 'revenue', 'workers', 'boxes']
      }
    },
    {
      id: 'workers',
      name: 'Trabalhadores',
      enabled: true,
      order: 1,
      settings: {
        showPayments: true,
        showMissionHistory: true,
        allowPaymentManagement: true,
        showWorkHistory: true
      }
    },
    {
      id: 'analytics',
      name: 'Análises',
      enabled: true,
      order: 2,
      settings: {
        showCharts: true,
        showTrends: true,
        timeRange: '30d',
        chartTypes: ['line', 'bar']
      }
    },
    {
      id: 'payments',
      name: 'Pagamentos',
      enabled: true,
      order: 3,
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
    inventory: false, // Ferrovia doesn't have inventory management
    workers: true,
    analytics: true,
    payments: true,
    customFields: {
      bankingEnabled: true,
      itemTranslations: true,
      missionTracking: true
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

// Template based on Berçário (working system)
export const BERCARIO_TEMPLATE: FirmTemplateConfig = {
  id: 'bercario-v1',
  name: 'Berçário',
  description: 'Sistema de gestão de berçário com inventário de animais e clientes',
  version: '1.0.0',
  author: 'System',
  components: [
    {
      id: 'dashboard',
      name: 'Dashboard',
      enabled: true,
      order: 0,
      settings: {
        showMetrics: true,
        showRecentActivity: true,
        metricCards: ['animals', 'clients', 'revenue', 'inventory']
      }
    },
    {
      id: 'inventory',
      name: 'Inventário',
      enabled: true,
      order: 1,
      settings: {
        showAnimals: true,
        showSupplies: true,
        allowManualEntry: false,
        groupByCategory: true
      }
    },
    {
      id: 'workers',
      name: 'Trabalhadores',
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
      name: 'Análises',
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
      name: 'Pagamentos',
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
    primaryColor: '#16a34a',
    secondaryColor: '#15803d',
    accentColor: '#22c55e',
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
      clientTracking: true
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

// Template based on Veterinária (working system)
export const VETERINARIA_TEMPLATE: FirmTemplateConfig = {
  id: 'veterinaria-v1',
  name: 'Veterinária',
  description: 'Sistema de gestão veterinária com inventário de medicamentos e trabalhadores',
  version: '1.0.0',
  author: 'System',
  components: [
    {
      id: 'dashboard',
      name: 'Dashboard',
      enabled: true,
      order: 0,
      settings: {
        showMetrics: true,
        showRecentActivity: true,
        metricCards: ['revenue', 'activities', 'workers', 'inventory']
      }
    },
    {
      id: 'inventory',
      name: 'Estoque',
      enabled: true,
      order: 1,
      settings: {
        showMedicines: true,
        showSupplies: true,
        allowManualEntry: false,
        groupByCategory: true
      }
    },
    {
      id: 'workers',
      name: 'Trabalhadores',
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
      name: 'Análises',
      enabled: true,
      order: 3,
      settings: {
        showCharts: true,
        showTrends: true,
        timeRange: '30d',
        chartTypes: ['line', 'bar']
      }
    }
  ],
  theme: {
    primaryColor: '#16a34a',
    secondaryColor: '#15803d',
    accentColor: '#22c55e',
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
      medicineManagement: true
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
    type: 'fazenda',
    name: 'Fazenda',
    description: 'Sistema completo de gestão de fazenda com inventário, trabalhadores e análises',
    icon: '🌾',
    config: FAZENDA_TEMPLATE
  },
  {
    type: 'ferrovia',
    name: 'Ferrovia',
    description: 'Sistema de gestão de ferrovia com missões, caixas e pagamentos',
    icon: '🚂',
    config: FERROVIA_TEMPLATE
  },
  {
    type: 'bercario',
    name: 'Berçário',
    description: 'Sistema de gestão de berçário com inventário de animais e clientes',
    icon: '🐣',
    config: BERCARIO_TEMPLATE
  },
  {
    type: 'veterinaria',
    name: 'Veterinária',
    description: 'Sistema de gestão veterinária com inventário de medicamentos e trabalhadores',
    icon: '🏥',
    config: VETERINARIA_TEMPLATE
  }
];