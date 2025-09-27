import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import SupplyChainService, { SupplyChainSession } from './SupplyChainService';
import ItemTranslationService from './ItemTranslationService';
import RecipeService from './RecipeService';
import { WorkerChannelService } from './WorkerChannelService';
import DiscordRoleService from './DiscordRoleService';
import ManagerMoneyVerificationService from './ManagerMoneyVerificationService';
import { BoxOriginAnalyzer } from './BoxOriginAnalyzer';

interface FerroviaSessionEmbed {
  sessionId: string;
  workerId: string;
  workerName: string;
  channelId: string;
  embedMessageId?: string;
  lastUpdated: Date;
}

export class FerroviaSessionService {
  private static instance: FerroviaSessionService | null = null;
  private client: Client;
  private supplyChainService: SupplyChainService;
  private itemTranslationService: ItemTranslationService;
  private recipeService: RecipeService;
  private workerChannelService: WorkerChannelService;
  private discordRoleService: DiscordRoleService;
  private managerMoneyVerificationService: ManagerMoneyVerificationService;
  private boxOriginAnalyzer: BoxOriginAnalyzer;
  private activeEmbeds: Map<string, FerroviaSessionEmbed> = new Map();
  private dataDir: string;

  private constructor(client: Client) {
    this.client = client;
    this.supplyChainService = SupplyChainService.getInstance();
    this.itemTranslationService = ItemTranslationService.getInstance();
    this.recipeService = new RecipeService();
    this.workerChannelService = WorkerChannelService.getInstance(client);
    this.discordRoleService = DiscordRoleService.getInstance(client);
    this.managerMoneyVerificationService = ManagerMoneyVerificationService.getInstance();
    this.boxOriginAnalyzer = BoxOriginAnalyzer.getInstance();
    this.dataDir = path.join(process.cwd(), 'data', 'ferrovia-embeds');
    this.ensureDataDirectory();
    this.loadActiveEmbeds();
  }

  public static getInstance(client: Client): FerroviaSessionService {
    if (!FerroviaSessionService.instance) {
      console.log('🏭 Creating new FerroviaSessionService singleton instance');
      FerroviaSessionService.instance = new FerroviaSessionService(client);
    }
    return FerroviaSessionService.instance;
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('📁 Created Ferrovia embeds directory');
    }
  }

  private loadActiveEmbeds(): void {
    try {
      const embedsFile = path.join(this.dataDir, 'active-embeds.json');
      if (fs.existsSync(embedsFile)) {
        const data = fs.readFileSync(embedsFile, 'utf8');
        const embeds = JSON.parse(data);
        
        // Convert to Map and restore Date objects
        Object.entries(embeds).forEach(([workerId, embed]: [string, any]) => {
          embed.lastUpdated = new Date(embed.lastUpdated);
          this.activeEmbeds.set(workerId, embed);
        });
        
        console.log(`🚂 Loaded ${this.activeEmbeds.size} active Ferrovia embeds`);
      }
    } catch (error) {
      console.error('❌ Error loading active Ferrovia embeds:', error);
    }
  }

  private saveActiveEmbeds(): void {
    try {
      const embedsFile = path.join(this.dataDir, 'active-embeds.json');
      const embeds = Object.fromEntries(this.activeEmbeds);
      fs.writeFileSync(embedsFile, JSON.stringify(embeds, null, 2));
      console.log('💾 Saved active Ferrovia embeds to file');
    } catch (error) {
      console.error('❌ Error saving active Ferrovia embeds:', error);
    }
  }

  public async createOrUpdateEmbed(workerId: string, workerName: string, channelId: string): Promise<void> {
    // Rate limiting: prevent rapid successive updates (min 2 seconds between updates)
    const existingEmbed = this.activeEmbeds.get(workerId);
    if (existingEmbed && existingEmbed.lastUpdated) {
      const timeSinceLastUpdate = Date.now() - existingEmbed.lastUpdated.getTime();
      if (timeSinceLastUpdate < 2000) { // 2 seconds
        console.log(`⏱️ Rate limiting: Skipping embed update for ${workerName} (${timeSinceLastUpdate}ms since last update)`);
        return;
      }
    }

    // Get or create supply chain session
    const session = await this.supplyChainService.createOrGetSession(workerId, workerName, 'worker');
    
    let embedData = this.activeEmbeds.get(workerId);
    
    // Check if embed metadata is stale (session was reset)
    if (embedData && embedData.sessionId !== session.sessionId) {
      console.log(`🔄 RESET DETECTED: Session ID changed from ${embedData.sessionId.substring(0, 8)} → ${session.sessionId.substring(0, 8)}`);
      console.log(`   🔄 Updating embed metadata to new session (preserving message ID for update)`);
      
      // Update embed metadata with new session but preserve message ID to update existing message
      embedData.sessionId = session.sessionId;
      embedData.lastUpdated = new Date();
      await this.saveActiveEmbeds();
    }
    
    if (!embedData) {
      embedData = {
        sessionId: session.sessionId,
        workerId,
        workerName,
        channelId,
        lastUpdated: new Date()
      };
      
      this.activeEmbeds.set(workerId, embedData);
      await this.saveActiveEmbeds();
      
      if (session.transactions.length === 0) {
        console.log(`🆕 Created fresh Ferrovia embed for worker ${workerName} (${workerId}) - clean slate after reset`);
      } else {
        console.log(`🆕 Created new Ferrovia embed for worker ${workerName} (${workerId}) - ${session.transactions.length} transactions`);
      }
    } else {
      // Update existing embed metadata with current session
      embedData.sessionId = session.sessionId;
      embedData.lastUpdated = new Date();
      await this.saveActiveEmbeds();
    }

    await this.updateFerroviaEmbed(embedData, session);
  }

  // Update embed metadata to new session after reset (preserves message ID for update)
  public async updateEmbedSessionId(workerId: string, newSessionId: string): Promise<void> {
    const embedData = this.activeEmbeds.get(workerId);
    if (embedData && embedData.sessionId !== newSessionId) {
      console.log(`🔄 Updating embed session ID for worker ${workerId}: ${embedData.sessionId.substring(0, 8)} → ${newSessionId.substring(0, 8)}`);
      embedData.sessionId = newSessionId;
      embedData.lastUpdated = new Date();
      await this.saveActiveEmbeds();
    } else if (embedData) {
      console.log(`ℹ️ Embed for worker ${workerId} already has correct session ID`);
    } else {
      console.log(`ℹ️ No embed metadata found for worker ${workerId} - will create fresh`);
    }
  }

  private async updateFerroviaEmbed(embedData: FerroviaSessionEmbed, session: SupplyChainSession): Promise<void> {
    try {
      // Get current channel ID from WorkerChannelService (source of truth)
      const currentWorkerMapping = this.workerChannelService.getWorkerChannel(embedData.workerId);
      let channelId = embedData.channelId;

      if (currentWorkerMapping && currentWorkerMapping.channelId !== embedData.channelId) {
        console.log(`🔄 Updating cached channel ID for ${embedData.workerName}: ${embedData.channelId} → ${currentWorkerMapping.channelId}`);
        channelId = currentWorkerMapping.channelId;
        embedData.channelId = channelId;
        await this.saveActiveEmbeds(); // Save updated channel ID
      }

      const channel = await this.client.channels.fetch(channelId) as TextChannel;
      if (!channel) {
        console.error(`❌ Channel ${embedData.channelId} not found for worker ${embedData.workerName}`);
        return;
      }

      const embed = await this.createFerroviaSessionEmbed(session);
      const buttons = this.createFerroviaButtons(session);
      const components = buttons.components.length > 0 ? [buttons] : [];

      if (embedData.embedMessageId) {
        // Delete the old active embed to keep channel clean
        try {
          const oldMessage = await channel.messages.fetch(embedData.embedMessageId);
          await oldMessage.delete();
          console.log(`🗑️ Deleted old Ferrovia embed for ${embedData.workerName}`);
        } catch (error) {
          console.log(`ℹ️ Could not delete old Ferrovia embed (may already be deleted or transformed to receipt)`);
        }
        // Clear the old message ID
        embedData.embedMessageId = undefined;
        await this.saveActiveEmbeds(); // Save the cleared message ID
      }

      // Always create new message at the end of channel
      const message = await channel.send({ embeds: [embed], components });
      embedData.embedMessageId = message.id;
      embedData.lastUpdated = new Date();
      this.saveActiveEmbeds();

      // Pin the message to prevent deletion by /clear
      try {
        await message.pin();
        console.log(`📌 Pinned new Ferrovia embed for ${embedData.workerName} at end of channel ${embedData.channelId}`);

        // Delete ALL "pinned a message" system messages - same as Farm embed system
        try {
          // Wait longer for the system message to appear
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Fetch recent messages to find all pin system messages
          const recentMessages = await channel.messages.fetch({ limit: 15 });
          const systemMessages = recentMessages.filter(msg =>
            msg.type === 6 && // CHANNEL_PINNED_MESSAGE type
            msg.author.id === this.client.user?.id
          );

          if (systemMessages.size > 0) {
            console.log(`🗑️ Found ${systemMessages.size} pin system messages to delete for Ferrovia ${embedData.workerName}`);

            // Delete all found system messages
            for (const systemMessage of systemMessages.values()) {
              try {
                await systemMessage.delete();
                console.log(`🗑️ Deleted Ferrovia pin system message (ID: ${systemMessage.id})`);
                // Small delay between deletions to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (individualDeleteError: any) {
                // Handle specific Discord API errors gracefully
                if (individualDeleteError.code === 10008) {
                  // Error 10008 = Unknown Message (already deleted)
                  console.log(`ℹ️ Ferrovia pin message ${systemMessage.id} already deleted (this is normal)`);
                } else if (individualDeleteError.code === 50013) {
                  // Error 50013 = Missing Permissions
                  console.warn(`⚠️ Missing permissions to delete Ferrovia pin message ${systemMessage.id}`);
                } else {
                  // Other unexpected errors
                  console.warn(`⚠️ Could not delete Ferrovia pin message ${systemMessage.id}:`, individualDeleteError.message || individualDeleteError);
                }
              }
            }
          } else {
            console.log(`ℹ️ No pin system messages found to delete for Ferrovia ${embedData.workerName}`);
          }
        } catch (deleteError) {
          console.log(`ℹ️ Could not delete Ferrovia pin system messages:`, deleteError);
        }
      } catch (pinError) {
        console.warn(`⚠️ Failed to pin Ferrovia embed for ${embedData.workerName}:`, pinError);
      }

      console.log(`✨ Created new Ferrovia embed for ${embedData.workerName} at end of channel`);

    } catch (error) {
      console.error(`❌ Error updating Ferrovia embed for ${embedData.workerName}:`, error);
    }
  }

  private async createFerroviaSessionEmbed(session: SupplyChainSession): Promise<EmbedBuilder> {
    // Get real-time role information from Discord
    const roleDetection = await this.discordRoleService.detectUserRole(session.workerId);

    // Update session role if it has changed
    if (roleDetection.role !== 'unknown' && roleDetection.role !== session.role) {
      console.log(`🎭 Role changed for ${session.workerName}: ${session.role} -> ${roleDetection.role}`);
      session.role = roleDetection.role;
      // Save updated session
      await this.supplyChainService.saveSession(session);
    }

    const embed = new EmbedBuilder()
      .setTitle(`🚂 ${session.workerName} - Sessão Ferrovia Ativa`)
      .setTimestamp(session.lastActivity)
      .setFooter({ text: `Sessão: ${session.sessionId.substring(0, 8)}` });

    // Set color based on status
    switch (session.status) {
      case 'active':
        embed.setColor(0x00FF00); // Green
        break;
      case 'completed':
        embed.setColor(0x0088FF); // Blue
        break;
      case 'overdue':
        embed.setColor(0xFF0000); // Red
        break;
    }

    // Add session info
    embed.addFields({
      name: '📅 Informações da Sessão',
      value: `**Iniciado:** <t:${Math.floor(session.startTime.getTime() / 1000)}:R>\n**Última Atividade:** <t:${Math.floor(session.lastActivity.getTime() / 1000)}:R>\n**Cargo:** ${session.role === 'manager' ? 'Gerente' : 'Trabalhador'}`,
      inline: false
    });

    // Add recipe-based responsibility tracking section
    const plantsWithdrawn = this.supplyChainService.getPlantsWithdrawnFromSession(session);
    
    // Check if there are any plant transactions (withdrawn or deposited)
    const hasPlantTransactions = session.transactions.some(t => 
      t.type === 'PLANTS_WITHDRAWN' || t.type === 'PLANTS_DEPOSITED'
    );
    
    if (hasPlantTransactions || Object.keys(plantsWithdrawn).length > 0) {
      const responsibilityCalculation = this.recipeService.calculateExpectedProduction(plantsWithdrawn);
      
      // Always show plants section when there are plant transactions
      let plantsValue = '';
      if (Object.keys(plantsWithdrawn).length > 0) {
        // Show plants that are still owed (NET > 0)
        const display = this.recipeService.formatResponsibilityDisplay({
          ...responsibilityCalculation,
          expectedProductions: []
        });
        plantsValue = display.plantsWithdrawn.join('\n');
      }
      
      if (!plantsValue && hasPlantTransactions) {
        // Show when there have been plant transactions but NET is 0
        plantsValue = '✅ Todas as plantas foram devolvidas';
      } else if (!plantsValue) {
        plantsValue = 'Nenhuma planta retirada';
      }
      
      embed.addFields({
        name: '🌿 PLANTAS RETIRADAS',
        value: plantsValue,
        inline: false
      });
      
      // Only show production section if there are expected productions
      if (responsibilityCalculation.expectedProductions.length > 0) {
        // Update expected production status based on boxes delivered
        const boxesDelivered = this.supplyChainService.getBoxesFromSession(session);
        const updatedProductions = this.recipeService.updateProductionStatus(responsibilityCalculation.expectedProductions, boxesDelivered);
        
        // Format for display
        const display = this.recipeService.formatResponsibilityDisplay({
          ...responsibilityCalculation,
          expectedProductions: updatedProductions
        });
        
        // Add expected production section with status indicators
        embed.addFields({
          name: '📦 PRODUÇÃO ESPERADA',
          value: display.expectedProduction.join('\n') || 'Nenhuma produção calculada',
          inline: false
        });
      }
    }

    // Add boxes section with net calculation
    const boxesCreated = session.transactions.filter(t => t.type === 'BOXES_CREATED');
    const boxesWithdrawn = session.transactions.filter(t => t.type === 'BOXES_WITHDRAWN');
    const boxesReturned = session.transactions.filter(t => t.type === 'BOXES_RETURNED');

    if (boxesCreated.length > 0 || boxesWithdrawn.length > 0 || boxesReturned.length > 0) {
      let boxSection = '';

      if (boxesCreated.length > 0) {
        const createdSummary = this.getBoxesCreatedSummary(boxesCreated);
        boxSection += `**📦 CAIXAS CRIADAS:**\n${createdSummary.join('\n')}\n\n`;
      }

      if (boxesWithdrawn.length > 0) {
        const { hasBoxes } = this.getCurrentBoxesPossession(session);
        const netBoxes = this.getNetBoxesUsed(session);

        // Show current boxes in possession (what player currently holds)
        if (hasBoxes) {
          const possessionSummary = this.getCurrentBoxesPossessionSummary(session);
          boxSection += `**📤 CAIXAS EM POSSE:**\n${possessionSummary.join('\n')}`;
        } else {
          // When no boxes are currently held, show this clearly
          boxSection += `**📤 CAIXAS EM POSSE:**\n• Nenhuma caixa em posse`;
        }

        // Show transaction history if there were returns (to show what happened)
        if (boxesReturned.length > 0) {
          const returnedSummary = this.getBoxesReturnedSummary(boxesReturned);
          boxSection += `\n\n**↩️ CAIXAS DEVOLVIDAS:**\n${returnedSummary.join('\n')}`;

          // Show session summary for transparency
          boxSection += `\n\n**📊 RESUMO DA SESSÃO:**\n`;
          boxSection += `• Total retiradas: ${netBoxes.withdrawn}\n`;
          boxSection += `• Total devolvidas: ${netBoxes.returned}\n`;
          boxSection += `• **Usadas (líquido): ${netBoxes.net}**`;
        }
      }

      if (boxSection) {
        embed.addFields({
          name: '📦 Atividade de Caixas',
          value: boxSection,
          inline: false
        });
      }
    }

    // Add box origin analysis section
    const boxOriginAnalysis = this.boxOriginAnalyzer.analyzeSession(session);
    if (boxOriginAnalysis.totalBoxesWithdrawn > 0) {
      let originSection = '';

      // Production analysis
      if (boxOriginAnalysis.totalBoxesCreated > 0) {
        originSection += `✅ **Produção Própria:** ${boxOriginAnalysis.totalBoxesCreated} caixas (plantas: ${boxOriginAnalysis.totalPlantsUsed})\n`;
      }

      // External box suspicion
      if (boxOriginAnalysis.externalBoxesSuspected > 0) {
        const suspicionEmoji = boxOriginAnalysis.suspicionLevel === 'high' ? '🚨' : '⚠️';
        originSection += `${suspicionEmoji} **Fonte Externa (Suspeita):** ${boxOriginAnalysis.externalBoxesSuspected} caixas\n`;
      }

      // Plant-to-box ratio analysis
      if (boxOriginAnalysis.plantToBoxRatio > 0) {
        const ratioEmoji = boxOriginAnalysis.plantToBoxRatio < 250 ? '⚠️' : '📊';
        originSection += `${ratioEmoji} **Ratio P/C:** ${boxOriginAnalysis.plantToBoxRatio.toFixed(1)} (Normal: 250-300)\n`;
      }

      // Farm revenue impact
      if (boxOriginAnalysis.farmRevenueImpact > 0) {
        originSection += `💰 **Impacto na Receita:** -$${boxOriginAnalysis.farmRevenueImpact.toFixed(2)} (farm)\n`;
      }

      // Detection flags
      if (boxOriginAnalysis.detectionFlags.length > 0) {
        originSection += `\n**🔍 Alertas de Detecção:**\n`;
        boxOriginAnalysis.detectionFlags.forEach(flag => {
          originSection += `• ${flag}\n`;
        });
      }

      if (originSection) {
        const fieldName = boxOriginAnalysis.suspicionLevel === 'high' ? '🚨 ANÁLISE DE ORIGEM DAS CAIXAS' :
                         boxOriginAnalysis.suspicionLevel === 'medium' ? '⚠️ ANÁLISE DE ORIGEM DAS CAIXAS' :
                         '🔍 ANÁLISE DE ORIGEM DAS CAIXAS';

        embed.addFields({
          name: fieldName,
          value: originSection.substring(0, 1024), // Discord limit
          inline: false
        });
      }

      // Add detailed timeline section
      const detailedTimeline = this.boxOriginAnalyzer.createDetailedTimeline(session);
      if (detailedTimeline.events.length > 0) {
        let timelineSection = '';

        // Show recent events (last 8 to fit Discord limits)
        const recentEvents = detailedTimeline.events.slice(-8);
        recentEvents.forEach(event => {
          const timeStr = event.timestamp.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });

          const suspiciousEmoji = event.suspiciousFlag ? ' ⚠️ ORIGEM SUSPEITA' : '';
          const sourceEmoji = event.source === 'external_purchase' ? ' 🚨' :
                            event.source === 'farm_produced' ? ' ✅' : '';

          timelineSection += `${timeStr} - ${event.details}${suspiciousEmoji}${sourceEmoji}\n`;
        });

        if (timelineSection && timelineSection.length <= 1024) {
          embed.addFields({
            name: '⏰ LINHA TEMPORAL DETALHADA',
            value: timelineSection,
            inline: false
          });
        }
      }
    }

    // Add missions section with count
    const missions = session.transactions.filter(t => t.type === 'FERROVIA_MISSION_COMPLETED');

    // Debug logging to understand what transactions exist
    console.log(`🔍 EMBED DEBUG - Session ${session.sessionId.substring(0, 8)} for ${session.workerName}:`);
    console.log(`🔍 Total transactions: ${session.transactions.length}`);
    console.log(`🔍 Transaction types: ${session.transactions.map(t => t.type).join(', ')}`);
    console.log(`🔍 Missions found: ${missions.length}`);

    // Infer mission count from available data if no explicit mission transactions exist
    let inferredMissionCount = missions.length;

    if (missions.length === 0) {
      // Try to infer missions from NET boxes consumed for missions (withdrawn - returned) + revenue collected
      // Note: This uses net consumption for mission calculation, different from current possession
      const boxesWithdrawn = session.transactions.filter(t => t.type === 'BOXES_WITHDRAWN');
      const boxesReturned = session.transactions.filter(t => t.type === 'BOXES_RETURNED');
      const revenueCollected = session.transactions.filter(t => t.type === 'REVENUE_COLLECTED');

      if (boxesWithdrawn.length > 0 && revenueCollected.length > 0) {
        const totalWithdrawn = boxesWithdrawn.reduce((sum, t) => sum + t.quantity, 0);
        const totalReturned = boxesReturned.reduce((sum, t) => sum + t.quantity, 0);
        const netBoxesUsed = totalWithdrawn - totalReturned;
        const totalRevenue = revenueCollected.reduce((sum, t) => sum + (t.amount || 0), 0);

        // Estimate missions: typically 1 mission = 250 boxes = $1000 revenue
        const estimatedFromBoxes = Math.floor(netBoxesUsed / 250);
        const estimatedFromRevenue = Math.floor(totalRevenue / 1000);

        // Use the lower estimate to be conservative, but ensure it's positive
        inferredMissionCount = Math.max(0, Math.min(estimatedFromBoxes, estimatedFromRevenue));

        if (inferredMissionCount > 0) {
          console.log(`🔍 INFERENCE: Estimated ${inferredMissionCount} missions from ${netBoxesUsed} net boxes (${totalWithdrawn} withdrawn - ${totalReturned} returned) and $${totalRevenue} revenue`);
        } else if (netBoxesUsed > 0) {
          console.log(`🔍 INFERENCE: ${netBoxesUsed} net boxes used but insufficient for mission estimation (need 250+ boxes or $1000+ revenue)`);
        }
      }
    }

    if (missions.length > 0) {
      const missionSummary = missions.map((t, index) => {
        const timeStr = `<t:${Math.floor(t.timestamp.getTime() / 1000)}:t>`;
        const isRecent = (Date.now() - t.timestamp.getTime()) < 5 * 60 * 1000; // Last 5 minutes
        const recentTag = isRecent ? ' ✅ **CONCLUÍDA!**' : '';
        return `• **Missão ${index + 1}:** ${timeStr} - ${t.quantity} caixas usadas${recentTag}`;
      });

      embed.addFields({
        name: `🚂 Missões da Ferrovia Completadas (${missions.length})`,
        value: missionSummary.join('\n'),
        inline: false
      });
    } else if (inferredMissionCount > 0) {
      // Show estimated missions when no explicit mission transactions exist
      embed.addFields({
        name: `🚂 Missões Estimadas (${inferredMissionCount})`,
        value: `• Estimado baseado em caixas retiradas e receita coletada\n• Missões detectadas: ${inferredMissionCount}`,
        inline: false
      });
    }

    // Add revenue section
    const revenueCollected = session.transactions.filter(t => t.type === 'REVENUE_COLLECTED');
    const revenueDistributed = session.transactions.filter(t => t.type === 'REVENUE_DISTRIBUTED');

    if (revenueCollected.length > 0 || revenueDistributed.length > 0) {
      let revenueSection = '';

      if (revenueCollected.length > 0) {
        const collectedTotal = revenueCollected.reduce((sum, t) => sum + (t.amount || 0), 0);
        revenueSection += `**💰 RECEITA COLETADA:** $${collectedTotal.toFixed(2)}\n`;
      }

      if (revenueDistributed.length > 0) {
        const distributedTotal = revenueDistributed.reduce((sum, t) => sum + (t.amount || 0), 0);
        revenueSection += `**💸 RECEITA DISTRIBUÍDA:** $${distributedTotal.toFixed(2)}\n`;
      }

      if (revenueSection) {
        embed.addFields({
          name: '💰 Receita',
          value: revenueSection,
          inline: false
        });
      }
    }

    // Add new money tracking sections
    const moneyWithdrawn = session.transactions.filter(t => t.type === 'MONEY_WITHDRAWN_FROM_FERROVIA');
    const moneyDeposited = session.transactions.filter(t => t.type === 'MONEY_DEPOSITED_TO_INVENTORY');

    if (moneyWithdrawn.length > 0 || moneyDeposited.length > 0 || (session.totalMoneyWithdrawn && session.totalMoneyWithdrawn > 0) || (session.totalMoneyDeposited && session.totalMoneyDeposited > 0)) {
      let moneySection = '';

      if (session.totalMoneyWithdrawn && session.totalMoneyWithdrawn > 0) {
        moneySection += `**💸 DINHEIRO RETIRADO DA FERROVIA:** $${session.totalMoneyWithdrawn.toFixed(2)}\n`;
      }

      if (session.totalMoneyDeposited && session.totalMoneyDeposited > 0) {
        moneySection += `**💳 DINHEIRO DEPOSITADO NO ESTOQUE:** $${session.totalMoneyDeposited.toFixed(2)}\n`;
      }

      if (moneySection) {
        embed.addFields({
          name: '💰 Movimentação Financeira',
          value: moneySection,
          inline: false
        });
      }
    }

    // Add role-based payment calculations
    if (missions.length > 0 || inferredMissionCount > 0) {
      const missionCount = Math.max(missions.length, inferredMissionCount);
      let paymentSection = '';

      if (session.role === 'manager') {
        const payment = this.calculateManagerPayment(missionCount);

        paymentSection = `**👔 CÁLCULO GERENTE:**\n`;
        paymentSection += `• Missões para si: ${payment.personalMissions} × $1000 = $${payment.personalEarnings.toFixed(2)}\n`;
        paymentSection += `• Missões para depósito: ${payment.depositMissions} × $1000 = $${payment.depositAmount.toFixed(2)}\n`;
        paymentSection += `**💼 Total a receber:** $${payment.personalEarnings.toFixed(2)}\n`;
        paymentSection += `**🏦 Total a depositar:** $${payment.depositAmount.toFixed(2)}`;

      } else {
        const payment = this.calculateWorkerPayment(missionCount);

        paymentSection = `**👷 CÁLCULO TRABALHADOR:**\n`;
        paymentSection += `• Missões completadas: ${missionCount}`;
        if (inferredMissionCount > 0 && missions.length === 0) {
          paymentSection += ` (estimado)`;
        }
        paymentSection += `\n• Pagamento: ${missionCount} × $${payment.perMissionRate} = $${payment.totalEarnings.toFixed(2)}\n`;
        paymentSection += `**💵 Total a receber:** $${payment.totalEarnings.toFixed(2)}`;

        // Update session payment tracking
        this.updateSessionPayment(session, missionCount).catch(error => {
          console.error(`❌ Error updating session payment for ${session.workerName}:`, error);
        });
      }

      embed.addFields({
        name: '💵 Cálculo de Pagamento',
        value: paymentSection,
        inline: false
      });
    }

    // Add money verification status for managers
    if (session.role === 'manager') {
      const verificationStatus = this.managerMoneyVerificationService.getSessionVerificationStatus(session.sessionId);

      if (verificationStatus.hasObligation) {
        let verificationSection = '';

        if (verificationStatus.status === 'fulfilled') {
          verificationSection = `✅ **OBRIGAÇÃO CUMPRIDA**\n`;
          verificationSection += `• Retirado da Ferrovia: $${verificationStatus.withdrawalAmount.toFixed(2)}\n`;
          verificationSection += `• Depositado no Estoque: $${verificationStatus.depositedAmount.toFixed(2)}\n`;
          verificationSection += `• Status: Cumprida ✅`;
        } else {
          const statusIcon = verificationStatus.status === 'overdue' ? '❌' : '⏳';
          const statusText = verificationStatus.status === 'overdue' ? 'VENCIDA' : 'PENDENTE';

          verificationSection = `${statusIcon} **OBRIGAÇÃO DE DEPÓSITO ${statusText}**\n`;
          verificationSection += `• Retirado da Ferrovia: $${verificationStatus.withdrawalAmount.toFixed(2)}\n`;
          verificationSection += `• Deve depositar: $${verificationStatus.depositObligation.toFixed(2)}\n`;
          verificationSection += `• Já depositado: $${verificationStatus.depositedAmount.toFixed(2)}\n`;
          verificationSection += `• **Faltam depositar: $${verificationStatus.remainingObligation.toFixed(2)}**\n`;

          if (verificationStatus.isOverdue) {
            verificationSection += `• ⚠️ **VENCIDO há ${Math.abs(verificationStatus.daysUntilDeadline)} dias**`;
          } else {
            verificationSection += `• ⏰ Prazo: ${verificationStatus.daysUntilDeadline} dias restantes`;
          }
        }

        embed.addFields({
          name: '💰 Verificação de Depósito',
          value: verificationSection,
          inline: false
        });
      }
    }

    // Add comprehensive responsibility status section (only if not already added above)
    const sessionPlantsWithdrawn = this.supplyChainService.getPlantsWithdrawnFromSession(session);
    if (Object.keys(sessionPlantsWithdrawn).length > 0) {
      const responsibilityCalculation = this.recipeService.calculateExpectedProduction(sessionPlantsWithdrawn);
      
      if (responsibilityCalculation.expectedProductions.length > 0) {
        const boxesDelivered = this.supplyChainService.getBoxesFromSession(session);
        const updatedProductions = this.recipeService.updateProductionStatus(responsibilityCalculation.expectedProductions, boxesDelivered);
        
        const display = this.recipeService.formatResponsibilityDisplay({
          ...responsibilityCalculation,
          expectedProductions: updatedProductions
        });
        
        // Only add status section if not already present (check if we already added responsibility tracking above)
        const existingFields = embed.data.fields || [];
        const hasResponsibilityStatus = existingFields.some(field => field.name === '📋 STATUS DAS RESPONSABILIDADES');
        
        if (!hasResponsibilityStatus) {
          // Show overall responsibility status
          embed.addFields({
            name: '📋 STATUS DAS RESPONSABILIDADES',
            value: display.responsibilityStatus,
            inline: false
          });
          
          // Show remaining obligations if any
          const remainingObligations = this.calculateRemainingObligations(updatedProductions, sessionPlantsWithdrawn);
          if (remainingObligations) {
            embed.addFields({
              name: '⚠️ AINDA DEVE ENTREGAR',
              value: remainingObligations,
              inline: false
            });
          }
        }
      }
    }

    // Add traditional accountability section if there are net outstanding responsibilities
    const netBoxes = this.getNetBoxesUsed(session);
    const netBoxesOutstanding = Math.max(0, netBoxes.net); // Only positive net boxes are outstanding

    // Calculate net money owed based on net boxes and role
    let netMoneyOwed = 0;
    if (netBoxesOutstanding > 0) {
      const revenueCalc = this.supplyChainService.calculateRevenueDistribution(netBoxesOutstanding, session.role);
      // For managers: they owe the farm share (50%)
      // For workers: they receive the worker share (25%)
      netMoneyOwed = session.role === 'manager' ? revenueCalc.farmShare : revenueCalc.workerShare;
    }

    if (netBoxesOutstanding > 0 || netMoneyOwed > 0) {
      const daysUntilDue = Math.ceil((session.openResponsibilities.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const dueDateStr = daysUntilDue > 0 ? `${daysUntilDue} dias restantes` : '⚠️ VENCIDO';

      // Use proper language based on role
      const moneyLabel = session.role === 'manager' ? 'Dinheiro a Devolver' : 'Dinheiro a Receber';

      embed.addFields({
        name: '⚠️ RESPONSABILIDADES ANTIGAS',
        value: `**📦 Caixas em Trânsito:** ${netBoxesOutstanding}\n**💰 ${moneyLabel}:** $${netMoneyOwed.toFixed(2)}\n**📅 Prazo:** ${dueDateStr}`,
        inline: false
      });
    }


    // Add totals section
    embed.addFields({
      name: '📊 Totais da Sessão',
      value: `**📦 Total de Caixas Processadas:** ${session.totalBoxesProcessed}\n**💰 Receita Total Gerada:** $${session.totalRevenueGenerated.toFixed(2)}\n**💸 Receita Total Devolvida:** $${session.totalRevenueReturned.toFixed(2)}`,
      inline: false
    });

    return embed;
  }

  /**
   * Calculate payment for manager role
   * Managers get $1000 per mission - take 50% for themselves, deposit the rest
   */
  private calculateManagerPayment(missionCount: number): { personalEarnings: number; depositAmount: number; personalMissions: number; depositMissions: number } {
    const personalMissions = Math.floor(missionCount * 0.5);
    const depositMissions = missionCount - personalMissions;
    const personalEarnings = personalMissions * 1000;
    const depositAmount = depositMissions * 1000;

    return {
      personalEarnings,
      depositAmount,
      personalMissions,
      depositMissions
    };
  }


  /**
   * Calculate payment for worker role
   * Workers get $250 per mission completed
   */
  private calculateWorkerPayment(missionCount: number): { totalEarnings: number; perMissionRate: number } {
    const perMissionRate = 250;
    const totalEarnings = missionCount * perMissionRate;

    return {
      totalEarnings,
      perMissionRate
    };
  }

  /**
   * Calculate net boxes used (withdrawn - returned) for a session
   */
  private getNetBoxesUsed(session: SupplyChainSession): { withdrawn: number; returned: number; net: number } {
    const boxesWithdrawn = session.transactions.filter(t => t.type === 'BOXES_WITHDRAWN');
    const boxesReturned = session.transactions.filter(t => t.type === 'BOXES_RETURNED');

    const totalWithdrawn = boxesWithdrawn.reduce((sum, t) => sum + t.quantity, 0);
    const totalReturned = boxesReturned.reduce((sum, t) => sum + t.quantity, 0);
    const net = totalWithdrawn - totalReturned;

    return {
      withdrawn: totalWithdrawn,
      returned: totalReturned,
      net: net
    };
  }

  /**
   * Update session with calculated payment and save if needed
   */
  private async updateSessionPayment(session: SupplyChainSession, missionCount: number): Promise<void> {
    if (session.role === 'worker') {
      const payment = this.calculateWorkerPayment(missionCount);
      if (session.totalPaymentOwed !== payment.totalEarnings) {
        session.totalPaymentOwed = payment.totalEarnings;
        await this.supplyChainService.saveSession(session);
        console.log(`💵 Updated payment owed for worker ${session.workerName}: $${payment.totalEarnings}`);
      }
    }
    // Managers don't have a fixed "owed" amount since they control the distribution
  }

  /**
   * Create payment owed transaction for worker when missions are completed
   * This creates a proper transaction record for the payment calculation
   * @unused - Reserved for future use when automatic payment tracking is needed
   */
  // @ts-ignore - Method reserved for future use
  private async createWorkerPaymentTransaction(session: SupplyChainSession, newMissionCount: number): Promise<void> {
    if (session.role === 'worker' && newMissionCount > 0) {
      const payment = this.calculateWorkerPayment(newMissionCount);

      // Create a WORKER_PAYMENT_OWED transaction
      const paymentTransaction = {
        transactionId: `payment_${Date.now()}`,
        type: 'WORKER_PAYMENT_OWED' as const,
        itemName: 'Payment',
        quantity: newMissionCount,
        amount: payment.totalEarnings,
        timestamp: new Date(),
        originalMessage: `Payment owed: ${newMissionCount} missions × $${payment.perMissionRate} = $${payment.totalEarnings}`
      };

      await this.supplyChainService.addTransaction(session.workerId, paymentTransaction);
      console.log(`💵 Created payment transaction for worker ${session.workerName}: $${payment.totalEarnings} for ${newMissionCount} missions`);
    }
  }


  private getBoxesCreatedSummary(transactions: any[]): string[] {
    const boxesMap = new Map<string, number>();
    
    transactions.forEach(t => {
      const current = boxesMap.get(t.itemName) || 0;
      boxesMap.set(t.itemName, current + t.quantity);
    });

    return Array.from(boxesMap.entries()).map(([item, quantity]) => {
      const translatedName = this.itemTranslationService.getPortugueseName(item);
      return `• ${quantity} ${translatedName}`;
    });
  }

  private getBoxesReturnedSummary(transactions: any[]): string[] {
    const boxesMap = new Map<string, number>();

    transactions.forEach(t => {
      const current = boxesMap.get(t.itemName) || 0;
      boxesMap.set(t.itemName, current + t.quantity);
    });

    return Array.from(boxesMap.entries()).map(([item, quantity]) => {
      const translatedName = this.itemTranslationService.getPortugueseName(item);
      return `• ${quantity} ${translatedName}`;
    });
  }

  /**
   * Get current boxes in possession (what player currently holds after latest transactions)
   * This tracks the chronological sequence to determine current state, not cumulative history
   */
  private getCurrentBoxesPossession(session: SupplyChainSession): { possession: Map<string, number>; hasBoxes: boolean } {
    // Get all box transactions sorted by timestamp
    const boxTransactions = session.transactions
      .filter(t => t.type === 'BOXES_WITHDRAWN' || t.type === 'BOXES_RETURNED')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const possession = new Map<string, number>();

    // Process transactions chronologically to track current possession
    boxTransactions.forEach(transaction => {
      const currentAmount = possession.get(transaction.itemName) || 0;

      if (transaction.type === 'BOXES_WITHDRAWN') {
        // Add boxes to possession
        possession.set(transaction.itemName, currentAmount + transaction.quantity);
      } else if (transaction.type === 'BOXES_RETURNED') {
        // Remove boxes from possession (but don't go negative)
        possession.set(transaction.itemName, Math.max(0, currentAmount - transaction.quantity));
      }
    });

    // Remove items with 0 quantity
    for (const [item, quantity] of possession.entries()) {
      if (quantity <= 0) {
        possession.delete(item);
      }
    }

    return {
      possession,
      hasBoxes: possession.size > 0 && Array.from(possession.values()).some(q => q > 0)
    };
  }

  /**
   * Get summary of boxes currently in possession
   */
  private getCurrentBoxesPossessionSummary(session: SupplyChainSession): string[] {
    const { possession } = this.getCurrentBoxesPossession(session);

    return Array.from(possession.entries()).map(([item, quantity]) => {
      const translatedName = this.itemTranslationService.getPortugueseName(item);
      return `• ${quantity} ${translatedName}`;
    });
  }

  /**
   * Get comprehensive session summary for verification receipts
   */
  public getSessionVerificationSummary(session: SupplyChainSession): {
    missions: {
      completed: number;
      netBoxesUsed: number;
      totalWithdrawn: number;
      totalReturned: number;
    };
    money: {
      revenueCollected: number;
      expectedManagerPayment: number;
      expectedDeposit: number;
    };
    obligations: {
      pendingBoxes: number;
      pendingMoney: number;
    };
  } {
    // Calculate missions
    const explicitMissions = session.transactions.filter(t => t.type === 'FERROVIA_MISSION_COMPLETED');
    const netBoxes = this.getNetBoxesUsed(session);
    const estimatedMissions = netBoxes.net > 0 ? Math.floor(netBoxes.net / 250) : 0; // 250 boxes per mission
    const missionsCompleted = Math.max(explicitMissions.length, estimatedMissions);

    // Calculate money
    const revenueTransactions = session.transactions.filter(t => t.type === 'REVENUE_COLLECTED');
    const totalRevenue = revenueTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Manager gets 50% as payment, must deposit 50% to inventory
    const expectedManagerPayment = totalRevenue * 0.5;
    const expectedDeposit = totalRevenue * 0.5;

    // Calculate current obligations
    const { possession } = this.getCurrentBoxesPossession(session);
    const currentBoxes = Array.from(possession.values()).reduce((sum, qty) => sum + qty, 0);

    return {
      missions: {
        completed: missionsCompleted,
        netBoxesUsed: netBoxes.net,
        totalWithdrawn: netBoxes.withdrawn,
        totalReturned: netBoxes.returned
      },
      money: {
        revenueCollected: totalRevenue,
        expectedManagerPayment,
        expectedDeposit
      },
      obligations: {
        pendingBoxes: currentBoxes, // Boxes currently in possession
        pendingMoney: 0 // Will be updated with actual money verification
      }
    };
  }

  private createFerroviaButtons(session: SupplyChainSession): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (session.status === 'active') {
      // Add verified button (green) - manager only
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ferrovia_verified_${session.workerId}`)
          .setLabel('✅ Verificado')
          .setStyle(ButtonStyle.Success)
      );

      // Add reset button (red) - manager only
      // TEMPORARILY DISABLED FOR TESTING
      /*
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ferrovia_reset_${session.workerId}`)
          .setLabel('🗑️ Resetar')
          .setStyle(ButtonStyle.Danger)
      );
      */
    }

    return row;
  }

  // Call this method when Ferrovia activity is detected
  public async onFerroviaActivity(workerId: string, workerName: string, channelId: string): Promise<void> {
    await this.createOrUpdateEmbed(workerId, workerName, channelId);
  }

  // Handle plant deposits (check if Ferrovia return vs Farm Service)
  public async handlePlantDeposit(workerId: string, workerName: string, channelId: string, plantName: string, quantity: number, messageContent: string): Promise<void> {
    try {
      // Get existing session to check for recent seed activity
      const session = await this.supplyChainService.createOrGetSession(workerId, workerName, 'worker');
      
      // Check if there are recent seed withdrawals (within this session)
      const recentSeeds = session.transactions.filter(t => 
        t.type === 'SEEDS_WITHDRAWN' && 
        this.itemTranslationService.isSeed(t.itemName)
      );
      
      if (recentSeeds.length > 0) {
        console.log(`🚜 Plant deposit by ${workerName} is Farm Service (recent seeds found) - ignoring for Ferrovia`);
        return; // This is farm service, not Ferrovia return
      }
      
      // This is a Ferrovia return - track it
      console.log(`🚂 Plant deposit by ${workerName} is Ferrovia return - tracking`);
      await this.trackSupplyChainActivity(workerId, workerName, channelId, `Plants deposited: ${quantity} ${plantName}`, messageContent);
      
    } catch (error) {
      console.error(`❌ Error handling plant deposit for ${workerName}:`, error);
    }
  }

  // Track specific supply chain activities and update the embed
  public async trackSupplyChainActivity(workerId: string, workerName: string, channelId: string, activityType: string, messageContent: string): Promise<void> {
    try {
      console.log(`🚂 DEBUG - Tracking Ferrovia activity for ${workerName}:`);
      console.log(`🚂 ActivityType: "${activityType}"`);
      console.log(`🚂 Message: "${messageContent}"`);

      // Get or create supply chain session
      const session = await this.supplyChainService.createOrGetSession(workerId, workerName, 'worker');

      // Parse the activity and create appropriate transaction
      let transaction = null;
      
      if (activityType.startsWith('Plants withdrawn:')) {
        // Plants taken from inventory (for making boxes) - ALL plants
        const plantsMatch = activityType.match(/Plants withdrawn: (\d+) (junco|trigo|milho|corn|wheat|bulrush|milk_weed)/i);
        if (plantsMatch) {
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'PLANTS_WITHDRAWN' as const,
            itemName: plantsMatch[2],
            quantity: parseInt(plantsMatch[1]),
            timestamp: new Date(),
            originalMessage: messageContent
          };
        }
      } else if (activityType.startsWith('Boxes deposited:')) {
        // Boxes made from plants and added to inventory - ALL box types except caixarustica
        const boxesMatch = activityType.match(/Boxes deposited: (\d+) (caixadeverduras|caixadelegumes|caixa_agro|caixa_verduras)/i);
        if (boxesMatch) {
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'BOXES_CREATED' as const,
            itemName: boxesMatch[2],
            quantity: parseInt(boxesMatch[1]),
            timestamp: new Date(),
            originalMessage: messageContent
          };
        }
      } else if (activityType.startsWith('Boxes withdrawn:')) {
        // Boxes taken from inventory (for missions) - ALL box types except caixarustica
        const boxesMatch = activityType.match(/Boxes withdrawn: (\d+) (caixadeverduras|caixadelegumes|caixa_agro|caixa_verduras)/i);
        if (boxesMatch) {
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'BOXES_WITHDRAWN' as const,
            itemName: boxesMatch[2],
            quantity: parseInt(boxesMatch[1]),
            timestamp: new Date(),
            originalMessage: messageContent
          };
          
          // Add to open responsibilities
          session.openResponsibilities.boxesTaken += parseInt(boxesMatch[1]);
          session.openResponsibilities.moneyOwed += parseInt(boxesMatch[1]) * 4; // Each box is worth $4
        }
      } else if (activityType.startsWith('Boxes returned:')) {
        // Boxes returned to inventory (unused from Ferrovia)
        const boxesMatch = activityType.match(/Boxes returned: (\d+) (caixadeverduras|caixadelegumes|caixa_agro|caixa_verduras)/i);
        if (boxesMatch) {
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'BOXES_RETURNED' as const,
            itemName: boxesMatch[2],
            quantity: parseInt(boxesMatch[1]),
            timestamp: new Date(),
            originalMessage: messageContent
          };

          console.log(`📦 Box return detected: ${parseInt(boxesMatch[1])} ${boxesMatch[2]} returned to inventory`);
        }
      } else if (activityType === 'Mission completed') {
        // Mission completed using boxes
        console.log(`✅ MISSION PROCESSING: Detected mission completion activity`);
        transaction = {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'FERROVIA_MISSION_COMPLETED' as const,
          itemName: 'ferrovia_mission',
          quantity: 250, // Each mission uses 250 boxes
          timestamp: new Date(),
          originalMessage: messageContent
        };
      } else if (activityType.startsWith('Money collected:')) {
        // Money taken from Ferrovia (from completed missions)
        const moneyMatch = activityType.match(/Money collected: \$?([\d,\.]+)/);
        if (moneyMatch) {
          const amount = parseFloat(moneyMatch[1].replace(/,/g, ''));
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'REVENUE_COLLECTED' as const,
            itemName: 'ferrovia_revenue',
            quantity: 1,
            amount: amount,
            timestamp: new Date(),
            originalMessage: messageContent
          };

          session.totalRevenueGenerated += amount;
        }
      } else if (activityType.startsWith('Revenue collected:')) {
        // Revenue collected from company withdrawals (COOPERATIVA - SACOU)
        const revenueMatch = activityType.match(/Revenue collected: \$?([\d,\.]+)/);
        if (revenueMatch) {
          const amount = parseFloat(revenueMatch[1].replace(/,/g, ''));
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'REVENUE_COLLECTED' as const,
            itemName: 'company_withdrawal',
            quantity: 1,
            amount: amount,
            timestamp: new Date(),
            originalMessage: messageContent
          };

          session.totalRevenueGenerated += amount;
        }
      } else if (activityType.startsWith('Bank deposit:')) {
        // Money deposited to farm bank (final step)
        const depositMatch = activityType.match(/Bank deposit: \$?([\d,\.]+)/);
        if (depositMatch) {
          const amount = parseFloat(depositMatch[1].replace(/,/g, ''));
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'REVENUE_DISTRIBUTED' as const,
            itemName: 'bank_deposit',
            quantity: 1,
            amount: amount,
            timestamp: new Date(),
            originalMessage: messageContent
          };

          session.totalRevenueReturned += amount;
          // Reduce open responsibilities
          session.openResponsibilities.moneyOwed -= amount;
          if (session.openResponsibilities.moneyOwed < 0) session.openResponsibilities.moneyOwed = 0;
        }
      } else if (activityType.startsWith('Revenue distributed:')) {
        // Revenue distributed to company (COOPERATIVA - DEPOSITOU)
        const revenueDistributedMatch = activityType.match(/Revenue distributed: \$?([\d,\.]+)/);
        if (revenueDistributedMatch) {
          const amount = parseFloat(revenueDistributedMatch[1].replace(/,/g, ''));
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'REVENUE_DISTRIBUTED' as const,
            itemName: 'company_deposit',
            quantity: 1,
            amount: amount,
            timestamp: new Date(),
            originalMessage: messageContent
          };

          session.totalRevenueReturned += amount;
          // Reduce open responsibilities
          session.openResponsibilities.moneyOwed -= amount;
          if (session.openResponsibilities.moneyOwed < 0) session.openResponsibilities.moneyOwed = 0;
        }
      } else if (activityType.startsWith('Plants deposited:')) {
        // Plants deposited to inventory - determine if return vs fresh deposit
        const plantsMatch = activityType.match(/Plants deposited: (\d+) (junco|trigo|milho|corn|wheat|bulrush|milk_weed)/i);
        if (plantsMatch) {
          const plantName = plantsMatch[2];
          const quantity = parseInt(plantsMatch[1]);

          // Check if there were recent plant withdrawals of the same type (last 30 minutes)
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          const recentWithdrawals = session.transactions.filter(t =>
            t.type === 'PLANTS_WITHDRAWN' &&
            t.itemName === plantName &&
            t.timestamp > thirtyMinutesAgo
          );

          // If there were recent withdrawals, this is likely a return
          const isReturn = recentWithdrawals.length > 0;

          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: isReturn ? 'PLANTS_RETURNED' as const : 'PLANTS_DEPOSITED' as const,
            itemName: plantName,
            quantity: quantity,
            timestamp: new Date(),
            originalMessage: messageContent
          };

          console.log(`🌿 Plant activity: ${quantity} ${plantName} - ${isReturn ? 'RETURN (reduces balance)' : 'FRESH DEPOSIT (payable)'}`);
        }
      } else if (activityType.startsWith('Seeds withdrawn:')) {
        // Seeds taken for farming
        const seedsMatch = activityType.match(/Seeds withdrawn: (\d+) (.*)/i);
        if (seedsMatch) {
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'SEEDS_WITHDRAWN' as const,
            itemName: seedsMatch[2],
            quantity: parseInt(seedsMatch[1]),
            timestamp: new Date(),
            originalMessage: messageContent
          };
        }
      } else {
        // Debug: Log unmatched activity types to understand what missions look like
        console.log(`❓ UNMATCHED ACTIVITY: "${activityType}" for ${workerName}`);
        console.log(`❓ Message content: "${messageContent}"`);
      }

      if (transaction) {
        // Add transaction to session
        session.transactions.push(transaction);
        session.lastActivity = new Date();

        // Special handling for mission completions - update totals BEFORE saving
        if (transaction.type === 'FERROVIA_MISSION_COMPLETED') {
          const missionCount = session.transactions.filter(t => t.type === 'FERROVIA_MISSION_COMPLETED').length;

          // Update totalBoxesProcessed (sum of all mission box quantities)
          session.totalBoxesProcessed = session.transactions
            .filter(t => t.type === 'FERROVIA_MISSION_COMPLETED')
            .reduce((total, t) => total + (t.quantity || 0), 0);

          console.log(`🚂 MISSION COMPLETED! Total missions: ${missionCount} for ${workerName}`);
          console.log(`📦 Pre-updated totalBoxesProcessed to: ${session.totalBoxesProcessed}`);
        }

        // Save the updated session and update embed with correct totals
        await this.supplyChainService.saveSession(session);

        console.log(`✅ Added ${transaction.type} transaction to session for ${workerName}`);

        // Update embed with all correct data (rate limiting prevents rapid successive updates)
        await this.createOrUpdateEmbed(workerId, workerName, channelId);
        console.log(`🔄 Updated Ferrovia embed for ${workerName} after ${transaction.type}`);
      } else {
        console.log(`⚠️ Could not parse activity type: ${activityType}`);
      }
      
    } catch (error) {
      console.error('❌ Error tracking Ferrovia supply chain activity:', error);
    }
  }

  // Get embed data for a worker
  public getWorkerEmbed(workerId: string): FerroviaSessionEmbed | undefined {
    return this.activeEmbeds.get(workerId);
  }

  // Remove embed when session is completed/archived
  public async removeEmbed(workerId: string): Promise<void> {
    const embedData = this.activeEmbeds.get(workerId);
    if (!embedData) return;

    try {
      if (embedData.embedMessageId) {
        const channel = await this.client.channels.fetch(embedData.channelId) as TextChannel;
        if (channel) {
          const message = await channel.messages.fetch(embedData.embedMessageId);
          await message.delete();
          console.log(`🗑️ Deleted Ferrovia embed for ${embedData.workerName}`);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting Ferrovia embed:', error);
    }

    this.activeEmbeds.delete(workerId);
    this.saveActiveEmbeds();
  }

  // Calculate what the worker still owes based on expected vs delivered production
  private calculateRemainingObligations(expectedProductions: any[], plantsWithdrawn: { [plantName: string]: number }): string | null {
    const obligations = [];
    
    for (const production of expectedProductions) {
      const remaining = production.expectedQuantity - production.deliveredQuantity;
      
      if (remaining > 0) {
        if (production.status === 'pending') {
          obligations.push(`• ${remaining} ${production.portugueseName} ⏳`);
        } else if (production.status === 'partial') {
          obligations.push(`• ${remaining} ${production.portugueseName} 🔄 (Parcial)`);
        }
      }
    }
    
    // If no specific box obligations, show plant return option
    if (obligations.length === 0 && Object.keys(plantsWithdrawn).length > 0) {
      const plantOptions = Object.entries(plantsWithdrawn).map(([plant, quantity]) => {
        const translatedName = this.itemTranslationService.getPortugueseName(plant);
        return `${quantity} ${translatedName}`;
      }).join(', ');
      
      return `Alternativa: Pode devolver as plantas (${plantOptions})`;
    }
    
    if (obligations.length > 0) {
      obligations.push('\n💡 **Alternativa:** Pode devolver as plantas equivalentes');
      return obligations.join('\n');
    }
    
    return null;
  }

  /**
   * Recalculate totals for existing sessions to fix any discrepancies
   * This method should be called to fix sessions that have incorrect totals
   */
  public async recalculateSessionTotals(workerId: string): Promise<void> {
    try {
      const activeSessions = this.supplyChainService.getAllActiveSessions();
      const session = activeSessions.find(s => s.workerId === workerId && s.status === 'active');

      if (!session) {
        console.log(`⚠️ No active session found for worker ${workerId}`);
        return;
      }

      console.log(`🔄 Recalculating totals for session: ${session.workerName}`);

      // Recalculate totalBoxesProcessed from mission transactions
      const missionTransactions = session.transactions.filter(t => t.type === 'FERROVIA_MISSION_COMPLETED');
      const oldBoxesProcessed = session.totalBoxesProcessed;
      session.totalBoxesProcessed = missionTransactions.reduce((total, t) => total + (t.quantity || 0), 0);

      // Recalculate totalRevenueReturned from money deposit transactions
      const moneyDepositTransactions = session.transactions.filter(t => t.type === 'MONEY_DEPOSITED_TO_INVENTORY');
      const oldRevenueReturned = session.totalRevenueReturned;
      session.totalRevenueReturned = moneyDepositTransactions.reduce((total, t) => total + (t.amount || 0), 0);

      console.log(`📊 Totals updated for ${session.workerName}:`);
      console.log(`📦 Boxes processed: ${oldBoxesProcessed} → ${session.totalBoxesProcessed}`);
      console.log(`💰 Revenue returned: $${oldRevenueReturned} → $${session.totalRevenueReturned}`);

      // Save the updated session
      await this.supplyChainService.saveSession(session);

      // Update the embed to reflect changes
      const embedData = this.activeEmbeds.get(workerId);
      if (embedData) {
        await this.createOrUpdateEmbed(workerId, session.workerName, embedData.channelId);
        console.log(`🔄 Updated embed for ${session.workerName}`);
      }

    } catch (error) {
      console.error('❌ Error recalculating session totals:', error);
    }
  }

}

export default FerroviaSessionService;