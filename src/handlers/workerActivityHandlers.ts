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

    await interaction.reply({
      content: '⚠️ Funcionalidade de edição em desenvolvimento. Use o dashboard web para edições avançadas.',
      ephemeral: true
    });

  } catch (error) {
    console.error('❌ Error handling worker edit:', error);
    await interaction.reply({
      content: '❌ Erro interno.',
      ephemeral: true
    });
  }
}

export async function handleWorkerReject(interaction: ButtonInteraction): Promise<any> {
  try {
    // Check permissions
    const hasPermission = await checkManagerPermissions(interaction, 'reject');
    if (!hasPermission) {
      return await interaction.reply({
        content: '❌ Você não tem permissão para rejeitar atividades de trabalhadores.',
        ephemeral: true
      });
    }

    const workerId = interaction.customId.replace('worker_reject_', '');

    // Show modal for rejection reason
    const modal = new ModalBuilder()
      .setCustomId(`worker_reject_modal_${workerId}`)
      .setTitle('Rejeitar Sessão do Trabalhador');

    const reasonInput = new TextInputBuilder()
      .setCustomId('rejection_reason')
      .setLabel('Motivo da Rejeição')
      .setPlaceholder('Digite o motivo da rejeição...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(500);

    const row = new ActionRowBuilder<TextInputBuilder>()
      .addComponents(reasonInput);

    modal.addComponents(row);

    await interaction.showModal(modal);

  } catch (error) {
    console.error('❌ Error handling worker reject:', error);
    await interaction.reply({
      content: '❌ Erro interno.',
      ephemeral: true
    });
  }
}

export async function handleWorkerRejectSubmit(interaction: ModalSubmitInteraction): Promise<any> {
  try {
    const workerId = interaction.customId.replace('worker_reject_modal_', '');
    const reason = interaction.fields.getTextInputValue('rejection_reason');

    await interaction.deferReply({ ephemeral: true });

    // For now, just log the rejection - could be extended to call an API
    console.log(`❌ Manager ${interaction.user.username} rejected worker ${workerId}: ${reason}`);
    
    await interaction.editReply({
      content: `✅ Sessão rejeitada. Motivo: ${reason}\\n\\n⚠️ Funcionalidade de rejeição em desenvolvimento.`
    });

  } catch (error) {
    console.error('❌ Error handling reject submit:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Erro interno ao processar rejeição.'
      });
    } else {
      await interaction.reply({
        content: '❌ Erro interno ao processar rejeição.',
        ephemeral: true
      });
    }
  }
}

async function checkManagerPermissions(interaction: ButtonInteraction, permissionType: 'pay' | 'edit' | 'reject'): Promise<boolean> {
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
      case 'reject':
        requiredRoles = farmConfig.rolePermissions?.rejectRoles || ['Admin', 'Moderator'];
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