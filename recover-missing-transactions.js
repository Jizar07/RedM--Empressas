/**
 * Safe recovery script for missing Discord transactions
 * This will ONLY process messages from the last 5 days that are missing
 * WITHOUT triggering a full sync or causing duplicates
 */

const axios = require('axios');

// Configuration
const CHANNEL_ID = '1404583987778949130';
const BOT_API_URL = 'http://localhost:3050';
const SYSTEM_API_URL = 'http://localhost:8086';
const LAST_PROCESSED_DATE = new Date('2025-08-15T09:20:41.000Z');

console.log('🔍 Starting safe recovery of missing transactions...');
console.log(`📅 Looking for messages after: ${LAST_PROCESSED_DATE.toISOString()}`);

async function recoverMissingTransactions() {
    try {
        // Step 1: Fetch recent messages from Discord via bot API
        console.log('\n📥 Fetching recent messages from Discord channel...');
        
        const response = await axios.post(`${BOT_API_URL}/api/channel-parser/parse`, {
            channelId: CHANNEL_ID,
            limit: 100, // Get last 100 messages
            format: 'json'
        });

        if (!response.data || !response.data.messages) {
            console.error('❌ No messages received from bot API');
            return;
        }

        const allMessages = response.data.messages;
        console.log(`📊 Total messages fetched: ${allMessages.length}`);

        // Step 2: Filter messages that are newer than our last processed date
        const missingMessages = allMessages.filter(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate > LAST_PROCESSED_DATE;
        });

        console.log(`🔎 Missing messages found: ${missingMessages.length}`);

        if (missingMessages.length === 0) {
            console.log('✅ No missing messages to process!');
            return;
        }

        // Step 3: Process each missing message individually
        console.log('\n🔄 Processing missing messages one by one...');
        
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        // Sort messages by timestamp (oldest first)
        missingMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        for (const message of missingMessages) {
            try {
                // Check if message contains transaction data (skip chat messages)
                if (!message.content || 
                    (!message.content.includes('BAÚ ORGANIZAÇÃO') && 
                     !message.content.includes('CAIXA ORGANIZAÇÃO'))) {
                    console.log(`⏭️ Skipping non-transaction message from ${message.author.username}`);
                    skippedCount++;
                    continue;
                }

                console.log(`\n📨 Processing message from ${message.author.username} at ${message.timestamp}`);
                
                // Format message for system endpoint
                const webhookPayload = {
                    channelId: CHANNEL_ID,
                    messages: [{
                        id: message.id,
                        author: message.author.username,
                        content: message.content,
                        timestamp: message.timestamp,
                        raw_embeds: message.embeds || []
                    }]
                };

                // Send to system webhook endpoint
                const systemResponse = await axios.post(
                    `${SYSTEM_API_URL}/api/webhook/channel-logs`,
                    webhookPayload,
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 5000
                    }
                );

                if (systemResponse.data.success) {
                    console.log(`✅ Successfully processed: ${message.content.substring(0, 50)}...`);
                    successCount++;
                } else {
                    console.log(`⚠️ Failed to process: ${systemResponse.data.message}`);
                    errorCount++;
                }

                // Add small delay to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`❌ Error processing message: ${error.message}`);
                errorCount++;
            }
        }

        // Step 4: Summary
        console.log('\n📊 Recovery Summary:');
        console.log(`✅ Successfully processed: ${successCount} messages`);
        console.log(`⏭️ Skipped (non-transaction): ${skippedCount} messages`);
        console.log(`❌ Failed: ${errorCount} messages`);
        console.log(`📊 Total processed: ${successCount + errorCount + skippedCount}/${missingMessages.length}`);

    } catch (error) {
        console.error('❌ Fatal error during recovery:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the recovery
recoverMissingTransactions()
    .then(() => {
        console.log('\n✅ Recovery process completed!');
        console.log('⚠️ Please check the dashboard to verify the recovered transactions.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Recovery failed:', error);
        process.exit(1);
    });