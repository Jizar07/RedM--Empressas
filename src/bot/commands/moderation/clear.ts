import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';

const clear = {
    name: 'clear',
    cooldown: 5, // 5 seconds cooldown
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Delete messages from the channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('contains')
                .setDescription('Only delete messages containing this text')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('exclude_pinned')
                .setDescription('Exclude pinned messages from deletion (default: true)')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount', true);
        const targetUser = interaction.options.getUser('user');
        const filterText = interaction.options.getString('contains');
        const excludePinned = interaction.options.getBoolean('exclude_pinned') ?? true; // Default to true
        const channel = interaction.channel as TextChannel;

        if (!channel) {
            await interaction.editReply('Could not access this channel.');
            return;
        }

        try {
            let messages = await channel.messages.fetch({ limit: 100 });
            
            if (targetUser) {
                messages = messages.filter(msg => msg.author.id === targetUser.id);
            }
            
            if (filterText) {
                messages = messages.filter(msg => 
                    msg.content.toLowerCase().includes(filterText.toLowerCase())
                );
            }

            if (excludePinned) {
                messages = messages.filter(msg => !msg.pinned);
            }

            const messagesToDelete = Array.from(messages.values()).slice(0, amount);
            const deleted = await channel.bulkDelete(messagesToDelete, true);

            let response = `Successfully deleted ${deleted.size} message(s)`;
            if (targetUser) response += ` from ${targetUser.tag}`;
            if (filterText) response += ` containing "${filterText}"`;
            if (excludePinned) response += ` (pinned messages excluded)`;

            await interaction.editReply(response);
        } catch (error) {
            console.error('Error clearing messages:', error);
            await interaction.editReply('Failed to clear messages. Make sure the messages are not older than 14 days.');
        }
    },
};

export default clear;