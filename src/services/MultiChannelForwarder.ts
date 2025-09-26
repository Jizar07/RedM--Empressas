import { Message } from 'discord.js';
import { FirmConfigService } from './FirmConfigService';
import WorkerChannelService from './WorkerChannelService';
import FerroviaSessionService from './FerroviaSessionService';
import PaymentAuditService from './PaymentAuditService';
import { GlobalWorkerTracker } from './GlobalWorkerTracker';
import { RecipeValidator } from './RecipeValidator';

interface WebhookData {
  raw_embeds: Array<{
    title: string | null;
    description: string | null;
    fields: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  }>;
  channel_id: string;
  author: {
    id: string;
    username: string;
    bot: boolean;
  };
  timestamp: string;
  message_id: string;
  content: string;
}

interface FirmMonitoringStats {
  messagesProcessed: number;
  errorsThisHour: number;
  lastMessageReceived: string | null;
  lastError: string | null;
  uptime: number;
  startTime: number;
}

export class MultiChannelForwarder {
  private static instance: MultiChannelForwarder;
  private firmConfigService: FirmConfigService;
  private monitoringStats: Map<string, FirmMonitoringStats>;
  private isInitialized: boolean = false;
  private workerChannelService: WorkerChannelService | null = null;
  private ferroviaSessionService: FerroviaSessionService | null = null;
  private paymentAuditService: PaymentAuditService;
  private globalWorkerTracker: GlobalWorkerTracker;
  private recipeValidator: RecipeValidator;

  private constructor() {
    this.firmConfigService = FirmConfigService.getInstance();
    this.paymentAuditService = PaymentAuditService.getInstance();
    this.globalWorkerTracker = GlobalWorkerTracker.getInstance();
    this.recipeValidator = RecipeValidator.getInstance();
    this.monitoringStats = new Map();
    this.initialize();
  }

  public static getInstance(): MultiChannelForwarder {
    if (!MultiChannelForwarder.instance) {
      MultiChannelForwarder.instance = new MultiChannelForwarder();
    }
    return MultiChannelForwarder.instance;
  }

  private initialize(): void {
    try {
      // Initialize monitoring stats for all enabled firms
      const firms = this.firmConfigService.getAllFirms();
      const currentTime = Date.now();
      
      Object.values(firms).forEach(firm => {
        if (firm.enabled && firm.monitoring.enabled) {
          this.monitoringStats.set(firm.id, {
            messagesProcessed: 0,
            errorsThisHour: 0,
            lastMessageReceived: null,
            lastError: null,
            uptime: 0,
            startTime: currentTime
          });
          
          console.log(`📡 Multi-Channel Forwarder: Initialized monitoring for ${firm.name} (${firm.id})`);
        }
      });

      this.isInitialized = true;
      console.log(`✅ Multi-Channel Forwarder initialized for ${this.monitoringStats.size} firms`);
    } catch (error) {
      console.error('❌ Failed to initialize Multi-Channel Forwarder:', error);
    }
  }

  public initializeWorkerChannelService(client: any): void {
    if (!this.workerChannelService) {
      this.workerChannelService = WorkerChannelService.getInstance(client);
      console.log('🔧 MultiChannelForwarder: WorkerChannelService initialized');
    }
    
    if (!this.ferroviaSessionService) {
      this.ferroviaSessionService = FerroviaSessionService.getInstance(client);
      console.log('🚂 MultiChannelForwarder: FerroviaSessionService initialized');
    }
  }

  public async processMessage(message: Message, channelId: string): Promise<void> {
    try {
      // Find the firm associated with this channel
      const firm = this.firmConfigService.getFirmByChannelId(channelId);
      
      if (!firm) {
        console.log(`⏭️ Multi-Channel Forwarder: No firm configured for channel ${channelId}`);
        return;
      }

      if (!firm.enabled || !firm.monitoring.enabled) {
        console.log(`⏭️ Multi-Channel Forwarder: Monitoring disabled for firm ${firm.name} (${firm.id})`);
        return;
      }

      console.log(`🔍 Multi-Channel Forwarder: Processing message for firm ${firm.name} from channel ${channelId}`);

      // Update monitoring stats
      this.updateStats(firm.id, 'message_received');

      // Extract author from message
      let realAuthor = message.author.username;
      
      // Check if this is a bot message with embeds that might contain author info
      if (message.author.bot && message.embeds.length > 0) {
        for (const embed of message.embeds) {
          if (embed.fields) {
            for (const field of embed.fields) {
              const cleanFieldName = field.name.replace(/[:`]/g, '').trim().toLowerCase();
              const cleanValue = field.value.replace(/```[a-z]*\n?|\n?```/g, '').trim();
              
              // Look for "Autor" field first
              if (cleanFieldName === 'autor' || cleanFieldName.includes('autor')) {
                const rawAuthor = cleanValue
                  .replace(/^:+\s*/, '')
                  .split('|')[0]
                  .trim();

                // Enhanced debug logging with character inspection
                console.log(`🔍 Multi-Channel Forwarder: Found author from Autor field: "${rawAuthor}"`);
                console.log(`🔍 Debug - Raw field value: "${cleanValue}"`);
                console.log(`🔍 Debug - Author length: ${rawAuthor.length} chars`);
                console.log(`🔍 Debug - Author char codes: [${rawAuthor.split('').map(c => c.charCodeAt(0)).join(', ')}]`);

                // Comprehensive string sanitization
                realAuthor = this.sanitizeAuthorName(rawAuthor);
                console.log(`🔍 Multi-Channel Forwarder: Sanitized author: "${realAuthor}"`);
                console.log(`🔍 Debug - Sanitized length: ${realAuthor.length} chars`);
                break;
              }

              // Look for "Funcionario" field (for Berçário messages)
              if (cleanFieldName === 'funcionario' || cleanFieldName.includes('funcionario')) {
                const rawAuthor = cleanValue
                  .replace(/^:+\s*/, '')
                  .split('|')[0]
                  .trim();

                // Enhanced debug logging with character inspection
                console.log(`🔍 Multi-Channel Forwarder: Found author from Funcionario field: "${rawAuthor}"`);
                console.log(`🔍 Debug - Raw field value: "${cleanValue}"`);
                console.log(`🔍 Debug - Author length: ${rawAuthor.length} chars`);
                console.log(`🔍 Debug - Author char codes: [${rawAuthor.split('').map(c => c.charCodeAt(0)).join(', ')}]`);

                // Comprehensive string sanitization
                realAuthor = this.sanitizeAuthorName(rawAuthor);
                console.log(`🔍 Multi-Channel Forwarder: Sanitized author: "${realAuthor}"`);
                console.log(`🔍 Debug - Sanitized length: ${realAuthor.length} chars`);
                break;
              }
              
              // For animal services: Look for "Ação" field if no Autor field found
              if ((cleanFieldName === 'ação' || cleanFieldName === 'acao') && realAuthor === message.author.username) {
                // Check if this is an animal service message
                const isAnimalService = message.embeds.some(embed => 
                  (embed.author?.name || embed.title || embed.description || '')
                    .includes('CAIXA ORGANIZAÇÃO') && 
                  (embed.author?.name || embed.title || embed.description || '')
                    .includes('DEPÓSITO')
                );
                
                if (isAnimalService) {
                  const animalServiceMatch = cleanValue.match(/^(.+?)\s+vendeu\s+\d+\s+animais\s+no\s+matadouro/);
                  if (animalServiceMatch) {
                    realAuthor = animalServiceMatch[1].trim();
                    console.log(`🔍 Multi-Channel Forwarder: Found animal service author from Ação field: "${realAuthor}"`);
                    break;
                  }
                }
              }
            }
          }
        }
      }

      // Extract content from embeds if message content is empty
      let extractedContent: string = message.content;
      if (!extractedContent && message.embeds.length > 0) {
        const embedContents: string[] = [];
        for (const embed of message.embeds) {
          const parts: string[] = [];
          if (embed.author?.name) parts.push(`REGISTRO - ${embed.author.name}`);
          if (embed.title) parts.push(embed.title);
          if (embed.description) parts.push(embed.description);
          if (embed.fields && embed.fields.length > 0) {
            for (const field of embed.fields) {
              const cleanValue = field.value.replace(/```prolog\n|```/g, '').trim();
              parts.push(`${field.name.replace(/`/g, '')}: ${cleanValue}`);
            }
          }
          if (parts.length > 0) {
            embedContents.push(parts.join('\n'));
          }
        }
        extractedContent = embedContents.join('\n\n');
      }

      // Check content text for author patterns (for Berçário messages)
      const autorContentMatch = extractedContent.match(/Autor::\s*([^|]+)\s*\|/);
      const funcionarioContentMatch = extractedContent.match(/Funcionario::\s*([^|]+)\s*\|/);

      if (autorContentMatch) {
        const rawAuthor = autorContentMatch[1].trim();
        realAuthor = this.sanitizeAuthorName(rawAuthor);
        console.log(`🔍 Multi-Channel Forwarder: Found author from content Autor:: "${realAuthor}"`);
      } else if (funcionarioContentMatch) {
        const rawAuthor = funcionarioContentMatch[1].trim();
        realAuthor = this.sanitizeAuthorName(rawAuthor);
        console.log(`🔍 Multi-Channel Forwarder: Found author from content Funcionario:: "${realAuthor}"`);
      }

      // Prepare webhook data
      const webhookData: WebhookData = {
        raw_embeds: message.embeds.map(embed => ({
          title: embed.title,
          description: embed.description,
          fields: embed.fields ? embed.fields.map(field => ({
            name: field.name,
            value: field.value,
            inline: field.inline
          })) : []
        })),
        channel_id: channelId,
        author: {
          id: message.author.id,
          username: realAuthor, // Use the extracted real author
          bot: message.author.bot
        },
        timestamp: message.createdAt.toISOString(),
        message_id: message.id,
        content: extractedContent
      };

      // ENHANCED: Comprehensive item activity tracking for ALL firms
      await this.trackComprehensiveItemActivity(message, realAuthor, extractedContent, firm);

      // NEW: Direct worker activity processing (no roundtrip to frontend)
      if (this.workerChannelService && firm.name === 'Fazenda') {
        try {
          console.log(`🔄 MultiChannelForwarder: Processing worker activity directly for ${realAuthor}`);
          console.log(`🔍 MultiChannelForwarder: Message content: "${extractedContent}"`);
          console.log(`🆔 MultiChannelForwarder: Debug - Message author ID: ${message.author.id}, Username: ${message.author.username}`);
          
          // Debug: Log the actual worker being processed
          const workerMapping = this.workerChannelService?.findWorkerByName(realAuthor);
          if (workerMapping) {
            console.log(`🔍 MultiChannelForwarder: Found worker mapping for ${realAuthor}: Channel ${workerMapping.channelId}`);
          } else {
            console.log(`⚠️ MultiChannelForwarder: No worker mapping found for ${realAuthor}`);
          }
          
          // Check if this is an animal delivery deposit
          const isAnimalDelivery = extractedContent.includes('CAIXA ORGANIZAÇÃO - DEPÓSITO') &&
                                   extractedContent.includes('vendeu') &&
                                   extractedContent.includes('animais no matadouro');

          let mockParsedMessage: any;

          if (isAnimalDelivery) {
            // Extract details from animal delivery message
            const acaoMatch = extractedContent.match(/Ação::\s*(.+?)\s+vendeu\s+(\d+)\s+animais\s+no\s+matadouro/);
            const valorMatch = extractedContent.match(/Valor depositado::\s*\$?([\d.]+)/);

            if (acaoMatch && valorMatch) {
              const workerName = acaoMatch[1].trim();
              const quantity = parseInt(acaoMatch[2]);
              const amount = parseFloat(valorMatch[1]);

              console.log(`🐄 MultiChannelForwarder: Detected animal delivery - ${workerName} sold ${quantity} animals for $${amount}`);

              // Create mock parsed message for animal delivery
              mockParsedMessage = {
                parseSuccess: true,
                autor: workerName,
                tipo: 'venda',
                categoria: 'financeiro',
                descricao: `${workerName} vendeu ${quantity} animais no matadouro`,
                valor: amount,
                content: extractedContent,
                timestamp: message.createdAt.toISOString()
              };
            } else {
              // Fallback if pattern doesn't match
              mockParsedMessage = {
                parseSuccess: true,
                autor: realAuthor,
                content: extractedContent,
                timestamp: message.createdAt.toISOString(),
                categoria: 'inventario'
              };
            }
          } else {
            // Default mock message for non-animal deliveries
            mockParsedMessage = {
              parseSuccess: true,
              autor: realAuthor,
              content: extractedContent,
              timestamp: message.createdAt.toISOString(),
              categoria: 'inventario' // For seed withdrawals
            };
          }
          
          console.log(`🔍 MultiChannelForwarder: Mock parsed message:`, JSON.stringify(mockParsedMessage, null, 2));
          
          // Try to extract worker transaction from the message
          const workerTransaction = this.workerChannelService.parseWorkerTransactionFromMessage(mockParsedMessage);
          
          if (workerTransaction) {
            console.log(`✅ MultiChannelForwarder: Found worker transaction - ${workerTransaction.type} for ${workerTransaction.workerName}`);
            
            // Process the transaction directly
            const success = await this.workerChannelService.processWorkerTransaction(workerTransaction);
            
            if (success) {
              console.log(`🎉 MultiChannelForwarder: Successfully processed worker activity directly!`);
            } else {
              console.log(`⚠️ MultiChannelForwarder: Worker transaction processing failed`);
            }
          } else {
            console.log(`💭 MultiChannelForwarder: No worker transaction detected in this message`);
          }
        } catch (workerError) {
          console.error('❌ MultiChannelForwarder: Worker activity processing error:', workerError);
        }
      }

      // NEW: Manager withdrawal detection for payment audit
      await this.detectManagerWithdrawal(message, realAuthor, extractedContent);

      // NEW: Separate Ferrovia supply chain tracking (alongside farm logic)
      if (this.workerChannelService && this.ferroviaSessionService) {
        try {
          console.log(`🚂 MultiChannelForwarder: Checking for Ferrovia supply chain activities by ${realAuthor}`);
          console.log(`🔍 MultiChannelForwarder: Message content: "${extractedContent}"`);
          
          // Detect Ferrovia supply chain activities
          let ferroviaActivityDetected = false;
          let activityType = '';
          
          // 1. Plants taken from inventory (for making boxes) - ALL plants from global translations
          // Supports both : and :: formats, and handles newlines
          const plantsWithdrawnPattern = /Item removido::?\s*\n?\s*(junco|trigo|milho|corn|wheat|bulrush|milk_weed)\s*x(\d+)/is;
          const plantsMatch = extractedContent.match(plantsWithdrawnPattern);
          
          // 2. Boxes deposited to inventory (made from plants) - ALL box types except caixarustica
          // Supports both : and :: formats, and handles newlines
          const boxesDepositedPattern = /Item adicionado:?\s*:?\s*\n\s*(caixadeverduras|caixadelegumes|caixa_agro|caixa_verduras|caixadefrutas|caixaanimal)\s*x(\d+)/is;
          const boxesDepositedMatch = extractedContent.match(boxesDepositedPattern);

          // 3. Boxes taken from inventory (for missions) - ALL box types except caixarustica
          // Supports both : and :: formats, and handles newlines
          const boxesWithdrawnPattern = /Item removido:?\s*:?\s*\n\s*(caixadeverduras|caixadelegumes|caixa_agro|caixa_verduras|caixadefrutas|caixaanimal)\s*x(\d+)/is;
          const boxesWithdrawnMatch = extractedContent.match(boxesWithdrawnPattern);

          // Context detection: Simple heuristic - box returns usually don't have plant mentions
          // Box creation typically involves plant processing, returns are just leftover boxes
          const hasPlantContext = extractedContent.match(/(junco|trigo|milho|corn|wheat|bulrush|milk_weed)/i);
          const isLikelyBoxReturn = boxesDepositedMatch && !hasPlantContext;

          // 4. Mission completion (using boxes)
          const missionCompletedPattern = /(?:completou\s+missão\s+ferrovia|ENTREGA COMPLETA)/i;
          const missionMatch = extractedContent.match(missionCompletedPattern);
          
          // 5. Money taken from Ferrovia (from completed missions)
          const ferroviaMoneyPattern = /coletou\s+\$?([\d,\.]+)\s+da\s+ferrovia/i;
          const ferroviaMoneyMatch = extractedContent.match(ferroviaMoneyPattern);
          
          // 6. Money deposited to farm bank (final step)
          const bankDepositPattern = /Valor depositado::\s*\$?([\d,\.]+)/i;
          const bankDepositMatch = extractedContent.match(bankDepositPattern);
          
          // 7. Plants deposited back to inventory (potential Ferrovia returns)
          // Supports both : and :: formats, and handles newlines
          const plantsDepositedPattern = /Item adicionado::?\s*\n?\s*(junco|trigo|milho|corn|wheat|bulrush|milk_weed)\s*x(\d+)/is;
          const plantsDepositedMatch = extractedContent.match(plantsDepositedPattern);
          
          // 8. Seeds withdrawn (for farm service detection)
          // Supports both : and :: formats, and handles newlines
          const seedsWithdrawnPattern = /Item removido::?\s*\n?\s*(.*seed.*|.*semente.*)\s*x(\d+)/is;
          const seedsWithdrawnMatch = extractedContent.match(seedsWithdrawnPattern);

          // 9. Company withdrawal (COOPERATIVA - SACOU) - Revenue collected activity
          const cooperativaSacouPattern = /COOPERATIVA - SACOU[\s\S]*?Quantia::\s*(\d+)/i;
          const cooperativaSacouMatch = extractedContent.match(cooperativaSacouPattern);

          // 10. Company deposit (COOPERATIVA - DEPOSITOU) - Revenue distributed activity
          const cooperativaDepositouPattern = /COOPERATIVA - DEPOSITOU[\s\S]*?Quantia::\s*(\d+)/i;
          const cooperativaDepositouMatch = extractedContent.match(cooperativaDepositouPattern);

          if (plantsMatch) {
            ferroviaActivityDetected = true;
            activityType = `Plants withdrawn: ${plantsMatch[2]} ${plantsMatch[1]}`;
          } else if (boxesDepositedMatch && isLikelyBoxReturn) {
            ferroviaActivityDetected = true;
            activityType = `Boxes returned: ${boxesDepositedMatch[2]} ${boxesDepositedMatch[1]}`;
            console.log(`🔄 Context detected: Box addition is likely a return after recent withdrawals by ${realAuthor}`);
          } else if (boxesDepositedMatch) {
            ferroviaActivityDetected = true;
            activityType = `Boxes deposited: ${boxesDepositedMatch[2]} ${boxesDepositedMatch[1]}`;
          } else if (boxesWithdrawnMatch) {
            ferroviaActivityDetected = true;
            activityType = `Boxes withdrawn: ${boxesWithdrawnMatch[2]} ${boxesWithdrawnMatch[1]}`;
          } else if (missionMatch) {
            ferroviaActivityDetected = true;
            activityType = 'Mission completed';
          } else if (ferroviaMoneyMatch) {
            ferroviaActivityDetected = true;
            activityType = `Money collected: $${ferroviaMoneyMatch[1]}`;
          } else if (bankDepositMatch) {
            ferroviaActivityDetected = true;
            activityType = `Bank deposit: $${bankDepositMatch[1]}`;
          } else if (cooperativaSacouMatch) {
            ferroviaActivityDetected = true;
            activityType = `Revenue collected: $${cooperativaSacouMatch[1]}`;
          } else if (cooperativaDepositouMatch) {
            ferroviaActivityDetected = true;
            activityType = `Revenue distributed: $${cooperativaDepositouMatch[1]}`;
          }
          
          if (ferroviaActivityDetected) {
            console.log(`✅ MultiChannelForwarder: Found Ferrovia supply chain activity by ${realAuthor}: ${activityType}`);
            
            // Find worker by name to get their channel
            const workerMapping = this.workerChannelService.findWorkerByName(realAuthor);
            
            if (workerMapping) {
              console.log(`🔗 MultiChannelForwarder: Found worker mapping for ${realAuthor} → ${workerMapping.channelId}`);
              
              // Create separate Ferrovia embed in worker's channel
              await this.ferroviaSessionService.trackSupplyChainActivity(
                workerMapping.workerId,
                workerMapping.workerName,
                workerMapping.channelId,
                activityType,
                extractedContent
              );
              
              console.log(`🎉 MultiChannelForwarder: Successfully created Ferrovia supply chain embed for ${realAuthor}`);
            } else {
              console.log(`⚠️ MultiChannelForwarder: No worker mapping found for ${realAuthor}`);
            }
          }
          
          // Handle plant deposits (potential Ferrovia returns) - separate from main Ferrovia logic
          if (plantsDepositedMatch && this.ferroviaSessionService) {
            const plantName = plantsDepositedMatch[1];
            const quantity = parseInt(plantsDepositedMatch[2]);
            
            console.log(`🌱 MultiChannelForwarder: Found plant deposit by ${realAuthor}: ${quantity} ${plantName}`);
            
            const workerMapping = this.workerChannelService.findWorkerByName(realAuthor);
            if (workerMapping) {
              await this.ferroviaSessionService.handlePlantDeposit(
                workerMapping.workerId,
                workerMapping.workerName,
                workerMapping.channelId,
                plantName,
                quantity,
                extractedContent
              );
            }
          }
          
          // Handle seed withdrawals (for farm service context tracking)
          if (seedsWithdrawnMatch && this.ferroviaSessionService) {
            const seedName = seedsWithdrawnMatch[1];
            const quantity = parseInt(seedsWithdrawnMatch[2]);
            
            console.log(`🌱 MultiChannelForwarder: Found seed withdrawal by ${realAuthor}: ${quantity} ${seedName}`);
            
            const workerMapping = this.workerChannelService.findWorkerByName(realAuthor);
            if (workerMapping) {
              await this.ferroviaSessionService.trackSupplyChainActivity(
                workerMapping.workerId,
                workerMapping.workerName,
                workerMapping.channelId,
                `Seeds withdrawn: ${quantity} ${seedName}`,
                extractedContent
              );
            }
          }
          
          if (!ferroviaActivityDetected && !plantsDepositedMatch && !seedsWithdrawnMatch) {
            console.log(`💭 MultiChannelForwarder: No Ferrovia supply chain activity detected in this message`);
          }
        } catch (ferroviaError) {
          console.error('❌ MultiChannelForwarder: Ferrovia supply chain processing error:', ferroviaError);
        }
      }

      // Send to firm's configured endpoint (keep existing functionality)
      await this.sendToFirmEndpoint(firm.id, firm.monitoring.endpoint, webhookData);
      
      console.log(`✅ Multi-Channel Forwarder: Successfully processed message for firm ${firm.name}`);

    } catch (error) {
      console.error('❌ Multi-Channel Forwarder: Error processing message:', error);
      
      // Try to find firm for error logging
      const firm = this.firmConfigService.getFirmByChannelId(channelId);
      if (firm) {
        this.updateStats(firm.id, 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  private async sendToFirmEndpoint(firmId: string, endpoint: string, data: WebhookData): Promise<void> {
    try {
      // Transform data to match the expected webhook format
      const webhookPayload = {
        channelId: data.channel_id,
        messages: [{
          id: data.message_id,
          author: data.author.username,
          content: data.content,
          timestamp: data.timestamp,
          source: 'discord',
          channelId: data.channel_id
        }]
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        console.log(`✅ Multi-Channel Forwarder: Sent data to ${endpoint} for firm ${firmId}`);
        this.updateStats(firmId, 'message_sent');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Multi-Channel Forwarder: Failed to send to endpoint ${endpoint}:`, error);
      this.updateStats(firmId, 'error', error instanceof Error ? error.message : 'Network error');
      throw error;
    }
  }

  private updateStats(firmId: string, eventType: 'message_received' | 'message_sent' | 'error', errorMessage?: string): void {
    try {
      let stats = this.monitoringStats.get(firmId);
      
      if (!stats) {
        // Initialize stats if not exists
        stats = {
          messagesProcessed: 0,
          errorsThisHour: 0,
          lastMessageReceived: null,
          lastError: null,
          uptime: 0,
          startTime: Date.now()
        };
        this.monitoringStats.set(firmId, stats);
      }

      const now = new Date().toISOString();
      
      switch (eventType) {
        case 'message_received':
          stats.lastMessageReceived = now;
          break;
          
        case 'message_sent':
          stats.messagesProcessed++;
          break;
          
        case 'error':
          stats.errorsThisHour++;
          stats.lastError = errorMessage || 'Unknown error';
          break;
      }
      
      // Update uptime
      stats.uptime = Date.now() - stats.startTime;
      
      this.monitoringStats.set(firmId, stats);
    } catch (error) {
      console.error('❌ Multi-Channel Forwarder: Error updating stats:', error);
    }
  }

  public getMonitoringStats(firmId?: string): Map<string, FirmMonitoringStats> | FirmMonitoringStats | null {
    if (firmId) {
      return this.monitoringStats.get(firmId) || null;
    }
    return this.monitoringStats;
  }

  public resetStats(firmId?: string): void {
    if (firmId) {
      const stats = this.monitoringStats.get(firmId);
      if (stats) {
        stats.messagesProcessed = 0;
        stats.errorsThisHour = 0;
        stats.lastError = null;
        stats.startTime = Date.now();
        stats.uptime = 0;
        this.monitoringStats.set(firmId, stats);
      }
    } else {
      this.monitoringStats.clear();
      this.initialize();
    }
    
    console.log(`🔄 Multi-Channel Forwarder: Reset stats for ${firmId || 'all firms'}`);
  }

  public getMonitoredChannels(): Array<{ firmId: string; channelId: string; endpoint: string }> {
    return this.firmConfigService.getMonitoredChannels();
  }

  public reloadConfiguration(): void {
    try {
      this.firmConfigService.reloadConfig();
      this.monitoringStats.clear();
      this.initialize();
      console.log('🔄 Multi-Channel Forwarder: Configuration reloaded');
    } catch (error) {
      console.error('❌ Multi-Channel Forwarder: Error reloading configuration:', error);
    }
  }

  public isChannelMonitored(channelId: string): boolean {
    const firm = this.firmConfigService.getFirmByChannelId(channelId);
    return firm !== null && firm.enabled && firm.monitoring.enabled;
  }

  public getFirmByChannelId(channelId: string): any {
    return this.firmConfigService.getFirmByChannelId(channelId);
  }

  public getStatus(): {
    initialized: boolean;
    monitoredFirms: number;
    totalStats: {
      totalMessages: number;
      totalErrors: number;
      averageUptime: number;
    };
  } {
    const totalMessages = Array.from(this.monitoringStats.values()).reduce((sum, stats) => sum + stats.messagesProcessed, 0);
    const totalErrors = Array.from(this.monitoringStats.values()).reduce((sum, stats) => sum + stats.errorsThisHour, 0);
    const averageUptime = this.monitoringStats.size > 0 
      ? Array.from(this.monitoringStats.values()).reduce((sum, stats) => sum + stats.uptime, 0) / this.monitoringStats.size
      : 0;

    return {
      initialized: this.isInitialized,
      monitoredFirms: this.monitoringStats.size,
      totalStats: {
        totalMessages,
        totalErrors,
        averageUptime
      }
    };
  }

  // Detect manager withdrawal messages for payment audit
  private async detectManagerWithdrawal(message: Message, authorName: string, content: string): Promise<void> {
    try {
      console.log(`💰 MultiChannelForwarder: Checking for manager withdrawal by ${authorName}`);

      // FIXED: Only process withdrawals from the Ferrovia channel (1414735729082499072)
      // This prevents false positives from other channels like Fazenda
      const FERROVIA_CHANNEL_ID = '1414735729082499072';

      if (message.channelId !== FERROVIA_CHANNEL_ID) {
        console.log(`💭 MultiChannelForwarder: Withdrawal detection skipped - not in Ferrovia channel (current: ${message.channelId})`);
        return;
      }

      // Pattern to match withdrawal messages like "João sacou $350.00" or "JOÃO STOFFELIZ sacou $1,200.50"
      const withdrawalPatterns = [
        // Standard withdrawal format: "Name sacou $amount"
        /^(.+?)\s+sacou\s+\$?([\d,]+\.?\d*)/i,
        // Alternative format in embeds: "Valor sacado:: $amount"
        /Valor\s+sacado::\s*\$?([\d,]+\.?\d*)/i,
        // Bank message format: "withdrew $amount"
        /(\w+\s*\w*)\s+withdrew\s+\$?([\d,]+\.?\d*)/i
      ];

      let withdrawalMatch = null;
      let detectedAmount = 0;
      let detectedName = authorName;

      // Try each pattern
      for (const pattern of withdrawalPatterns) {
        withdrawalMatch = content.match(pattern);
        if (withdrawalMatch) {
          if (pattern.source.includes('Valor sacado')) {
            // For "Valor sacado" pattern, use the authorName
            detectedAmount = parseFloat((withdrawalMatch[1] || '0').replace(',', ''));
          } else {
            // For name-based patterns
            detectedName = withdrawalMatch[1].trim();
            detectedAmount = parseFloat((withdrawalMatch[2] || '0').replace(',', ''));
          }
          break;
        }
      }

      // Also check embeds for withdrawal information
      if (!withdrawalMatch && message.embeds.length > 0) {
        for (const embed of message.embeds) {
          // Check embed description
          if (embed.description) {
            for (const pattern of withdrawalPatterns) {
              withdrawalMatch = embed.description.match(pattern);
              if (withdrawalMatch) {
                detectedAmount = parseFloat((withdrawalMatch[2] || withdrawalMatch[1] || '0').replace(',', ''));
                break;
              }
            }
          }

          // Check embed fields
          if (!withdrawalMatch && embed.fields) {
            for (const field of embed.fields) {
              const fieldContent = `${field.name}: ${field.value}`;
              for (const pattern of withdrawalPatterns) {
                withdrawalMatch = fieldContent.match(pattern);
                if (withdrawalMatch) {
                  detectedAmount = parseFloat((withdrawalMatch[2] || withdrawalMatch[1] || '0').replace(',', ''));
                  break;
                }
              }
              if (withdrawalMatch) break;
            }
          }

          if (withdrawalMatch) break;
        }
      }

      if (withdrawalMatch && detectedAmount > 0) {
        console.log(`🚂 MultiChannelForwarder: Detected FERROVIA withdrawal - ${detectedName} withdrew $${detectedAmount}`);

        // Record the withdrawal in the payment audit system (now only for Ferrovia)
        await this.paymentAuditService.recordManagerWithdrawal(
          message.author.id,
          detectedName,
          detectedAmount,
          message.channelId,
          message.id,
          content
        );

        console.log(`✅ MultiChannelForwarder: Recorded Ferrovia withdrawal for payment audit tracking`);
      } else {
        console.log(`💭 MultiChannelForwarder: No Ferrovia withdrawal detected in this message`);
      }

    } catch (error) {
      console.error('❌ MultiChannelForwarder: Error detecting manager withdrawal:', error);
    }
  }

  // Comprehensive author name sanitization
  private sanitizeAuthorName(name: string): string {
    if (!name) return name;

    return name
      // Remove invisible characters (zero-width spaces, non-breaking spaces, etc.)
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
      .replace(/[\u00A0]/g, ' ')             // Non-breaking space to regular space
      .replace(/[\u2000-\u200A]/g, ' ')      // En quad, em quad, en space, etc.

      // Normalize Unicode characters (composite to decomposed, then remove diacritics)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')       // Remove diacritical marks

      // Clean up whitespace
      .replace(/\s+/g, ' ')                  // Multiple spaces to single space
      .trim()                                // Remove leading/trailing spaces

      // Remove any remaining control characters
      .replace(/[\x00-\x1F\x7F]/g, '');
  }

  /**
   * Comprehensive item activity tracking across ALL firms
   * Tracks materials, crafted items, equipment, plants, seeds, animals, tools, food, boxes
   */
  private async trackComprehensiveItemActivity(message: Message, authorName: string, content: string, firm: any): Promise<void> {
    try {
      console.log(`🎯 MultiChannelForwarder: Comprehensive tracking for ${firm.name} - ${authorName}`);

      // Enhanced pattern matching for ALL item types
      const itemPatterns = {
        // Items added to inventory
        itemAdded: /Item adicionado::?\s*\n?\s*([^\n]+?)\s*x(\d+)/gis,
        // Items removed from inventory
        itemRemoved: /Item removido::?\s*\n?\s*([^\n]+?)\s*x(\d+)/gis,
        // Alternative formats
        itemAddedAlt: /adicionou\s+([^\s]+)\s*x(\d+)/gis,
        itemRemovedAlt: /removeu\s+([^\s]+)\s*x(\d+)/gis,
        // Equipment/tools patterns
        equipmentAdded: /(martelo|enxada|serra|hammer|hoe|saw|wateringcan|regador)\s+adicionad[oa]\s*x?(\d+)/gis,
        equipmentRemoved: /(martelo|enxada|serra|hammer|hoe|saw|wateringcan|regador)\s+removid[oa]\s*x?(\d+)/gis,
        // Material patterns (wood, metal, leather, stone, coal)
        materialAdded: /(madeira|wood|ferro|metal|couro|leather|pedra|stone|cascalho|carvao|coal)\s+adicionad[oa]\s*x?(\d+)/gis,
        materialRemoved: /(madeira|wood|ferro|metal|couro|leather|pedra|stone|cascalho|carvao|coal)\s+removid[oa]\s*x?(\d+)/gis,
        // Crafted items patterns
        craftedAdded: /(bandage|medicine|potion|weapon|gear|arma|medicina|pocao)\s+adicionad[oa]\s*x?(\d+)/gis,
        craftedRemoved: /(bandage|medicine|potion|weapon|gear|arma|medicina|pocao)\s+removid[oa]\s*x?(\d+)/gis
      };

      // Process all pattern matches
      for (const [patternType, regex] of Object.entries(itemPatterns)) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const itemName = match[1].trim();
          const quantity = parseInt(match[2]) || 1;

          // Determine activity type
          const activityType = patternType.includes('Added') || patternType.includes('adicionad')
            ? 'item_added' as const
            : 'item_removed' as const;

          console.log(`🔍 MultiChannelForwarder: Found ${activityType} - ${authorName} ${activityType === 'item_added' ? 'added' : 'removed'} ${quantity}x ${itemName} in ${firm.name}`);

          // Track with GlobalWorkerTracker
          try {
            this.globalWorkerTracker.trackItemActivity({
              workerId: message.author.id,
              workerName: authorName,
              firmId: firm.id,
              firmName: firm.name,
              activityType,
              itemName,
              quantity,
              timestamp: message.createdAt,
              originalMessage: content
            });

            console.log(`✅ MultiChannelForwarder: Successfully tracked ${activityType} with GlobalWorkerTracker`);

            // ENHANCED: Smart recipe validation for item removals
            if (activityType === 'item_removed') {
              try {
                console.log(`🧠 MultiChannelForwarder: Running smart recipe analysis for ${authorName}`);

                // Get recent withdrawals for this worker
                const recentWithdrawals = this.globalWorkerTracker.getWorkerActivities(message.author.id)
                  .filter(a =>
                    a.activityType === 'item_removed' &&
                    Date.now() - a.timestamp.getTime() < 45 * 60 * 1000 // Last 45 minutes
                  )
                  .slice(0, 20); // Limit to recent 20 withdrawals

                if (recentWithdrawals.length > 0) {
                  // Validate crafting intent
                  const craftingPrediction = await this.recipeValidator.validateCraftingIntent(
                    message.author.id,
                    recentWithdrawals
                  );

                  console.log(`🎯 MultiChannelForwarder: Crafting prediction for ${authorName}:`, {
                    confidence: craftingPrediction.predictionConfidence.toFixed(2),
                    action: craftingPrediction.suggestedAction,
                    possibleRecipes: craftingPrediction.possibleRecipes.length,
                    topRecipe: craftingPrediction.possibleRecipes[0]?.recipe.name || 'None'
                  });

                  // Detect anomalies
                  const anomalies = this.recipeValidator.detectAnomalies(message.author.id);
                  if (anomalies.length > 0) {
                    console.log(`⚠️ MultiChannelForwarder: Detected ${anomalies.length} anomalies for ${authorName}:`,
                      anomalies.map(a => `${a.anomalyType} (${a.severity})`)
                    );
                  }

                  // Analyze worker behavior
                  const behaviorAnalysis = this.recipeValidator.analyzeWorkerBehavior(message.author.id);
                  console.log(`📊 MultiChannelForwarder: Behavior analysis for ${authorName}:`, {
                    craftingSkill: behaviorAnalysis.craftingSkill.toFixed(2),
                    efficiency: behaviorAnalysis.efficiency.toFixed(2),
                    specializations: behaviorAnalysis.specializations.join(', '),
                    riskFactors: behaviorAnalysis.riskFactors.length
                  });
                }
              } catch (validationError) {
                console.error(`❌ MultiChannelForwarder: Recipe validation error:`, validationError);
              }
            }
          } catch (trackingError) {
            console.error(`❌ MultiChannelForwarder: GlobalWorkerTracker error:`, trackingError);
          }
        }
      }

      // Special handling for animal activities (sales, breeding, feeding)
      const animalPatterns = {
        animalSold: /(.+?)\s+vendeu\s+(\d+)\s+animais\s+no\s+matadouro/gis,
        animalBred: /criou\s+(\d+)\s+(vaca|pig|chicken|galinha|porco)/gis,
        animalFed: /alimentou\s+(\d+)\s+(vaca|pig|chicken|galinha|porco)/gis
      };

      for (const [patternType, regex] of Object.entries(animalPatterns)) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          let workerName = authorName;
          let quantity = 0;
          let animalType = 'animal';

          if (patternType === 'animalSold') {
            workerName = match[1].trim();
            quantity = parseInt(match[2]);
          } else {
            quantity = parseInt(match[1]);
            animalType = match[2];
          }

          console.log(`🐄 MultiChannelForwarder: Found animal activity - ${workerName} ${patternType} ${quantity}x ${animalType} in ${firm.name}`);

          // Track animal activity as item_removed (sold/processed)
          this.globalWorkerTracker.trackItemActivity({
            workerId: message.author.id,
            workerName,
            firmId: firm.id,
            firmName: firm.name,
            activityType: 'item_removed',
            itemName: animalType,
            quantity,
            timestamp: message.createdAt,
            originalMessage: content
          });
        }
      }

      // Track money transactions (deposits, withdrawals, payments)
      const moneyPatterns = {
        deposit: /depositou\s+\$?([\d,.]+)/gis,
        withdrawal: /sacou\s+\$?([\d,.]+)/gis,
        payment: /pagou\s+\$?([\d,.]+)/gis,
        received: /recebeu\s+\$?([\d,.]+)/gis
      };

      for (const [patternType, regex] of Object.entries(moneyPatterns)) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const amount = parseFloat(match[1].replace(/[,]/g, ''));

          console.log(`💰 MultiChannelForwarder: Found money activity - ${authorName} ${patternType} $${amount} in ${firm.name}`);

          // Track money as special item type
          this.globalWorkerTracker.trackItemActivity({
            workerId: message.author.id,
            workerName: authorName,
            firmId: firm.id,
            firmName: firm.name,
            activityType: patternType === 'deposit' ? 'item_added' : 'item_removed',
            itemName: 'money',
            quantity: amount,
            timestamp: message.createdAt,
            originalMessage: content
          });
        }
      }

    } catch (error) {
      console.error('❌ MultiChannelForwarder: Comprehensive tracking error:', error);
    }
  }
}