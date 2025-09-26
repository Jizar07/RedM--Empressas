import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import axios from 'axios';
import config from '../config/config';
import PaymentAuditService from '../services/PaymentAuditService';

export async function handleWorkerPayment(interaction: ButtonInteraction): Promise<any> {
  try {
    // Extract worker ID from custom ID
    const workerId = interaction.customId.replace('worker_pay_', '');
    
    console.log(`💰 Manager ${interaction.user.username} is paying worker ${workerId}`);
    
    // Check if user has permission to pay workers
    const hasPermission = await checkManagerPermissions(interaction, 'pay');
    if (!hasPermission) {
      return await interaction.reply({
        content: '❌ Você não tem permissão para pagar trabalhadores.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // NEW: Pre-payment validation - Check if manager has sufficient funds
    try {
      const paymentAuditService = PaymentAuditService.getInstance();

      // First get the worker session to know the payment amount
      const sessionsResponse = await axios.get(`http://localhost:${config.api.port}/api/worker-activity/sessions`, {
        headers: { 'X-Bot-Token': config.discord.token }
      });

      const session = sessionsResponse.data.sessions.find((s: any) => s.workerId === workerId);
      if (!session) {
        return await interaction.editReply({
          content: '❌ Este trabalhador não possui sessão ativa ou já foi pago. Verifique se há atividades recentes para pagar.'
        });
      }

      // Validate manager balance
      const balanceValidation = await paymentAuditService.validateManagerBalance(
        interaction.user.id,
        session.totalCredits
      );

      if (!balanceValidation.canPay) {
        console.log(`❌ Pre-payment validation failed for ${interaction.user.username}: ${balanceValidation.reason}`);

        let errorMessage = `❌ ${balanceValidation.reason}`;
        if (balanceValidation.lastKnownBalance !== undefined) {
          errorMessage += `\n💰 Seu saldo conhecido: $${balanceValidation.lastKnownBalance.toFixed(2)}`;
          errorMessage += `\n💸 Valor necessário: $${session.totalCredits.toFixed(2)}`;
        }

        return await interaction.editReply({
          content: errorMessage
        });
      }

      console.log(`✅ Pre-payment validation passed for ${interaction.user.username} - Can pay $${session.totalCredits}`);

    } catch (validationError) {
      console.error('❌ Error in pre-payment validation:', validationError);
      // Continue with payment if validation fails (non-blocking)
    }

    try {
      // Call the payment API
      const response = await axios.post(
        `http://localhost:${config.api.port}/api/worker-activity/pay/${workerId}`,
        {
          managerId: interaction.user.id,
          managerName: interaction.user.displayName || interaction.user.username
        },
        {
          headers: {
            'X-Bot-Token': config.discord.token
          }
        }
      );

      if (response.data.success) {
        await interaction.editReply({
          content: `✅ Trabalhador pago com sucesso! Uma nova sessão foi iniciada.`
        });

        console.log(`✅ Worker ${workerId} paid successfully by ${interaction.user.username}`);
      } else {
        await interaction.editReply({
          content: `❌ Erro ao pagar trabalhador: ${response.data.error}`
        });
      }

    } catch (apiError: any) {
      console.error('❌ API error during payment:', apiError);

      let errorMessage = 'Erro interno ao processar pagamento.';
      if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      }

      // Enhanced error handling for stale embeds
      if (apiError.response?.status === 404 && apiError.response?.data?.error?.includes('Worker session not found')) {
        errorMessage = 'Este trabalhador já foi pago ou não possui sessão ativa. Este embed está desatualizado.';

        // Try to disable the buttons on this stale embed
        try {
          if (interaction.message && interaction.message.embeds.length > 0) {
            const originalEmbed = interaction.message.embeds[0];
            const updatedEmbed = {
              ...originalEmbed.toJSON(),
              color: 0x0088FF, // Blue for paid status
              title: originalEmbed.title?.replace('📊', '✅') || '✅ Trabalhador - Sessão Paga',
              footer: { text: 'Esta sessão já foi paga e arquivada' }
            };

            await interaction.message.edit({
              embeds: [updatedEmbed],
              components: [] // Remove all buttons
            });

            console.log(`🔧 Updated stale embed for worker ${workerId} to show paid status without buttons`);
          }
        } catch (embedError) {
          console.error('❌ Failed to update stale embed:', embedError);
        }
      }

      await interaction.editReply({
        content: `❌ ${errorMessage}`
      });
    }

  } catch (error) {
    console.error('❌ Error handling worker payment:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Erro interno ao processar pagamento.'
      });
    } else {
      await interaction.reply({
        content: '❌ Erro interno ao processar pagamento.',
        ephemeral: true
      });
    }
  }
}

export async function handleWorkerEdit(interaction: ButtonInteraction): Promise<any> {
  try {
    // Check permissions
    const hasPermission = await checkManagerPermissions(interaction, 'edit');
    if (!hasPermission) {
      return await interaction.reply({
        content: '❌ Você não tem permissão para editar atividades de trabalhadores.',
        ephemeral: true
      });
    }

    const workerId = interaction.customId.replace('worker_edit_', '');

    // Get worker session to show available transactions
    const response = await axios.get(`http://localhost:${config.api.port}/api/worker-activity/sessions`, {
      headers: { 'X-Bot-Token': config.discord.token }
    });

    const session = response.data.sessions.find((s: any) => s.workerId === workerId);
    if (!session) {
      return await interaction.reply({
        content: '❌ Sessão do trabalhador não encontrada.',
        ephemeral: true
      });
    }

    // Collect all transactions
    const allTransactions = [
      ...session.plantTransactions.map((t: any) => ({...t, category: 'plant'})),
      ...session.animalTransactions.map((t: any) => ({...t, category: 'animal'}))
    ];

    if (allTransactions.length === 0) {
      return await interaction.reply({
        content: '❌ Nenhuma transação encontrada para editar.',
        ephemeral: true
      });
    }

    // Create embed with transaction list
    const embed = new EmbedBuilder()
      .setTitle(`🔧 Gerenciar Transações - ${session.workerName}`)
      .setDescription('Clique nos botões abaixo para editar ou deletar transações específicas.')
      .setColor(0x0099FF);

    let fieldValue = '';
    allTransactions.forEach((transaction: any, index: number) => {
      const emoji = transaction.category === 'plant'
        ? (transaction.type === 'seed_taken' ? '🌱' : '🌾')
        : '🐄';

      const displayText = transaction.category === 'plant'
        ? `${emoji} ${transaction.itemName} x${transaction.quantity}`
        : `${emoji} ${transaction.animalType} x${transaction.quantity} - $${transaction.amount}`;

      fieldValue += `**${index + 1}.** ${displayText}\n`;
    });

    embed.addFields({
      name: '📋 Transações Disponíveis',
      value: fieldValue.substring(0, 1024) // Discord field limit
    });

    // Create buttons for each transaction (max 25 buttons total due to Discord limits)
    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    const maxButtons = Math.min(allTransactions.length, 20); // Leave room for navigation if needed

    for (let i = 0; i < maxButtons; i += 5) { // 5 buttons per row
      const row = new ActionRowBuilder<ButtonBuilder>();

      for (let j = i; j < Math.min(i + 5, maxButtons); j++) {
        const transaction = allTransactions[j];
        const transactionId = transaction.transactionId;

        // Add delete button
        const deleteButton = new ButtonBuilder()
          .setCustomId(`transaction_delete_${workerId}_${transactionId}`)
          .setLabel(`❌ ${j + 1}`)
          .setStyle(ButtonStyle.Danger);

        row.addComponents(deleteButton);
      }

      components.push(row);
    }

    // Add a separate row for edit functionality
    if (maxButtons < 25) {
      const editRow = new ActionRowBuilder<ButtonBuilder>();
      editRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`transaction_edit_modal_${workerId}`)
          .setLabel('✏️ Editar Transação (Modal)')
          .setStyle(ButtonStyle.Secondary)
      );
      components.push(editRow);
    }

    await interaction.reply({
      embeds: [embed],
      components: components,
      ephemeral: true
    });

  } catch (error) {
    console.error('❌ Error handling worker edit:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Erro interno.',
        ephemeral: true
      });
    }
  }
}

export async function handleTransactionDelete(interaction: ButtonInteraction): Promise<any> {
  try {
    await interaction.deferReply({ ephemeral: true });

    // Extract workerId and transactionId from custom ID: transaction_delete_{workerId}_{transactionId}
    const customIdParts = interaction.customId.split('_');
    if (customIdParts.length < 4) {
      return await interaction.editReply({
        content: '❌ Erro no formato do botão.'
      });
    }

    const workerId = customIdParts[2];
    const transactionId = customIdParts.slice(3).join('_'); // Rejoin in case transactionId has underscores

    console.log(`🗑️ Manager ${interaction.user.username} is deleting transaction ${transactionId} for worker ${workerId}`);

    // Check permissions
    const hasPermission = await checkManagerPermissions(interaction, 'edit');
    if (!hasPermission) {
      return await interaction.editReply({
        content: '❌ Você não tem permissão para deletar transações.'
      });
    }

    // Call the delete API
    const deleteResponse = await axios.delete(
      `http://localhost:${config.api.port}/api/worker-activity/transaction/${workerId}/${transactionId}`,
      { headers: { 'X-Bot-Token': config.discord.token } }
    );

    if (deleteResponse.data.success) {
      await interaction.editReply({
        content: `✅ Transação deletada com sucesso! Créditos recalculados automaticamente.`
      });

      console.log(`✅ Transaction ${transactionId} deleted successfully by ${interaction.user.username}`);
    } else {
      await interaction.editReply({
        content: `❌ Erro ao deletar transação: ${deleteResponse.data.error}`
      });
    }

  } catch (error) {
    console.error('❌ Error handling transaction delete:', error);

    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Erro interno ao deletar transação.'
      });
    } else {
      await interaction.reply({
        content: '❌ Erro interno ao deletar transação.',
        ephemeral: true
      });
    }
  }
}

export async function handleTransactionEditModal(interaction: ButtonInteraction): Promise<any> {
  try {
    // Check permissions
    const hasPermission = await checkManagerPermissions(interaction, 'edit');
    if (!hasPermission) {
      return await interaction.reply({
        content: '❌ Você não tem permissão para editar transações.',
        ephemeral: true
      });
    }

    const workerId = interaction.customId.replace('transaction_edit_modal_', '');

    // Create simplified modal for editing
    const modal = new ModalBuilder()
      .setCustomId(`transaction_edit_submit_${workerId}`)
      .setTitle('Editar Transação');

    const transactionIdInput = new TextInputBuilder()
      .setCustomId('transaction_id')
      .setLabel('Número da Transação (1, 2, 3, etc.)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 5')
      .setRequired(true);

    const newNameInput = new TextInputBuilder()
      .setCustomId('new_name')
      .setLabel('Novo nome do item (opcional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Algodão')
      .setRequired(false);

    const editValuesInput = new TextInputBuilder()
      .setCustomId('edit_values')
      .setLabel('Quantidade|Valor - Ex: 15|250.50 (opcional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Nova quantidade|Novo valor em $ (use | para separar)')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(transactionIdInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(newNameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(editValuesInput)
    );

    await interaction.showModal(modal);

  } catch (error) {
    console.error('❌ Error handling transaction edit modal:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Erro interno.',
        ephemeral: true
      });
    }
  }
}

async function checkManagerPermissions(interaction: ButtonInteraction, permissionType: 'pay' | 'edit'): Promise<boolean> {
  try {
    // Get user's roles from Discord
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (!member) return false;
    
    const userRoles = member.roles.cache.map(role => role.name);
    
    // Load farm service configuration for role permissions
    const response = await axios.get(`http://localhost:${config.api.port}/api/farm-service/config`);
    const farmConfig = response.data;
    
    // Determine required roles based on permission type
    let requiredRoles: string[] = [];
    switch (permissionType) {
      case 'pay':
      case 'edit':
        requiredRoles = farmConfig.rolePermissions?.acceptRoles || ['Admin', 'Moderator'];
        break;
    }
    
    // Check if user has any of the required roles
    const hasPermission = requiredRoles.some(roleName => userRoles.includes(roleName));
    
    console.log(`🔐 Permission check for ${interaction.user.username}: ${permissionType} - ${hasPermission ? 'GRANTED' : 'DENIED'}`);
    console.log(`   User roles: [${userRoles.join(', ')}]`);
    console.log(`   Required roles: [${requiredRoles.join(', ')}]`);
    
    return hasPermission;

  } catch (error) {
    console.error('❌ Error checking manager permissions:', error);
    return false;
  }
}

export async function handleTransactionManageSubmit(interaction: ModalSubmitInteraction): Promise<any> {
  try {
    await interaction.deferReply({ ephemeral: true });

    // Handle both old modal format and new simplified format
    let workerId: string;
    let transactionId: string;
    let newName: string;
    let editValues: string;

    if (interaction.customId.includes('transaction_edit_submit_')) {
      // New simplified format
      workerId = interaction.customId.replace('transaction_edit_submit_', '');
      const transactionNumber = interaction.fields.getTextInputValue('transaction_id');
      newName = interaction.fields.getTextInputValue('new_name') || '';
      editValues = interaction.fields.getTextInputValue('edit_values') || '';

      // Get worker session to find transaction by number
      const sessionsResponse = await axios.get(`http://localhost:${config.api.port}/api/worker-activity/sessions`, {
        headers: { 'X-Bot-Token': config.discord.token }
      });

      const session = sessionsResponse.data.sessions.find((s: any) => s.workerId === workerId);
      if (!session) {
        return await interaction.editReply({
          content: '❌ Este trabalhador não possui sessão ativa.'
        });
      }

      // Collect all transactions
      const allTransactions = [
        ...session.plantTransactions,
        ...session.animalTransactions
      ];

      const transactionIndex = parseInt(transactionNumber) - 1;
      if (isNaN(transactionIndex) || transactionIndex < 0 || transactionIndex >= allTransactions.length) {
        return await interaction.editReply({
          content: `❌ Número da transação inválido. Use um número entre 1 e ${allTransactions.length}.`
        });
      }

      transactionId = allTransactions[transactionIndex].transactionId;

    } else {
      // Legacy format (if still in use)
      workerId = interaction.customId.replace('transaction_manage_modal_', '');
      transactionId = interaction.fields.getTextInputValue('transaction_id');
      const action = interaction.fields.getTextInputValue('action').toLowerCase().trim();
      newName = interaction.fields.getTextInputValue('new_name') || '';
      editValues = interaction.fields.getTextInputValue('edit_values') || '';

      if (action !== 'edit') {
        return await interaction.editReply({
          content: '❌ Esta função só suporta edição. Use os botões de delete para deletar transações.'
        });
      }
    }

    // Parse the combined quantity|amount format
    let newQuantity = '';
    let newAmount = '';
    if (editValues.includes('|')) {
      const [quantity, amount] = editValues.split('|');
      newQuantity = quantity ? quantity.trim() : '';
      newAmount = amount ? amount.trim() : '';
    } else if (editValues.trim() !== '') {
      // If no separator, assume it's quantity for plants or amount for animals
      newQuantity = editValues.trim();
    }

    // Validate edit action - require at least one field
    if ((!newName || newName.trim() === '') && (!newQuantity || newQuantity.trim() === '') && (!newAmount || newAmount.trim() === '')) {
      return await interaction.editReply({
        content: '❌ Para edição, forneça pelo menos um dos seguintes: novo nome, nova quantidade ou novo valor.'
      });
    }

    // Validate quantity format if provided
    let parsedQuantity: number | undefined;
    if (newQuantity && newQuantity.trim() !== '') {
      parsedQuantity = parseInt(newQuantity.trim());
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return await interaction.editReply({
          content: '❌ Quantidade deve ser um número inteiro positivo.'
        });
      }
    }

    // Validate amount format if provided
    let parsedAmount: number | undefined;
    if (newAmount && newAmount.trim() !== '') {
      parsedAmount = parseFloat(newAmount.trim());
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return await interaction.editReply({
          content: '❌ Valor deve ser um número válido maior ou igual a zero.'
        });
      }
    }

    // Edit transaction
    const editPayload: any = {};
    if (newName && newName.trim() !== '') {
      editPayload.newItemName = newName.trim();
    }
    if (parsedQuantity !== undefined) {
      editPayload.newQuantity = parsedQuantity;
    }
    if (parsedAmount !== undefined) {
      editPayload.newAmount = parsedAmount;
    }

    const editResponse = await axios.put(
      `http://localhost:${config.api.port}/api/worker-activity/transaction/${workerId}/${transactionId}`,
      editPayload,
      { headers: { 'X-Bot-Token': config.discord.token }}
    );

    if (editResponse.data.success) {
      let changesSummary: string[] = [];
      if (newName && newName.trim() !== '') {
        changesSummary.push(`Nome: **${newName.trim()}**`);
      }
      if (parsedQuantity !== undefined) {
        changesSummary.push(`Quantidade: **${parsedQuantity}**`);
      }
      if (parsedAmount !== undefined) {
        changesSummary.push(`Valor: **$${parsedAmount.toFixed(2)}**`);
      }

      await interaction.editReply({
        content: `✅ Transação editada com sucesso!\n${changesSummary.join('\n')}`
      });
    } else {
      await interaction.editReply({
        content: `❌ Erro ao editar transação: ${editResponse.data.error}`
      });
    }

  } catch (error) {
    console.error('❌ Error handling transaction manage submit:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Erro interno ao processar gerenciamento de transação.'
      });
    } else {
      await interaction.reply({
        content: '❌ Erro interno ao processar gerenciamento de transação.',
        ephemeral: true
      });
    }
  }
}