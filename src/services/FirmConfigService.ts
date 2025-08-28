import fs from 'fs';
import path from 'path';

interface FirmTheme {
  primaryColor: string;
  secondaryColor: string;
}

interface FirmDisplay {
  itemTranslations: Record<string, string>;
  bankingEnabled: boolean;
  theme: FirmTheme;
}

interface FirmMonitoring {
  enabled: boolean;
  endpoint: string;
  endpointType: 'frontend' | 'backend' | 'custom';
  messageTypes: string[];
}

interface FirmConfig {
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

interface FirmsConfig {
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

interface CreateFirmRequest {
  name: string;
  description?: string;
  channelId: string;
  allowedRoles: string[];
  monitoring: Omit<FirmMonitoring, 'enabled'>;
  display?: Partial<FirmDisplay>;
}

interface UpdateFirmRequest extends Partial<CreateFirmRequest> {
  id: string;
  enabled?: boolean;
}

export class FirmConfigService {
  private static instance: FirmConfigService;
  private configPath: string;
  private config: FirmsConfig | null = null;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'data', 'firms-config.json');
    this.ensureConfigExists();
  }

  public static getInstance(): FirmConfigService {
    if (!FirmConfigService.instance) {
      FirmConfigService.instance = new FirmConfigService();
    }
    return FirmConfigService.instance;
  }

  private ensureConfigExists(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        console.log('📁 Creating default firms config file...');
        this.createDefaultConfig();
      }
    } catch (error) {
      console.error('❌ Error ensuring firms config exists:', error);
      this.createDefaultConfig();
    }
  }

  private createDefaultConfig(): void {
    const defaultConfig: FirmsConfig = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      firms: {},
      settings: {
        defaultEndpointType: 'frontend',
        maxFirmsPerUser: 10,
        enableRoleSync: true,
        monitoringInterval: 30000
      }
    };

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ Created default firms configuration');
    } catch (error) {
      console.error('❌ Failed to create default firms config:', error);
    }
  }

  private loadConfig(): FirmsConfig {
    try {
      if (this.config) {
        return this.config;
      }

      const configData = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configData);
      return this.config!; // We know it's not null at this point
    } catch (error) {
      console.error('❌ Error loading firms config:', error);
      this.createDefaultConfig();
      return this.loadConfig();
    }
  }

  private saveConfig(config: FirmsConfig): void {
    try {
      config.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      this.config = config;
      console.log('💾 Firms configuration saved successfully');
    } catch (error) {
      console.error('❌ Error saving firms config:', error);
      throw new Error('Failed to save firms configuration');
    }
  }

  public getAllFirms(): Record<string, FirmConfig> {
    const config = this.loadConfig();
    return config.firms;
  }

  public getFirm(firmId: string): FirmConfig | null {
    const config = this.loadConfig();
    return config.firms[firmId] || null;
  }

  public getFirmsForRoles(userRoles: string[]): FirmConfig[] {
    const config = this.loadConfig();
    const userRolesLower = userRoles.map(role => role.toLowerCase());
    
    return Object.values(config.firms).filter(firm => {
      if (!firm.enabled) return false;
      
      // Check if user has any of the required roles for this firm
      const hasAccess = firm.allowedRoles.some(requiredRole => 
        userRolesLower.includes(requiredRole.toLowerCase())
      );
      
      return hasAccess;
    });
  }

  public createFirm(request: CreateFirmRequest): FirmConfig {
    const config = this.loadConfig();
    
    // Generate firm ID from name
    const firmId = request.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    if (config.firms[firmId]) {
      throw new Error(`Firm with ID "${firmId}" already exists`);
    }

    // Validate channel ID format
    if (!/^\d{17,19}$/.test(request.channelId)) {
      throw new Error('Invalid Discord channel ID format');
    }

    const defaultTheme: FirmTheme = {
      primaryColor: '#16a34a',
      secondaryColor: '#15803d'
    };

    const defaultDisplay: FirmDisplay = {
      itemTranslations: {},
      bankingEnabled: true,
      theme: defaultTheme,
      ...request.display
    };

    const newFirm: FirmConfig = {
      id: firmId,
      name: request.name,
      description: request.description,
      channelId: request.channelId,
      allowedRoles: request.allowedRoles,
      enabled: true,
      monitoring: {
        ...request.monitoring,
        enabled: true
      },
      display: defaultDisplay,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    config.firms[firmId] = newFirm;
    this.saveConfig(config);
    
    console.log(`✅ Created new firm: ${newFirm.name} (${firmId})`);
    return newFirm;
  }

  public updateFirm(request: UpdateFirmRequest): FirmConfig {
    const config = this.loadConfig();
    const existingFirm = config.firms[request.id];

    if (!existingFirm) {
      throw new Error(`Firm with ID "${request.id}" not found`);
    }

    // Validate channel ID if provided
    if (request.channelId && !/^\d{17,19}$/.test(request.channelId)) {
      throw new Error('Invalid Discord channel ID format');
    }

    const updatedFirm: FirmConfig = {
      ...existingFirm,
      ...request,
      id: existingFirm.id, // Prevent ID changes
      createdAt: existingFirm.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
      display: {
        ...existingFirm.display,
        ...request.display
      },
      monitoring: {
        ...existingFirm.monitoring,
        ...request.monitoring
      }
    };

    config.firms[request.id] = updatedFirm;
    this.saveConfig(config);
    
    console.log(`✅ Updated firm: ${updatedFirm.name} (${request.id})`);
    return updatedFirm;
  }

  public deleteFirm(firmId: string): boolean {
    const config = this.loadConfig();
    
    if (!config.firms[firmId]) {
      throw new Error(`Firm with ID "${firmId}" not found`);
    }

    const firmName = config.firms[firmId].name;
    delete config.firms[firmId];
    this.saveConfig(config);
    
    console.log(`🗑️ Deleted firm: ${firmName} (${firmId})`);
    return true;
  }

  public toggleFirmEnabled(firmId: string, enabled: boolean): FirmConfig {
    const config = this.loadConfig();
    const firm = config.firms[firmId];

    if (!firm) {
      throw new Error(`Firm with ID "${firmId}" not found`);
    }

    firm.enabled = enabled;
    firm.monitoring.enabled = enabled;
    firm.updatedAt = new Date().toISOString();
    
    config.firms[firmId] = firm;
    this.saveConfig(config);
    
    console.log(`${enabled ? '🟢' : '🔴'} Firm ${firm.name} ${enabled ? 'enabled' : 'disabled'}`);
    return firm;
  }

  public getSettings(): FirmsConfig['settings'] {
    const config = this.loadConfig();
    return config.settings;
  }

  public updateSettings(settings: Partial<FirmsConfig['settings']>): FirmsConfig['settings'] {
    const config = this.loadConfig();
    config.settings = { ...config.settings, ...settings };
    this.saveConfig(config);
    
    console.log('⚙️ Firms settings updated');
    return config.settings;
  }

  public getMonitoredChannels(): Array<{ firmId: string; channelId: string; endpoint: string }> {
    const config = this.loadConfig();
    
    return Object.values(config.firms)
      .filter(firm => firm.enabled && firm.monitoring.enabled)
      .map(firm => ({
        firmId: firm.id,
        channelId: firm.channelId,
        endpoint: firm.monitoring.endpoint
      }));
  }

  public getFirmByChannelId(channelId: string): FirmConfig | null {
    const config = this.loadConfig();
    
    for (const firm of Object.values(config.firms)) {
      if (firm.channelId === channelId && firm.enabled) {
        return firm;
      }
    }
    
    return null;
  }

  // Force reload config from file (useful for hot-reloading)
  public reloadConfig(): void {
    this.config = null;
    console.log('🔄 Firms configuration reloaded from file');
  }
}