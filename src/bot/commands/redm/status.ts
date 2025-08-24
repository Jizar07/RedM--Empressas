import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';
import { Constants } from '../../../config/constants';
import RedMService from '../../../services/RedMService';

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check RedM server status'),
  
  cooldown: 10,
  
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();
    
    try {
      const serverInfo = await RedMService.getServerInfo();
      
      const embed = new EmbedBuilder()
        .setTitle(`${Constants.Emojis.Info} RedM Server Status`)
        .setColor(serverInfo.online ? Constants.Colors.Success : Constants.Colors.Error)
        .setThumbnail('https://redm.net/assets/images/logo.png')
        .addFields(
          { 
            name: 'Status', 
            value: serverInfo.online ? `${Constants.Emojis.Online} Online` : `${Constants.Emojis.Offline} Offline`, 
            inline: true 
          },
          { 
            name: 'Players', 
            value: `${serverInfo.players}/${serverInfo.maxPlayers}`, 
            inline: true 
          },
          { 
            name: 'Server Name', 
            value: serverInfo.hostname || 'Unknown', 
            inline: false 
          },
          { 
            name: 'Game Type', 
            value: serverInfo.gametype || 'RedM RP', 
            inline: true 
          },
          { 
            name: 'Map', 
            value: serverInfo.mapname || 'rdr3', 
            inline: true 
          },
          { 
            name: 'Uptime', 
            value: serverInfo.uptime || 'N/A', 
            inline: true 
          }
        )
        .setTimestamp()
        .setFooter({ text: `Last checked` });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching server status:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle(`${Constants.Emojis.Error} Server Status`)
        .setColor(Constants.Colors.Error)
        .setDescription('Failed to fetch server status. The server might be offline or unreachable.')
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};