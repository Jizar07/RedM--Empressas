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

      // Create receipt embed similar to farm payall
      const receiptEmbed = new EmbedBuilder()
        .setTitle(`✅ Recibo de Ferrovia Verificado - ${session.workerName}`)
        .setDescription(`**Sessão verificada por:** ${interaction.user.displayName || interaction.user.username}`)
        .setColor(0x00FF00)
        .setTimestamp()
        .setFooter({ text: 'Sessão de Ferrovia Verificada' });

      // Add session summary
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

      if (summary.length > 0) {
        receiptEmbed.addFields({
          name: '📊 Resumo da Sessão',
          value: summary.join('\n') || 'Nenhuma atividade registrada',
          inline: false
        });
      }

      // Note: Session verification metadata would be stored separately if needed
      // as the SupplyChainSession interface doesn't include verification fields

      // Send receipt in the channel
      const channel = interaction.channel;
      if (channel && 'send' in channel) {
        await channel.send({ embeds: [receiptEmbed] });
      }

      // Update the Ferrovia embed to reflect verification
      await ferroviaService.createOrUpdateEmbed(workerId, session.workerName, interaction.channelId);
      console.log(`🔄 Ferrovia embed updated after verification for worker ${workerId}`);

      await interaction.editReply({
        content: `✅ Sessão de Ferrovia de **${session.workerName}** foi verificada com sucesso! Um recibo foi gerado no canal.`
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

      // Reset all session data
      session.totalBoxesProcessed = 0;
      session.totalRevenueGenerated = 0;
      session.totalRevenueReturned = 0;
      session.openResponsibilities = {
        boxesTaken: 0,
        moneyOwed: 0,
        dueDate: new Date(),
        startDate: new Date()
      };
      
      // Clear all transactions
      session.transactions = [];
      
      // Note: Session reset metadata would be stored separately if needed
      // as the SupplyChainSession interface doesn't include reset fields

      // Save the updated session using the same service instance
      await ferroviaService['supplyChainService'].saveSession(session);

      // Update the Ferrovia embed to show the reset state
      await ferroviaService.createOrUpdateEmbed(workerId, session.workerName, interaction.channelId);
      console.log(`🔄 Ferrovia embed updated after reset for worker ${workerId}`);

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