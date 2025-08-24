import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Constants } from '../../../config/constants';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and response time'),
  
  cooldown: 3,
  
  async execute(interaction: CommandInteraction) {
    const sent = await interaction.reply({ 
      content: '🏓 Pinging...', 
      fetchReply: true 
    });
    
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(Constants.Colors.Primary)
      .addFields(
        { name: 'Bot Latency', value: `${latency}ms`, inline: true },
        { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
        { name: 'Status', value: getLatencyStatus(apiLatency), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Requested by ${interaction.user.tag}` });
    
    await interaction.editReply({ content: null, embeds: [embed] });
  },
};

function getLatencyStatus(latency: number): string {
  if (latency < 100) return '🟢 Excellent';
  if (latency < 200) return '🟡 Good';
  if (latency < 300) return '🟠 Fair';
  return '🔴 Poor';
}