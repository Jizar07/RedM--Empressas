'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart, Activity, Calendar, DollarSign } from 'lucide-react';
import { FirmConfig } from '@/types/firms';

interface BercarioAnalyticsProps {
  firm: FirmConfig;
}

interface AnalyticsData {
  dailyRevenue: { date: string; revenue: number; transactions: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  topClients: { name: string; totalSpent: number; purchaseCount: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  monthlyTrends: { month: string; revenue: number; growth: number }[];
}

interface WeeklySalesData {
  weekIdentifier: string;
  weekStart: Date;
  weekEnd: Date;
  totalSales: number;
  totalTransactions: number;
  dateRange: string;
}

export default function BercarioAnalytics({ firm }: BercarioAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    dailyRevenue: [],
    topItems: [],
    topClients: [],
    hourlyDistribution: [],
    monthlyTrends: []
  });
  const [weeklySales, setWeeklySales] = useState<WeeklySalesData>({
    weekIdentifier: '',
    weekStart: new Date(),
    weekEnd: new Date(),
    totalSales: 0,
    totalTransactions: 0,
    dateRange: ''
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // Fetch messages for the firm's channel
        const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Process data for analytics
          const now = new Date();
          const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
          const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          
          // Filter messages within time range
          const filteredData = data.filter((msg: any) => {
            return new Date(msg.timestamp) >= startDate;
          });

          // Calculate daily revenue
          const dailyMap = new Map<string, { revenue: number; transactions: number }>();
          const itemMap = new Map<string, { quantity: number; revenue: number }>();
          const clientMap = new Map<string, { totalSpent: number; purchaseCount: number }>();
          const hourMap = new Map<number, number>();
          
          filteredData.forEach((msg: any) => {
            const date = new Date(msg.timestamp);
            const dateKey = date.toISOString().split('T')[0];
            const hour = date.getHours();
            
            // Daily revenue
            if (msg.categoria === 'financeiro' && msg.valor) {
              const revenue = parseFloat(msg.valor);
              if (!dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, { revenue: 0, transactions: 0 });
              }
              const day = dailyMap.get(dateKey)!;
              day.revenue += revenue;
              day.transactions += 1;
            }
            
            // Top items (from purchases)
            if (msg.tipo === 'compra' && msg.metadata?.item) {
              const itemName = msg.metadata.item;
              const quantity = parseInt(msg.metadata.quantidade) || 1;
              const revenue = parseFloat(msg.valor) || 0;
              
              if (!itemMap.has(itemName)) {
                itemMap.set(itemName, { quantity: 0, revenue: 0 });
              }
              const item = itemMap.get(itemName)!;
              item.quantity += quantity;
              item.revenue += revenue;
            }
            
            // Top clients
            if (msg.tipo === 'compra' && msg.metadata?.comprador) {
              const clientName = msg.metadata.comprador;
              const amount = parseFloat(msg.valor) || 0;
              
              if (!clientMap.has(clientName)) {
                clientMap.set(clientName, { totalSpent: 0, purchaseCount: 0 });
              }
              const client = clientMap.get(clientName)!;
              client.totalSpent += amount;
              client.purchaseCount += 1;
            }
            
            // Hourly distribution
            if (msg.categoria === 'financeiro') {
              hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
            }
          });

          // Convert to arrays and sort
          const dailyRevenue = Array.from(dailyMap.entries())
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30); // Last 30 days

          const topItems = Array.from(itemMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

          const topClients = Array.from(clientMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);

          const hourlyDistribution = Array.from(hourMap.entries())
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => a.hour - b.hour);

          // Calculate monthly trends (simplified)
          const monthlyTrends = dailyRevenue
            .reduce((acc: any[], day) => {
              const month = day.date.substring(0, 7); // YYYY-MM
              const existing = acc.find(m => m.month === month);
              if (existing) {
                existing.revenue += day.revenue;
              } else {
                acc.push({ month, revenue: day.revenue, growth: 0 });
              }
              return acc;
            }, [])
            .slice(-6); // Last 6 months

          // Calculate growth rates
          monthlyTrends.forEach((month, index) => {
            if (index > 0) {
              const prevRevenue = monthlyTrends[index - 1].revenue;
              month.growth = prevRevenue > 0 ? ((month.revenue - prevRevenue) / prevRevenue) * 100 : 0;
            }
          });

          setAnalyticsData({
            dailyRevenue,
            topItems,
            topClients,
            hourlyDistribution,
            monthlyTrends
          });
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [firm.channelId, timeRange]);

  // Fetch weekly sales data
  useEffect(() => {
    const fetchWeeklySales = async () => {
      try {
        const response = await fetch('/api/weekly-sales/current');
        const result = await response.json();

        if (result.success) {
          setWeeklySales(result.data);
        }
      } catch (error) {
        console.error('Error fetching weekly sales:', error);
      }
    };

    fetchWeeklySales();
    const interval = setInterval(fetchWeeklySales, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const totalRevenue = analyticsData.dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
  const totalTransactions = analyticsData.dailyRevenue.reduce((sum, day) => sum + day.transactions, 0);
  const avgDailyRevenue = analyticsData.dailyRevenue.length > 0 ? totalRevenue / analyticsData.dailyRevenue.length : 0;
  const peakHour = analyticsData.hourlyDistribution.reduce((max, hour) => 
    hour.count > max.count ? hour : max, { hour: 0, count: 0 });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {[1,2,3,4,5].map(i => (
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
        <h2 className="text-2xl font-bold text-gray-900">📊 Analytics do Berçário</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-3 py-1"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          <div className="text-sm text-gray-500">
            Última atualização: {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Weekly Sales Card */}
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-emerald-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-emerald-600">Vendas desta Semana</p>
              <p className="text-2xl font-bold text-emerald-900">${weeklySales.totalSales.toFixed(2)}</p>
              <p className="text-xs text-emerald-700">{weeklySales.dateRange}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-600">Receita Total</p>
              <p className="text-2xl font-bold text-green-900">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-600">Transações</p>
              <p className="text-2xl font-bold text-blue-900">{totalTransactions}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-purple-600">Média Diária</p>
              <p className="text-2xl font-bold text-purple-900">${avgDailyRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-orange-600">Pico de Atividade</p>
              <p className="text-2xl font-bold text-orange-900">{peakHour.hour}:00h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Items */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🐄 Animais Mais Vendidos</h3>
          {analyticsData.topItems.length > 0 ? (
            <div className="space-y-3">
              {analyticsData.topItems.slice(0, 5).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 ${
                      index === 0 ? 'bg-green-600' : 
                      index === 1 ? 'bg-blue-600' : 
                      index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.quantity} vendidos</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-600">${item.revenue.toFixed(2)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <PieChart className="mx-auto h-12 w-12 mb-2" />
              <p>Nenhuma venda registrada</p>
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">👑 Melhores Clientes</h3>
          {analyticsData.topClients.length > 0 ? (
            <div className="space-y-3">
              {analyticsData.topClients.slice(0, 5).map((client, index) => (
                <div key={client.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 ${
                      index === 0 ? 'bg-green-600' : 
                      index === 1 ? 'bg-blue-600' : 
                      index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-500">{client.purchaseCount} compras</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-green-600">${client.totalSpent.toFixed(2)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <BarChart3 className="mx-auto h-12 w-12 mb-2" />
              <p>Nenhum cliente registrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Performance Recente</h3>
        {analyticsData.dailyRevenue.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="flex items-end space-x-2 h-32">
              {analyticsData.dailyRevenue.slice(-14).map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t"
                    style={{
                      height: `${Math.max(10, (day.revenue / Math.max(...analyticsData.dailyRevenue.map(d => d.revenue))) * 100)}%`
                    }}
                  ></div>
                  <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                    {new Date(day.date).toLocaleDateString('pt-BR').split('/').slice(0, 2).join('/')}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center">
              Receita diária dos últimos 14 dias
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <TrendingUp className="mx-auto h-12 w-12 mb-2" />
            <p>Nenhum dado de performance disponível</p>
          </div>
        )}
      </div>
    </div>
  );
}