'use client';

import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, Tag, Save, Plus, Trash2, Globe, Link } from 'lucide-react';

interface PriceOverride {
  itemId: string;
  displayName: string;
  minPrice: number;
  maxPrice: number;
}

interface NameMapping {
  originalName: string;
  mappedName: string;
  isGlobal: boolean;
}

interface OptimizationSettingsProps {
  onPriceUpdate: (prices: Record<string, { preco_min: number; preco_max: number; nome: string }>) => void;
  onNameMappingUpdate: (mappings: Record<string, string>) => void;
  currentPrices: Record<string, { preco_min: number; preco_max: number; nome: string }>;
}

export const OptimizationSettings: React.FC<OptimizationSettingsProps> = ({
  onPriceUpdate,
  onNameMappingUpdate,
  currentPrices
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'prices' | 'names'>('prices');
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);
  const [nameMappings, setNameMappings] = useState<NameMapping[]>([]);
  const [globalNames, setGlobalNames] = useState<Record<string, string>>({});

  // New price form
  const [newPrice, setNewPrice] = useState({
    itemId: '',
    displayName: '',
    minPrice: 0,
    maxPrice: 0
  });

  // New name mapping form
  const [newMapping, setNewMapping] = useState({
    originalName: '',
    mappedName: '',
    isGlobal: true
  });

  // Load global naming system
  useEffect(() => {
    loadGlobalNames();
    loadSavedOverrides();
  }, []);

  const loadGlobalNames = async () => {
    try {
      const response = await fetch('http://localhost:3050/api/localization/translations');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.custom_overrides) {
          setGlobalNames(data.data.custom_overrides);
        }
      }
    } catch (error) {
      console.error('Failed to load global names:', error);
    }
  };

  const loadSavedOverrides = () => {
    // Load from localStorage
    const savedPrices = localStorage.getItem('productionPriceOverrides');
    const savedMappings = localStorage.getItem('productionNameMappings');

    if (savedPrices) {
      setPriceOverrides(JSON.parse(savedPrices));
    }

    if (savedMappings) {
      setNameMappings(JSON.parse(savedMappings));
    }
  };

  const savePriceOverride = () => {
    if (!newPrice.itemId || newPrice.minPrice <= 0 || newPrice.maxPrice <= 0) {
      alert('Por favor, preencha todos os campos com valores válidos');
      return;
    }

    const updatedOverrides = [
      ...priceOverrides.filter(p => p.itemId !== newPrice.itemId),
      newPrice
    ];

    setPriceOverrides(updatedOverrides);
    localStorage.setItem('productionPriceOverrides', JSON.stringify(updatedOverrides));

    // Update parent component
    const newPrices = { ...currentPrices };
    updatedOverrides.forEach(override => {
      newPrices[override.itemId] = {
        preco_min: override.minPrice,
        preco_max: override.maxPrice,
        nome: override.displayName
      };
    });
    onPriceUpdate(newPrices);

    // Reset form
    setNewPrice({ itemId: '', displayName: '', minPrice: 0, maxPrice: 0 });
  };

  const removePriceOverride = (itemId: string) => {
    const updatedOverrides = priceOverrides.filter(p => p.itemId !== itemId);
    setPriceOverrides(updatedOverrides);
    localStorage.setItem('productionPriceOverrides', JSON.stringify(updatedOverrides));

    // Update parent
    const newPrices = { ...currentPrices };
    delete newPrices[itemId];
    onPriceUpdate(newPrices);
  };

  const saveNameMapping = async () => {
    if (!newMapping.originalName || !newMapping.mappedName) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    // Save to global system if requested
    if (newMapping.isGlobal) {
      try {
        const response = await fetch('http://localhost:3050/api/localization/custom-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: newMapping.originalName,
            customName: newMapping.mappedName
          })
        });

        if (response.ok) {
          console.log('✅ Saved to global naming system');
          // Reload global names
          await loadGlobalNames();
        }
      } catch (error) {
        console.error('Failed to save to global system:', error);
      }
    }

    const updatedMappings = [
      ...nameMappings.filter(m => m.originalName !== newMapping.originalName),
      newMapping
    ];

    setNameMappings(updatedMappings);
    localStorage.setItem('productionNameMappings', JSON.stringify(updatedMappings));

    // Update parent
    const mappingsObject: Record<string, string> = {};
    updatedMappings.forEach(mapping => {
      mappingsObject[mapping.originalName] = mapping.mappedName;
    });
    onNameMappingUpdate(mappingsObject);

    // Reset form
    setNewMapping({ originalName: '', mappedName: '', isGlobal: true });
  };

  const removeNameMapping = (originalName: string) => {
    const updatedMappings = nameMappings.filter(m => m.originalName !== originalName);
    setNameMappings(updatedMappings);
    localStorage.setItem('productionNameMappings', JSON.stringify(updatedMappings));

    // Update parent
    const mappingsObject: Record<string, string> = {};
    updatedMappings.forEach(mapping => {
      mappingsObject[mapping.originalName] = mapping.mappedName;
    });
    onNameMappingUpdate(mappingsObject);
  };

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-all z-50"
        title="Configurações de Otimização"
      >
        <Settings className="h-6 w-6" />
      </button>

      {/* Settings Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Configurações de Otimização</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => setActiveTab('prices')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'prices'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <DollarSign className="h-4 w-4 inline mr-2" />
                  Preços Manuais
                </button>
                <button
                  onClick={() => setActiveTab('names')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'names'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Tag className="h-4 w-4 inline mr-2" />
                  Mapeamento de Nomes
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {activeTab === 'prices' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Configure preços manuais para itens que não estão na lista de preços.
                      Estes valores serão usados nos cálculos de lucro e ROI.
                    </p>
                  </div>

                  {/* Add New Price */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-3">Adicionar Novo Preço</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="ID do Item (ex: saco_milho)"
                        value={newPrice.itemId}
                        onChange={(e) => setNewPrice({ ...newPrice, itemId: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Nome Display (ex: Saco de Milho)"
                        value={newPrice.displayName}
                        onChange={(e) => setNewPrice({ ...newPrice, displayName: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Preço Mínimo"
                        value={newPrice.minPrice || ''}
                        onChange={(e) => setNewPrice({ ...newPrice, minPrice: parseFloat(e.target.value) || 0 })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Preço Máximo"
                        value={newPrice.maxPrice || ''}
                        onChange={(e) => setNewPrice({ ...newPrice, maxPrice: parseFloat(e.target.value) || 0 })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={savePriceOverride}
                      className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Preço
                    </button>
                  </div>

                  {/* Price List */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Preços Configurados</h3>
                    {priceOverrides.length === 0 ? (
                      <p className="text-gray-500 text-sm">Nenhum preço manual configurado</p>
                    ) : (
                      <div className="space-y-2">
                        {priceOverrides.map((price) => (
                          <div key={price.itemId} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                            <div>
                              <span className="font-medium">{price.displayName}</span>
                              <span className="text-gray-500 text-sm ml-2">({price.itemId})</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm">
                                ${price.minPrice.toFixed(2)} - ${price.maxPrice.toFixed(2)}
                              </span>
                              <button
                                onClick={() => removePriceOverride(price.itemId)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'names' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Mapeie nomes de materiais das receitas para nomes do inventário.
                      Você pode salvar no sistema global para uso em todo o bot.
                    </p>
                  </div>

                  {/* Add New Mapping */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium mb-3">Adicionar Mapeamento</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Nome Original (ex: corn)"
                        value={newMapping.originalName}
                        onChange={(e) => setNewMapping({ ...newMapping, originalName: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Mapear Para (ex: milho)"
                        value={newMapping.mappedName}
                        onChange={(e) => setNewMapping({ ...newMapping, mappedName: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        type="checkbox"
                        checked={newMapping.isGlobal}
                        onChange={(e) => setNewMapping({ ...newMapping, isGlobal: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-sm">
                        <Globe className="h-4 w-4 inline mr-1" />
                        Salvar no sistema global
                      </label>
                    </div>
                    <button
                      onClick={saveNameMapping}
                      className="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Mapeamento
                    </button>
                  </div>

                  {/* Mappings List */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Mapeamentos Configurados</h3>
                    {nameMappings.length === 0 ? (
                      <p className="text-gray-500 text-sm">Nenhum mapeamento configurado</p>
                    ) : (
                      <div className="space-y-2">
                        {nameMappings.map((mapping) => (
                          <div key={mapping.originalName} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{mapping.originalName}</span>
                              <Link className="h-4 w-4 text-gray-400" />
                              <span className="text-green-600">{mapping.mappedName}</span>
                              {mapping.isGlobal && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  Global
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeNameMapping(mapping.originalName)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Global Names Reference */}
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Nomes Globais Disponíveis</h3>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(globalNames).slice(0, 20).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-gray-600">{key}:</span>
                            <span className="text-gray-800">{value}</span>
                          </div>
                        ))}
                      </div>
                      {Object.keys(globalNames).length > 20 && (
                        <p className="text-xs text-gray-500 mt-2">
                          E mais {Object.keys(globalNames).length - 20} itens...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OptimizationSettings;