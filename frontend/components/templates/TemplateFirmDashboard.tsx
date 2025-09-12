'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Package, DollarSign, Plus, Minus, Users, Activity, Settings, BarChart3, Archive, Edit, Trash2, X } from 'lucide-react';
import { FirmConfig } from '@/types/firms';
import { FirmTemplateConfig } from '@/types/firmTemplates';

interface Activity {
  id: string;
  timestamp: string;
  autor: string;
  content: string;
  tipo?: 'adicionar' | 'remover' | 'deposito' | 'saque' | 'venda' | 'compra';
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

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
  subtitle?: string;
}

interface TemplateFirmDashboardProps {
  firm: FirmConfig;
  template: FirmTemplateConfig;
}

interface ActivityManagementModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (activityId: string, newItemName: string) => Promise<boolean>;
  onDelete: (activityId: string) => Promise<boolean>;
  getBestDisplayName: (itemId: string) => string;
}

const ActivityManagementModal: React.FC<ActivityManagementModalProps> = ({
  activity,
  isOpen,
  onClose,
  onSave,
  onDelete,
  getBestDisplayName
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activity) {
      setNewItemName(activity.item || '');
    }
  }, [activity]);

  const handleSave = async () => {
    if (!activity || !newItemName.trim()) return;
    
    setSaving(true);
    try {
      const success = await onSave(activity.id, newItemName.trim());
      if (success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activity) return;
    
    if (!confirm(`Tem certeza que deseja deletar esta atividade?\n\n"${activity.autor} - ${activity.item}"\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const success = await onDelete(activity.id);
      if (success) {
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !activity) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">🔧 Gerenciar Atividade</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Autor:</strong> {activity.autor}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Tipo:</strong> {activity.tipo === 'adicionar' ? 'Adicionou' : 'Removeu'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Data:</strong> {new Date(activity.timestamp).toLocaleString('pt-BR')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Item
            </label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o novo nome do item"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nome atual: {getBestDisplayName(activity.item || '')}
            </p>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <Trash2 size={16} />
              Deletar
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={saving || deleting}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || deleting || !newItemName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <Edit size={16} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
        <div className="text-white/80 flex items-center justify-center w-12 h-12">{icon}</div>
      </div>
    </div>
  );
};

export default function TemplateFirmDashboard({ firm, template }: TemplateFirmDashboardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  
  // Activity management modal state
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  // Translation state
  const [itemTranslations, setItemTranslations] = useState<Record<string, string>>({});
  const [persistentInventoryOverrides, setPersistentInventoryOverrides] = useState<Record<string, string>>({});
  const [customizations, setCustomizations] = useState<Record<string, string>>({});
  
  // Calculated metrics
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [activeWorkers, setActiveWorkers] = useState(new Set<string>());
  const [bankBalance, setBankBalance] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);

  // Load customizations and translations - customizations have highest priority
  const loadCustomizationsAndTranslations = async () => {
    try {
      console.log('🔄 Loading customizations and translations...');
      
      // 1. HIGHEST PRIORITY: Load custom_display_names.json
      const customizationsResponse = await fetch('/api/customizations', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (customizationsResponse.ok) {
        const customizationsData = await customizationsResponse.json();
        if (customizationsData.success && customizationsData.data?.display_names) {
          console.log('✅ Loaded customizations:', Object.keys(customizationsData.data.display_names).length, 'items');
          console.log('🔍 Milk_Weed customization:', customizationsData.data.display_names['Milk_Weed']);
          setCustomizations(customizationsData.data.display_names);
        }
      }

      // 2. Load global translations (lower priority)
      if (firm?.display?.itemTranslations === "global") {
        const response = await fetch('http://localhost:3050/api/localization/translations');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.custom_overrides) {
            setItemTranslations(data.data.custom_overrides);
          }
        }
      } else if (firm?.display?.itemTranslations && typeof firm.display.itemTranslations === 'object') {
        setItemTranslations(firm.display.itemTranslations);
      } else {
        const response = await fetch('http://localhost:3050/api/localization/translations');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.custom_overrides) {
            setItemTranslations(data.data.custom_overrides);
          }
        }
      }
    } catch (error) {
      console.debug('Error loading customizations/translations:', error);
    }
  };

  useEffect(() => {
    loadCustomizationsAndTranslations().then(() => {
      // Only fetch activities AFTER customizations are loaded
      fetchActivities();
    });
  }, [firm]);

  // Listen for customization updates
  useEffect(() => {
    const handleCustomizationUpdate = () => {
      console.log('🔄 Customization updated, reloading...');
      loadCustomizationsAndTranslations().then(() => {
        fetchActivities(); // Reload activities after customizations are updated
      });
    };

    window.addEventListener('customizationUpdated', handleCustomizationUpdate);
    
    return () => {
      window.removeEventListener('customizationUpdated', handleCustomizationUpdate);
    };
  }, []);

  // Get best display name - customizations have absolute highest priority
  const getBestDisplayName = (itemId?: string): string => {
    if (!itemId) return 'Item';
    
    console.log(`🔍 getBestDisplayName("${itemId}")`, {
      customizations: Object.keys(customizations).length,
      hasCustomization: customizations[itemId] || customizations[itemId.toLowerCase()],
      translations: Object.keys(itemTranslations).length,
      hasTranslation: itemTranslations[itemId] || itemTranslations[itemId.toLowerCase()]
    });
    
    // 1. ABSOLUTE HIGHEST PRIORITY: Check custom_display_names.json (corn → Milho etc)
    // This is your existing customization system that MUST take precedence
    const customization = customizations[itemId] || customizations[itemId.toLowerCase()];
    if (customization && customization.trim() !== '') {
      console.log(`✅ Using customization: ${itemId} → ${customization}`);
      return customization;
    }
    
    // 2. Check persistent inventory overrides (from frontend edits)
    const persistentOverride = persistentInventoryOverrides[itemId] || persistentInventoryOverrides[itemId.toLowerCase()];
    if (persistentOverride && persistentOverride.trim() !== '') {
      return persistentOverride;
    }
    
    // 3. Try global translation system (lowest priority)
    const globalTranslation = itemTranslations[itemId] || itemTranslations[itemId.toLowerCase()];
    if (globalTranslation && globalTranslation.trim() !== '') {
      return globalTranslation;
    }

    // 4. Try variations with customizations first
    const variations = [
      itemId.replace(/_/g, ' '),
      itemId.replace(/_/g, ' ').toLowerCase()
    ];
    
    for (const variation of variations) {
      const customVariation = customizations[variation];
      if (customVariation && customVariation.trim() !== '') {
        return customVariation;
      }
      
      const translation = itemTranslations[variation];
      if (translation && translation.trim() !== '') {
        return translation;
      }
    }

    // 5. Fallback to normalized formatting
    return itemId
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };


  // Fetch activities from the API and merge with persistent inventory data
  const fetchActivities = async () => {
    try {
      // Fetch Discord activities
      const response = await fetch(`/api/webhook/channel-messages?channelId=${firm.channelId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.messages && Array.isArray(data.messages)) {
          const firmMessages = data.messages;
          
          // Fetch persistent inventory data to apply overrides
          let inventoryOverrides = {};
          try {
            const inventoryResponse = await fetch(`/api/inventory/${firm.id}`);
            if (inventoryResponse.ok) {
              const inventoryData = await inventoryResponse.json();
              if (inventoryData.success && inventoryData.data) {
                // Create mapping of item IDs to updated names
                Object.values(inventoryData.data.items || {}).forEach((item: any) => {
                  if (item.id && item.nome) {
                    // Map item ID (e.g., "Milk_Weed") to custom name (e.g., "Asclepias")
                    inventoryOverrides[item.id] = item.nome;
                    // Also try the display name format
                    if (item.displayName && item.displayName !== item.nome) {
                      inventoryOverrides[item.displayName] = item.nome;
                    }
                  }
                });
                console.log('📊 Loaded inventory overrides:', inventoryOverrides);
                // Store in component state for getBestDisplayName to use
                setPersistentInventoryOverrides(inventoryOverrides);
              }
            }
          } catch (inventoryError) {
            console.debug('No persistent inventory data found');
          }
          
          // Apply inventory overrides to activities
          const enhancedMessages = firmMessages.map((activity: Activity) => {
            if (activity.categoria === 'inventario' && activity.item) {
              // Check if there's a persistent inventory override for this item
              const override = inventoryOverrides[activity.item] || inventoryOverrides[activity.item.toLowerCase()];
              if (override) {
                console.log(`🔄 Applying inventory override: ${activity.item} → ${override}`);
                return {
                  ...activity,
                  item: override,
                  _inventoryOverride: true // Mark as enhanced
                };
              }
            }
            return activity;
          });
          
          // Sort by timestamp (newest first)
          const sortedMessages = enhancedMessages.sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setActivities(sortedMessages);
          setTotalActivities(sortedMessages.length);
          
          // Calculate metrics from firm-specific data
          calculateMetrics(sortedMessages);
          
          const lastActivity = sortedMessages[0];
          if (lastActivity) {
            setLastUpdate(new Date(lastActivity.timestamp).toLocaleString('pt-BR'));
          }
          
          console.log(`✅ Loaded ${sortedMessages.length} activities with ${Object.keys(inventoryOverrides).length} inventory overrides applied`);
        } else {
          console.warn('Invalid API response structure:', data);
        }
      } else {
        console.error('Failed to fetch activities:', response.status);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (messages: Activity[]) => {
    let revenue = 0;
    let balance = 0;
    let inventory = 0;
    const workers = new Set<string>();

    messages.forEach((msg: Activity) => {
      // Track workers (excluding system messages)
      if (msg.autor && msg.autor !== 'Sistema' && msg.autor !== 'System') {
        workers.add(msg.autor);
      }

      // Calculate revenue (deposits and sales)
      if (msg.valor && (msg.tipo === 'deposito' || msg.tipo === 'venda' || msg.tipo === 'compra')) {
        revenue += msg.valor;
      }

      // Track bank balance (deposits minus withdrawals)
      if (msg.valor) {
        if (msg.tipo === 'deposito' || msg.tipo === 'venda' || msg.tipo === 'compra') {
          balance += msg.valor;
        } else if (msg.tipo === 'saque') {
          balance -= msg.valor;
        }
      }

      // Count inventory items
      if (msg.categoria === 'inventario' && msg.quantidade) {
        if (msg.tipo === 'adicionar') {
          inventory += msg.quantidade;
        } else if (msg.tipo === 'remover') {
          inventory -= msg.quantidade;
        }
      }
    });

    setTotalRevenue(revenue);
    setBankBalance(balance);
    setInventoryCount(Math.max(0, inventory));
    setActiveWorkers(workers);
  };

  const getActivityIcon = (transaction: Activity): React.ReactNode => {
    const isDeposit = transaction.tipo === 'adicionar' || transaction.tipo === 'deposito';
    const color = isDeposit ? 'text-green-500' : 'text-red-500';
    
    if (transaction.categoria === 'financeiro') {
      return <DollarSign className={color} size={20} />;
    }

    if (transaction.categoria === 'inventario') {
      const itemName = transaction.item?.toLowerCase() || transaction.descricao?.toLowerCase() || '';
      
      // Return emoji icons for specific items based on template config
      if (template.features.customFields?.animalManagement) {
        if (itemName.includes('cow') || itemName.includes('vaca')) return <span className="text-xl">🐄</span>;
        if (itemName.includes('pig') || itemName.includes('porco')) return <span className="text-xl">🐷</span>;
        if (itemName.includes('chicken') || itemName.includes('galinha')) return <span className="text-xl">🐔</span>;
        if (itemName.includes('sheep') || itemName.includes('ovelha')) return <span className="text-xl">🐑</span>;
      }
      
      if (template.features.customFields?.cropManagement) {
        if (itemName.includes('trigo') || itemName.includes('wheat')) return <span className="text-xl">🌾</span>;
        if (itemName.includes('milho') || itemName.includes('corn')) return <span className="text-xl">🌽</span>;
      }

      return <Package className={color} size={20} />;
    }

    return <Activity className="text-gray-500" size={20} />;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Get current bank balance from latest transaction messages (adapted for your message format)
  const getCurrentBankBalance = (): number => {
    // Look for latest transaction with "Saldo após" information
    const financialActivities = activities
      .filter(activity => activity.categoria === 'financeiro' && activity.content)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    for (const activity of financialActivities) {
      // Check for "Saldo após depósito:" or "Saldo após saque:" (handle multiline)
      const balanceMatch = activity.content?.match(/Saldo após (?:depósito|saque):\s*\$?([0-9,.]+)/s) || 
                          activity.content?.match(/Saldo após (?:depósito|saque):[^\$]*\$([0-9,.]+)/s);
      if (balanceMatch) {
        const balance = parseFloat(balanceMatch[1].replace(',', ''));
        if (!isNaN(balance)) {
          console.log('🏦 Found bank balance:', balance, 'from message:', activity.content.substring(0, 100));
          return balance;
        }
      }
    }
    
    console.log('🏦 No bank balance found in', financialActivities.length, 'financial activities');
    return 0; // Default if no balance found
  };

  // Activity management functions
  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setManagementModalOpen(true);
  };

  const handleSaveActivity = async (activityId: string, newItemName: string): Promise<boolean> => {
    try {
      // Extract worker ID and transaction ID from activity ID
      // Activity ID format: usually contains timestamp and author info
      const workerId = selectedActivity?.autor?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
      const transactionId = activityId;

      console.log('🔄 Editing activity:', { workerId, transactionId, newItemName });

      const response = await fetch(`/api/worker-activity/transaction/${workerId}/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-token': process.env.NEXT_PUBLIC_BOT_WEBHOOK_TOKEN || ''
        },
        body: JSON.stringify({ newItemName })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Activity updated successfully:', result);
        
        // Refresh activities to show changes
        await fetchActivities();
        return true;
      } else {
        const error = await response.json();
        console.error('❌ Failed to update activity:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error updating activity:', error);
      return false;
    }
  };

  const handleDeleteActivity = async (activityId: string): Promise<boolean> => {
    try {
      // Extract worker ID and transaction ID from activity ID
      const workerId = selectedActivity?.autor?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
      const transactionId = activityId;

      console.log('🗑️ Deleting activity:', { workerId, transactionId });

      const response = await fetch(`/api/worker-activity/transaction/${workerId}/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-token': process.env.NEXT_PUBLIC_BOT_WEBHOOK_TOKEN || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Activity deleted successfully:', result);
        
        // Refresh activities to show changes
        await fetchActivities();
        return true;
      } else {
        const error = await response.json();
        console.error('❌ Failed to delete activity:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error deleting activity:', error);
      return false;
    }
  };

  // Filter activities by type - get last 100 of each type separately
  const getItemActivities = (): Activity[] => {
    // Filter all item activities from the entire activities array (already sorted newest first)
    const itemActivities = activities.filter(activity => 
      activity.categoria === 'inventario' &&
      (activity.tipo && ['adicionar', 'remover'].includes(activity.tipo))
    );
    // Take the first 100 (newest) since activities are already sorted
    return itemActivities.slice(0, 100);
  };

  const getMoneyActivities = (): Activity[] => {
    // Filter all money activities from the entire activities array (already sorted newest first)  
    const moneyActivities = activities.filter(activity => {
      return activity.categoria === 'financeiro' &&
             (activity.tipo && ['deposito', 'saque', 'venda', 'compra'].includes(activity.tipo) ||
              (activity.valor !== undefined && activity.valor !== null));
    });
    // Take the first 100 (newest) since activities are already sorted
    return moneyActivities.slice(0, 100);
  };

  // Get unique inventory managers (people who add/remove animals)
  const getInventoryManagers = (): Set<string> => {
    const managers = new Set<string>();
    activities.forEach(activity => {
      if (activity.categoria === 'inventario' && 
          activity.tipo && ['adicionar', 'remover'].includes(activity.tipo) &&
          activity.autor && activity.autor !== 'Sistema') {
        managers.add(activity.autor);
      }
    });
    return managers;
  };

  useEffect(() => {
    // Don't fetch activities immediately - let the customizations load first
    const interval = setInterval(fetchActivities, 60000); // Update every minute
    
    // Listen for inventory changes from other components
    const handleInventoryChange = async (event: CustomEvent) => {
      if (event.detail.firmId === firm.id) {
        // Reload customizations to get the latest changes from custom_display_names.json
        try {
          const customizationsResponse = await fetch('/api/customizations');
          if (customizationsResponse.ok) {
            const customizationsData = await customizationsResponse.json();
            if (customizationsData.success && customizationsData.data?.display_names) {
              setCustomizations(customizationsData.data.display_names);
            }
          }
        } catch (error) {
          console.debug('Error reloading customizations:', error);
        }
        
        fetchActivities(); // Refresh to show updated item names
      }
    };
    
    window.addEventListener('inventoryChanged', handleInventoryChange as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('inventoryChanged', handleInventoryChange as EventListener);
    };
  }, [firm.channelId, firm.id]);

  const dashboardComponent = template.components.find(c => c.id === 'dashboard');
  const showMetrics = dashboardComponent?.settings?.showMetrics ?? true;
  const metricCards = dashboardComponent?.settings?.metricCards || ['revenue', 'activities', 'workers'];

  return (
    <div className="space-y-6" style={{ backgroundColor: template.theme.backgroundColor }}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: template.theme.primaryColor }}>
              {firm.name}
            </h1>
            <p className="text-gray-600">Template: {template.name}</p>
            {lastUpdate && (
              <p className="text-sm text-gray-500">
                Última atualização: {lastUpdate}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Monitorando</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      {showMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {metricCards.includes('revenue') && (
            <MetricCard
              title="Saldo do Banco"
              value={formatCurrency(getCurrentBankBalance())}
              icon={null}
              color="green"
              loading={loading}
              subtitle="Último saldo registrado"
            />
          )}
          
          {metricCards.includes('activities') && (
            <MetricCard
              title="Atividades"
              value={totalActivities}
              icon={<Activity className="h-8 w-8" />}
              color="blue"
              loading={loading}
              subtitle="Total de registros"
            />
          )}
          
          {metricCards.includes('workers') && (
            <MetricCard
              title="Trabalhadores"
              value={activeWorkers.size}
              icon={<Users className="h-8 w-8" />}
              color="purple"
              loading={loading}
              subtitle="Ativos"
            />
          )}
          
          {metricCards.includes('inventory') && (
            <MetricCard
              title="Inventário"
              value={inventoryCount}
              icon={<Package className="h-8 w-8" />}
              color="yellow"
              loading={loading}
              subtitle="Itens no Inventario"
            />
          )}
          
          {metricCards.includes('bankBalance') && (
            <MetricCard
              title="Gerentes"
              value={getInventoryManagers().size}
              icon={<Settings className="h-8 w-8" />}
              color="red"
              loading={loading}
              subtitle="Ativos"
            />
          )}
        </div>
      )}

      {/* Separated Activities Feed */}
      {dashboardComponent?.settings?.showRecentActivity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Item Activities */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">
                📦 Atividades de Itens ({getItemActivities().length})
              </h3>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : getItemActivities().length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma atividade de itens capturada</p>
              ) : (
                <div className="space-y-2">
                  {getItemActivities().map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                      <div className="flex-shrink-0">{getActivityIcon(activity)}</div>
                      <div className="flex-1 min-w-0">
                        {activity.parseSuccess && activity.tipo && activity.item && activity.quantidade ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">
                              {activity.autor || 'Sistema'}
                            </span>
                            <span className="text-gray-600">
                              {activity.tipo === 'adicionar' ? 'adicionou' : 'removeu'}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              activity.tipo === 'adicionar' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {activity.quantidade}x
                            </span>
                            <span className="font-medium text-gray-900">
                              {getBestDisplayName(activity.item)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {activity.autor || 'Sistema'}
                              </span>
                              {!activity.parseSuccess && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                  Não processado
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-gray-600">
                              {activity.displayText || activity.content.substring(0, 150) + 
                                (activity.content.length > 150 ? '...' : '')}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      
                      {/* Edit/Delete buttons for inventory activities only */}
                      {activity.categoria === 'inventario' && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleEditActivity(activity)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Editar atividade"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              setSelectedActivity(activity);
                              await handleDeleteActivity(activity.id);
                            }}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Deletar atividade"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Money Activities */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">
                💰 Atividades de Dinheiro ({getMoneyActivities().length})
              </h3>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {getMoneyActivities().length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma atividade financeira capturada</p>
              ) : (
                <div className="space-y-2">
                  {getMoneyActivities().map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                      <div className="flex-shrink-0">{getActivityIcon(activity)}</div>
                      <div className="flex-1 min-w-0">
                        {activity.parseSuccess && activity.categoria === 'financeiro' && (activity.tipo || activity.valor) ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">
                              {activity.autor || 'Sistema'}
                            </span>
                            {activity.descricao && activity.descricao !== 'Depósito direto' && activity.tipo !== 'saque' && (activity.descricao.trim() !== '' || (activity.tipo === 'venda' && activity.descricao.includes('animais'))) ? (
                              <>
                                <span className="text-gray-600">
                                  {activity.descricao}
                                </span>
                                <span className="text-gray-600">por</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  activity.tipo === 'deposito' || activity.tipo === 'venda' || activity.tipo === 'compra'
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  ${typeof activity.valor === 'number' ? activity.valor.toFixed(2) : '0.00'}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-600">
                                  {activity.tipo === 'deposito' ? 'depositou' : 
                                   activity.tipo === 'saque' ? 'sacou' :
                                   activity.tipo === 'compra' ? 'gastou' :
                                   activity.tipo === 'venda' ? 'vendeu' :
                                   'transação'}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  activity.tipo === 'deposito' || activity.tipo === 'venda' || activity.tipo === 'compra'
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  ${typeof activity.valor === 'number' ? activity.valor.toFixed(2) : '0.00'}
                                </span>
                              </>
                            )}
                            {activity.confidence && activity.confidence !== 'high' && (
                              <span className="text-xs text-gray-400" title={`Confiança: ${activity.confidence}`}>
                                {activity.confidence === 'medium' ? '?' : '⚠'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {activity.autor || 'Sistema'}
                              </span>
                              {!activity.parseSuccess && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                                  Não processado
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-gray-600">
                              {activity.displayText || activity.content.substring(0, 150) + 
                                (activity.content.length > 150 ? '...' : '')}
                            </div>
                          </div>
                        )}
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
      )}

      {/* Activity Management Modal */}
      {managementModalOpen && (
        <ActivityManagementModal
          activity={selectedActivity}
          isOpen={managementModalOpen}
          onClose={() => {
            setManagementModalOpen(false);
            setSelectedActivity(null);
          }}
          onSave={handleSaveActivity}
          onDelete={handleDeleteActivity}
          getBestDisplayName={getBestDisplayName}
        />
      )}
    </div>
  );
}