import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
} from 'discord.js';
import OrdersService from '../../services/OrdersService';

const activeOrderSessions = new Map<string, {
  firmId?: string;
  firmName?: string;
  supplierId?: string;
  supplierName?: string;
  supplierDiscordTag?: string;
  step: number;
  timestamp: number;
}>();

const SESSION_TIMEOUT = 300000;

function cleanupSessions() {
  const now = Date.now();
  for (const [userId, session] of activeOrderSessions.entries()) {
    if (now - session.timestamp > SESSION_TIMEOUT) {
      activeOrderSessions.delete(userId);
    }
  }
}

setInterval(cleanupSessions, 60000);

export default {
  name: Events.InteractionCreate,
  
  async execute(interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction) {
    try {
      if (interaction.isButton() && interaction.customId === 'order_start') {
        await handleOrderStart(interaction);
      } else if (interaction.isButton() && interaction.customId.startsWith('order_accept_')) {
        await handleOrderAccept(interaction);
      } else if (interaction.isButton() && interaction.customId.startsWith('order_reject_')) {
        await handleOrderReject(interaction);
      } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('order_firm_')) {
        await handleFirmSelection(interaction);
      } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('order_supplier_')) {
        await handleSupplierSelection(interaction);
      } else if (interaction.isModalSubmit() && interaction.customId.startsWith('order_details_modal_')) {
        await handleOrderDetailsSubmit(interaction);
      }
    } catch (error) {
      console.error('Error handling orders interaction:', error);
    }
  }
};

async function handleOrderStart(interaction: ButtonInteraction) {
  try {
    const config = await OrdersService.getConfig();
    if (!config) {
      await interaction.reply({
        content: '❌ Sistema de encomendas não configurado.',
        ephemeral: true
      });
      return;
    }

    const activeFirms = config.firms.filter(f => f.active);
    if (activeFirms.length === 0) {
      await interaction.reply({
        content: '❌ Não há firmas disponíveis no momento.',
        ephemeral: true
      });
      return;
    }

    const activeUserOrders = await OrdersService.getUserActiveOrders(interaction.user.id);
    if (activeUserOrders.length >= config.settings.maxActiveOrdersPerUser) {
      await interaction.reply({
        content: formatMessage(config.messages.orderLimitReached, {
          limit: config.settings.maxActiveOrdersPerUser.toString()
        }),
        ephemeral: true
      });
      return;
    }

    activeOrderSessions.set(interaction.user.id, { 
      step: 1, 
      timestamp: Date.now() 
    });

    const embed = new EmbedBuilder()
      .setTitle(config.steps.selectFirm.embedTitle)
      .setDescription(config.steps.selectFirm.embedDescription)
      .setColor(config.settings.embedColor as any)
      .setFooter({ text: `Passo 1 de 3 • Sessão expira em 5 minutos` });

    const options = activeFirms.slice(0, 25).map(firm => ({
      label: firm.name,
      description: firm.description || `Firma: ${firm.name}`,
      value: firm.id,
      emoji: '🏢'
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`order_firm_${interaction.user.id}`)
      .setPlaceholder(config.steps.selectFirm.dropdownPlaceholder)
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  } catch (error) {
    console.error('Error starting order:', error);
    await interaction.reply({
      content: '❌ Erro ao iniciar encomenda.',
      ephemeral: true
    });
  }
}

async function handleFirmSelection(interaction: StringSelectMenuInteraction) {
  try {
    const userId = interaction.customId.split('_')[2];
    if (userId !== interaction.user.id) return;

    const session = activeOrderSessions.get(userId);
    if (!session) {
      await interaction.reply({
        content: '❌ Sessão expirada. Por favor, comece novamente.',
        ephemeral: true
      });
      return;
    }

    const config = await OrdersService.getConfig();
    if (!config) return;

    const firmId = interaction.values[0];
    const firm = config.firms.find(f => f.id === firmId);
    
    if (!firm) {
      await interaction.update({
        content: '❌ Firma não encontrada.',
        embeds: [],
        components: []
      });
      return;
    }

    session.firmId = firmId;
    session.firmName = firm.name;
    session.step = 2;
    session.timestamp = Date.now();

    const guild = interaction.guild;
    if (!guild) return;

    // Get suppliers directly from the configured supplier user IDs
    const suppliers = [];
    
    for (const userId of firm.supplierUserIds || []) {
      try {
        if (userId !== interaction.user.id) { // Don't allow ordering from yourself
          const member = await guild.members.fetch(userId);
          if (member && !member.user.bot) {
            suppliers.push(member);
          }
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
      }
    }

    if (suppliers.length === 0) {
      await interaction.update({
        content: config.messages.noSuppliersAvailable,
        embeds: [],
        components: []
      });
      activeOrderSessions.delete(userId);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(config.steps.selectSupplier.embedTitle)
      .setDescription(config.steps.selectSupplier.embedDescription)
      .setColor(config.settings.embedColor as any)
      .addFields(
        { name: 'Firma Selecionada', value: firm.name, inline: true }
      )
      .setFooter({ text: `Passo 2 de 3 • Sessão expira em 5 minutos` });

    const options = suppliers.slice(0, 25).map(member => ({
      label: member.displayName,
      description: `@${member.user.username}`,
      value: member.id,
      emoji: '👤'
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`order_supplier_${userId}`)
      .setPlaceholder(config.steps.selectSupplier.dropdownPlaceholder)
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    await interaction.update({
      embeds: [embed],
      components: [row]
    });
  } catch (error) {
    console.error('Error handling firm selection:', error);
    await interaction.update({
      content: '❌ Erro ao processar seleção da firma.',
      embeds: [],
      components: []
    });
  }
}

async function handleSupplierSelection(interaction: StringSelectMenuInteraction) {
  try {
    const userId = interaction.customId.split('_')[2];
    if (userId !== interaction.user.id) return;

    const session = activeOrderSessions.get(userId);
    if (!session || !session.firmId) {
      await interaction.reply({
        content: '❌ Sessão expirada. Por favor, comece novamente.',
        ephemeral: true
      });
      activeOrderSessions.delete(userId);
      return;
    }

    const config = await OrdersService.getConfig();
    if (!config) return;

    const supplierId = interaction.values[0];
    const guild = interaction.guild;
    if (!guild) return;

    const supplier = await guild.members.fetch(supplierId);
    if (!supplier) {
      await interaction.update({
        content: '❌ Fornecedor não encontrado.',
        embeds: [],
        components: []
      });
      activeOrderSessions.delete(userId);
      return;
    }

    session.supplierId = supplierId;
    session.supplierName = supplier.displayName;
    session.supplierDiscordTag = supplier.user.tag;
    session.step = 3;
    session.timestamp = Date.now();

    const modal = new ModalBuilder()
      .setCustomId(`order_details_modal_${userId}`)
      .setTitle(config.steps.orderDetails.modalTitle);

    const itemInput = new TextInputBuilder()
      .setCustomId('item_name')
      .setLabel(config.steps.orderDetails.itemLabel)
      .setPlaceholder(config.steps.orderDetails.itemPlaceholder)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const quantityInput = new TextInputBuilder()
      .setCustomId('item_quantity')
      .setLabel(config.steps.orderDetails.quantityLabel)
      .setPlaceholder(config.steps.orderDetails.quantityPlaceholder)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(10);

    const notesInput = new TextInputBuilder()
      .setCustomId('order_notes')
      .setLabel(config.steps.orderDetails.notesLabel)
      .setPlaceholder(config.steps.orderDetails.notesPlaceholder)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);

    const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(itemInput);
    const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(quantityInput);
    const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput);

    modal.addComponents(firstRow, secondRow, thirdRow);

    // Show modal - this automatically dismisses the message
    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error handling supplier selection:', error);
    await interaction.update({
      content: '❌ Erro ao processar seleção do fornecedor.',
      embeds: [],
      components: []
    });
  }
}

async function handleOrderDetailsSubmit(interaction: ModalSubmitInteraction) {
  try {
    const userId = interaction.customId.split('_')[3];
    if (userId !== interaction.user.id) return;

    const session = activeOrderSessions.get(userId);
    if (!session || !session.firmId || !session.supplierId) {
      await interaction.reply({
        content: '❌ Sessão expirada. Por favor, comece novamente.',
        ephemeral: true
      });
      activeOrderSessions.delete(userId);
      return;
    }

    const config = await OrdersService.getConfig();
    if (!config) return;

    const itemName = interaction.fields.getTextInputValue('item_name');
    const quantityStr = interaction.fields.getTextInputValue('item_quantity');
    const notes = interaction.fields.getTextInputValue('order_notes') || undefined;

    const quantity = parseInt(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
      await interaction.reply({
        content: '❌ Quantidade inválida. Por favor, insira um número válido maior que 0.',
        ephemeral: true
      });
      return;
    }

    const order = await OrdersService.createOrder({
      customerId: interaction.user.id,
      customerName: interaction.user.username,
      customerDiscordTag: interaction.user.tag,
      supplierId: session.supplierId,
      supplierName: session.supplierName!,
      supplierDiscordTag: session.supplierDiscordTag!,
      firmId: session.firmId,
      firmName: session.firmName!,
      itemName,
      itemQuantity: quantity,
      notes
    });

    if (!order) {
      await interaction.reply({
        content: '❌ Erro ao criar encomenda.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Encomenda Criada com Sucesso!')
      .setColor('#00FF00')
      .setDescription(`Sua encomenda foi enviada para **${session.supplierName}**`)
      .addFields(
        { name: 'ID da Encomenda', value: order.orderId, inline: true },
        { name: 'Firma', value: session.firmName!, inline: true },
        { name: 'Status', value: '⏳ Pendente', inline: true },
        { name: 'Item', value: itemName, inline: true },
        { name: 'Quantidade', value: quantity.toString(), inline: true },
        { name: 'Fornecedor', value: session.supplierName!, inline: true }
      )
      .setFooter({ text: 'Você receberá uma notificação quando o fornecedor responder.' })
      .setTimestamp();

    if (notes) {
      embed.addFields({ name: 'Observações', value: notes, inline: false });
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

    activeOrderSessions.delete(userId);

  } catch (error: any) {
    console.error('Error submitting order:', error);
    
    const config = await OrdersService.getConfig();
    let errorMessage = '❌ Erro ao criar encomenda.';
    
    if (config) {
      if (error.message?.includes('Order limit reached')) {
        errorMessage = formatMessage(config.messages.orderLimitReached, {
          limit: config.settings.maxActiveOrdersPerUser.toString()
        });
      } else if (error.message?.includes('Cooldown active')) {
        const minutes = error.message.match(/(\d+) minutes/)?.[1] || '?';
        errorMessage = formatMessage(config.messages.cooldownActive, { minutes });
      }
    }

    await interaction.reply({
      content: errorMessage,
      ephemeral: true
    });
    
    activeOrderSessions.delete(interaction.user.id);
  }
}

async function handleOrderAccept(interaction: ButtonInteraction) {
  try {
    const orderId = interaction.customId.split('_')[2];
    
    const updated = await OrdersService.updateOrderStatus(
      orderId,
      'accepted',
      interaction.user.id
    );

    if (!updated) {
      await interaction.reply({
        content: '❌ Encomenda não encontrada.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Encomenda Aceita')
      .setColor('#00FF00')
      .setDescription(`Você aceitou a encomenda **${updated.orderId}**`)
      .addFields(
        { name: 'Cliente', value: updated.customerName, inline: true },
        { name: 'Item', value: `${updated.itemQuantity}x ${updated.itemName}`, inline: true },
        { name: 'Status', value: '✅ Aceita', inline: true }
      )
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: []
    });

  } catch (error: any) {
    console.error('Error accepting order:', error);
    
    if (error.message === 'Unauthorized to update this order') {
      await interaction.reply({
        content: '❌ Você não tem permissão para aceitar esta encomenda.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Erro ao aceitar encomenda.',
        ephemeral: true
      });
    }
  }
}

async function handleOrderReject(interaction: ButtonInteraction) {
  try {
    const orderId = interaction.customId.split('_')[2];
    
    const updated = await OrdersService.updateOrderStatus(
      orderId,
      'rejected',
      interaction.user.id,
      'Rejeitado pelo fornecedor'
    );

    if (!updated) {
      await interaction.reply({
        content: '❌ Encomenda não encontrada.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('❌ Encomenda Rejeitada')
      .setColor('#FF0000')
      .setDescription(`Você rejeitou a encomenda **${updated.orderId}**`)
      .addFields(
        { name: 'Cliente', value: updated.customerName, inline: true },
        { name: 'Item', value: `${updated.itemQuantity}x ${updated.itemName}`, inline: true },
        { name: 'Status', value: '❌ Rejeitada', inline: true }
      )
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: []
    });

  } catch (error: any) {
    console.error('Error rejecting order:', error);
    
    if (error.message === 'Unauthorized to update this order') {
      await interaction.reply({
        content: '❌ Você não tem permissão para rejeitar esta encomenda.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Erro ao rejeitar encomenda.',
        ephemeral: true
      });
    }
  }
}

function formatMessage(template: string, variables: Record<string, string>): string {
  let formatted = template;
  for (const [key, value] of Object.entries(variables)) {
    formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return formatted;
}