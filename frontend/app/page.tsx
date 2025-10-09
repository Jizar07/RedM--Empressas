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
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { healthCheck, botApi, serverApi } from '@/lib/api';
import { BotStats, ServerInfo } from '@/types';
import { useFirmAccess } from '@/hooks/useFirmAccess';
import { FirmConfig } from '@/types/firms';
import { getFirmEmoji } from '@/lib/firmHelpers';

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
const RedMServerBrowser = dynamic(() => import('@/components/RedMServerBrowser'), { ssr: false });
const RedMServerListSidebar = dynamic(() => import('@/components/RedMServerListSidebar'), { ssr: false });

// Import getAvailableComponents separately since it's used in logic
import { getAvailableComponents } from '@/components/FirmTemplateRenderer';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  // Debug logging
  console.log('NextAuth session debug:', { session, status });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [isPending, startTransition] = useTransition();
  const { selectedServerId, selectedServerName, selectedServerIcon, setSelectedServer } = useServer();
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
        name: t('nav.dashboard'),
        icon: BarChart3,
        description: t('dashboard.title')
      },
      ...(canAccessChannelParser() ? [{
        id: 'channel-parser',
        name: t('nav.channelParser'),
        icon: MessageSquare,
        description: t('quickActions.channelParserDesc')
      }] : []),
      {
        id: 'atlanta-server',
        name: t('nav.atlantaServer'),
        icon: Server,
        description: t('quickActions.serverStatusDesc')
      },
      {
        id: 'servicos',
        name: t('nav.servicos'),
        icon: Truck,
        description: t('servicos.ordersRecipes'),
        submenu: [
          {
            id: 'orders-dashboard',
            name: t('servicos.orders'),
            icon: Package,
            description: t('servicos.ordersDesc')
          },
          {
            id: 'recipes',
            name: t('servicos.recipes'),
            icon: ChefHat,
            description: t('servicos.recipesDesc')
          },
          {
            id: 'price-list',
            name: t('servicos.priceList'),
            icon: DollarSign,
            description: t('servicos.priceListDesc')
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
              {selectedServerId && selectedServerIcon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${selectedServerId}/${selectedServerIcon}.png?size=64`}
                  alt={selectedServerName || 'Server'}
                  className="w-10 h-10 rounded-full"
                />
              ) : selectedServerName ? (
                <div className="w-10 h-10 bg-red-600 dark:bg-red-700 rounded-full flex items-center justify-center transition-colors">
                  <span className="text-white text-lg font-bold">
                    {selectedServerName.substring(0, 1).toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="p-2 bg-red-600 dark:bg-red-700 rounded-lg transition-colors">
                  <Server className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">
                  {selectedServerName || 'RedM Empresas'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Gerenciador de Empresas</p>
              </div>
            </div>

            {/* Bot Status, Server Selector, Theme Toggle, Language Toggle and User Menu */}
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
              <LanguageToggle />
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
                {selectedServerName ? `${selectedServerName} ${t('dashboard.title')}` : `RedM Empresas ${t('dashboard.title')}`}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg text-white transition-all duration-300">
                  <h3 className="text-lg font-semibold mb-2">{t('dashboard.serverPlayers')}</h3>
                  <p className="text-3xl font-bold transition-all duration-300">
                    {serverInfo?.players || 0}
                  </p>
                  <p className="text-red-100 text-sm transition-all duration-300">
                    {t('dashboard.max')}: {serverInfo?.maxPlayers || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white transition-all duration-300">
                  <h3 className="text-lg font-semibold mb-2">{t('dashboard.botStatus')}</h3>
                  <p className="text-3xl font-bold transition-all duration-300">
                    {botStats?.ready ? t('dashboard.online') : t('dashboard.offline')}
                  </p>
                  <p className="text-green-100 text-sm transition-all duration-300">
                    {botStats ? `${botStats.ping}ms ${t('dashboard.ping')}` : t('dashboard.connecting')}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white transition-all duration-300">
                  <h3 className="text-lg font-semibold mb-2">{t('dashboard.activeFirms')}</h3>
                  <p className="text-3xl font-bold transition-all duration-300">
                    {accessibleFirms.length}
                  </p>
                  <p className="text-blue-100 text-sm">{t('dashboard.accessibleToYou')}</p>
                </div>
              </div>
            </div>

            {/* Your Firms - Quick Access */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🏢 {t('firms.title')}</h3>
              {firmsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t('firms.loading')}</p>
                </div>
              ) : accessibleFirms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {accessibleFirms.map((firm: FirmConfig) => (
                    <button
                      key={firm.id}
                      onClick={() => changeTab(firm.id)}
                      className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                    >
                      <div className="text-3xl mb-2">{getFirmEmoji(firm)}</div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">{firm.name}</h4>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${firm.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{firm.enabled ? t('firms.active') : t('firms.inactive')}</span>
                      </div>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('firms.access')} →</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">{t('firms.noFirms')}</p>
                </div>
              )}
            </div>

            {/* Admin Tools */}
            {showAdminTabs && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⚙️ {t('admin.title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => changeTab('registration-settings')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('admin.registrationSettings')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.registrationSettingsDesc')}</p>
                  </button>
                  <button
                    onClick={() => changeTab('registration-analytics')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <BarChart3 className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('admin.registrationAnalytics')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.registrationAnalyticsDesc')}</p>
                  </button>
                  <button
                    onClick={() => changeTab('orders-settings')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <Package className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('admin.ordersSettings')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.ordersSettingsDesc')}</p>
                  </button>
                  <button
                    onClick={() => changeTab('channel-logs-config')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <MessageSquare className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('admin.channelLogsConfig')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.channelLogsConfigDesc')}</p>
                  </button>
                  <button
                    onClick={() => changeTab('discord-commands')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <Users className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('admin.discordCommands')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.discordCommandsDesc')}</p>
                  </button>
                  <button
                    onClick={() => changeTab('moderation-settings')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <Gavel className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('admin.moderationSettings')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.moderationSettingsDesc')}</p>
                  </button>
                  <button
                    onClick={() => changeTab('payment-settings')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                  >
                    <DollarSign className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('admin.paymentSettings')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.paymentSettingsDesc')}</p>
                  </button>
                  <button
                    onClick={() => changeTab('payment-receipts')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                  >
                    <Receipt className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('admin.paymentReceipts')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.paymentReceiptsDesc')}</p>
                  </button>
                  <button
                    onClick={() => changeTab('firm-management')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                  >
                    <Building className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('admin.firmManagement')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.firmManagementDesc')}</p>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⚡ {t('dashboard.quickActions')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => changeTab('atlanta-server')}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Server className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-white">{t('quickActions.serverStatus')}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('quickActions.serverStatusDesc')}</p>
                </button>
                <button
                  onClick={() => changeTab('servicos')}
                  className="p-4 border-2 border-green-300 dark:border-green-700 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-left bg-green-50 dark:bg-green-900/10"
                >
                  <Truck className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
                  <h4 className="font-medium text-gray-900 dark:text-white">{t('quickActions.services')}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('quickActions.servicesDesc')}</p>
                </button>
                {canAccessChannelParser() && (
                  <button
                    onClick={() => changeTab('channel-parser')}
                    className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <MessageSquare className="h-6 w-6 text-gray-600 dark:text-gray-400 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white">{t('quickActions.channelParser')}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('quickActions.channelParserDesc')}</p>
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'atlanta-server' && (
          <div className="space-y-8">
            {/* First Row: Server Browser + Status with Sidebar */}
            <div className="flex gap-6">
              {/* Main Content */}
              <div className="flex-1 space-y-8">
                {/* Server Browser */}
                <RedMServerBrowser />

                {/* Enhanced Server Status */}
                <EnhancedServerStatus />
              </div>

              {/* Sidebar */}
              <div className="w-80 flex-shrink-0 sticky top-4 self-start">
                <RedMServerListSidebar />
              </div>
            </div>

            {/* Full Width Sections Below */}
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


        {/* Admin Tool Components */}
        {activeTab === 'registration-settings' && <RegistrationSettings />}
        {activeTab === 'registration-analytics' && <RegistrationAnalytics />}
        {activeTab === 'orders-settings' && <OrdersSettings />}
        {activeTab === 'channel-logs-config' && <ChannelLogsConfig />}
        {activeTab === 'discord-commands' && <DiscordCommands />}
        {activeTab === 'moderation-settings' && <ModerationSettings />}
        {activeTab === 'payment-settings' && <PaymentSettings />}
        {activeTab === 'payment-receipts' && <WorkerPaymentReceipts />}
        {activeTab === 'firm-management' && <FirmManagement />}

        {/* Servicos Section */}
        {(activeTab === 'servicos' || activeTab === 'orders-dashboard' || activeTab === 'orders-management' || activeTab === 'recipes' || activeTab === 'price-list') && (
          <div className="space-y-8">
            {/* Servicos Menu */}
            <div className="card p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('servicos.title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  onClick={() => changeTab('orders-dashboard')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'orders-dashboard' || activeTab === 'orders-management'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Package className="h-8 w-8 text-gray-600 dark:text-gray-300 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('servicos.orders')}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{t('servicos.ordersDesc')}</p>
                </button>
                <button
                  onClick={() => changeTab('recipes')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'recipes'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <ChefHat className="h-8 w-8 text-gray-600 dark:text-gray-300 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('servicos.recipes')}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{t('servicos.recipesDesc')}</p>
                </button>
                <button
                  onClick={() => changeTab('price-list')}
                  className={`p-6 border-2 rounded-lg text-left transition-colors ${
                    activeTab === 'price-list'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <DollarSign className="h-8 w-8 text-gray-600 dark:text-gray-300 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('servicos.priceList')}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{t('servicos.priceListDesc')}</p>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🏢 {t('firms.title')}</h2>
              <p className="text-gray-600 mb-6">{t('firms.selectCompany')}</p>
              
              
              {firmsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">{t('firms.loading')}</p>
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
                            <p className="text-sm text-gray-500">{firm.description || t('firms.selectCompany')}</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{t('firms.status')}:</span>
                            <span className={`font-medium ${
                              firm.enabled ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {firm.enabled ? t('firms.active') : t('firms.inactive')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{t('firms.monitoring')}:</span>
                            <span className={`font-medium ${
                              firm.monitoring.enabled ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {firm.monitoring.enabled ? t('firms.active') : t('firms.inactive')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{t('firms.roles')}:</span>
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
                          {t('firms.access')} {firm.name}
                        </button>
                      </div>
                    ))}
                  </div>

                  {accessibleFirms.length === 0 && (
                    <div className="text-center py-12">
                      <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{t('firms.noFirms')}</h3>
                      <p className="text-gray-500">
                        {t('firms.noFirmsDescription')}
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