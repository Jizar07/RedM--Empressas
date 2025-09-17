import { 
  ButtonInteraction, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle 
} from 'discord.js';
import SupplyChainService from '../services/SupplyChainService';

export async function handleSupplyChainRefresh(interaction: ButtonInteraction): Promise<void> {
  try {
    await interaction.deferUpdate();
    
    const supplyChainService = SupplyChainService.getInstance();
    const analytics = supplyChainService.getAnalytics();
    const activeSessions = supplyChainService.getAllActiveSessions();

    const embed = new EmbedBuilder()
      .setTitle('🔗 Supply Chain Status')
      .setColor(0x2B5CE6)
      .setDescription('Current Ferrovia supply chain analytics (Refreshed)')
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

    // Keep the same action buttons
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

    await interaction.editReply({ embeds: [embed], components: [row] });
    
  } catch (error) {
    console.error('Error in handleSupplyChainRefresh:', error);
    await interaction.followUp({
      content: '❌ Error refreshing supply chain status.',
      ephemeral: true
    });
  }
}

export async function handleSupplyChainResponsibilities(interaction: ButtonInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const supplyChainService = SupplyChainService.getInstance();
    const sessionsWithResponsibilities = supplyChainService.getSessionsWithResponsibilities();
    const overdueSessions = supplyChainService.getOverdueSessions();

    if (sessionsWithResponsibilities.length === 0) {
      await interaction.editReply({
        content: '✅ No workers currently have outstanding responsibilities!'
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

    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in handleSupplyChainResponsibilities:', error);
    await interaction.editReply({
      content: '❌ Error loading responsibility information.'
    });
  }
}

export async function handleSupplyChainAnalytics(interaction: ButtonInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const supplyChainService = SupplyChainService.getInstance();
    const analytics = supplyChainService.getAnalytics();
    const allSessions = supplyChainService.getAllActiveSessions();

    // Calculate additional analytics
    const managerSessions = allSessions.filter(s => s.role === 'manager');
    const workerSessions = allSessions.filter(s => s.role === 'worker');
    
    const totalBoxesProcessed = allSessions.reduce((sum, s) => sum + s.totalBoxesProcessed, 0);
    const totalRevenueGenerated = allSessions.reduce((sum, s) => sum + s.totalRevenueGenerated, 0);
    const totalRevenueReturned = allSessions.reduce((sum, s) => sum + s.totalRevenueReturned, 0);
    
    const averageBoxesPerWorker = allSessions.length > 0 ? Math.round(totalBoxesProcessed / allSessions.length) : 0;
    const completionRate = totalRevenueGenerated > 0 ? ((totalRevenueReturned / totalRevenueGenerated) * 100) : 0;

    const embed = new EmbedBuilder()
      .setTitle('📊 Supply Chain Analytics')
      .setColor(0x7C2D92)
      .setDescription('Detailed Ferrovia supply chain performance metrics')
      .addFields(
        { name: '📈 Performance Metrics', value: '────────────────────', inline: false },
        { name: 'Total Boxes Processed', value: totalBoxesProcessed.toString(), inline: true },
        { name: 'Revenue Generated', value: `$${totalRevenueGenerated.toFixed(2)}`, inline: true },
        { name: 'Revenue Returned', value: `$${totalRevenueReturned.toFixed(2)}`, inline: true },
        { name: 'Completion Rate', value: `${completionRate.toFixed(1)}%`, inline: true },
        { name: 'Avg Boxes/Worker', value: averageBoxesPerWorker.toString(), inline: true },
        { name: 'Outstanding Revenue', value: `$${(totalRevenueGenerated - totalRevenueReturned).toFixed(2)}`, inline: true },
        
        { name: '👥 Workforce Distribution', value: '────────────────────', inline: false },
        { name: 'Total Active Workers', value: allSessions.length.toString(), inline: true },
        { name: 'Managers', value: managerSessions.length.toString(), inline: true },
        { name: 'Workers', value: workerSessions.length.toString(), inline: true },
        
        { name: '⚠️ Risk Assessment', value: '────────────────────', inline: false },
        { name: 'Overdue Sessions', value: `${analytics.overdueSessions} (${((analytics.overdueSessions / Math.max(allSessions.length, 1)) * 100).toFixed(1)}%)`, inline: true },
        { name: 'At-Risk Revenue', value: `$${analytics.totalMoneyOwed.toFixed(2)}`, inline: true },
        { name: 'Boxes at Risk', value: analytics.totalBoxesInTransit.toString(), inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Supply Chain Analytics Dashboard' });

    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error in handleSupplyChainAnalytics:', error);
    await interaction.editReply({
      content: '❌ Error loading analytics data.'
    });
  }
}