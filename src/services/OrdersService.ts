import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { Server as SocketIOServer } from 'socket.io';
import fs from 'fs';
import path from 'path';

export type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';

export interface IOrder {
  orderId: string;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  customerDiscordTag: string;
  supplierIds: string[];
  supplierNames: string[];
  supplierDiscordTags: string[];
  acceptedBySupplierId?: string; // Which supplier accepted this order
  firmId: string;
  firmName: string;
  itemName: string;
  itemQuantity: number;
  message: string;
  notes?: string;
  channelId?: string;
  messageId?: string;
  acceptedAt?: string;
  acceptedBy?: string;
  completedAt?: string;
  completedBy?: string;
  cancelledAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  readyForPickupAt?: string;
  readyForPickupBy?: string;
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

// Base directories for persistent storage
const DATA_DIR = path.join(__dirname, '../../data');
const ORDERS_DIR = path.join(DATA_DIR, 'orders');
const CONFIG_DIR = path.join(DATA_DIR, 'orders-config');

// Ensure data directories exist
if (!fs.existsSync(ORDERS_DIR)) {
  fs.mkdirSync(ORDERS_DIR, { recursive: true });
}
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Helper functions to get server-specific file paths
function getOrdersFilePath(serverId: string): string {
  return path.join(ORDERS_DIR, `${serverId}.json`);
}

function getConfigFilePath(serverId: string): string {
  return path.join(CONFIG_DIR, `${serverId}.json`);
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
  private io: SocketIOServer | null = null;

  setClient(client: Client): void {
    this.client = client;
  }

  setIO(io: SocketIOServer): void {
    this.io = io;
    console.log('✅ OrdersService: Socket.IO instance configured');
  }

  private emitOrderEvent(event: string, serverId: string, order: IOrder): void {
    if (this.io) {
      const roomName = `orders-${serverId}`;
      this.io.to(roomName).emit(event, { serverId, order });
      console.log(`📡 Emitted ${event} to room ${roomName} for order ${order.orderId}`);
    }
  }

  // Load configuration from file
  private loadConfigFromFile(serverId: string): IOrdersConfig {
    try {
      const configFile = getConfigFilePath(serverId);
      if (fs.existsSync(configFile)) {
        const data = fs.readFileSync(configFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Error loading orders config from file for server ${serverId}:`, error);
    }
    return defaultConfig;
  }

  // Save configuration to file
  private saveConfigToFile(serverId: string, config: IOrdersConfig): void {
    try {
      const configFile = getConfigFilePath(serverId);
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(`Error saving orders config to file for server ${serverId}:`, error);
    }
  }

  // Load orders from file
  private loadOrdersFromFile(serverId: string): IOrder[] {
    try {
      const ordersFile = getOrdersFilePath(serverId);
      if (fs.existsSync(ordersFile)) {
        const data = fs.readFileSync(ordersFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`Error loading orders from file for server ${serverId}:`, error);
    }
    return [];
  }

  // Save orders to file
  private saveOrdersToFile(serverId: string, orders: IOrder[]): void {
    try {
      const ordersFile = getOrdersFilePath(serverId);
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
    } catch (error) {
      console.error(`Error saving orders to file for server ${serverId}:`, error);
    }
  }

  async getConfig(serverId: string): Promise<IOrdersConfig | null> {
    return this.loadConfigFromFile(serverId);
  }

  async updateConfig(serverId: string, config: Partial<IOrdersConfig>): Promise<IOrdersConfig | null> {
    try {
      const currentConfig = this.loadConfigFromFile(serverId);
      const updatedConfig = { ...currentConfig, ...config };
      this.saveConfigToFile(serverId, updatedConfig);
      return updatedConfig;
    } catch (error) {
      console.error('Error updating orders config:', error);
      return null;
    }
  }

  async createOrder(serverId: string, orderData: {
    customerId: string;
    customerName: string;
    customerDiscordTag: string;
    supplierIds: string[];
    supplierNames: string[];
    supplierDiscordTags: string[];
    firmId: string;
    firmName: string;
    itemName: string;
    itemQuantity: number;
    notes?: string;
  }): Promise<IOrder | null> {
    try {
      const config = this.loadConfigFromFile(serverId);
      const orders = this.loadOrdersFromFile(serverId);

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
        supplierName: orderData.supplierNames.join(', '),
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
      this.saveOrdersToFile(serverId, orders);

      if (config.settings.notificationsEnabled && config.settings.dmNotificationsEnabled) {
        await this.sendOrderNotification(order, config);
      }

      // Emit socket event for real-time updates
      this.emitOrderEvent('order:created', serverId, order);

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrderStatus(
    serverId: string,
    orderId: string,
    status: OrderStatus,
    userId: string,
    reason?: string
  ): Promise<IOrder | null> {
    try {
      const orders = this.loadOrdersFromFile(serverId);
      const orderIndex = orders.findIndex(order => order.orderId === orderId);

      if (orderIndex === -1) return null;

      const order = orders[orderIndex];
      if (!order.supplierIds.includes(userId) && order.customerId !== userId) {
        throw new Error('Unauthorized to update this order');
      }

      order.status = status;
      order.updatedAt = new Date().toISOString();

      switch (status) {
        case 'accepted':
          order.acceptedAt = new Date().toISOString();
          order.acceptedBy = userId;
          order.acceptedBySupplierId = userId; // Track which supplier accepted
          break;
        case 'in_progress':
          order.readyForPickupAt = new Date().toISOString();
          order.readyForPickupBy = userId;
          break;
        case 'completed':
          order.completedAt = new Date().toISOString();
          order.completedBy = userId;
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
      this.saveOrdersToFile(serverId, orders);

      await this.sendStatusUpdateNotification(order, status, reason);

      // Emit socket event for real-time updates
      this.emitOrderEvent('order:status_changed', serverId, order);

      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async getUserActiveOrders(serverId: string, userId: string): Promise<IOrder[]> {
    const orders = this.loadOrdersFromFile(serverId);
    return orders.filter(order =>
      (order.customerId === userId || order.supplierIds.includes(userId)) &&
      ['pending', 'accepted', 'in_progress'].includes(order.status)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUserOrders(serverId: string, userId: string, limit: number = 10): Promise<IOrder[]> {
    const orders = this.loadOrdersFromFile(serverId);
    return orders
      .filter(order => order.customerId === userId || order.supplierIds.includes(userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getFirmOrders(serverId: string, firmId: string, status?: OrderStatus): Promise<IOrder[]> {
    const orders = this.loadOrdersFromFile(serverId);
    return orders
      .filter(order => {
        const matchesFirm = order.firmId === firmId;
        const matchesStatus = !status || order.status === status;
        return matchesFirm && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllOrders(serverId: string, filters?: {
    status?: OrderStatus;
    firmId?: string;
    customerId?: string;
    supplierId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IOrder[]> {
    const orders = this.loadOrdersFromFile(serverId);

    return orders
      .filter(order => {
        if (filters?.status && order.status !== filters.status) return false;
        if (filters?.firmId && order.firmId !== filters.firmId) return false;
        if (filters?.customerId && order.customerId !== filters.customerId) return false;
        if (filters?.supplierId && !order.supplierIds.includes(filters.supplierId)) return false;
        if (filters?.startDate && new Date(order.createdAt) < filters.startDate) return false;
        if (filters?.endDate && new Date(order.createdAt) > filters.endDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteOrder(serverId: string, orderId: string): Promise<boolean> {
    try {
      const orders = this.loadOrdersFromFile(serverId);
      const orderIndex = orders.findIndex(order => order.orderId === orderId);

      if (orderIndex === -1) return false;

      const deletedOrder = orders[orderIndex];
      orders.splice(orderIndex, 1);
      this.saveOrdersToFile(serverId, orders);

      // Emit socket event for real-time updates
      this.emitOrderEvent('order:deleted', serverId, deletedOrder);

      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  }

  async updateOrder(serverId: string, orderId: string, updates: Partial<IOrder>): Promise<IOrder | null> {
    try {
      const orders = this.loadOrdersFromFile(serverId);
      const orderIndex = orders.findIndex(order => order.orderId === orderId);

      if (orderIndex === -1) return null;

      const order = orders[orderIndex];
      const updatedOrder = {
        ...order,
        ...updates,
        orderId: order.orderId, // Prevent ID change
        createdAt: order.createdAt, // Prevent createdAt change
        updatedAt: new Date().toISOString()
      };

      orders[orderIndex] = updatedOrder;
      this.saveOrdersToFile(serverId, orders);

      // Emit socket event for real-time updates
      this.emitOrderEvent('order:updated', serverId, updatedOrder);

      return updatedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      return null;
    }
  }

  async getOrderStats(serverId: string): Promise<{
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
    const orders = this.loadOrdersFromFile(serverId);

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
      // Find the firm configuration
      const firm = config.firms.find(f => f.id === order.firmId);

      // Priority 1: Send to firm's channel (primary notification)
      let channelNotificationSent = false;
      if (firm?.notificationChannelId && config.settings.notificationsEnabled) {
        try {
          const channel = await this.client.channels.fetch(firm.notificationChannelId) as TextChannel;
          if (channel) {
            const channelEmbed = new EmbedBuilder()
              .setTitle('📦 Nova Encomenda Recebida')
              .setColor('#FFA500') // Orange for pending
              .setDescription(`**${order.customerName}** solicitou uma encomenda`)
              .addFields(
                { name: '\u200B', value: '**📋 Informações da Encomenda**', inline: false },
                { name: '🆔 ID', value: `\`${order.orderId}\``, inline: true },
                { name: '👤 Cliente', value: order.customerName, inline: true },
                { name: '🏢 Firma', value: order.firmName, inline: true },
                { name: '\u200B', value: '\u200B', inline: false },
                { name: '📦 Item Solicitado', value: `**${order.itemQuantity}x** ${order.itemName}`, inline: true },
                { name: '📊 Status', value: '⏳ **Pendente**', inline: true },
                { name: '👥 Fornecedores', value: order.supplierIds.map(id => `<@${id}>`).join(', '), inline: true }
              )
              .setFooter({ text: `Encomenda criada em ${new Date(order.createdAt).toLocaleString('pt-BR')}` })
              .setTimestamp();

            // Add notes field only if notes exist
            if (order.notes) {
              channelEmbed.addFields(
                { name: '\u200B', value: '\u200B', inline: false },
                { name: '📝 Observações do Cliente', value: `> ${order.notes}`, inline: false }
              );
            }

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

            await channel.send({ embeds: [channelEmbed], components: [row] });
            channelNotificationSent = true;
            console.log(`✅ Order notification sent to channel ${channel.name} for firm ${firm.name}`);
          }
        } catch (channelError) {
          console.error('Error sending order notification to channel:', channelError);
        }
      }

      // Priority 2: Send DM to all suppliers (secondary/fallback notification)
      if (config.settings.dmNotificationsEnabled) {
        for (let i = 0; i < order.supplierIds.length; i++) {
          try {
            const supplierId = order.supplierIds[i];
            const supplierName = order.supplierNames[i];
            const supplier = await this.client.users.fetch(supplierId);

            const dmEmbed = new EmbedBuilder()
              .setTitle('📦 Nova Encomenda Recebida')
              .setColor('#FFA500') // Orange for pending
              .setDescription(`Você recebeu uma nova encomenda de **${order.customerName}**`)
              .addFields(
                { name: '\u200B', value: '**📋 Informações da Encomenda**', inline: false },
                { name: '🆔 ID', value: `\`${order.orderId}\``, inline: true },
                { name: '👤 Cliente', value: order.customerName, inline: true },
                { name: '🏢 Firma', value: order.firmName, inline: true },
                { name: '\u200B', value: '\u200B', inline: false },
                { name: '📦 Item Solicitado', value: `**${order.itemQuantity}x** ${order.itemName}`, inline: true },
                { name: '📊 Status', value: '⏳ **Pendente**', inline: true }
              );

            // Add notes field only if notes exist
            if (order.notes) {
              dmEmbed.addFields(
                { name: '\u200B', value: '\u200B', inline: false },
                { name: '📝 Observações do Cliente', value: `> ${order.notes}`, inline: false }
              );
            }

            // Show other suppliers if multiple
            if (order.supplierIds.length > 1) {
              const otherSuppliers = order.supplierNames.filter((_, idx) => idx !== i);
              dmEmbed.addFields(
                { name: '\u200B', value: '\u200B', inline: false },
                { name: '👥 Outros Fornecedores', value: otherSuppliers.join(', '), inline: false }
              );
            }

            dmEmbed
              .setFooter({
                text: channelNotificationSent
                  ? `Notificação também enviada no canal da firma • ${new Date(order.createdAt).toLocaleString('pt-BR')}`
                  : `Notificação por DM • ${new Date(order.createdAt).toLocaleString('pt-BR')}`
              })
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

            await supplier.send({ embeds: [dmEmbed], components: [row] });
            console.log(`✅ DM notification sent to ${supplierName}`);
          } catch (dmError) {
            console.error(`Error sending DM notification to supplier ${order.supplierNames[i]}:`, dmError);
            // Continue sending to other suppliers even if one fails
          }
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
      const customer = await this.client.users.fetch(order.customerId);

      let title = '';
      let description = '';
      let color = '#00FF00';

      switch (newStatus) {
        case 'accepted':
          title = '✅ Encomenda Aceita';
          description = `Sua encomenda foi aceita por **${order.supplierName}**!`;
          color = '#00FF00';
          break;
        case 'rejected':
          title = '❌ Encomenda Rejeitada';
          description = `Sua encomenda foi rejeitada por **${order.supplierName}**.`;
          color = '#FF0000';
          break;
        case 'in_progress':
          title = '📦 Encomenda Pronta para Retirada';
          description = `Sua encomenda está pronta! Você pode retirar com **${order.supplierName}**.`;
          color = '#FFA500';
          break;
        case 'completed':
          title = '🎉 Encomenda Concluída';
          description = `Sua encomenda foi marcada como concluída!`;
          color = '#00FF00';
          break;
        case 'cancelled':
          title = '❌ Encomenda Cancelada';
          description = 'Sua encomenda foi cancelada.';
          color = '#FF0000';
          break;
        default:
          return;
      }

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color as any)
        .setDescription(description)
        .addFields(
          { name: '\u200B', value: '**📋 Detalhes da Encomenda**', inline: false },
          { name: '🆔 ID', value: `\`${order.orderId}\``, inline: true },
          { name: '🏢 Firma', value: order.firmName, inline: true },
          { name: '📊 Status', value: this.getStatusDisplay(newStatus), inline: true },
          { name: '\u200B', value: '\u200B', inline: false },
          { name: '📦 Item', value: `**${order.itemQuantity}x** ${order.itemName}`, inline: true },
          { name: '👨‍💼 Fornecedor', value: order.supplierName, inline: true }
        );

      if (reason && (newStatus === 'rejected' || newStatus === 'cancelled')) {
        embed.addFields(
          { name: '\u200B', value: '\u200B', inline: false },
          { name: '📝 Motivo', value: `> ${reason}`, inline: false }
        );
      }

      if (order.notes) {
        embed.addFields(
          { name: '\u200B', value: '\u200B', inline: false },
          { name: '💬 Suas Observações', value: `> ${order.notes}`, inline: false }
        );
      }

      embed
        .setFooter({ text: `Atualizado em ${new Date().toLocaleString('pt-BR')}` })
        .setTimestamp();

      await customer.send({ embeds: [embed] });
      console.log(`✅ Notification sent to customer ${order.customerName} for order ${order.orderId} (${newStatus})`);
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