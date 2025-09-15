import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction
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

    // Create transaction list for editing
    let transactionsList = '';
    let transactionCount = 0;

    // Add plant transactions
    session.plantTransactions.forEach((transaction: any) => {
      transactionCount++;
      const emoji = transaction.type === 'seed_taken' ? '🌱' : '🌾';
      transactionsList += `${transactionCount}. ${emoji} ${transaction.itemName} x${transaction.quantity} (${transaction.transactionId.substring(3, 8)})\n`;
    });

    // Add animal transactions  
    session.animalTransactions.forEach((transaction: any) => {
      transactionCount++;
      const emoji = transaction.type === 'animal_delivery' ? '🐄' : '🐄';
      transactionsList += `${transactionCount}. ${emoji} ${transaction.animalType} x${transaction.quantity} - $${transaction.amount} (${transaction.transactionId.substring(3, 8)})\n`;
    });

    if (transactionCount === 0) {
      return await interaction.reply({
        content: '❌ Nenhuma transação encontrada para editar.',
        ephemeral: true
      });
    }

    // Show modal for transaction management
    const modal = new ModalBuilder()
      .setCustomId(`transaction_manage_modal_${workerId}`)
      .setTitle('Gerenciar Transações');

    const transactionInput = new TextInputBuilder()
      .setCustomId('transaction_id')
      .setLabel('ID da Transação (últimos 5 dígitos)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 8g7h2')
      .setRequired(true);

    const actionInput = new TextInputBuilder()
      .setCustomId('action')  
      .setLabel('Ação (edit/delete)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('edit ou delete')
      .setRequired(true);

    const newNameInput = new TextInputBuilder()
      .setCustomId('new_name')
      .setLabel('Novo nome do item (apenas para edit)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Algodão')
      .setRequired(false);

    const newQuantityInput = new TextInputBuilder()
      .setCustomId('new_quantity')
      .setLabel('Nova quantidade (apenas para edit)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 15')
      .setRequired(false);

    const newAmountInput = new TextInputBuilder()
      .setCustomId('new_amount')
      .setLabel('Novo valor em $ (apenas para animais)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 250.50')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(transactionInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(actionInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(newNameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(newQuantityInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(newAmountInput)
    );

    // Send transaction list first, then show modal
    await interaction.reply({
      content: `**📋 Transações Disponíveis para ${session.workerName}:**\n\`\`\`\n${transactionsList}\`\`\``,
      ephemeral: true
    });

    // Show modal after a brief delay
    setTimeout(() => {
      interaction.followUp({ 
        content: '⚠️ Use o modal que aparecerá para gerenciar as transações.',
        ephemeral: true
      }).catch(console.error);
    }, 1000);

    await interaction.showModal(modal);

  } catch (error) {
    console.error('❌ Error handling worker edit:', error);
    if (interaction.replied) {
      await interaction.followUp({
        content: '❌ Erro interno.',
        ephemeral: true
      });
    } else {
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

    const workerId = interaction.customId.replace('transaction_manage_modal_', '');
    const transactionId = interaction.fields.getTextInputValue('transaction_id');
    const action = interaction.fields.getTextInputValue('action').toLowerCase().trim();
    const newName = interaction.fields.getTextInputValue('new_name') || '';
    const newQuantity = interaction.fields.getTextInputValue('new_quantity') || '';
    const newAmount = interaction.fields.getTextInputValue('new_amount') || '';

    // Find full transaction ID from partial ID
    const sessionsResponse = await axios.get(`http://localhost:${config.api.port}/api/worker-activity/sessions`, {
      headers: { 'X-Bot-Token': config.discord.token }
    });

    const session = sessionsResponse.data.sessions.find((s: any) => s.workerId === workerId);
    if (!session) {
      return await interaction.editReply({
        content: '❌ Este trabalhador não possui sessão ativa ou já foi pago. Verifique se há atividades recentes para editar.'
      });
    }

    // Find full transaction ID from partial ID
    let fullTransactionId = '';
    const allTransactions = [...session.plantTransactions, ...session.animalTransactions];
    
    for (const transaction of allTransactions) {
      if (transaction.transactionId.includes(transactionId)) {
        fullTransactionId = transaction.transactionId;
        break;
      }
    }

    if (!fullTransactionId) {
      return await interaction.editReply({
        content: `❌ Transação não encontrada com ID: ${transactionId}`
      });
    }

    // Validate action
    if (action !== 'edit' && action !== 'delete') {
      return await interaction.editReply({
        content: '❌ Ação inválida. Use "edit" ou "delete".'
      });
    }

    // Validate edit action - require at least one field
    if (action === 'edit' && (!newName || newName.trim() === '') && (!newQuantity || newQuantity.trim() === '') && (!newAmount || newAmount.trim() === '')) {
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

    // Perform the action
    if (action === 'edit') {
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
        `http://localhost:${config.api.port}/api/worker-activity/transaction/${workerId}/${fullTransactionId}`,
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
          content: `✅ Transação ${transactionId} editada com sucesso!\n${changesSummary.join('\n')}`
        });
      } else {
        await interaction.editReply({
          content: `❌ Erro ao editar transação: ${editResponse.data.error}`
        });
      }

    } else if (action === 'delete') {
      // Delete transaction  
      const deleteResponse = await axios.delete(
        `http://localhost:${config.api.port}/api/worker-activity/transaction/${workerId}/${fullTransactionId}`,
        { headers: { 'X-Bot-Token': config.discord.token }}
      );

      if (deleteResponse.data.success) {
        await interaction.editReply({
          content: `✅ Transação ${transactionId} deletada com sucesso! Créditos recalculados automaticamente.`
        });
      } else {
        await interaction.editReply({
          content: `❌ Erro ao deletar transação: ${deleteResponse.data.error}`
        });
      }
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