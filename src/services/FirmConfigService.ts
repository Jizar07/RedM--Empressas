import fs from 'fs';
import path from 'path';

interface FirmTheme {
  primaryColor: string;
  secondaryColor: string;
}

interface FirmDisplay {
  itemTranslations: Record<string, string> | "global";
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
  serverId: string; // Discord guild ID this firm belongs to
  guildId: string;  // Alias for serverId for clarity
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
  serverId: string; // Required: Discord guild ID this firm belongs to
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
  private configCache: Map<string, FirmsConfig> = new Map();

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
    // Create with servers structure for multi-server support
    const defaultConfig = {
      servers: {} as Record<string, FirmsConfig>
    };

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ Created default firms configuration');
    } catch (error) {
      console.error('❌ Failed to create default firms config:', error);
    }
  }

  private loadConfig(serverId?: string): FirmsConfig {
    try {
      // Check cache first
      const cacheKey = serverId || 'legacy';
      if (this.configCache.has(cacheKey)) {
        return this.configCache.get(cacheKey)!;
      }

      const configData = fs.readFileSync(this.configPath, 'utf-8');
      const fileData = JSON.parse(configData);

      // Check if it's the new server-based structure
      if (fileData.servers && typeof fileData.servers === 'object') {
        if (serverId && fileData.servers[serverId]) {
          this.configCache.set(cacheKey, fileData.servers[serverId]);
          return fileData.servers[serverId];
        }
        // If serverId not found, use first available server or create default
        const firstServerId = Object.keys(fileData.servers)[0];
        if (firstServerId) {
          this.configCache.set(cacheKey, fileData.servers[firstServerId]);
          return fileData.servers[firstServerId];
        }
        // No servers configured, return default
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
        this.configCache.set(cacheKey, defaultConfig);
        return defaultConfig;
      } else {
        // Legacy format - use as-is
        this.configCache.set(cacheKey, fileData);
        return fileData;
      }
    } catch (error) {
      console.error('❌ Error loading firms config:', error);
      // Return default config
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
      this.configCache.set(serverId || 'legacy', defaultConfig);
      return defaultConfig;
    }
  }

  private saveConfig(config: FirmsConfig, serverId?: string): void {
    try {
      config.lastUpdated = new Date().toISOString();

      let fileData: any = {};

      // Load existing file if it exists
      if (fs.existsSync(this.configPath)) {
        fileData = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      }

      // Ensure servers structure exists
      if (!fileData.servers) {
        fileData.servers = {};
      }

      if (serverId) {
        // Save to specific server
        fileData.servers[serverId] = config;
      } else {
        // If no serverId, save to first available server or create legacy entry
        const firstServerId = Object.keys(fileData.servers)[0];
        if (firstServerId) {
          fileData.servers[firstServerId] = config;
        } else {
          // Fallback: save as legacy format (for backward compatibility)
          fileData = config;
        }
      }

      fs.writeFileSync(this.configPath, JSON.stringify(fileData, null, 2));

      // Clear cache
      const cacheKey = serverId || 'legacy';
      this.configCache.delete(cacheKey);

      console.log(`💾 Firms configuration saved successfully [${serverId || 'legacy'}]`);
    } catch (error) {
      console.error('❌ Error saving firms config:', error);
      throw new Error('Failed to save firms configuration');
    }
  }

  public getAllFirms(serverId?: string): Record<string, FirmConfig> {
    const config = this.loadConfig(serverId);
    return config.firms;
  }

  public getFirm(firmId: string, serverId?: string): FirmConfig | null {
    const config = this.loadConfig(serverId);
    return config.firms[firmId] || null;
  }

  public getFirmsForRoles(userRoles: string[], serverId?: string): FirmConfig[] {
    const config = this.loadConfig(serverId);
    const userRolesLower = userRoles.map(role => role.toLowerCase());

    return Object.values(config.firms).filter(firm => {
      if (!firm.enabled) return false;

      // Filter by serverId if provided
      if (serverId && firm.serverId !== serverId && firm.guildId !== serverId) {
        return false;
      }

      // Check if user has any of the required roles for this firm
      const hasAccess = firm.allowedRoles.some(requiredRole =>
        userRolesLower.includes(requiredRole.toLowerCase())
      );

      return hasAccess;
    });
  }

  public createFirm(request: CreateFirmRequest): FirmConfig {
    const config = this.loadConfig(request.serverId);
    
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
      itemTranslations: "global",
      bankingEnabled: true,
      theme: defaultTheme,
      ...request.display
    };

    const newFirm: FirmConfig = {
      id: firmId,
      name: request.name,
      description: request.description,
      serverId: request.serverId,
      guildId: request.serverId, // Set guildId same as serverId
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
    this.saveConfig(config, request.serverId);

    console.log(`✅ Created new firm: ${newFirm.name} (${firmId}) [${request.serverId}]`);
    return newFirm;
  }

  public updateFirm(request: UpdateFirmRequest): FirmConfig {
    // Use serverId from request or from existing firm
    const serverId = request.serverId || this.getFirm(request.id)?.serverId;
    const config = this.loadConfig(serverId);
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
    this.saveConfig(config, serverId);

    console.log(`✅ Updated firm: ${updatedFirm.name} (${request.id}) [${serverId || 'legacy'}]`);
    return updatedFirm;
  }

  public deleteFirm(firmId: string, serverId?: string): boolean {
    // If serverId not provided, try to get it from the firm
    if (!serverId) {
      const firm = this.getFirm(firmId);
      serverId = firm?.serverId;
    }

    const config = this.loadConfig(serverId);

    if (!config.firms[firmId]) {
      throw new Error(`Firm with ID "${firmId}" not found`);
    }

    const firmName = config.firms[firmId].name;
    delete config.firms[firmId];
    this.saveConfig(config, serverId);

    console.log(`🗑️ Deleted firm: ${firmName} (${firmId}) [${serverId || 'legacy'}]`);
    return true;
  }

  public toggleFirmEnabled(firmId: string, enabled: boolean, serverId?: string): FirmConfig {
    // If serverId not provided, try to get it from the firm
    if (!serverId) {
      const firm = this.getFirm(firmId);
      serverId = firm?.serverId;
    }

    const config = this.loadConfig(serverId);
    const firm = config.firms[firmId];

    if (!firm) {
      throw new Error(`Firm with ID "${firmId}" not found`);
    }

    firm.enabled = enabled;
    firm.monitoring.enabled = enabled;
    firm.updatedAt = new Date().toISOString();

    config.firms[firmId] = firm;
    this.saveConfig(config, serverId);

    console.log(`${enabled ? '🟢' : '🔴'} Firm ${firm.name} ${enabled ? 'enabled' : 'disabled'} [${serverId || 'legacy'}]`);
    return firm;
  }

  public getSettings(serverId?: string): FirmsConfig['settings'] {
    const config = this.loadConfig(serverId);
    return config.settings;
  }

  public updateSettings(settings: Partial<FirmsConfig['settings']>, serverId?: string): FirmsConfig['settings'] {
    const config = this.loadConfig(serverId);
    config.settings = { ...config.settings, ...settings };
    this.saveConfig(config, serverId);

    console.log(`⚙️ Firms settings updated [${serverId || 'legacy'}]`);
    return config.settings;
  }

  public getMonitoredChannels(serverId?: string): Array<{ firmId: string; channelId: string; endpoint: string }> {
    const config = this.loadConfig(serverId);

    return Object.values(config.firms)
      .filter(firm => firm.enabled && firm.monitoring.enabled)
      .map(firm => ({
        firmId: firm.id,
        channelId: firm.channelId,
        endpoint: firm.monitoring.endpoint
      }));
  }

  public getFirmByChannelId(channelId: string, serverId?: string): FirmConfig | null {
    const config = this.loadConfig(serverId);

    for (const firm of Object.values(config.firms)) {
      if (firm.channelId === channelId && firm.enabled) {
        return firm;
      }
    }

    return null;
  }

  // Force reload config from file (useful for hot-reloading)
  public reloadConfig(serverId?: string): void {
    const cacheKey = serverId || 'legacy';
    this.configCache.delete(cacheKey);
    console.log(`🔄 Firms configuration reloaded from file [${serverId || 'legacy'}]`);
  }
}