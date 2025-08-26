import { Events, Interaction, Collection } from 'discord.js';
import { BotClient } from '../BotClient';
import { Constants } from '../../config/constants';
import { 
  handleFarmServiceStart,
  handleServiceTypeSelection,
  handleAnimalTypeSelection,
  handlePlantTypeSelection,
  handleQuantitySubmit,
  handleReceiptAccept,
  handleReceiptEdit,
  handleReceiptEditQuantity,
  handleReceiptReject,
  handleReceiptPayNow,
  handleFinalPayment
} from '../commands/farm/submit-service';


export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction, client: BotClient): Promise<void> {
    // Handle button interactions
    if (interaction.isButton()) {
      // Handle farm service buttons
      if (interaction.customId === 'farm_service_start') {
        try {
          await handleFarmServiceStart(interaction);
        } catch (error) {
          console.error('Error in handleFarmServiceStart:', error);
        }
        return;
      }
      if (interaction.customId.startsWith('receipt_accept_')) {
        await handleReceiptAccept(interaction);
        return;
      }
      if (interaction.customId.startsWith('receipt_edit_')) {
        await handleReceiptEdit(interaction);
        return;
      }
      if (interaction.customId.startsWith('receipt_reject_')) {
        await handleReceiptReject(interaction);
        return;
      }
      if (interaction.customId.startsWith('receipt_pay_now_')) {
        await handleReceiptPayNow(interaction);
        return;
      }
      if (interaction.customId.startsWith('final_payment_')) {
        await handleFinalPayment(interaction);
        return;
      }
    }

    // Handle farm service dropdown selections
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('farm_service_type_')) {
        await handleServiceTypeSelection(interaction);
        return;
      }
      if (interaction.customId.startsWith('farm_animal_type_')) {
        await handleAnimalTypeSelection(interaction);
        return;
      }
      if (interaction.customId.startsWith('farm_plant_type_')) {
        await handlePlantTypeSelection(interaction);
        return;
      }
    }

    // Handle farm service modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('farm_quantity_')) {
        await handleQuantitySubmit(interaction);
        return;
      }
      if (interaction.customId.startsWith('receipt_edit_quantity_')) {
        await handleReceiptEditQuantity(interaction);
        return;
      }
    }
    
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
      console.error(`❌ No command matching ${interaction.commandName} was found.`);
      return;
    }
    
    // Handle cooldowns
    if (!client.cooldowns.has(command.name)) {
      client.cooldowns.set(command.name, new Collection());
    }
    
    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name)!;
    const cooldownAmount = (command.cooldown || Constants.Bot.CooldownDefault) * 1000;
    
    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id)! + cooldownAmount;
      
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        await interaction.reply({
          content: `⏳ Please wait ${timeLeft.toFixed(1)} more seconds before using \`${command.name}\` again.`,
          ephemeral: true,
        });
        return;
      }
    }
    
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Error executing command ${command.name}:`, error);
      
      const errorMessage = '❌ There was an error while executing this command!';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};