import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import RegistrationService from '../services/RegistrationService';

export async function createDynamicRegistrationCommand() {
  try {
    const config = await RegistrationService.getFormConfig();
    
    if (!config) {
      console.warn('No registration config found, using default command settings');
      return new SlashCommandBuilder()
        .setName('register-setup')
        .setDescription('Deploy the registration form to a channel')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel to deploy the registration form to')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    }

    // Get permission flag from string
    let permissions = PermissionFlagsBits.Administrator;
    switch(config.command?.permissions) {
      case 'ManageGuild': permissions = PermissionFlagsBits.ManageGuild; break;
      case 'ManageRoles': permissions = PermissionFlagsBits.ManageRoles; break;
      case 'ModerateMembers': permissions = PermissionFlagsBits.ModerateMembers; break;
      default: permissions = PermissionFlagsBits.Administrator;
    }

    return new SlashCommandBuilder()
      .setName(config.command?.name || 'register-setup')
      .setDescription(config.command?.description || 'Deploy the registration form to a channel')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('The channel to deploy the registration form to')
          .setRequired(true)
      )
      .setDefaultMemberPermissions(permissions);

  } catch (error) {
    console.error('Error creating dynamic registration command:', error);
    // Fallback to default
    return new SlashCommandBuilder()
      .setName('register-setup')
      .setDescription('Deploy the registration form to a channel')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('The channel to deploy the registration form to')
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
  }
}