'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy, Medal, Star, Users, TrendingUp, Activity,
  Sprout, Beef, Train, Crown, Award, BarChart3,
  RefreshCw, Clock, Hash, DollarSign
} from 'lucide-react';
import { workerRankingsApi } from '@/lib/api';

interface WorkerRanking {
  workerId: string;
  workerName: string;
  count: number;
  totalAmount?: number;
  rank: number;
  badge: string;
}

interface RankingResponse {
  plantServices: WorkerRanking[];
  animalServices: WorkerRanking[];
  ferroviaMissions: WorkerRanking[];
  lastUpdated: string;
}

interface WeeklyWorkerStats {
  workerId: string;
  workerName: string;
  plants: {
    thisWeek: number;
    allTime: number;
  };
  animals: {
    thisWeek: number;
    allTime: number;
  };
  ferrovia: {
    thisWeek: number;
    allTime: number;
  };
  lastActivity: string;
}

interface WeeklyRankings {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  year: number;
  plantRankings: WeeklyWorkerStats[];
  animalRankings: WeeklyWorkerStats[];
  ferroviaRankings: WeeklyWorkerStats[];
  lastUpdated: string;
}

interface WeeklyResponse {
  success: boolean;
  data: WeeklyRankings;
  timeUntilReset: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
}

interface WorkerRankingsProps {
  onClose?: () => void;
}

export default function WorkerRankings({ onClose }: WorkerRankingsProps) {
  const [rankings, setRankings] = useState<RankingResponse | null>(null);
  const [weeklyRankings, setWeeklyRankings] = useState<WeeklyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plant' | 'animal' | 'ferrovia'>('plant');
  const [viewMode, setViewMode] = useState<'weekly' | 'all-time'>('weekly');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchRankings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both regular and weekly rankings in parallel
      const [allTimeData, weeklyData] = await Promise.all([
        workerRankingsApi.getRankings(),
        workerRankingsApi.getWeeklyRankings()
      ]);

      setRankings(allTimeData);
      setWeeklyRankings(weeklyData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching worker rankings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  // Listen for real-time ranking updates via Discord activity events
  useEffect(() => {
    const handleDiscordActivity = () => {
      console.log('📊 Discord activity detected, refreshing rankings...');
      // Debounce: wait a bit for backend to process and update rankings
      setTimeout(() => {
        fetchRankings();
      }, 2000); // 2 second delay to ensure backend has processed the activity
    };

    // Listen for Discord message events dispatched by browser extension
    window.addEventListener('newDiscordMessage', handleDiscordActivity);

    // Also listen for explicit ranking update events (if backend needs to trigger)
    window.addEventListener('rankingsUpdated', handleDiscordActivity);

    return () => {
      window.removeEventListener('newDiscordMessage', handleDiscordActivity);
      window.removeEventListener('rankingsUpdated', handleDiscordActivity);
    };
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: case 3: return <Medal className="w-5 h-5 text-orange-500" />;
      default: return <Trophy className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
      default: return 'bg-gray-100 text-gray-700 dark:text-gray-300';
    }
  };

  const renderRankingList = (rankings: WorkerRanking[] | WeeklyWorkerStats[], type: 'plant' | 'animal' | 'ferrovia') => {
    if (!rankings || rankings.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma atividade registrada ainda</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {rankings.map((worker, index) => {
          const isWeeklyData = 'plants' in worker;
          let rank = index + 1;
          let badge = '';
          let thisWeek = 0;
          let allTime = 0;
          let totalAmount = 0;

          if (isWeeklyData) {
            const weeklyWorker = worker as WeeklyWorkerStats;
            thisWeek = type === 'plant' ? weeklyWorker.plants.thisWeek :
                      type === 'animal' ? weeklyWorker.animals.thisWeek :
                      weeklyWorker.ferrovia.thisWeek;
            allTime = type === 'plant' ? weeklyWorker.plants.allTime :
                     type === 'animal' ? weeklyWorker.animals.allTime :
                     weeklyWorker.ferrovia.allTime;
          } else {
            const regularWorker = worker as WorkerRanking;
            rank = regularWorker.rank;
            badge = regularWorker.badge;
            allTime = regularWorker.count;
            totalAmount = regularWorker.totalAmount || 0;
          }

          // Set badges for weekly data
          if (isWeeklyData) {
            if (index === 0) badge = '🥇';
            else if (index === 1) badge = '🥈';
            else if (index === 2) badge = '🥉';
            else if (index < 10) badge = '⭐';
            else badge = '';
          }

          return (
            <div
              key={worker.workerId}
              className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                rank <= 3
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/40 dark:to-orange-900/40 border-yellow-200 dark:border-yellow-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-4">
                {/* Rank Badge */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${getRankBadgeColor(rank)}`}>
                  {rank <= 3 ? badge : rank}
                </div>

                {/* Rank Icon */}
                <div className="flex-shrink-0">
                  {getRankIcon(rank)}
                </div>

                {/* Worker Info */}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{worker.workerName}</h3>
                    {rank <= 3 && (
                      <span className="text-lg">{badge}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center space-x-1">
                      <Hash className="w-3 h-3" />
                      <span>
                        {viewMode === 'weekly' && isWeeklyData ? (
                          <>
                            {type === 'plant' && `${thisWeek.toLocaleString()} plantas esta semana, ${allTime.toLocaleString()} total`}
                            {type === 'animal' && `${thisWeek.toLocaleString()} animais esta semana, ${allTime.toLocaleString()} total`}
                            {type === 'ferrovia' && `${thisWeek.toLocaleString()} missões esta semana, ${allTime.toLocaleString()} total`}
                          </>
                        ) : (
                          <>
                            {type === 'plant' && `${allTime.toLocaleString()} plantas`}
                            {type === 'animal' && `${allTime.toLocaleString()} animais`}
                            {type === 'ferrovia' && `${allTime.toLocaleString()} missões`}
                          </>
                        )}
                      </span>
                    </div>
                    {!isWeeklyData && totalAmount > 0 && (
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span>${totalAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="text-right">
                {rank <= 10 && (
                  <div className="flex items-center space-x-1 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium">Top {rank}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getTabIcon = (tab: 'plant' | 'animal' | 'ferrovia') => {
    switch (tab) {
      case 'plant': return <Sprout className="w-4 h-4" />;
      case 'animal': return <Beef className="w-4 h-4" />;
      case 'ferrovia': return <Train className="w-4 h-4" />;
    }
  };

  const getCurrentRankings = () => {
    if (viewMode === 'weekly' && weeklyRankings?.data) {
      switch (activeTab) {
        case 'plant': return weeklyRankings.data.plantRankings;
        case 'animal': return weeklyRankings.data.animalRankings;
        case 'ferrovia': return weeklyRankings.data.ferroviaRankings;
        default: return [];
      }
    } else if (rankings) {
      switch (activeTab) {
        case 'plant': return rankings.plantServices;
        case 'animal': return rankings.animalServices;
        case 'ferrovia': return rankings.ferroviaMissions;
        default: return [];
      }
    }
    return [];
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'plant': return 'Ranking - Serviços de Plantas';
      case 'animal': return 'Ranking - Serviços de Animais';
      case 'ferrovia': return 'Ranking - Missões Ferrovia';
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'plant': return 'Trabalhadores com mais plantas depositadas';
      case 'animal': return 'Trabalhadores com mais animais vendidos';
      case 'ferrovia': return 'Trabalhadores com mais missões de transporte completadas';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-300">Carregando rankings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Award className="w-12 h-12 mx-auto mb-4 text-red-500 opacity-50" />
          <p className="text-red-600 mb-4">Erro ao carregar rankings</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchRankings}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/200 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rankings dos Trabalhadores</h1>
            <p className="text-gray-600 dark:text-gray-300">Performance baseada em atividades registradas</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchRankings}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Atualizar</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-md transition-all duration-200 ${
              viewMode === 'weekly'
                ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            📅 Rankings Semanais
          </button>
          <button
            onClick={() => setViewMode('all-time')}
            className={`px-4 py-2 rounded-md transition-all duration-200 ${
              viewMode === 'all-time'
                ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            🏆 Rankings Totais
          </button>
        </div>
      </div>

      {/* Weekly Info */}
      {viewMode === 'weekly' && weeklyRankings?.data && (
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/40 dark:to-purple-900/40 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                📅 Semana {weeklyRankings.data.weekNumber}/{weeklyRankings.data.year}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {new Date(weeklyRankings.data.weekStart).toLocaleDateString('pt-BR')} - {new Date(weeklyRankings.data.weekEnd).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {weeklyRankings.timeUntilReset && (
              <div className="text-right">
                <p className="text-sm font-medium text-blue-900">⏰ Próximo reset</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {weeklyRankings.timeUntilReset.days}d {weeklyRankings.timeUntilReset.hours}h {weeklyRankings.timeUntilReset.minutes}m
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        {(['plant', 'animal', 'ferrovia'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            {getTabIcon(tab)}
            <span className="font-medium">
              {tab === 'plant' && 'Plantas'}
              {tab === 'animal' && 'Animais'}
              {tab === 'ferrovia' && 'Ferrovia'}
            </span>
            <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-full">
              {getCurrentRankings().length}
            </span>
          </button>
        ))}
      </div>

      {/* Current Tab Content */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{getTabTitle()}</h2>
            <p className="text-gray-600 dark:text-gray-300">{getTabDescription()}</p>
          </div>
          {rankings && (
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Atualizado: {new Date(rankings.lastUpdated).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          )}
        </div>

        {renderRankingList(getCurrentRankings(), activeTab)}
      </div>

      {/* Weekly Prize Information */}
      {viewMode === 'weekly' && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/40 dark:to-orange-900/40 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">🏆 Premiação Semanal - Top 3 Plantação</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl">🥇</div>
                <div className="font-bold text-yellow-600">R$ 2.500</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">1° Lugar</div>
              </div>
              <div>
                <div className="text-2xl">🥈</div>
                <div className="font-bold text-gray-600 dark:text-gray-300">R$ 1.500</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">2° Lugar</div>
              </div>
              <div>
                <div className="text-2xl">🥉</div>
                <div className="font-bold text-orange-600">R$ 1.000</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">3° Lugar</div>
              </div>
            </div>
            <p className="text-center text-sm text-yellow-700 mt-3">
              💡 Rankings reseta todo domingo às 00:00 (horário de Brasília)
            </p>
          </div>
        </div>
      )}

      {/* Statistics Summary */}
      {rankings && (
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {viewMode === 'weekly' && weeklyRankings?.data
                ? weeklyRankings.data.plantRankings.length
                : rankings.plantServices.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Trabalhadores - Plantas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {viewMode === 'weekly' && weeklyRankings?.data
                ? weeklyRankings.data.animalRankings.length
                : rankings.animalServices.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Trabalhadores - Animais</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {viewMode === 'weekly' && weeklyRankings?.data
                ? weeklyRankings.data.ferroviaRankings.length
                : rankings.ferroviaMissions.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Trabalhadores - Ferrovia</div>
          </div>
        </div>
      )}
    </div>
  );
}