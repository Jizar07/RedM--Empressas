import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config/config';

const CATEGORY_ID = '1415217611939119125';
const REGISTRATIONS_PATH = path.join(__dirname, '../../data/registrations.json');
const WORKER_MAPPINGS_PATH = path.join(__dirname, '../../data/worker-channels/worker-mappings.json');
const ACTIVE_FUNCTION_ID = 'func_1757681433033'; // Current Funcionario function

async function cleanupRegistrations() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
        ]
    });

    try {
        await client.login(config.discord.token);
        console.log('Bot logged in successfully');

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
            console.error('Guild not found');
            return;
        }

        // Get the category
        const category = guild.channels.cache.get(CATEGORY_ID);
        if (!category || category.type !== ChannelType.GuildCategory) {
            console.error('Category not found or not a category');
            return;
        }

        // Get all text channels in the category
        const channelsInCategory = guild.channels.cache.filter(
            channel => channel.parentId === CATEGORY_ID && channel.type === ChannelType.GuildText
        );

        console.log(`Found ${channelsInCategory.size} channels in category`);

        // Create a map of channel names to channel IDs
        const channelMap = new Map<string, { id: string, originalName: string }>();

        channelsInCategory.forEach(channel => {
            // Remove the 🌾・ prefix and normalize
            const normalizedName = channel.name
                .replace('🌾・', '')
                .replace('🌾', '')
                .replace('・', '')
                .trim()
                .toLowerCase()
                .replace(/-/g, ' '); // Convert hyphens back to spaces for comparison

            channelMap.set(normalizedName, {
                id: channel.id,
                originalName: channel.name.replace('🌾・', '').replace('🌾', '').replace('・', '').trim()
            });
            console.log(`Channel: ${channel.name} -> Normalized: ${normalizedName}`);
        });

        // Read all registrations
        const allRegistrations = JSON.parse(fs.readFileSync(REGISTRATIONS_PATH, 'utf-8'));
        console.log(`Total registrations before cleanup: ${allRegistrations.length}`);

        // Group registrations by userId and keep only the latest one with ACTIVE_FUNCTION_ID
        const latestRegistrationsByUser = new Map();

        allRegistrations.forEach((reg: any) => {
            // Only consider registrations with the active function ID
            if (reg.functionId === ACTIVE_FUNCTION_ID) {
                const existing = latestRegistrationsByUser.get(reg.userId);
                if (!existing || new Date(reg.registeredAt) > new Date(existing.registeredAt)) {
                    latestRegistrationsByUser.set(reg.userId, reg);
                }
            }
        });

        console.log(`\nUsers with active function registrations: ${latestRegistrationsByUser.size}`);

        // Filter to keep only registrations that have matching channels
        const validRegistrations: any[] = [];
        const userChannelMap = new Map<string, string>(); // userId -> channelId

        latestRegistrationsByUser.forEach((reg, userId) => {
            const normalizedName = reg.ingameName.toLowerCase().trim();
            const channelInfo = channelMap.get(normalizedName);

            if (channelInfo) {
                validRegistrations.push(reg);
                userChannelMap.set(userId, channelInfo.id);
                console.log(`✓ Keeping: ${reg.ingameName} (${userId}) -> Channel: ${channelInfo.originalName}`);
            } else {
                console.log(`✗ Removing: ${reg.ingameName} (${userId}) - No matching channel`);
            }
        });

        console.log(`\nRegistrations after cleanup: ${validRegistrations.length}`);
        console.log(`Removed ${allRegistrations.length - validRegistrations.length} total registrations`);
        console.log(`Active workers with channels: ${validRegistrations.length}`);

        // Write back the cleaned registrations
        fs.writeFileSync(
            REGISTRATIONS_PATH,
            JSON.stringify(validRegistrations, null, 2),
            'utf-8'
        );

        // Update worker mappings to ensure all valid registrations have mappings
        const currentMappings = JSON.parse(fs.readFileSync(WORKER_MAPPINGS_PATH, 'utf-8'));
        let addedMappings = 0;
        let updatedMappings = 0;

        validRegistrations.forEach((reg: any) => {
            const channelId = userChannelMap.get(reg.userId);
            if (channelId) {
                if (!currentMappings[reg.userId]) {
                    // Add new mapping
                    currentMappings[reg.userId] = {
                        workerId: reg.userId,
                        workerName: reg.ingameName,
                        channelId: channelId,
                        createdAt: new Date().toISOString()
                    };
                    addedMappings++;
                    console.log(`Added mapping: ${reg.ingameName} -> ${channelId}`);
                } else if (currentMappings[reg.userId].channelId !== channelId) {
                    // Update existing mapping with correct channel
                    currentMappings[reg.userId].channelId = channelId;
                    currentMappings[reg.userId].workerName = reg.ingameName;
                    updatedMappings++;
                    console.log(`Updated mapping: ${reg.ingameName} -> ${channelId}`);
                }
            }
        });

        // Remove mappings for users that are no longer registered
        const validUserIds = new Set(validRegistrations.map(r => r.userId));
        const mappingsToRemove: string[] = [];

        Object.keys(currentMappings).forEach(userId => {
            if (!validUserIds.has(userId)) {
                mappingsToRemove.push(userId);
                console.log(`Removing mapping for inactive user: ${currentMappings[userId].workerName} (${userId})`);
            }
        });

        mappingsToRemove.forEach(userId => {
            delete currentMappings[userId];
        });

        console.log(`\nWorker mappings summary:`);
        console.log(`- Added: ${addedMappings}`);
        console.log(`- Updated: ${updatedMappings}`);
        console.log(`- Removed: ${mappingsToRemove.length}`);
        console.log(`- Total active mappings: ${Object.keys(currentMappings).length}`);

        // Write back the updated worker mappings
        fs.writeFileSync(
            WORKER_MAPPINGS_PATH,
            JSON.stringify(currentMappings, null, 2),
            'utf-8'
        );

        console.log('\nCleanup completed successfully!');
        console.log(`Active workers: ${validRegistrations.length}`);
        console.log(`Worker mappings: ${Object.keys(currentMappings).length}`);

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        client.destroy();
        process.exit(0);
    }
}

// Run the cleanup
cleanupRegistrations();