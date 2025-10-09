import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuInteraction,
  ModalSubmitInteraction
} from 'discord.js';
import OrdersService, { IOrdersConfig } from '../../../services/OrdersService';

const activeOrders = new Map<string, {
  firmId?: string;
  firmName?: string;
  suppliers?: Array<{
    id: string;
    name: string;
    tag: string;
  }>;
  step: number;
}>();

export default {
  data: new SlashCommandBuilder()
    .setName('encomenda')
    .setDescription('Fazer uma encomenda para outro jogador'),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const guildId = interaction.guildId;
      if (!guildId) {
        await interaction.reply({
          content: '❌ Este comando só pode ser usado em um servidor.',
          ephemeral: true
        });
        return;
      }

      const config = await OrdersService.getConfig(guildId);
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

      const activeUserOrders = await OrdersService.getUserActiveOrders(guildId, interaction.user.id);
      if (activeUserOrders.length >= config.settings.maxActiveOrdersPerUser) {
        await interaction.reply({
          content: formatMessage(config.messages.orderLimitReached, {
            limit: config.settings.maxActiveOrdersPerUser.toString()
          }),
          ephemeral: true
        });
        return;
      }

      activeOrders.set(interaction.user.id, { step: 1 });

      const embed = new EmbedBuilder()
        .setTitle(config.steps.selectFirm.embedTitle)
        .setDescription(config.steps.selectFirm.embedDescription)
        .setColor(config.settings.embedColor as any)
        .setFooter({ text: `Passo 1 de 3` });

      const options = activeFirms.map(firm => ({
        label: firm.name,
        description: firm.description || `Firma: ${firm.name}`,
        value: firm.id,
        emoji: '🏢'
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`order_select_firm_${interaction.user.id}`)
        .setPlaceholder(config.steps.selectFirm.dropdownPlaceholder)
        .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });

      const collector = interaction.channel?.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000
      });

      collector?.on('collect', async (i) => {
        if (i.customId.startsWith('order_select_firm_')) {
          await handleFirmSelection(i as StringSelectMenuInteraction, config);
        } else if (i.customId.startsWith('order_select_supplier_')) {
          await handleSupplierSelection(i as StringSelectMenuInteraction, config, guildId);
        }
      });

      collector?.on('end', () => {
        activeOrders.delete(interaction.user.id);
      });

    } catch (error) {
      console.error('Error executing encomenda command:', error);
      await interaction.reply({
        content: '❌ Ocorreu um erro ao processar sua encomenda.',
        ephemeral: true
      });
    }
  }
};

async function handleFirmSelection(
  interaction: StringSelectMenuInteraction,
  config: IOrdersConfig
) {
  try {
    const firmId = interaction.values[0];
    const firm = config.firms.find(f => f.id === firmId);
    
    if (!firm) {
      await interaction.reply({
        content: '❌ Firma não encontrada.',
        ephemeral: true
      });
      return;
    }

    const orderData = activeOrders.get(interaction.user.id);
    if (!orderData) return;

    orderData.firmId = firmId;
    orderData.firmName = firm.name;
    orderData.step = 2;

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
      activeOrders.delete(interaction.user.id);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(config.steps.selectSupplier.embedTitle)
      .setDescription(config.steps.selectSupplier.embedDescription)
      .setColor(config.settings.embedColor as any)
      .addFields(
        { name: 'Firma Selecionada', value: firm.name, inline: true }
      )
      .setFooter({ text: `Passo 2 de 3` });

    const options = suppliers.slice(0, 25).map(member => ({
      label: member.displayName,
      description: `@${member.user.username}`,
      value: member.id
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`order_select_supplier_${interaction.user.id}`)
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

  } catch (error) {
    console.error('Error handling firm selection:', error);
    await interaction.update({
      content: '❌ Erro ao processar seleção da firma.',
      embeds: [],
      components: []
    });
  }
}

async function handleSupplierSelection(
  interaction: StringSelectMenuInteraction,
  config: IOrdersConfig,
  guildId: string
) {
  try {
    const supplierIds = interaction.values; // Get ALL selected supplier IDs
    const orderData = activeOrders.get(interaction.user.id);
    if (!orderData || !orderData.firmId) return;

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
      await interaction.reply({
        content: '❌ Nenhum fornecedor encontrado.',
        ephemeral: true
      });
      return;
    }

    orderData.suppliers = suppliers;
    orderData.step = 3;

    const modal = new ModalBuilder()
      .setCustomId(`order_details_${interaction.user.id}`)
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

    await interaction.showModal(modal);

    const modalSubmit = await interaction.awaitModalSubmit({
      time: 300000,
      filter: i => i.customId === `order_details_${interaction.user.id}`
    }).catch(() => null);

    if (!modalSubmit) {
      activeOrders.delete(interaction.user.id);
      return;
    }

    await handleOrderSubmit(modalSubmit, orderData, config, guildId);
    activeOrders.delete(interaction.user.id);

  } catch (error) {
    console.error('Error handling supplier selection:', error);
    await interaction.reply({
      content: '❌ Erro ao processar seleção do fornecedor.',
      ephemeral: true
    });
  }
}

async function handleOrderSubmit(
  interaction: ModalSubmitInteraction,
  orderData: any,
  config: IOrdersConfig,
  guildId: string
) {
  try {
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

    // Create orders for ALL selected suppliers
    if (!orderData.suppliers || orderData.suppliers.length === 0) {
      await interaction.reply({
        content: '❌ Nenhum fornecedor selecionado.',
        ephemeral: true
      });
      return;
    }

    const createdOrders = [];
    const failedOrders = [];

    for (const supplier of orderData.suppliers) {
      try {
        const order = await OrdersService.createOrder(guildId, {
          customerId: interaction.user.id,
          customerName: interaction.user.username,
          customerDiscordTag: interaction.user.tag,
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierDiscordTag: supplier.tag,
          firmId: orderData.firmId,
          firmName: orderData.firmName,
          itemName,
          itemQuantity: quantity,
          notes
        });

        if (order) {
          createdOrders.push({ order, supplier });
        } else {
          failedOrders.push(supplier.name);
        }
      } catch (error) {
        console.error(`Error creating order for ${supplier.name}:`, error);
        failedOrders.push(supplier.name);
      }
    }

    if (createdOrders.length === 0) {
      await interaction.reply({
        content: '❌ Erro ao criar encomendas.',
        ephemeral: true
      });
      return;
    }

    // Build success embed with all created orders
    const embed = new EmbedBuilder()
      .setTitle(`✅ ${createdOrders.length} Encomenda(s) Criada(s)!`)
      .setColor('#00FF00')
      .setDescription(`Suas encomendas foram enviadas para ${createdOrders.length} fornecedor(es)`)
      .addFields(
        { name: '\u200B', value: '**📋 Detalhes das Encomendas**', inline: false },
        { name: '🏢 Firma', value: orderData.firmName, inline: true },
        { name: '📦 Item', value: `**${quantity}x** ${itemName}`, inline: true },
        { name: '📊 Status', value: '⏳ **Pendente**', inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        {
          name: '👥 Fornecedores',
          value: createdOrders.map((o, i) => `${i + 1}. **${o.supplier.name}** (ID: \`${o.order.orderId}\`)`).join('\n'),
          inline: false
        }
      )
      .setFooter({ text: 'Você receberá notificações quando os fornecedores responderem.' })
      .setTimestamp();

    if (notes) {
      embed.addFields(
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '📝 Observações', value: `> ${notes}`, inline: false }
      );
    }

    if (failedOrders.length > 0) {
      embed.addFields(
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '⚠️ Falhas', value: `Não foi possível criar encomendas para: ${failedOrders.join(', ')}`, inline: false }
      );
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

  } catch (error: any) {
    console.error('Error submitting order:', error);
    
    let errorMessage = '❌ Erro ao criar encomenda.';
    if (error.message?.includes('Order limit reached')) {
      errorMessage = formatMessage(config.messages.orderLimitReached, {
        limit: config.settings.maxActiveOrdersPerUser.toString()
      });
    } else if (error.message?.includes('Cooldown active')) {
      const minutes = error.message.match(/(\d+) minutes/)?.[1] || '?';
      errorMessage = formatMessage(config.messages.cooldownActive, { minutes });
    }

    await interaction.reply({
      content: errorMessage,
      ephemeral: true
    });
  }
}

function formatMessage(template: string, variables: Record<string, string>): string {
  let formatted = template;
  for (const [key, value] of Object.entries(variables)) {
    formatted = formatted.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return formatted;
}