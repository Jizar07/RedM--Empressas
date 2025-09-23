'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useServer } from '@/contexts/ServerContext';
import { Server, Users, Bot, Activity, MessageSquare, Settings, BarChart3, Shield, Package, Truck, Send, FileText, Gavel, ChefHat, DollarSign, Building } from 'lucide-react';
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
import ModerationSettings from '@/components/ModerationSettings';
import Recipes from '@/components/Recipes';
import PriceList from '@/components/PriceList';
import FazendaBW from '@/components/FazendaBW';
import EstoqueBW from '@/components/EstoqueBW';
import TrabalhadoresBW from '@/components/TrabalhadoresBW';
import FirmManagement from '@/components/FirmManagement';
import PaymentSettings from '@/components/PaymentSettings';
import GenericFirmDashboard from '@/components/GenericFirmDashboard';
import FirmTemplateRenderer, { getAvailableComponents } from '@/components/FirmTemplateRenderer';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserMenu from '@/components/UserMenu';
import SimpleUserMenu from '@/components/SimpleUserMenu';
import AuthButton from '@/components/AuthButton';
import ServerSelector from '@/components/ServerSelector';
import SplashPage from '@/components/SplashPage';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '@/lib/auth';
import { healthCheck, botApi, serverApi } from '@/lib/api';
import { BotStats, ServerInfo } from '@/types';
import { useFirmAccess } from '@/hooks/useFirmAccess';
import { FirmConfig } from '@/types/firms';

// Disable static generation for this page since it uses dynamic content
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  // Debug logging
  console.log('NextAuth session debug:', { session, status });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const { selectedServerId, selectedServerName, setSelectedServer } = useServer();
  const { canAccessChannelParser, isAdmin } = useAuth();
  const { accessibleFirms, loading: firmsLoading } = useFirmAccess();
  
  // Temporary: Always show admin tabs for testing
  const showAdminTabs = true;

  // Helper function to change tab and update URL
  const changeTab = (tabId: string) => {
    // If clicking on any firm tab, default to that firm's dashboard
    const firm = accessibleFirms.find((f: FirmConfig) => f.id === tabId);
    if (firm) {
      tabId = `${firm.id}-dashboard`;
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

  // Handle server selection
  const handleServerSelect = (serverId: string, serverName: string) => {
    setSelectedServer(serverId, serverName);
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

  // Generate dynamic tabs including firm tabs
  const generateTabs = () => {
    const baseTabs = [
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
          },
          {
            id: 'firm-management',
            name: 'Firm Management',
            icon: Building,
            description: 'Configure multiple firms and monitoring'
          }
        ]
      }] : []),
      {
        id: 'atlanta-server',
        name: 'Atlanta Server',
        icon: Server,
        description: 'Server status and player management'
      },
      {
        id: 'servicos',
        name: 'Serviços',
        icon: Truck,
        description: 'Encomendas, receitas e lista de preços',
        submenu: [
          {
            id: 'orders-dashboard',
            name: 'Encomendas',
            icon: Package,
            description: 'Sistema de pedidos e encomendas'
          },
          {
            id: 'recipes',
            name: 'Receitas',
            icon: ChefHat,
            description: 'Calculadora de receitas'
          },
          {
            id: 'price-list',
            name: 'Lista de Preços',
            icon: DollarSign,
            description: 'Gerenciamento de preços de itens'
          }
        ]
      }
    ];

    // Add dynamic firm tabs
    if (!firmsLoading && accessibleFirms.length > 0) {
      accessibleFirms.forEach((firm: FirmConfig) => {
        const availableComponents = getAvailableComponents(firm);
        const iconMap: Record<string, any> = {
          BarChart3, Package, Users, DollarSign, Settings, Activity
        };
        
        const submenu = availableComponents
          .filter(comp => comp.enabled)
          .map(comp => ({
            id: `${firm.id}-${comp.id}`,
            name: comp.name,
            icon: iconMap[comp.icon] || BarChart3,
            description: `${comp.name} para ${firm.name}`
          }));

        baseTabs.push({
          id: firm.id,
          name: firm.name,
          icon: Building,
          description: firm.description || `Gestão da empresa ${firm.name}`,
          submenu: submenu.length > 0 ? submenu : [
            {
              id: `${firm.id}-dashboard`,
              name: 'Dashboard',
              icon: BarChart3,
              description: `Dashboard da ${firm.name}`
            }
          ]
        });
      });
    }

    return baseTabs;
  };

  const tabs = generateTabs();

  // Show splash page for unauthenticated users
  if (!mounted || status === 'loading') {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (status === 'unauthenticated' || !session) {
    return <SplashPage botStats={botStats} />;
  }

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
                <h1 className="text-xl font-bold text-gray-900">Stoffel's RedM Empresas</h1>
                <p className="text-sm text-gray-500">Gerenciador de Empresas</p>
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
                (tab.id === 'admin' && (activeTab === 'registration-settings' || activeTab === 'registration-analytics' || activeTab === 'orders-settings' || activeTab === 'channel-logs-config' || activeTab === 'discord-commands' || activeTab === 'moderation-settings' || activeTab === 'firm-management' || activeTab === 'payment-settings')) ||
                (tab.id === 'servicos' && (activeTab === 'orders-dashboard' || activeTab === 'orders-management' || activeTab === 'recipes' || activeTab === 'price-list')) ||
                (tab.submenu && tab.submenu.some((subitem: any) => subitem.id === activeTab));
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

      {/* Server Selection */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ServerSelector 
            onServerSelect={handleServerSelect}
            selectedServerId={selectedServerId}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Dashboard Overview */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Stoffel's RedM Empresas Dashboard</h2>
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
                  onClick={() => changeTab('servicos')}
                  className="p-4 border border-green-300 rounded-lg hover:bg-green-50 transition-colors text-left bg-green-50"
                >
                  <Truck className="h-6 w-6 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Serviços</h4>
                  <p className="text-sm text-gray-500">Encomendas, receitas e preços</p>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <button
                  onClick={() => changeTab('empresas')}
                  className="p-4 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-left bg-blue-50"
                >
                  <Building className="h-6 w-6 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Empresas</h4>
                  <p className="text-sm text-gray-500">Gerenciar múltiplas empresas</p>
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


        {(activeTab === 'admin' || activeTab === 'registration-settings' || activeTab === 'registration-analytics' || activeTab === 'orders-settings' || activeTab === 'channel-logs-config' || activeTab === 'discord-commands' || activeTab === 'moderation-settings' || activeTab === 'payment-settings' || activeTab === 'firm-management') && (
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
                <button
                  onClick={() => changeTab('payment-settings')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'payment-settings'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <DollarSign className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Settings</h3>
                  <p className="text-gray-600">Configure default pricing and payment system settings</p>
                </button>
                <button
                  onClick={() => changeTab('firm-management')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'firm-management'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Building className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Firm Management</h3>
                  <p className="text-gray-600">Configure multiple firms with role-based access and monitoring</p>
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
            {activeTab === 'payment-settings' && <PaymentSettings />}
            {activeTab === 'firm-management' && <FirmManagement />}
          </div>
        )}

        {/* Servicos Section */}
        {(activeTab === 'servicos' || activeTab === 'orders-dashboard' || activeTab === 'orders-management' || activeTab === 'recipes' || activeTab === 'price-list') && (
          <div className="space-y-8">
            {/* Servicos Menu */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Serviços</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => changeTab('orders-dashboard')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'orders-dashboard' || activeTab === 'orders-management'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Package className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Encomendas</h3>
                  <p className="text-gray-600">Sistema de pedidos e encomendas</p>
                </button>
                <button
                  onClick={() => changeTab('recipes')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'recipes'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <ChefHat className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Receitas</h3>
                  <p className="text-gray-600">Calculadora de receitas</p>
                </button>
                <button
                  onClick={() => changeTab('price-list')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'price-list'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <DollarSign className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Lista de Preços</h3>
                  <p className="text-gray-600">Gerenciamento de preços de itens</p>
                </button>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === 'orders-dashboard' && <OrdersDashboard />}
            {activeTab === 'orders-management' && <OrdersManagement />}
            {activeTab === 'recipes' && <Recipes />}
            {activeTab === 'price-list' && <PriceList />}
          </div>
        )}


        {/* Empresas Section */}
        {activeTab === 'empresas' && (
          <div className="space-y-8">
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🏢 Empresas</h2>
              <p className="text-gray-600 mb-6">Selecione uma empresa para acessar o sistema de gestão</p>
              
              
              {firmsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando empresas...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accessibleFirms.map((firm: FirmConfig) => (
                      <div key={firm.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Building className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{firm.name}</h3>
                            <p className="text-sm text-gray-500">{firm.description || 'Sistema de gestão empresarial'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Status:</span>
                            <span className={`font-medium ${
                              firm.enabled ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {firm.enabled ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Monitoramento:</span>
                            <span className={`font-medium ${
                              firm.monitoring.enabled ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {firm.monitoring.enabled ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Roles:</span>
                            <span className="text-gray-900">{firm.allowedRoles.length}</span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            // Navigate to dynamic firm dashboard
                            changeTab(`firm-${firm.id}`);
                          }}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Acessar {firm.name}
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {accessibleFirms.length === 0 && (
                    <div className="text-center py-12">
                      <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma empresa disponível</h3>
                      <p className="text-gray-500">
                        Você não tem acesso a nenhuma empresa ou nenhuma empresa foi configurada ainda.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Firm Sections */}
        {accessibleFirms.map((firm: FirmConfig) => {
            const firmActiveComponents = getAvailableComponents(firm);
            const isAnyFirmTab = firmActiveComponents.some(comp => 
              activeTab === `${firm.id}-${comp.id}` || activeTab === firm.id
            );
            
            if (!isAnyFirmTab) return null;
            
            // Determine which component to show based on activeTab
            let activeComponent = 'dashboard'; // default
            if (activeTab.startsWith(`${firm.id}-`)) {
              activeComponent = activeTab.replace(`${firm.id}-`, '');
            }

            // Icon mapping for components
            const iconMap: Record<string, any> = {
              BarChart3, Package, Users, DollarSign, Settings, Activity
            };
            
            return (
              <div key={firm.id} className="space-y-8">
                {/* Firm Navigation Menu */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">{firm.name}</h2>
                    <span className="text-sm text-gray-500">{firm.description || 'Sistema de gestão'}</span>
                  </div>
                  
                  <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    {firmActiveComponents
                      .filter(comp => comp.enabled)
                      .map((comp) => {
                        const Icon = iconMap[comp.icon] || BarChart3;
                        const isActive = activeTab === `${firm.id}-${comp.id}`;
                        
                        return (
                          <button
                            key={comp.id}
                            onClick={() => changeTab(`${firm.id}-${comp.id}`)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{comp.name}</span>
                          </button>
                        );
                      })}
                  </nav>
                </div>

                {/* Content Area */}
                <FirmTemplateRenderer firm={firm} activeComponent={activeComponent} />
              </div>
            );
          })}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Empresas Black Golden Dashboard v0.024 - Business Management System
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