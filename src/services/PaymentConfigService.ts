import { promises as fs } from 'fs';
import path from 'path';

export interface PaymentConfig {
  enabled: boolean;
  defaultPrices: {
    plants: {
      unitPrice: number;
      costPerUnit: number;
      description: string;
    };
    animals: {
      unitPrice: number;
      costPerUnit: number;
      description: string;
    };
    ferrovia: {
      unitPrice: number;
      description: string;
    };
  };
  inventoryVerification: {
    enabled: boolean;
    timeWindowMinutes: number;
    tolerance: number;
  };
  rolePermissions: {
    managerRoles: string[];
    farmOwnerRoles: string[];
  };
  lastUpdated: string;
}

const defaultConfig: PaymentConfig = {
  enabled: true,
  defaultPrices: {
    plants: {
      unitPrice: 0.25,
      costPerUnit: 0,
      description: 'Preço padrão por planta depositada'
    },
    animals: {
      unitPrice: 160.00,
      costPerUnit: 23.00,
      description: 'Preço padrão por serviço animal concluído'
    },
    ferrovia: {
      unitPrice: 250.00,
      description: 'Preço padrão por missão ferrovia concluída'
    }
  },
  inventoryVerification: {
    enabled: true,
    timeWindowMinutes: 30,
    tolerance: 0.01
  },
  rolePermissions: {
    managerRoles: ['1274479410107646008', '1274479410107646009'], // Manager and Worker roles
    farmOwnerRoles: ['1274479410107646006'] // Farm owner role
  },
  lastUpdated: new Date().toISOString()
};

export class PaymentConfigService {
  private static instance: PaymentConfigService | null = null;
  private dataDir: string;
  private dataFile: string;
  private configCache: Map<string, PaymentConfig> = new Map();

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.dataFile = path.join(this.dataDir, 'payment-config.json');
    this.ensureDataDirectory();
  }

  public static getInstance(): PaymentConfigService {
    if (!PaymentConfigService.instance) {
      console.log('💰 Creating new PaymentConfigService singleton instance');
      PaymentConfigService.instance = new PaymentConfigService();
    }
    return PaymentConfigService.instance;
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log('📁 Created payment config directory');
    }
  }

  private async loadFullConfig(): Promise<{ servers: Record<string, PaymentConfig> }> {
    try {
      await fs.access(this.dataFile);
      const data = await fs.readFile(this.dataFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist, return empty servers object
      return { servers: {} };
    }
  }

  public async getConfig(serverId?: string): Promise<PaymentConfig> {
    // Check cache first
    if (serverId && this.configCache.has(serverId)) {
      return this.configCache.get(serverId)!;
    }

    const fullConfig = await this.loadFullConfig();

    // If no serverId provided, return first server's config (backward compatibility)
    if (!serverId) {
      if (fullConfig.servers) {
        const firstServerId = Object.keys(fullConfig.servers)[0];
        if (firstServerId) {
          console.log(`📄 No serverId provided, returning config for first server: ${firstServerId}`);
          return fullConfig.servers[firstServerId];
        }
      }
      // Fallback to default config if no servers exist
      console.log('📄 No servers found, returning default config');
      return defaultConfig;
    }

    // Return server-specific config
    if (fullConfig.servers && fullConfig.servers[serverId]) {
      const config = fullConfig.servers[serverId];
      this.configCache.set(serverId, config);
      console.log(`📄 Loaded payment configuration for server ${serverId}`);
      return config;
    }

    // Server config doesn't exist, create default
    console.log(`📄 Creating default payment configuration for server ${serverId}`);
    await this.updateConfig(defaultConfig, serverId);
    return defaultConfig;
  }

  public async updateConfig(config: PaymentConfig, serverId: string): Promise<void> {
    try {
      const fullConfig = await this.loadFullConfig();

      // Ensure servers object exists
      if (!fullConfig.servers) {
        fullConfig.servers = {};
      }

      // Update server's config
      config.lastUpdated = new Date().toISOString();
      fullConfig.servers[serverId] = config;

      // Save full config
      await fs.writeFile(this.dataFile, JSON.stringify(fullConfig, null, 2));

      // Update cache
      this.configCache.set(serverId, config);

      console.log(`💾 Payment configuration saved successfully for server ${serverId}`);
    } catch (error) {
      console.error('❌ Error saving payment configuration:', error);
      throw new Error('Failed to save payment configuration');
    }
  }

  public async getDefaultPrices(serverId?: string): Promise<{
    plants: number;
    animals: number;
    ferrovia: number;
  }> {
    const config = await this.getConfig(serverId);
    return {
      plants: config.defaultPrices.plants.unitPrice,
      animals: config.defaultPrices.animals.unitPrice,
      ferrovia: config.defaultPrices.ferrovia.unitPrice
    };
  }

  public async getInventoryVerificationSettings(serverId?: string): Promise<{
    enabled: boolean;
    timeWindowMinutes: number;
    tolerance: number;
  }> {
    const config = await this.getConfig(serverId);
    return config.inventoryVerification;
  }

  public async getRolePermissions(serverId?: string): Promise<{
    managerRoles: string[];
    farmOwnerRoles: string[];
  }> {
    const config = await this.getConfig(serverId);
    return config.rolePermissions;
  }

  public async isEnabled(serverId?: string): Promise<boolean> {
    const config = await this.getConfig(serverId);
    return config.enabled;
  }

  public async validateManagerRole(roleIds: string[], serverId?: string): Promise<boolean> {
    const config = await this.getConfig(serverId);
    return roleIds.some(roleId =>
      config.rolePermissions.managerRoles.includes(roleId)
    );
  }

  public async validateFarmOwnerRole(roleIds: string[], serverId?: string): Promise<boolean> {
    const config = await this.getConfig(serverId);
    return roleIds.some(roleId =>
      config.rolePermissions.farmOwnerRoles.includes(roleId)
    );
  }

  public async resetToDefaults(serverId: string): Promise<void> {
    console.log(`🔄 Resetting payment configuration to defaults for server ${serverId}`);
    await this.updateConfig(defaultConfig, serverId);
  }
}

export default PaymentConfigService;