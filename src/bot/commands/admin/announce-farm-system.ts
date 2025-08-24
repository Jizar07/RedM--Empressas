import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ChannelType
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('announce-farm-system')
    .setDescription('Announce the new farm service system to all worker channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Defer reply as this might take a while
      await interaction.deferReply({ ephemeral: true });

      // Category ID for worker channels
      const CATEGORY_ID = '1365579138974355476';
      
      // Get the guild
      const guild = interaction.guild;
      if (!guild) {
        await interaction.editReply('❌ Could not access guild.');
        return;
      }

      // Create the announcement embed
      const announcementEmbed = new EmbedBuilder()
        .setTitle('🚜 **NOVO SISTEMA DE SERVIÇOS DA FAZENDA DISPONÍVEL**')
        .setColor(0x228B22)
        .setDescription(
          '**Atenção trabalhadores da fazenda!** 🎉\n\n' +
          'Temos o prazer de anunciar o lançamento do nosso **novo sistema automatizado de serviços da fazenda**! ' +
          'Este sistema revolucionário substitui todos os processos manuais anteriores.'
        )
        .addFields(
          {
            name: '✨ **O que mudou:**',
            value: 
              '🔄 **Processo Totalmente Automatizado**\n' +
              '- Formulários interativos para submissão de serviços\n' +
              '- Seleção de tipo de serviço (Animais/Plantas) via dropdowns\n' +
              '- Upload direto de screenshots para verificação\n\n' +
              '💰 **Sistema de Pagamento Inteligente**\n' +
              '- Cálculo automático de pagamentos\n' +
              '- Recibos gerados automaticamente\n' +
              '- Histórico completo de transações\n\n' +
              '📋 **Fluxo de Aprovação Transparente**\n' +
              '- Revisão administrativa com screenshots\n' +
              '- Status de aprovação em tempo real\n' +
              '- Notificações automáticas de pagamento',
            inline: false
          },
          {
            name: '🚀 **Como usar o novo sistema:**',
            value:
              '1. **Vá para** <#1409214475403526174>\n' +
              '2. **Clique no botão** "📝 Submeter Serviço da Fazenda"\n' +
              '3. **Preencha o formulário** (tipo de serviço, quantidade, etc.)\n' +
              '4. **Faça upload** da sua screenshot de verificação\n' +
              '5. **Aguarde aprovação** e receba seu pagamento automaticamente!',
            inline: false
          },
          {
            name: '💵 **Taxas de Pagamento:**',
            value:
              '- 🐄 **Animais**: Baseado na renda da fazenda menos custos\n' +
              '- 🌾 **Plantas Básicas**: $0.15 por item (Milho, Trigo, Junco)\n' +
              '- 🌱 **Outras Plantas**: $0.20 por item',
            inline: false
          },
          {
            name: '🎯 **Benefícios:**',
            value:
              '✅ **Mais Rápido** - Submissões em segundos\n' +
              '✅ **Mais Organizado** - Tudo registrado e rastreável\n' +
              '✅ **Mais Transparente** - Status visível em tempo real\n' +
              '✅ **Menos Erros** - Cálculos automáticos precisos',
            inline: false
          }
        )
        .setFooter({ 
          text: 'Sistema desenvolvido por Jizar Stoffeliz (Black Golden Bot) - Versão 0.010',
          iconURL: interaction.client.user?.displayAvatarURL()
        })
        .setTimestamp();

      // Add final call to action as a separate field
      announcementEmbed.addFields({
        name: '🚨 **IMPORTANTE**',
        value: 
          '**Use apenas o novo sistema a partir de agora!**\n\n' +
          '**Para começar, acesse <#1409214475403526174> e clique no botão que está fixado no canal.**',
        inline: false
      });

      // Get all channels in the category
      const channels = guild.channels.cache.filter(channel => 
        channel.parentId === CATEGORY_ID && 
        channel.type === ChannelType.GuildText
      );

      if (channels.size === 0) {
        await interaction.editReply(`❌ No text channels found in category ${CATEGORY_ID}.`);
        return;
      }

      // Track success and failures
      let successCount = 0;
      let failureCount = 0;
      const failures: string[] = [];

      // Send announcement to each channel
      for (const [channelId, channel] of channels) {
        try {
          const textChannel = channel as TextChannel;
          await textChannel.send({ embeds: [announcementEmbed] });
          successCount++;
          console.log(`✅ Announcement sent to channel: ${textChannel.name} (${channelId})`);
        } catch (error) {
          failureCount++;
          failures.push(channel.name);
          console.error(`❌ Failed to send to channel ${channel.name}:`, error);
        }
      }

      // Report results
      let resultMessage = `📊 **Announcement Results:**\n`;
      resultMessage += `✅ Successfully posted to **${successCount}** channels\n`;
      
      if (failureCount > 0) {
        resultMessage += `❌ Failed to post to **${failureCount}** channels\n`;
        if (failures.length > 0) {
          resultMessage += `\n**Failed channels:** ${failures.join(', ')}`;
        }
      }

      resultMessage += `\n\n🎉 **Farm service system announcement complete!**`;

      await interaction.editReply(resultMessage);

    } catch (error) {
      console.error('Error in announce-farm-system command:', error);
      
      const errorMessage = '❌ An error occurred while sending announcements.';
      
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};