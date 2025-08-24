import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { BotClient } from '../../bot/BotClient';
import axios from 'axios';

const router = Router();
const COMMANDS_FILE = join(process.cwd(), 'discord-commands.json');

interface DiscordCommand {
  id: string;
  name: string;
  description: string;
  channels: string[];
  action: 'online-members' | 'server-status' | 'player-list';
  enabled: boolean;
}

// Load commands from file
const loadCommands = (): DiscordCommand[] => {
  try {
    if (!existsSync(COMMANDS_FILE)) {
      return [];
    }
    const data = readFileSync(COMMANDS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading commands:', error);
    return [];
  }
};

// Save commands to file
const saveCommands = (commands: DiscordCommand[]): void => {
  try {
    writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
  } catch (error) {
    console.error('Error saving commands:', error);
  }
};

// Register Discord slash command
const registerDiscordCommand = async (bot: BotClient, command: DiscordCommand) => {
  try {
    const slashCommand = new SlashCommandBuilder()
      .setName(command.name)
      .setDescription(command.description || `Execute ${command.action} action`)
      .setDefaultMemberPermissions('0') // Admin only
      .setDMPermission(false);

    // Create command handler
    const commandHandler = {
      name: command.name,
      description: command.description,
      data: slashCommand,
      async execute(interaction: any) {
        try {
          // Check if command is enabled
          if (!command.enabled) {
            await interaction.reply({
              content: '❌ Este comando está desativado.',
              ephemeral: true
            });
            return;
          }

          // Check channel permissions
          if (command.channels.length > 0 && !command.channels.includes(interaction.channelId)) {
            await interaction.reply({
              content: '❌ Este comando não pode ser usado neste canal.',
              ephemeral: true
            });
            return;
          }

          await interaction.deferReply({ ephemeral: true });

          // Execute action
          switch (command.action) {
            case 'online-members':
              await executeOnlineMembersAction(interaction);
              break;
            case 'server-status':
              await executeServerStatusAction(interaction);
              break;
            case 'player-list':
              await executePlayerListAction(interaction);
              break;
            default:
              await interaction.editReply({
                content: '❌ Ação não reconhecida.'
              });
          }
        } catch (error: any) {
          console.error(`Error executing command ${command.name}:`, error);
          
          const errorMessage = '❌ Ocorreu um erro ao executar o comando. Tente novamente mais tarde.';
          
          if (interaction.deferred) {
            await interaction.editReply({ content: errorMessage });
          } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
          }
        }
      }
    };

    // Register with bot
    bot.commands.set(command.name, commandHandler);
    
    console.log(`✅ Dynamic command registered: /${command.name}`);
    
  } catch (error) {
    console.error(`Error registering command ${command.name}:`, error);
  }
};

// Execute online members action
const executeOnlineMembersAction = async (interaction: any) => {
  try {
    // Get both game players and Discord members
    const [playersResponse, membersResponse] = await Promise.allSettled([
      axios.get('http://localhost:3050/api/internal/server-players'),
      axios.post('http://localhost:3050/api/users/info', {
        includeChannels: false,
        includeRoles: true,
        includeActivity: true
      })
    ]);

    if (playersResponse.status === 'rejected') {
      await interaction.editReply({
        content: '❌ Não foi possível obter dados do servidor. Tente novamente mais tarde.',
      });
      return;
    }

    if (membersResponse.status === 'rejected') {
      await interaction.editReply({
        content: '❌ Não foi possível obter dados dos membros do Discord. Tente novamente mais tarde.',
      });
      return;
    }

    const players = playersResponse.value.data;
    // const discordMembers = membersResponse.value.data.users; // Unused for now

    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#10B981')
      .setTitle('🎮 Membros da Família Online')
      .setDescription(`**${players.length}** jogadores online no servidor`)
      .setTimestamp()
      .setFooter({ 
        text: 'Black Golden Dashboard',
        iconURL: interaction.client.user?.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png'
      });

    if (players.length === 0) {
      embed.addFields({
        name: '📭 Servidor Vazio',
        value: 'Nenhum jogador está conectado no momento.',
        inline: false
      });
    } else {
      // Show all players
      const chunks = [];
      for (let i = 0; i < players.length; i += 10) {
        chunks.push(players.slice(i, i + 10));
      }

      chunks.forEach((chunk, index) => {
        const playerList = chunk.map((player: any) => {
          return `**${player.name}** (${player.ping}ms)`;
        }).join('\n');

        embed.addFields({
          name: index === 0 ? '👥 Jogadores Online' : `👥 Jogadores Online (${index + 1})`,
          value: playerList,
          inline: true
        });
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    console.error('❌ Error in online-members action:', error);
    await interaction.editReply({
      content: '❌ Ocorreu um erro ao buscar jogadores online. Tente novamente mais tarde.'
    });
  }
};

// Execute server status action
const executeServerStatusAction = async (interaction: any) => {
  try {
    const response = await axios.get('http://localhost:3050/api/internal/server-info');
    const serverData = response.data;

    const embed = new EmbedBuilder()
      .setColor('#3B82F6')
      .setTitle('📊 Status do Servidor')
      .setTimestamp()
      .setFooter({ 
        text: 'Black Golden Dashboard',
        iconURL: interaction.client.user?.displayAvatarURL()
      });

    if (serverData.online) {
      embed.addFields(
        { name: '🟢 Status', value: 'Online', inline: true },
        { name: '👥 Jogadores', value: `${serverData.clients}/${serverData.maxclients}`, inline: true },
        { name: '🏷️ Nome', value: serverData.hostname || 'N/A', inline: true },
        { name: '🗺️ Mapa', value: serverData.mapname || 'N/A', inline: true },
        { name: '🎮 Modo de Jogo', value: serverData.gametype || 'N/A', inline: true }
      );
    } else {
      embed.addFields({
        name: '🔴 Status',
        value: 'Servidor Offline',
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    console.error('❌ Error in server-status action:', error);
    await interaction.editReply({
      content: '❌ Ocorreu um erro ao obter status do servidor. Tente novamente mais tarde.'
    });
  }
};

// Execute player list action
const executePlayerListAction = async (interaction: any) => {
  try {
    const response = await axios.get('http://localhost:3050/api/internal/server-players');
    const players = response.data;

    const embed = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setTitle('📋 Lista de Jogadores')
      .setDescription(`**${players.length}** jogadores conectados`)
      .setTimestamp()
      .setFooter({ 
        text: 'Black Golden Dashboard',
        iconURL: interaction.client.user?.displayAvatarURL()
      });

    if (players.length === 0) {
      embed.addFields({
        name: '📭 Nenhum Jogador',
        value: 'O servidor está vazio no momento.',
        inline: false
      });
    } else {
      // Show all players with details
      const chunks = [];
      for (let i = 0; i < players.length; i += 8) {
        chunks.push(players.slice(i, i + 8));
      }

      chunks.forEach((chunk, index) => {
        const playerList = chunk.map((player: any, idx: number) => {
          return `**${idx + 1 + (index * 8)}.** ${player.name} (${player.ping}ms)`;
        }).join('\n');

        embed.addFields({
          name: index === 0 ? '👥 Jogadores' : `👥 Jogadores (${index + 1})`,
          value: playerList,
          inline: true
        });
      });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error: any) {
    console.error('❌ Error in player-list action:', error);
    await interaction.editReply({
      content: '❌ Ocorreu um erro ao obter lista de jogadores. Tente novamente mais tarde.'
    });
  }
};

// Initialize dynamic commands with bot instance
export const initializeDynamicCommands = async (bot: BotClient) => {
  try {
    const commands = loadCommands();
    
    for (const command of commands) {
      if (command.enabled) {
        await registerDiscordCommand(bot, command);
      }
    }
    
    console.log(`✅ Initialized ${commands.filter(c => c.enabled).length} dynamic Discord commands`);
    
  } catch (error) {
    console.error('❌ Error initializing dynamic commands:', error);
  }
};

// Routes

// Get all commands
router.get('/commands', async (_req: Request, res: Response): Promise<void> => {
  try {
    const commands = loadCommands();
    res.json({
      success: true,
      data: commands
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new command
router.post('/commands', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, channels, action, enabled } = req.body;
    
    if (!name || !action) {
      res.status(400).json({
        success: false,
        error: 'Name and action are required'
      });
      return;
    }

    const commands = loadCommands();
    
    // Check if command name already exists
    if (commands.some(cmd => cmd.name === name)) {
      res.status(400).json({
        success: false,
        error: 'Command name already exists'
      });
      return;
    }

    const newCommand: DiscordCommand = {
      id: uuidv4(),
      name,
      description: description || `Execute ${action} action`,
      channels: channels || [],
      action,
      enabled: enabled !== false
    };

    commands.push(newCommand);
    saveCommands(commands);

    // Register with Discord if enabled
    if (newCommand.enabled) {
      const bot = req.app.locals.bot;
      await registerDiscordCommand(bot, newCommand);
    }

    res.json({
      success: true,
      data: newCommand
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update command
router.put('/commands/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const commands = loadCommands();
    const commandIndex = commands.findIndex(cmd => cmd.id === id);
    
    if (commandIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Command not found'
      });
      return;
    }

    const oldCommand = commands[commandIndex];
    const updatedCommand = { ...oldCommand, ...updates };
    commands[commandIndex] = updatedCommand;
    saveCommands(commands);

    // Re-register with Discord
    const bot = req.app.locals.bot;
    
    // Remove old command
    bot.commands.delete(oldCommand.name);
    
    // Register new command if enabled
    if (updatedCommand.enabled) {
      await registerDiscordCommand(bot, updatedCommand);
    }

    res.json({
      success: true,
      data: updatedCommand
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete command
router.delete('/commands/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const commands = loadCommands();
    const commandIndex = commands.findIndex(cmd => cmd.id === id);
    
    if (commandIndex === -1) {
      res.status(404).json({
        success: false,
        error: 'Command not found'
      });
      return;
    }

    const command = commands[commandIndex];
    commands.splice(commandIndex, 1);
    saveCommands(commands);

    // Remove from Discord
    const bot = req.app.locals.bot;
    bot.commands.delete(command.name);

    res.json({
      success: true,
      message: 'Command deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;