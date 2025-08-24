import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { promises as fs } from 'fs';
import path from 'path';

export const data = new SlashCommandBuilder()
  .setName('pay')
  .setDescription('Pay all approved unpaid receipts for a player')
  .addStringOption(option =>
    option.setName('player')
      .setDescription('Player name to pay')
      .setRequired(true)
      .setAutocomplete(true));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const playerName = interaction.options.getString('player', true);
    console.log(`💰 Processing payment for player: ${playerName}`);

    // Load all approved unpaid receipts for the player
    const receipts = await loadApprovedUnpaidReceipts(playerName);
    
    if (receipts.length === 0) {
      await interaction.reply({
        content: `💰 No approved unpaid receipts found for ${playerName}.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Calculate total payment
    const totalPayment = receipts.reduce((sum, receipt) => sum + receipt.playerPayment, 0);

    // Mark all receipts as paid
    for (const receipt of receipts) {
      receipt.paid = true;
      receipt.paidAt = new Date().toISOString();
      receipt.paidBy = interaction.user.username;
      await saveReceiptData(receipt);
    }

    // Create payment summary embed
    const embed = new EmbedBuilder()
      .setTitle('💰 Payment Processed')
      .setColor(0x00FF00)
      .setDescription(`Payment completed for **${playerName}**`)
      .addFields(
        { name: 'Receipts Paid', value: receipts.length.toString(), inline: true },
        { name: 'Total Amount', value: `$${totalPayment.toFixed(2)}`, inline: true },
        { name: 'Paid By', value: interaction.user.username, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Farm Payment System' });

    // Add receipt details
    const receiptList = receipts.map(receipt => {
      const type = receipt.serviceType === 'animal' ? '🐄' : '🌾';
      const item = receipt.animalType || receipt.plantName;
      return `${type} #${receipt.receiptId}: ${receipt.quantity}x ${item} - $${receipt.playerPayment.toFixed(2)}`;
    }).join('\n');

    if (receiptList.length < 1000) {
      embed.addFields({ name: 'Receipt Details', value: receiptList, inline: false });
    } else {
      embed.addFields({ name: 'Receipt Details', value: `${receipts.length} receipts processed (too many to display)`, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
    console.log(`✅ Payment of $${totalPayment.toFixed(2)} processed for ${playerName} - ${receipts.length} receipts`);

  } catch (error) {
    console.error('Error processing payment:', error);
    await interaction.reply({
      content: '❌ Error processing payment. Please try again.',
      flags: MessageFlags.Ephemeral
    });
  }
}

// Autocomplete for player names
export async function autocomplete(interaction: any) {
  try {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    // Get all player directories
    const playersDir = path.join(process.cwd(), 'data', 'players');
    const playerDirs = await fs.readdir(playersDir);
    
    // Filter players with approved unpaid receipts
    const playersWithReceipts = [];
    
    for (const playerName of playerDirs) {
      if (playerName.toLowerCase().includes(focusedValue)) {
        const receipts = await loadApprovedUnpaidReceipts(playerName);
        if (receipts.length > 0) {
          const totalOwed = receipts.reduce((sum, receipt) => sum + receipt.playerPayment, 0);
          playersWithReceipts.push({
            name: `${playerName} ($${totalOwed.toFixed(2)} - ${receipts.length} receipts)`,
            value: playerName
          });
        }
      }
    }
    
    // Limit to 25 choices (Discord limit)
    const choices = playersWithReceipts.slice(0, 25);
    await interaction.respond(choices);
    
  } catch (error) {
    console.error('Error in pay autocomplete:', error);
    await interaction.respond([]);
  }
}

// Helper function to load approved unpaid receipts for a player
async function loadApprovedUnpaidReceipts(playerName: string) {
  try {
    const receiptsDir = path.join(process.cwd(), 'data', 'players', playerName, 'receipts');
    
    try {
      const receiptFiles = await fs.readdir(receiptsDir);
      const receipts = [];
      
      for (const file of receiptFiles) {
        if (file.endsWith('.json')) {
          const receiptPath = path.join(receiptsDir, file);
          const receiptData = JSON.parse(await fs.readFile(receiptPath, 'utf-8'));
          
          // Check if approved and not paid
          if (receiptData.approved === true && !receiptData.paid) {
            receipts.push(receiptData);
          }
        }
      }
      
      return receipts;
    } catch {
      return []; // Player directory or receipts don't exist
    }
    
  } catch (error) {
    console.error('Error loading approved unpaid receipts:', error);
    return [];
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