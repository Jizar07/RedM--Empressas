import { 
  ButtonInteraction, 
  EmbedBuilder
} from 'discord.js';
import { getFerroviaSessionService } from '../api/routes/webhook-receiver';
import axios from 'axios';
import config from '../config/config';

export async function handleFerroviaVerified(interaction: ButtonInteraction): Promise<void> {
  try {
    // Extract worker ID from custom ID
    const workerId = interaction.customId.replace('ferrovia_verified_', '');
    
    console.log(`✅ Manager ${interaction.user.username} is verifying Ferrovia session for worker ${workerId}`);
    
    // Check if user has permission to verify
    const hasPermission = await checkManagerPermissions(interaction, 'pay');
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Você não tem permissão para verificar sessões de Ferrovia.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Get current session data using the same FerroviaSessionService instance
      const ferroviaService = getFerroviaSessionService();
      if (!ferroviaService) {
        await interaction.editReply({
          content: '❌ Serviço de Ferrovia não disponível. Tente novamente.'
        });
        return;
      }

      const allSessions = ferroviaService['supplyChainService'].getAllActiveSessions();
      const session = allSessions.find(s => s.workerId === workerId);

      if (!session) {
        await interaction.editReply({
          content: '❌ Sessão do trabalhador não encontrada.'
        });
        return;
      }

      // Prepare session summary for the verified embed
      const summary = [];
      if (session.totalBoxesProcessed > 0) {
        summary.push(`📦 **Caixas Processadas:** ${session.totalBoxesProcessed}`);
      }
      if (session.totalRevenueGenerated > 0) {
        summary.push(`💰 **Receita Gerada:** $${session.totalRevenueGenerated.toFixed(2)}`);
      }
      if (session.totalRevenueReturned > 0) {
        summary.push(`💸 **Receita Retornada:** $${session.totalRevenueReturned.toFixed(2)}`);
      }

      // Add open responsibilities if any
      if (session.openResponsibilities.boxesTaken > 0 || session.openResponsibilities.moneyOwed > 0) {
        summary.push(`⚠️ **Responsabilidades Pendentes:**`);
        if (session.openResponsibilities.boxesTaken > 0) {
          summary.push(`   📦 ${session.openResponsibilities.boxesTaken} caixas`);
        }
        if (session.openResponsibilities.moneyOwed > 0) {
          summary.push(`   💰 $${session.openResponsibilities.moneyOwed.toFixed(2)}`);
        }
      }

      // Note: Session verification metadata would be stored separately if needed
      // as the SupplyChainSession interface doesn't include verification fields

      // Update the existing embed to show as verified (remove buttons)
      const verifiedEmbed = new EmbedBuilder()
        .setTitle(`✅ ${session.workerName} - Sessão Ferrovia Verificada`)
        .setDescription(`**Verificado por:** ${interaction.user.displayName || interaction.user.username}`)
        .setColor(0x00FF00)
        .setTimestamp()
        .setFooter({ text: `Sessão Verificada: ${session.sessionId.substring(0, 8)}` });

      // Add the same session data as the receipt
      if (summary.length > 0) {
        verifiedEmbed.addFields({
          name: '📊 Resumo da Sessão Verificada',
          value: summary.join('\n') || 'Nenhuma atividade registrada',
          inline: false
        });
      }

      // Add plant transactions if any
      const plantWithdrawals = session.transactions.filter(t => t.type === 'PLANTS_WITHDRAWN');
      const plantDeposits = session.transactions.filter(t => t.type === 'PLANTS_DEPOSITED');

      if (plantWithdrawals.length > 0 || plantDeposits.length > 0) {
        const plantDetails: string[] = [];

        // Calculate NET plants
        const plantBalance: { [key: string]: number } = {};
        plantWithdrawals.forEach(t => {
          plantBalance[t.itemName] = (plantBalance[t.itemName] || 0) + t.quantity;
        });
        plantDeposits.forEach(t => {
          plantBalance[t.itemName] = (plantBalance[t.itemName] || 0) - t.quantity;
        });

        Object.entries(plantBalance).forEach(([plant, net]) => {
          if (net > 0) {
            plantDetails.push(`🌿 ${plant}: ${net} (ainda deve)`);
          } else if (net < 0) {
            plantDetails.push(`✅ ${plant}: ${Math.abs(net)} (devolvido extra)`);
          } else {
            plantDetails.push(`✅ ${plant}: 0 (totalmente devolvido)`);
          }
        });

        if (plantDetails.length > 0) {
          verifiedEmbed.addFields({
            name: '🌿 Plantas Processadas',
            value: plantDetails.join('\n'),
            inline: false
          });
        }
      }

      // Add box transactions if any
      const boxesCreated = session.transactions.filter(t => t.type === 'BOXES_CREATED');
      const boxesWithdrawn = session.transactions.filter(t => t.type === 'BOXES_WITHDRAWN');

      if (boxesCreated.length > 0 || boxesWithdrawn.length > 0) {
        const boxDetails: string[] = [];

        if (boxesCreated.length > 0) {
          const boxesMap = new Map<string, number>();
          boxesCreated.forEach(t => {
            const current = boxesMap.get(t.itemName) || 0;
            boxesMap.set(t.itemName, current + t.quantity);
          });
          boxesMap.forEach((quantity, item) => {
            boxDetails.push(`📦 Criadas: ${quantity} ${item}`);
          });
        }

        if (boxesWithdrawn.length > 0) {
          const boxesMap = new Map<string, number>();
          boxesWithdrawn.forEach(t => {
            const current = boxesMap.get(t.itemName) || 0;
            boxesMap.set(t.itemName, current + t.quantity);
          });
          boxesMap.forEach((quantity, item) => {
            boxDetails.push(`📤 Retiradas: ${quantity} ${item}`);
          });
        }

        if (boxDetails.length > 0) {
          verifiedEmbed.addFields({
            name: '📦 Caixas Processadas',
            value: boxDetails.join('\n'),
            inline: false
          });
        }
      }

      // Update the existing message to remove buttons (creates the receipt)
      if (interaction.message) {
        await interaction.message.edit({ embeds: [verifiedEmbed], components: [] });
      }

      // AFTER creating the receipt, remove embedData completely so new session gets fresh embed
      ferroviaService['activeEmbeds'].delete(workerId);
      await ferroviaService['saveActiveEmbeds']();

      // Clear the current session data and start a new one
      console.log(`🔄 Clearing session data for worker ${workerId} after verification`);
      ferroviaService['supplyChainService'].clearSessionData(workerId);

      // Create a new session for the worker
      const newSession = await ferroviaService['supplyChainService'].createOrGetSession(workerId, session.workerName, 'worker');
      console.log(`✨ Created new session for worker ${workerId} with ID: ${newSession.sessionId}`);

      // Create a new embed for the new session (will be a new message)
      await ferroviaService.createOrUpdateEmbed(workerId, session.workerName, interaction.channelId);
      console.log(`🔄 New Ferrovia embed created for fresh session of worker ${workerId}`);

      await interaction.editReply({
        content: `✅ Sessão de Ferrovia de **${session.workerName}** foi verificada com sucesso! Um recibo foi gerado e uma nova sessão foi iniciada.`
      });
      
      console.log(`✅ Ferrovia session for worker ${workerId} verified successfully by ${interaction.user.username}`);

    } catch (error: any) {
      console.error('❌ Error during Ferrovia verification:', error);
      
      let errorMessage = 'Erro interno ao verificar sessão de Ferrovia.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      await interaction.editReply({
        content: `❌ ${errorMessage}`
      });
    }

  } catch (error) {
    console.error('❌ Error handling Ferrovia verification:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Erro interno ao processar verificação.'
      });
    } else {
      await interaction.reply({
        content: '❌ Erro interno ao processar verificação.',
        ephemeral: true
      });
    }
  }
}

export async function handleFerroviaReset(interaction: ButtonInteraction): Promise<void> {
  try {
    // Extract worker ID from custom ID
    const workerId = interaction.customId.replace('ferrovia_reset_', '');
    
    console.log(`🗑️ Manager ${interaction.user.username} is resetting Ferrovia session for worker ${workerId}`);
    
    // Check if user has permission to reset
    const hasPermission = await checkManagerPermissions(interaction, 'edit');
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Você não tem permissão para resetar sessões de Ferrovia.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Get current session data using the same FerroviaSessionService instance that manages the sessions
      const ferroviaService = getFerroviaSessionService();
      if (!ferroviaService) {
        await interaction.editReply({
          content: '❌ Serviço de Ferrovia não disponível. Tente novamente.'
        });
        return;
      }

      // Access the SupplyChainService through FerroviaSessionService to use the same instance
      const allSessions = ferroviaService['supplyChainService'].getAllActiveSessions();
      
      // Debug logging
      console.log(`🔍 Reset button - Looking for worker ID: ${workerId}`);
      console.log(`🔍 Available sessions: ${allSessions.length}`);
      allSessions.forEach((s, index) => {
        console.log(`  Session ${index}: workerId="${s.workerId}" workerName="${s.workerName}"`);
      });
      
      const session = allSessions.find(s => s.workerId === workerId);

      if (!session) {
        await interaction.editReply({
          content: '❌ Sessão do trabalhador não encontrada.'
        });
        return;
      }

      // Store session info before reset
      const sessionInfo = {
        workerName: session.workerName,
        boxesProcessed: session.totalBoxesProcessed,
        revenueGenerated: session.totalRevenueGenerated
      };

      // Use the enhanced clearSessionData method for proper persistence
      const resetSuccess = await ferroviaService['supplyChainService'].clearSessionData(workerId);
      
      if (!resetSuccess) {
        await interaction.editReply({
          content: '❌ Falha ao resetar sessão. Tente novamente.'
        });
        return;
      }

      // Update the Ferrovia embed to show the reset state (will update existing message)
      await ferroviaService.createOrUpdateEmbed(workerId, session.workerName, interaction.channelId);
      console.log(`🔄 Ferrovia embed updated to show clean state after reset for worker ${workerId}`);

      await interaction.editReply({
        content: `🗑️ Sessão de Ferrovia de **${sessionInfo.workerName}** foi resetada com sucesso!\n` +
                 `**Dados limpos:** ${sessionInfo.boxesProcessed} caixas, $${sessionInfo.revenueGenerated.toFixed(2)} em receita.\n` +
                 `O embed foi atualizado para refletir o estado limpo.`
      });
      
      console.log(`🗑️ Ferrovia session for worker ${workerId} reset successfully by ${interaction.user.username}`);

    } catch (error: any) {
      console.error('❌ Error during Ferrovia reset:', error);
      
      let errorMessage = 'Erro interno ao resetar sessão de Ferrovia.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      await interaction.editReply({
        content: `❌ ${errorMessage}`
      });
    }

  } catch (error) {
    console.error('❌ Error handling Ferrovia reset:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Erro interno ao processar reset.'
      });
    } else {
      await interaction.reply({
        content: '❌ Erro interno ao processar reset.',
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