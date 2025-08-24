import { 
  CommandInteraction, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  TextChannel
} from 'discord.js';
import RegistrationService from '../../../services/RegistrationService';

export default {
  data: null, // Dynamic data, set in BotClient.ts
  name: 'register-setup', // Fallback name for cooldowns
  cooldown: 5, // 5 second cooldown
    
  async execute(interaction: CommandInteraction): Promise<any> {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const channel = (interaction as any).options.get('channel')?.channel as TextChannel;
      
      if (!channel || channel.type !== 0) { // 0 = GUILD_TEXT
        return await interaction.editReply({
          content: '❌ Please select a valid text channel.',
        });
      }

      // Get registration config
      const config = await RegistrationService.getFormConfig();
      if (!config || config.functions.length === 0) {
        return await interaction.editReply({
          content: '❌ Registration form is not configured. Please configure it in the dashboard first.',
        });
      }

      // Create registration embed using configurable settings
      const embed = new EmbedBuilder()
        .setTitle(config.formDisplay?.title || '🎮 Registro Familia BlackGolden')
        .setDescription(config.formDisplay?.description || 
          '**Bem-vindo ao Servidor Familia BlackGolden!**\n\n' +
          'Para ter acesso ao servidor, você precisa completar o processo de registro.\n\n' +
          '**Informações Necessárias:**\n' +
          '• Seu nome completo no condado\n' +
          '• Seu Pombo\n' +
          '• Sua função/trabalho no servidor\n' +
          '• Quem te convidou para a Familia\n\n' +
          'Clique no botão **Registrar** abaixo para começar.'
        )
        .setColor((config.formDisplay?.embedColor || config.settings.embedColor || '#FF0000') as any)
        .setFooter({ text: config.formDisplay?.footerText || 'Familia BlackGolden • Sistema de Registro' })
        .setTimestamp();

      // Get button style enum from string
      let buttonStyle = ButtonStyle.Primary;
      switch(config.formDisplay?.button?.style) {
        case 'Secondary': buttonStyle = ButtonStyle.Secondary; break;
        case 'Success': buttonStyle = ButtonStyle.Success; break;
        case 'Danger': buttonStyle = ButtonStyle.Danger; break;
        default: buttonStyle = ButtonStyle.Primary;
      }

      // Create register button using configurable settings
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('register_start')
            .setLabel(config.formDisplay?.button?.text || 'Registrar')
            .setStyle(buttonStyle)
            .setEmoji(config.formDisplay?.button?.emoji || '📝')
        );

      // Send the embed to the channel
      await channel.send({
        embeds: [embed],
        components: [row]
      });

      // Update config with channel ID
      config.settings.channelId = channel.id;
      await RegistrationService.updateFormConfig({ settings: config.settings });

      await interaction.editReply({
        content: `✅ Registration form has been deployed to ${channel}!`,
      });
    } catch (error) {
      console.error('Error setting up registration:', error);
      await interaction.editReply({
        content: '❌ An error occurred while setting up the registration form.',
      });
    }
  },
};