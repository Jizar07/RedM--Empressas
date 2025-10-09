import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  MessageFlags
} from 'discord.js';
import OrdersService from '../../services/OrdersService';

const activeOrderSessions = new Map<string, {
  firmId?: string;
  firmName?: string;
  suppliers?: Array<{
    id: string;
    name: string;
    tag: string;
  }>;
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
      } else if (interaction.isButton() && interaction.customId.startsWith('order_ready_')) {
        await handleOrderReadyForPickup(interaction);
      } else if (interaction.isButton() && interaction.customId.startsWith('order_complete_')) {
        await handleOrderComplete(interaction);
      } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('order_firm_')) {
        await handleFirmSelection(interaction);
      } else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('order_supplier_')) {
        await handleSupplierSelection(interaction);
      } else if (interaction.isModalSubmit() && interaction.customId.startsWith('order_details_modal_')) {
        await handleOrderDetailsSubmit(interaction);
      } else if (interaction.isModalSubmit() && interaction.customId.startsWith('order_reject_reason_')) {
        await handleOrderRejectModal(interaction);
      }
    } catch (error) {
      console.error('Error handling orders interaction:', error);
    }
  }
};

async function handleOrderStart(interaction: ButtonInteraction) {
  try {
    // CRITICAL: Defer the reply IMMEDIATELY as first action to prevent timeout
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply({
        content: '❌ Este comando só pode ser usado em um servidor.'
      });
      return;
    }

    const config = await OrdersService.getConfig(guildId);
    if (!config) {
      await interaction.editReply({
        content: '❌ Sistema de encomendas não configurado.'
      });
      return;
    }

    const activeFirms = config.firms.filter(f => f.active);
    if (activeFirms.length === 0) {
      await interaction.editReply({
        content: '❌ Não há firmas disponíveis no momento.'
      });
      return;
    }

    const activeUserOrders = await OrdersService.getUserActiveOrders(guildId, interaction.user.id);
    if (activeUserOrders.length >= config.settings.maxActiveOrdersPerUser) {
      await interaction.editReply({
        content: formatMessage(config.messages.orderLimitReached, {
          limit: config.settings.maxActiveOrdersPerUser.toString()
        })
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

    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  } catch (error: any) {
    console.error('Error starting order:', error);
    try {
      // Check if interaction is expired/timed out
      if (error?.code === 10062 || error?.message?.includes('Unknown interaction')) {
        console.log('Interaction expired - user will need to retry');
        return;
      }
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Erro ao iniciar encomenda.',
          flags: MessageFlags.Ephemeral
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Erro ao iniciar encomenda.'
        });
      }
    } catch (replyError: any) {
      if (replyError?.code === 10062 || replyError?.code === 40060) {
        console.log('Interaction timeout during error handling - ignoring');
      } else {
        console.error('Error sending error message:', replyError);
      }
    }
  }
}

async function handleFirmSelection(interaction: StringSelectMenuInteraction) {
  try {
    const userId = interaction.customId.split('_')[2];
    if (userId !== interaction.user.id) return;

    const guildId = interaction.guildId;
    if (!guildId) return;

    const session = activeOrderSessions.get(userId);
    if (!session) {
      await interaction.reply({
        content: '❌ Sessão expirada. Por favor, comece novamente.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const config = await OrdersService.getConfig(guildId);
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
    const debugInfo = {
      totalConfigured: firm.supplierUserIds?.length || 0,
      filteredSelf: 0,
      filteredBot: 0,
      fetchFailed: 0,
      success: 0
    };

    console.log(`🔍 Firm "${firm.name}" has ${debugInfo.totalConfigured} configured suppliers: ${firm.supplierUserIds?.join(', ')}`);
    console.log(`🔍 User requesting order: ${interaction.user.id} (${interaction.user.username})`);

    for (const supplierId of firm.supplierUserIds || []) {
      try {
        if (supplierId === interaction.user.id) {
          console.log(`⚠️ Filtered out ${supplierId} (you can't order from yourself)`);
          debugInfo.filteredSelf++;
          continue;
        }

        const member = await guild.members.fetch(supplierId);
        if (!member) {
          console.log(`❌ Failed to fetch member ${supplierId}`);
          debugInfo.fetchFailed++;
          continue;
        }

        if (member.user.bot) {
          console.log(`⚠️ Filtered out ${supplierId} (${member.user.username}) - is a bot`);
          debugInfo.filteredBot++;
          continue;
        }

        suppliers.push(member);
        debugInfo.success++;
        console.log(`✅ Added supplier: ${member.user.username} (${supplierId})`);
      } catch (error) {
        console.error(`❌ Error fetching user ${supplierId}:`, error);
        debugInfo.fetchFailed++;
      }
    }

    console.log(`📊 Supplier filtering results:`, debugInfo);

    if (suppliers.length === 0) {
      let errorMessage = config.messages.noSuppliersAvailable;

      // Provide more specific error message
      if (debugInfo.totalConfigured === 0) {
        errorMessage = `❌ Nenhum fornecedor configurado para **${firm.name}**.\n\nPor favor, configure fornecedores no painel web.`;
      } else if (debugInfo.filteredSelf > 0 && debugInfo.filteredSelf === debugInfo.totalConfigured) {
        errorMessage = `❌ Você não pode fazer encomendas para si mesmo.\n\nVocê é o único fornecedor configurado para **${firm.name}**.`;
      } else if (debugInfo.fetchFailed === debugInfo.totalConfigured) {
        errorMessage = `❌ Erro ao buscar fornecedores para **${firm.name}**.\n\nOs fornecedores configurados podem ter saído do servidor.`;
      }

      await interaction.update({
        content: errorMessage,
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
      .addOptions(options)
      .setMinValues(1)
      .setMaxValues(Math.min(suppliers.length, 25)); // Allow selecting multiple suppliers

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    await interaction.update({
      embeds: [embed],
      components: [row]
    });
  } catch (error: any) {
    console.error('Error handling firm selection:', error);
    try {
      if (error?.code === 10062 || error?.message?.includes('Unknown interaction')) {
        console.log('Interaction expired during firm selection');
        return;
      }
      await interaction.update({
        content: '❌ Erro ao processar seleção da firma.',
        embeds: [],
        components: []
      });
    } catch (updateError: any) {
      if (updateError?.code === 10062 || updateError?.code === 40060) {
        console.log('Interaction timeout during firm selection error handling');
      } else {
        console.error('Error updating interaction:', updateError);
      }
    }
  }
}

async function handleSupplierSelection(interaction: StringSelectMenuInteraction) {
  try {
    const userId = interaction.customId.split('_')[2];
    if (userId !== interaction.user.id) return;

    const guildId = interaction.guildId;
    if (!guildId) return;

    const session = activeOrderSessions.get(userId);
    if (!session || !session.firmId) {
      await interaction.reply({
        content: '❌ Sessão expirada. Por favor, comece novamente.',
        flags: MessageFlags.Ephemeral
      });
      activeOrderSessions.delete(userId);
      return;
    }

    const config = await OrdersService.getConfig(guildId);
    if (!config) return;

    const supplierIds = interaction.values; // Get ALL selected supplier IDs
    const guild = interaction.guild;
    if (!guild) return;

    // Fetch all selected suppliers
    const suppliers = [];
    for (const supplierId of supplierIds) {
      try {
        const member = await guild.members.fetch(supplierId);
        if (member) {
          suppliers.push({
            id: member.id,
            name: member.displayName,
            tag: member.user.tag
          });
        }
      } catch (error) {
        console.error(`Error fetching supplier ${supplierId}:`, error);
      }
    }

    if (suppliers.length === 0) {
      await interaction.update({
        content: '❌ Nenhum fornecedor encontrado.',
        embeds: [],
        components: []
      });
      activeOrderSessions.delete(userId);
      return;
    }

    session.suppliers = suppliers;
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
  } catch (error: any) {
    console.error('Error handling supplier selection:', error);
    try {
      if (error?.code === 10062 || error?.message?.includes('Unknown interaction')) {
        console.log('Interaction expired during supplier selection');
        return;
      }
      await interaction.update({
        content: '❌ Erro ao processar seleção do fornecedor.',
        embeds: [],
        components: []
      });
    } catch (updateError: any) {
      if (updateError?.code === 10062 || updateError?.code === 40060) {
        console.log('Interaction timeout during supplier selection error handling');
      } else {
        console.error('Error updating interaction:', updateError);
      }
    }
  }
}

async function handleOrderDetailsSubmit(interaction: ModalSubmitInteraction) {
  try {
    // CRITICAL: Defer reply IMMEDIATELY to prevent timeout
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.customId.split('_')[3];
    if (userId !== interaction.user.id) return;

    const guildId = interaction.guildId;
    if (!guildId) return;

    const session = activeOrderSessions.get(userId);
    if (!session || !session.firmId || !session.suppliers || session.suppliers.length === 0) {
      await interaction.editReply({
        content: '❌ Sessão expirada. Por favor, comece novamente.'
      });
      activeOrderSessions.delete(userId);
      return;
    }

    const config = await OrdersService.getConfig(guildId);
    if (!config) return;

    const itemName = interaction.fields.getTextInputValue('item_name');
    const quantityStr = interaction.fields.getTextInputValue('item_quantity');
    const notes = interaction.fields.getTextInputValue('order_notes') || undefined;

    const quantity = parseInt(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
      await interaction.editReply({
        content: '❌ Quantidade inválida. Por favor, insira um número válido maior que 0.'
      });
      return;
    }

    // Create ONE order with ALL selected suppliers
    const order = await OrdersService.createOrder(guildId, {
      customerId: interaction.user.id,
      customerName: interaction.user.username,
      customerDiscordTag: interaction.user.tag,
      supplierIds: session.suppliers.map(s => s.id),
      supplierNames: session.suppliers.map(s => s.name),
      supplierDiscordTags: session.suppliers.map(s => s.tag),
      firmId: session.firmId,
      firmName: session.firmName!,
      itemName,
      itemQuantity: quantity,
      notes
    });

    if (!order) {
      await interaction.editReply({
        content: '❌ Erro ao criar encomenda.'
      });
      return;
    }

    // Build success embed
    const embed = new EmbedBuilder()
      .setTitle('✅ Encomenda Criada com Sucesso!')
      .setColor('#00FF00')
      .setDescription(`Sua encomenda foi enviada para ${session.suppliers.length} fornecedor(es)`)
      .addFields(
        { name: '\u200B', value: '**📋 Detalhes da Encomenda**', inline: false },
        { name: '🆔 ID', value: `\`${order.orderId}\``, inline: true },
        { name: '🏢 Firma', value: session.firmName!, inline: true },
        { name: '📊 Status', value: '⏳ **Pendente**', inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '📦 Item', value: `**${quantity}x** ${itemName}`, inline: true },
        {
          name: '👥 Fornecedores',
          value: session.suppliers.map(s => s.name).join(', '),
          inline: true
        }
      )
      .setFooter({ text: 'Você receberá uma notificação quando algum fornecedor responder.' })
      .setTimestamp();

    if (notes) {
      embed.addFields(
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '📝 Observações', value: `> ${notes}`, inline: false }
      );
    }

    await interaction.editReply({
      embeds: [embed]
    });

    activeOrderSessions.delete(userId);

  } catch (error: any) {
    console.error('Error submitting order:', error);

    const guildId = interaction.guildId;
    const config = guildId ? await OrdersService.getConfig(guildId) : null;
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

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: errorMessage
        });
      } else {
        await interaction.reply({
          content: errorMessage,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }

    activeOrderSessions.delete(interaction.user.id);
  }
}

async function handleOrderAccept(interaction: ButtonInteraction) {
  try {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const orderId = interaction.customId.split('_')[2];

    const updated = await OrdersService.updateOrderStatus(
      guildId,
      orderId,
      'accepted',
      interaction.user.id
    );

    if (!updated) {
      await interaction.reply({
        content: '❌ Encomenda não encontrada.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Encomenda Aceita')
      .setColor('#00FF00')
      .setDescription(`Você aceitou a encomenda \`${updated.orderId}\`\n\nO cliente foi notificado. Quando estiver pronto, use os botões abaixo para atualizar o status.`)
      .addFields(
        { name: '\u200B', value: '**📋 Detalhes da Encomenda**', inline: false },
        { name: '👤 Cliente', value: updated.customerName, inline: true },
        { name: '📦 Item', value: `**${updated.itemQuantity}x** ${updated.itemName}`, inline: true },
        { name: '📊 Status', value: '✅ **Aceita**', inline: true }
      )
      .setFooter({ text: `Aceita em ${new Date().toLocaleString('pt-BR')}` })
      .setTimestamp();

    // Add buttons for next actions
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`order_ready_${orderId}`)
          .setLabel('Pronto para Retirar')
          .setEmoji('📦')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`order_complete_${orderId}`)
          .setLabel('Marcar como Concluído')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      );

    await interaction.update({
      embeds: [embed],
      components: [row]
    });

  } catch (error: any) {
    console.error('Error accepting order:', error);
    
    if (error.message === 'Unauthorized to update this order') {
      await interaction.reply({
        content: '❌ Você não tem permissão para aceitar esta encomenda.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Erro ao aceitar encomenda.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleOrderReject(interaction: ButtonInteraction) {
  try {
    const orderId = interaction.customId.split('_')[2];

    // Show modal asking for rejection reason
    const modal = new ModalBuilder()
      .setCustomId(`order_reject_reason_${orderId}`)
      .setTitle('Rejeitar Encomenda');

    const reasonInput = new TextInputBuilder()
      .setCustomId('rejection_reason')
      .setLabel('Motivo da Rejeição')
      .setPlaceholder('Ex: Item fora de estoque, preço muito alto, não trabalho com esse item...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(5)
      .setMaxLength(500);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
    modal.addComponents(row);

    await interaction.showModal(modal);

  } catch (error: any) {
    console.error('Error showing rejection modal:', error);
    await interaction.reply({
      content: '❌ Erro ao processar rejeição.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleOrderRejectModal(interaction: ModalSubmitInteraction) {
  try {
    await interaction.deferUpdate();

    const guildId = interaction.guildId;
    if (!guildId) return;

    const orderId = interaction.customId.split('_')[3]; // order_reject_reason_{orderId}
    const reason = interaction.fields.getTextInputValue('rejection_reason');

    const updated = await OrdersService.updateOrderStatus(
      guildId,
      orderId,
      'rejected',
      interaction.user.id,
      reason
    );

    if (!updated) {
      await interaction.followUp({
        content: '❌ Encomenda não encontrada.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('❌ Encomenda Rejeitada')
      .setColor('#FF0000')
      .setDescription(`Você rejeitou a encomenda \`${updated.orderId}\`\n\nO cliente foi notificado com o motivo da rejeição.`)
      .addFields(
        { name: '\u200B', value: '**📋 Detalhes da Encomenda**', inline: false },
        { name: '👤 Cliente', value: updated.customerName, inline: true },
        { name: '📦 Item', value: `**${updated.itemQuantity}x** ${updated.itemName}`, inline: true },
        { name: '📊 Status', value: '❌ **Rejeitada**', inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '📝 Motivo', value: `> ${reason}`, inline: false }
      )
      .setFooter({ text: `Rejeitada em ${new Date().toLocaleString('pt-BR')}` })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      components: []
    });

  } catch (error: any) {
    console.error('Error processing rejection:', error);

    if (error.message === 'Unauthorized to update this order') {
      await interaction.followUp({
        content: '❌ Você não tem permissão para rejeitar esta encomenda.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.followUp({
        content: '❌ Erro ao rejeitar encomenda.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleOrderReadyForPickup(interaction: ButtonInteraction) {
  try {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const orderId = interaction.customId.split('_')[2]; // order_ready_{orderId}

    const updated = await OrdersService.updateOrderStatus(
      guildId,
      orderId,
      'in_progress',
      interaction.user.id
    );

    if (!updated) {
      await interaction.reply({
        content: '❌ Encomenda não encontrada.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('📦 Encomenda Pronta para Retirada')
      .setColor('#FFA500')
      .setDescription(`A encomenda \`${updated.orderId}\` está pronta!\n\nO cliente foi notificado e pode vir retirar.`)
      .addFields(
        { name: '\u200B', value: '**📋 Detalhes da Encomenda**', inline: false },
        { name: '👤 Cliente', value: updated.customerName, inline: true },
        { name: '📦 Item', value: `**${updated.itemQuantity}x** ${updated.itemName}`, inline: true },
        { name: '📊 Status', value: '📦 **Pronta**', inline: true }
      )
      .setFooter({ text: `Marcada como pronta em ${new Date().toLocaleString('pt-BR')}` })
      .setTimestamp();

    // Only show "Mark as Completed" button now
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`order_complete_${orderId}`)
          .setLabel('Marcar como Concluído')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      );

    await interaction.update({
      embeds: [embed],
      components: [row]
    });

  } catch (error: any) {
    console.error('Error marking order ready:', error);

    if (error.message === 'Unauthorized to update this order') {
      await interaction.reply({
        content: '❌ Você não tem permissão para atualizar esta encomenda.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Erro ao atualizar status da encomenda.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleOrderComplete(interaction: ButtonInteraction) {
  try {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const orderId = interaction.customId.split('_')[2]; // order_complete_{orderId}

    const updated = await OrdersService.updateOrderStatus(
      guildId,
      orderId,
      'completed',
      interaction.user.id
    );

    if (!updated) {
      await interaction.reply({
        content: '❌ Encomenda não encontrada.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🎉 Encomenda Concluída')
      .setColor('#00FF00')
      .setDescription(`A encomenda \`${updated.orderId}\` foi concluída com sucesso!\n\nO cliente foi notificado.`)
      .addFields(
        { name: '\u200B', value: '**📋 Detalhes da Encomenda**', inline: false },
        { name: '👤 Cliente', value: updated.customerName, inline: true },
        { name: '📦 Item', value: `**${updated.itemQuantity}x** ${updated.itemName}`, inline: true },
        { name: '📊 Status', value: '✅ **Concluída**', inline: true }
      )
      .setFooter({ text: `Concluída em ${new Date().toLocaleString('pt-BR')}` })
      .setTimestamp();

    await interaction.update({
      embeds: [embed],
      components: [] // Remove all buttons
    });

  } catch (error: any) {
    console.error('Error completing order:', error);

    if (error.message === 'Unauthorized to update this order') {
      await interaction.reply({
        content: '❌ Você não tem permissão para atualizar esta encomenda.',
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.reply({
        content: '❌ Erro ao concluir encomenda.',
        flags: MessageFlags.Ephemeral
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