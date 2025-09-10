'use client';

import React, { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, Package } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface BercarioClientsProps {
  firm: FirmConfig;
}

interface ClientData {
  name: string;
  totalSpent: number;
  totalPurchases: number;
  lastPurchase: Date;
  favoriteItems: string[];
}

export default function BercarioClients({ firm }: BercarioClientsProps) {
  const [clientData, setClientData] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        // Fetch messages for the firm's channel
        const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Process messages to extract client spending data
          const clientMap = new Map<string, ClientData>();
          
          data.forEach((msg: any) => {
            if (msg.tipo === 'compra' && msg.metadata?.comprador) {
              const clientName = msg.metadata.comprador;
              const amount = parseFloat(msg.valor) || 0;
              const item = msg.metadata?.item || 'Item desconhecido';
              
              if (!clientMap.has(clientName)) {
                clientMap.set(clientName, {
                  name: clientName,
                  totalSpent: 0,
                  totalPurchases: 0,
                  lastPurchase: new Date(msg.timestamp),
                  favoriteItems: []
                });
              }
              
              const client = clientMap.get(clientName)!;
              client.totalSpent += amount;
              client.totalPurchases += 1;
              client.lastPurchase = new Date(Math.max(
                client.lastPurchase.getTime(),
                new Date(msg.timestamp).getTime()
              ));
              
              // Track favorite items
              if (!client.favoriteItems.includes(item)) {
                client.favoriteItems.push(item);
              }
            }
          });
          
          // Convert to array and sort by total spent
          const clients = Array.from(clientMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent);
          
          setClientData(clients);
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
    const interval = setInterval(fetchClientData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [firm.channelId]);

  const topClient = clientData[0];
  const totalRevenue = clientData.reduce((sum, client) => sum + client.totalSpent, 0);
  const totalClients = clientData.length;
  const avgSpendingPerClient = totalClients > 0 ? totalRevenue / totalClients : 0;

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
        <h2 className="text-2xl font-bold text-gray-900">👥 Clientes do Berçário</h2>
        <div className="text-sm text-gray-500">
          Última atualização: {new Date().toLocaleTimeString('pt-BR')}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-600">Total de Clientes</p>
              <p className="text-2xl font-bold text-blue-900">{totalClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-600">Receita Total</p>
              <p className="text-2xl font-bold text-green-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-purple-600">Gasto Médio/Cliente</p>
              <p className="text-2xl font-bold text-purple-900">${avgSpendingPerClient.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-orange-600">Melhor Cliente</p>
              <p className="text-lg font-bold text-orange-900">{topClient?.name || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Lista de Clientes</h3>
        </div>
        
        <div className="overflow-x-auto">
          {clientData.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Gasto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compras
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Compra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Itens Favoritos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientData.map((client, index) => (
                  <tr key={client.name} className={index === 0 ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                          index === 0 ? 'bg-green-600' : 
                          index === 1 ? 'bg-blue-600' : 
                          index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          {index === 0 && (
                            <div className="text-xs text-green-600 font-medium">👑 Melhor Cliente</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">${client.totalSpent.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{client.totalPurchases}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.lastPurchase.toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {client.favoriteItems.slice(0, 3).map((item, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item}
                          </span>
                        ))}
                        {client.favoriteItems.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            +{client.favoriteItems.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum cliente encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Quando os clientes começarem a comprar animais, eles aparecerão aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}