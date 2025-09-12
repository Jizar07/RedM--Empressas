'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Minus, Users, TrendingDown } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface Activity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda' | 'compra' | 'entrega';
  categoria?: 'inventario' | 'financeiro' | 'sistema';
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
  parseSuccess?: boolean;
  displayText?: string;
  confidence?: 'high' | 'medium' | 'low' | 'none';
  channelId?: string;
}

interface FerroviaPaymentsProps {
  firm: FirmConfig;
}

export default function FerroviaPayments({ firm }: FerroviaPaymentsProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch activities from the API - filtered by firm's channel
  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];
        
        // Sort by timestamp (newest first)
        const sortedMessages = messages.sort((a: Activity, b: Activity) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setActivities(sortedMessages);
      } else {
        console.error('Failed to fetch activities:', response.status);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get ONLY withdrawal activities for Ferrovia money activities
  const getWithdrawalActivities = (): Activity[] => {
    const withdrawalActivities = activities.filter(activity => 
      activity.categoria === 'financeiro' &&
      activity.tipo === 'saque' // ONLY withdrawals
    );
    return withdrawalActivities.slice(0, 100); // Latest 100
  };

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [firm.channelId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const withdrawalActivities = getWithdrawalActivities();
  const totalWithdrawn = withdrawalActivities.reduce((sum, activity) => sum + (activity.valor || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="h-8 w-8 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Saques da Cooperativa</h2>
            <p className="text-gray-600">Histórico de saques realizados pelos trabalhadores</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center">
              <TrendingDown className="h-6 w-6 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-900">Total Sacado</p>
                <p className="text-xl font-bold text-red-600">${totalWithdrawn.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center">
              <Minus className="h-6 w-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-900">Total de Saques</p>
                <p className="text-xl font-bold text-orange-600">{withdrawalActivities.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <Users className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Trabalhadores</p>
                <p className="text-xl font-bold text-purple-600">
                  {new Set(withdrawalActivities.map(a => a.autor).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Activities List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">💰 Saques Realizados ({withdrawalActivities.length})</h3>
        </div>
        
        <div className="p-4 max-h-96 overflow-y-auto">
          {withdrawalActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum saque capturado</p>
          ) : (
            <div className="space-y-2">
              {withdrawalActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                  <div className="flex-shrink-0">
                    <Minus className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {activity.autor || 'Sistema'}
                      </span>
                      <span className="text-gray-600">sacou</span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        ${typeof activity.valor === 'number' ? activity.valor.toFixed(2) : '0.00'}
                      </span>
                      <span className="text-gray-600">da cooperativa</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      📅 {new Date(activity.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}