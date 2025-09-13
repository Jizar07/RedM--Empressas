import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  MessageFlags 
} from 'discord.js';
import SupplyChainService from '../../../services/SupplyChainService';

export const data = new SlashCommandBuilder()
  .setName('supply-chain')
  .setDescription('View supply chain status and analytics')
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('View overall supply chain status'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('worker')
      .setDescription('View specific worker accountability')
      .addStringOption(option =>
        option.setName('worker')
          .setDescription('Worker name')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('responsibilities')
      .setDescription('View all workers with outstanding responsibilities'));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const subcommand = interaction.options.getSubcommand();
    const supplyChainService = new SupplyChainService();

    switch (subcommand) {
      case 'status':
        await handleStatusCommand(interaction, supplyChainService);
        break;
      case 'worker':
        await handleWorkerCommand(interaction, supplyChainService);
        break;
      case 'responsibilities':
        await handleResponsibilitiesCommand(interaction, supplyChainService);
        break;
      default:
        await interaction.reply({
          content: '❌ Unknown subcommand.',
          flags: MessageFlags.Ephemeral
        });
    }
  } catch (error) {
    console.error('Error in supply chain command:', error);
    await interaction.reply({
      content: '❌ Error processing supply chain command. Please try again.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleStatusCommand(interaction: ChatInputCommandInteraction, service: SupplyChainService) {
  const analytics = service.getAnalytics();
  const activeSessions = service.getAllActiveSessions();

  const embed = new EmbedBuilder()
    .setTitle('🔗 Supply Chain Status')
    .setColor(0x2B5CE6)
    .setDescription('Current Ferrovia supply chain analytics')
    .addFields(
      { name: '👥 Active Sessions', value: analytics.totalActiveSessions.toString(), inline: true },
      { name: '📦 Boxes in Transit', value: analytics.totalBoxesInTransit.toString(), inline: true },
      { name: '💰 Money Owed', value: `$${analytics.totalMoneyOwed.toFixed(2)}`, inline: true },
      { name: '⚠️ Overdue Sessions', value: analytics.overdueSessions.toString(), inline: true },
      { name: '✅ Completed Sessions', value: analytics.completedSessions.toString(), inline: true },
      { name: '📊 Active Workers', value: activeSessions.length.toString(), inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Ferrovia Supply Chain System' });

  // Add worker list if there are active sessions
  if (activeSessions.length > 0) {
    const workerList = activeSessions
      .slice(0, 10) // Limit to 10 workers for display
      .map(session => {
        const status = session.status === 'overdue' ? '⚠️' : 
                     session.status === 'completed' ? '✅' : '🔄';
        const boxes = session.openResponsibilities.boxesTaken;
        const money = session.openResponsibilities.moneyOwed;
        
        return `${status} **${session.workerName}** (${session.role})\n` +
               `📦 ${boxes} boxes | 💰 $${money.toFixed(2)}`;
      })
      .join('\n\n');
    
    embed.addFields({ 
      name: `👥 Active Workers ${activeSessions.length > 10 ? '(Top 10)' : ''}`, 
      value: workerList || 'No active workers', 
      inline: false 
    });
  }

  // Create action buttons
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('supply_chain_refresh')
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('supply_chain_responsibilities')
        .setLabel('⚠️ View Responsibilities')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('supply_chain_analytics')
        .setLabel('📊 Analytics')
        .setStyle(ButtonStyle.Success)
    );

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleWorkerCommand(interaction: ChatInputCommandInteraction, service: SupplyChainService) {
  const workerName = interaction.options.getString('worker', true);
  
  // Find worker by name
  const allSessions = service.getAllActiveSessions();
  const session = allSessions.find(s => 
    s.workerName.toLowerCase().includes(workerName.toLowerCase())
  );

  if (!session) {
    await interaction.reply({
      content: `❌ No active supply chain session found for worker: ${workerName}`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const accountability = service.getAccountabilitySummary(session.workerId);
  if (!accountability) {
    await interaction.reply({
      content: `❌ No accountability data found for worker: ${workerName}`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`👤 ${session.workerName} - Supply Chain Status`)
    .setColor(session.status === 'overdue' ? 0xFF0000 : 
              session.status === 'completed' ? 0x00FF00 : 0xFFAA00)
    .setDescription(`**Role:** ${session.role.charAt(0).toUpperCase() + session.role.slice(1)}`)
    .addFields(
      { name: '📦 Boxes Taken', value: accountability.boxesTaken.toString(), inline: true },
      { name: '💰 Money Owed', value: `$${accountability.moneyOwed.toFixed(2)}`, inline: true },
      { name: '📈 Total Processed', value: accountability.totalProcessed.toString(), inline: true },
      { name: '⏰ Days Until Due', value: accountability.daysUntilDue.toString(), inline: true },
      { name: '🎯 Completion Rate', value: `${accountability.completionRate.toFixed(1)}%`, inline: true },
      { name: '🔄 Status', value: session.status.charAt(0).toUpperCase() + session.status.slice(1), inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Worker Accountability Report' });

  // Add recent transactions
  const recentTransactions = session.transactions
    .slice(-5)
    .reverse()
    .map(tx => {
      const icon = getTransactionIcon(tx.type);
      const time = new Date(tx.timestamp).toLocaleString();
      return `${icon} **${tx.type.replace(/_/g, ' ')}**\n${tx.itemName} x${tx.quantity}${tx.amount ? ` ($${tx.amount})` : ''}\n*${time}*`;
    })
    .join('\n\n');

  if (recentTransactions) {
    embed.addFields({ name: '📝 Recent Transactions', value: recentTransactions, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

async function handleResponsibilitiesCommand(interaction: ChatInputCommandInteraction, service: SupplyChainService) {
  const sessionsWithResponsibilities = service.getSessionsWithResponsibilities();
  const overdueSessions = service.getOverdueSessions();

  if (sessionsWithResponsibilities.length === 0) {
    await interaction.reply({
      content: '✅ No workers currently have outstanding responsibilities!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Outstanding Responsibilities')
    .setColor(0xFF6B00)
    .setDescription(`${sessionsWithResponsibilities.length} workers with outstanding boxes or money`)
    .setTimestamp()
    .setFooter({ text: 'Supply Chain Accountability' });

  // Group by overdue and active
  const activeResponsibilities = sessionsWithResponsibilities.filter(s => s.status !== 'overdue');
  
  if (overdueSessions.length > 0) {
    const overdueList = overdueSessions
      .map(session => {
        const boxes = session.openResponsibilities.boxesTaken;
        const money = session.openResponsibilities.moneyOwed;
        const daysOverdue = Math.floor((Date.now() - session.openResponsibilities.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return `🚨 **${session.workerName}** (${session.role})\n` +
               `📦 ${boxes} boxes | 💰 $${money.toFixed(2)}\n` +
               `⏰ ${daysOverdue} days overdue`;
      })
      .join('\n\n');
    
    embed.addFields({ name: '🚨 OVERDUE', value: overdueList, inline: false });
  }

  if (activeResponsibilities.length > 0) {
    const activeList = activeResponsibilities
      .slice(0, 10)
      .map(session => {
        const boxes = session.openResponsibilities.boxesTaken;
        const money = session.openResponsibilities.moneyOwed;
        const daysUntilDue = Math.ceil((session.openResponsibilities.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        return `⏳ **${session.workerName}** (${session.role})\n` +
               `📦 ${boxes} boxes | 💰 $${money.toFixed(2)}\n` +
               `⏰ Due in ${daysUntilDue} days`;
      })
      .join('\n\n');
    
    embed.addFields({ 
      name: `⏳ ACTIVE ${activeResponsibilities.length > 10 ? '(Top 10)' : ''}`, 
      value: activeList, 
      inline: false 
    });
  }

  await interaction.reply({ embeds: [embed] });
}

// Autocomplete for worker names
export async function autocomplete(interaction: any) {
  try {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const supplyChainService = new SupplyChainService();
    const activeSessions = supplyChainService.getAllActiveSessions();
    
    const choices = activeSessions
      .filter(session => session.workerName.toLowerCase().includes(focusedValue))
      .slice(0, 25)
      .map(session => ({
        name: `${session.workerName} (${session.role}) - ${session.openResponsibilities.boxesTaken} boxes`,
        value: session.workerName
      }));
    
    await interaction.respond(choices);
  } catch (error) {
    console.error('Error in supply chain autocomplete:', error);
    await interaction.respond([]);
  }
}

function getTransactionIcon(type: string): string {
  switch (type) {
    case 'PLANTS_WITHDRAWN': return '🌱';
    case 'BOXES_CREATED': return '📦';
    case 'BOXES_WITHDRAWN': return '🚚';
    case 'FERROVIA_MISSION_COMPLETED': return '🚂';
    case 'REVENUE_COLLECTED': return '💰';
    case 'REVENUE_DISTRIBUTED': return '🏦';
    default: return '📋';
  }
}