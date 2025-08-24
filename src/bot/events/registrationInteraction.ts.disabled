import { 
  Events, 
  Interaction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  EmbedBuilder,
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction
} from 'discord.js';
import axios from 'axios';
import RegistrationService from '../../services/RegistrationService';
import BotStatusService from '../../services/BotStatusService';
import config from '../../config/config';

// Store temporary registration data
const registrationData = new Map<string, any>();

// Export for potential use by other modules
export { registrationData };

// Template substitution helper function
function substituteTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
  }
  return result;
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Handle registration button click
    if (interaction.isButton() && interaction.customId === 'register_start') {
      await handleRegistrationStart(interaction);
    }
    
    // Handle info modal submission (step 1)
    if (interaction.isModalSubmit() && interaction.customId.startsWith('register_info_')) {
      await handleInfoSubmit(interaction);
    }
    
    // Handle function selection (step 3)
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('register_function_')) {
      await handleFunctionSelection(interaction);
    }
    
    // Handle inviter selection (step 4) - UserSelectMenu with built-in autocomplete
    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('register_inviter_')) {
      await handleInviterSelection(interaction);
    }
  },
};

async function handleRegistrationStart(interaction: ButtonInteraction): Promise<any> {
  try {
    // Get configuration for messages
    const config = await RegistrationService.getFormConfig();
    
    // Check if user is already registered
    const isRegistered = await RegistrationService.isUserRegistered(interaction.user.id);
    
    if (isRegistered) {
      return await interaction.reply({
        content: config?.messages?.alreadyRegistered || '❌ Você já está registrado!',
        ephemeral: true
      });
    }

    // Show combined name and pombo modal using configurable settings
    const infoModal = new ModalBuilder()
      .setCustomId(`register_info_${interaction.user.id}`)
      .setTitle(config?.steps?.step1?.modalTitle || 'Familia BlackGolden - Passo 1/3');

    const nameInput = new TextInputBuilder()
      .setCustomId('ingame_name')
      .setLabel(config?.steps?.step1?.nameLabel || 'Nome completo no Condado')
      .setPlaceholder(config?.steps?.step1?.namePlaceholder || 'Digite seu nome completo no condado')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50);

    const pomboInput = new TextInputBuilder()
      .setCustomId('pombo')
      .setLabel(config?.steps?.step1?.pomboLabel || 'Pombo')
      .setPlaceholder(config?.steps?.step1?.pomboPlaceholder || 'Digite seu pombo')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(20);

    infoModal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(pomboInput)
    );

    await interaction.showModal(infoModal);
  } catch (error) {
    console.error('Error starting registration:', error);
    const config = await RegistrationService.getFormConfig();
    await interaction.reply({
      content: config?.messages?.errorGeneric || '❌ An error occurred. Please try again later.',
      ephemeral: true
    });
  }
}

// Step 1: Handle info submission (name and pombo)
async function handleInfoSubmit(interaction: ModalSubmitInteraction): Promise<any> {
  try {
    const config = await RegistrationService.getFormConfig();
    const userId = interaction.customId.split('_')[2];
    
    if (userId !== interaction.user.id) {
      return await interaction.reply({
        content: config?.messages?.permissionDenied || '❌ This is not your registration form.',
        ephemeral: true
      });
    }

    // Get both name and pombo from the modal
    const ingameName = interaction.fields.getTextInputValue('ingame_name');
    const pombo = interaction.fields.getTextInputValue('pombo');
    
    // Store both values
    registrationData.set(userId, { ingameName, pombo });
    
    BotStatusService.creatingRegistration();

    // Step 2: Show function selection
    if (!config || config.functions.length === 0) {
      return await interaction.reply({
        content: '❌ Formulário de registro não está configurado corretamente.',
        ephemeral: true
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`register_function_${userId}`)
      .setPlaceholder(config.steps?.step2?.dropdownPlaceholder || 'Selecione sua função/trabalho na Familia')
      .addOptions(
        config.functions
          .filter(f => f.active)
          .sort((a, b) => a.order - b.order)
          .map(func => ({
            label: func.displayName,
            description: func.description || `Entrar como ${func.displayName}`,
            value: func.id
          }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setTitle(config.steps?.step2?.embedTitle || 'Passo 2/3 - Sua função na Familia')
      .setDescription(config.steps?.step2?.embedDescription || 'Selecione sua função/trabalho na Familia:')
      .addFields([
        { name: 'Nome no Condado', value: ingameName, inline: true },
        { name: 'Pombo', value: pombo, inline: true }
      ])
      .setColor((config.formDisplay?.embedColor || config.settings.embedColor || '#FF0000') as any)
      .setFooter({ text: config.formDisplay?.footerText || 'Familia BlackGolden Registro' });

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling info submit:', error);
    const config = await RegistrationService.getFormConfig();
    await interaction.reply({
      content: config?.messages?.errorGeneric || '❌ An error occurred. Please try again.',
      ephemeral: true
    });
  }
}

// Step 3: Handle function selection
async function handleFunctionSelection(interaction: StringSelectMenuInteraction): Promise<any> {
  await interaction.deferUpdate(); // Use deferUpdate to edit the same message
  
  try {
    const config = await RegistrationService.getFormConfig();
    const userId = interaction.customId.split('_')[2];
    
    if (userId !== interaction.user.id) {
      return await interaction.editReply({
        content: config?.messages?.permissionDenied || '❌ This is not your registration form.',
      });
    }

    const selectedFunction = interaction.values[0];
    
    // Get stored data and add function
    const tempData = registrationData.get(userId);
    if (!tempData) {
      return await interaction.editReply({
        content: config?.messages?.sessionExpired || '❌ Registration session expired. Please start again.',
      });
    }
    
    registrationData.set(userId, { ...tempData, functionId: selectedFunction });

    // Step 3: Show inviter selection with UserSelectMenu (built-in autocomplete)
    const userSelectMenu = new UserSelectMenuBuilder()
      .setCustomId(`register_inviter_${userId}`)
      .setPlaceholder(config?.steps?.step3?.dropdownPlaceholder || 'Selecione quem te convidou para a Familia')
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder<UserSelectMenuBuilder>()
      .addComponents(userSelectMenu);

    const selectedFunctionData = config?.functions.find(f => f.id === selectedFunction);

    const embed = new EmbedBuilder()
      .setTitle(config?.steps?.step3?.embedTitle || 'Passo 3/3 - Quem te convidou?')
      .setDescription(config?.steps?.step3?.embedDescription || 'Selecione quem te convidou para a Familia BlackGolden:\n\n✨ **Digite para buscar** - Você pode digitar o nome da pessoa para encontrá-la rapidamente!')
      .addFields([
        { name: 'Nome no Condado', value: tempData.ingameName, inline: true },
        { name: 'Pombo', value: tempData.pombo, inline: true },
        { name: 'Função', value: selectedFunctionData?.displayName || 'Desconhecido', inline: true }
      ])
      .setColor((config?.formDisplay?.embedColor || config?.settings.embedColor || '#FF0000') as any)
      .setFooter({ text: config?.formDisplay?.footerText || 'Familia BlackGolden Registro' });

    // Replace previous message with step 3 (inviter selection)
    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });

  } catch (error) {
    console.error('Error handling function selection:', error);
    const config = await RegistrationService.getFormConfig();
    await interaction.editReply({
      content: config?.messages?.errorGeneric || '❌ An error occurred. Please try again.',
    });
  }
}

// Step 3: Handle inviter selection  
async function handleInviterSelection(interaction: UserSelectMenuInteraction): Promise<any> {
  await interaction.deferUpdate(); // Use deferUpdate to edit the same message
  
  try {
    const formConfig = await RegistrationService.getFormConfig();
    const userId = interaction.customId.split('_')[2];
    
    if (userId !== interaction.user.id) {
      return await interaction.editReply({
        content: formConfig?.messages?.permissionDenied || '❌ This is not your registration form.',
      });
    }

    const inviterUser = interaction.users.first();
    const inviterMember = interaction.members?.first();
    
    if (!inviterUser) {
      return await interaction.editReply({
        content: formConfig?.messages?.errorGeneric || '❌ Selected member not found.',
      });
    }
    
    // Get display name (try member first, fallback to user)
    const inviterDisplayName = (inviterMember && 'displayName' in inviterMember) 
      ? inviterMember.displayName 
      : inviterUser.displayName;

    // Get stored data 
    const tempData = registrationData.get(userId);
    if (!tempData) {
      return await interaction.editReply({
        content: formConfig?.messages?.sessionExpired || '❌ Registration session expired. Please start again.',
      });
    }

    // Submit registration via API
    const response = await axios.post(
      `http://localhost:${config.api.port}/api/registration/submit`,
      {
        userId: interaction.user.id,
        username: interaction.user.username,
        ingameName: tempData.ingameName,
        mailId: tempData.pombo,
        functionId: tempData.functionId,
        invitedBy: inviterDisplayName
      },
      {
        headers: {
          'X-Bot-Token': config.discord.token
        }
      }
    );

    if (response.data) {
      const selectedFunctionData = formConfig?.functions.find(f => f.id === tempData.functionId);

      // Clean up temp data after we're done using it
      registrationData.delete(userId);

      // Template variables for substitution
      const templateVars: Record<string, string> = {
        ingameName: tempData.ingameName,
        pombo: tempData.pombo,
        functionName: selectedFunctionData?.displayName || 'Desconhecido',
        inviterName: inviterDisplayName,
        serverIP: formConfig?.settings?.serverIP || '127.0.0.1',
        serverPort: formConfig?.settings?.serverPort || '30120'
      };

      // Set user nickname using configurable format
      if (formConfig?.postRegistration?.nicknameFormat) {
        try {
          const guild = interaction.guild;
          if (guild) {
            const member = guild.members.cache.get(interaction.user.id);
            if (member) {
              const newNickname = substituteTemplateVariables(formConfig.postRegistration.nicknameFormat, templateVars);
              await member.setNickname(newNickname);
              console.log(`Set nickname for ${interaction.user.username} to: ${newNickname}`);
            }
          }
        } catch (nicknameError) {
          console.error('Error setting nickname:', nicknameError);
        }
      }

      // Assign Discord role if enabled and function exists
      if (formConfig?.postRegistration?.assignRoles && selectedFunctionData) {
        try {
          BotStatusService.assigningRole();
          const roleAssigned = await RegistrationService.assignRole(
            interaction.user.id, 
            selectedFunctionData.discordRoleId,
            interaction.guild?.id
          );
          if (roleAssigned) {
            console.log(`Assigned role ${selectedFunctionData.discordRoleName} to ${interaction.user.username}`);
          } else {
            console.error(`Failed to assign role ${selectedFunctionData.discordRoleName} to ${interaction.user.username}`);
          }
        } catch (roleError) {
          console.error('Error assigning role:', roleError);
        }
      }

      // Create personal channel if enabled and function has category configured
      if (formConfig?.postRegistration?.createChannel && selectedFunctionData?.categoryId) {
        try {
          const channelNameTemplate = formConfig.postRegistration.channelNameFormat || '{ingameName}';
          const channelName = substituteTemplateVariables(channelNameTemplate, templateVars);
          
          BotStatusService.creatingChannel();
          const channelResult = await RegistrationService.createChannelForUser(
            interaction.user.id,
            channelName,
            selectedFunctionData.categoryId,
            selectedFunctionData,
            interaction.guild?.id
          );
          
          if (channelResult.success) {
            console.log(`Created channel for ${interaction.user.username}: ${channelName} in category ${selectedFunctionData.categoryName}`);
            
            // Add channel ID to template variables for potential use in DM
            templateVars.channelId = channelResult.channelId || '';
          } else {
            console.error(`Failed to create channel for ${interaction.user.username}: ${channelResult.error}`);
          }
        } catch (channelError) {
          console.error('Error creating channel:', channelError);
        }
      }

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setTitle(formConfig?.messages?.registrationSuccess || '✅ Registro Realizado com Sucesso!')
        .setDescription(formConfig?.settings.welcomeMessage || 'Bem-vindo à Familia BlackGolden!')
        .addFields([
          { name: 'Nome completo no Condado', value: tempData.ingameName, inline: true },
          { name: 'Função', value: selectedFunctionData?.displayName || 'Desconhecido', inline: true },
          { name: 'Pombo', value: tempData.pombo, inline: true },
          { name: 'Convidado por', value: inviterDisplayName, inline: true }
        ])
        .setColor((formConfig?.formDisplay?.embedColor || formConfig?.settings.embedColor || '#00FF00') as any)
        .setFooter({ text: formConfig?.formDisplay?.footerText || 'Familia BlackGolden Sistema de Registro' })
        .setTimestamp();

      // Replace previous message with final welcome message
      await interaction.editReply({
        embeds: [successEmbed],
        components: [] // Remove all buttons/components from final message
      });

      // Keep the welcome message visible permanently

      // Send welcome DM if configured and enabled
      if (formConfig?.postRegistration?.sendDM && formConfig.postRegistration.dmMessage) {
        try {
          const dmMessage = substituteTemplateVariables(formConfig.postRegistration.dmMessage, templateVars);
          
          const dmEmbed = new EmbedBuilder()
            .setTitle(formConfig.postRegistration.dmTitle || 'Bem-vindo à Familia BlackGolden!')
            .setDescription(dmMessage)
            .setColor((formConfig.formDisplay?.embedColor || formConfig.settings.embedColor || '#FF0000') as any)
            .setFooter({ text: formConfig.formDisplay?.footerText || 'Familia BlackGolden' })
            .setTimestamp();

          await interaction.user.send({ embeds: [dmEmbed] });
        } catch (dmError) {
          console.error('Could not send DM to user:', dmError);
        }
      }
    }
  } catch (error: any) {
    console.error('Error handling inviter selection:', error);
    
    // Clean up temp data
    registrationData.delete(interaction.user.id);
    
    const errorConfig = await RegistrationService.getFormConfig();
    let errorMessage = errorConfig?.messages?.errorGeneric || '❌ An error occurred during registration.';
    
    if (error.response?.data?.error) {
      errorMessage = `❌ ${error.response.data.error}`;
    }
    
    await interaction.editReply({
      content: errorMessage,
    });
  }
}