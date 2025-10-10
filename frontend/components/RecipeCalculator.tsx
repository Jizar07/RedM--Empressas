'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calculator, Package, AlertCircle } from 'lucide-react';

interface Material {
  itemName: string;
  quantity: number;
  source: 'farm' | 'artesanato' | 'veterinaria' | 'mineradora' | 'ferraria' | 'raw';
  portugueseName: string;
}

interface Recipe {
  id: string;
  name: string;
  portugueseName: string;
  outputQuantity: number;
  source: 'farm' | 'artesanato' | 'veterinaria' | 'mineradora' | 'ferraria';
  category: 'box' | 'libidgel' | 'feed' | 'craft' | 'tool' | 'material';
}

interface MaterialBreakdown {
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

const RecipeCalculator: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [breakdown, setBreakdown] = useState<MaterialBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.portugueseName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecipes(filtered.slice(0, 10)); // Limit to 10 results
      setShowDropdown(true);
    } else {
      setFilteredRecipes([]);
      setShowDropdown(false);
    }
  }, [searchQuery, recipes]);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (response.ok) {
        const data = await response.json();
        setRecipes(data);
      } else {
        setError('Erro ao carregar receitas');
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setError('Erro ao conectar com o servidor');
    }
  };

  const calculateBreakdown = async () => {
    if (!selectedRecipe || quantity <= 0) {
      setError('Selecione uma receita válida e quantidade');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recipes/breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipeId: selectedRecipe.id,
          quantity: quantity
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBreakdown(data);
      } else {
        setError('Erro ao calcular breakdown');
      }
    } catch (error) {
      console.error('Error calculating breakdown:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const selectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setSearchQuery(recipe.portugueseName);
    setShowDropdown(false);
    setBreakdown(null);
  };

  const getSourceIcon = (source: string): string => {
    const icons = {
      'farm': '🌾',
      'artesanato': '⚒️',
      'veterinaria': '💊',
      'mineradora': '⛏️',
      'ferraria': '🔨',
      'raw': '📦'
    };
    return icons[source] || '📦';
  };

  const getSourceColor = (source: string): string => {
    const colors = {
      'farm': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
      'artesanato': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700',
      'veterinaria': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
      'mineradora': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      'ferraria': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600',
      'raw': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    };
    return colors[source] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
  };

  const getSourceName = (source: string): string => {
    const names = {
      'farm': 'Fazenda',
      'artesanato': 'Artesanato',
      'veterinaria': 'Veterinária',
      'mineradora': 'Mineradora',
      'ferraria': 'Ferraria',
      'raw': 'Material Bruto'
    };
    return names[source] || source;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calculadora de Receitas</h1>
        </div>

        {/* Search and Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Recipe Search */}
          <div className="md:col-span-2 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selecionar Receita
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome da receita... (ex: Libidgel Suino)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Dropdown */}
            {showDropdown && filteredRecipes.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto transition-colors">
                {filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => selectRecipe(recipe)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <span className="text-lg">{getSourceIcon(recipe.source)}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{recipe.portugueseName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {getSourceName(recipe.source)} • {recipe.outputQuantity} unidades
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantidade Desejada
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        {/* Selected Recipe Display */}
        {selectedRecipe && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getSourceIcon(selectedRecipe.source)}</span>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{selectedRecipe.portugueseName}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className={`px-2 py-1 rounded-full text-xs border transition-colors ${getSourceColor(selectedRecipe.source)}`}>
                    {getSourceName(selectedRecipe.source)}
                  </span>
                  <span>Produz {selectedRecipe.outputQuantity} unidades por batch</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calculate Button */}
        <button
          onClick={calculateBreakdown}
          disabled={!selectedRecipe || loading}
          className="w-full bg-blue-600 dark:bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Calculando...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Calcular Materiais Necessários
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 transition-colors">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {breakdown && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="h-6 w-6" />
              Resumo da Produção
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg transition-colors">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{breakdown.requestedQuantity}</div>
                <div className="text-sm text-blue-800 dark:text-blue-300">Quantidade Solicitada</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg transition-colors">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{breakdown.batchesNeeded}</div>
                <div className="text-sm text-green-800 dark:text-green-300">Batches Necessários</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg transition-colors">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{breakdown.batchesNeeded * breakdown.recipe.outputQuantity}</div>
                <div className="text-sm text-purple-800 dark:text-purple-300">Total Produzido</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg transition-colors">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{Object.keys(breakdown.materialsBySource).length}</div>
                <div className="text-sm text-orange-800 dark:text-orange-300">Fontes Diferentes</div>
              </div>
            </div>
          </div>

          {/* Materials by Source */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📋 Lista de Materiais por Fonte</h2>

            <div className="grid gap-6">
              {Object.entries(breakdown.materialsBySource).map(([source, materials]) => (
                <div key={source} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-colors">
                  <div className={`px-4 py-3 font-semibold text-lg flex items-center gap-2 transition-colors ${getSourceColor(source)}`}>
                    <span className="text-xl">{getSourceIcon(source)}</span>
                    {getSourceName(source)}
                    <span className="ml-auto text-sm font-normal">
                      {materials.length} {materials.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 transition-colors">
                    <div className="grid gap-2">
                      {materials.map((material, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded transition-colors">
                          <span className="font-medium text-gray-900 dark:text-white">{material.portugueseName}</span>
                          <span className="bg-white dark:bg-gray-600 px-2 py-1 rounded text-sm font-semibold text-gray-900 dark:text-white transition-colors">
                            {material.quantity.toLocaleString()} unidades
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Crafting Steps */}
          {breakdown.craftingSteps.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🔄 Ordem de Produção</h2>

              <div className="space-y-4">
                {breakdown.craftingSteps.reverse().map((step) => (
                  <div key={step.step} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors">
                    <div className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors">
                        {breakdown.craftingSteps.length - step.step + 1}
                      </span>
                      {step.description}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {step.materials.map((material, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-white transition-colors">
                          <span className="text-lg">{getSourceIcon(material.source)}</span>
                          <span>{material.quantity} {material.portugueseName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeCalculator;