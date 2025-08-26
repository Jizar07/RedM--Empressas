'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Server, Users, Bot, Activity, MessageSquare, Settings, BarChart3, Shield, Package, Truck, Send, FileText, Gavel, ChefHat, DollarSign } from 'lucide-react';
import ServerStatusCard from '@/components/ServerStatusCard';
import EnhancedServerStatus from '@/components/EnhancedServerStatus';
import PlayerManagement from '@/components/PlayerManagement';
import KnownPlayersCard from '@/components/KnownPlayersCard';
import ChannelParser from '@/components/ChannelParser';
import RegistrationSettings from '@/components/RegistrationSettings';
import RegistrationAnalytics from '@/components/RegistrationAnalytics';
import OrdersSettings from '@/components/OrdersSettings';
import OrdersManagement from '@/components/OrdersManagement';
import OrdersDashboard from '@/components/OrdersDashboard';
import ChannelLogsConfig from '@/components/ChannelLogsConfig';
import DiscordCommands from '@/components/DiscordCommands';
import ServiceHistory from '@/components/ServiceHistory';
import FarmServiceSettings from '@/components/FarmServiceSettings';
import FarmServiceOverview from '@/components/FarmServiceOverview';
import FarmServiceManagement from '@/components/FarmServiceManagement';
import ModerationSettings from '@/components/ModerationSettings';
import Recipes from '@/components/Recipes';
import PriceList from '@/components/PriceList';
import ServerMonitor from '@/components/ServerMonitor';
import FazendaBW from '@/components/FazendaBW';
import EstoqueBW from '@/components/EstoqueBW';
import TrabalhadoresBW from '@/components/TrabalhadoresBW';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserMenu from '@/components/UserMenu';
import SimpleUserMenu from '@/components/SimpleUserMenu';
import AuthButton from '@/components/AuthButton';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '@/lib/auth';
import { healthCheck, botApi, serverApi } from '@/lib/api';
import { BotStats, ServerInfo } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const { canAccessChannelParser, isAdmin } = useAuth();
  
  // Temporary: Always show admin tabs for testing
  const showAdminTabs = true;

  // Helper function to change tab and update URL
  const changeTab = (tabId: string) => {
    // If clicking on main Fazenda BW tab, default to dashboard
    if (tabId === 'fazenda-bw') {
      tabId = 'fazenda-bw-dashboard';
    }
    
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams);
    if (tabId === 'dashboard') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    router.replace(newUrl, { scroll: false });
  };

  useEffect(() => {
    setMounted(true);
    // Get tab from URL parameter on page load
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!mounted) return;
    
    const fetchBotStats = async () => {
      try {
        const [health, stats, server] = await Promise.all([
          healthCheck(),
          botApi.getStats().catch(() => null), // Don't fail if bot stats fail
          serverApi.getStatus().catch(() => null) // Don't fail if server status fails
        ]);
        setHealthStatus(health);
        setBotStats(stats);
        setServerInfo(server);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchBotStats();
    const interval = setInterval(fetchBotStats, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [mounted]);

  const tabs = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: BarChart3,
      description: 'Main dashboard overview'
    },
    ...(canAccessChannelParser() ? [{
      id: 'channel-parser',
      name: 'Channel Parser',
      icon: MessageSquare,
      description: 'Parse Discord channels and send to webhooks'
    }] : []),
    ...(showAdminTabs ? [{
      id: 'admin',
      name: 'Admin',
      icon: Shield,
      description: 'Administrative tools and settings',
      submenu: [
        {
          id: 'registration-settings',
          name: 'Registration Settings',
          icon: Settings,
          description: 'Configure registration form and roles'
        },
        {
          id: 'registration-analytics', 
          name: 'Registration Analytics',
          icon: BarChart3,
          description: 'View and manage registrations'
        },
        {
          id: 'orders-settings',
          name: 'Orders Settings',
          icon: Package,
          description: 'Configure orders system and firms'
        },
        {
          id: 'channel-logs-config',
          name: 'Channel Logs Config',
          icon: MessageSquare,
          description: 'Configure automatic channel log forwarding'
        },
        {
          id: 'discord-commands',
          name: 'Discord Commands',
          icon: Users,
          description: 'Manage Discord slash commands'
        },
        {
          id: 'moderation-settings',
          name: 'Moderation',
          icon: Gavel,
          description: 'Configure moderation and auto-reply features'
        }
      ]
    }] : []),
    {
      id: 'orders',
      name: 'Encomendas',
      icon: Package,
      description: 'Orders management and dashboard',
      submenu: [
        {
          id: 'orders-dashboard',
          name: 'Dashboard',
          icon: BarChart3,
          description: 'Orders overview and statistics'
        },
        {
          id: 'orders-management',
          name: 'Management',
          icon: Package,
          description: 'View and manage all orders'
        }
      ]
    },
    {
      id: 'farm-services',
      name: 'Farm Services',
      icon: Truck,
      description: 'Farm service submissions and receipts',
      submenu: [
        {
          id: 'farm-service-overview',
          name: 'System Overview',
          icon: BarChart3,
          description: 'Live submissions and system monitoring'
        },
        {
          id: 'service-history',
          name: 'Service History',
          icon: FileText,
          description: 'View service receipts and earnings'
        },
        {
          id: 'farm-service-settings',
          name: 'Service Settings',
          icon: Settings,
          description: 'Configure farm service system'
        }
      ]
    },
    {
      id: 'atlanta-server',
      name: 'Atlanta Server',
      icon: Server,
      description: 'Server status and player management'
    },
    {
      id: 'recipes',
      name: 'Receitas',
      icon: ChefHat,
      description: 'Recipe calculator and order management'
    },
    {
      id: 'price-list',
      name: 'Lista de Preços',
      icon: DollarSign,
      description: 'Item pricing management'
    },
    {
      id: 'server-monitor',
      name: 'Monitor do Servidor',
      icon: Activity,
      description: 'Server monitoring and player tracking'
    },
    {
      id: 'fazenda-bw',
      name: 'Fazenda BW',
      icon: BarChart3,
      description: 'Farm management dashboard with extension integration',
      submenu: [
        {
          id: 'fazenda-bw-dashboard',
          name: 'Dashboard',
          icon: BarChart3,
          description: 'Real-time activity feeds and farm overview'
        },
        {
          id: 'fazenda-bw-estoque',
          name: 'Estoque',
          icon: Package,
          description: 'Inventory management and item tracking'
        },
        {
          id: 'fazenda-bw-trabalhadores',
          name: 'Trabalhadores',
          icon: Users,
          description: 'Worker performance and analytics'
        }
      ]
    },
  ];

  return (
    // <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-600 rounded-lg">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Black Golden Dashboard</h1>
                <p className="text-sm text-gray-500">Familia BlackGolden Management</p>
              </div>
            </div>

            {/* Bot Status and User Menu */}
            <div className="flex items-center space-x-4">
              <AuthButton />
              {botStats && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${botStats.ready ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-gray-600">Bot {botStats.ready ? 'Online' : 'Offline'}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{botStats.ping}ms</span>
                </div>
              )}
              <SimpleUserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || 
                (tab.id === 'admin' && (activeTab === 'registration-settings' || activeTab === 'registration-analytics' || activeTab === 'orders-settings')) ||
                (tab.id === 'orders' && (activeTab === 'orders-dashboard' || activeTab === 'orders-management')) ||
                (tab.id === 'fazenda-bw' && (activeTab === 'fazenda-bw-dashboard' || activeTab === 'fazenda-bw-estoque' || activeTab === 'fazenda-bw-trabalhadores'));
              return (
                <button
                  key={tab.id}
                  onClick={() => changeTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Dashboard Overview */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Familia BlackGolden Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg text-white">
                  <h3 className="text-lg font-semibold mb-2">Total Players</h3>
                  <p className="text-3xl font-bold">121</p>
                  <p className="text-red-100 text-sm">Currently online</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
                  <h3 className="text-lg font-semibold mb-2">Server Status</h3>
                  <p className="text-3xl font-bold">Online</p>
                  <p className="text-green-100 text-sm">100% uptime</p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                  <h3 className="text-lg font-semibold mb-2">Registrations</h3>
                  <p className="text-3xl font-bold">45</p>
                  <p className="text-blue-100 text-sm">This week</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <button
                  onClick={() => changeTab('atlanta-server')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Server className="h-6 w-6 text-gray-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Server Status</h4>
                  <p className="text-sm text-gray-500">Check server status</p>
                </button>
                <button
                  onClick={() => changeTab('orders-dashboard')}
                  className="p-4 border border-green-300 rounded-lg hover:bg-green-50 transition-colors text-left bg-green-50"
                >
                  <Package className="h-6 w-6 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Encomendas</h4>
                  <p className="text-sm text-gray-500">Sistema de pedidos</p>
                </button>
                <button
                  onClick={() => changeTab('recipes')}
                  className="p-4 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors text-left bg-orange-50"
                >
                  <ChefHat className="h-6 w-6 text-orange-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Receitas</h4>
                  <p className="text-sm text-gray-500">Calculadora de receitas</p>
                </button>
                <button
                  onClick={() => changeTab('price-list')}
                  className="p-4 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-left bg-blue-50"
                >
                  <DollarSign className="h-6 w-6 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Lista de Preços</h4>
                  <p className="text-sm text-gray-500">Gerenciar preços</p>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => changeTab('registration-settings')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Settings className="h-6 w-6 text-gray-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Registration</h4>
                  <p className="text-sm text-gray-500">Manage registration</p>
                </button>
                <button
                  onClick={() => changeTab('channel-parser')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <MessageSquare className="h-6 w-6 text-gray-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Channel Parser</h4>
                  <p className="text-sm text-gray-500">Parse Discord channels</p>
                </button>
                <button
                  onClick={() => changeTab('registration-analytics')}
                  className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <BarChart3 className="h-6 w-6 text-gray-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Analytics</h4>
                  <p className="text-sm text-gray-500">View statistics</p>
                </button>
                <button
                  onClick={() => changeTab('server-monitor')}
                  className="p-4 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors text-left bg-purple-50"
                >
                  <Activity className="h-6 w-6 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Monitor do Servidor</h4>
                  <p className="text-sm text-gray-500">Monitoramento avançado</p>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <button
                  onClick={() => changeTab('fazenda-bw')}
                  className="p-4 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors text-left bg-emerald-50"
                >
                  <BarChart3 className="h-6 w-6 text-emerald-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Fazenda BW</h4>
                  <p className="text-sm text-gray-500">Dashboard da fazenda com extensão</p>
                </button>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'atlanta-server' && (
          <div className="space-y-8">
            {/* Enhanced Server Status - Main Display */}
            <EnhancedServerStatus />

            {/* Known Players */}
            <KnownPlayersCard />

            {/* Player Management */}
            {/* <RoleGuard requireModerator> */}
              <PlayerManagement />
            {/* </RoleGuard> */}
          </div>
        )}

        {activeTab === 'channel-parser' && (
          <div className="space-y-8">
            <RoleGuard requireModerator>
              <ChannelParser />
            </RoleGuard>
          </div>
        )}

        {(activeTab === 'admin' || activeTab === 'registration-settings' || activeTab === 'registration-analytics' || activeTab === 'orders-settings' || activeTab === 'channel-logs-config' || activeTab === 'discord-commands' || activeTab === 'moderation-settings') && (
          <div className="space-y-8">
            {/* Admin Menu */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Panel</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                  onClick={() => changeTab('registration-settings')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'registration-settings'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Registration Settings</h3>
                  <p className="text-gray-600">Configure registration forms, roles, and approval settings</p>
                </button>
                <button
                  onClick={() => changeTab('registration-analytics')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'registration-analytics'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Registration Analytics</h3>
                  <p className="text-gray-600">View registration statistics, manage submissions, and analyze data</p>
                </button>
                <button
                  onClick={() => changeTab('orders-settings')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'orders-settings'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Package className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Orders Settings</h3>
                  <p className="text-gray-600">Configure orders system, firms, and order management settings</p>
                </button>
                <button
                  onClick={() => changeTab('channel-logs-config')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'channel-logs-config'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Channel Logs Config</h3>
                  <p className="text-gray-600">Configure automatic channel log forwarding to external systems</p>
                </button>
                <button
                  onClick={() => changeTab('discord-commands')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'discord-commands'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Users className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Discord Commands</h3>
                  <p className="text-gray-600">Manage Discord slash commands and bot interactions</p>
                </button>
                <button
                  onClick={() => changeTab('moderation-settings')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'moderation-settings'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Gavel className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Moderation Settings</h3>
                  <p className="text-gray-600">Configure clear command, auto-mod, and auto-reply features</p>
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === 'registration-settings' && <RegistrationSettings />}
            {activeTab === 'registration-analytics' && <RegistrationAnalytics />}
            {activeTab === 'orders-settings' && <OrdersSettings />}
            {activeTab === 'channel-logs-config' && <ChannelLogsConfig />}
            {activeTab === 'discord-commands' && <DiscordCommands />}
            {activeTab === 'moderation-settings' && <ModerationSettings />}
          </div>
        )}

        {(activeTab === 'orders' || activeTab === 'orders-dashboard' || activeTab === 'orders-management') && (
          <div className="space-y-8">
            {/* Orders Menu */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sistema de Encomendas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => changeTab('orders-dashboard')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'orders-dashboard'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard</h3>
                  <p className="text-gray-600">Visão geral das encomendas, estatísticas e relatórios</p>
                </button>
                <button
                  onClick={() => changeTab('orders-management')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'orders-management'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Package className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Gerenciamento</h3>
                  <p className="text-gray-600">Visualizar, gerenciar e filtrar todas as encomendas</p>
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === 'orders-dashboard' && <OrdersDashboard />}
            {activeTab === 'orders-management' && <OrdersManagement />}
          </div>
        )}

        {/* Farm Services Section */}
        {(activeTab === 'farm-services' || activeTab === 'farm-service-overview' || activeTab === 'service-history' || activeTab === 'farm-service-settings') && (
          <div className="space-y-8">
            {/* Service Submenu */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Farm Services</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => changeTab('farm-service-overview')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'farm-service-overview'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">System Overview</h3>
                  <p className="text-gray-600">Live submissions, Discord integration, and system monitoring</p>
                </button>
                
                <button
                  onClick={() => changeTab('service-history')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'service-history'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Service History</h3>
                  <p className="text-gray-600">View receipts, earnings history, and service records</p>
                </button>
                
                <button
                  onClick={() => changeTab('farm-service-settings')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'farm-service-settings'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Settings</h3>
                  <p className="text-gray-600">Configure farm service system parameters</p>
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === 'farm-service-overview' && <FarmServiceManagement />}
            {activeTab === 'service-history' && <ServiceHistory />}
            {activeTab === 'farm-service-settings' && <FarmServiceSettings />}
          </div>
        )}

        {/* Fazenda BW Section */}
        {(activeTab === 'fazenda-bw' || activeTab === 'fazenda-bw-dashboard' || activeTab === 'fazenda-bw-estoque' || activeTab === 'fazenda-bw-trabalhadores') && (
          <div className="space-y-8">
            {/* Fazenda BW Menu */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🏛️ Fazenda BW - Sistema de Gestão</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => changeTab('fazenda-bw-dashboard')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'fazenda-bw-dashboard'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard</h3>
                  <p className="text-gray-600">Feeds de atividade em tempo real e visão geral da fazenda</p>
                </button>
                
                <button
                  onClick={() => changeTab('fazenda-bw-estoque')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'fazenda-bw-estoque'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Package className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Estoque</h3>
                  <p className="text-gray-600">Gerenciamento de inventário e rastreamento de itens</p>
                </button>
                
                <button
                  onClick={() => changeTab('fazenda-bw-trabalhadores')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'fazenda-bw-trabalhadores'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Users className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Trabalhadores</h3>
                  <p className="text-gray-600">Performance dos trabalhadores e análise de atividades</p>
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === 'fazenda-bw-dashboard' && <FazendaBW />}
            {activeTab === 'fazenda-bw-estoque' && <EstoqueBW />}
            {activeTab === 'fazenda-bw-trabalhadores' && <TrabalhadoresBW />}
          </div>
        )}

        {/* New Tabs from Fazenda System */}
        {activeTab === 'recipes' && <Recipes />}
        {activeTab === 'price-list' && <PriceList />}
        {activeTab === 'server-monitor' && <ServerMonitor />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Black Golden Dashboard v0.002 - Familia BlackGolden Management
            </div>
            <div className="flex items-center space-x-4">
              {mounted && healthStatus && (
                <span>API: {healthStatus.status}</span>
              )}
              {mounted && (
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        </div>
      </footer>
      </div>
    // </ProtectedRoute>
  );
}