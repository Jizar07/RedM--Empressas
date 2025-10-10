'use client';

import { useState, useEffect } from 'react';
import { Package, Search, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Plus, Minus } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface GenericFirmEstoqueProps {
  firm: FirmConfig;
}

export default function GenericFirmEstoque({ firm }: GenericFirmEstoqueProps) {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'animais', 'plantas', 'materiais', 'ferramentas', 'outros'];

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32"></div>
            ))}
          </div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-96"></div>
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
            <h1 className="text-2xl font-bold">📦 {firm.name} - Estoque</h1>
            <p className="text-green-100">Gerenciamento de inventário e itens</p>
          </div>
          <div className="text-right">
            <p className="text-green-100">Total de Itens</p>
            <p className="text-3xl font-bold">--</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {categories.slice(1).map((category, index) => (
          <div key={category} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">{category}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">--</p>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar itens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            >
              <option value="all">Todas as Categorias</option>
              {categories.slice(1).map(category => (
                <option key={category} value={category} className="capitalize">
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Inventário de {firm.name}
          </h2>
        </div>

        <div className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Inventário Vazio</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Os itens do inventário aparecerão aqui quando houver atividades no canal #{firm.channelId}.
          </p>

          {/* Placeholder Table Structure */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <div className="grid grid-cols-6 gap-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                <div className="text-left">Item</div>
                <div className="text-left">Categoria</div>
                <div className="text-left">Quantidade</div>
                <div className="text-left">Tendência</div>
                <div className="text-left">Última Atualização</div>
                <div className="text-left">Atualizado Por</div>
              </div>

              {/* Sample rows */}
              {[1, 2, 3].map(i => (
                <div key={i} className="grid grid-cols-6 gap-4 py-3 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    <span>--</span>
                  </div>
                  <div>--</div>
                  <div>--</div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div>--</div>
                  <div>--</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md mx-auto transition-colors">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded-full mt-0.5">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Sistema Pronto</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Inventário será automaticamente sincronizado quando houver atividades de "inserir item" ou "remover item" no Discord.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuração do Estoque</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors">
            <div className="flex items-center space-x-2 mb-2">
              <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Canal Monitorado</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">#{firm.channelId}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Endpoint</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{firm.monitoring.endpointType}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-colors">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Monitoramento</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {firm.monitoring.enabled ? 'Ativo' : 'Inativo'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}