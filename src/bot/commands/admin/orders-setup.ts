import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel
} from 'discord.js';
import OrdersService from '../../../services/OrdersService';

export default {
  data: new SlashCommandBuilder()
    .setName('orders-setup')
    .setDescription('Configurar o sistema de encomendas em um canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('Canal onde o sistema de encomendas será configurado')
        .setRequired(true)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const channel = interaction.options.getChannel('canal');
      
      if (!channel || !(channel instanceof TextChannel)) {
        await interaction.reply({
          content: '❌ Por favor, selecione um canal de texto válido.',
          ephemeral: true
        });
        return;
      }

      const config = await OrdersService.getConfig();
      if (!config) {
        await interaction.reply({
          content: '❌ Erro ao carregar configuração do sistema de encomendas.',
          ephemeral: true
        });
        return;
      }

      if (config.firms.length === 0) {
        await interaction.reply({
          content: '⚠️ Nenhuma firma configurada. Configure as firmas através do painel web antes de continuar.',
          ephemeral: true
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(config.formDisplay.title)
        .setDescription(config.formDisplay.description)
        .setColor(config.formDisplay.embedColor as any)
        .addFields(
          { 
            name: '📊 Firmas Disponíveis', 
            value: config.firms
              .filter(f => f.active)
              .map(f => `• **${f.name}**${f.description ? `: ${f.description}` : ''}`)
              .join('\n') || 'Nenhuma firma ativa',
            inline: false 
          },
          {
            name: '📋 Regras',
            value: [
              `• Máximo de **${config.settings.maxActiveOrdersPerUser}** encomendas ativas por usuário`,
              config.settings.orderCooldownMinutes > 0 
                ? `• Tempo de espera entre encomendas: **${config.settings.orderCooldownMinutes} minutos**`
                : '• Sem tempo de espera entre encomendas',
              config.settings.requireApproval
                ? '• ✅ Encomendas precisam de aprovação'
                : '• ⚡ Encomendas são processadas automaticamente'
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({ text: 'Sistema de Encomendas • Clique no botão abaixo para fazer uma encomenda' })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId('order_start')
        .setLabel(config.formDisplay.button.text)
        .setEmoji(config.formDisplay.button.emoji)
        .setStyle(getButtonStyle(config.formDisplay.button.style));

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

      const message = await channel.send({
        embeds: [embed],
        components: [row]
      });

      await OrdersService.updateConfig({
        ...config,
        settings: {
          ...config.settings,
          orderChannelId: channel.id
        }
      });

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Sistema de Encomendas Configurado')
        .setColor('#00FF00')
        .setDescription(`O sistema de encomendas foi configurado com sucesso no canal ${channel}`)
        .addFields(
          { name: 'Canal', value: channel.toString(), inline: true },
          { name: 'ID da Mensagem', value: message.id, inline: true },
          { name: 'Firmas Ativas', value: config.firms.filter(f => f.active).length.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [successEmbed],
        ephemeral: true
      });

    } catch (error) {
      console.error('Error setting up orders system:', error);
      await interaction.reply({
        content: '❌ Ocorreu um erro ao configurar o sistema de encomendas.',
        ephemeral: true
      });
    }
  }
};

function getButtonStyle(style: string): ButtonStyle {
  const styleMap: Record<string, ButtonStyle> = {
    'Primary': ButtonStyle.Primary,
    'Secondary': ButtonStyle.Secondary,
    'Success': ButtonStyle.Success,
    'Danger': ButtonStyle.Danger
  };
  return styleMap[style] || ButtonStyle.Primary;
}