/**
 * Global Item Translation Service
 * Provides consistent item name translations between internal and Portuguese names
 */

export interface TranslatedItem {
  internal: string;
  portuguese: string;
  category: string;
  isBasicPlant?: boolean;
}

export class ItemTranslationService {
  private static instance: ItemTranslationService;

  // Comprehensive item translation map
  private readonly itemTranslations: Map<string, TranslatedItem> = new Map([
    // Seeds
    ['Bulrush_Seed', { internal: 'Bulrush_Seed', portuguese: 'Semente de Junco', category: 'sementes', isBasicPlant: true }],
    ['bulrush_seed', { internal: 'Bulrush_Seed', portuguese: 'Semente de Junco', category: 'sementes', isBasicPlant: true }],
    ['Corn_Seed', { internal: 'Corn_Seed', portuguese: 'Semente de Milho', category: 'sementes', isBasicPlant: true }],
    ['corn_seed', { internal: 'Corn_Seed', portuguese: 'Semente de Milho', category: 'sementes', isBasicPlant: true }],
    ['cornseed', { internal: 'Corn_Seed', portuguese: 'Semente de Milho', category: 'sementes', isBasicPlant: true }],
    ['Wheat_Seed', { internal: 'Wheat_Seed', portuguese: 'Semente de Trigo', category: 'sementes', isBasicPlant: true }],
    ['wheat_seed', { internal: 'Wheat_Seed', portuguese: 'Semente de Trigo', category: 'sementes', isBasicPlant: true }],
    
    // Plants
    ['Bulrush', { internal: 'Bulrush', portuguese: 'Junco', category: 'plantas', isBasicPlant: true }],
    ['bulrush', { internal: 'Bulrush', portuguese: 'Junco', category: 'plantas', isBasicPlant: true }],
    ['Corn', { internal: 'Corn', portuguese: 'Milho', category: 'plantas', isBasicPlant: true }],
    ['corn', { internal: 'Corn', portuguese: 'Milho', category: 'plantas', isBasicPlant: true }],
    ['Wheat', { internal: 'Wheat', portuguese: 'Trigo', category: 'plantas', isBasicPlant: true }],
    ['wheat', { internal: 'Wheat', portuguese: 'Trigo', category: 'plantas', isBasicPlant: true }],
    ['Milk_Weed', { internal: 'Milk_Weed', portuguese: 'Algodão', category: 'plantas', isBasicPlant: true }],
    ['milk_weed', { internal: 'Milk_Weed', portuguese: 'Algodão', category: 'plantas', isBasicPlant: true }],
    
    // Tools
    ['wateringcan', { internal: 'wateringcan', portuguese: 'Regador', category: 'ferramentas' }],
    ['bucket', { internal: 'bucket', portuguese: 'Balde', category: 'ferramentas' }],
    
    // Animals
    ['cow_female', { internal: 'cow_female', portuguese: 'Vaca', category: 'animais' }],
    ['cow_male', { internal: 'cow_male', portuguese: 'Touro', category: 'animais' }],
    ['pig_female', { internal: 'pig_female', portuguese: 'Porca', category: 'animais' }],
    ['pig_male', { internal: 'pig_male', portuguese: 'Porco', category: 'animais' }],
    ['chicken_female', { internal: 'chicken_female', portuguese: 'Galinha', category: 'animais' }],
    ['chicken_male', { internal: 'chicken_male', portuguese: 'Galo', category: 'animais' }],
    ['sheep', { internal: 'sheep', portuguese: 'Ovelha', category: 'animais' }],
    ['sheep_male', { internal: 'sheep_male', portuguese: 'Ovelha Macho', category: 'animais' }],
    ['sheep_female', { internal: 'sheep_female', portuguese: 'Ovelha Femea', category: 'animais' }],
    ['donkey_male', { internal: 'donkey_male', portuguese: 'Burro', category: 'animais' }],
    ['donkey_female', { internal: 'donkey_female', portuguese: 'Mula', category: 'animais' }],
    ['goat_male', { internal: 'goat_male', portuguese: 'Bode', category: 'animais' }],
    ['goat_female', { internal: 'goat_female', portuguese: 'Cabra', category: 'animais' }],
    
    // Animal Feed
    ['common_portion_chicken', { internal: 'common_portion_chicken', portuguese: 'Ração Avino', category: 'racoes' }],
    ['common_portion_cow', { internal: 'common_portion_cow', portuguese: 'Ração Bovino', category: 'racoes' }],
    ['common_portion_pig', { internal: 'common_portion_pig', portuguese: 'Ração Suíno', category: 'racoes' }],
    ['common_portion_goat', { internal: 'common_portion_goat', portuguese: 'Ração Caprino', category: 'racoes' }],

    // Materials
    ['wood', { internal: 'wood', portuguese: 'Madeira', category: 'materiais' }],
    ['iron', { internal: 'iron', portuguese: 'Ferro', category: 'materiais' }],
    ['coal', { internal: 'coal', portuguese: 'Carvão', category: 'materiais' }],
    ['cascalho', { internal: 'cascalho', portuguese: 'Cascalho', category: 'materiais' }],

    // Books and Education
    ['book', { internal: 'book', portuguese: 'Livro', category: 'educacao' }],
    ['newspaper', { internal: 'newspaper', portuguese: 'Jornal', category: 'educacao' }],
    
    // Add reverse mappings (Portuguese to internal)
    ['semente de junco', { internal: 'Bulrush_Seed', portuguese: 'Semente de Junco', category: 'sementes', isBasicPlant: true }],
    ['semente de milho', { internal: 'Corn_Seed', portuguese: 'Semente de Milho', category: 'sementes', isBasicPlant: true }],
    ['semente de trigo', { internal: 'Wheat_Seed', portuguese: 'Semente de Trigo', category: 'sementes', isBasicPlant: true }],
    ['junco', { internal: 'Bulrush', portuguese: 'Junco', category: 'plantas', isBasicPlant: true }],
    ['milho', { internal: 'Corn', portuguese: 'Milho', category: 'plantas', isBasicPlant: true }],
    ['trigo', { internal: 'Wheat', portuguese: 'Trigo', category: 'plantas', isBasicPlant: true }],
    ['regador', { internal: 'wateringcan', portuguese: 'Regador', category: 'ferramentas' }],
    ['balde', { internal: 'bucket', portuguese: 'Balde', category: 'ferramentas' }],
  ]);

  private constructor() {}

  public static getInstance(): ItemTranslationService {
    if (!ItemTranslationService.instance) {
      ItemTranslationService.instance = new ItemTranslationService();
    }
    return ItemTranslationService.instance;
  }

  /**
   * Get Portuguese display name for an item
   */
  public getPortugueseName(itemName: string): string {
    const normalizedName = this.normalizeItemName(itemName);
    const translation = this.itemTranslations.get(normalizedName);
    
    if (translation) {
      return translation.portuguese;
    }
    
    // Fallback: try to create a reasonable Portuguese name
    return this.createFallbackPortugueseName(itemName);
  }

  /**
   * Get internal name for an item
   */
  public getInternalName(itemName: string): string {
    const normalizedName = this.normalizeItemName(itemName);
    const translation = this.itemTranslations.get(normalizedName);
    
    if (translation) {
      return translation.internal;
    }
    
    // Return original name if no translation found
    return itemName;
  }

  /**
   * Check if an item is a basic plant (for pricing calculations)
   */
  public isBasicPlant(itemName: string): boolean {
    const normalizedName = this.normalizeItemName(itemName);
    const translation = this.itemTranslations.get(normalizedName);
    
    return translation?.isBasicPlant || false;
  }

  /**
   * Get item category
   */
  public getCategory(itemName: string): string {
    const normalizedName = this.normalizeItemName(itemName);
    const translation = this.itemTranslations.get(normalizedName);
    
    if (translation) {
      return translation.category;
    }
    
    // Fallback category detection
    return this.detectCategory(itemName);
  }

  /**
   * Check if an item is a seed
   */
  public isSeed(itemName: string): boolean {
    const normalized = itemName.toLowerCase();
    return normalized.includes('seed') || normalized.includes('semente') || 
           this.getCategory(itemName) === 'sementes';
  }

  /**
   * Check if an item is an animal
   */
  public isAnimal(itemName: string): boolean {
    return this.getCategory(itemName) === 'animais';
  }

  /**
   * Check if an item is a plant (harvested crops)
   */
  public isPlant(itemName: string): boolean {
    return this.getCategory(itemName) === 'plantas';
  }

  /**
   * Check if an item is an animal byproduct (milk, leather, wool, etc.)
   */
  public isAnimalByproduct(itemName: string): boolean {
    return this.getCategory(itemName) === 'produtos_animais';
  }

  /**
   * Normalize item name for consistent lookup
   */
  private normalizeItemName(itemName: string): string {
    return itemName.toLowerCase().trim()
      .replace(/[_\s]+/g, '_')  // Replace spaces with underscores
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Create fallback Portuguese name when no translation exists
   */
  private createFallbackPortugueseName(itemName: string): string {
    let name = itemName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
    
    // Common translations
    if (name.toLowerCase().includes('seed')) {
      name = name.replace(/seed/gi, 'Semente');
    }
    if (name.toLowerCase().includes('portion')) {
      name = name.replace(/portion/gi, 'Ração');
    }
    
    return name;
  }

  /**
   * Detect category based on item name patterns
   */
  private detectCategory(itemName: string): string {
    const name = itemName.toLowerCase();
    
    if (name.includes('seed') || name.includes('semente')) {
      return 'sementes';
    }
    if (name.includes('portion') || name.includes('racao') || name.includes('feed')) {
      return 'racoes';
    }
    // Detect animal byproducts BEFORE checking for live animals
    if (name.includes('milk') || name.includes('leather') || name.includes('wool') ||
        name.includes('mane') || name.includes('pork') || name.includes('beef') ||
        name.includes('ladeo') || name.includes('couro') || name.includes('la_') ||
        name.startsWith('milk_') || name.startsWith('leather_')) {
      return 'produtos_animais';
    }
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') || name.includes('sheep') ||
        name.includes('donkey') || name.includes('goat') ||
        name.includes('vaca') || name.includes('porco') || name.includes('galinha') || name.includes('ovelha') ||
        name.includes('burro') || name.includes('cabra') || name.includes('bode')) {
      return 'animais';
    }
    if (name.includes('wood') || name.includes('iron') || name.includes('coal') || name.includes('cascalho') || 
        name.includes('madeira') || name.includes('ferro') || name.includes('carvao')) {
      return 'materiais';
    }
    if (name.includes('plant') || name.includes('planta') || name.includes('corn') || name.includes('wheat') || 
        name.includes('milho') || name.includes('trigo') || name.includes('junco') || name.includes('bulrush')) {
      return 'plantas';
    }
    
    return 'outros';
  }

  /**
   * Get all translations for debugging
   */
  public getAllTranslations(): Map<string, TranslatedItem> {
    return new Map(this.itemTranslations);
  }
}

export default ItemTranslationService;