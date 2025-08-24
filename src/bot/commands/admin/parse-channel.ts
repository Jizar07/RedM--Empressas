import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Constants } from '../../../config/constants';
import ChannelParserService from '../../../services/ChannelParserService';

export default {
  data: new SlashCommandBuilder()
    .setName('parse-channel')
    .setDescription('Parse messages from a channel and send to webhook')
    .addStringOption(option =>
      option.setName('channel_id')
        .setDescription('ID of the channel to parse')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('webhook_url')
        .setDescription('Webhook URL to send parsed data to')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of messages to parse (default: 100, max: 1000)')
        .setMinValue(1)
        .setMaxValue(1000)
        .setRequired(false))
    .addStringOption(option =>
      option.setName('filter_user')
        .setDescription('Filter messages by user ID (optional)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('filter_keyword')
        .setDescription('Filter messages containing keyword (optional)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  cooldown: 10,
  
  async execute(interaction: ChatInputCommandInteraction) {
    const channelId = interaction.options.getString('channel_id', true);
    const webhookUrl = interaction.options.getString('webhook_url', true);
    const limit = interaction.options.getInteger('limit') || 100;
    const filterUser = interaction.options.getString('filter_user');
    const filterKeyword = interaction.options.getString('filter_keyword');

    try {
      await interaction.deferReply({ ephemeral: true });

      const parser = new ChannelParserService(interaction.client);
      
      // Parse messages from channel
      let messages = await parser.parseChannelMessages(channelId, limit);
      
      // Apply filters if specified
      if (filterUser) {
        messages = await parser.filterMessagesByUser(messages, filterUser);
      }
      
      if (filterKeyword) {
        messages = await parser.filterMessagesByKeyword(messages, filterKeyword);
      }
      
      if (messages.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ No Messages Found')
          .setDescription('No messages found matching your criteria.')
          .setColor(Constants.Colors.Error)
          .setTimestamp();
          
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Send to webhook
      await parser.sendToWebhook(webhookUrl, channelId, messages);
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Channel Parsed Successfully')
        .setColor(Constants.Colors.Success)
        .addFields(
          { name: 'Channel ID', value: channelId, inline: true },
          { name: 'Messages Parsed', value: messages.length.toString(), inline: true },
          { name: 'Filters Applied', value: getFiltersApplied(filterUser || undefined, filterKeyword || undefined), inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Requested by ${interaction.user.tag}` });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in parse-channel command:', error);
      
      const embed = new EmbedBuilder()
        .setTitle('❌ Error Parsing Channel')
        .setDescription(`Failed to parse channel: ${error instanceof Error ? error.message : 'Unknown error'}`)
        .setColor(Constants.Colors.Error)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
};

function getFiltersApplied(filterUser?: string, filterKeyword?: string): string {
  const filters: string[] = [];
  
  if (filterUser) filters.push(`User: <@${filterUser}>`);
  if (filterKeyword) filters.push(`Keyword: "${filterKeyword}"`);
  
  return filters.length > 0 ? filters.join('\n') : 'None';
}