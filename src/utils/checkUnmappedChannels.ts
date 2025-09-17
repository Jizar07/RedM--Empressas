import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config/config';

const CATEGORY_ID = '1415217611939119125';
const WORKER_MAPPINGS_PATH = path.join(__dirname, '../../data/worker-channels/worker-mappings.json');
const REGISTRATIONS_PATH = path.join(__dirname, '../../data/registrations.json');

interface WorkerMapping {
    workerId: string;
    workerName: string;
    channelId: string;
    createdAt: string;
    lastActive?: string;
}

interface Registration {
    userId: string;
    ingameName: string;
    registeredAt: string;
    functionId?: string;
}

async function checkUnmappedChannels() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
        ]
    });

    try {
        await client.login(config.discord.token);
        console.log('🤖 Bot logged in successfully');

        // Wait for client to be ready
        await new Promise<void>((resolve) => {
            if (client.isReady()) {
                resolve();
            } else {
                client.once('ready', () => resolve());
            }
        });

        const guild = client.guilds.cache.get(config.discord.guildId);
        if (!guild) {
            console.error('❌ Guild not found');
            return;
        }

        // Get the category
        const category = guild.channels.cache.get(CATEGORY_ID);
        if (!category || category.type !== ChannelType.GuildCategory) {
            console.error('❌ Category not found or not a category');
            return;
        }

        // Get all text channels in the category with 🌾 prefix
        const channelsInCategory = guild.channels.cache.filter(
            channel => channel.parentId === CATEGORY_ID &&
            channel.type === ChannelType.GuildText &&
            (channel.name.includes('🌾') || channel.name.includes('・'))
        );

        console.log(`\n📁 Found ${channelsInCategory.size} worker channels in category ${CATEGORY_ID}`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Load current worker mappings
        const currentMappings: { [key: string]: WorkerMapping } = JSON.parse(
            fs.readFileSync(WORKER_MAPPINGS_PATH, 'utf-8')
        );

        // Get all mapped channel IDs
        const mappedChannelIds = new Set(
            Object.values(currentMappings).map(m => m.channelId)
        );

        console.log(`📊 Current Status:`);
        console.log(`  • Total Discord channels with 🌾: ${channelsInCategory.size}`);
        console.log(`  • Total mapped workers: ${Object.keys(currentMappings).length}`);
        console.log(`  • Total mapped channels: ${mappedChannelIds.size}\n`);

        // Find unmapped channels
        const unmappedChannels: Array<{ id: string; name: string; cleanName: string }> = [];
        const mappedChannelsList: Array<{ id: string; name: string; workerName: string }> = [];

        channelsInCategory.forEach(channel => {
            const cleanName = channel.name
                .replace('🌾・', '')
                .replace('🌾', '')
                .replace('・', '')
                .trim();

            if (!mappedChannelIds.has(channel.id)) {
                unmappedChannels.push({
                    id: channel.id,
                    name: channel.name,
                    cleanName: cleanName
                });
            } else {
                // Find which worker is mapped to this channel
                const mapping = Object.values(currentMappings).find(m => m.channelId === channel.id);
                if (mapping) {
                    mappedChannelsList.push({
                        id: channel.id,
                        name: channel.name,
                        workerName: mapping.workerName
                    });
                }
            }
        });

        // Check if the specific channel 1417227529009365015 exists
        const specificChannel = guild.channels.cache.get('1417227529009365015');
        let specificChannelInfo = '';
        if (specificChannel) {
            specificChannelInfo = `\n🔍 SPECIFIC CHANNEL CHECK (1417227529009365015):
  • Name: ${specificChannel.name}
  • Type: ${ChannelType[specificChannel.type]}
  • Parent: ${specificChannel.parentId === CATEGORY_ID ? 'In worker category ✅' : 'NOT in worker category ❌'}
  • Mapped: ${mappedChannelIds.has('1417227529009365015') ? 'YES ✅' : 'NO ❌'}`;
        } else {
            specificChannelInfo = '\n🔍 Channel 1417227529009365015 does not exist in this Discord server';
        }

        console.log(specificChannelInfo);

        if (unmappedChannels.length > 0) {
            console.log('\n❌ UNMAPPED CHANNELS (exist in Discord but not in worker-mappings.json):');
            console.log('═══════════════════════════════════════════════════════════════\n');

            // Load registrations to find potential matches
            const registrations: Registration[] = JSON.parse(
                fs.readFileSync(REGISTRATIONS_PATH, 'utf-8')
            );

            unmappedChannels.forEach((channel, index) => {
                console.log(`${index + 1}. Channel: "${channel.name}"`);
                console.log(`   ID: ${channel.id}`);
                console.log(`   Clean Name: ${channel.cleanName}`);

                // Try to find a potential user match
                const potentialMatch = registrations.find(reg =>
                    reg.ingameName.toLowerCase().trim() === channel.cleanName.toLowerCase().replace(/-/g, ' ')
                );

                if (potentialMatch) {
                    console.log(`   📌 Potential Match Found:`);
                    console.log(`      User: ${potentialMatch.ingameName}`);
                    console.log(`      UserID: ${potentialMatch.userId}`);
                    console.log(`      Registered: ${potentialMatch.registeredAt}`);
                } else {
                    console.log(`   ⚠️ No matching registration found`);
                }
                console.log('');
            });
        } else {
            console.log('\n✅ ALL CHANNELS ARE PROPERLY MAPPED!');
        }

        // Show currently mapped channels
        console.log('\n✅ MAPPED CHANNELS:');
        console.log('═══════════════════════════════════════════════════════════════\n');
        mappedChannelsList.forEach((channel, index) => {
            console.log(`${index + 1}. ${channel.name} → ${channel.workerName}`);
        });

        // Summary
        console.log('\n📊 SUMMARY:');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`✅ Mapped channels: ${mappedChannelsList.length}`);
        console.log(`❌ Unmapped channels: ${unmappedChannels.length}`);

        if (unmappedChannels.length > 0) {
            console.log('\n⚡ RECOMMENDATION:');
            console.log('Run the cleanup script or manually add these channels to worker-mappings.json');
        }

    } catch (error) {
        console.error('❌ Error during check:', error);
    } finally {
        client.destroy();
        process.exit(0);
    }
}

// Run the check
checkUnmappedChannels();