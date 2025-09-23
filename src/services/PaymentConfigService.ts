import { promises as fs } from 'fs';
import path from 'path';

export interface PaymentConfig {
  enabled: boolean;
  defaultPrices: {
    plants: {
      unitPrice: number;
      description: string;
    };
    animals: {
      unitPrice: number;
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
      description: 'Preço padrão por planta depositada'
    },
    animals: {
      unitPrice: 160.00,
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
  private config: PaymentConfig | null = null;

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

  public async getConfig(): Promise<PaymentConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      await fs.access(this.dataFile);
      const data = await fs.readFile(this.dataFile, 'utf-8');
      this.config = JSON.parse(data);
      console.log('📄 Loaded payment configuration from file');
      return this.config!;
    } catch (error) {
      // File doesn't exist or is invalid, create default
      console.log('📄 Creating default payment configuration');
      await this.updateConfig(defaultConfig);
      return defaultConfig;
    }
  }

  public async updateConfig(config: PaymentConfig): Promise<void> {
    try {
      config.lastUpdated = new Date().toISOString();
      await fs.writeFile(this.dataFile, JSON.stringify(config, null, 2));
      this.config = config;
      console.log('💾 Payment configuration saved successfully');
    } catch (error) {
      console.error('❌ Error saving payment configuration:', error);
      throw new Error('Failed to save payment configuration');
    }
  }

  public async getDefaultPrices(): Promise<{
    plants: number;
    animals: number;
    ferrovia: number;
  }> {
    const config = await this.getConfig();
    return {
      plants: config.defaultPrices.plants.unitPrice,
      animals: config.defaultPrices.animals.unitPrice,
      ferrovia: config.defaultPrices.ferrovia.unitPrice
    };
  }

  public async getInventoryVerificationSettings(): Promise<{
    enabled: boolean;
    timeWindowMinutes: number;
    tolerance: number;
  }> {
    const config = await this.getConfig();
    return config.inventoryVerification;
  }

  public async getRolePermissions(): Promise<{
    managerRoles: string[];
    farmOwnerRoles: string[];
  }> {
    const config = await this.getConfig();
    return config.rolePermissions;
  }

  public async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enabled;
  }

  public async validateManagerRole(roleIds: string[]): Promise<boolean> {
    const config = await this.getConfig();
    return roleIds.some(roleId =>
      config.rolePermissions.managerRoles.includes(roleId)
    );
  }

  public async validateFarmOwnerRole(roleIds: string[]): Promise<boolean> {
    const config = await this.getConfig();
    return roleIds.some(roleId =>
      config.rolePermissions.farmOwnerRoles.includes(roleId)
    );
  }

  public async resetToDefaults(): Promise<void> {
    console.log('🔄 Resetting payment configuration to defaults');
    await this.updateConfig(defaultConfig);
  }
}

export default PaymentConfigService;