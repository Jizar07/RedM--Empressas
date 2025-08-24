import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';

export type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';

export interface IOrder {
  orderId: string;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  customerDiscordTag: string;
  supplierId: string;
  supplierName: string;
  supplierDiscordTag: string;
  firmId: string;
  firmName: string;
  itemName: string;
  itemQuantity: number;
  message: string;
  notes?: string;
  channelId?: string;
  messageId?: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrdersConfig {
  configId: string;
  firms: {
    id: string;
    name: string;  // This will be the server category name (e.g. "Fazendas", "Mineração")
    description?: string;
    discordRoleIds: string[];  // Roles selected for this firm/category
    discordRoleNames: string[];
    supplierUserIds: string[];  // Users who have the selected roles
    supplierUserNames: string[];
    items: {
      id: string;
      name: string;
      description?: string;
      maxQuantity?: number;
      active: boolean;
    }[];
    notificationChannelId?: string;
    active: boolean;
    order: number;
  }[];
  settings: {
    orderChannelId?: string;
    notificationsEnabled: boolean;
    dmNotificationsEnabled: boolean;
    requireApproval: boolean;
    maxActiveOrdersPerUser: number;
    orderCooldownMinutes: number;
    embedColor: string;
  };
  command: {
    name: string;
    description: string;
    permissions: string;
  };
  messages: {
    orderPlaced: string;
    orderAccepted: string;
    orderRejected: string;
    orderCompleted: string;
    orderCancelled: string;
    dmNotificationTemplate: string;
    channelNotificationTemplate: string;
    noSuppliersAvailable: string;
    orderLimitReached: string;
    cooldownActive: string;
  };
  formDisplay: {
    title: string;
    description: string;
    embedColor: string;
    button: {
      text: string;
      emoji: string;
      style: string;
    };
  };
  steps: {
    selectFirm: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
    selectSupplier: {
      embedTitle: string;
      embedDescription: string;
      dropdownPlaceholder: string;
    };
    orderDetails: {
      modalTitle: string;
      itemLabel: string;
      itemPlaceholder: string;
      quantityLabel: string;
      quantityPlaceholder: string;
      notesLabel: string;
      notesPlaceholder: string;
    };
  };
}

// File paths for persistent storage
const CONFIG_FILE = path.join(__dirname, '../../data/orders-config.json');
const ORDERS_FILE = path.join(__dirname, '../../data/orders.json');
const DATA_DIR = path.dirname(CONFIG_FILE);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default configuration
const defaultConfig: IOrdersConfig = {
  configId: 'orders_config',
  firms: [],
  settings: {
    notificationsEnabled: true,
    dmNotificationsEnabled: true,
    requireApproval: false,
    maxActiveOrdersPerUser: 5,
    orderCooldownMinutes: 0,
    embedColor: '#00FF00'
  },
  command: {
    name: 'encomenda',
    description: 'Fazer uma encomenda para outro jogador',
    permissions: 'SendMessages'
  },
  messages: {
    orderPlaced: '✅ **Encomenda Realizada!**\n\n{customerName} encomendou {quantity}x {item} de {supplierName}',
    orderAccepted: '✅ Sua encomenda foi aceita por {supplierName}!',
    orderRejected: '❌ Sua encomenda foi rejeitada por {supplierName}.\nMotivo: {reason}',
    orderCompleted: '🎉 Sua encomenda foi concluída por {supplierName}!',
    orderCancelled: '❌ Encomenda cancelada.',
    dmNotificationTemplate: '📦 **Nova Encomenda!**\n\n**Cliente:** {customerName}\n**Item:** {quantity}x {item}\n**Notas:** {notes}\n\nUse os botões abaixo para aceitar ou rejeitar.',
    channelNotificationTemplate: '📦 **Nova Encomenda**\n\n**De:** {customerName}\n**Para:** {supplierName}\n**Firma:** {firmName}\n**Item:** {quantity}x {item}',
    noSuppliersAvailable: '❌ Não há fornecedores disponíveis para esta firma no momento.',
    orderLimitReached: '❌ Você atingiu o limite máximo de {limit} encomendas ativas.',
    cooldownActive: '⏱️ Você precisa aguardar {minutes} minutos antes de fazer outra encomenda.'
  },
  formDisplay: {
    title: '📦 Sistema de Encomendas',
    description: '**Bem-vindo ao Sistema de Encomendas!**\n\nAqui você pode fazer encomendas de itens para outros jogadores.\n\n**Como funciona:**\n• Escolha a firma/categoria\n• Selecione o fornecedor\n• Especifique o item e quantidade\n• Aguarde a confirmação\n\nClique no botão abaixo para começar.',
    embedColor: '#00FF00',
    button: {
      text: 'Fazer Encomenda',
      emoji: '📦',
      style: 'Primary'
    }
  },
  steps: {
    selectFirm: {
      embedTitle: 'Passo 1/3 - Selecione a Firma',
      embedDescription: 'Escolha a firma/categoria do item que deseja encomendar:',
      dropdownPlaceholder: 'Selecione uma firma...'
    },
    selectSupplier: {
      embedTitle: 'Passo 2/3 - Selecione o Fornecedor',
      embedDescription: 'Escolha quem irá fornecer o item:',
      dropdownPlaceholder: 'Selecione um fornecedor...'
    },
    orderDetails: {
      modalTitle: 'Passo 3/3 - Detalhes da Encomenda',
      itemLabel: 'Nome do Item',
      itemPlaceholder: 'Ex: Madeira, Ferro, Comida...',
      quantityLabel: 'Quantidade',
      quantityPlaceholder: 'Ex: 10, 50, 100...',
      notesLabel: 'Observações (Opcional)',
      notesPlaceholder: 'Informações adicionais sobre a encomenda...'
    }
  }
};

class OrdersService {
  private client: Client | null = null;

  setClient(client: Client): void {
    this.client = client;
  }

  // Load configuration from file
  private loadConfigFromFile(): IOrdersConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading orders config from file:', error);
    }
    return defaultConfig;
  }

  // Save configuration to file
  private saveConfigToFile(config: IOrdersConfig): void {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving orders config to file:', error);
    }
  }

  // Load orders from file
  private loadOrdersFromFile(): IOrder[] {
    try {
      if (fs.existsSync(ORDERS_FILE)) {
        const data = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading orders from file:', error);
    }
    return [];
  }

  // Save orders to file
  private saveOrdersToFile(orders: IOrder[]): void {
    try {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    } catch (error) {
      console.error('Error saving orders to file:', error);
    }
  }

  async getConfig(): Promise<IOrdersConfig | null> {
    return this.loadConfigFromFile();
  }

  async updateConfig(config: Partial<IOrdersConfig>): Promise<IOrdersConfig | null> {
    try {
      const currentConfig = this.loadConfigFromFile();
      const updatedConfig = { ...currentConfig, ...config };
      this.saveConfigToFile(updatedConfig);
      return updatedConfig;
    } catch (error) {
      console.error('Error updating orders config:', error);
      return null;
    }
  }

  async createOrder(orderData: {
    customerId: string;
    customerName: string;
    customerDiscordTag: string;
    supplierId: string;
    supplierName: string;
    supplierDiscordTag: string;
    firmId: string;
    firmName: string;
    itemName: string;
    itemQuantity: number;
    notes?: string;
  }): Promise<IOrder | null> {
    try {
      const config = this.loadConfigFromFile();
      const orders = this.loadOrdersFromFile();

      const activeOrders = orders.filter(order => 
        order.customerId === orderData.customerId &&
        ['pending', 'accepted', 'in_progress'].includes(order.status)
      );

      if (activeOrders.length >= config.settings.maxActiveOrdersPerUser) {
        throw new Error(`Order limit reached: ${config.settings.maxActiveOrdersPerUser}`);
      }

      const lastOrder = orders
        .filter(order => order.customerId === orderData.customerId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      if (lastOrder && config.settings.orderCooldownMinutes > 0) {
        const cooldownEnd = new Date(new Date(lastOrder.createdAt).getTime() + config.settings.orderCooldownMinutes * 60000);
        if (cooldownEnd > new Date()) {
          const remainingMinutes = Math.ceil((cooldownEnd.getTime() - Date.now()) / 60000);
          throw new Error(`Cooldown active: ${remainingMinutes} minutes remaining`);
        }
      }

      const message = this.formatMessage(config.messages.orderPlaced, {
        customerName: orderData.customerName,
        supplierName: orderData.supplierName,
        item: orderData.itemName,
        quantity: orderData.itemQuantity.toString(),
        firmName: orderData.firmName
      });

      const order: IOrder = {
        orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: 'pending',
        ...orderData,
        message,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      orders.push(order);
      this.saveOrdersToFile(orders);

      if (config.settings.notificationsEnabled && config.settings.dmNotificationsEnabled) {
        await this.sendOrderNotification(order, config);
      }

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrderStatus(
    orderId: string, 
    status: OrderStatus, 
    userId: string,
    reason?: string
  ): Promise<IOrder | null> {
    try {
      const orders = this.loadOrdersFromFile();
      const orderIndex = orders.findIndex(order => order.orderId === orderId);
      
      if (orderIndex === -1) return null;

      const order = orders[orderIndex];
      if (order.supplierId !== userId && order.customerId !== userId) {
        throw new Error('Unauthorized to update this order');
      }

      order.status = status;
      order.updatedAt = new Date().toISOString();
      
      switch (status) {
        case 'accepted':
          order.acceptedAt = new Date().toISOString();
          break;
        case 'completed':
          order.completedAt = new Date().toISOString();
          break;
        case 'cancelled':
          order.cancelledAt = new Date().toISOString();
          break;
        case 'rejected':
          order.rejectedAt = new Date().toISOString();
          order.rejectionReason = reason;
          break;
      }

      orders[orderIndex] = order;
      this.saveOrdersToFile(orders);

      await this.sendStatusUpdateNotification(order, status, reason);

      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async getUserActiveOrders(userId: string): Promise<IOrder[]> {
    const orders = this.loadOrdersFromFile();
    return orders.filter(order => 
      (order.customerId === userId || order.supplierId === userId) &&
      ['pending', 'accepted', 'in_progress'].includes(order.status)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUserOrders(userId: string, limit: number = 10): Promise<IOrder[]> {
    const orders = this.loadOrdersFromFile();
    return orders
      .filter(order => order.customerId === userId || order.supplierId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getFirmOrders(firmId: string, status?: OrderStatus): Promise<IOrder[]> {
    const orders = this.loadOrdersFromFile();
    return orders
      .filter(order => {
        const matchesFirm = order.firmId === firmId;
        const matchesStatus = !status || order.status === status;
        return matchesFirm && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllOrders(filters?: {
    status?: OrderStatus;
    firmId?: string;
    customerId?: string;
    supplierId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IOrder[]> {
    const orders = this.loadOrdersFromFile();
    
    return orders
      .filter(order => {
        if (filters?.status && order.status !== filters.status) return false;
        if (filters?.firmId && order.firmId !== filters.firmId) return false;
        if (filters?.customerId && order.customerId !== filters.customerId) return false;
        if (filters?.supplierId && order.supplierId !== filters.supplierId) return false;
        if (filters?.startDate && new Date(order.createdAt) < filters.startDate) return false;
        if (filters?.endDate && new Date(order.createdAt) > filters.endDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOrderStats(): Promise<{
    total: number;
    pending: number;
    accepted: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    rejected: number;
    topFirms: { firmName: string; count: number }[];
    topSuppliers: { supplierName: string; count: number }[];
    topItems: { itemName: string; count: number; totalQuantity: number }[];
  }> {
    const orders = this.loadOrdersFromFile();

    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      accepted: orders.filter(o => o.status === 'accepted').length,
      inProgress: orders.filter(o => o.status === 'in_progress').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      rejected: orders.filter(o => o.status === 'rejected').length,
      topFirms: [] as { firmName: string; count: number }[],
      topSuppliers: [] as { supplierName: string; count: number }[],
      topItems: [] as { itemName: string; count: number; totalQuantity: number }[]
    };

    // Calculate top firms
    const firmCounts: Record<string, number> = {};
    orders.forEach(order => {
      firmCounts[order.firmName] = (firmCounts[order.firmName] || 0) + 1;
    });
    stats.topFirms = Object.entries(firmCounts)
      .map(([firmName, count]) => ({ firmName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate top suppliers
    const supplierCounts: Record<string, number> = {};
    orders.filter(o => o.status === 'completed').forEach(order => {
      supplierCounts[order.supplierName] = (supplierCounts[order.supplierName] || 0) + 1;
    });
    stats.topSuppliers = Object.entries(supplierCounts)
      .map(([supplierName, count]) => ({ supplierName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate top items
    const itemStats: Record<string, { count: number; totalQuantity: number }> = {};
    orders.forEach(order => {
      if (!itemStats[order.itemName]) {
        itemStats[order.itemName] = { count: 0, totalQuantity: 0 };
      }
      itemStats[order.itemName].count += 1;
      itemStats[order.itemName].totalQuantity += order.itemQuantity;
    });
    stats.topItems = Object.entries(itemStats)
      .map(([itemName, { count, totalQuantity }]) => ({ itemName, count, totalQuantity }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    return stats;
  }

  private async sendOrderNotification(order: IOrder, config: IOrdersConfig): Promise<void> {
    if (!this.client) return;

    try {
      const supplier = await this.client.users.fetch(order.supplierId);
      
      const embed = new EmbedBuilder()
        .setTitle('📦 Nova Encomenda!')
        .setColor(config.settings.embedColor as any)
        .setDescription(this.formatMessage(config.messages.dmNotificationTemplate, {
          customerName: order.customerName,
          item: order.itemName,
          quantity: order.itemQuantity.toString(),
          notes: order.notes || 'Nenhuma observação'
        }))
        .addFields(
          { name: 'ID da Encomenda', value: order.orderId, inline: true },
          { name: 'Firma', value: order.firmName, inline: true },
          { name: 'Status', value: '⏳ Pendente', inline: true }
        )
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`order_accept_${order.orderId}`)
            .setLabel('Aceitar')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`order_reject_${order.orderId}`)
            .setLabel('Rejeitar')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger)
        );

      await supplier.send({ embeds: [embed], components: [row] });

      const firm = config.firms.find(f => f.id === order.firmId);
      if (firm?.notificationChannelId && config.settings.notificationsEnabled) {
        const channel = await this.client.channels.fetch(firm.notificationChannelId) as TextChannel;
        if (channel) {
          const channelEmbed = new EmbedBuilder()
            .setTitle('📦 Nova Encomenda')
            .setColor(config.settings.embedColor as any)
            .setDescription(this.formatMessage(config.messages.channelNotificationTemplate, {
              customerName: order.customerName,
              supplierName: order.supplierName,
              firmName: order.firmName,
              item: order.itemName,
              quantity: order.itemQuantity.toString()
            }))
            .setTimestamp();
          
          await channel.send({ embeds: [channelEmbed] });
        }
      }
    } catch (error) {
      console.error('Error sending order notification:', error);
    }
  }

  private async sendStatusUpdateNotification(
    order: IOrder, 
    newStatus: OrderStatus,
    reason?: string
  ): Promise<void> {
    if (!this.client) return;

    try {
      const config = this.loadConfigFromFile();
      if (!config.settings.dmNotificationsEnabled) return;

      const customer = await this.client.users.fetch(order.customerId);
      
      let message = '';
      let color = '#00FF00';
      
      switch (newStatus) {
        case 'accepted':
          message = config.messages.orderAccepted;
          color = '#00FF00';
          break;
        case 'rejected':
          message = config.messages.orderRejected;
          color = '#FF0000';
          break;
        case 'completed':
          message = config.messages.orderCompleted;
          color = '#00FF00';
          break;
        case 'cancelled':
          message = config.messages.orderCancelled;
          color = '#FF0000';
          break;
        default:
          return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📦 Atualização da Encomenda')
        .setColor(color as any)
        .setDescription(this.formatMessage(message, {
          supplierName: order.supplierName,
          reason: reason || 'Sem motivo especificado'
        }))
        .addFields(
          { name: 'ID da Encomenda', value: order.orderId, inline: true },
          { name: 'Item', value: `${order.itemQuantity}x ${order.itemName}`, inline: true },
          { name: 'Novo Status', value: this.getStatusDisplay(newStatus), inline: true }
        )
        .setTimestamp();

      await customer.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error sending status update notification:', error);
    }
  }

  private formatMessage(template: string, variables: Record<string, string>): string {
    let formatted = template;
    for (const [key, value] of Object.entries(variables)) {
      formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return formatted;
  }

  private getStatusDisplay(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      pending: '⏳ Pendente',
      accepted: '✅ Aceita',
      in_progress: '🔄 Em Andamento',
      completed: '✅ Concluída',
      cancelled: '❌ Cancelada',
      rejected: '❌ Rejeitada'
    };
    return statusMap[status] || status;
  }
}

export default new OrdersService();