import {
  ButtonInteraction,
  EmbedBuilder
} from 'discord.js';
import { getFerroviaSessionService } from '../api/routes/webhook-receiver';
import ManagerMoneyVerificationService from '../services/ManagerMoneyVerificationService';
import axios from 'axios';
import config from '../config/config';

export async function handleFerroviaVerified(interaction: ButtonInteraction): Promise<void> {
  try {
    // Extract worker ID from custom ID
    const workerId = interaction.customId.replace('ferrovia_verified_', '');
    
    console.log(`✅ Manager ${interaction.user.username} is verifying Ferrovia session for worker ${workerId}`);
    
    // Check if user has permission to verify
    const hasPermission = await checkFerroviaPermissions(interaction, 'verify');
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

      // Get comprehensive session summary using new calculation methods
      const verificationSummary = ferroviaService.getSessionVerificationSummary(session);

      // Get money verification status for this session
      const moneyVerificationService = ManagerMoneyVerificationService.getInstance();
      const moneyStatus = moneyVerificationService.getSessionVerificationStatus(session.sessionId);

      // Update money obligations in summary
      verificationSummary.obligations.pendingMoney = moneyStatus.remainingObligation;

      // Create comprehensive verification receipt
      const receiptEmbed = new EmbedBuilder()
        .setTitle(`🚂 ${session.workerName} - Verificado`)
        .setColor(0x00AA00) // Green for verified
        .setTimestamp()
        .setFooter({ text: `Verificado por ${interaction.user.displayName || interaction.user.username} • Sessão: ${session.sessionId.substring(0, 8)}` });

      // Mission Summary Section
      if (verificationSummary.missions.completed > 0) {
        const missionDetails = [
          `• **Missões realizadas:** ${verificationSummary.missions.completed}`,
          `• **Caixas utilizadas:** ${verificationSummary.missions.netBoxesUsed} (${verificationSummary.missions.totalWithdrawn} retiradas - ${verificationSummary.missions.totalReturned} devolvidas)`
        ];

        receiptEmbed.addFields({
          name: '🎯 MISSÕES COMPLETADAS',
          value: missionDetails.join('\n'),
          inline: false
        });
      }

      // Financial Summary Section
      if (verificationSummary.money.revenueCollected > 0) {
        const financialDetails = [
          `• **Receita coletada da Ferrovia:** $${verificationSummary.money.revenueCollected.toFixed(2)}`,
          `• **Pagamento do gerente (50%):** $${verificationSummary.money.expectedManagerPayment.toFixed(2)}`,
          `• **Depósito obrigatório (50%):** $${verificationSummary.money.expectedDeposit.toFixed(2)}`
        ];

        if (moneyStatus.hasObligation) {
          financialDetails.push(`• **Depositado no inventário:** $${moneyStatus.depositedAmount.toFixed(2)}`);
          if (moneyStatus.remainingObligation > 0) {
            financialDetails.push(`• **Ainda deve depositar:** $${moneyStatus.remainingObligation.toFixed(2)} ⚠️`);
          } else {
            financialDetails.push(`• **✅ Depósito completo!**`);
          }
        }

        receiptEmbed.addFields({
          name: '💰 MOVIMENTAÇÃO FINANCEIRA',
          value: financialDetails.join('\n'),
          inline: false
        });
      }

      // Box Utilization Breakdown
      if (verificationSummary.missions.totalWithdrawn > 0) {
        const boxDetails = [
          `• **Total retiradas:** ${verificationSummary.missions.totalWithdrawn} caixadeverduras`,
          `• **Total devolvidas:** ${verificationSummary.missions.totalReturned} caixadeverduras`,
          `• **Utilizadas em missões:** ${verificationSummary.missions.netBoxesUsed} caixadeverduras`
        ];

        if (verificationSummary.obligations.pendingBoxes > 0) {
          boxDetails.push(`• **Ainda em posse:** ${verificationSummary.obligations.pendingBoxes} caixadeverduras ⚠️`);
        } else {
          boxDetails.push(`• **✅ Todas as caixas processadas!**`);
        }

        receiptEmbed.addFields({
          name: '📦 DETALHAMENTO DE CAIXAS',
          value: boxDetails.join('\n'),
          inline: false
        });
      }

      // Verification Status
      const allComplete = verificationSummary.obligations.pendingBoxes === 0 && verificationSummary.obligations.pendingMoney === 0;
      const statusDetails = allComplete
        ? ['• **✅ Todas as obrigações cumpridas**', '• **✅ Sessão encerrada com sucesso**']
        : ['• **⚠️ Verificação com pendências**', '• **📝 Revisar obrigações em aberto**'];

      receiptEmbed.addFields({
        name: allComplete ? '✅ VERIFICAÇÃO COMPLETADA' : '⚠️ VERIFICAÇÃO COM PENDÊNCIAS',
        value: statusDetails.join('\n'),
        inline: false
      });

      // Transform the existing embed into a permanent receipt (remove buttons)
      if (interaction.message) {
        await interaction.message.edit({ embeds: [receiptEmbed], components: [] });
        console.log(`✅ Transformed Ferrovia embed to receipt for ${session.workerName} - verified by ${interaction.user.displayName || interaction.user.username}`);
      }

      // Remove the session and embed data (DON'T create new session until worker activity)
      ferroviaService['activeEmbeds'].delete(workerId);
      await ferroviaService['saveActiveEmbeds']();
      ferroviaService['supplyChainService'].clearSessionData(workerId);

      console.log(`🗂️ Cleared session data for worker ${workerId} after verification - no new session created`);

      // Reply with simple confirmation (no detailed message needed)
      await interaction.editReply({
        content: `✅ Sessão verificada com sucesso.`
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

async function checkFerroviaPermissions(interaction: ButtonInteraction, permissionType: 'verify' | 'edit' | 'reset'): Promise<boolean> {
  try {
    // Get user's roles from Discord (both by ID and name)
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (!member) return false;

    const userRoleIds = member.roles.cache.map(role => role.id);
    const userRoleNames = member.roles.cache.map(role => role.name);

    // Load ferrovia service configuration for role permissions
    const fs = require('fs');
    const path = require('path');
    const ferroviaConfigPath = path.join(process.cwd(), 'data', 'ferrovia-service-config.json');
    const ferroviaConfig = JSON.parse(fs.readFileSync(ferroviaConfigPath, 'utf8'));

    // Determine required roles based on permission type
    let requiredRoles: string[] = [];
    switch (permissionType) {
      case 'verify':
        requiredRoles = ferroviaConfig.rolePermissions?.verifyRoles || ferroviaConfig.rolePermissions?.acceptRoles || [];
        break;
      case 'edit':
        requiredRoles = ferroviaConfig.rolePermissions?.editRoles || [];
        break;
      case 'reset':
        requiredRoles = ferroviaConfig.rolePermissions?.editRoles || ferroviaConfig.rolePermissions?.acceptRoles || [];
        break;
    }

    // Check if user has any of the required roles (by both ID and name)
    const hasPermissionById = requiredRoles.some(roleId => userRoleIds.includes(roleId));
    const hasPermissionByName = requiredRoles.some(roleName => userRoleNames.includes(roleName));
    const hasPermission = hasPermissionById || hasPermissionByName;

    console.log(`🔐 Ferrovia permission check for ${interaction.user.username}: ${permissionType} - ${hasPermission ? 'GRANTED' : 'DENIED'}`);
    console.log(`   User role IDs: [${userRoleIds.join(', ')}]`);
    console.log(`   User role names: [${userRoleNames.join(', ')}]`);
    console.log(`   Required roles: [${requiredRoles.join(', ')}]`);

    return hasPermission;
  } catch (error) {
    console.error('Error checking Ferrovia permissions:', error);
    return false;
  }
}