'use client';

import React, { useState, useEffect } from 'react';
import { Package, Search, X, ChevronDown, ChevronUp, Filter } from 'lucide-react';

interface InventoryItem {
  id: string;
  nome: string;
  displayName: string;
  categoria: string;
  quantidade: number;
  criado_em?: string;
  atualizado_em?: string;
}

interface Activity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: string;
  categoria?: string;
  item?: string;
  quantidade?: number;
}

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

import { FirmConfig } from '@/types/firms';

interface EstoqueBWProps {
  firm?: FirmConfig;
}

export default function EstoqueBW({ firm }: EstoqueBWProps = {}) {
  const [inventory, setInventory] = useState<{[key: string]: InventoryItem}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [sortColumn, setSortColumn] = useState('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showZeroQuantity, setShowZeroQuantity] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [inventoryExpanded, setInventoryExpanded] = useState(true);

  // Categories for filtering
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

  // Utility function to normalize text display
  const normalizeText = (text: string): string => {
    if (!text) return 'Item';
    
    return text
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Function to categorize items automatically
  const getCategoryForItem = (itemName: string): string => {
    const name = itemName.toLowerCase();
    
    if (name.includes('seed') || name.includes('semente') || name.includes('milho') || name.includes('trigo') || name.includes('junco')) {
      return 'sementes';
    }
    if (name.includes('racao') || name.includes('feed') || name.includes('portion')) {
      return 'racoes';
    }
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') || name.includes('sheep') || name.includes('donkey') || name.includes('goat') || 
        name.includes('vaca') || name.includes('porco') || name.includes('galinha') || name.includes('ovelha') || name.includes('cabra') || name.includes('burro') ||
        name.includes('_male') || name.includes('_female')) {
      return 'animais';
    }
    if (name.includes('milk') || name.includes('leite') || name.includes('water') || name.includes('agua')) {
      return 'bebidas';
    }
    if (name.includes('bread') || name.includes('pao') || name.includes('food') || name.includes('comida')) {
      return 'comidas';
    }
    if (name.includes('hoe') || name.includes('enxada') || name.includes('tool') || name.includes('ferramenta') || 
        name.includes('wateringcan') || name.includes('regador')) {
      return 'ferramentas';
    }
    if (name.includes('caixa') || name.includes('box')) {
      return 'caixas';
    }
    if (name.includes('leather') || name.includes('couro') || name.includes('wood') || name.includes('madeira') || 
        name.includes('metal') || name.includes('ferro') || name.includes('cascalho') || name.includes('carvao')) {
      return 'materiais';
    }
    if (name.includes('plant') || name.includes('planta') || name.includes('trigo') || name.includes('milho')) {
      return 'plantas';
    }
    
    return 'outros';
  };

  // Process extension data to create inventory
  const processExtensionData = (extensionMessages: Activity[]) => {
    const itemCounts: {[key: string]: InventoryItem} = {};
    
    // Filter messages by firm's channelId
    const channelId = firm?.channelId || '1409214475403526174';
    const filteredMessages = extensionMessages.filter((msg: any) => 
      !msg.channelId || msg.channelId === channelId
    );

    filteredMessages.forEach(msg => {
      const content = msg.content || '';
      
      // Parse item additions
      if (content.includes('INSERIR ITEM') || content.includes('inserir item')) {
        const itemMatch = content.match(/Item adicionado:(.+?)\s*x(\d+)/i);
        if (itemMatch) {
          const itemName = itemMatch[1].trim();
          const quantity = parseInt(itemMatch[2]);
          
          if (!itemCounts[itemName]) {
            itemCounts[itemName] = {
              id: itemName,
              nome: itemName,
              displayName: normalizeText(itemName),
              categoria: getCategoryForItem(itemName),
              quantidade: 0,
              atualizado_em: msg.timestamp
            };
          }
          itemCounts[itemName].quantidade += quantity;
          itemCounts[itemName].atualizado_em = msg.timestamp;
        }
      }
      
      // Parse item removals
      if (content.includes('REMOVER ITEM') || content.includes('remover item')) {
        const itemMatch = content.match(/Item removido:(.+?)\s*x(\d+)/i);
        if (itemMatch) {
          const itemName = itemMatch[1].trim();
          const quantity = parseInt(itemMatch[2]);
          
          if (!itemCounts[itemName]) {
            itemCounts[itemName] = {
              id: itemName,
              nome: itemName,
              displayName: normalizeText(itemName),
              categoria: getCategoryForItem(itemName),
              quantidade: 0,
              atualizado_em: msg.timestamp
            };
          }
          itemCounts[itemName].quantidade -= quantity;
          itemCounts[itemName].atualizado_em = msg.timestamp;
          
          // Don't allow negative quantities
          if (itemCounts[itemName].quantidade < 0) {
            itemCounts[itemName].quantidade = 0;
          }
        }
      }
    });

    return itemCounts;
  };

  // Get filtered and sorted inventory items
  const getFilteredAndSortedItems = (): InventoryItem[] => {
    let items = Object.values(inventory);

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.displayName.toLowerCase().includes(searchLower) ||
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
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
      }

      if (sortDirection === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    return items;
  };

  // Get paginated items
  const getPaginatedItems = () => {
    const filteredItems = getFilteredAndSortedItems();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      items: filteredItems.slice(startIndex, endIndex),
      totalItems: filteredItems.length,
      totalPages: Math.ceil(filteredItems.length / itemsPerPage)
    };
  };

  // Handle sort column change
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    setLoading(false);

    // Listen for extension data updates
    const handleExtensionUpdate = (event: CustomEvent) => {
      
      const messages = event.detail || [];
      const itemCounts = processExtensionData(messages);
      
      setInventory(itemCounts);
    };

    // Set up listener for extension data
    window.addEventListener('extensionData', handleExtensionUpdate as EventListener);

    return () => {
      window.removeEventListener('extensionData', handleExtensionUpdate as EventListener);
    };
  }, []);

  const totalItems = Object.keys(inventory).length;
  const totalQuantity = Object.values(inventory).reduce((sum, item) => sum + item.quantidade, 0);
  const { items: paginatedItems, totalPages } = getPaginatedItems();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">📦 Estoque - Fazenda BW</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Extension Status */}
      <div className={`rounded-lg p-4 ${totalItems > 0 ? 'bg-blue-100' : 'bg-yellow-100'}`}>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            🔗 Status: {totalItems > 0 ? 'Dados da extensão carregados' : 'Aguardando dados da extensão...'}
          </h2>
          {totalItems > 0 && (
            <span className="px-2 py-1 bg-blue-500 text-white text-sm rounded">
              {totalItems} tipos de itens processados
            </span>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pesquisar itens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todas as Categorias</option>
            {Object.entries(categories).map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showZeroQuantity}
              onChange={(e) => setShowZeroQuantity(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Mostrar Zero</span>
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">📦 Lista de Estoque</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
              {paginatedItems.length} itens
            </span>
          </div>
          <button 
            onClick={() => setInventoryExpanded(!inventoryExpanded)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {inventoryExpanded ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        {inventoryExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('nome')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Nome do Item
                      {sortColumn === 'nome' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('categoria')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Categoria
                      {sortColumn === 'categoria' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('quantidade')}
                      className="flex items-center gap-1 hover:text-gray-700 mx-auto"
                    >
                      Quantidade
                      {sortColumn === 'quantidade' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? 'Nenhum item encontrado para a pesquisa' :
                       selectedCategory !== 'todos' ? `Nenhum item na categoria "${categories[selectedCategory as keyof typeof categories]}"` :
                       'Nenhum item no estoque'}
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.displayName}</div>
                          <div className="text-sm text-gray-500">ID: {item.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {categories[item.categoria as keyof typeof categories] || 'Outros'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                          item.quantidade > 100 ? 'bg-green-100 text-green-800' :
                          item.quantidade > 10 ? 'bg-yellow-100 text-yellow-800' :
                          item.quantidade > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.quantidade}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Página {currentPage} de {totalPages} ({paginatedItems.length} itens)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}