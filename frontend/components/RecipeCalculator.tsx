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
      'farm': 'bg-green-100 text-green-800 border-green-300',
      'artesanato': 'bg-orange-100 text-orange-800 border-orange-300',
      'veterinaria': 'bg-red-100 text-red-800 border-red-300',
      'mineradora': 'bg-purple-100 text-purple-800 border-purple-300',
      'ferraria': 'bg-gray-100 text-gray-800 border-gray-300',
      'raw': 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[source] || 'bg-gray-100 text-gray-800 border-gray-300';
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
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Calculadora de Receitas</h1>
        </div>

        {/* Search and Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Recipe Search */}
          <div className="md:col-span-2 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Receita
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome da receita... (ex: Libidgel Suino)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Dropdown */}
            {showDropdown && filteredRecipes.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => selectRecipe(recipe)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="text-lg">{getSourceIcon(recipe.source)}</span>
                    <div>
                      <div className="font-medium">{recipe.portugueseName}</div>
                      <div className="text-sm text-gray-500">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade Desejada
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Selected Recipe Display */}
        {selectedRecipe && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getSourceIcon(selectedRecipe.source)}</span>
              <div>
                <h3 className="font-semibold text-lg">{selectedRecipe.portugueseName}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className={`px-2 py-1 rounded-full text-xs border ${getSourceColor(selectedRecipe.source)}`}>
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
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
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
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {breakdown && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-6 w-6" />
              Resumo da Produção
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{breakdown.requestedQuantity}</div>
                <div className="text-sm text-blue-800">Quantidade Solicitada</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{breakdown.batchesNeeded}</div>
                <div className="text-sm text-green-800">Batches Necessários</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{breakdown.batchesNeeded * breakdown.recipe.outputQuantity}</div>
                <div className="text-sm text-purple-800">Total Produzido</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{Object.keys(breakdown.materialsBySource).length}</div>
                <div className="text-sm text-orange-800">Fontes Diferentes</div>
              </div>
            </div>
          </div>

          {/* Materials by Source */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Lista de Materiais por Fonte</h2>

            <div className="grid gap-6">
              {Object.entries(breakdown.materialsBySource).map(([source, materials]) => (
                <div key={source} className="border rounded-lg overflow-hidden">
                  <div className={`px-4 py-3 font-semibold text-lg flex items-center gap-2 ${getSourceColor(source)}`}>
                    <span className="text-xl">{getSourceIcon(source)}</span>
                    {getSourceName(source)}
                    <span className="ml-auto text-sm font-normal">
                      {materials.length} {materials.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-2">
                      {materials.map((material, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">{material.portugueseName}</span>
                          <span className="bg-white px-2 py-1 rounded text-sm font-semibold">
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🔄 Ordem de Produção</h2>

              <div className="space-y-4">
                {breakdown.craftingSteps.reverse().map((step) => (
                  <div key={step.step} className="border border-gray-200 rounded-lg p-4">
                    <div className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        {breakdown.craftingSteps.length - step.step + 1}
                      </span>
                      {step.description}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {step.materials.map((material, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
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