'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, Edit, Trash2, Search, Filter, Settings, RefreshCw,
  Download, Upload, AlertTriangle, Clock, User, DollarSign,
  ChevronDown, ChevronUp, X, Check, AlertCircle, TrendingUp, Users
} from 'lucide-react';
import { FirmConfig } from '@/types/firms';
import { InventoryItem, InventoryTransaction, INVENTORY_CATEGORIES } from '@/types/inventory';
import { useInventoryManager } from '@/hooks/useInventoryManager';
import InventoryWorkerAnalytics from './InventoryWorkerAnalytics';

interface InventoryEditorProps {
  firm: FirmConfig;
  className?: string;
}

interface EditItemModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<InventoryItem>) => Promise<boolean>;
  getBestDisplayName: (id: string) => string;
  getCategoryForItem: (name: string) => string;
  matchPrice: (id: string) => { min: number; max: number; average: number } | null;
}

const MetricCard = ({ 
  title, 
  value, 
  icon, 
  color = 'blue',
  subtitle,
  loading = false
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
  loading?: boolean;
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 rounded-lg text-white shadow-lg hover:shadow-xl transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold mt-2">
            {loading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            ) : (
              value
            )}
          </p>
          {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
        </div>
        <div className="text-white/80 flex-shrink-0">{icon}</div>
      </div>
    </div>
  );
};

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
    setSaving(true);

    try {
      const success = await onSave(formData);
      if (success) {
        onClose();
      }
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

export default function InventoryEditor({ firm, className = '' }: InventoryEditorProps) {
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
    updateSettings,
    refresh,
    isReady
  } = useInventoryManager({ firm });

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'quantity' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showZeroQuantity, setShowZeroQuantity] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [transactionsModalOpen, setTransactionsModalOpen] = useState(false);
  const [workersModalOpen, setWorkersModalOpen] = useState(false);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let items = Object.values(inventoryData.items);

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.displayName.toLowerCase().includes(searchLower) ||
        item.nome.toLowerCase().includes(searchLower) ||
        item.categoria.toLowerCase().includes(searchLower)
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

      switch (sortBy) {
        case 'quantity':
          aValue = a.quantidade;
          bValue = b.quantidade;
          break;
        case 'category':
          aValue = INVENTORY_CATEGORIES[a.categoria as keyof typeof INVENTORY_CATEGORIES] || 'Outros';
          bValue = INVENTORY_CATEGORIES[b.categoria as keyof typeof INVENTORY_CATEGORIES] || 'Outros';
          break;
        case 'updated':
          aValue = new Date(a.atualizado_em).getTime();
          bValue = new Date(b.atualizado_em).getTime();
          break;
        case 'name':
        default:
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return items;
  }, [inventoryData.items, searchTerm, selectedCategory, showZeroQuantity, sortBy, sortOrder]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      items: filteredItems.slice(startIndex, endIndex),
      totalPages: Math.ceil(filteredItems.length / itemsPerPage),
      totalItems: filteredItems.length
    };
  }, [filteredItems, currentPage, itemsPerPage]);

  // Handlers
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setEditModalOpen(true);
  };

  const handleDelete = async (item: InventoryItem) => {
    if (confirm(`Tem certeza que deseja remover "${item.displayName}" do inventário?\n\nEsta ação não pode ser desfeita.`)) {
      await deleteItem(item.id);
    }
  };

  const handleSaveItem = async (itemData: Partial<InventoryItem>): Promise<boolean> => {
    if (editingItem) {
      // Transform form data for proper API processing
      // When user changes displayName, we need to send it as 'nome' for the customization system
      const transformedData = { ...itemData };

      // If displayName was changed and is different from the auto-generated name, send it as 'nome'
      if (itemData.displayName && itemData.displayName.trim() !== '' &&
          itemData.displayName !== getBestDisplayName(editingItem.id)) {
        transformedData.nome = itemData.displayName.trim();
        console.log('🔄 Transforming displayName change to nome for API:', itemData.displayName.trim());
      }

      return await updateItem(editingItem.id, transformedData);
    } else {
      return await addItem(itemData);
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['ID', 'Nome', 'Categoria', 'Quantidade', 'Preço Min', 'Preço Max', 'Último Autor', 'Última Atualização'].join(','),
      ...Object.values(inventoryData.items).map(item =>
        [
          item.id,
          `"${item.displayName}"`,
          INVENTORY_CATEGORIES[item.categoria as keyof typeof INVENTORY_CATEGORIES] || 'Outros',
          item.quantidade,
          item.preco_min || '',
          item.preco_max || '',
          `"${item.ultimo_autor}"`,
          new Date(item.atualizado_em).toLocaleDateString('pt-BR')
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventario-${firm.name.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isReady || loading) {
    return (
      <div className={`space-y-6 ${className}`}>
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
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📦 Editor de Inventário - {firm.name}
          </h1>
          <p className="text-gray-600">
            Sistema inteligente com traduções globais e integração de preços
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button
            onClick={() => setWorkersModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Users size={16} />
            Trabalhadores
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Adicionar Item
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={16} />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Itens"
          value={inventoryData.analytics.totalItems}
          icon={<Package size={24} />}
          color="blue"
          subtitle={`${inventoryData.analytics.priceMatches} com preços`}
        />
        
        <MetricCard
          title="Quantidade Total"
          value={inventoryData.analytics.totalQuantity}
          icon={<Archive className="h-6 w-6" />}
          color="green"
          subtitle="Soma de todos os itens"
        />
        
        <MetricCard
          title="Valor Estimado"
          value={`$${inventoryData.analytics.totalValue.toFixed(2)}`}
          icon={<DollarSign size={24} />}
          color="yellow"
          subtitle="Baseado em preços médios"
        />
        
        <MetricCard
          title="Trabalhadores Ativos"
          value={inventoryData.activeWorkers.length}
          icon={<User size={24} />}
          color="purple"
          subtitle={`${inventoryData.analytics.workers.length} total`}
        />
      </div>

      {/* Low Stock Alerts */}
      {inventoryData.analytics.lowStockAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-yellow-600" size={20} />
            <h3 className="text-lg font-semibold text-yellow-800">
              ⚠️ Alertas de Estoque Baixo
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {inventoryData.analytics.lowStockAlerts.slice(0, 6).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white rounded px-3 py-2">
                <span className="text-sm font-medium">{item.displayName}</span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                  {item.quantidade} restante
                </span>
              </div>
            ))}
          </div>
          {inventoryData.analytics.lowStockAlerts.length > 6 && (
            <p className="text-sm text-yellow-700 mt-2">
              E mais {inventoryData.analytics.lowStockAlerts.length - 6} itens com estoque baixo.
            </p>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Itens
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Nome, ID ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todas as Categorias</option>
              {Object.entries(INVENTORY_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ordenar Por
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by as any);
                setSortOrder(order as any);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name-asc">Nome (A-Z)</option>
              <option value="name-desc">Nome (Z-A)</option>
              <option value="quantity-desc">Maior Quantidade</option>
              <option value="quantity-asc">Menor Quantidade</option>
              <option value="category-asc">Categoria (A-Z)</option>
              <option value="updated-desc">Recém Atualizados</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opções
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showZeroQuantity}
                  onChange={(e) => setShowZeroQuantity(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Mostrar quantidade zero</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Lista de Inventário</h3>
            <p className="text-sm text-gray-600">
              {paginatedItems.totalItems} itens encontrados
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Item
                    {sortBy === 'name' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Categoria
                    {sortBy === 'category' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center gap-1">
                    Quantidade
                    {sortBy === 'quantity' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preços
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('updated')}
                >
                  <div className="flex items-center gap-1">
                    Última Atualização
                    {sortBy === 'updated' && (
                      sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedItems.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.displayName}
                      </div>
                      <div className="text-xs text-gray-500">ID: {item.id}</div>
                      {item.notas && (
                        <div className="text-xs text-gray-400 mt-1">
                          📝 {item.notas.substring(0, 50)}{item.notas.length > 50 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {INVENTORY_CATEGORIES[item.categoria as keyof typeof INVENTORY_CATEGORIES] || 'Outros'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                      item.quantidade === 0 ? 'bg-red-100 text-red-800' :
                      item.quantidade <= inventoryData.settings.lowStockThreshold ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.quantidade}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.preco_min && item.preco_max ? (
                      <div>
                        <div className="text-green-600 font-medium">
                          ${item.preco_min.toFixed(2)} - ${item.preco_max.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Média: ${(item.preco_medio || 0).toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Sem preço</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div>{new Date(item.atualizado_em).toLocaleDateString('pt-BR')}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <User size={12} />
                        {item.ultimo_autor}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-right text-sm font-medium">
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
        {paginatedItems.totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, paginatedItems.totalItems)} de {paginatedItems.totalItems} itens
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm">
                Página {currentPage} de {paginatedItems.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(paginatedItems.totalPages, currentPage + 1))}
                disabled={currentPage === paginatedItems.totalPages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
              >
                Próxima
              </button>
            </div>
          </div>
        )}

        {paginatedItems.items.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum item encontrado</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 
                'Tente ajustar os filtros de busca ou limpar a pesquisa.' : 
                'Comece adicionando um novo item ao inventário.'
              }
            </p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Adicionar Primeiro Item
            </button>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
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

      {/* Workers Analytics Modal */}
      {workersModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">👥 Análise de Trabalhadores - {firm.name}</h2>
              <button
                onClick={() => setWorkersModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <InventoryWorkerAnalytics 
                firm={firm}
                workers={inventoryData.analytics.workers}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}