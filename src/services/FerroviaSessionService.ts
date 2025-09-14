import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import fs from 'fs';
import path from 'path';
import SupplyChainService, { SupplyChainSession } from './SupplyChainService';
import ItemTranslationService from './ItemTranslationService';
import RecipeService from './RecipeService';

interface FerroviaSessionEmbed {
  sessionId: string;
  workerId: string;
  workerName: string;
  channelId: string;
  embedMessageId?: string;
  lastUpdated: Date;
}

export class FerroviaSessionService {
  private client: Client;
  private supplyChainService: SupplyChainService;
  private itemTranslationService: ItemTranslationService;
  private recipeService: RecipeService;
  private activeEmbeds: Map<string, FerroviaSessionEmbed> = new Map();
  private dataDir: string;

  constructor(client: Client) {
    this.client = client;
    this.supplyChainService = new SupplyChainService();
    this.itemTranslationService = ItemTranslationService.getInstance();
    this.recipeService = new RecipeService();
    this.dataDir = path.join(process.cwd(), 'data', 'ferrovia-embeds');
    this.ensureDataDirectory();
    this.loadActiveEmbeds();
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
      const channel = await this.client.channels.fetch(embedData.channelId) as TextChannel;
      if (!channel) {
        console.error(`❌ Channel ${embedData.channelId} not found for worker ${embedData.workerName}`);
        return;
      }

      const embed = this.createFerroviaSessionEmbed(session);
      const buttons = this.createFerroviaButtons(session);
      const components = buttons.components.length > 0 ? [buttons] : [];

      if (embedData.embedMessageId) {
        // Update existing message
        try {
          const message = await channel.messages.fetch(embedData.embedMessageId);
          await message.edit({ embeds: [embed], components });
          console.log(`📝 Updated Ferrovia embed for ${embedData.workerName} in channel ${embedData.channelId}`);
        } catch (error) {
          console.log(`ℹ️ Previous embed message not found (likely deleted), creating new one for ${embedData.workerName}`);
          embedData.embedMessageId = undefined;
          await this.saveActiveEmbeds(); // Save the cleared message ID
        }
      }

      if (!embedData.embedMessageId) {
        // Create new message
        const message = await channel.send({ embeds: [embed], components });
        embedData.embedMessageId = message.id;
        embedData.lastUpdated = new Date();
        this.saveActiveEmbeds();
        console.log(`✨ Created new Ferrovia embed for ${embedData.workerName} in channel ${embedData.channelId}`);
      }

    } catch (error) {
      console.error(`❌ Error updating Ferrovia embed for ${embedData.workerName}:`, error);
    }
  }

  private createFerroviaSessionEmbed(session: SupplyChainSession): EmbedBuilder {
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

    // Add boxes section
    const boxesCreated = session.transactions.filter(t => t.type === 'BOXES_CREATED');
    const boxesWithdrawn = session.transactions.filter(t => t.type === 'BOXES_WITHDRAWN');
    
    if (boxesCreated.length > 0 || boxesWithdrawn.length > 0) {
      let boxSection = '';
      
      if (boxesCreated.length > 0) {
        const createdSummary = this.getBoxesCreatedSummary(boxesCreated);
        boxSection += `**📦 CAIXAS CRIADAS:**\n${createdSummary.join('\n')}\n\n`;
      }
      
      if (boxesWithdrawn.length > 0) {
        const withdrawnSummary = this.getBoxesWithdrawnSummary(boxesWithdrawn);
        boxSection += `**📤 CAIXAS RETIRADAS:**\n${withdrawnSummary.join('\n')}`;
      }

      if (boxSection) {
        embed.addFields({
          name: '📦 Atividade de Caixas',
          value: boxSection,
          inline: false
        });
      }
    }

    // Add missions section
    const missions = session.transactions.filter(t => t.type === 'FERROVIA_MISSION_COMPLETED');
    if (missions.length > 0) {
      const missionSummary = missions.map(t => {
        const timeStr = `<t:${Math.floor(t.timestamp.getTime() / 1000)}:t>`;
        return `• ${timeStr} - ${t.quantity} caixas usadas`;
      });

      embed.addFields({
        name: '🚂 Missões da Ferrovia Completadas',
        value: missionSummary.join('\n'),
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

    // Add traditional accountability section if there are old-style responsibilities
    if (session.openResponsibilities.boxesTaken > 0 || session.openResponsibilities.moneyOwed > 0) {
      const daysUntilDue = Math.ceil((session.openResponsibilities.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const dueDateStr = daysUntilDue > 0 ? `${daysUntilDue} dias restantes` : '⚠️ VENCIDO';
      
      embed.addFields({
        name: '⚠️ RESPONSABILIDADES ANTIGAS',
        value: `**📦 Caixas em Trânsito:** ${session.openResponsibilities.boxesTaken}\n**💰 Dinheiro a Devolver:** $${session.openResponsibilities.moneyOwed.toFixed(2)}\n**📅 Prazo:** ${dueDateStr}`,
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

  private getBoxesWithdrawnSummary(transactions: any[]): string[] {
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
      console.log(`🚂 Tracking Ferrovia supply chain activity: ${activityType} for ${workerName}`);
      
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
      } else if (activityType === 'Mission completed') {
        // Mission completed using boxes
        transaction = {
          transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'FERROVIA_MISSION_COMPLETED' as const,
          itemName: 'ferrovia_mission',
          quantity: 1,
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
      } else if (activityType.startsWith('Plants deposited:')) {
        // Plants returned to inventory (Ferrovia returns only)
        const plantsMatch = activityType.match(/Plants deposited: (\d+) (junco|trigo|milho|corn|wheat|bulrush|milk_weed)/i);
        if (plantsMatch) {
          transaction = {
            transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'PLANTS_DEPOSITED' as const,
            itemName: plantsMatch[2],
            quantity: parseInt(plantsMatch[1]),
            timestamp: new Date(),
            originalMessage: messageContent
          };
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
      }
      
      if (transaction) {
        // Add transaction to session
        session.transactions.push(transaction);
        session.lastActivity = new Date();
        
        // Save the updated session
        await this.supplyChainService.saveSession(session);
        
        console.log(`✅ Added ${transaction.type} transaction to session for ${workerName}`);
        
        // Update the Ferrovia embed
        await this.createOrUpdateEmbed(workerId, workerName, channelId);
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
}

export default FerroviaSessionService;