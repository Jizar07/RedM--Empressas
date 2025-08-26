'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Minus, Edit, Trash2, Search, Filter, Archive, History, Eye, EyeOff } from 'lucide-react';

interface InventoryItem {
  nome: string;
  quantidade: number;
  criado_em: string;
  ultima_atualizacao?: string;
  categoria?: string;
}

interface InventoryTransaction {
  id: string;
  tipo: 'adicionar' | 'remover';
  item: string;
  nome_item: string;
  quantidade: number;
  autor: string;
  timestamp: string;
  quantidade_anterior: number;
  quantidade_posterior: number;
}

interface InventoryData {
  itens: Record<string, InventoryItem>;
  historico_transacoes: InventoryTransaction[];
  total_itens: number;
  total_quantidade: number;
  ultima_atualizacao?: string;
}

interface Props {
  inventario: InventoryData;
  onUpdateInventario: (inventario: InventoryData) => void;
}

const categories = {
  'todos': 'Todos os Itens',
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
  'outros': 'Outros'
};

export default function EstoqueBWManagement({ inventario, onUpdateInventario }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'nome' | 'quantidade' | 'data'>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showZeroItems, setShowZeroItems] = useState(true);
  
  const [newItem, setNewItem] = useState({
    nome: '',
    quantidade: 1,
    categoria: 'outros',
    autor: 'Admin'
  });
  
  const [editQuantity, setEditQuantity] = useState({
    item: '',
    quantidade: 0,
    type: 'set' as 'set' | 'add' | 'remove'
  });

  // Get item category from name patterns (like Webbased)
  const getItemCategory = (itemName: string): string => {
    const name = itemName.toLowerCase();
    
    if (name.includes('seed') || name.includes('semente')) return 'sementes';
    if (name.includes('plant') || name.includes('planta') || name.includes('trigo') || name.includes('milho')) return 'plantas';
    if (name.includes('cow') || name.includes('pig') || name.includes('chicken') || name.includes('sheep') || name.includes('vaca') || name.includes('porco') || name.includes('galinha')) return 'animais';
    if (name.includes('racao') || name.includes('feed')) return 'racoes';
    if (name.includes('food') || name.includes('comida') || name.includes('carne')) return 'comidas';
    if (name.includes('drink') || name.includes('bebida') || name.includes('water')) return 'bebidas';
    if (name.includes('wood') || name.includes('iron') || name.includes('stone') || name.includes('madeira') || name.includes('ferro')) return 'materiais';
    if (name.includes('tool') || name.includes('ferramenta') || name.includes('hammer')) return 'ferramentas';
    
    return 'outros';
  };

  // Filter and sort items
  const filteredItems = Object.entries(inventario.itens || {})
    .filter(([id, item]) => {
      // Search filter
      const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter
      const itemCategory = getItemCategory(item.nome);
      const matchesCategory = selectedCategory === 'todos' || itemCategory === selectedCategory;
      
      // Show zero items filter
      const hasQuantity = showZeroItems || item.quantidade > 0;
      
      return matchesSearch && matchesCategory && hasQuantity;
    })
    .sort(([aId, a], [bId, b]) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'nome':
          comparison = a.nome.localeCompare(b.nome);
          break;
        case 'quantidade':
          comparison = a.quantidade - b.quantidade;
          break;
        case 'data':
          comparison = new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleAddItem = () => {
    if (!newItem.nome || newItem.quantidade <= 0) return;

    const itemId = newItem.nome.toLowerCase().replace(/\s+/g, '_');
    const timestamp = new Date().toISOString();
    
    const newInventario = { ...inventario };
    
    // Add or update item
    if (!newInventario.itens[itemId]) {
      newInventario.itens[itemId] = {
        nome: newItem.nome,
        quantidade: newItem.quantidade,
        criado_em: timestamp,
        categoria: getItemCategory(newItem.nome)
      };
    } else {
      newInventario.itens[itemId].quantidade += newItem.quantidade;
      newInventario.itens[itemId].ultima_atualizacao = timestamp;
    }

    // Add to transaction history
    newInventario.historico_transacoes = newInventario.historico_transacoes || [];
    newInventario.historico_transacoes.push({
      id: crypto.randomUUID(),
      tipo: 'adicionar',
      item: itemId,
      nome_item: newItem.nome,
      quantidade: newItem.quantidade,
      autor: newItem.autor,
      timestamp: timestamp,
      quantidade_anterior: (inventario.itens[itemId]?.quantidade || 0),
      quantidade_posterior: newInventario.itens[itemId].quantidade
    });

    // Update metadata
    newInventario.ultima_atualizacao = timestamp;
    newInventario.total_itens = Object.keys(newInventario.itens).length;
    newInventario.total_quantidade = Object.values(newInventario.itens)
      .reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0);

    onUpdateInventario(newInventario);
    setNewItem({ nome: '', quantidade: 1, categoria: 'outros', autor: 'Admin' });
    setIsAddingItem(false);
    
    // Save to localStorage
    localStorage.setItem('fazenda_inventario', JSON.stringify(newInventario));
  };

  const handleUpdateQuantity = (itemId: string) => {
    const item = inventario.itens[itemId];
    if (!item) return;

    const newInventario = { ...inventario };
    const oldQuantity = item.quantidade;
    let newQuantity = oldQuantity;
    let transactionQuantity = 0;
    let transactionType: 'adicionar' | 'remover' = 'adicionar';

    switch (editQuantity.type) {
      case 'set':
        newQuantity = editQuantity.quantidade;
        transactionQuantity = Math.abs(newQuantity - oldQuantity);
        transactionType = newQuantity > oldQuantity ? 'adicionar' : 'remover';
        break;
      case 'add':
        newQuantity = oldQuantity + editQuantity.quantidade;
        transactionQuantity = editQuantity.quantidade;
        transactionType = 'adicionar';
        break;
      case 'remove':
        newQuantity = Math.max(0, oldQuantity - editQuantity.quantidade);
        transactionQuantity = editQuantity.quantidade;
        transactionType = 'remover';
        break;
    }

    if (newQuantity === oldQuantity) return;

    const timestamp = new Date().toISOString();
    
    // Update item quantity
    newInventario.itens[itemId].quantidade = newQuantity;
    newInventario.itens[itemId].ultima_atualizacao = timestamp;

    // Add to transaction history
    newInventario.historico_transacoes = newInventario.historico_transacoes || [];
    newInventario.historico_transacoes.push({
      id: crypto.randomUUID(),
      tipo: transactionType,
      item: itemId,
      nome_item: item.nome,
      quantidade: transactionQuantity,
      autor: 'Admin',
      timestamp: timestamp,
      quantidade_anterior: oldQuantity,
      quantidade_posterior: newQuantity
    });

    // Update metadata
    newInventario.ultima_atualizacao = timestamp;
    newInventario.total_quantidade = Object.values(newInventario.itens)
      .reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0);

    onUpdateInventario(newInventario);
    setEditingItem(null);
    setEditQuantity({ item: '', quantidade: 0, type: 'set' });
    
    // Save to localStorage
    localStorage.setItem('fazenda_inventario', JSON.stringify(newInventario));
  };

  const handleDeleteItem = (itemId: string) => {
    const item = inventario.itens[itemId];
    if (!confirm(`Tem certeza que deseja remover o item "${item.nome}"?`)) return;

    const newInventario = { ...inventario };
    delete newInventario.itens[itemId];

    // Update metadata
    newInventario.ultima_atualizacao = new Date().toISOString();
    newInventario.total_itens = Object.keys(newInventario.itens).length;
    newInventario.total_quantidade = Object.values(newInventario.itens)
      .reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0);

    onUpdateInventario(newInventario);
    
    // Save to localStorage
    localStorage.setItem('fazenda_inventario', JSON.stringify(newInventario));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package size={28} />
          📦 Gestão de Inventário
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showHistory ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <History size={20} />
            {showHistory ? 'Ocultar' : 'Ver'} Histórico
          </button>
          <button
            onClick={() => setIsAddingItem(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Adicionar Item
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Total de Itens</p>
              <p className="text-3xl font-bold">{inventario.total_itens || Object.keys(inventario.itens || {}).length}</p>
            </div>
            <Package className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Quantidade Total</p>
              <p className="text-3xl font-bold">{inventario.total_quantidade || 0}</p>
            </div>
            <Archive className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Transações</p>
              <p className="text-3xl font-bold">{inventario.historico_transacoes?.length || 0}</p>
            </div>
            <History className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Itens com Estoque</p>
              <p className="text-3xl font-bold">
                {Object.values(inventario.itens || {}).filter((item: any) => item.quantidade > 0).length}
              </p>
            </div>
            <Eye className="text-white/80" size={24} />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(categories).map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by as any);
              setSortOrder(order as any);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="nome-asc">Nome (A-Z)</option>
            <option value="nome-desc">Nome (Z-A)</option>
            <option value="quantidade-desc">Maior Quantidade</option>
            <option value="quantidade-asc">Menor Quantidade</option>
            <option value="data-desc">Mais Recente</option>
            <option value="data-asc">Mais Antigo</option>
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showZeroItems}
              onChange={(e) => setShowZeroItems(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Mostrar itens sem estoque</span>
          </label>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Adicionar Novo Item</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Item
                </label>
                <input
                  type="text"
                  value={newItem.nome}
                  onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Trigo, Vaca, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  value={newItem.quantidade}
                  onChange={(e) => setNewItem({ ...newItem, quantidade: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Autor
                </label>
                <input
                  type="text"
                  value={newItem.autor}
                  onChange={(e) => setNewItem({ ...newItem, autor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddItem}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-md transition-colors"
              >
                Adicionar
              </button>
              <button
                onClick={() => setIsAddingItem(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quantity Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Editar: {inventario.itens[editingItem]?.nome}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade Atual: {inventario.itens[editingItem]?.quantidade}
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ação
                </label>
                <select
                  value={editQuantity.type}
                  onChange={(e) => setEditQuantity({ ...editQuantity, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="set">Definir quantidade</option>
                  <option value="add">Adicionar quantidade</option>
                  <option value="remove">Remover quantidade</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="0"
                  value={editQuantity.quantidade}
                  onChange={(e) => setEditQuantity({ ...editQuantity, quantidade: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleUpdateQuantity(editingItem)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditQuantity({ item: '', quantidade: 0, type: 'set' });
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Atualização
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map(([id, item]) => (
                <tr key={id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                      <div className="text-sm text-gray-500 ml-2">({id})</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {categories[getItemCategory(item.nome) as keyof typeof categories]}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                      item.quantidade > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.quantidade}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.ultima_atualizacao 
                      ? new Date(item.ultima_atualizacao).toLocaleDateString('pt-BR')
                      : new Date(item.criado_em).toLocaleDateString('pt-BR')
                    }
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(id);
                          setEditQuantity({ item: id, quantidade: item.quantidade, type: 'set' });
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Editar quantidade"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
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
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum item encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece adicionando um item.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      {showHistory && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">📜 Histórico de Transações</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(inventario.historico_transacoes || [])
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((transaction) => (
                <div key={transaction.id} className="p-4 border-b hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {transaction.tipo === 'adicionar' ? (
                        <Plus className="text-green-500" size={20} />
                      ) : (
                        <Minus className="text-red-500" size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{transaction.autor}</span>
                        <span className="text-gray-600">
                          {transaction.tipo === 'adicionar' ? 'adicionou' : 'removeu'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.tipo === 'adicionar' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.quantidade}x
                        </span>
                        <span className="font-medium">{transaction.nome_item}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {transaction.quantidade_anterior} → {transaction.quantidade_posterior} • {' '}
                        {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
            
            {(!inventario.historico_transacoes || inventario.historico_transacoes.length === 0) && (
              <div className="text-center py-8">
                <History className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum histórico encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">As transações aparecerão aqui.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}