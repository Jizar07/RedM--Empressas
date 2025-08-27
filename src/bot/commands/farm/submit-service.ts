import {
  ButtonInteraction,
  EmbedBuilder,
  Message,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} from 'discord.js';
import { promises as fs } from 'fs';
import path from 'path';
// Store temporary service submission data
const serviceData = new Map<string, any>();

// Function to get player's character name from Discord server nickname
async function getPlayerCharacterName(interaction: any): Promise<string | null> {
  try {
    // Get the user's nickname from the Discord server
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (!member) return null;
    
    const nickname = member.nickname || member.user.displayName;
    if (!nickname) return null;
    
    // Extract character name by removing "| XXXX" (boot ID) from nickname
    // "Jizar Stoffeliz | 4222" -> "Jizar Stoffeliz"
    const characterName = nickname.split('|')[0].trim();
    
    console.log(`Discord nickname: "${nickname}" -> Character name: "${characterName}"`);
    return characterName;
  } catch (error) {
    console.error('Error getting Discord nickname:', error);
    return null;
  }
}

// Role-based permission checking functions
async function loadFarmServiceConfig(): Promise<any> {
  try {
    const configPath = path.join(process.cwd(), 'data', 'farm-service-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading farm service config:', error);
    // Return default permissions if config can't be loaded
    return {
      rolePermissions: {
        acceptRoles: ['Admin', 'Moderator'],
        editRoles: ['Admin', 'Moderator'],
        rejectRoles: ['Admin', 'Moderator']
      }
    };
  }
}

async function userHasPermission(interaction: any, permissionType: 'accept' | 'edit' | 'reject' | 'pay'): Promise<boolean> {
  try {
    // Load farm service configuration
    const config = await loadFarmServiceConfig();
    
    // Get user's roles from Discord
    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (!member) return false;
    
    const userRoles = member.roles.cache.map((role: any) => role.name);
    
    // Determine which roles are required based on permission type
    let requiredRoles: string[] = [];
    switch (permissionType) {
      case 'accept':
        requiredRoles = config.rolePermissions?.acceptRoles || ['Admin', 'Moderator'];
        break;
      case 'edit':
        requiredRoles = config.rolePermissions?.editRoles || ['Admin', 'Moderator'];
        break;
      case 'reject':
        requiredRoles = config.rolePermissions?.rejectRoles || ['Admin', 'Moderator'];
        break;
      case 'pay':
        // Pay permissions use accept roles (workers who can approve can also pay)
        requiredRoles = config.rolePermissions?.acceptRoles || ['Admin', 'Moderator'];
        break;
    }
    
    // Check if user has any of the required roles
    const hasPermission = requiredRoles.some(roleName => userRoles.includes(roleName));
    
    console.log(`🔐 Permission check for ${interaction.user.username}: ${permissionType} - ${hasPermission ? 'GRANTED' : 'DENIED'}`);
    console.log(`   User roles: [${userRoles.join(', ')}]`);
    console.log(`   Required roles: [${requiredRoles.join(', ')}]`);
    
    return hasPermission;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return false; // Deny access on error for security
  }
}

// Handle button click to start farm service registration
export async function handleFarmServiceStart(interaction: ButtonInteraction) {
  console.log('🚜 handleFarmServiceStart called for user:', interaction.user.username);
  try {
    // Step 1: Show service type selection dropdown
    const serviceTypeSelect = new StringSelectMenuBuilder()
      .setCustomId(`farm_service_type_${interaction.user.id}`)
      .setPlaceholder('Selecione o tipo de serviço')
      .addOptions([
        {
          label: '🐄 Serviço de Animal',
          description: 'Entrega de animais crescidos para a fazenda',
          value: 'animal'
        },
        {
          label: '🌾 Serviço de Planta',
          description: 'Depósito de plantas no inventário da fazenda',
          value: 'planta'
        }
      ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(serviceTypeSelect);

    await interaction.reply({
      content: '🚜 **Submissão de Serviço da Fazenda**\n\nSelecione o tipo de serviço que você quer submeter:',
      components: [row],
      flags: MessageFlags.Ephemeral
    });
    console.log('✅ Service type selection sent successfully');

  } catch (error) {
    console.error('Error handling farm service start:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Erro ao iniciar submissão de serviço.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    } else {
      await interaction.followUp({
        content: '❌ Erro ao iniciar submissão de serviço.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
}

// Handle service type selection
export async function handleServiceTypeSelection(interaction: StringSelectMenuInteraction): Promise<any> {
  try {
    const userId = interaction.customId.split('_')[3];
    if (userId !== interaction.user.id) {
      return await interaction.reply({
        content: '❌ Esta seleção não é para você.',
        flags: MessageFlags.Ephemeral
      });
    }

    const serviceType = interaction.values[0];
    console.log('Service type selected:', serviceType);

    // Store service type
    const userData = serviceData.get(interaction.user.id) || {};
    userData.serviceType = serviceType;
    serviceData.set(interaction.user.id, userData);

    // Update the message to remove components (DISMISS)
    await interaction.update({
      content: `🌼 Tipo de serviço selecionado: ${serviceType === 'animal' ? '🐄 Animal' : '🌾 Planta'}`,
      components: []
    });

    // Show item type selection based on service type
    if (serviceType === 'animal') {
      await showAnimalTypeSelection(interaction);
    } else {
      await showPlantTypeSelection(interaction);
    }

  } catch (error) {
    console.error('Error handling service type selection:', error);
  }
}

// Show animal type selection dropdown
async function showAnimalTypeSelection(interaction: StringSelectMenuInteraction) {
  try {
    const animalTypeSelect = new StringSelectMenuBuilder()
      .setCustomId(`farm_animal_type_${interaction.user.id}`)
      .setPlaceholder('Selecione o tipo de animal')
      .addOptions([
        { label: '🐄 Bovino', value: 'Bovino' },
        { label: '🐓 Avino', value: 'Avino' },
        { label: '🐑 Ovino', value: 'Ovino' },
        { label: '🐐 Cabrino', value: 'Cabrino' },
        { label: '🐷 Suíno', value: 'Suino' },
        { label: '🐎 Equino', value: 'Equino' }
      ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(animalTypeSelect);

    await interaction.followUp({
      content: '🐄 Selecione o tipo de animal:',
      components: [row],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error showing animal type selection:', error);
  }
}

// Show plant type selection dropdown
async function showPlantTypeSelection(interaction: StringSelectMenuInteraction) {
  try {
    const plantTypeSelect = new StringSelectMenuBuilder()
      .setCustomId(`farm_plant_type_${interaction.user.id}`)
      .setPlaceholder('Selecione o tipo de planta')
      .addOptions([
        { label: '🌽 Milho (Básico - $0.15)', value: 'Milho' },
        { label: '🌾 Trigo (Básico - $0.15)', value: 'Trigo' },
        { label: '🌿 Junco (Básico - $0.15)', value: 'Junco' },
        { label: '🌱 Outras Plantas ($0.20)', value: 'other' }
      ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(plantTypeSelect);

    await interaction.followUp({
      content: '🌾 Selecione o tipo de planta:',
      components: [row],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('Error showing plant type selection:', error);
  }
}

// Handle animal type selection
export async function handleAnimalTypeSelection(interaction: StringSelectMenuInteraction): Promise<any> {
  try {
    const userId = interaction.customId.split('_')[3];
    if (userId !== interaction.user.id) {
      return await interaction.reply({
        content: '❌ Esta seleção não é para você.',
        flags: MessageFlags.Ephemeral
      });
    }

    const animalType = interaction.values[0];
    console.log('Animal type selected:', animalType);

    // Store animal type
    const userData = serviceData.get(interaction.user.id) || {};
    userData.itemType = animalType;
    serviceData.set(interaction.user.id, userData);

    // Update the message to remove components (DISMISS)
    await interaction.update({
      content: `🐄 Animal selecionado: ${animalType}`,
      components: []
    });

    // Ask for screenshot directly for animals (quantity detected by OCR)
    await askForScreenshot(interaction, userData);

  } catch (error) {
    console.error('Error handling animal type selection:', error);
  }
}

// Handle plant type selection
export async function handlePlantTypeSelection(interaction: StringSelectMenuInteraction): Promise<any> {
  try {
    const userId = interaction.customId.split('_')[3];
    if (userId !== interaction.user.id) {
      return await interaction.reply({
        content: '❌ Esta seleção não é para você.',
        flags: MessageFlags.Ephemeral
      });
    }

    const plantType = interaction.values[0];
    console.log('Plant type selected:', plantType);

    // Create dismiss message
    let dismissMessage = '';
    if (plantType === 'Milho') {
      dismissMessage = '🌽 Milho (Básico - $0.15)';
    } else if (plantType === 'Trigo') {
      dismissMessage = '🌾 Trigo (Básico - $0.15)';
    } else if (plantType === 'Junco') {
      dismissMessage = '🌿 Junco (Básico - $0.15)';
    } else if (plantType === 'other') {
      dismissMessage = '🌱 Outras Plantas ($0.20)';
    }

    // Store plant type
    const userData = serviceData.get(interaction.user.id) || {};
    userData.itemType = plantType;
    userData.plantDismissMessage = dismissMessage; // Store for later
    serviceData.set(interaction.user.id, userData);

    // Show quantity modal directly (this will consume the interaction)
    await showQuantityModal(interaction, plantType);

  } catch (error) {
    console.error('Error handling plant type selection:', error);
  }
}

// Show quantity modal for plants
async function showQuantityModal(interaction: StringSelectMenuInteraction, plantType: string) {
  try {
    const isOtherPlant = plantType === 'other';
    const modalTitle = isOtherPlant ? '🔢 Quantidade e Nome - Outras Plantas' : `🔢 Quantidade - ${plantType}`;
    
    const quantityModal = new ModalBuilder()
      .setCustomId(`farm_quantity_${interaction.user.id}`)
      .setTitle(modalTitle);

    const quantityInput = new TextInputBuilder()
      .setCustomId('quantity')
      .setLabel('Quantidade')
      .setPlaceholder('Digite a quantidade (ex: 200)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(10);

    quantityModal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(quantityInput)
    );

    // Add plant name field only for "outras plantas"
    if (isOtherPlant) {
      const plantNameInput = new TextInputBuilder()
        .setCustomId('plant_name')
        .setLabel('Nome da Planta')
        .setPlaceholder('Digite o nome da planta (ex: Batata, Cenoura, etc.)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

      quantityModal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(plantNameInput)
      );
    }

    await interaction.showModal(quantityModal);

  } catch (error) {
    console.error('Error showing quantity modal:', error);
  }
}

// Handle quantity modal submission
export async function handleQuantitySubmit(interaction: ModalSubmitInteraction): Promise<any> {
  try {
    const userId = interaction.customId.split('_')[2];
    if (userId !== interaction.user.id) {
      return await interaction.reply({
        content: '❌ Esta submissão não é para você.',
        flags: MessageFlags.Ephemeral
      });
    }

    const quantity = parseInt(interaction.fields.getTextInputValue('quantity').trim());
    
    if (isNaN(quantity) || quantity <= 0) {
      return await interaction.reply({
        content: '❌ Por favor, digite um número válido maior que 0.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Get stored user data
    const userData = serviceData.get(interaction.user.id) || {};
    userData.quantity = quantity;

    // Check if plant name was provided (for "outras plantas")
    try {
      const plantName = interaction.fields.getTextInputValue('plant_name');
      if (plantName && plantName.trim()) {
        userData.itemType = plantName.trim(); // Replace "other" with actual plant name
        userData.isCustomPlant = true; // Flag for pricing
      }
    } catch {
      // Plant name field not present, that's fine for non-"other" plants
    }

    serviceData.set(interaction.user.id, userData);

    // Reply to modal with plant selection dismissal if available
    let replyContent = `✅ **Quantidade:** ${quantity}`;
    if (userData.plantDismissMessage) {
      replyContent += `\n🌾 **Planta:** ${userData.plantDismissMessage}`;
    }

    await interaction.reply({
      content: replyContent,
      flags: MessageFlags.Ephemeral
    });

    // Ask for screenshot
    await askForScreenshot(interaction, userData);

  } catch (error) {
    console.error('Error handling quantity submit:', error);
  }
}

// Ask for screenshot
async function askForScreenshot(interaction: any, userData: any) {
  try {
    await interaction.followUp({
      content: 
        `📸 **Agora envie sua screenshot:**\n` +
        `Responda com sua screenshot em anexo.\n\n` +
        `⏱️ Você tem 3 minutos.\n` +
        `⚠️ **Importante:** Faça upload da imagem diretamente (não link/URL)`,
      flags: MessageFlags.Ephemeral
    });

    // Wait for screenshot upload
    if (!interaction.channel) {
      await interaction.followUp({
        content: '❌ Não foi possível acessar o canal.'
      });
      return;
    }

    if (!('createMessageCollector' in interaction.channel)) {
      await interaction.followUp({
        content: '❌ Este tipo de canal não suporta coleta de mensagens.'
      });
      return;
    }
    
    console.log('📝 Creating message collector for user:', interaction.user.id);
    const messageCollector = interaction.channel.createMessageCollector({
      filter: (msg: Message) => {
        console.log('🔍 Message filter check:', {
          authorId: msg.author.id,
          expectedUserId: interaction.user.id,
          attachments: msg.attachments.size,
          matches: msg.author.id === interaction.user.id && msg.attachments.size > 0
        });
        return msg.author.id === interaction.user.id && msg.attachments.size > 0;
      },
      time: 180000,
      max: 1
    });
    console.log('✅ Message collector created successfully');

    messageCollector.on('collect', async (message: Message) => {
      console.log('📨 Message collected! User uploaded:', message.attachments.size, 'attachments');
      const attachment = message.attachments.first();
      
      if (!attachment || !attachment.contentType?.startsWith('image/')) {
        await interaction.followUp({
          content: '❌ Por favor, faça upload de um arquivo de imagem válido.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (attachment.size > 5 * 1024 * 1024) {
        await interaction.followUp({
          content: '❌ Arquivo muito grande. Máximo 5MB.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Download attachment IMMEDIATELY before any other operations
      console.log('📥 Downloading attachment immediately...');
      let filePath: string | undefined;
      
      try {
        const tempPath = path.join(process.cwd(), 'uploads', 'temp', `temp_${Date.now()}_${attachment.name}`);
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        
        // Try multiple times with different approaches
        let success = false;
        
        // Approach 1: Direct fetch with immediate processing
        try {
          console.log('🔄 Trying direct fetch...');
          const response = await fetch(attachment.url, {
            headers: {
              'User-Agent': 'DiscordBot (https://discord.js.org, 14.0.0)'
            }
          });
          
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            await fs.writeFile(tempPath, Buffer.from(buffer));
            filePath = tempPath;
            success = true;
            console.log('✅ Direct fetch successful:', tempPath);
          } else {
            console.log('❌ Direct fetch failed, status:', response.status);
          }
        } catch (error: any) {
          console.log('❌ Direct fetch error:', error.message);
        }
        
        // Approach 2: If direct fetch failed, try axios with different headers
        if (!success) {
          try {
            console.log('🔄 Trying axios approach...');
            const axios = (await import('axios')).default;
            const response = await axios.get(attachment.url, {
              responseType: 'arraybuffer',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*'
              },
              timeout: 10000
            });
            
            await fs.writeFile(tempPath, Buffer.from(response.data));
            filePath = tempPath;
            success = true;
            console.log('✅ Axios fetch successful:', tempPath);
          } catch (error: any) {
            console.log('❌ Axios fetch error:', error.message);
          }
        }
        
        // Approach 3: Use Discord.js attachment download method
        if (!success) {
          try {
            console.log('🔄 Trying Discord.js attachment method...');
            const stream = await fetch(attachment.proxyURL || attachment.url);
            if (stream.ok) {
              const buffer = await stream.arrayBuffer();
              await fs.writeFile(tempPath, Buffer.from(buffer));
              filePath = tempPath;
              success = true;
              console.log('✅ Proxy URL fetch successful:', tempPath);
            }
          } catch (error: any) {
            console.log('❌ Proxy URL fetch error:', error.message);
          }
        }
        
      } catch (error: any) {
        console.log('❌ All download attempts failed:', error.message);
      }

      // Only delete user's message after successful download
      if (filePath) {
        await message.delete().catch(() => {});
      }

      if (!filePath) {
        await interaction.followUp({
          content: '❌ Falha no download da imagem. O link do Discord expirou muito rápido. Tente fazer upload novamente.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Process with the downloaded file path
      await processServiceSubmission(interaction, {
        serviceType: userData.serviceType,
        itemType: userData.itemType,
        quantity: userData.quantity,
        filePath: filePath
      });

      // Clean up stored data
      serviceData.delete(interaction.user.id);
    });

    messageCollector.on('end', (collected: any) => {
      if (collected.size === 0) {
        interaction.followUp({
          content: '❌ ⏱️ Tempo esgotado! Nenhuma screenshot recebida. Submissão cancelada.',
          flags: MessageFlags.Ephemeral
        }).catch(() => {});
        
        // Clean up stored data
        serviceData.delete(interaction.user.id);
      }
    });

  } catch (error) {
    console.error('Error asking for screenshot:', error);
  }
}

async function processServiceSubmission(
  interaction: any,
  data: {
    serviceType: string;
    itemType: string;
    quantity?: number;
    filePath?: string;
    attachment?: any;
  }
) {
  let processingMessage: any;
  try {
    processingMessage = await interaction.followUp({
      content: '🔄 Processando submissão...',
      flags: MessageFlags.Ephemeral
    });

    // Use file path that should already be provided
    let filePath = data.filePath;
    
    if (!filePath) {
      try {
        await processingMessage.edit('❌ Não foi possível processar a imagem. Discord CDN não está acessível no momento.');
      } catch (editError) {
        await interaction.followUp({
          content: '❌ Não foi possível processar a imagem. Discord CDN não está acessível no momento.',
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    // Skip OCR processing - create receipt directly for admin approval
    const config = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'farm-service-config.json'), 'utf8'));
    
    // Calculate payment based on service type
    let playerPayment = 0;
    if (data.serviceType === 'animal') {
      playerPayment = config.optimalAnimalIncome;
    } else {
      // Plant service payment
      // Check if it's a custom plant (from "outras plantas") or a basic plant
      const userData = serviceData.get(interaction.user.id) || {};
      const isCustomPlant = userData.isCustomPlant || false;
      const isBasicPlant = config.basicPlants.includes(data.itemType) && !isCustomPlant;
      const plantPrice = isBasicPlant ? config.plantPrices.basic : config.plantPrices.other;
      playerPayment = (data.quantity || 0) * plantPrice;
    }

    const result = {
      playerPayment: playerPayment,
      quantity: data.serviceType === 'animal' ? 1 : data.quantity,
      status: 'PENDING_APPROVAL'
    };

    // Get player's character name from Discord server nickname
    const playerName = await getPlayerCharacterName(interaction);
    if (!playerName) {
      try {
        await processingMessage.edit('❌ Não foi possível encontrar seu apelido no servidor. Certifique-se de que tem um apelido definido.');
      } catch (editError) {
        await interaction.followUp({
          content: '❌ Não foi possível encontrar seu apelido no servidor. Certifique-se de que tem um apelido definido.',
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    // Generate receipt and save
    const receipt = await createAndSaveReceipt({
      playerName: playerName,
      serviceType: data.serviceType,
      animalType: data.serviceType === 'animal' ? data.itemType : undefined,
      plantName: data.serviceType === 'planta' ? data.itemType : undefined,
      quantity: data.serviceType === 'animal' ? result.quantity : data.quantity,
      result,
      filePath
    });

    // VERIFY THE SERVICE SUBMISSION
    console.log('🔍 Verifying service submission...');
    let verificationResult = null;
    try {
      // Call verification API endpoint
      const axios = (await import('axios')).default;
      const verifyResponse = await axios.post(`http://localhost:3050/api/farm-service-data/verify/${receipt.receiptId}`);
      verificationResult = verifyResponse.data.verification;
      
      // Update receipt if verification modified it
      if (verifyResponse.data.receipt) {
        Object.assign(receipt, verifyResponse.data.receipt);
      }
      
      console.log(`✅ Verification complete: ${verificationResult.verificationMessage}`);
    } catch (error: any) {
      console.error('⚠️ Verification failed:', error.message);
      // Continue without verification if it fails
    }
    
    // Post to worker channel with verification results
    await postReceiptToWorkerChannel(interaction, receipt, verificationResult);

    // Success response with verification status
    let successMessage;
    
    if (verificationResult && !verificationResult.autoAccept) {
      // VERIFICATION FAILED - SUSPICIOUS
      if (data.serviceType === 'animal') {
        successMessage = `❌ **SERVIÇO SUSPEITO DETECTADO!**\n\n` +
          `📋 Recibo: #${receipt.receiptId}\n` +
          `🐄 Declarado: ${result.quantity} ${data.itemType}\n` +
          `💵 Valor Esperado: $${result.playerPayment.toFixed(2)}\n` +
          `🤖 **VERIFICAÇÃO**: ${verificationResult.verificationMessage}\n` +
          `⚠️ **NECESSÁRIA REVISÃO MANUAL**`;
      } else {
        successMessage = `❌ **SERVIÇO SUSPEITO DETECTADO!**\n\n` +
          `📋 Recibo: #${receipt.receiptId}\n` +
          `🌾 Declarado: ${data.quantity} ${data.itemType}\n` +
          `💵 Pagamento: $${result.playerPayment.toFixed(2)}\n` +
          `🤖 **VERIFICAÇÃO**: ${verificationResult.verificationMessage}\n` +
          `⚠️ **NECESSÁRIA REVISÃO MANUAL**`;
      }
    } else if (verificationResult && verificationResult.autoAccept) {
      // VERIFICATION PASSED
      if (data.serviceType === 'animal') {
        successMessage = `✅ **Serviço Verificado e Aprovado!**\n\n` +
          `📋 Recibo: #${receipt.receiptId}\n` +
          `🐄 Animais: ${result.quantity} ${data.itemType}\n` +
          `💵 Pagamento: $${receipt.playerPayment.toFixed(2)}${(receipt as any).paymentAdjusted ? ` (ajustado)` : ''}\n` +
          `🤖 Verificação: ${verificationResult.verificationMessage}`;
      } else {
        successMessage = `✅ **Serviço Verificado e Aprovado!**\n\n` +
          `📋 Recibo: #${receipt.receiptId}\n` +
          `🌾 Plantas: ${data.quantity} ${data.itemType}\n` +
          `💵 Pagamento: $${receipt.playerPayment.toFixed(2)}\n` +
          `🤖 Verificação: ${verificationResult.verificationMessage}`;
      }
    } else {
      // NO VERIFICATION - FALLBACK
      if (data.serviceType === 'animal') {
        successMessage = `✅ **Serviço Animal Submetido!**\n\n` +
          `📋 Recibo: #${receipt.receiptId}\n` +
          `🐄 Animais: ${result.quantity} ${data.itemType}\n` +
          `💵 Pagamento: $${result.playerPayment.toFixed(2)}\n` +
          `📊 Status: Aguardando Aprovação`;
      } else {
        successMessage = `✅ **Serviço de Planta Submetido!**\n\n` +
          `📋 Recibo: #${receipt.receiptId}\n` +
          `🌾 Plantas: ${data.quantity} ${data.itemType}\n` +
          `💵 Pagamento: $${result.playerPayment.toFixed(2)}\n` +
          `📊 Status: Aguardando Aprovação`;
      }
    }

    try {
      await processingMessage.edit(successMessage);
    } catch (editError) {
      await interaction.followUp({
        content: successMessage,
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (error: any) {
    console.error('Service processing error:', error);
    if (processingMessage) {
      await processingMessage.edit(`❌ Processing failed: ${error.message}`);
    } else {
      await interaction.followUp({
        content: `❌ Processing failed: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

// Helper functions removed - using direct buffer processing

async function createAndSaveReceipt(data: any) {
  const generateReceiptId = (): string => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const counter = Math.floor(Math.random() * 999) + 1;
    return `${dateStr}${counter.toString().padStart(3, '0')}`;
  };

  const receiptId = generateReceiptId();
  const receipt = {
    receiptId,
    timestamp: new Date().toISOString(),
    playerName: data.playerName,
    serviceType: data.serviceType,
    quantity: data.quantity,
    animalType: data.animalType || undefined,
    plantName: data.plantName || undefined,
    playerPayment: data.result.playerPayment,
    status: 'PENDING_APPROVAL',
    screenshotPath: data.filePath,
    approved: false
  };

  await saveReceipt(receipt);
  return receipt;
}

async function saveReceipt(receipt: any): Promise<void> {
  try {
    const playerDir = path.join(process.cwd(), 'data', 'players', receipt.playerName);
    const receiptsDir = path.join(playerDir, 'receipts');
    
    await fs.mkdir(receiptsDir, { recursive: true });
    
    const receiptPath = path.join(receiptsDir, `${receipt.receiptId}.json`);
    await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));
    
    const summaryPath = path.join(playerDir, 'summary.json');
    let summary = {
      playerName: receipt.playerName,
      totalEarnings: 0,
      totalServices: 0,
      animalServices: 0,
      plantServices: 0,
      lastService: receipt.timestamp
    };
    
    try {
      const existingSummary = await fs.readFile(summaryPath, 'utf-8');
      summary = JSON.parse(existingSummary);
    } catch {
      // File doesn't exist yet
    }
    
    summary.totalEarnings += receipt.playerPayment;
    summary.totalServices += 1;
    if (receipt.serviceType === 'animal') {
      summary.animalServices += 1;
    } else {
      summary.plantServices += 1;
    }
    summary.lastService = receipt.timestamp;
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('Error saving receipt:', error);
    throw error;
  }
}

async function postReceiptToWorkerChannel(interaction: any, receipt: any, verificationResult?: any): Promise<void> {
  try {
    const guild = interaction.guild;
    if (!guild) return;

    const categoryId = '1365579138974355476';
    // Convert player name to channel format: "Jizar Stoffeliz" -> "🌾・jizar-stoffeliz"
    const playerName = receipt.playerName.toLowerCase();
    const channelFormat = playerName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const expectedChannelName = `🌾・${channelFormat}`;
    
    console.log(`Looking for channel: ${expectedChannelName} for player: ${receipt.playerName}`);
    
    const workerChannel = guild.channels.cache.find((channel: any) => {
      if (channel.parentId !== categoryId) return false;
      
      // Match the channel with the prefix
      return channel.name === expectedChannelName;
    });

    if (workerChannel && workerChannel.isTextBased()) {
      // Set color based on verification
      let embedColor = 0x00FF00; // Default green
      let titleSuffix = '';
      if (verificationResult) {
        if (verificationResult.autoAccept) {
          embedColor = 0x00FF00;
          titleSuffix = ' ✅ AUTO-VERIFICADO';
        } else {
          embedColor = 0xFF0000;
          titleSuffix = ' ❌ FALHA NA VERIFICAÇÃO';
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle(`📋 Recibo de Serviço #${receipt.receiptId}${titleSuffix}`)
        .setColor(embedColor)
        .setTimestamp(new Date(receipt.timestamp))
        .setFooter({ text: 'Sistema de Serviços da Fazenda' });

      if (receipt.serviceType === 'animal') {
        embed.addFields(
          { name: 'Serviço', value: 'Entrega de Animais', inline: true },
          { name: 'Animais', value: `${receipt.quantity} ${receipt.animalType}`, inline: true },
          { name: 'Status', value: receipt.status, inline: true },
          { name: 'Renda da Fazenda', value: `$${receipt.farmIncome?.toFixed(2)}`, inline: true },
          { name: 'Pagamento', value: `$${receipt.playerPayment.toFixed(2)}`, inline: true }
        );

        if (receipt.penalty && receipt.penalty > 0) {
          embed.addFields({
            name: '⚠️ Penalidade',
            value: `-$${receipt.penalty.toFixed(2)} (animais com menos de 50 anos)`,
            inline: false
          });
        }

        if (receipt.playerDebt && receipt.playerDebt > 0) {
          embed.addFields({
            name: '❌ Dívida',
            value: `$${receipt.playerDebt.toFixed(2)} devido à fazenda`,
            inline: false
          });
        }
      } else {
        // Plant service
        embed.addFields(
          { name: 'Serviço', value: 'Depósito de Plantas', inline: true },
          { name: 'Tipo de Planta', value: receipt.plantName, inline: true },
          { name: 'Quantidade', value: receipt.quantity.toString(), inline: true },
          { name: 'Pagamento', value: `$${receipt.playerPayment.toFixed(2)}`, inline: true },
          { name: 'Status', value: '⚠️ **AGUARDANDO APROVAÇÃO**', inline: true }
        );
        
        // Add verification info if available
        if (verificationResult) {
          embed.addFields({
            name: '🤖 Verificação Automática',
            value: verificationResult.verificationMessage + 
              (verificationResult.transactions ? `\n📊 Transações Discord encontradas: ${verificationResult.transactions.length}` : ''),
            inline: false
          });
        } else {
          embed.addFields({
            name: '📸 Revisão Manual Necessária',
            value: `Usuário submeteu: **${receipt.quantity}** ${receipt.plantName}\n\nPor favor, verifique a captura de tela abaixo e aprove/rejeite adequadamente.`,
            inline: false
          });
        }
      }

      // Prepare message components
      const messagePayload: any = { embeds: [embed] };
      
      // Add Accept/Edit/Reject buttons for all submissions
      const acceptButton = new ButtonBuilder()
        .setCustomId(`receipt_accept_${receipt.receiptId}`)
        .setLabel('Aceitar')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');
        
      const editButton = new ButtonBuilder()
        .setCustomId(`receipt_edit_${receipt.receiptId}`)
        .setLabel('Editar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️');
        
      const rejectButton = new ButtonBuilder()
        .setCustomId(`receipt_reject_${receipt.receiptId}`)
        .setLabel('Rejeitar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

      const buttonRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(acceptButton, editButton, rejectButton);
        
      messagePayload.components = [buttonRow];
      
      // Add screenshot attachment for admin verification
      if (receipt.screenshotPath) {
        try {
          const screenshotBuffer = await fs.readFile(receipt.screenshotPath);
          const attachment = new AttachmentBuilder(screenshotBuffer, { 
            name: `receipt_${receipt.receiptId}_screenshot.png` 
          });
          messagePayload.files = [attachment];
        } catch (error) {
          console.error('Error attaching screenshot:', error);
          embed.addFields({
            name: '⚠️ Screenshot Error',
            value: 'Could not attach screenshot file. Check server logs.',
            inline: false
          });
        }
      }

      await workerChannel.send(messagePayload);
      console.log(`✅ Receipt posted to ${workerChannel.name}`);
    } else {
      console.error(`Worker channel not found for: ${receipt.playerName}`);
      console.error(`Expected channel name: ${expectedChannelName}`);
      console.log('Available channels in category:', guild.channels.cache.filter((c: any) => c.parentId === categoryId).map((c: any) => c.name));
    }
  } catch (error) {
    console.error('Error posting receipt to worker channel:', error);
  }
}

// Handle receipt acceptance
export async function handleReceiptAccept(interaction: ButtonInteraction): Promise<void> {
  try {
    const receiptId = interaction.customId.split('_')[2];
    console.log('🟢 Accepting receipt:', receiptId);

    // Check user permissions
    const hasPermission = await userHasPermission(interaction, 'accept');
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Você não tem permissão para aceitar recibos. Contate um administrador.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Load receipt data
    const receiptData = await loadReceiptData(receiptId);
    if (!receiptData) {
      await interaction.reply({
        content: '❌ Recibo não encontrado.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Mark as approved and save
    receiptData.approved = true;
    receiptData.status = 'APPROVED';
    receiptData.approvedBy = interaction.user.username;
    receiptData.approvedAt = new Date().toISOString();

    await saveReceiptData(receiptData);

    // IMMEDIATELY create persistent receipt when approved (not when Pay Now is clicked)
    await createOrUpdatePersistentReceipt(interaction, receiptData);

    // Create detailed receipt summary for posting
    const currentDate = new Date(receiptData.approvedAt);
    const timestamp = currentDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const receiptEmbed = new EmbedBuilder()
      .setTitle(`✅ Serviço Aprovado #${receiptData.receiptId}`)
      .setColor(0x00FF00)
      .setTimestamp(new Date(receiptData.approvedAt))
      .setFooter({ text: 'Recibo de Serviço Aprovado' });

    if (receiptData.serviceType === 'animal') {
      receiptEmbed.addFields(
        { name: '🐄 Tipo de Serviço', value: 'Entrega de Animais', inline: true },
        { name: 'Animal', value: receiptData.animalType, inline: true },
        { name: 'Quantidade', value: receiptData.quantity.toString(), inline: true },
        { name: '💰 Pagamento', value: `$${receiptData.playerPayment.toFixed(2)}`, inline: true },
        { name: '🗓️ Timestamp', value: timestamp, inline: true },
        { name: '✅ Aprovado por', value: interaction.user.username, inline: true }
      );
    } else {
      receiptEmbed.addFields(
        { name: '🌾 Tipo de Serviço', value: 'Depósito de Plantas', inline: true },
        { name: 'Planta', value: receiptData.plantName, inline: true },
        { name: 'Quantidade', value: receiptData.quantity.toString(), inline: true },
        { name: '💰 Pagamento', value: `$${receiptData.playerPayment.toFixed(2)}`, inline: true },
        { name: '🗓️ Timestamp', value: timestamp, inline: true },
        { name: '✅ Aprovado por', value: interaction.user.username, inline: true }
      );
    }

    // Add "Pay Now" button for user
    const payNowButton = new ButtonBuilder()
      .setCustomId(`receipt_pay_now_${receiptData.receiptId}`)
      .setLabel('Pagar Agora')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('💰');

    const payButtonRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(payNowButton);

    // Update admin message
    await interaction.update({
      content: `✅ **APROVADO** por ${interaction.user.username}`,
      embeds: [receiptEmbed],
      components: [payButtonRow]
    });

    console.log(`✅ Receipt ${receiptId} approved by ${interaction.user.username}`);

  } catch (error: any) {
    console.error('Error handling receipt accept:', error);
    
    // Check if interaction has expired
    if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
      console.log('Interaction expired, cannot respond');
      return;
    }
    
    // Try to respond only if interaction hasn't been responded to
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ Erro ao processar aprovação.',
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error('Failed to reply to interaction:', replyError);
      }
    }
  }
}

// Handle receipt edit
export async function handleReceiptEdit(interaction: ButtonInteraction): Promise<void> {
  try {
    const receiptId = interaction.customId.split('_')[2];
    console.log('✏️ Editing receipt:', receiptId);

    // Check user permissions
    const hasPermission = await userHasPermission(interaction, 'edit');
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Você não tem permissão para editar recibos. Contate um administrador.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Load receipt data
    const receiptData = await loadReceiptData(receiptId);
    if (!receiptData) {
      await interaction.reply({
        content: '❌ Recibo não encontrado.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Show quantity edit modal
    const editModal = new ModalBuilder()
      .setCustomId(`receipt_edit_quantity_${receiptId}`)
      .setTitle(`✏️ Editar Quantidade - #${receiptId}`);

    const quantityInput = new TextInputBuilder()
      .setCustomId('new_quantity')
      .setLabel('Nova Quantidade')
      .setPlaceholder(`Quantidade atual: ${receiptData.quantity}`)
      .setValue(receiptData.quantity.toString())
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(10);

    editModal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(quantityInput)
    );

    await interaction.showModal(editModal);

  } catch (error: any) {
    console.error('Error handling receipt edit:', error);
    
    // Check if interaction has expired
    if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
      console.log('Interaction expired, cannot respond');
      return;
    }
    
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ Erro ao processar edição.',
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error('Failed to reply to interaction:', replyError);
      }
    }
  }
}

// Handle quantity edit modal submission
export async function handleReceiptEditQuantity(interaction: ModalSubmitInteraction): Promise<void> {
  try {
    const receiptId = interaction.customId.split('_')[3];
    const newQuantity = parseInt(interaction.fields.getTextInputValue('new_quantity').trim());
    
    // Check user permissions
    const hasPermission = await userHasPermission(interaction, 'edit');
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Você não tem permissão para editar quantidades. Contate um administrador.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    
    if (isNaN(newQuantity) || newQuantity <= 0) {
      await interaction.reply({
        content: '❌ Por favor, digite um número válido maior que 0.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Load receipt data
    const receiptData = await loadReceiptData(receiptId);
    if (!receiptData) {
      await interaction.reply({
        content: '❌ Recibo não encontrado.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Load config to recalculate payment
    const config = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'farm-service-config.json'), 'utf8'));
    
    // Recalculate payment with new quantity
    let newPlayerPayment = 0;
    if (receiptData.serviceType === 'animal') {
      // Animal quantity doesn't affect payment, but update anyway
      receiptData.quantity = newQuantity;
      newPlayerPayment = config.optimalAnimalIncome;
    } else {
      // Plant service payment recalculation
      const isBasicPlant = config.basicPlants.includes(receiptData.plantName);
      const plantPrice = isBasicPlant ? config.plantPrices.basic : config.plantPrices.other;
      newPlayerPayment = newQuantity * plantPrice;
      receiptData.quantity = newQuantity;
    }
    
    receiptData.playerPayment = newPlayerPayment;
    receiptData.editedBy = interaction.user.username;
    receiptData.editedAt = new Date().toISOString();
    receiptData.originalQuantity = receiptData.originalQuantity || receiptData.quantity;

    await saveReceiptData(receiptData);

    // Update the message with new information
    const embed = new EmbedBuilder()
      .setTitle(`📋 Recibo Editado #${receiptData.receiptId}`)
      .setColor(0xFFAA00)
      .setTimestamp(new Date(receiptData.timestamp))
      .setFooter({ text: 'Sistema de Serviços da Fazenda - Editado' });

    if (receiptData.serviceType === 'animal') {
      embed.addFields(
        { name: 'Serviço', value: 'Entrega de Animais', inline: true },
        { name: 'Animais', value: `${receiptData.quantity} ${receiptData.animalType}`, inline: true },
        { name: 'Pagamento', value: `$${receiptData.playerPayment.toFixed(2)}`, inline: true },
        { name: 'Editado por', value: interaction.user.username, inline: true }
      );
    } else {
      embed.addFields(
        { name: 'Serviço', value: 'Depósito de Plantas', inline: true },
        { name: 'Tipo de Planta', value: receiptData.plantName, inline: true },
        { name: 'Nova Quantidade', value: `${receiptData.quantity} (antes: ${receiptData.originalQuantity})`, inline: true },
        { name: 'Novo Pagamento', value: `$${receiptData.playerPayment.toFixed(2)}`, inline: true },
        { name: 'Editado por', value: interaction.user.username, inline: true }
      );
    }

    // Add same action buttons again
    const acceptButton = new ButtonBuilder()
      .setCustomId(`receipt_accept_${receiptData.receiptId}`)
      .setLabel('Aceitar')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');
        
    const editButton = new ButtonBuilder()
      .setCustomId(`receipt_edit_${receiptData.receiptId}`)
      .setLabel('Editar Novamente')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✏️');
        
    const rejectButton = new ButtonBuilder()
      .setCustomId(`receipt_reject_${receiptData.receiptId}`)
      .setLabel('Rejeitar')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');

    const buttonRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(acceptButton, editButton, rejectButton);

    await interaction.editReply({
      embeds: [embed],
      components: [buttonRow]
    });

    console.log(`✏️ Receipt ${receiptId} edited by ${interaction.user.username}: quantity changed to ${newQuantity}`);

  } catch (error) {
    console.error('Error handling receipt edit quantity:', error);
    await interaction.reply({
      content: '❌ Erro ao processar edição da quantidade.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// Handle receipt rejection
export async function handleReceiptReject(interaction: ButtonInteraction): Promise<void> {
  try {
    const receiptId = interaction.customId.split('_')[2];
    console.log('🔴 Rejecting receipt:', receiptId);

    // Check user permissions
    const hasPermission = await userHasPermission(interaction, 'reject');
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Você não tem permissão para rejeitar recibos. Contate um administrador.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Load receipt data
    const receiptData = await loadReceiptData(receiptId);
    if (!receiptData) {
      await interaction.reply({
        content: '❌ Recibo não encontrado.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Mark as rejected and save
    receiptData.approved = false;
    receiptData.status = 'REJECTED';
    receiptData.rejectedBy = interaction.user.username;
    receiptData.rejectedAt = new Date().toISOString();

    await saveReceiptData(receiptData);

    // Update the message
    await interaction.update({
      content: `❌ **REJEITADO** por ${interaction.user.username}`,
      embeds: [],
      components: []
    });

    console.log(`❌ Receipt ${receiptId} rejected by ${interaction.user.username}`);

  } catch (error: any) {
    console.error('Error handling receipt reject:', error);
    
    // Check if interaction has expired
    if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
      console.log('Interaction expired, cannot respond');
      return;
    }
    
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ Erro ao processar rejeição.',
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error('Failed to reply to interaction:', replyError);
      }
    }
  }
}

// Helper function to load receipt data
async function loadReceiptData(receiptId: string) {
  try {
    // Search for receipt in all player directories
    const playersDir = path.join(process.cwd(), 'data', 'players');
    const playerDirs = await fs.readdir(playersDir);
    
    for (const playerDir of playerDirs) {
      try {
        const receiptPath = path.join(playersDir, playerDir, 'receipts', `${receiptId}.json`);
        const receiptData = await fs.readFile(receiptPath, 'utf-8');
        return JSON.parse(receiptData);
      } catch {
        // Receipt not in this player's directory, continue searching
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error loading receipt data:', error);
    return null;
  }
}

// Handle "Pay Now" button - create persistent receipt and running total
export async function handleReceiptPayNow(interaction: ButtonInteraction): Promise<void> {
  try {
    const receiptId = interaction.customId.split('_')[3];
    console.log('💰 Processing payment for receipt:', receiptId);

    // Check user permissions
    const hasPermission = await userHasPermission(interaction, 'pay');
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Você não tem permissão para processar pagamentos. Contate um administrador.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Load receipt data
    const receiptData = await loadReceiptData(receiptId);
    if (!receiptData) {
      await interaction.reply({
        content: '❌ Recibo não encontrado.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Check if already paid
    if (receiptData.paid) {
      await interaction.reply({
        content: '❌ Este recibo já foi pago.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Mark as paid
    receiptData.paid = true;
    receiptData.paidAt = new Date().toISOString();
    receiptData.paidBy = interaction.user.username;
    await saveReceiptData(receiptData);

    // Update existing persistent receipt to reflect paid status
    await updatePersistentReceiptPaidStatus(interaction, receiptData);

    // Update current message to show paid status
    const paidEmbed = new EmbedBuilder()
      .setTitle(`💰 Recibo Pago #${receiptData.receiptId}`)
      .setColor(0x32CD32)
      .setTimestamp(new Date(receiptData.paidAt))
      .setFooter({ text: 'Pagamento Processado' });

    if (receiptData.serviceType === 'animal') {
      paidEmbed.addFields(
        { name: '🐄 Serviço', value: 'Entrega de Animais', inline: true },
        { name: 'Animais', value: `${receiptData.quantity} ${receiptData.animalType}`, inline: true },
        { name: 'Pagamento', value: `$${receiptData.playerPayment.toFixed(2)}`, inline: true },
        { name: 'Pago por', value: interaction.user.username, inline: true }
      );
    } else {
      paidEmbed.addFields(
        { name: '🌾 Serviço', value: 'Depósito de Plantas', inline: true },
        { name: 'Planta', value: receiptData.plantName, inline: true },
        { name: 'Quantidade', value: receiptData.quantity.toString(), inline: true },
        { name: 'Pagamento', value: `$${receiptData.playerPayment.toFixed(2)}`, inline: true },
        { name: 'Pago por', value: interaction.user.username, inline: true }
      );
    }

    await interaction.update({
      content: `💰 **PAGO** - Recibo processado com sucesso`,
      embeds: [paidEmbed],
      components: []
    });

    console.log(`💰 Receipt ${receiptId} paid by ${interaction.user.username}`);

  } catch (error: any) {
    console.error('Error handling receipt payment:', error);
    
    // Check if interaction has expired
    if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
      console.log('Interaction expired, cannot respond');
      return;
    }
    
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ Erro ao processar pagamento.',
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error('Failed to reply to interaction:', replyError);
      }
    }
  }
}

// Update persistent receipt when individual receipt is paid
async function updatePersistentReceiptPaidStatus(interaction: ButtonInteraction, receiptData: any) {
  try {
    const channelId = interaction.channelId;
    const playerName = receiptData.playerName;
    
    // File path for persistent receipt data
    const persistentReceiptPath = path.join(process.cwd(), 'data', 'persistent-receipts', `${channelId}_${playerName.replace(/\s+/g, '_')}.json`);
    
    // Load existing persistent receipt
    let persistentReceipt;
    try {
      const existingData = await fs.readFile(persistentReceiptPath, 'utf-8');
      persistentReceipt = JSON.parse(existingData);
    } catch {
      console.log('No persistent receipt found to update paid status');
      return;
    }

    // Update the specific service's paid status
    const serviceIndex = persistentReceipt.services.findIndex((s: any) => s.receiptId === receiptData.receiptId);
    if (serviceIndex >= 0) {
      persistentReceipt.services[serviceIndex].timestamp = receiptData.paidAt;
      persistentReceipt.services[serviceIndex].paid = true;
    }
    
    persistentReceipt.lastUpdated = new Date().toISOString();

    // Update the persistent receipt message (keep same structure)
    const receiptEmbed = new EmbedBuilder()
      .setTitle(`🧾 Recibo de ${playerName}`)
      .setDescription(`**Total Acumulado: $${persistentReceipt.totalEarnings.toFixed(2)}**\n**Total de Serviços: ${persistentReceipt.totalServices}**`)
      .setColor(0x4169E1)
      .setTimestamp(new Date(persistentReceipt.lastUpdated))
      .setFooter({ text: 'Recibo Atualizado' });

    // Add recent services (last 5)
    const recentServices = persistentReceipt.services.slice(-5);
    let servicesText = '';
    recentServices.forEach((service: any) => {
      const serviceIcon = service.serviceType === 'animal' ? '🐄' : '🌾';
      const paidIcon = service.paid ? '✅' : '⏳';
      servicesText += `${paidIcon} ${serviceIcon} ${service.quantity} ${service.itemType} - $${service.payment.toFixed(2)}\n`;
    });
    
    if (servicesText) {
      receiptEmbed.addFields({
        name: '📝 Últimos Serviços',
        value: servicesText || 'Nenhum serviço encontrado',
        inline: false
      });
    }

    // "Pay All" button for final payment
    const finalPayButton = new ButtonBuilder()
      .setCustomId(`final_payment_${channelId}_${playerName.replace(/\s+/g, '_')}`)
      .setLabel('Pagar Tudo')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💰');

    const finalPayRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(finalPayButton);

    // Update the persistent receipt message
    const channel = interaction.channel;
    if (channel && 'send' in channel && persistentReceipt.messageId) {
      try {
        const receiptMessage = await channel.messages.fetch(persistentReceipt.messageId);
        await receiptMessage.edit({
          embeds: [receiptEmbed],
          components: [finalPayRow]
        });
      } catch (error) {
        console.log('Could not update persistent receipt message:', error);
      }
    }

    // Save persistent receipt data
    await fs.writeFile(persistentReceiptPath, JSON.stringify(persistentReceipt, null, 2));

  } catch (error) {
    console.error('Error updating persistent receipt paid status:', error);
  }
}

// Create or update persistent receipt with running total
async function createOrUpdatePersistentReceipt(interaction: ButtonInteraction, receiptData: any) {
  try {
    const channelId = interaction.channelId;
    const playerName = receiptData.playerName;
    
    // File path for persistent receipt data
    const persistentReceiptPath = path.join(process.cwd(), 'data', 'persistent-receipts', `${channelId}_${playerName.replace(/\s+/g, '_')}.json`);
    await fs.mkdir(path.dirname(persistentReceiptPath), { recursive: true });

    // Load or create persistent receipt
    let persistentReceipt;
    try {
      const existingData = await fs.readFile(persistentReceiptPath, 'utf-8');
      persistentReceipt = JSON.parse(existingData);
    } catch {
      persistentReceipt = {
        playerName: playerName,
        channelId: channelId,
        messageId: null,
        totalEarnings: 0,
        totalServices: 0,
        services: [],
        lastUpdated: new Date().toISOString()
      };
    }

    // Add new service to running total
    persistentReceipt.totalEarnings += receiptData.playerPayment;
    persistentReceipt.totalServices += 1;
    persistentReceipt.services.push({
      receiptId: receiptData.receiptId,
      serviceType: receiptData.serviceType,
      itemType: receiptData.serviceType === 'animal' ? receiptData.animalType : receiptData.plantName,
      quantity: receiptData.quantity,
      payment: receiptData.playerPayment,
      timestamp: receiptData.paidAt || receiptData.approvedAt, // Use paidAt if available, otherwise approvedAt
      approvedBy: receiptData.approvedBy || 'Sistema',
      editedBy: receiptData.editedBy // Include if service was edited
    });
    persistentReceipt.lastUpdated = new Date().toISOString();

    // Create or update the persistent receipt message
    const receiptEmbed = new EmbedBuilder()
      .setTitle(`🧾 Recibo de ${playerName}`)
      .setDescription(`**Total Acumulado: $${persistentReceipt.totalEarnings.toFixed(2)}**\n**Total de Serviços: ${persistentReceipt.totalServices}**`)
      .setColor(0x4169E1)
      .setTimestamp(new Date(persistentReceipt.lastUpdated))
      .setFooter({ text: 'Recibo Atualizado' });

    // Add ALL services to the receipt with approval info
    let servicesText = '';
    persistentReceipt.services.forEach((service: any, index: number) => {
      const serviceIcon = service.serviceType === 'animal' ? '🐄' : '🌾';
      const approvalInfo = service.approvedBy ? ` (✅ ${service.approvedBy})` : '';
      servicesText += `${index + 1}. ${serviceIcon} ${service.quantity} ${service.itemType} - $${service.payment.toFixed(2)}${approvalInfo}\n`;
    });
    
    // Handle Discord's 1024 character limit for field values
    if (servicesText.length > 1000) {
      const truncatePoint = servicesText.lastIndexOf('\n', 1000);
      const truncatedServices = servicesText.substring(0, truncatePoint);
      const remainingCount = persistentReceipt.services.length - truncatedServices.split('\n').length + 1;
      servicesText = truncatedServices + `\n... e mais ${remainingCount} serviços`;
    }
    
    if (servicesText) {
      receiptEmbed.addFields({
        name: `📝 Todos os Serviços (${persistentReceipt.totalServices} total)`,
        value: servicesText || 'Nenhum serviço encontrado',
        inline: false
      });
    }

    // "Pay All" button for final payment
    const finalPayButton = new ButtonBuilder()
      .setCustomId(`final_payment_${channelId}_${playerName.replace(/\s+/g, '_')}`)
      .setLabel('Pagar Tudo')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💰');

    const finalPayRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(finalPayButton);

    // Send or update the persistent receipt message (always create new message at bottom)
    const channel = interaction.channel;
    if (channel && 'send' in channel) {
      let receiptMessage;
      
      if (persistentReceipt.messageId) {
        // Delete old message to move receipt to bottom
        try {
          const oldMessage = await channel.messages.fetch(persistentReceipt.messageId);
          await oldMessage.delete();
        } catch {
          // Old message not found, that's fine
        }
      }
      
      // Always create new message at bottom
      receiptMessage = await channel.send({
        embeds: [receiptEmbed],
        components: [finalPayRow]
      });
      persistentReceipt.messageId = receiptMessage.id;
    }

    // Save persistent receipt data
    await fs.writeFile(persistentReceiptPath, JSON.stringify(persistentReceipt, null, 2));

  } catch (error) {
    console.error('Error creating/updating persistent receipt:', error);
  }
}

// Handle final payment - process total and clear channel except paid receipts
export async function handleFinalPayment(interaction: ButtonInteraction): Promise<void> {
  try {
    const customIdParts = interaction.customId.split('_');
    const channelId = customIdParts[2];
    const playerName = customIdParts.slice(3).join('_').replace(/_/g, ' ');
    
    console.log(`💰 Processing final payment for ${playerName} in channel ${channelId}`);

    // Check user permissions
    const hasPermission = await userHasPermission(interaction, 'pay');
    if (!hasPermission) {
      await interaction.reply({
        content: '❌ Você não tem permissão para processar pagamentos finais. Contate um administrador.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Load persistent receipt
    const persistentReceiptPath = path.join(process.cwd(), 'data', 'persistent-receipts', `${channelId}_${playerName.replace(/\s+/g, '_')}.json`);
    
    let persistentReceipt;
    try {
      const receiptData = await fs.readFile(persistentReceiptPath, 'utf-8');
      persistentReceipt = JSON.parse(receiptData);
      console.log(`✅ Found persistent receipt for ${playerName}: ${persistentReceipt.totalServices} services, $${persistentReceipt.totalEarnings.toFixed(2)}`);
    } catch (error: any) {
      console.error(`❌ No persistent receipt found at: ${persistentReceiptPath}`, error.message);
      await interaction.reply({
        content: `❌ Nenhum recibo encontrado para ${playerName} neste canal.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Create final paid receipt
    const finalReceiptEmbed = new EmbedBuilder()
      .setTitle(`💰 PAGAMENTO PROCESSADO`)
      .setDescription(`**Trabalhador:** ${playerName}\n**Total Pago:** $${persistentReceipt.totalEarnings.toFixed(2)}\n**Serviços Realizados:** ${persistentReceipt.totalServices}\n**💳 Pago por:** ${interaction.user.username}`)
      .setColor(0x00FF00)
      .setTimestamp()
      .setFooter({ text: `Pagamento Final - ID: ${Date.now()}` });

    // Add services breakdown - SHOW ALL SERVICES with approval info
    let servicesBreakdown = '';
    persistentReceipt.services.forEach((service: any, index: number) => {
      const serviceIcon = service.serviceType === 'animal' ? '🐄' : '🌾';
      const approvalInfo = service.approvedBy ? ` (✅ ${service.approvedBy})` : '';
      servicesBreakdown += `${index + 1}. ${serviceIcon} ${service.quantity} ${service.itemType} - $${service.payment.toFixed(2)}${approvalInfo}\n`;
    });
    
    // Handle Discord's 1024 character limit for field values
    if (servicesBreakdown.length > 1000) {
      const truncatePoint = servicesBreakdown.lastIndexOf('\n', 1000);
      const truncatedServices = servicesBreakdown.substring(0, truncatePoint);
      const remainingCount = persistentReceipt.services.length - truncatedServices.split('\n').length + 1;
      servicesBreakdown = truncatedServices + `\n... e mais ${remainingCount} serviços`;
    }
    
    finalReceiptEmbed.addFields({
      name: `📝 Todos os Serviços Pagos (${persistentReceipt.totalServices} total)`,
      value: servicesBreakdown || 'Nenhum serviço',
      inline: false
    });

    // Clear channel of all messages except existing paid receipts
    const channel = interaction.channel;
    if (channel && 'send' in channel) {
      try {
        // Fetch recent messages
        const messages = await channel.messages.fetch({ limit: 100 });
        const messagesToDelete = [];
        
        for (const [, message] of messages) {
          // Don't delete if it's a paid receipt (has "PAGAMENTO PROCESSADO" in title)
          const isPaidReceipt = message.embeds.some(embed => 
            embed.title && embed.title.includes('PAGAMENTO PROCESSADO')
          );
          
          // Don't delete the main registration embed
          const isRegistrationEmbed = message.embeds.some(embed =>
            embed.title && embed.title.includes('Registro de Serviços da Fazenda')
          );
          
          // Don't delete pinned messages
          const isPinnedMessage = message.pinned;
          
          if (!isPaidReceipt && !isRegistrationEmbed && !isPinnedMessage && message.id !== interaction.message?.id) {
            messagesToDelete.push(message);
          }
        }
        
        // Delete messages in batches
        for (const message of messagesToDelete) {
          try {
            await message.delete();
          } catch (error: any) {
            if (error.code === 10008) {
              // Message already deleted, ignore this error
              console.log(`Message ${message.id} already deleted, skipping`);
            } else {
              console.log(`Could not delete message ${message.id}:`, error);
            }
          }
        }
        
        console.log(`🧼 Cleaned ${messagesToDelete.length} messages from channel ${channelId}`);
      } catch (error) {
        console.error('Error cleaning channel messages:', error);
      }

    }

    // Update the persistent receipt message to final status (only update, don't send new)
    try {
      await interaction.update({
        embeds: [finalReceiptEmbed],
        components: []
      });
    } catch (error: any) {
      if (error.code === 10062) {
        console.log('Interaction expired, cannot respond');
      } else {
        console.error('Error updating interaction:', error);
        throw error;
      }
    }

    // Archive the persistent receipt
    const archivePath = path.join(process.cwd(), 'data', 'paid-receipts', `${Date.now()}_${playerName.replace(/\s+/g, '_')}.json`);
    await fs.mkdir(path.dirname(archivePath), { recursive: true });
    
    const archivedReceipt = {
      ...persistentReceipt,
      finalizedAt: new Date().toISOString(),
      finalizedBy: interaction.user.username
    };
    
    await fs.writeFile(archivePath, JSON.stringify(archivedReceipt, null, 2));
    
    // Remove persistent receipt file
    try {
      await fs.unlink(persistentReceiptPath);
    } catch {
      // File might not exist
    }

    console.log(`💰 Final payment processed for ${playerName}: $${persistentReceipt.totalEarnings.toFixed(2)}`);

  } catch (error: any) {
    console.error('Error handling final payment:', error);
    
    // Check if interaction has expired
    if (error.code === 10062 || error.message?.includes('Unknown interaction')) {
      console.log('Interaction expired, cannot respond');
      return;
    }
    
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ Erro ao processar pagamento final.',
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError) {
        console.error('Failed to reply to interaction:', replyError);
      }
    }
  }
}

// Helper function to save receipt data
async function saveReceiptData(receiptData: any) {
  try {
    const playerDir = path.join(process.cwd(), 'data', 'players', receiptData.playerName);
    const receiptPath = path.join(playerDir, 'receipts', `${receiptData.receiptId}.json`);
    await fs.writeFile(receiptPath, JSON.stringify(receiptData, null, 2));
  } catch (error) {
    console.error('Error saving receipt data:', error);
    throw error;
  }
}