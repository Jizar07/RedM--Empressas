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
// Removed OCR service - using manual approval system

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

    // Update the message to show selection
    await interaction.update({
      content: `✅ **Tipo selecionado:** ${serviceType === 'animal' ? '🐄 Serviço de Animal' : '🌾 Serviço de Planta'}`,
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
      content: '🐄 **Selecione o tipo de animal:**',
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
        { label: '🌱 Outra Planta ($0.20)', value: 'other' }
      ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(plantTypeSelect);

    await interaction.followUp({
      content: '🌾 **Selecione o tipo de planta:**',
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

    // Update the message
    await interaction.update({
      content: `✅ **Animal selecionado:** ${animalType.charAt(0).toUpperCase() + animalType.slice(1)}`,
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

    // Store plant type
    const userData = serviceData.get(interaction.user.id) || {};
    userData.itemType = plantType;
    serviceData.set(interaction.user.id, userData);

    // Show quantity modal for plants immediately 
    await showQuantityModal(interaction, plantType);

  } catch (error) {
    console.error('Error handling plant type selection:', error);
  }
}

// Show quantity modal for plants
async function showQuantityModal(interaction: StringSelectMenuInteraction, plantType: string) {
  try {
    const quantityModal = new ModalBuilder()
      .setCustomId(`farm_quantity_${interaction.user.id}`)
      .setTitle(`🔢 Quantidade - ${plantType}`);

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

    // Store quantity
    const userData = serviceData.get(interaction.user.id) || {};
    userData.quantity = quantity;
    serviceData.set(interaction.user.id, userData);

    await interaction.reply({
      content: `✅ **Quantidade:** ${quantity}`,
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
        `✅ **Detalhes Recebidos:**\n` +
        `• Tipo: ${userData.serviceType === 'animal' ? '🐄 Animal' : '🌾 Planta'}\n` +
        `• Item: ${userData.itemType.charAt(0).toUpperCase() + userData.itemType.slice(1)}\n` +
        `${userData.quantity ? `• Quantidade: ${userData.quantity}\n` : ''}` +
        `\n📸 **Agora envie sua screenshot:**\n` +
        `Responda com sua screenshot em anexo.\n\n` +
        `⏱️ Você tem 5 minutos.`,
      flags: MessageFlags.Ephemeral
    });

    // Wait for screenshot upload
    if (!interaction.channel) {
      await interaction.followUp({
        content: '❌ Não foi possível acessar o canal.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!('createMessageCollector' in interaction.channel)) {
      await interaction.followUp({
        content: '❌ Este tipo de canal não suporta coleta de mensagens.',
        flags: MessageFlags.Ephemeral
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
      time: 300000,
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

      // Delete user's message
      await message.delete().catch(() => {});

      // Download attachment IMMEDIATELY before URL expires
      console.log('📥 Downloading attachment immediately...');
      let filePath: string | undefined;
      
      try {
        const tempPath = path.join(process.cwd(), 'uploads', 'temp', `temp_${Date.now()}_${attachment.name}`);
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        
        const response = await fetch(attachment.url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          await fs.writeFile(tempPath, Buffer.from(buffer));
          filePath = tempPath;
          console.log('✅ Attachment downloaded successfully:', tempPath);
        } else {
          console.log('❌ Failed to download attachment, status:', response.status);
        }
      } catch (error: any) {
        console.log('❌ Immediate attachment download failed:', error.message);
      }

      if (!filePath) {
        await interaction.followUp({
          content: '❌ Falha no download da imagem. Tente novamente.',
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
          content: '❌ Nenhuma screenshot recebida. Submissão cancelada.',
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
      const isBasicPlant = config.basicPlants.includes(data.itemType);
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

    // Post to worker channel
    await postReceiptToWorkerChannel(interaction, receipt);

    // Success response - all services now require approval
    let successMessage;
    
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

async function postReceiptToWorkerChannel(interaction: any, receipt: any): Promise<void> {
  try {
    const guild = interaction.guild;
    if (!guild) return;

    const categoryId = '1365579138974355476';
    // Convert player name to channel format: "Jizar Stoffeliz" -> "jizar-stoffeliz"
    const playerName = receipt.playerName.toLowerCase();
    const channelFormat = playerName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const variations = [
      channelFormat, // jizar-stoffeliz (exact channel format)
      playerName.split(' ')[0], // jizar (first name only)
      playerName.replace(/\s+/g, ''), // jizarstoffeliz (no spaces)
    ];
    
    console.log(`Looking for channels matching player: ${receipt.playerName}`, variations);
    
    const workerChannel = guild.channels.cache.find((channel: any) => {
      if (channel.parentId !== categoryId) return false;
      
      // Check if any variation matches the channel name
      return variations.some(variation => 
        channel.name.toLowerCase().includes(variation)
      );
    });

    if (workerChannel && workerChannel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle(`📋 Service Receipt #${receipt.receiptId}`)
        .setColor(receipt.serviceType === 'animal' 
          ? (receipt.status === 'OPTIMAL' ? 0x00FF00 : receipt.status === 'SUBOPTIMAL' ? 0xFFFF00 : 0xFF0000)
          : 0x00FF00)
        .setTimestamp(new Date(receipt.timestamp))
        .setFooter({ text: 'Farm Service System' });

      if (receipt.serviceType === 'animal') {
        embed.addFields(
          { name: 'Service', value: 'Animal Delivery', inline: true },
          { name: 'Animals', value: `${receipt.quantity} ${receipt.animalType}`, inline: true },
          { name: 'Status', value: receipt.status, inline: true },
          { name: 'Farm Income', value: `$${receipt.farmIncome?.toFixed(2)}`, inline: true },
          { name: 'Your Payment', value: `$${receipt.playerPayment.toFixed(2)}`, inline: true }
        );

        if (receipt.penalty && receipt.penalty > 0) {
          embed.addFields({
            name: '⚠️ Penalty',
            value: `-$${receipt.penalty.toFixed(2)} (animals under age 50)`,
            inline: false
          });
        }

        if (receipt.playerDebt && receipt.playerDebt > 0) {
          embed.addFields({
            name: '❌ Debt',
            value: `$${receipt.playerDebt.toFixed(2)} owed to farm`,
            inline: false
          });
        }
      } else {
        // Plant service
        embed.addFields(
          { name: 'Service', value: 'Plant Deposit', inline: true },
          { name: 'Plant Type', value: receipt.plantName, inline: true },
          { name: 'Quantity', value: receipt.quantity.toString(), inline: true },
          { name: 'Your Payment', value: `$${receipt.playerPayment.toFixed(2)}`, inline: true },
          { name: 'Status', value: '⚠️ **PENDING APPROVAL**', inline: true }
        );
        
        embed.addFields({
          name: '📸 Manual Review Required',
          value: `User submitted: **${receipt.quantity}** ${receipt.plantName}\n\nPlease verify the screenshot below and approve/reject accordingly.`,
          inline: false
        });
      }

      // Prepare message components
      const messagePayload: any = { embeds: [embed] };
      
      // Add Accept/Reject buttons for all submissions (no more OCR verification)
      const acceptButton = new ButtonBuilder()
        .setCustomId(`receipt_accept_${receipt.receiptId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');
        
      const rejectButton = new ButtonBuilder()
        .setCustomId(`receipt_reject_${receipt.receiptId}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

      const buttonRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(acceptButton, rejectButton);
        
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

    // Load receipt data
    const receiptData = await loadReceiptData(receiptId);
    if (!receiptData) {
      await interaction.reply({
        content: '❌ Receipt not found.',
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

    // Update the message
    await interaction.update({
      content: `✅ **APPROVED** by ${interaction.user.username}`,
      embeds: [],
      components: []
    });

    console.log(`✅ Receipt ${receiptId} approved by ${interaction.user.username}`);

  } catch (error) {
    console.error('Error handling receipt accept:', error);
    await interaction.reply({
      content: '❌ Error processing approval.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// Handle receipt rejection
export async function handleReceiptReject(interaction: ButtonInteraction): Promise<void> {
  try {
    const receiptId = interaction.customId.split('_')[2];
    console.log('🔴 Rejecting receipt:', receiptId);

    // Load receipt data
    const receiptData = await loadReceiptData(receiptId);
    if (!receiptData) {
      await interaction.reply({
        content: '❌ Receipt not found.',
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
      content: `❌ **REJECTED** by ${interaction.user.username}`,
      embeds: [],
      components: []
    });

    console.log(`❌ Receipt ${receiptId} rejected by ${interaction.user.username}`);

  } catch (error) {
    console.error('Error handling receipt reject:', error);
    await interaction.reply({
      content: '❌ Error processing rejection.',
      flags: MessageFlags.Ephemeral
    });
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