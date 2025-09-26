
export interface Material {
  itemName: string;
  quantity: number;
  source: 'farm' | 'artesanato' | 'veterinaria' | 'mineradora' | 'ferraria' | 'raw';
  portugueseName: string;
}

export interface Recipe {
  id: string;
  name: string;
  portugueseName: string;
  outputQuantity: number;
  source: 'farm' | 'artesanato' | 'veterinaria' | 'mineradora' | 'ferraria';
  requirements: Material[];
  category: 'box' | 'libidgel' | 'feed' | 'craft' | 'tool' | 'material';
}

export interface MaterialBreakdown {
  recipe: Recipe;
  requestedQuantity: number;
  batchesNeeded: number;
  materialsBySource: {
    [source: string]: Material[];
  };
  totalRawMaterials: Material[];
  craftingSteps: {
    step: number;
    description: string;
    materials: Material[];
  }[];
}

export class MultiSourceRecipeService {
  private static instance: MultiSourceRecipeService | null = null;
  private recipes: Recipe[] = [];

  constructor() {
    this.initializeRecipes();
  }

  public static getInstance(): MultiSourceRecipeService {
    if (!MultiSourceRecipeService.instance) {
      MultiSourceRecipeService.instance = new MultiSourceRecipeService();
    }
    return MultiSourceRecipeService.instance;
  }

  private initializeRecipes(): void {
    this.recipes = [
      // Farm Recipes (Boxes)
      {
        id: 'caixadelegumes',
        name: 'caixadelegumes',
        portugueseName: 'Caixa de Legumes',
        outputQuantity: 25,
        source: 'farm',
        category: 'box',
        requirements: [
          { itemName: 'bay_bolete', quantity: 50, source: 'raw', portugueseName: 'Bay Bolete' },
          { itemName: 'wheat', quantity: 50, source: 'raw', portugueseName: 'Trigo' },
          { itemName: 'red_sage', quantity: 50, source: 'raw', portugueseName: 'Papoula' },
          { itemName: 'bulrush', quantity: 50, source: 'raw', portugueseName: 'Junco' }
        ]
      },
      {
        id: 'caixadeverduras',
        name: 'caixadeverduras',
        portugueseName: 'Caixa de Verduras',
        outputQuantity: 25,
        source: 'farm',
        category: 'box',
        requirements: [
          { itemName: 'corn', quantity: 100, source: 'raw', portugueseName: 'Milho' },
          { itemName: 'wheat', quantity: 50, source: 'raw', portugueseName: 'Trigo' },
          { itemName: 'bulrush', quantity: 50, source: 'raw', portugueseName: 'Junco' }
        ]
      },
      {
        id: 'caixadeervas',
        name: 'caixadeervas',
        portugueseName: 'Caixa de Ervas',
        outputQuantity: 25,
        source: 'farm',
        category: 'box',
        requirements: [
          { itemName: 'alaskan_ginseng', quantity: 25, source: 'raw', portugueseName: 'Ginseng do Alasca' },
          { itemName: 'american_ginseng', quantity: 25, source: 'raw', portugueseName: 'Ginseng Americano' },
          { itemName: 'prairie_poppy', quantity: 25, source: 'raw', portugueseName: 'Papoula de Prado' },
          { itemName: 'oleander_sage', quantity: 25, source: 'raw', portugueseName: 'Salvia Oleandro' },
          { itemName: 'oregano', quantity: 100, source: 'raw', portugueseName: 'Orégano' }
        ]
      },
      {
        id: 'caixadefrutas',
        name: 'caixadefrutas',
        portugueseName: 'Caixa de Frutas',
        outputQuantity: 25,
        source: 'farm',
        category: 'box',
        requirements: [
          { itemName: 'apple', quantity: 25, source: 'raw', portugueseName: 'Maçã' },
          { itemName: 'peach', quantity: 50, source: 'raw', portugueseName: 'Pêssego' },
          { itemName: 'banana', quantity: 100, source: 'raw', portugueseName: 'Banana' },
          { itemName: 'english_mace', quantity: 25, source: 'raw', portugueseName: 'Macerela Inglesa' }
        ]
      },

      // Farm Intermediate Products
      {
        id: 'alcool_industrial',
        name: 'alcool_industrial',
        portugueseName: 'Álcool Industrial',
        outputQuantity: 18,
        source: 'farm',
        category: 'material',
        requirements: [
          { itemName: 'garrafa_de_vidro', quantity: 6, source: 'artesanato', portugueseName: 'Garrafa de Vidro' },
          { itemName: 'agua', quantity: 3, source: 'raw', portugueseName: 'Água' },
          { itemName: 'madeira', quantity: 4, source: 'raw', portugueseName: 'Madeira' },
          { itemName: 'tampa_de_garrafa', quantity: 6, source: 'raw', portugueseName: 'Tampa de Garrafa' },
          { itemName: 'sugar', quantity: 8, source: 'raw', portugueseName: 'Açúcar' }
        ]
      },
      {
        id: 'amido_de_milho',
        name: 'amido_de_milho',
        portugueseName: 'Amido de Milho',
        outputQuantity: 12,
        source: 'farm',
        category: 'material',
        requirements: [
          { itemName: 'madeira', quantity: 6, source: 'raw', portugueseName: 'Madeira' },
          { itemName: 'moedor', quantity: 3, source: 'raw', portugueseName: 'Moedor' },
          { itemName: 'corn', quantity: 6, source: 'raw', portugueseName: 'Milho' }
        ]
      },

      // Artesanato Recipes
      {
        id: 'garrafa_de_vidro',
        name: 'garrafa_de_vidro',
        portugueseName: 'Garrafa de Vidro',
        outputQuantity: 20,
        source: 'artesanato',
        category: 'craft',
        requirements: [
          { itemName: 'pedra_de_silica', quantity: 4, source: 'mineradora', portugueseName: 'Pedra de Sílica' },
          { itemName: 'carvao', quantity: 4, source: 'raw', portugueseName: 'Carvão' },
          { itemName: 'quartzo', quantity: 4, source: 'mineradora', portugueseName: 'Quartzo' }
        ]
      },
      {
        id: 'capsula_plastica',
        name: 'capsula_plastica',
        portugueseName: 'Cápsula Plástica',
        outputQuantity: 25,
        source: 'artesanato',
        category: 'craft',
        requirements: [
          { itemName: 'pedra_de_silica', quantity: 5, source: 'mineradora', portugueseName: 'Pedra de Sílica' },
          { itemName: 'alcool_industrial', quantity: 6, source: 'farm', portugueseName: 'Álcool Industrial' },
          { itemName: 'amido_de_milho', quantity: 3, source: 'farm', portugueseName: 'Amido de Milho' }
        ]
      },
      {
        id: 'alca_de_couro',
        name: 'alca_de_couro',
        portugueseName: 'Alça de Couro',
        outputQuantity: 15,
        source: 'artesanato',
        category: 'craft',
        requirements: [
          { itemName: 'linha_de_algodao', quantity: 4, source: 'artesanato', portugueseName: 'Linha de Algodão' },
          { itemName: 'algodao', quantity: 6, source: 'raw', portugueseName: 'Algodão' },
          { itemName: 'pele_de_jacare', quantity: 1, source: 'raw', portugueseName: 'Pele de Jacaré' }
        ]
      },
      {
        id: 'rotulo',
        name: 'rotulo',
        portugueseName: 'Rótulo',
        outputQuantity: 20,
        source: 'artesanato',
        category: 'craft',
        requirements: [
          { itemName: 'tinta', quantity: 6, source: 'artesanato', portugueseName: 'Tinta' },
          { itemName: 'milk_weed', quantity: 6, source: 'farm', portugueseName: 'Milk Weed' }
        ]
      },
      {
        id: 'mochila_20kg',
        name: 'mochila_20kg',
        portugueseName: 'Mochila 20kg',
        outputQuantity: 4,
        source: 'artesanato',
        category: 'craft',
        requirements: [
          { itemName: 'alca_de_couro', quantity: 6, source: 'artesanato', portugueseName: 'Alça de Couro' },
          { itemName: 'linha_de_algodao', quantity: 14, source: 'artesanato', portugueseName: 'Linha de Algodão' },
          { itemName: 'pele_de_lobo', quantity: 2, source: 'raw', portugueseName: 'Pele de Lobo' },
          { itemName: 'pele_de_jacare', quantity: 2, source: 'raw', portugueseName: 'Pele de Jacaré' }
        ]
      },
      {
        id: 'embalagem',
        name: 'embalagem',
        portugueseName: 'Embalagem',
        outputQuantity: 26,
        source: 'artesanato',
        category: 'craft',
        requirements: [
          { itemName: 'alcool_industrial', quantity: 6, source: 'farm', portugueseName: 'Álcool Industrial' },
          { itemName: 'quartzo', quantity: 3, source: 'mineradora', portugueseName: 'Quartzo' },
          { itemName: 'amido_de_milho', quantity: 3, source: 'farm', portugueseName: 'Amido de Milho' }
        ]
      },
      {
        id: 'verniz',
        name: 'verniz',
        portugueseName: 'Verniz',
        outputQuantity: 24,
        source: 'artesanato',
        category: 'craft',
        requirements: [
          { itemName: 'madeira', quantity: 6, source: 'raw', portugueseName: 'Madeira' },
          { itemName: 'fruta_wintergreen', quantity: 6, source: 'raw', portugueseName: 'Fruta Wintergreen' },
          { itemName: 'tinta', quantity: 2, source: 'artesanato', portugueseName: 'Tinta' },
          { itemName: 'agua', quantity: 5, source: 'raw', portugueseName: 'Água' }
        ]
      },
      {
        id: 'caixa_de_artesanato',
        name: 'caixa_de_artesanato',
        portugueseName: 'Caixa de Artesanato',
        outputQuantity: 25,
        source: 'artesanato',
        category: 'box',
        requirements: [
          { itemName: 'embalagem', quantity: 10, source: 'artesanato', portugueseName: 'Embalagem' },
          { itemName: 'picareta', quantity: 1, source: 'raw', portugueseName: 'Picareta' },
          { itemName: 'mochila', quantity: 10, source: 'raw', portugueseName: 'Mochila' },
          { itemName: 'boneca_de_pano', quantity: 1, source: 'raw', portugueseName: 'Boneca de Pano' }
        ]
      },
      {
        id: 'coador',
        name: 'coador',
        portugueseName: 'Coador',
        outputQuantity: 26,
        source: 'artesanato',
        category: 'craft',
        requirements: [
          { itemName: 'madeira', quantity: 3, source: 'raw', portugueseName: 'Madeira' },
          { itemName: 'linha_de_algodao', quantity: 6, source: 'artesanato', portugueseName: 'Linha de Algodão' }
        ]
      },
      {
        id: 'linha_de_algodao',
        name: 'linha_de_algodao',
        portugueseName: 'Linha de Algodão',
        outputQuantity: 12,
        source: 'artesanato',
        category: 'material',
        requirements: [
          { itemName: 'algodao', quantity: 3, source: 'raw', portugueseName: 'Algodão' },
          { itemName: 'fibras', quantity: 6, source: 'raw', portugueseName: 'Fibras' }
        ]
      },
      {
        id: 'tinta',
        name: 'tinta',
        portugueseName: 'Tinta',
        outputQuantity: 26,
        source: 'artesanato',
        category: 'material',
        requirements: [
          { itemName: 'agua', quantity: 3, source: 'raw', portugueseName: 'Água' },
          { itemName: 'po_de_cafe', quantity: 3, source: 'raw', portugueseName: 'Pó de Café' }
        ]
      },
      {
        id: 'caixa_rustica',
        name: 'caixa_rustica',
        portugueseName: 'Caixa Rústica',
        outputQuantity: 45,
        source: 'artesanato',
        category: 'box',
        requirements: [
          { itemName: 'madeira_cubica', quantity: 3, source: 'raw', portugueseName: 'Madeira Cúbica' },
          { itemName: 'madeira_lapidada', quantity: 3, source: 'raw', portugueseName: 'Madeira Lapidada' },
          { itemName: 'madeira_cilindrica', quantity: 3, source: 'raw', portugueseName: 'Madeira Cilíndrica' }
        ]
      },

      // Veterinaria Recipes (Libidgels)
      {
        id: 'libidgel_bovino',
        name: 'libidgel_bovino',
        portugueseName: 'Libidgel Bovino',
        outputQuantity: 10,
        source: 'veterinaria',
        category: 'libidgel',
        requirements: [
          { itemName: 'capsula_plastica', quantity: 20, source: 'artesanato', portugueseName: 'Cápsula Plástica' },
          { itemName: 'rotulo', quantity: 20, source: 'artesanato', portugueseName: 'Rótulo' },
          { itemName: 'seringa_de_vidro', quantity: 4, source: 'ferraria', portugueseName: 'Seringa de Vidro' },
          { itemName: 'embalagem', quantity: 20, source: 'artesanato', portugueseName: 'Embalagem' }
        ]
      },
      {
        id: 'libidgel_suino',
        name: 'libidgel_suino',
        portugueseName: 'Libidgel Suíno',
        outputQuantity: 10,
        source: 'veterinaria',
        category: 'libidgel',
        requirements: [
          { itemName: 'capsula_plastica', quantity: 20, source: 'artesanato', portugueseName: 'Cápsula Plástica' },
          { itemName: 'rotulo', quantity: 20, source: 'artesanato', portugueseName: 'Rótulo' },
          { itemName: 'seringa_de_vidro', quantity: 4, source: 'ferraria', portugueseName: 'Seringa de Vidro' },
          { itemName: 'embalagem', quantity: 20, source: 'artesanato', portugueseName: 'Embalagem' }
        ]
      },
      {
        id: 'libidgel_aviario',
        name: 'libidgel_aviario',
        portugueseName: 'Libidgel Aviário',
        outputQuantity: 10,
        source: 'veterinaria',
        category: 'libidgel',
        requirements: [
          { itemName: 'capsula_plastica', quantity: 20, source: 'artesanato', portugueseName: 'Cápsula Plástica' },
          { itemName: 'rotulo', quantity: 20, source: 'artesanato', portugueseName: 'Rótulo' },
          { itemName: 'seringa_de_vidro', quantity: 4, source: 'ferraria', portugueseName: 'Seringa de Vidro' },
          { itemName: 'embalagem', quantity: 20, source: 'artesanato', portugueseName: 'Embalagem' }
        ]
      },
      {
        id: 'libidgel_caprino',
        name: 'libidgel_caprino',
        portugueseName: 'Libidgel Caprino',
        outputQuantity: 10,
        source: 'veterinaria',
        category: 'libidgel',
        requirements: [
          { itemName: 'capsula_plastica', quantity: 20, source: 'artesanato', portugueseName: 'Cápsula Plástica' },
          { itemName: 'rotulo', quantity: 20, source: 'artesanato', portugueseName: 'Rótulo' },
          { itemName: 'seringa_de_vidro', quantity: 4, source: 'ferraria', portugueseName: 'Seringa de Vidro' },
          { itemName: 'embalagem', quantity: 20, source: 'artesanato', portugueseName: 'Embalagem' }
        ]
      },
      {
        id: 'libidgel_ovino',
        name: 'libidgel_ovino',
        portugueseName: 'Libidgel Ovino',
        outputQuantity: 10,
        source: 'veterinaria',
        category: 'libidgel',
        requirements: [
          { itemName: 'capsula_plastica', quantity: 20, source: 'artesanato', portugueseName: 'Cápsula Plástica' },
          { itemName: 'rotulo', quantity: 20, source: 'artesanato', portugueseName: 'Rótulo' },
          { itemName: 'seringa_de_vidro', quantity: 4, source: 'ferraria', portugueseName: 'Seringa de Vidro' },
          { itemName: 'embalagem', quantity: 20, source: 'artesanato', portugueseName: 'Embalagem' }
        ]
      },
      {
        id: 'libidgel_asineiro',
        name: 'libidgel_asineiro',
        portugueseName: 'Libidgel Asineiro',
        outputQuantity: 10,
        source: 'veterinaria',
        category: 'libidgel',
        requirements: [
          { itemName: 'capsula_plastica', quantity: 20, source: 'artesanato', portugueseName: 'Cápsula Plástica' },
          { itemName: 'rotulo', quantity: 20, source: 'artesanato', portugueseName: 'Rótulo' },
          { itemName: 'seringa_de_vidro', quantity: 4, source: 'ferraria', portugueseName: 'Seringa de Vidro' },
          { itemName: 'embalagem', quantity: 20, source: 'artesanato', portugueseName: 'Embalagem' }
        ]
      },

      // Veterinary Box
      {
        id: 'caixa_de_veterinaria',
        name: 'caixa_de_veterinaria',
        portugueseName: 'Caixa de Veterinária',
        outputQuantity: 25,
        source: 'veterinaria',
        category: 'box',
        requirements: [
          { itemName: 'libidgel_ovino', quantity: 5, source: 'veterinaria', portugueseName: 'Libidgel Ovino' },
          { itemName: 'libidgel_asineiro', quantity: 5, source: 'veterinaria', portugueseName: 'Libidgel Asineiro' },
          { itemName: 'racao_de_porco', quantity: 20, source: 'raw', portugueseName: 'Ração de Porco' }
        ]
      }
    ];
  }

  public getAllRecipes(): Recipe[] {
    return [...this.recipes];
  }

  public getRecipeById(id: string): Recipe | undefined {
    return this.recipes.find(r => r.id === id);
  }

  public searchRecipes(query: string): Recipe[] {
    const lowercaseQuery = query.toLowerCase();
    return this.recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(lowercaseQuery) ||
      recipe.portugueseName.toLowerCase().includes(lowercaseQuery)
    );
  }

  public calculateMaterialBreakdown(recipeId: string, quantity: number): MaterialBreakdown | null {
    const recipe = this.getRecipeById(recipeId);
    if (!recipe) return null;

    const batchesNeeded = Math.ceil(quantity / recipe.outputQuantity);
    const materialsBySource: { [source: string]: Material[] } = {};
    const totalRawMaterials: Material[] = [];
    const craftingSteps: { step: number; description: string; materials: Material[] }[] = [];

    this.calculateRecursiveMaterials(recipe, batchesNeeded, materialsBySource, totalRawMaterials, craftingSteps);

    return {
      recipe,
      requestedQuantity: quantity,
      batchesNeeded,
      materialsBySource,
      totalRawMaterials,
      craftingSteps
    };
  }

  private calculateRecursiveMaterials(
    recipe: Recipe,
    multiplier: number,
    materialsBySource: { [source: string]: Material[] },
    totalRawMaterials: Material[],
    craftingSteps: { step: number; description: string; materials: Material[] }[],
    visited: Set<string> = new Set()
  ): void {
    if (visited.has(recipe.id)) return;
    visited.add(recipe.id);

    const currentStepMaterials: Material[] = [];

    for (const requirement of recipe.requirements) {
      const totalNeeded = requirement.quantity * multiplier;
      const material: Material = {
        ...requirement,
        quantity: totalNeeded
      };

      currentStepMaterials.push(material);

      // Check if this material can be crafted (has a recipe)
      const subRecipe = this.getRecipeById(requirement.itemName);
      if (subRecipe && !visited.has(subRecipe.id)) {
        // This is a craftable item, recurse into its recipe
        const subBatches = Math.ceil(totalNeeded / subRecipe.outputQuantity);
        this.calculateRecursiveMaterials(subRecipe, subBatches, materialsBySource, totalRawMaterials, craftingSteps, visited);
      } else {
        // This is a raw material or from other firms
        if (!materialsBySource[requirement.source]) {
          materialsBySource[requirement.source] = [];
        }

        // Check if material already exists in this source
        const existingMaterial = materialsBySource[requirement.source].find(m => m.itemName === requirement.itemName);
        if (existingMaterial) {
          existingMaterial.quantity += totalNeeded;
        } else {
          materialsBySource[requirement.source].push(material);
        }

        // Add to total raw materials
        const existingRawMaterial = totalRawMaterials.find(m => m.itemName === requirement.itemName);
        if (existingRawMaterial) {
          existingRawMaterial.quantity += totalNeeded;
        } else {
          totalRawMaterials.push({ ...material });
        }
      }
    }

    craftingSteps.push({
      step: craftingSteps.length + 1,
      description: `Craft ${multiplier * recipe.outputQuantity} ${recipe.portugueseName}`,
      materials: currentStepMaterials
    });

    visited.delete(recipe.id);
  }

  public getSourceColor(source: string): string {
    const colors: { [key: string]: string } = {
      'farm': '#10B981',      // Green
      'artesanato': '#F59E0B', // Orange
      'veterinaria': '#EF4444', // Red
      'mineradora': '#8B5CF6', // Purple
      'ferraria': '#6B7280',   // Gray
      'raw': '#3B82F6'        // Blue
    };
    return colors[source] || '#6B7280';
  }

  public getSourceIcon(source: string): string {
    const icons: { [key: string]: string } = {
      'farm': '🌾',
      'artesanato': '⚒️',
      'veterinaria': '💊',
      'mineradora': '⛏️',
      'ferraria': '🔨',
      'raw': '📦'
    };
    return icons[source] || '📦';
  }
}

export default MultiSourceRecipeService;