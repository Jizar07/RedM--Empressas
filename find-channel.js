const Discord = require('discord.js');
const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] });
require('dotenv').config();

client.once('ready', () => {
    console.log('Bot logged in, listing all guilds...');

    // List all guilds the bot is in
    client.guilds.cache.forEach(guild => {
        console.log(`\nGuild: ${guild.name} (ID: ${guild.id})`);

        // Search for Nelio channels in this guild
        const channels = guild.channels.cache.filter(ch =>
            ch.name.toLowerCase().includes('nelio') ||
            ch.name.toLowerCase().includes('tavares') ||
            ch.name.toLowerCase().includes('nélio')
        );

        if (channels.size > 0) {
            console.log('  Found Nelio channels:');
            channels.forEach(ch => {
                console.log(`    ${ch.name} (ID: ${ch.id})`);
            });
        }

        // Also list any worker channels
        const workerChannels = guild.channels.cache.filter(ch =>
            ch.name.startsWith('🌾')
        );

        if (workerChannels.size > 0) {
            console.log(`  Found ${workerChannels.size} worker channels (🌾):`);
            // Show first 5 as example
            workerChannels.first(5).forEach(ch => {
                console.log(`    ${ch.name} (ID: ${ch.id})`);
            });
            if (workerChannels.size > 5) {
                console.log(`    ... and ${workerChannels.size - 5} more`);
            }
        }
    });

    client.destroy();
});

client.login(process.env.DISCORD_TOKEN);