import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('registro')
    .setDescription('Create farm service registration embed in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      // Create the persistent registration embed
      const embed = new EmbedBuilder()
        .setTitle('🚜 Registro de Serviços da Fazenda')
        .setDescription(
          '**Submeta seus serviços da fazenda concluídos aqui!**\n\n' +
          '🐄 **Serviços de Entrega de Animais**\n' +
          'Submeta entregas de animais crescidos para a fazenda\n\n' +
          '🌾 **Serviços de Depósito de Plantas**\n' +
          'Submeta depósitos de plantas no inventário da fazenda\n\n' +
          '📋 **Como funciona:**\n' +
          '1. Clique no botão abaixo\n' +
          '2. Preencha os detalhes do serviço\n' +
          '3. Faça upload da sua screenshot\n' +
          '4. Receba pagamento e recibo\n\n' +
          '💰 **Taxas de pagamento:**\n' +
          '• Animais: Baseado na renda da fazenda menos custos\n' +
          '• Plantas: $0.15 (básicas) / $0.20 (outras) por item'
        )
        .setColor(0x228B22)
        .setFooter({ text: 'Sistema de Serviços da Fazenda - Clique no botão para começar' });

      // Create the registration button
      const button = new ButtonBuilder()
        .setCustomId('farm_service_start')
        .setLabel('📝 Submeter Serviço da Fazenda')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🚜');

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button);

      // Post the embed to the channel
      await interaction.reply({
        embeds: [embed],
        components: [row]
      });

      console.log(`📋 Embed de registro de serviços da fazenda criado no canal: ${interaction.channel?.id}`);

    } catch (error) {
      console.error('Erro ao criar embed de registro:', error);
      await interaction.reply({
        content: '❌ Falha ao criar embed de registro.',
        ephemeral: true
      });
    }
  }
};