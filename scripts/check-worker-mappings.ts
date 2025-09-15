import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const GUILD_ID = '1274479410107646004'; // Your Discord server ID
const WORKER_MAPPINGS_FILE = path.join(__dirname, '../data/worker-channels/worker-mappings.json');

interface WorkerMapping {
  workerId: string;
  workerName: string;
  channelId: string;
  createdAt: string;
  lastActive?: string;
}

async function checkWorkerMappings() {
  console.log('🔍 Starting Worker Channel Mapping Check...\n');

  // Load existing mappings
  const existingMappings: Record<string, WorkerMapping> = JSON.parse(
    fs.readFileSync(WORKER_MAPPINGS_FILE, 'utf8')
  );

  const mappedChannelIds = new Set(Object.values(existingMappings).map(m => m.channelId));
  console.log(`📊 Found ${Object.keys(existingMappings).length} existing mappings\n`);

  // Create Discord client
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
  });

  client.once('ready', async () => {
    console.log(`✅ Connected as ${client.user?.tag}\n`);

    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) {
      console.error('❌ Guild not found!');
      process.exit(1);
    }

    // Fetch all channels
    const channels = await guild.channels.fetch();

    // Filter for worker channels (starting with 🌾)
    const workerChannels = channels.filter(channel =>
      channel?.type === 0 && // Text channel
      channel.name.startsWith('🌾')
    ) as Map<string, TextChannel>;

    console.log(`🌾 Found ${workerChannels.size} worker channels in Discord\n`);

    // Check which channels are missing mappings
    const missingChannels: TextChannel[] = [];
    const mappedChannels: TextChannel[] = [];

    workerChannels.forEach(channel => {
      if (mappedChannelIds.has(channel.id)) {
        mappedChannels.push(channel);
      } else {
        missingChannels.push(channel);
      }
    });

    console.log('✅ Already Mapped Channels:');
    mappedChannels.forEach(channel => {
      const mapping = Object.values(existingMappings).find(m => m.channelId === channel.id);
      console.log(`   - ${channel.name} (${channel.id}) → ${mapping?.workerName}`);
    });

    console.log(`\n❌ Missing Mappings (${missingChannels.length} channels):`);

    if (missingChannels.length === 0) {
      console.log('   None! All channels are mapped.\n');
      client.destroy();
      return;
    }

    // Try to identify users for missing channels
    const newMappings: Record<string, WorkerMapping> = { ...existingMappings };

    for (const channel of missingChannels) {
      console.log(`\n   📍 ${channel.name} (${channel.id})`);

      // Extract worker name from channel name (format: 🌾・worker-name)
      const workerNameFromChannel = channel.name
        .replace('🌾・', '')
        .replace('🌾', '')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      console.log(`      Extracted name: ${workerNameFromChannel}`);

      // Try to find user from channel permissions
      let userId: string | null = null;
      let userName: string | null = null;

      // Check permission overwrites for users with VIEW_CHANNEL permission
      const permissionOverwrites = channel.permissionOverwrites.cache;

      for (const [id, overwrite] of permissionOverwrites) {
        // Skip if it's a role (type 0) - we want users (type 1)
        if (overwrite.type === 1 && overwrite.allow.has('ViewChannel')) {
          try {
            const member = await guild.members.fetch(id);
            if (member) {
              userId = id;
              userName = member.user.username;
              console.log(`      Found user: ${userName} (${userId})`);
              break;
            }
          } catch (err) {
            // User might have left the server
            console.log(`      User ${id} not found in server`);
          }
        }
      }

      if (userId && userName) {
        // Add the mapping
        newMappings[userId] = {
          workerId: userId,
          workerName: workerNameFromChannel,
          channelId: channel.id,
          createdAt: new Date().toISOString()
        };
        console.log(`      ✅ Added mapping: ${workerNameFromChannel} → ${channel.id}`);
      } else {
        console.log(`      ⚠️ Could not find user for this channel`);
      }
    }

    // Save updated mappings
    const addedCount = Object.keys(newMappings).length - Object.keys(existingMappings).length;

    if (addedCount > 0) {
      fs.writeFileSync(WORKER_MAPPINGS_FILE, JSON.stringify(newMappings, null, 2));
      console.log(`\n✅ Added ${addedCount} new mappings to worker-mappings.json`);
    } else {
      console.log('\n⚠️ No new mappings could be added (users not found)');
    }

    console.log('\n📊 Final Summary:');
    console.log(`   Total Discord channels: ${workerChannels.size}`);
    console.log(`   Previously mapped: ${mappedChannels.length}`);
    console.log(`   Newly mapped: ${addedCount}`);
    console.log(`   Still unmapped: ${missingChannels.length - addedCount}`);

    client.destroy();
  });

  // Login to Discord
  client.login(process.env.DISCORD_TOKEN);
}

// Run the check
checkWorkerMappings().catch(console.error);