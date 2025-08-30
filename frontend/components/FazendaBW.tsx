'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Package, DollarSign, Plus, Minus, Users, Activity, Settings, BarChart3, Archive } from 'lucide-react';
import TrabalhadoresBWManagement from './TrabalhadoresBWManagement';
import EstoqueBWManagement from './EstoqueBWManagement';
import PagamentosBWManagement from './PagamentosBWManagement';
import AnalyticsBWManagement from './AnalyticsBWManagement';
import MonitoringModeToggle from './MonitoringModeToggle';

interface Activity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda';
  categoria?: 'inventario' | 'financeiro' | 'sistema';
  item?: string;
  quantidade?: number;
  valor?: number;
  descricao?: string;
  parseSuccess?: boolean;
  displayText?: string;
  confidence?: 'high' | 'medium' | 'low' | 'none';
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'blue', 
  loading = false, 
  subtitle 
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-300',
    green: 'from-green-500 to-green-600 border-green-300',
    yellow: 'from-yellow-500 to-yellow-600 border-yellow-300',
    red: 'from-red-500 to-red-600 border-red-300',
    purple: 'from-purple-500 to-purple-600 border-purple-300'
  };

  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 rounded-lg text-white shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold mt-2">
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></span>
            ) : (
              value
            )}
          </p>
          {subtitle && <p className="text-sm text-white/70 mt-1">{subtitle}</p>}
        </div>
        <div className="text-white/80">{icon}</div>
      </div>
    </div>
  );
};

const getActivityIcon = (transaction: Activity): React.ReactNode => {
  const isDeposit = transaction.tipo === 'adicionar' || transaction.tipo === 'deposito';
  const color = isDeposit ? 'text-green-500' : 'text-red-500';
  
  if (transaction.categoria === 'financeiro') {
    return <DollarSign className={color} size={20} />;
  }

  if (transaction.categoria === 'inventario') {
    const itemName = transaction.item?.toLowerCase() || transaction.descricao?.toLowerCase() || '';
    
    // Return emoji icons for specific items
    if (itemName.includes('cow') || itemName.includes('vaca') || itemName.includes('cow_female')) {
      return <span className="text-xl">🐄</span>;
    }
    if (itemName.includes('pig') || itemName.includes('porco') || itemName.includes('pig_male')) {
      return <span className="text-xl">🐷</span>;
    }
    if (itemName.includes('chicken') || itemName.includes('galinha')) {
      return <span className="text-xl">🐔</span>;
    }
    if (itemName.includes('sheep') || itemName.includes('ovelha')) {
      return <span className="text-xl">🐑</span>;
    }
    if (itemName.includes('donkey') || itemName.includes('burro')) {
      return <span className="text-xl">🐴</span>;
    }
    if (itemName.includes('trigo') || itemName.includes('wheat')) {
      return <span className="text-xl">🌾</span>;
    }
    if (itemName.includes('milho') || itemName.includes('corn')) {
      return <span className="text-xl">🌽</span>;
    }
    if (itemName.includes('semente') || itemName.includes('seed')) {
      return <span className="text-xl">🌱</span>;
    }
    if (itemName.includes('wood') || itemName.includes('madeira')) {
      return <span className="text-xl">🪵</span>;
    }
    if (itemName.includes('caixa') || itemName.includes('box')) {
      return <span className="text-xl">📦</span>;
    }
    if (itemName.includes('ferro') || itemName.includes('iron')) {
      return <span className="text-xl">⚙️</span>;
    }
    if (itemName.includes('carvao') || itemName.includes('coal')) {
      return <span className="text-xl">⚫</span>;
    }
    if (itemName.includes('cascalho')) {
      return <span className="text-xl">🪨</span>;
    }
    
    // Generic fallback
    return isDeposit ? <Plus className="text-green-500" size={20} /> : <Minus className="text-red-500" size={20} />;
  }

  return isDeposit ? <Plus className="text-green-500" size={20} /> : <Minus className="text-red-500" size={20} />;
};

// Global singleton to ensure only ONE polling instance exists
let globalSafetyInterval: NodeJS.Timeout | null = null;
let globalPollingActive = false;

let componentInstanceCount = 0;

import { FirmConfig } from '@/types/firms';

interface FazendaBWProps {
  firm?: FirmConfig;
}

export default function FazendaBW({ firm }: FazendaBWProps = {}) {
  componentInstanceCount++;
  
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest');
  const [activityLimit, setActivityLimit] = useState(50);
  const [expandedSections, setExpandedSections] = useState({
    itemActivity: true,
    moneyActivity: true
  });

  // Fetch localization data from backend
  const [itemTranslations, setItemTranslations] = useState<Record<string, string>>({});
  
  // Add data management states like Webbased system
  const [usuarios, setUsuarios] = useState<any>({ usuarios: {}, funcoes: { gerente: [], trabalhador: [] } });
  const [inventario, setInventario] = useState<any>({ itens: {}, historico_transacoes: [], total_itens: 0, total_quantidade: 0 });
  const [pagamentos, setPagamentos] = useState<any>({ usuarios: {} });
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [deletedUserTimestamps, setDeletedUserTimestamps] = useState<Record<string, string>>({});
  const [localStorageLoaded, setLocalStorageLoaded] = useState(false);
  
  // Navigation state
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'usuarios' | 'inventario' | 'pagamentos' | 'analytics'>('dashboard');

  // Load translations on component mount
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch('http://localhost:3050/api/localization/translations');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.custom_overrides) {
            setItemTranslations(data.data.custom_overrides);
          }
        }
      } catch (error) {
        console.debug('Localization service not available:', error);
      }
    };
    
    loadTranslations();
  }, []);

  // Get best display name using the same logic as the original Webbased system
  const getBestDisplayName = (itemId?: string): string => {
    if (!itemId) return 'Item';
    
    // 1. Try custom translation first (highest priority)
    const customTranslation = itemTranslations[itemId] || itemTranslations[itemId.toLowerCase()];
    if (customTranslation && customTranslation.trim() !== '') {
      return customTranslation;
    }

    // 2. Try variations
    const variations = [
      itemId.replace(/_/g, ' '),
      itemId.replace(/_/g, ' ').toLowerCase()
    ];
    
    for (const variation of variations) {
      const translation = itemTranslations[variation];
      if (translation && translation.trim() !== '') {
        return translation;
      }
    }

    // 3. Fallback to normalized formatting
    return itemId
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Data Management Functions (like Webbased DataManager)
  const adicionarUsuario = (id: string, userData: any, messageTimestamp?: string): boolean => {
    try {
      console.log(`👤 AUTO-ADD ATTEMPT: ${id} from message at ${messageTimestamp || 'now'}`);
      console.log(`🗑️ Current deleted timestamps:`, deletedUserTimestamps);
      console.log(`🔍 Checking if ${id} is in deleted timestamps:`, deletedUserTimestamps[id]);
      
      // Check if user was deleted and if this message is newer than deletion
      if (deletedUserTimestamps[id]) {
        const deletionTime = new Date(deletedUserTimestamps[id]).getTime();
        const messageTime = messageTimestamp ? new Date(messageTimestamp).getTime() : Date.now();
        
        console.log(`🗑️ User ${id} was deleted at: ${deletedUserTimestamps[id]}`);
        console.log(`📨 Message timestamp: ${messageTimestamp || 'now'}`);
        console.log(`⏰ Deletion time: ${deletionTime}, Message time: ${messageTime}`);
        
        if (messageTime <= deletionTime) {
          console.log(`❌ BLOCKED: Message is older than deletion for ${id}`);
          return false; // Message is older than deletion, don't re-add
        }
        
        console.log(`✅ ALLOWING: Message is newer than deletion for ${id}`);
        // Message is newer than deletion, remove from deleted list and save
        const newDeletedTimestamps = { ...deletedUserTimestamps };
        delete newDeletedTimestamps[id];
        setDeletedUserTimestamps(newDeletedTimestamps);
        
        // Save to localStorage immediately
        const firmId = firm?.id || 'fazenda-bw';
        if (firmId === 'fazenda-bw') {
          localStorage.setItem('fazenda_deleted_user_timestamps', JSON.stringify(newDeletedTimestamps));
        } else {
          localStorage.setItem(`${firmId}_deleted_user_timestamps`, JSON.stringify(newDeletedTimestamps));
        }
      }
      
      if (usuarios.usuarios[id]) {
        console.log(`❌ User ${id} already exists, not adding`);
        return false; // User already exists
      }
      

      const newUserData = {
        nome: userData.nome || userData.author || id,
        funcao: userData.funcao || 'trabalhador',
        criado_em: new Date().toISOString(),
        ativo: true,
        ...userData
      };

      console.log(`✅ ADDING USER: ${id} (${newUserData.nome})`);

      setUsuarios((prevUsuarios: any) => {
        const newUsuarios = {
          ...prevUsuarios,
          usuarios: {
            ...prevUsuarios.usuarios,
            [id]: newUserData
          },
          funcoes: {
            ...prevUsuarios.funcoes,
            [newUserData.funcao]: [...(prevUsuarios.funcoes[newUserData.funcao] || []), id].filter((v, i, a) => a.indexOf(v) === i)
          }
        };
        
        // Save to localStorage as backup
        const firmId = firm?.id || 'fazenda-bw';
        // For Fazenda BW, keep using old keys for backward compatibility
        if (firmId === 'fazenda-bw') {
          localStorage.setItem('fazenda_usuarios', JSON.stringify(newUsuarios));
        } else {
          localStorage.setItem(`${firmId}_usuarios`, JSON.stringify(newUsuarios));
        }
        return newUsuarios;
      });
      return true;
    } catch (error) {
      console.error('Error adding user:', error);
      return false;
    }
  };

  const adicionarItem = (nomeItem: string, quantidade: number, autor: string = 'Sistema'): boolean => {
    try {
      if (!nomeItem || quantidade <= 0) {
        return false;
      }

      const itemId = nomeItem.toLowerCase().replace(/\s+/g, '_');
      
      const newInventario = { ...inventario };
      
      // Create item if doesn't exist
      if (!newInventario.itens[itemId]) {
        newInventario.itens[itemId] = {
          nome: nomeItem,
          quantidade: 0,
          criado_em: new Date().toISOString()
        };
      }

      const quantidadeAnterior = newInventario.itens[itemId].quantidade;
      newInventario.itens[itemId].quantidade += quantidade;
      newInventario.itens[itemId].ultima_atualizacao = new Date().toISOString();

      // Add to transaction history
      newInventario.historico_transacoes.push({
        id: crypto.randomUUID(),
        tipo: 'adicionar',
        item: itemId,
        nome_item: nomeItem,
        quantidade: quantidade,
        autor: autor,
        timestamp: new Date().toISOString(),
        quantidade_anterior: quantidadeAnterior,
        quantidade_posterior: newInventario.itens[itemId].quantidade
      });

      // Update metadata
      newInventario.ultima_atualizacao = new Date().toISOString();
      newInventario.total_itens = Object.keys(newInventario.itens).length;
      newInventario.total_quantidade = Object.values(newInventario.itens)
        .reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0);

      setInventario(newInventario);
      
      // Save to localStorage as backup
      const firmId = firm?.id || 'fazenda-bw';
      // For Fazenda BW, keep using old keys for backward compatibility
      if (firmId === 'fazenda-bw') {
        localStorage.setItem('fazenda_inventario', JSON.stringify(newInventario));
      } else {
        localStorage.setItem(`${firmId}_inventario`, JSON.stringify(newInventario));
      }
      return true;
    } catch (error) {
      console.error('Error adding item:', error);
      return false;
    }
  };

  const removerItem = (nomeItem: string, quantidade: number, autor: string = 'Sistema'): boolean => {
    try {
      if (!nomeItem || quantidade <= 0) {
        return false;
      }

      const itemId = nomeItem.toLowerCase().replace(/\s+/g, '_');
      const newInventario = { ...inventario };
      
      if (!newInventario.itens[itemId]) {
        return false; // Item doesn't exist
      }

      const quantidadeAnterior = newInventario.itens[itemId].quantidade;
      newInventario.itens[itemId].quantidade = Math.max(0, newInventario.itens[itemId].quantidade - quantidade);
      newInventario.itens[itemId].ultima_atualizacao = new Date().toISOString();

      // Add to transaction history
      newInventario.historico_transacoes.push({
        id: crypto.randomUUID(),
        tipo: 'remover',
        item: itemId,
        nome_item: nomeItem,
        quantidade: quantidade,
        autor: autor,
        timestamp: new Date().toISOString(),
        quantidade_anterior: quantidadeAnterior,
        quantidade_posterior: newInventario.itens[itemId].quantidade
      });

      // Update metadata
      newInventario.ultima_atualizacao = new Date().toISOString();
      newInventario.total_quantidade = Object.values(newInventario.itens)
        .reduce((sum: number, item: any) => sum + (item.quantidade || 0), 0);

      setInventario(newInventario);
      
      // Save to localStorage as backup
      const firmId = firm?.id || 'fazenda-bw';
      // For Fazenda BW, keep using old keys for backward compatibility
      if (firmId === 'fazenda-bw') {
        localStorage.setItem('fazenda_inventario', JSON.stringify(newInventario));
      } else {
        localStorage.setItem(`${firmId}_inventario`, JSON.stringify(newInventario));
      }
      return true;
    } catch (error) {
      console.error('Error removing item:', error);
      return false;
    }
  };

  // Load saved data from localStorage on component mount  
  useEffect(() => {
    console.log('🔄 PAGE REFRESH - Loading data from localStorage');
    try {
      const firmId = firm?.id || 'fazenda-bw';
      console.log('📂 Loading data for firm:', firmId);
      
      // Fazenda BW uses old keys for backward compatibility
      // Other firms use firm-specific keys
      if (firmId === 'fazenda-bw') {
        const savedUsuarios = localStorage.getItem('fazenda_usuarios');
        if (savedUsuarios) {
          const parsedUsuarios = JSON.parse(savedUsuarios);
          console.log('📂 Loaded users from localStorage:', Object.keys(parsedUsuarios.usuarios));
          setUsuarios(parsedUsuarios);
        } else {
          console.log('📂 No saved users found in localStorage');
        }

        const savedInventario = localStorage.getItem('fazenda_inventario');
        if (savedInventario) {
          setInventario(JSON.parse(savedInventario));
        }

        const savedPagamentos = localStorage.getItem('fazenda_pagamentos');
        if (savedPagamentos) {
          setPagamentos(JSON.parse(savedPagamentos));
        }

        const savedDeletedTimestamps = localStorage.getItem('fazenda_deleted_user_timestamps');
        if (savedDeletedTimestamps) {
          const parsedTimestamps = JSON.parse(savedDeletedTimestamps);
          console.log('🗑️ Loaded deleted user timestamps:', parsedTimestamps);
          setDeletedUserTimestamps(parsedTimestamps);
        } else {
          console.log('🗑️ No deleted user timestamps found');
        }
        
      } else {
        // Other firms use firm-specific keys
        const savedUsuarios = localStorage.getItem(`${firmId}_usuarios`);
        if (savedUsuarios) {
          setUsuarios(JSON.parse(savedUsuarios));
        }

        const savedInventario = localStorage.getItem(`${firmId}_inventario`);
        if (savedInventario) {
          setInventario(JSON.parse(savedInventario));
        }

        const savedPagamentos = localStorage.getItem(`${firmId}_pagamentos`);
        if (savedPagamentos) {
          setPagamentos(JSON.parse(savedPagamentos));
        }

        const savedDeletedTimestamps = localStorage.getItem(`${firmId}_deleted_user_timestamps`);
        if (savedDeletedTimestamps) {
          setDeletedUserTimestamps(JSON.parse(savedDeletedTimestamps));
        }
        
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    
    console.log('✅ localStorage loading complete');
    setLocalStorageLoaded(true);
  }, [firm?.id]);

  useEffect(() => {
    // Don't process data until localStorage is loaded
    if (!localStorageLoaded) {
      console.log('⏳ Waiting for localStorage to load before processing data...');
      return;
    }
    
    console.log('🚀 localStorage loaded, starting data processing...');
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);

    // Listen for extension data via custom events
    const handleExtensionData = (event: CustomEvent) => {
      const extensionMessages = event.detail || [];
      
      // Filter messages by firm's channelId
      const channelId = firm?.channelId || '1409214475403526174';
      const filteredMessages = extensionMessages.filter((msg: any) => 
        !msg.channelId || msg.channelId === channelId
      );
      
      // Extension messages should already be parsed by backend, but ensure they have required fields
      const processedActivities: Activity[] = filteredMessages.map((msg: any) => {
        // If message is already parsed with our new fields, use it directly
        if (msg.parseSuccess !== undefined) {
          return msg as Activity;
        }
        
        // Fallback for unparsed messages - this shouldn't happen if backend is using the parser
        return {
          id: msg.id,
          timestamp: msg.timestamp || new Date().toISOString(),
          autor: msg.autor || msg.author || 'Sistema',
          content: msg.content || '',
          tipo: msg.tipo,
          categoria: msg.categoria || 'sistema',
          item: msg.item,
          quantidade: msg.quantidade,
          valor: msg.valor,
          descricao: msg.descricao,
          parseSuccess: msg.parseSuccess || false,
          displayText: msg.displayText || msg.content,
          confidence: msg.confidence || 'none'
        };
      });

      // AUTO-PROCESS USERS AND ITEMS (like Webbased system)
      processedActivities.forEach(activity => {
        // Skip already processed messages
        if (processedMessageIds.has(activity.id)) {
          return;
        }

        // Auto-add users when they appear in activities (with timestamp check)
        if (activity.autor && activity.autor !== 'Sistema') {
          const added = adicionarUsuario(activity.autor, {
            nome: activity.autor,
            author: activity.autor,
            funcao: 'trabalhador'
          }, activity.timestamp);
        }

        // Auto-process inventory items
        if (activity.parseSuccess && activity.item && activity.quantidade) {
          if (activity.tipo === 'adicionar') {
            adicionarItem(activity.item, activity.quantidade, activity.autor || 'Sistema');
          } else if (activity.tipo === 'remover') {
            removerItem(activity.item, activity.quantidade, activity.autor || 'Sistema');
          }
        }

        // Mark message as processed
        setProcessedMessageIds(prev => new Set(Array.from(prev).concat(activity.id)));
      });

      setRecentActivity(processedActivities);
    };

    // Set up listener for extension data
    window.addEventListener('extensionData', handleExtensionData as EventListener);

    // Check frontend webhook for data
    const checkFrontendData = async () => {
      try {
        const response = await fetch('/api/webhook/channel-messages', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Process frontend messages if available
          if (data.success && data.messages && Array.isArray(data.messages)) {
            // Filter messages by firm's channelId if firm is provided
            const channelId = firm?.channelId || '1409214475403526174'; // Default to Fazenda BW channel
            const filteredMessages = data.messages.filter((msg: any) => 
              msg.channelId === channelId
            );
            
            if (filteredMessages.length > 0) {
            } else {
            }
            
            // Frontend messages should be parsed by backend, ensure proper structure
            const processedActivities: Activity[] = filteredMessages.map((msg: any) => {
              // Check if already parsed
              if (msg.parseSuccess !== undefined) {
                return msg as Activity;
              }
              
              // Fallback structure for consistency
              return {
                id: msg.id,
                timestamp: msg.timestamp || new Date().toISOString(),
                autor: msg.autor || msg.author || 'Sistema',
                content: msg.content || '',
                tipo: msg.tipo,
                categoria: msg.categoria || 'sistema',
                item: msg.item,
                quantidade: msg.quantidade,
                valor: msg.valor,
                descricao: msg.descricao,
                parseSuccess: msg.parseSuccess || false,
                displayText: msg.displayText || msg.content,
                confidence: msg.confidence || 'none'
              };
            });

            // AUTO-PROCESS USERS AND ITEMS from frontend data (like Webbased system)  
            if (!initialLoadComplete) {
              
              // Get unique authors to debug
              const uniqueAuthors = [...new Set(processedActivities.map(a => a.autor).filter(a => a && a !== 'Sistema'))];
            }
            processedActivities.forEach(activity => {
              // Skip already processed messages ONLY if initial load is complete
              if (initialLoadComplete && processedMessageIds.has(activity.id)) {
                return;
              }

              // Auto-add users when they appear in activities (with timestamp check)
              if (activity.autor && activity.autor !== 'Sistema') {
                const added = adicionarUsuario(activity.autor, {
                  nome: activity.autor,
                  author: activity.autor,
                  funcao: 'trabalhador'
                }, activity.timestamp);
              }

              // Auto-process inventory items
              if (activity.parseSuccess && activity.item && activity.quantidade) {
                if (activity.tipo === 'adicionar') {
                  adicionarItem(activity.item, activity.quantidade, activity.autor || 'Sistema');
                } else if (activity.tipo === 'remover') {
                  removerItem(activity.item, activity.quantidade, activity.autor || 'Sistema');
                }
              }

              // Mark message as processed
              setProcessedMessageIds(prev => new Set(Array.from(prev).concat(activity.id)));
            });

            // Replace with all activities from file (this ensures we show everything)
            const uniqueActivities = processedActivities.reduce((acc, current) => {
              const exists = acc.find(item => item.id === current.id);
              if (!exists) {
                acc.push(current);
              }
              return acc;
            }, [] as any[]);
            
            setRecentActivity(uniqueActivities.slice(-1000)); // Keep last 1000
            
            // Mark initial load as complete after first processing
            if (!initialLoadComplete) {
              setInitialLoadComplete(true);
            }
          }
        }
      } catch (error) {
        console.debug('Frontend webhook not available:', error);
      }
    };

    // Prevent multiple polling instances in development mode
    if (globalPollingActive) {
      console.warn('⚠️  Polling already active, skipping setup');
      return () => {};
    }
    
    globalPollingActive = true;

    // Skip initial data load - only load from localStorage to prevent re-adding deleted users
    // checkFrontendData();
    
    // Smart polling: check for updates only when data has actually changed
    let lastKnownUpdate: string | null = null;
    
    // Event listener for immediate push notifications from browser extension
    const handleDataUpdate = () => {
      checkFrontendData();
    };
    
    // Listen for custom events from the browser extension
    window.addEventListener('newDiscordMessage', handleDataUpdate);
    
    
    // Also listen for the notification file updates (fallback)
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/last-update.json');
        if (response.ok) {
          const updateInfo = await response.json();
          if (lastKnownUpdate !== updateInfo.lastUpdate) {
            lastKnownUpdate = updateInfo.lastUpdate;
            checkFrontendData();
          } else {
          }
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };
    
    // Initialize with current time to establish baseline
    checkForUpdates();
    
    // Check for updates every 5 seconds (real-time fallback when extension is inactive)
    const realtimeChecker = setInterval(checkForUpdates, 5000);
    
    // Set up SINGLE global safety interval (prevents React Strict Mode duplicates)
    if (!globalSafetyInterval) {
      globalSafetyInterval = setInterval(checkFrontendData, 60 * 60 * 1000); // Every 60 minutes ONLY
    } else {
    }

    return () => {
      globalPollingActive = false;
      window.removeEventListener('extensionData', handleExtensionData as EventListener);
      window.removeEventListener('newDiscordMessage', handleDataUpdate);
      clearInterval(realtimeChecker);
      
      // Only clear the global interval if this is the last component instance
      if (globalSafetyInterval && componentInstanceCount <= 1) {
        clearInterval(globalSafetyInterval);
        globalSafetyInterval = null;
      }
    };
  }, [localStorageLoaded, deletedUserTimestamps]);

  // Get current bank balance from latest transaction messages
  const getCurrentBankBalance = (): number => {
    // Look for latest transaction with "Saldo após" information
    const financialActivities = recentActivity
      .filter(activity => activity.categoria === 'financeiro' && activity.content)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    for (const activity of financialActivities) {
      // Check for "Saldo após depósito:" or "Saldo após saque:"
      const balanceMatch = activity.content?.match(/Saldo após (?:depósito|saque):\s*\$([0-9,.]+)/);
      if (balanceMatch) {
        const balance = parseFloat(balanceMatch[1].replace(',', ''));
        if (!isNaN(balance)) {
          return balance;
        }
      }
    }
    
    return 0; // Default if no balance found
  };

  const getSortedActivity = (): Activity[] => {
    const sorted = [...recentActivity];
    switch (sortOrder) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      case 'largest':
        return sorted.sort((a, b) => (b.quantidade || 0) - (a.quantidade || 0));
      case 'user':
        return sorted.sort((a, b) => (a.autor || '').localeCompare(b.autor || ''));
      default:
        return sorted;
    }
  };

  // Filter activities by type
  const getItemActivities = (): Activity[] => {
    const sorted = getSortedActivity();
    const filtered = sorted.filter(activity => 
      activity.categoria === 'inventario' || 
      (activity.tipo && ['adicionar', 'remover'].includes(activity.tipo))
    ).slice(0, activityLimit);
    
    
    return filtered;
  };

  const getMoneyActivities = (): Activity[] => {
    const sorted = getSortedActivity();
    const filtered = sorted.filter(activity => {
      return activity.categoria === 'financeiro' || 
             (activity.tipo && ['deposito', 'saque', 'venda'].includes(activity.tipo)) ||
             (activity.valor !== undefined && activity.valor !== null);
    }).slice(0, activityLimit);
    
    
    return filtered;
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleUpdateUsuarios = (newUsuarios: any) => {
    console.log('🗑️ DELETE BUTTON PRESSED - handleUpdateUsuarios called');
    console.log('📊 Old users:', Object.keys(usuarios.usuarios));
    console.log('📊 New users:', Object.keys(newUsuarios.usuarios));
    
    // Track deleted users to clean up their data
    const oldUserIds = new Set(Object.keys(usuarios.usuarios));
    const newUserIds = new Set(Object.keys(newUsuarios.usuarios));
    
    // Find deleted users and clean up their data completely
    const deletedUserIds = Array.from(oldUserIds).filter(userId => !newUserIds.has(userId));
    console.log('🗑️ Users being deleted:', deletedUserIds);
    
    if (deletedUserIds.length > 0) {
      // Record deletion timestamp for each deleted user
      const currentTimestamp = new Date().toISOString();
      console.log('⏰ Recording deletion timestamp:', currentTimestamp);
      const newDeletedTimestamps = { ...deletedUserTimestamps };
      deletedUserIds.forEach(userId => {
        newDeletedTimestamps[userId] = currentTimestamp;
        console.log(`🕒 User ID "${userId}" deleted at:`, currentTimestamp);
        console.log(`🔍 User ID length: ${userId.length}, first char: "${userId[0]}", last char: "${userId[userId.length-1]}"`);
      });
      setDeletedUserTimestamps(newDeletedTimestamps);
      console.log('💾 Updated deleted timestamps:', newDeletedTimestamps);
      
      // Clean up inventory transactions - do this synchronously
      const cleanedInventario = {
        ...inventario,
        historico_transacoes: inventario.historico_transacoes.filter(
          (transaction: any) => !deletedUserIds.includes(transaction.autor)
        )
      };
      
      // Clean up payments - do this synchronously  
      const cleanedPagamentos = {
        ...pagamentos,
        usuarios: Object.fromEntries(
          Object.entries(pagamentos.usuarios).filter(([id]) => !deletedUserIds.includes(id))
        )
      };
      
      // Update all states and save to localStorage immediately
      setInventario(cleanedInventario);
      setPagamentos(cleanedPagamentos);
      setUsuarios(newUsuarios);
      
      // Save everything to localStorage immediately
      const firmId = firm?.id || 'fazenda-bw';
      console.log('💾 Saving to localStorage for firm:', firmId);
      if (firmId === 'fazenda-bw') {
        localStorage.setItem('fazenda_usuarios', JSON.stringify(newUsuarios));
        localStorage.setItem('fazenda_inventario', JSON.stringify(cleanedInventario));
        localStorage.setItem('fazenda_pagamentos', JSON.stringify(cleanedPagamentos));
        localStorage.setItem('fazenda_deleted_user_timestamps', JSON.stringify(newDeletedTimestamps));
        console.log('✅ Saved to fazenda_* localStorage keys');
      } else {
        localStorage.setItem(`${firmId}_usuarios`, JSON.stringify(newUsuarios));
        localStorage.setItem(`${firmId}_inventario`, JSON.stringify(cleanedInventario));
        localStorage.setItem(`${firmId}_pagamentos`, JSON.stringify(cleanedPagamentos));
        localStorage.setItem(`${firmId}_deleted_user_timestamps`, JSON.stringify(newDeletedTimestamps));
        console.log(`✅ Saved to ${firmId}_* localStorage keys`);
      }
      
    } else {
      // No users deleted, just update users normally
      setUsuarios(newUsuarios);
      
      const firmId = firm?.id || 'fazenda-bw';
      if (firmId === 'fazenda-bw') {
        localStorage.setItem('fazenda_usuarios', JSON.stringify(newUsuarios));
      } else {
        localStorage.setItem(`${firmId}_usuarios`, JSON.stringify(newUsuarios));
      }
    }
  };

  const handleUpdateInventario = (newInventario: any) => {
    setInventario(newInventario);
    
    // Save to localStorage immediately
    const firmId = firm?.id || 'fazenda-bw';
    if (firmId === 'fazenda-bw') {
      localStorage.setItem('fazenda_inventario', JSON.stringify(newInventario));
    } else {
      localStorage.setItem(`${firmId}_inventario`, JSON.stringify(newInventario));
    }
  };

  const handleUpdatePagamentos = (newPagamentos: any) => {
    setPagamentos(newPagamentos);
    
    // Save to localStorage immediately
    const firmId = firm?.id || 'fazenda-bw';
    if (firmId === 'fazenda-bw') {
      localStorage.setItem('fazenda_pagamentos', JSON.stringify(newPagamentos));
    } else {
      localStorage.setItem(`${firmId}_pagamentos`, JSON.stringify(newPagamentos));
    }
  };

  const tabs = [
    { id: 'dashboard', name: '🏠 Dashboard', icon: Activity },
    { id: 'usuarios', name: '👥 Usuários', icon: Users },
    { id: 'inventario', name: '📦 Inventário', icon: Package },
    { id: 'pagamentos', name: '💰 Pagamentos', icon: DollarSign },
    { id: 'analytics', name: '📊 Analytics', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🏛️ {firm?.name || 'Fazenda BW'} - Sistema Completo</h1>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-sm ${
            recentActivity.length > 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {recentActivity.length > 0 ? '✅ Conectado' : '⏳ Aguardando'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    currentTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="p-6">
          {currentTab === 'dashboard' && (
            <div className="space-y-6">{renderDashboard()}</div>
          )}
          
          {currentTab === 'usuarios' && (
            <TrabalhadoresBWManagement 
              usuarios={usuarios} 
              onUpdateUsuarios={handleUpdateUsuarios}
              recentActivity={recentActivity}
              itemTranslations={itemTranslations}
              getBestDisplayName={getBestDisplayName}
            />
          )}
          
          {currentTab === 'inventario' && (
            <EstoqueBWManagement 
              inventario={inventario} 
              onUpdateInventario={handleUpdateInventario} 
            />
          )}
          
          {currentTab === 'pagamentos' && (
            <PagamentosBWManagement 
              pagamentos={pagamentos} 
              usuarios={usuarios}
              onUpdatePagamentos={handleUpdatePagamentos} 
            />
          )}
          
          {currentTab === 'analytics' && (
            <AnalyticsBWManagement 
              recentActivity={recentActivity}
              usuarios={usuarios}
              inventario={inventario}
              pagamentos={pagamentos}
            />
          )}
        </div>
      </div>
    </div>
  );

  function renderDashboard() {
    return (
      <>
        <h2 className="text-xl font-semibold text-gray-900">📊 Dashboard Principal</h2>

        {/* Monitoring Mode Toggle */}
        <div className="mb-6">
          <MonitoringModeToggle firm={firm} />
        </div>

      {/* Metrics Cards - Enhanced like Webbased system */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Usuários Registrados"
          value={Object.keys(usuarios.usuarios).length}
          icon={<Users size={24} />}
          color="blue"
          loading={loading}
          subtitle={`${usuarios.funcoes?.trabalhador?.length || 0} trabalhadores, ${usuarios.funcoes?.gerente?.length || 0} gerentes`}
        />
        
        <MetricCard
          title="Itens no Inventário"
          value={inventario.total_itens || Object.keys(inventario.itens).length}
          icon={<Package size={24} />}
          color="green"
          loading={loading}
          subtitle={`${inventario.total_quantidade || 0} total em estoque`}
        />
        
        <MetricCard
          title="Atividades Capturadas"
          value={recentActivity.length}
          icon={<Activity size={24} />}
          color="purple"
          loading={loading}
          subtitle={`${getItemActivities().length} itens, ${getMoneyActivities().length} financeiras`}
        />
        
        <MetricCard
          title="Transações no Histórico"
          value={inventario.historico_transacoes?.length || 0}
          icon={<DollarSign size={24} />}
          color="yellow"
          loading={loading}
          subtitle="Histórico de movimentações"
        />

        <MetricCard
          title="Saldo do Banco"
          value={`$${getCurrentBankBalance().toFixed(2)}`}
          icon={<Archive size={24} />}
          color="green"
          loading={loading}
          subtitle="Último saldo registrado"
        />
      </div>

      {/* Sort Control */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">📊 Controles:</h2>
          
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">⬇️ Mais Recente</option>
            <option value="oldest">⬆️ Mais Antigo</option>
            <option value="largest">📈 Maior Quantidade</option>
            <option value="user">👤 Por Usuário</option>
          </select>

          <select 
            value={activityLimit} 
            onChange={(e) => setActivityLimit(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={25}>25 atividades</option>
            <option value={50}>50 atividades</option>
            <option value={100}>100 atividades</option>
          </select>
        </div>
      </div>

      {/* Extension Status */}
      <div className={`rounded-lg p-4 ${recentActivity.length > 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            🔗 Status da Extensão: {recentActivity.length > 0 ? 'Conectado' : 'Aguardando dados...'}
          </h2>
          {recentActivity.length > 0 && (
            <span className="px-2 py-1 bg-green-500 text-white text-sm rounded">
              {recentActivity.length} mensagens processadas
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {recentActivity.length > 0 
            ? 'Recebendo dados da extensão do Discord em tempo real'
            : 'Instale a extensão e navegue para o canal do Discord para começar'}
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item Activities */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              📦 Atividades de Itens ({getItemActivities().length})
            </h3>
            <button 
              onClick={() => toggleSection('itemActivity')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {expandedSections.itemActivity ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
          
          {expandedSections.itemActivity && (
            <div className="p-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : getItemActivities().length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma atividade de itens capturada</p>
              ) : (
                <div className="space-y-2">
                  {getItemActivities().map((transaction, index) => {
                    const icon = getActivityIcon(transaction);
                    
                    // Add confidence indicator based on parse quality
                    const confidenceBadge = transaction.confidence === 'high' ? '✓' : 
                                           transaction.confidence === 'medium' ? '?' : 
                                           transaction.confidence === 'low' ? '⚠' : '';
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                        <div className="flex-shrink-0">{icon}</div>
                        <div className="flex-1 min-w-0">
                          {transaction.parseSuccess && transaction.tipo && transaction.item && transaction.quantidade ? (
                            // Successfully parsed message - show structured data
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">
                                {transaction.autor || 'Sistema'}
                              </span>
                              <span className="text-gray-600">
                                {transaction.tipo === 'adicionar' ? 'adicionou' : 'removeu'}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                transaction.tipo === 'adicionar' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.quantidade}x
                              </span>
                              <span className="font-medium text-gray-900">
                                {getBestDisplayName(transaction.item)}
                              </span>
                              {confidenceBadge && (
                                <span className="text-xs text-gray-400" title={`Confiança: ${transaction.confidence}`}>
                                  {confidenceBadge}
                                </span>
                              )}
                            </div>
                          ) : (
                            // Fallback display using displayText or cleaned content
                            <div className="text-sm text-gray-700 leading-relaxed">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {transaction.autor || 'Sistema'}
                                </span>
                                {!transaction.parseSuccess && (
                                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                    Não processado
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-gray-600">
                                {transaction.displayText || transaction.content.substring(0, 150) + 
                                  (transaction.content.length > 150 ? '...' : '')}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Money Activities */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              💰 Atividades de Dinheiro ({getMoneyActivities().length})
            </h3>
            <button 
              onClick={() => toggleSection('moneyActivity')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {expandedSections.moneyActivity ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
          
          {expandedSections.moneyActivity && (
            <div className="p-4 max-h-96 overflow-y-auto">
              {getMoneyActivities().length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma atividade financeira capturada</p>
              ) : (
                <div className="space-y-2">
                  {getMoneyActivities().map((transaction, index) => {
                    const icon = getActivityIcon(transaction);
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                        <div className="flex-shrink-0">{icon}</div>
                        <div className="flex-1 min-w-0">
                          {transaction.parseSuccess && transaction.tipo && transaction.valor ? (
                            // Successfully parsed financial message
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">
                                {transaction.autor || 'Sistema'}
                              </span>
                              {transaction.descricao && transaction.descricao !== 'Depósito direto' && transaction.tipo !== 'saque' ? (
                                // For sales/actions with description
                                <>
                                  <span className="text-gray-600">
                                    {transaction.descricao}
                                  </span>
                                  <span className="text-gray-600">por</span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    transaction.tipo === 'deposito' || transaction.tipo === 'venda'
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    ${typeof transaction.valor === 'number' ? transaction.valor.toFixed(2) : '0.00'}
                                  </span>
                                </>
                              ) : (
                                // For simple deposits/withdrawals
                                <>
                                  <span className="text-gray-600">
                                    {transaction.tipo === 'deposito' ? 'depositou' : 
                                     transaction.tipo === 'saque' ? 'sacou' :
                                     'transação'}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    transaction.tipo === 'deposito' || transaction.tipo === 'venda'
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    ${typeof transaction.valor === 'number' ? transaction.valor.toFixed(2) : '0.00'}
                                  </span>
                                </>
                              )}
                              {transaction.confidence && transaction.confidence !== 'high' && (
                                <span className="text-xs text-gray-400" title={`Confiança: ${transaction.confidence}`}>
                                  {transaction.confidence === 'medium' ? '?' : '⚠'}
                                </span>
                              )}
                            </div>
                          ) : (
                            // Fallback display for unparsed financial messages
                            <div className="text-sm text-gray-700 leading-relaxed">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {transaction.autor || 'Sistema'}
                                </span>
                                {!transaction.parseSuccess && (
                                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                    Não processado
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-gray-600">
                                {transaction.displayText || transaction.content.substring(0, 150) + 
                                  (transaction.content.length > 150 ? '...' : '')}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            📅 {new Date(transaction.timestamp).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </>
    );
  }
}