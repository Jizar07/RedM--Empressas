export interface FirmTheme {
  primaryColor: string;
  secondaryColor: string;
}

export interface FirmDisplay {
  itemTranslations: Record<string, string>;
  bankingEnabled: boolean;
  theme: FirmTheme;
}

export interface FirmMonitoring {
  enabled: boolean;
  endpoint: string;
  endpointType: 'frontend' | 'backend' | 'custom';
  messageTypes: string[];
}

export interface FirmConfig {
  id: string;
  name: string;
  description?: string;
  channelId: string;
  allowedRoles: string[];
  enabled: boolean;
  monitoring: FirmMonitoring;
  display: FirmDisplay;
  createdAt: string;
  updatedAt: string;
}

export interface FirmStats {
  messagesThisHour: number;
  messagesThisDay: number;
  errorsThisHour: number;
  lastRestart: string;
}

export interface FirmMonitoringStatus {
  firmId: string;
  isMonitoring: boolean;
  lastMessageReceived: string | null;
  messagesProcessed: number;
  lastError: string | null;
  uptime: number;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  endpointHealth: 'healthy' | 'unhealthy' | 'unknown';
  stats: FirmStats;
}

export interface GlobalMonitoringStatus {
  totalFirmsMonitored: number;
  totalMessagesProcessed: number;
  systemUptime: number;
  lastSystemRestart: string;
}

export interface FirmsConfig {
  version: string;
  lastUpdated: string;
  firms: Record<string, FirmConfig>;
  settings: {
    defaultEndpointType: 'frontend' | 'backend' | 'custom';
    maxFirmsPerUser: number;
    enableRoleSync: boolean;
    monitoringInterval: number;
  };
}

export interface MonitoringStatusData {
  version: string;
  lastUpdated: string;
  status: Record<string, FirmMonitoringStatus>;
  global: GlobalMonitoringStatus;
}

export interface CreateFirmRequest {
  name: string;
  description?: string;
  channelId: string;
  allowedRoles: string[];
  monitoring: Omit<FirmMonitoring, 'enabled'>;
  display?: Partial<FirmDisplay>;
}

export interface UpdateFirmRequest extends Partial<CreateFirmRequest> {
  id: string;
  enabled?: boolean;
}

export interface FirmAccessInfo {
  firmId: string;
  hasAccess: boolean;
  userRoles: string[];
  requiredRoles: string[];
}

export type EndpointType = 'frontend' | 'backend' | 'custom';

export interface EndpointPreset {
  type: EndpointType;
  name: string;
  url: string;
  description: string;
  icon: string;
}

export const DEFAULT_ENDPOINT_PRESETS: EndpointPreset[] = [
  {
    type: 'frontend',
    name: 'Frontend Dashboard',
    url: 'http://localhost:3051/api/webhook/channel-messages',
    description: 'Send to frontend dashboard for real-time display',
    icon: 'Monitor'
  },
  {
    type: 'backend',
    name: 'Backend System',
    url: 'http://localhost:3050/api/bot-data/channel-logs',
    description: 'Send to backend farm management system',
    icon: 'Settings'
  },
  {
    type: 'custom',
    name: 'Custom Webhook',
    url: '',
    description: 'Send to external system endpoint',
    icon: 'Link'
  }
];