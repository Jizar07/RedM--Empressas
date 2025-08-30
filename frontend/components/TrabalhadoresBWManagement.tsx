'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Filter, Settings, Crown, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';

interface Usuario {
  nome: string;
  funcao: 'trabalhador' | 'gerente';
  criado_em: string;
  ativo: boolean;
  ultima_atividade?: string;
}

interface UsuariosData {
  usuarios: Record<string, Usuario>;
  funcoes: {
    gerente: string[];
    trabalhador: string[];
  };
}

interface Props {
  usuarios: UsuariosData;
  onUpdateUsuarios: (usuarios: UsuariosData) => void;
  recentActivity?: any[];
  itemTranslations?: Record<string, string>;
  getBestDisplayName?: (itemId?: string) => string;
}

export default function TrabalhadoresBWManagement({ 
  usuarios, 
  onUpdateUsuarios, 
  recentActivity = [], 
  itemTranslations: parentItemTranslations = {}, 
  getBestDisplayName: parentGetBestDisplayName
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'trabalhador' | 'gerente'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'created' | 'activity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [viewingTransactions, setViewingTransactions] = useState<string | null>(null);
  
  // Use parent's translation function or fallback to local one
  const getBestDisplayName = parentGetBestDisplayName || ((itemId?: string): string => {
    if (!itemId) return 'Item';
    return itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  });

  // Get user transactions from recentActivity with deduplication (memoized)
  const getUserTransactions = React.useMemo(() => (username: string) => {
    const transactions = recentActivity.filter(activity => 
      activity.autor === username && 
      (activity.categoria === 'financeiro' || activity.categoria === 'inventario')
    );
    
    // Deduplicate by unique activity ID
    const uniqueTransactions = transactions.reduce((acc, current) => {
      const exists = acc.find((item: any) => item.id === current.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, [] as any[]);
    
    return uniqueTransactions.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [recentActivity]);

  // Get user analytics (memoized to prevent infinite loops)
  const getUserAnalytics = React.useMemo(() => (username: string) => {
    const transactions = getUserTransactions(username);
    
    const analytics = {
      totalTransactions: transactions.length,
      financialTransactions: 0,
      inventoryTransactions: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalSales: 0,
      netFinancial: 0,
      itemsAdded: 0,
      itemsRemoved: 0,
      netItems: 0,
      mostActiveDay: '',
      firstActivity: '',
      lastActivity: '',
      averagePerDay: 0
    };

    // Daily activity counter
    const dailyActivity: Record<string, number> = {};
    
    transactions.forEach((transaction: any) => {
      const day = new Date(transaction.timestamp).toDateString();
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
      
      if (transaction.categoria === 'financeiro') {
        analytics.financialTransactions++;
        if (transaction.tipo === 'deposito') {
          analytics.totalDeposited += transaction.valor || 0;
        } else if (transaction.tipo === 'saque') {
          analytics.totalWithdrawn += transaction.valor || 0;
        } else if (transaction.tipo === 'venda') {
          analytics.totalSales += transaction.valor || 0;
        }
      } else if (transaction.categoria === 'inventario') {
        analytics.inventoryTransactions++;
        if (transaction.tipo === 'adicionar') {
          analytics.itemsAdded += transaction.quantidade || 0;
        } else if (transaction.tipo === 'remover') {
          analytics.itemsRemoved += transaction.quantidade || 0;
        }
      }
    });

    analytics.netFinancial = analytics.totalDeposited + analytics.totalSales - analytics.totalWithdrawn;
    analytics.netItems = analytics.itemsAdded - analytics.itemsRemoved;

    // Find most active day
    const maxDay = Object.entries(dailyActivity).reduce((a, b) => 
      dailyActivity[a[0]] > dailyActivity[b[0]] ? a : b, ['', 0]
    );
    analytics.mostActiveDay = maxDay[0] ? `${maxDay[0]} (${maxDay[1]} atividades)` : 'N/A';

    // First and last activity
    if (transactions.length > 0) {
      analytics.firstActivity = new Date(transactions[transactions.length - 1].timestamp).toLocaleDateString('pt-BR');
      analytics.lastActivity = new Date(transactions[0].timestamp).toLocaleDateString('pt-BR');
      
      // Calculate average per day
      const daysDiff = Math.max(1, Math.ceil(
        (new Date(transactions[0].timestamp).getTime() - new Date(transactions[transactions.length - 1].timestamp).getTime()) 
        / (1000 * 60 * 60 * 24)
      ));
      analytics.averagePerDay = parseFloat((transactions.length / daysDiff).toFixed(1));
    }

    return analytics;
  }, [recentActivity]);

  // Get detailed inventory breakdown by item type (memoized)
  const getUserInventoryDetails = React.useMemo(() => (username: string) => {
    const transactions = getUserTransactions(username).filter((t: any) => t.categoria === 'inventario');
    const itemTotals: Record<string, { added: number; removed: number; net: number }> = {};
    
    transactions.forEach((transaction: any) => {
      const itemName = getBestDisplayName(transaction.item) || 'Item Desconhecido';
      
      if (!itemTotals[itemName]) {
        itemTotals[itemName] = { added: 0, removed: 0, net: 0 };
      }
      
      if (transaction.tipo === 'adicionar') {
        itemTotals[itemName].added += transaction.quantidade || 0;
      } else if (transaction.tipo === 'remover') {
        itemTotals[itemName].removed += transaction.quantidade || 0;
      }
      
      itemTotals[itemName].net = itemTotals[itemName].added - itemTotals[itemName].removed;
    });
    
    return Object.entries(itemTotals)
      .sort(([,a], [,b]) => Math.abs(b.net) - Math.abs(a.net))
      .slice(0, 10); // Top 10 most significant items
  }, [recentActivity, parentItemTranslations, getBestDisplayName]);

  // Handle column sorting
  const handleSort = (column: 'name' | 'role' | 'created' | 'activity') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: 'name' | 'role' | 'created' | 'activity' }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // Handle edit user
  const handleEditUser = (userId: string, updates: Partial<Usuario>) => {
    const updatedUsuarios = {
      ...usuarios,
      usuarios: {
        ...usuarios.usuarios,
        [userId]: {
          ...usuarios.usuarios[userId],
          ...updates
        }
      }
    };
    onUpdateUsuarios(updatedUsuarios);
    setEditingUser(null);
  };
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    id: '',
    nome: '',
    funcao: 'trabalhador' as 'trabalhador' | 'gerente'
  });

  // Get user activity count for sorting (memoized)
  const getUserActivityCount = React.useMemo(() => {
    const activityCounts: Record<string, number> = {};
    recentActivity.forEach(activity => {
      if (activity.autor) {
        activityCounts[activity.autor] = (activityCounts[activity.autor] || 0) + 1;
      }
    });
    return (username: string) => activityCounts[username] || 0;
  }, [recentActivity]);

  const filteredAndSortedUsers = Object.entries(usuarios.usuarios)
    .filter(([id, user]) => {
      const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || user.funcao === filterRole;
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'ativo' && user.ativo) ||
                           (filterStatus === 'inativo' && !user.ativo);
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort(([idA, userA], [idB, userB]) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'name':
          valueA = userA.nome.toLowerCase();
          valueB = userB.nome.toLowerCase();
          break;
        case 'role':
          valueA = userA.funcao;
          valueB = userB.funcao;
          break;
        case 'created':
          valueA = new Date(userA.criado_em);
          valueB = new Date(userB.criado_em);
          break;
        case 'activity':
          valueA = getUserActivityCount(userA.nome);
          valueB = getUserActivityCount(userB.nome);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });

  const handleAddUser = () => {
    if (!newUser.id || !newUser.nome) return;

    const newUsuarios = {
      ...usuarios,
      usuarios: {
        ...usuarios.usuarios,
        [newUser.id]: {
          nome: newUser.nome,
          funcao: newUser.funcao,
          criado_em: new Date().toISOString(),
          ativo: true
        }
      },
      funcoes: {
        ...usuarios.funcoes,
        [newUser.funcao]: [...usuarios.funcoes[newUser.funcao], newUser.id]
          .filter((v, i, a) => a.indexOf(v) === i)
      }
    };

    onUpdateUsuarios(newUsuarios);
    setNewUser({ id: '', nome: '', funcao: 'trabalhador' });
    setIsAddingUser(false);
    
    // Save to localStorage
    localStorage.setItem('fazenda_usuarios', JSON.stringify(newUsuarios));
  };

  const handleUpdateUser = (id: string, updates: Partial<Usuario>) => {
    const user = usuarios.usuarios[id];
    if (!user) return;

    const oldRole = user.funcao;
    const newRole = updates.funcao || oldRole;

    const newUsuarios = {
      ...usuarios,
      usuarios: {
        ...usuarios.usuarios,
        [id]: { ...user, ...updates }
      },
      funcoes: {
        ...usuarios.funcoes,
        [oldRole]: usuarios.funcoes[oldRole].filter(userId => userId !== id),
        [newRole]: [...usuarios.funcoes[newRole], id].filter((v, i, a) => a.indexOf(v) === i)
      }
    };

    onUpdateUsuarios(newUsuarios);
    setEditingUser(null);
    
    // Save to localStorage
    localStorage.setItem('fazenda_usuarios', JSON.stringify(newUsuarios));
  };

  const handleDeleteUser = (id: string) => {
    if (!confirm(`Tem certeza que deseja remover o usuário ${usuarios.usuarios[id]?.nome}?`)) {
      return;
    }

    const user = usuarios.usuarios[id];
    const newUsuarios = {
      ...usuarios,
      usuarios: Object.fromEntries(
        Object.entries(usuarios.usuarios).filter(([userId]) => userId !== id)
      ),
      funcoes: {
        ...usuarios.funcoes,
        [user.funcao]: usuarios.funcoes[user.funcao].filter(userId => userId !== id)
      }
    };

    onUpdateUsuarios(newUsuarios);
    
    // Save to localStorage
    localStorage.setItem('fazenda_usuarios', JSON.stringify(newUsuarios));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={28} />
          👥 Gestão de Trabalhadores
        </h2>
        <button
          onClick={() => setIsAddingUser(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Adicionar Usuário
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Total Usuários</p>
              <p className="text-3xl font-bold">{Object.keys(usuarios.usuarios).length}</p>
            </div>
            <Users className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Trabalhadores</p>
              <p className="text-3xl font-bold">{usuarios.funcoes?.trabalhador?.length || 0}</p>
            </div>
            <Settings className="text-white/80" size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Gerentes</p>
              <p className="text-3xl font-bold">{usuarios.funcoes?.gerente?.length || 0}</p>
            </div>
            <Crown className="text-white/80" size={24} />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      {/* Enhanced Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Funções</option>
            <option value="trabalhador">👷 Trabalhadores</option>
            <option value="gerente">👑 Gerentes</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">✅ Ativos</option>
            <option value="inativo">❌ Inativos</option>
          </select>

          <div className="bg-blue-50 px-4 py-2 rounded-md flex items-center gap-2 text-blue-700">
            <TrendingUp size={16} />
            <span className="text-sm font-medium">
              Classificação: {sortBy === 'name' ? 'Nome' : sortBy === 'role' ? 'Função' : sortBy === 'created' ? 'Data de Criação' : 'Atividade'} 
              ({sortOrder === 'asc' ? 'Crescente' : 'Decrescente'})
            </span>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          <span>
            Mostrando {filteredAndSortedUsers.length} de {Object.keys(usuarios.usuarios).length} usuários
          </span>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Adicionar Novo Usuário</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID do Usuário
                </label>
                <input
                  type="text"
                  value={newUser.id}
                  onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user123"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={newUser.nome}
                  onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="João Silva"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  value={newUser.funcao}
                  onChange={(e) => setNewUser({ ...newUser, funcao: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="trabalhador">👷 Trabalhador</option>
                  <option value="gerente">👑 Gerente</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddUser}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors"
              >
                Adicionar
              </button>
              <button
                onClick={() => setIsAddingUser(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Usuário
                    <SortIndicator column="name" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center gap-1">
                    Função
                    <SortIndicator column="role" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('created')}
                >
                  <div className="flex items-center gap-1">
                    Criado em
                    <SortIndicator column="created" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('activity')}
                >
                  <div className="flex items-center gap-1">
                    Atividade
                    <SortIndicator column="activity" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedUsers.map(([id, user]) => (
                <tr key={id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {user.nome.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => setViewingTransactions(user.nome)}
                          className="text-left hover:text-blue-600 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900 hover:text-blue-600">{user.nome}</div>
                          <div className="text-sm text-gray-500">{id}</div>
                        </button>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.funcao === 'gerente' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.funcao === 'gerente' ? '👑' : '👷'} {user.funcao}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.ativo ? '✅ Ativo' : '❌ Inativo'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getUserActivityCount(user.nome)}</span>
                      <span className="text-xs text-gray-400">transações</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser(id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Editar usuário"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Remover usuário"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredAndSortedUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Comece adicionando um usuário.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && usuarios.usuarios[editingUser] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Editar Usuário</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  defaultValue={usuarios.usuarios[editingUser].nome}
                  onChange={(e) => {
                    const updatedUser = { ...usuarios.usuarios[editingUser], nome: e.target.value };
                    handleEditUser(editingUser, updatedUser);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  defaultValue={usuarios.usuarios[editingUser].funcao}
                  onChange={(e) => {
                    const updatedUser = { ...usuarios.usuarios[editingUser], funcao: e.target.value as 'trabalhador' | 'gerente' };
                    handleEditUser(editingUser, updatedUser);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="trabalhador">👷 Trabalhador</option>
                  <option value="gerente">👑 Gerente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  defaultValue={usuarios.usuarios[editingUser].ativo ? 'true' : 'false'}
                  onChange={(e) => {
                    const updatedUser = { ...usuarios.usuarios[editingUser], ativo: e.target.value === 'true' };
                    handleEditUser(editingUser, updatedUser);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">✅ Ativo</option>
                  <option value="false">❌ Inativo</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced User Analytics Modal */}
      {viewingTransactions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {(() => {
              const analytics = getUserAnalytics(viewingTransactions);
              const transactions = getUserTransactions(viewingTransactions);
              
              return (
                <>
                  {/* Header */}
                  <div className="flex justify-between items-center p-6 border-b">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        📊 Análise de {viewingTransactions}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Relatório completo de atividades e transações
                      </p>
                    </div>
                    <button
                      onClick={() => setViewingTransactions(null)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Analytics Cards */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{analytics.totalTransactions}</div>
                        <div className="text-sm text-gray-600">Total de Transações</div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ${analytics.netFinancial.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">Saldo Financeiro</div>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {analytics.netItems > 0 ? '+' : ''}{analytics.netItems}
                        </div>
                        <div className="text-sm text-gray-600">Saldo de Itens</div>
                      </div>
                      
                      <div className="bg-orange-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-orange-600">{analytics.averagePerDay}</div>
                        <div className="text-sm text-gray-600">Atividades/Dia</div>
                      </div>
                    </div>

                    {/* Detailed Analytics */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Financial Summary */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          💰 Resumo Financeiro
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Depósitos:</span>
                            <span className="text-green-600 font-medium">${analytics.totalDeposited.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Vendas:</span>
                            <span className="text-green-600 font-medium">${analytics.totalSales.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Saques:</span>
                            <span className="text-red-600 font-medium">-${analytics.totalWithdrawn.toFixed(2)}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="flex justify-between font-semibold">
                            <span>Saldo Final:</span>
                            <span className={analytics.netFinancial >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ${analytics.netFinancial.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Inventory Summary */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          📦 Resumo de Inventário
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Itens Adicionados:</span>
                            <span className="text-green-600 font-medium">+{analytics.itemsAdded}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Itens Removidos:</span>
                            <span className="text-red-600 font-medium">-{analytics.itemsRemoved}</span>
                          </div>
                          <hr className="my-2" />
                          <div className="flex justify-between font-semibold">
                            <span>Saldo Final:</span>
                            <span className={analytics.netItems >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {analytics.netItems > 0 ? '+' : ''}{analytics.netItems}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Inventory Breakdown */}
                      <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          📋 Detalhamento por Item
                        </h4>
                        {(() => {
                          const inventoryDetails = getUserInventoryDetails(viewingTransactions);
                          return inventoryDetails.length > 0 ? (
                            <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                              {inventoryDetails.map(([itemName, totals]) => (
                                <div key={itemName} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                                  <span className="font-medium">{itemName}</span>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-green-600">+{totals.added}</span>
                                    <span className="text-red-600">-{totals.removed}</span>
                                    <span className={`font-semibold ${
                                      totals.net >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {totals.net > 0 ? '+' : ''}{totals.net}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">Nenhuma movimentação de inventário encontrada.</p>
                          );
                        })()}
                      </div>

                      {/* Activity Summary */}
                      <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          📈 Resumo de Atividade
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Primeira Atividade:</span>
                            <div className="font-medium">{analytics.firstActivity || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Última Atividade:</span>
                            <div className="font-medium">{analytics.lastActivity || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Transações Financeiras:</span>
                            <div className="font-medium">{analytics.financialTransactions}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Transações de Inventário:</span>
                            <div className="font-medium">{analytics.inventoryTransactions}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Transaction History */}
                    <div className="bg-white border rounded-lg">
                      <div className="p-4 border-b bg-gray-50">
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          📋 Histórico de Transações ({transactions.length})
                        </h4>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {transactions.length > 0 ? (
                          <div className="divide-y">
                            {transactions.map((transaction: any, index: number) => (
                              <div key={index} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                                <div className="flex-shrink-0 text-2xl">
                                  {transaction.categoria === 'financeiro' ? (
                                    transaction.tipo === 'deposito' || transaction.tipo === 'venda' ? '💰' : '💸'
                                  ) : (
                                    transaction.tipo === 'adicionar' ? '📦' : '📤'
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {transaction.displayText || transaction.content?.substring(0, 80)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {new Date(transaction.timestamp).toLocaleString('pt-BR')} • 
                                    {transaction.categoria === 'financeiro' ? ' Financeiro' : ' Inventário'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {transaction.valor && (
                                    <div className={`font-bold ${
                                      transaction.tipo === 'deposito' || transaction.tipo === 'venda' 
                                        ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {transaction.tipo === 'saque' ? '-' : '+'}${transaction.valor.toFixed(2)}
                                    </div>
                                  )}
                                  {transaction.quantidade && (
                                    <div className="text-sm text-gray-600">
                                      {transaction.tipo === 'remover' ? '-' : '+'}{transaction.quantidade}x {getBestDisplayName(transaction.item)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <div className="text-4xl mb-2">📊</div>
                            <div>Nenhuma transação encontrada para este usuário.</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}