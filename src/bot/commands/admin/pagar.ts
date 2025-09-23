import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  MessageFlags
} from 'discord.js';
import { promises as fs } from 'fs';
import path from 'path';
import { WorkerChannelService } from '../../../services/WorkerChannelService';
import { ManagerMoneyVerificationService } from '../../../services/ManagerMoneyVerificationService';
import { PaymentConfigService } from '../../../services/PaymentConfigService';

// Store temporary payment data
const paymentSessions = new Map<string, any>();

export default {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Process payment for completed services')
    .addUserOption(option =>
      option.setName('worker')
        .setDescription('Select worker/manager to pay (supports @mentions)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  name: 'pagar', // Add name property for cooldown tracking
  cooldown: 5, // 5 second cooldown

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const selectedUser = interaction.options.getUser('worker', true);

      // Verify user has required roles
      if (!interaction.guild) {
        await interaction.reply({
          content: '❌ Este comando deve ser usado em um servidor.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Load payment configuration
      const paymentConfigService = PaymentConfigService.getInstance();
      const defaultPrices = await paymentConfigService.getDefaultPrices();

      const member = await interaction.guild.members.fetch(selectedUser.id);
      const userRoleIds = member.roles.cache.map((role: any) => role.id);
      const hasRequiredRole = await paymentConfigService.validateManagerRole(userRoleIds);

      if (!hasRequiredRole) {
        await interaction.reply({
          content: `❌ ${selectedUser.username} não possui as funções necessárias (Manager ou Worker).`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Store worker info and show service details modal
      const sessionId = interaction.user.id;
      paymentSessions.set(sessionId, {
        payerId: interaction.user.id,
        payerName: interaction.user.username,
        workerId: selectedUser.id,
        workerName: selectedUser.username,
        workerDisplayName: member.nickname || selectedUser.displayName || selectedUser.username,
        channelId: interaction.channelId,
        timestamp: new Date()
      });

      // Create service details modal
      const modal = new ModalBuilder()
        .setCustomId(`payment_services_${sessionId}`)
        .setTitle(`Pagamento: ${member.nickname || selectedUser.username}`);

      // Plants section - quantity and price
      const plantsQuantity = new TextInputBuilder()
        .setCustomId('plants_quantity')
        .setLabel('🌾 Plantas - Quantidade')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('ex: 1000')
        .setRequired(false);

      const plantsPrice = new TextInputBuilder()
        .setCustomId('plants_price')
        .setLabel('🌾 Plantas - Preço por unidade ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(defaultPrices.plants.toString())
        .setValue(defaultPrices.plants.toString()) // Default value from config
        .setRequired(false);

      // Animals section - quantity and price
      const animalsQuantity = new TextInputBuilder()
        .setCustomId('animals_quantity')
        .setLabel('🐄 Animais - Serviços')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('ex: 5')
        .setRequired(false);

      const animalsPrice = new TextInputBuilder()
        .setCustomId('animals_price')
        .setLabel('🐄 Animais - Preço por serviço ($)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(defaultPrices.animals.toString())
        .setValue(defaultPrices.animals.toString()) // Default value from config
        .setRequired(false);

      // Ferrovia section - combined format (quantity:price)
      const ferroviaData = new TextInputBuilder()
        .setCustomId('ferrovia_data')
        .setLabel('🚂 Ferrovia - Missões:Preço')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`ex: 3:${defaultPrices.ferrovia} (missões:preço por missão)`)
        .setRequired(false);

      // Create rows (5 components - Discord limit)
      const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(plantsQuantity);
      const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(plantsPrice);
      const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(animalsQuantity);
      const row4 = new ActionRowBuilder<TextInputBuilder>().addComponents(animalsPrice);
      const row5 = new ActionRowBuilder<TextInputBuilder>().addComponents(ferroviaData);

      modal.addComponents(row1, row2, row3, row4, row5);

      await interaction.showModal(modal);
      console.log(`📋 Service details modal shown for ${selectedUser.username} by ${interaction.user.username}`);

    } catch (error) {
      console.error('Error in pagar command:', error);
      await interaction.reply({
        content: '❌ Erro ao processar comando de pagamento.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

// Handle service details modal submission
export async function handlePaymentServicesModal(interaction: ModalSubmitInteraction) {
  try {
    const sessionId = interaction.user.id;
    const paymentData = paymentSessions.get(sessionId);

    if (!paymentData) {
      await interaction.reply({
        content: '❌ Sessão de pagamento expirada. Tente novamente.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Extract service data from modal with editable prices
    const services = [];
    let totalAmount = 0;

    // Plants - with editable price
    const plantsQty = interaction.fields.getTextInputValue('plants_quantity').trim();
    const plantsPriceStr = interaction.fields.getTextInputValue('plants_price').trim();
    if (plantsQty && plantsPriceStr) {
      const quantity = parseInt(plantsQty);
      const unitPrice = parseFloat(plantsPriceStr);
      if (!isNaN(quantity) && !isNaN(unitPrice) && quantity > 0 && unitPrice > 0) {
        const amount = quantity * unitPrice;
        services.push({
          type: 'Plants',
          quantity,
          amount,
          unitPrice
        });
        totalAmount += amount;
      }
    }

    // Animals - with editable price
    const animalsQty = interaction.fields.getTextInputValue('animals_quantity').trim();
    const animalsPriceStr = interaction.fields.getTextInputValue('animals_price').trim();
    if (animalsQty && animalsPriceStr) {
      const quantity = parseInt(animalsQty);
      const unitPrice = parseFloat(animalsPriceStr);
      if (!isNaN(quantity) && !isNaN(unitPrice) && quantity > 0 && unitPrice > 0) {
        const amount = quantity * unitPrice;
        services.push({
          type: 'Animals',
          quantity,
          amount,
          unitPrice
        });
        totalAmount += amount;
      }
    }

    // Ferrovia - parse combined format (quantity:price)
    const ferroviaData = interaction.fields.getTextInputValue('ferrovia_data').trim();
    if (ferroviaData) {
      const ferroviaMatch = ferroviaData.match(/(\d+)[\s:,]+(\d+(?:\.\d+)?)/);
      if (ferroviaMatch) {
        const quantity = parseInt(ferroviaMatch[1]);
        const unitPrice = parseFloat(ferroviaMatch[2]);
        if (!isNaN(quantity) && !isNaN(unitPrice) && quantity > 0 && unitPrice > 0) {
          const amount = quantity * unitPrice;
          services.push({
            type: 'Ferrovia',
            quantity,
            amount,
            unitPrice
          });
          totalAmount += amount;
        }
      }
    }

    if (services.length === 0) {
      await interaction.reply({
        content: '❌ Nenhum serviço válido foi preenchido. Por favor, preencha pelo menos um serviço com quantidade e valor.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Process payment with current services
    await processPayment(interaction, paymentData, services, totalAmount);

  } catch (error) {
    console.error('Error handling payment services modal:', error);
    await interaction.reply({
      content: '❌ Erro ao processar detalhes do serviço.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// Process the final payment and create receipts
async function processPayment(interaction: ModalSubmitInteraction, paymentData: any, services: any[], totalAmount: number) {
  try {
    // Generate receipt ID
    const receiptId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check for recent inventory withdrawal for accountability tracking
    const moneyService = ManagerMoneyVerificationService.getInstance();

    // Check if manager has withdrawn money recently (last 30 minutes)
    const recentWithdrawals = moneyService.getRecentManagerWithdrawals(paymentData.payerId, 30);
    const matchingWithdrawal = moneyService.findMatchingWithdrawal(paymentData.payerId, totalAmount);

    let inventoryWithdrawal = 0;
    let inventoryVerified = false;
    let owedToFarm = 0;

    if (!matchingWithdrawal) {
      // No exact match found
      if (recentWithdrawals.length === 0) {
        // No withdrawal at all - block payment
        await interaction.reply({
          content: `❌ **PAGAMENTO BLOQUEADO**\n\n` +
                   `Você deve retirar **$${totalAmount.toFixed(2)}** do inventário antes de processar este pagamento.\n` +
                   `Por favor, retire o valor exato e tente novamente.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Wrong amount withdrawn - calculate what they owe
      const totalWithdrawn = recentWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      inventoryWithdrawal = totalWithdrawn;
      owedToFarm = totalAmount - totalWithdrawn;

      console.log(`⚠️ Wrong withdrawal amount: withdrew $${totalWithdrawn}, paying $${totalAmount}, owes $${owedToFarm}`);
    } else {
      // Perfect match found
      inventoryWithdrawal = matchingWithdrawal.amount;
      inventoryVerified = true;

      console.log(`✅ Verified withdrawal: $${inventoryWithdrawal} matches payment $${totalAmount}`);
    }

    // Create payment record
    const paymentRecord = {
      receiptId,
      payerId: paymentData.payerId,
      payerName: paymentData.payerName,
      workerId: paymentData.workerId,
      workerName: paymentData.workerName,
      workerDisplayName: paymentData.workerDisplayName,
      services,
      totalAmount,
      channelId: paymentData.channelId,
      timestamp: new Date().toISOString(),
      status: 'pending_verification', // Waiting for farm owner verification
      inventoryWithdrawal, // Actual amount withdrawn from inventory
      inventoryVerified, // Whether withdrawal matches payment
      owedToFarm // Amount owed to farm (if any)
    };

    // Save receipt
    await savePaymentReceipt(paymentRecord);

    // Create receipt embed
    const receiptEmbed = createReceiptEmbed(paymentRecord);

    // Create farm owner verification button
    const verifyButton = new ButtonBuilder()
      .setCustomId(`payment_verify_${receiptId}`)
      .setLabel('✅ Verificar Pagamento')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(verifyButton);

    // Send main receipt with verification button
    await interaction.reply({
      content: `💰 **Pagamento Criado - Aguardando Verificação**\n🆔 **Recibo:** \`${receiptId}\`\n\n*Apenas proprietários da fazenda podem verificar este pagamento.*`,
      embeds: [receiptEmbed],
      components: [row]
    });

    // Send receipt to worker channel
    await sendWorkerReceipt(interaction, paymentRecord);

    // Clean up session
    paymentSessions.delete(interaction.user.id);

    console.log(`✅ Payment created: ${receiptId} for ${paymentData.workerDisplayName} by ${paymentData.payerName}`);

  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

// Create receipt embed
function createReceiptEmbed(paymentRecord: any): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('💰 Recibo de Pagamento')
    .setColor(0x00FF00)
    .addFields(
      { name: '👤 Trabalhador', value: paymentRecord.workerDisplayName, inline: true },
      { name: '💵 Valor Total', value: `$${paymentRecord.totalAmount.toFixed(2)}`, inline: true },
      { name: '👨‍💼 Processado por', value: paymentRecord.payerName, inline: true }
    )
    .setTimestamp(new Date(paymentRecord.timestamp))
    .setFooter({ text: `ID: ${paymentRecord.receiptId}` });

  // Add services details with pricing breakdown
  const servicesText = paymentRecord.services.map((service: any) => {
    const unitText = service.type === 'Plants' ? 'plantas' :
                     service.type === 'Animals' ? 'serviços' : 'missões';
    return `**${service.type}:** ${service.quantity} ${unitText} × $${service.unitPrice.toFixed(2)} = $${service.amount.toFixed(2)}`;
  }).join('\n');

  embed.addFields({ name: '📋 Serviços Detalhados', value: servicesText, inline: false });

  // Add inventory accountability section
  if (paymentRecord.inventoryWithdrawal !== undefined) {
    let accountabilityText = '';

    if (paymentRecord.inventoryVerified) {
      // Perfect match - verified transaction
      accountabilityText =
        `✅ **Retirado do Inventário:** $${paymentRecord.inventoryWithdrawal.toFixed(2)}\n` +
        `💸 **Pago ao Trabalhador:** $${paymentRecord.totalAmount.toFixed(2)}\n` +
        `📊 **Status:** Verificado ✅`;
    } else if (paymentRecord.owedToFarm > 0) {
      // Under-withdrawal - owes money to farm
      accountabilityText =
        `⚠️ **Retirado do Inventário:** $${paymentRecord.inventoryWithdrawal.toFixed(2)}\n` +
        `💸 **Pago ao Trabalhador:** $${paymentRecord.totalAmount.toFixed(2)}\n` +
        `🚨 **DEVE À FAZENDA:** $${paymentRecord.owedToFarm.toFixed(2)}`;
    } else if (paymentRecord.owedToFarm < 0) {
      // Over-withdrawal - has credit
      const credit = Math.abs(paymentRecord.owedToFarm);
      accountabilityText =
        `💰 **Retirado do Inventário:** $${paymentRecord.inventoryWithdrawal.toFixed(2)}\n` +
        `💸 **Pago ao Trabalhador:** $${paymentRecord.totalAmount.toFixed(2)}\n` +
        `💵 **Crédito Restante:** $${credit.toFixed(2)}`;
    }

    embed.addFields({
      name: '🏦 Rastreamento de Inventário',
      value: accountabilityText,
      inline: false
    });
  }

  return embed;
}

// Create simplified worker receipt (without accountability tracking)
function createWorkerReceiptEmbed(paymentRecord: any): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('💰 Recibo de Pagamento Recebido')
    .setColor(0x00FF00)
    .addFields(
      { name: '💵 Valor Recebido', value: `$${paymentRecord.totalAmount.toFixed(2)}`, inline: true },
      { name: '👨‍💼 Processado por', value: paymentRecord.payerName, inline: true }
    )
    .setTimestamp(new Date(paymentRecord.timestamp))
    .setFooter({ text: `ID: ${paymentRecord.receiptId}` });

  // Add services details for worker
  const servicesText = paymentRecord.services.map((service: any) => {
    const unitText = service.type === 'Plants' ? 'plantas' :
                     service.type === 'Animals' ? 'serviços' : 'missões';
    return `**${service.type}:** ${service.quantity} ${unitText} × $${service.unitPrice.toFixed(2)} = $${service.amount.toFixed(2)}`;
  }).join('\n');

  embed.addFields({ name: '📋 Serviços Concluídos', value: servicesText, inline: false });

  return embed;
}

// Send receipt to worker's channel
async function sendWorkerReceipt(interaction: ModalSubmitInteraction, paymentRecord: any) {
  try {
    // Get worker channel using existing service
    const workerChannelService = WorkerChannelService.getInstance(interaction.client);
    const workerMapping = workerChannelService.getWorkerChannel(paymentRecord.workerId);

    if (!workerMapping) {
      console.log(`⚠️ No worker channel mapping found for ${paymentRecord.workerDisplayName}`);

      // Update main receipt to show no worker channel found
      if (interaction.channel && interaction.channel.isTextBased()) {
        await interaction.followUp({
          content: `⚠️ **Aviso:** Canal do trabalhador não encontrado para ${paymentRecord.workerDisplayName}. Recibo enviado apenas neste canal.`,
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    // Create simplified worker receipt
    const workerReceiptEmbed = createWorkerReceiptEmbed(paymentRecord);

    // Send receipt to worker channel
    const workerChannel = await interaction.client.channels.fetch(workerMapping.channelId);
    if (workerChannel && workerChannel.isTextBased() && 'send' in workerChannel) {
      await workerChannel.send({
        content: `💰 **Recibo de Pagamento Recebido**\n👨‍💼 **Processado por:** ${paymentRecord.payerName}`,
        embeds: [workerReceiptEmbed]
      });
      console.log(`✅ Worker receipt sent to channel: ${workerMapping.channelId}`);
    }

  } catch (error) {
    console.error('Error sending worker receipt:', error);
  }
}

// Save payment receipt to file
async function savePaymentReceipt(paymentRecord: any): Promise<void> {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'payment-receipts');

    // Ensure directory exists
    if (!require('fs').existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }

    const filename = `${paymentRecord.receiptId}.json`;
    const filepath = path.join(dataDir, filename);

    await fs.writeFile(filepath, JSON.stringify(paymentRecord, null, 2));
    console.log(`💾 Payment receipt saved: ${filename}`);
  } catch (error) {
    console.error('Error saving payment receipt:', error);
    throw error;
  }
}

// Handle farm owner verification
export async function handlePaymentVerification(interaction: any) {
  try {
    // Extract receipt ID from custom ID
    const receiptId = interaction.customId.replace('payment_verify_', '');

    // Check if user has farm owner role using configuration
    const paymentConfigService = PaymentConfigService.getInstance();
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const userRoleIds = member.roles.cache.map((role: any) => role.id);
    const hasFarmOwnerRole = await paymentConfigService.validateFarmOwnerRole(userRoleIds);

    if (!hasFarmOwnerRole) {
      await interaction.reply({
        content: '❌ Apenas proprietários da fazenda podem verificar pagamentos.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Load and update receipt
    const dataDir = path.join(process.cwd(), 'data', 'payment-receipts');
    const filepath = path.join(dataDir, `${receiptId}.json`);

    if (!require('fs').existsSync(filepath)) {
      await interaction.reply({
        content: '❌ Recibo não encontrado.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const paymentRecord = JSON.parse(require('fs').readFileSync(filepath, 'utf-8'));
    paymentRecord.status = 'verified';
    paymentRecord.verifiedBy = interaction.user.username;
    paymentRecord.verifiedAt = new Date().toISOString();

    // Save updated receipt
    require('fs').writeFileSync(filepath, JSON.stringify(paymentRecord, null, 2));

    // Update the message to show verified status
    const verifiedEmbed = createReceiptEmbed(paymentRecord)
      .setColor(0x00FF00)
      .addFields({ name: '✅ Verificado por', value: interaction.user.username, inline: true });

    await interaction.update({
      content: `✅ **Pagamento Verificado e Aprovado**\n🆔 **Recibo:** \`${receiptId}\``,
      embeds: [verifiedEmbed],
      components: [] // Remove the verify button
    });

    console.log(`✅ Payment verified: ${receiptId} by ${interaction.user.username}`);

  } catch (error) {
    console.error('Error handling payment verification:', error);
    await interaction.reply({
      content: '❌ Erro ao verificar pagamento.',
      flags: MessageFlags.Ephemeral
    });
  }
}