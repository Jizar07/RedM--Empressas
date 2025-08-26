'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Filter, Settings, Crown } from 'lucide-react';

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
}

export default function TrabalhadoresBWManagement({ usuarios, onUpdateUsuarios }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'trabalhador' | 'gerente'>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    id: '',
    nome: '',
    funcao: 'trabalhador' as 'trabalhador' | 'gerente'
  });

  const filteredUsers = Object.entries(usuarios.usuarios).filter(([id, user]) => {
    const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.funcao === filterRole;
    return matchesSearch && matchesRole;
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
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-64">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Função
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(([id, user]) => (
                <tr key={id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {user.nome.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.nome}</div>
                        <div className="text-sm text-gray-500">{id}</div>
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
          
          {filteredUsers.length === 0 && (
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
    </div>
  );
}