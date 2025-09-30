'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Minus, TrendingUp, AlertTriangle } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface BercarioInventoryProps {
  firm: FirmConfig;
}

interface InventoryItem {
  name: string;
  quantity: number;
  addedCount: number;
  removedCount: number;
  lastUpdate: Date;
  netChange: number;
}

export default function BercarioInventory({ firm }: BercarioInventoryProps) {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        // Fetch messages for the firm's channel
        const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Process messages to extract inventory data
          const inventoryMap = new Map<string, InventoryItem>();
          
          data.forEach((msg: any) => {
            if (msg.categoria === 'inventario' && msg.metadata?.item) {
              const itemName = msg.metadata.item;
              const quantity = parseInt(msg.metadata?.quantidade) || 1;
              const isAdding = msg.tipo === 'adicionar';
              
              if (!inventoryMap.has(itemName)) {
                inventoryMap.set(itemName, {
                  name: itemName,
                  quantity: 0,
                  addedCount: 0,
                  removedCount: 0,
                  lastUpdate: new Date(msg.timestamp),
                  netChange: 0
                });
              }
              
              const item = inventoryMap.get(itemName)!;
              
              if (isAdding) {
                item.addedCount += quantity;
                item.quantity += quantity;
                item.netChange += quantity;
              } else {
                item.removedCount += quantity;
                item.quantity -= quantity;
                item.netChange -= quantity;
              }
              
              item.lastUpdate = new Date(Math.max(
                item.lastUpdate.getTime(),
                new Date(msg.timestamp).getTime()
              ));
            }
          });
          
          // Convert to array and sort by quantity
          const inventory = Array.from(inventoryMap.values())
            .sort((a, b) => b.quantity - a.quantity);
          
          setInventoryData(inventory);
        }
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
    const interval = setInterval(fetchInventoryData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [firm.channelId]);

  const totalItems = inventoryData.reduce((sum, item) => sum + item.quantity, 0);
  const totalTypes = inventoryData.length;
  const lowStockItems = inventoryData.filter(item => item.quantity < 5).length;
  const totalAdded = inventoryData.reduce((sum, item) => sum + item.addedCount, 0);
  const totalRemoved = inventoryData.reduce((sum, item) => sum + item.removedCount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">📦 Inventário de Animais</h2>
        <div className="text-sm text-gray-500">
          Última atualização: {new Date().toLocaleTimeString('pt-BR')}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-600">Total de Animais</p>
              <p className="text-2xl font-bold text-blue-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-600">Tipos de Animais</p>
              <p className="text-2xl font-bold text-green-900">{totalTypes}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-600">Estoque Baixo</p>
              <p className="text-2xl font-bold text-yellow-900">{lowStockItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <Plus className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-purple-600">Movimentação</p>
              <p className="text-lg font-bold text-purple-900">+{totalAdded} / -{totalRemoved}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory List */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 transition-colors">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white dark:text-white">Estoque de Animais</h3>
        </div>
        
        <div className="overflow-x-auto">
          {inventoryData.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Animal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Quantidade Atual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Adicionados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Removidos/Vendidos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Mudança Líquida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Última Atualização
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 dark:divide-gray-700">
                {inventoryData.map((item) => (
                  <tr key={item.name} className={item.quantity < 5 ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{item.name}</div>
                          {item.quantity < 5 && (
                            <div className="text-xs text-yellow-600 font-medium">⚠️ Estoque Baixo</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-bold ${
                        item.quantity === 0 ? 'text-red-600' : 
                        item.quantity < 5 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {item.quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-green-600">
                        <Plus className="h-4 w-4 mr-1" />
                        {item.addedCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-red-600">
                        <Minus className="h-4 w-4 mr-1" />
                        {item.removedCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        item.netChange > 0 ? 'text-green-600' : 
                        item.netChange < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {item.netChange > 0 ? '+' : ''}{item.netChange}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white dark:text-white">
                        {item.lastUpdate.toLocaleDateString('pt-BR')} {item.lastUpdate.toLocaleTimeString('pt-BR')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum item no inventário</h3>
              <p className="mt-1 text-sm text-gray-500">
                Quando animais forem adicionados ou removidos do berçário, eles aparecerão aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}