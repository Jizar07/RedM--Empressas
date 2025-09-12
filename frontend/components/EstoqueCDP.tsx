'use client';

import React, { useState, useEffect } from 'react';
import { Package, Edit, Settings, Filter, Search, X, ChevronDown, ChevronUp, Trash2, Plus, DollarSign, Check, Archive } from 'lucide-react';
import { FirmConfig } from '@/types/firms';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import { InventoryItem, INVENTORY_CATEGORIES } from '@/types/inventory';

// Using types from inventory.ts and useInventoryManager hook

const MetricCard = ({ 
  title, 
  value, 
  icon, 
  color = 'blue' 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' 
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 rounded-lg text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-white/80">{icon}</div>
      </div>
    </div>
  );
};

interface EditItemModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<InventoryItem>) => Promise<boolean>;
  getBestDisplayName: (id: string) => string;
  getCategoryForItem: (name: string) => string;
  matchPrice: (id: string) => { min: number; max: number; average: number } | null;
}

const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  getBestDisplayName,
  getCategoryForItem,
  matchPrice
}) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [saving, setSaving] = useState(false);
  const [priceData, setPriceData] = useState<{ min: number; max: number; average: number } | null>(null);

  useEffect(() => {
    if (item) {
      setFormData(item);
      const pricing = matchPrice(item.id);
      setPriceData(pricing);
    } else {
      setFormData({
        nome: '',
        displayName: '',
        categoria: 'outros',
        quantidade: 0,
        ativo: true
      });
      setPriceData(null);
    }
  }, [item, matchPrice]);

  useEffect(() => {
    if (formData.nome) {
      setFormData(prev => ({
        ...prev,
        displayName: getBestDisplayName(prev.nome || ''),
        categoria: prev.categoria || getCategoryForItem(prev.nome || '')
      }));
      
      const pricing = matchPrice(formData.nome);
      setPriceData(pricing);
    }
  }, [formData.nome, getBestDisplayName, getCategoryForItem, matchPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 EditItemModal handleSubmit called');
    console.log('📝 Form data:', formData);
    
    setSaving(true);

    try {
      console.log('📝 Calling onSave with form data...');
      const success = await onSave(formData);
      console.log('📝 onSave returned:', success);
      
      if (success) {
        console.log('📝 Save successful, closing modal');
        onClose();
      } else {
        console.log('📝 Save failed, keeping modal open');
      }
    } catch (error) {
      console.error('📝 Error in handleSubmit:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {item ? '✏️ Editar Item' : '➕ Adicionar Novo Item'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID/Nome Original *
              </label>
              <input
                type="text"
                required
                value={formData.nome || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ex: bulrush, cornseed, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome de Exibição
              </label>
              <input
                type="text"
                value={formData.displayName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome traduzido (auto-preenchido)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-traduzido do sistema global de nomes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                required
                value={formData.categoria || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(INVENTORY_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantidade || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Price Information */}
          {priceData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="text-green-600" size={16} />
                <span className="text-sm font-medium text-green-800">
                  💰 Preços da Lista Encontrados
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Mínimo:</span>
                  <span className="ml-2 font-medium">${priceData.min.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Máximo:</span>
                  <span className="ml-2 font-medium">${priceData.max.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Média:</span>
                  <span className="ml-2 font-medium">${priceData.average.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={formData.notas || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Informações adicionais sobre o item..."
            />
          </div>

          {/* Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo ?? true}
              onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="ativo" className="ml-2 text-sm text-gray-700">
              Item ativo no inventário
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {item ? 'Salvar Alterações' : 'Adicionar Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EstoqueCDPProps {
  firm: FirmConfig;
}

export default function EstoqueCDP({ firm }: EstoqueCDPProps) {
  const {
    inventoryData,
    loading,
    error,
    filteredData,
    getBestDisplayName,
    getCategoryForItem,
    matchPrice,
    addItem,
    updateItem,
    deleteItem,
    refresh,
    isReady
  } = useInventoryManager({ firm });

  // For backwards compatibility with existing display logic
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [sortColumn, setSortColumn] = useState('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showZeroQuantity, setShowZeroQuantity] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  
  // Modal states for editing items
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Categories for filtering (for backward compatibility)
  const categories = {
    'plantas': 'Plantas',
    'sementes': 'Sementes', 
    'racoes': 'Rações',
    'comidas': 'Comidas',
    'bebidas': 'Bebidas',
    'animais': 'Animais',
    'materiais': 'Materiais',
    'ferramentas': 'Ferramentas',
    'produtos': 'Produtos',
    'consumeveis': 'Consumíveis',
    'caixas': 'Caixas',
    'outros': 'Outros'
  };

  // No longer needed - using useInventoryManager hook instead

  // Get filtered and sorted inventory items
  const getFilteredAndSortedItems = (): InventoryItem[] => {
    let items = Object.values(inventory);

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      items = items.filter(item => 
        getBestDisplayName(item.id).toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower) ||
        (categories[item.categoria as keyof typeof categories] || '').toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (selectedCategory !== 'todos') {
      items = items.filter(item => item.categoria === selectedCategory);
    }

    // Quantity filter
    if (!showZeroQuantity) {
      items = items.filter(item => item.quantidade > 0);
    }

    // Sort items
    items.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortColumn) {
        case 'quantidade':
          aValue = a.quantidade;
          bValue = b.quantidade;
          break;
        case 'categoria':
          aValue = categories[a.categoria as keyof typeof categories] || 'Outros';
          bValue = categories[b.categoria as keyof typeof categories] || 'Outros';
          break;
        case 'nome':
        default:
          aValue = a.displayName;
          bValue = b.displayName;
          break;
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return items;
  };

  // Pagination logic
  const getPaginatedItems = () => {
    const filteredItems = getFilteredAndSortedItems();
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const items = filteredItems.slice(startIndex, endIndex);
    
    return { items, totalPages };
  };

  // Handlers for item management
  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setEditModalOpen(true);
  };

  const handleDelete = async (item: InventoryItem) => {
    if (confirm(`Tem certeza que deseja remover "${getBestDisplayName(item.id)}" do inventário?\n\nEsta ação não pode ser desfeita.`)) {
      await deleteItem(item.id);
    }
  };

  const handleSaveItem = async (itemData: Partial<InventoryItem>): Promise<boolean> => {
    console.log('🔧 handleSaveItem called with:', { editingItem: editingItem?.id, itemData });
    
    let result = false;
    
    if (editingItem) {
      console.log('🔧 Updating existing item:', editingItem.id);
      console.log('🔧 Update data:', itemData);
      result = await updateItem(editingItem.id, itemData);
      console.log('🔧 Update result:', result);
    } else {
      console.log('🔧 Adding new item');
      result = await addItem(itemData);
      console.log('🔧 Add result:', result);
    }
    
    // CRITICAL: Save to customization file for display name persistence
    if (result && itemData.nome && itemData.nome.trim() !== '') {
      const itemId = editingItem?.id || itemData.id || itemData.nome;
      if (itemId) {
        try {
          const customizationResponse = await fetch('/api/customizations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: itemId,
              displayName: itemData.nome.trim()
            })
          });
          
          if (customizationResponse.ok) {
            console.log('✅ SAVED TO CUSTOMIZATION FILE:', itemId, '→', itemData.nome);
            // Dispatch event to notify dashboard that customizations have been updated
            window.dispatchEvent(new CustomEvent('customizationUpdated', { 
              detail: { itemId, displayName: itemData.nome.trim() }
            }));
          } else {
            console.warn('❌ Failed to save to customization file');
          }
        } catch (error) {
          console.warn('❌ Error saving to customization file:', error);
        }
      }
    }
    
    return result;
  };

  // Use the new inventory data structure
  const inventory = inventoryData.items;
  const totalItems = inventoryData.totalItems;
  const totalQuantity = inventoryData.totalQuantity;
  const { items: paginatedItems, totalPages } = getPaginatedItems();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
          <div className="bg-gray-200 rounded-lg h-96"></div>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📦 Inventário - {firm.name}</h1>
            <p className="text-green-100">Sistema inteligente com traduções globais e gestão avançada</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refresh}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings size={16} />
              Atualizar
            </button>
            <button
              onClick={handleAdd}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Adicionar Item
            </button>
            <div className="text-right">
              <p className="text-green-100">Tipos de Itens</p>
              <p className="text-3xl font-bold">{inventoryData.totalItems}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Tipos de Itens"
          value={totalItems}
          icon={<Package size={24} />}
          color="blue"
        />
        
        <MetricCard
          title="Quantidade Total"
          value={totalQuantity}
          icon={<Package size={24} />}
          color="green"
        />
        
        <MetricCard
          title="Categorias"
          value={Object.keys(categories).length}
          icon={<Filter size={24} />}
          color="purple"
        />
        
        <MetricCard
          title="Com Estoque"
          value={Object.values(inventory).filter(item => item.quantidade > 0).length}
          icon={<Package size={24} />}
          color="yellow"
        />
      </div>

      {/* Status */}
      <div className={`rounded-lg p-4 ${totalItems > 0 ? 'bg-green-100' : 'bg-blue-100'}`}>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            🤖 Status: {totalItems > 0 ? 'Inventário carregado do bot Discord' : 'Carregando inventário...'}
          </h2>
          {totalItems > 0 && (
            <span className="px-2 py-1 bg-green-500 text-white text-sm rounded">
              {totalItems} tipos de itens processados
            </span>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Items
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Digite o nome do item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todas as Categorias</option>
              {Object.entries(categories).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opções
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showZeroQuantity}
                  onChange={(e) => setShowZeroQuantity(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Mostrar itens zerados</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">📦 Lista de Estoque</h3>
          <p className="text-sm text-gray-500">{paginatedItems.length} itens</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  Nome do Item
                  {sortColumn === 'nome' && (
                    sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">
                  Quantidade
                  {sortColumn === 'quantidade' && (
                    sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />
                  )}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{getBestDisplayName(item.id)}</div>
                      <div className="text-xs text-gray-500">ID: {item.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {categories[item.categoria as keyof typeof categories] || 'Outros'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <span className={`font-medium ${item.quantidade === 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.quantidade}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="Editar item"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remover item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Item Modal */}
      {editModalOpen && (
        <EditItemModal
          item={editingItem}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          getBestDisplayName={getBestDisplayName}
          getCategoryForItem={getCategoryForItem}
          matchPrice={matchPrice}
        />
      )}
    </div>
  );
}