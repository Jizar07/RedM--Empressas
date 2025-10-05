'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useServer } from '@/contexts/ServerContext';
import { Server, Users, Bot, Activity, MessageSquare, Settings, BarChart3, Shield, Package, Truck, Send, FileText, Gavel, ChefHat, DollarSign, Building, Receipt } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthButton from '@/components/AuthButton';
import ServerDropdown from '@/components/ServerDropdown';
import SplashPage from '@/components/SplashPage';
import RoleGuard from '@/components/RoleGuard';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/lib/auth';
import { healthCheck, botApi, serverApi } from '@/lib/api';
import { BotStats, ServerInfo } from '@/types';
import { useFirmAccess } from '@/hooks/useFirmAccess';
import { FirmConfig } from '@/types/firms';

// Dynamic imports for heavy components - loaded only when needed
const ServerStatusCard = dynamic(() => import('@/components/ServerStatusCard'), { ssr: false });
const EnhancedServerStatus = dynamic(() => import('@/components/EnhancedServerStatus'), { ssr: false });
const PlayerManagement = dynamic(() => import('@/components/PlayerManagement'), { ssr: false });
const KnownPlayersCard = dynamic(() => import('@/components/KnownPlayersCard'), { ssr: false });
const ChannelParser = dynamic(() => import('@/components/ChannelParser'), { ssr: false });
const RegistrationSettings = dynamic(() => import('@/components/RegistrationSettings'), { ssr: false });
const RegistrationAnalytics = dynamic(() => import('@/components/RegistrationAnalytics'), { ssr: false });
const OrdersSettings = dynamic(() => import('@/components/OrdersSettings'), { ssr: false });
const OrdersManagement = dynamic(() => import('@/components/OrdersManagement'), { ssr: false });
const OrdersDashboard = dynamic(() => import('@/components/OrdersDashboard'), { ssr: false });
const ChannelLogsConfig = dynamic(() => import('@/components/ChannelLogsConfig'), { ssr: false });
const DiscordCommands = dynamic(() => import('@/components/DiscordCommands'), { ssr: false });
const ModerationSettings = dynamic(() => import('@/components/ModerationSettings'), { ssr: false });
const Recipes = dynamic(() => import('@/components/Recipes'), { ssr: false });
const PriceList = dynamic(() => import('@/components/PriceList'), { ssr: false });
const EstoqueBW = dynamic(() => import('@/components/EstoqueBW'), { ssr: false });
const TrabalhadoresBW = dynamic(() => import('@/components/TrabalhadoresBW'), { ssr: false });
const FirmManagement = dynamic(() => import('@/components/FirmManagement'), { ssr: false });
const PaymentSettings = dynamic(() => import('@/components/PaymentSettings'), { ssr: false });
const WorkerPaymentReceipts = dynamic(() => import('@/components/WorkerPaymentReceipts'), { ssr: false });
const GenericFirmDashboard = dynamic(() => import('@/components/GenericFirmDashboard'), { ssr: false });
const FirmTemplateRenderer = dynamic(() => import('@/components/FirmTemplateRenderer'), { ssr: false });
const UserMenu = dynamic(() => import('@/components/UserMenu'), { ssr: false });
const SimpleUserMenu = dynamic(() => import('@/components/SimpleUserMenu'), { ssr: false });

// Import getAvailableComponents separately since it's used in logic
import { getAvailableComponents } from '@/components/FirmTemplateRenderer';

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
  const [isPending, startTransition] = useTransition();
  const { selectedServerId, selectedServerName, setSelectedServer } = useServer();
  const { canAccessChannelParser, isAdmin } = useAuth();
  const { accessibleFirms, loading: firmsLoading } = useFirmAccess(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Load translations BEFORE showing page
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3050/api';
        const response = await fetch(`${apiUrl}/localization/translations`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.custom_overrides) {
            (window as any).__translationsCache = data.data.custom_overrides;
          }
        }
      } catch (error) {
        console.debug('Failed to load translations:', error);
      } finally {
        setTranslationsLoaded(true);
      }
    };

    loadTranslations();
  }, []);

  // Wait for all APIs to complete before showing content
  useEffect(() => {
    if (!firmsLoading && accessibleFirms.length > 0 && translationsLoaded) {
      // Small delay to ensure all state updates are done
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [firmsLoading, accessibleFirms, translationsLoaded]);
  
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
    // Get tab from URL parameter on page load
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // DON'T fetch stats on main page - causes flicker
  // Only fetch when user clicks on dashboard tab
  useEffect(() => {
    // Only fetch if on dashboard tab
    if (activeTab !== 'dashboard') return;

    const fetchBotStats = async () => {
      try {
        // Only fetch quick APIs
        Promise.all([
          healthCheck().then(health => {
            startTransition(() => setHealthStatus(health));
          }).catch(console.error),
          botApi.getStats().then(stats => {
            startTransition(() => setBotStats(stats));
          }).catch(() => {
            startTransition(() => setBotStats(null));
          })
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    const deferredFetch = setTimeout(fetchBotStats, 500);
    const interval = setInterval(fetchBotStats, 60000);

    return () => {
      clearTimeout(deferredFetch);
      clearInterval(interval);
    };
  }, [activeTab]); // Only run when tab changes

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

  // Memoize tabs to prevent regeneration on every render
  // Only regenerate when accessibleFirms actually changes
  const tabs = useMemo(() => generateTabs(), [accessibleFirms, canAccessChannelParser, showAdminTabs]);

  // Show splash page for unauthenticated users ONLY
  if (status === 'unauthenticated' || (!session && status !== 'loading')) {
    return <SplashPage botStats={botStats} />;
  }

  // CRITICAL: Wait for initial firms load to prevent flicker
  // Show a minimal loading state while firms are being fetched
  // This prevents the massive re-render when accessibleFirms loads
  if (status === 'loading' || isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <Server className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Loading...</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    // <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-600 dark:bg-red-700 rounded-lg transition-colors">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">
                  {selectedServerName || 'RedM Empresas'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Gerenciador de Empresas</p>
              </div>
            </div>

            {/* Bot Status, Server Selector, Theme Toggle and User Menu */}
            <div className="flex items-center space-x-4">
              <ServerDropdown />
              <AuthButton />
              {/* Always reserve space, fade in when data loads - prevents layout shift/flicker */}
              <div className={`flex items-center space-x-2 text-sm transition-opacity duration-300 ${botStats ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className={`w-2 h-2 rounded-full ${botStats?.ready ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-600 dark:text-gray-300">Bot {botStats?.ready ? 'Online' : 'Offline'}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-300">{botStats?.ping || 0}ms</span>
              </div>
              <ThemeToggle />
              <SimpleUserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || 
                (tab.id === 'admin' && (activeTab === 'registration-settings' || activeTab === 'registration-analytics' || activeTab === 'orders-settings' || activeTab === 'channel-logs-config' || activeTab === 'discord-commands' || activeTab === 'moderation-settings' || activeTab === 'firm-management' || activeTab === 'payment-settings' || activeTab === 'payment-receipts')) ||
                (tab.id === 'servicos' && (activeTab === 'orders-dashboard' || activeTab === 'orders-management' || activeTab === 'recipes' || activeTab === 'price-list')) ||
                (tab.submenu && tab.submenu.some((subitem: any) => subitem.id === activeTab));
              return (
                <button
                  key={tab.id}
                  onClick={() => changeTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-red-600 dark:border-red-500 text-red-600 dark:text-red-500'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
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
            <div className="card p-6 bg-white dark:bg-gray-800 transition-colors">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
                {selectedServerName ? `${selectedServerName} Dashboard` : 'RedM Empresas Dashboard'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg text-white transition-all duration-300">
                  <h3 className="text-lg font-semibold mb-2">Server Players</h3>
                  <p className="text-3xl font-bold transition-all duration-300">
                    {serverInfo?.players || 0}
                  </p>
                  <p className="text-red-100 text-sm transition-all duration-300">
                    Max: {serverInfo?.maxPlayers || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white transition-all duration-300">
                  <h3 className="text-lg font-semibold mb-2">Bot Status</h3>
                  <p className="text-3xl font-bold transition-all duration-300">
                    {botStats?.ready ? 'Online' : 'Offline'}
                  </p>
                  <p className="text-green-100 text-sm transition-all duration-300">
                    {botStats ? `${botStats.ping}ms ping` : 'Connecting...'}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white transition-all duration-300">
                  <h3 className="text-lg font-semibold mb-2">Active Firms</h3>
                  <p className="text-3xl font-bold transition-all duration-300">
                    {accessibleFirms.length}
                  </p>
                  <p className="text-blue-100 text-sm">Accessible to you</p>
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


        {(activeTab === 'admin' || activeTab === 'registration-settings' || activeTab === 'registration-analytics' || activeTab === 'orders-settings' || activeTab === 'channel-logs-config' || activeTab === 'discord-commands' || activeTab === 'moderation-settings' || activeTab === 'payment-settings' || activeTab === 'payment-receipts' || activeTab === 'firm-management') && (
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
                  onClick={() => changeTab('payment-receipts')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'payment-receipts'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <Receipt className="h-8 w-8 text-gray-600 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Worker Payment Receipts</h3>
                  <p className="text-gray-600">View worker payment receipts created by Pay Worker button</p>
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
            {activeTab === 'payment-receipts' && <WorkerPaymentReceipts />}
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
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{firm.name}</h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{firm.description || 'Sistema de gestão'}</span>
                  </div>

                  <nav className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
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
                                ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
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
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div>
              Stoffeltech v0.046 - Gerenciador de Empresas no RedM
            </div>
            <div className="flex items-center space-x-4">
              {healthStatus && (
                <span className={healthStatus.status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                  API: {healthStatus.status}
                </span>
              )}
              {botStats && (
                <span className={botStats.ready ? 'text-green-600' : 'text-red-600'}>
                  Bot: {botStats.ready ? 'Online' : 'Offline'}
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>
      </div>
    // </ProtectedRoute>
  );
}