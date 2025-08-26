// Discord Channel Message Logger v4.0 - Enhanced Full Channel Scraper
console.log('📡 Discord Channel Logger v4.0 activated - Full Channel Scraper');

// Configuration
const WEBHOOK_URL = 'http://localhost:3050/api/webhook/channel-messages';
const TARGET_CHANNEL_ID = '1356704279204724746';
const BATCH_SIZE = 5;
const BATCH_INTERVAL = 2000;
const LOG_RETENTION_DAYS = 30;

// Full scraping configuration
const SCRAPE_DELAY = 1000; // Delay between scroll actions (ms)
const MAX_SCRAPE_RETRIES = 3; // Max retries for failed scrolls
const SCRAPE_BATCH_SIZE = 50; // Messages to process per batch during scraping
const AUTO_SCROLL_THRESHOLD = 100; // Messages before auto-scrolling

// State management
let messageQueue = [];
let processedMessageIds = new Set();
let scrapedMessageIds = new Set();
let isInitialized = false;
let isCurrentlyScraping = false;
let scrapeStats = {
    totalMessages: 0,
    newMessages: 0,
    duplicates: 0,
    failed: 0,
    startTime: null,
    endTime: null
};

// UI Elements for scraping control
let scrapeControlPanel = null;
let scrapeProgressBar = null;
let scrapeStatusText = null;

// Check if we're on the correct channel
function isTargetChannel() {
    const currentUrl = window.location.href;
    return currentUrl.includes(TARGET_CHANNEL_ID);
}

// Initialize persistent storage and load processed message IDs
async function initializeStorage() {
    if (isInitialized) return;
    
    try {
        const result = await chrome.storage.local.get(['processedMessages', 'scrapedMessages', 'lastCleanup']);
        
        if (result.processedMessages) {
            processedMessageIds = new Set(result.processedMessages);
            console.log(`📚 Loaded ${processedMessageIds.size} processed message IDs`);
        }
        
        if (result.scrapedMessages) {
            scrapedMessageIds = new Set(result.scrapedMessages);
            console.log(`🗂️ Loaded ${scrapedMessageIds.size} scraped message IDs`);
        }
        
        const lastCleanup = result.lastCleanup || 0;
        const now = Date.now();
        const cleanupInterval = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
        
        if (now - lastCleanup > cleanupInterval) {
            await cleanupOldMessages();
        }
        
        isInitialized = true;
        console.log('✅ Storage initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize storage:', error);
        isInitialized = true;
    }
}

// Clean up old processed message IDs
async function cleanupOldMessages() {
    try {
        const cutoffTime = Date.now() - (LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const cleanedProcessedIds = new Set();
        const cleanedScrapedIds = new Set();
        
        for (const messageId of processedMessageIds) {
            const timestampMatch = messageId.match(/timestamp-(\d+)/);
            if (timestampMatch) {
                const messageTime = parseInt(timestampMatch[1]);
                if (messageTime > cutoffTime) {
                    cleanedProcessedIds.add(messageId);
                }
            } else {
                cleanedProcessedIds.add(messageId);
            }
        }
        
        for (const messageId of scrapedMessageIds) {
            const timestampMatch = messageId.match(/timestamp-(\d+)/);
            if (timestampMatch) {
                const messageTime = parseInt(timestampMatch[1]);
                if (messageTime > cutoffTime) {
                    cleanedScrapedIds.add(messageId);
                }
            } else {
                cleanedScrapedIds.add(messageId);
            }
        }
        
        const removedProcessed = processedMessageIds.size - cleanedProcessedIds.size;
        const removedScraped = scrapedMessageIds.size - cleanedScrapedIds.size;
        
        processedMessageIds = cleanedProcessedIds;
        scrapedMessageIds = cleanedScrapedIds;
        
        await chrome.storage.local.set({
            processedMessages: Array.from(processedMessageIds),
            scrapedMessages: Array.from(scrapedMessageIds),
            lastCleanup: Date.now()
        });
        
        console.log(`🧹 Cleaned up ${removedProcessed} processed and ${removedScraped} scraped message IDs`);
    } catch (error) {
        console.error('❌ Failed to cleanup old messages:', error);
    }
}

// Save processed and scraped message IDs
async function saveMessageIds() {
    try {
        await chrome.storage.local.set({
            processedMessages: Array.from(processedMessageIds),
            scrapedMessages: Array.from(scrapedMessageIds)
        });
    } catch (error) {
        console.error('❌ Failed to save message IDs:', error);
    }
}

// Create scraping control panel UI
function createScrapeControlPanel() {
    if (scrapeControlPanel) return;
    
    scrapeControlPanel = document.createElement('div');
    scrapeControlPanel.innerHTML = `
        <div style="position: fixed; top: 10px; right: 10px; background: #2f3136; color: white; padding: 15px; border-radius: 8px; z-index: 9999; min-width: 250px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px;">
            <div style="font-weight: bold; margin-bottom: 10px; color: #7289da;">📡 Channel Scraper v4.0</div>
            <div id="scrapeStatus" style="margin-bottom: 10px;">Ready to scrape</div>
            <div style="background: #40444b; height: 4px; border-radius: 2px; margin: 5px 0; overflow: hidden;">
                <div id="scrapeProgress" style="background: #7289da; height: 100%; width: 0%; transition: width 0.3s;"></div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button id="startFullScrape" style="background: #7289da; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                    🚀 Full Scrape
                </button>
                <button id="stopScrape" style="background: #f04747; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                    ⏹️ Stop
                </button>
                <button id="exportData" style="background: #43b581; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 11px;">
                    💾 Export
                </button>
            </div>
            <div style="margin-top: 8px; font-size: 10px; color: #b9bbbe;">
                <div>Messages: <span id="messageCount">0</span> | New: <span id="newCount">0</span></div>
                <div>Queue: <span id="queueCount">0</span> | Scraped: <span id="scrapedCount">${scrapedMessageIds.size}</span></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(scrapeControlPanel);
    
    // Get UI elements
    scrapeProgressBar = document.getElementById('scrapeProgress');
    scrapeStatusText = document.getElementById('scrapeStatus');
    
    // Attach event listeners
    document.getElementById('startFullScrape').onclick = startFullChannelScrape;
    document.getElementById('stopScrape').onclick = stopScraping;
    document.getElementById('exportData').onclick = exportScrapedData;
    
    console.log('🎛️ Scrape control panel created');
}

// Update scrape UI
function updateScrapeUI() {
    if (!scrapeControlPanel) return;
    
    const messageCountEl = document.getElementById('messageCount');
    const newCountEl = document.getElementById('newCount');
    const queueCountEl = document.getElementById('queueCount');
    const scrapedCountEl = document.getElementById('scrapedCount');
    
    if (messageCountEl) messageCountEl.textContent = scrapeStats.totalMessages;
    if (newCountEl) newCountEl.textContent = scrapeStats.newMessages;
    if (queueCountEl) queueCountEl.textContent = messageQueue.length;
    if (scrapedCountEl) scrapedCountEl.textContent = scrapedMessageIds.size;
}

// Start full channel scraping
async function startFullChannelScrape() {
    if (isCurrentlyScraping) {
        console.log('🚫 Already scraping in progress');
        return;
    }
    
    if (!isTargetChannel()) {
        alert('❌ Please navigate to the target Discord channel first!');
        return;
    }
    
    isCurrentlyScraping = true;
    scrapeStats = {
        totalMessages: 0,
        newMessages: 0,
        duplicates: 0,
        failed: 0,
        startTime: new Date(),
        endTime: null
    };
    
    console.log('🚀 Starting full channel scrape...');
    updateScrapeStatus('🚀 Starting full channel scrape...');
    
    try {
        await scrollToTop();
        await scrapeAllMessages();
        
        scrapeStats.endTime = new Date();
        const duration = ((scrapeStats.endTime - scrapeStats.startTime) / 1000).toFixed(1);
        
        updateScrapeStatus(`✅ Scrape complete! ${scrapeStats.totalMessages} messages in ${duration}s`);
        console.log('✅ Full channel scrape completed:', scrapeStats);
        
        // Save all scraped message IDs
        await saveMessageIds();
        
        // Show completion notification
        showNotification(`Scrape Complete!
📊 Total: ${scrapeStats.totalMessages} messages
🆕 New: ${scrapeStats.newMessages} messages
⏱️ Time: ${duration} seconds`);
        
    } catch (error) {
        console.error('❌ Scraping failed:', error);
        updateScrapeStatus(`❌ Scraping failed: ${error.message}`);
        showNotification('Scraping failed! Check console for details.');
    }
    
    isCurrentlyScraping = false;
}

// Stop scraping
function stopScraping() {
    if (!isCurrentlyScraping) return;
    
    isCurrentlyScraping = false;
    updateScrapeStatus('⏹️ Scraping stopped by user');
    console.log('⏹️ Scraping stopped by user');
}

// Scroll to the top of the channel
async function scrollToTop() {
    const chatContainer = document.querySelector('[data-list-id="chat-messages"]');
    if (!chatContainer) {
        throw new Error('Chat container not found');
    }
    
    updateScrapeStatus('📜 Scrolling to channel top...');
    console.log('📜 Scrolling to channel top...');
    
    let previousScrollTop = -1;
    let retries = 0;
    
    while (retries < MAX_SCRAPE_RETRIES && isCurrentlyScraping) {
        // Scroll to top
        chatContainer.scrollTop = 0;
        await sleep(SCRAPE_DELAY);
        
        // Check if we've reached the top
        if (chatContainer.scrollTop === 0) {
            // Try loading more history
            const currentScrollTop = chatContainer.scrollTop;
            
            // Trigger load more by scrolling up slightly and back to top
            chatContainer.scrollTop = 10;
            await sleep(200);
            chatContainer.scrollTop = 0;
            await sleep(SCRAPE_DELAY);
            
            if (currentScrollTop === chatContainer.scrollTop && previousScrollTop === currentScrollTop) {
                console.log('✅ Reached channel top');
                break;
            }
            
            previousScrollTop = currentScrollTop;
        }
        
        retries++;
    }
    
    if (retries >= MAX_SCRAPE_RETRIES) {
        console.log('⚠️ May not have reached absolute top, continuing anyway');
    }
}

// Scrape all messages from current position
async function scrapeAllMessages() {
    const chatContainer = document.querySelector('[data-list-id="chat-messages"]');
    if (!chatContainer) {
        throw new Error('Chat container not found');
    }
    
    console.log('🔍 Starting message scraping from top...');
    
    let consecutiveEmptyScrolls = 0;
    let lastMessageCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 1000; // Safety limit
    
    while (consecutiveEmptyScrolls < 3 && scrollAttempts < maxScrollAttempts && isCurrentlyScraping) {
        // Get current messages
        const messageElements = document.querySelectorAll('[class*="message"]');
        const currentMessageCount = messageElements.length;
        
        console.log(`📊 Found ${currentMessageCount} messages (scroll attempt ${scrollAttempts + 1})`);
        
        // Process current batch of messages
        let batchProcessedCount = 0;
        const messagesToProcess = Array.from(messageElements);
        
        for (let i = 0; i < messagesToProcess.length; i++) {
            if (!isCurrentlyScraping) break;
            
            const wasProcessed = await processScrapedMessage(messagesToProcess[i]);
            if (wasProcessed) {
                batchProcessedCount++;
                scrapeStats.newMessages++;
            }
            scrapeStats.totalMessages = Math.max(scrapeStats.totalMessages, i + 1);
            
            // Update progress
            const progress = Math.min(100, (i / messagesToProcess.length) * 100);
            updateProgress(progress);
            updateScrapeUI();
            
            // Process in smaller batches to avoid blocking
            if (i % 10 === 0) {
                await sleep(50);
            }
        }
        
        console.log(`✅ Processed ${batchProcessedCount} new messages from batch`);
        
        // Check if we got new messages
        if (currentMessageCount === lastMessageCount) {
            consecutiveEmptyScrolls++;
            console.log(`📊 No new messages loaded (attempt ${consecutiveEmptyScrolls}/3)`);
        } else {
            consecutiveEmptyScrolls = 0;
            lastMessageCount = currentMessageCount;
        }
        
        // Scroll down to load more messages
        updateScrapeStatus(`📜 Loading more messages... (${scrapeStats.totalMessages} processed)`);
        
        const scrollHeight = chatContainer.scrollHeight;
        chatContainer.scrollTop = scrollHeight;
        
        // Wait for new messages to load
        await sleep(SCRAPE_DELAY);
        
        // Check if new messages loaded
        await sleep(500);
        
        scrollAttempts++;
        
        // Save progress periodically
        if (scrollAttempts % 10 === 0) {
            await saveMessageIds();
            console.log(`💾 Progress saved (attempt ${scrollAttempts})`);
        }
    }
    
    console.log(`🏁 Scraping complete after ${scrollAttempts} scroll attempts`);
    updateScrapeStatus(`✅ Scraping complete! Processed ${scrapeStats.totalMessages} messages`);
}

// Process a scraped message
async function processScrapedMessage(messageNode) {
    try {
        const content = messageNode.textContent?.trim();
        if (!content) return false;
        
        // Extract author and timestamp
        let author = 'Unknown';
        let discordTimestamp = new Date().toISOString();
        
        const usernameElement = messageNode.querySelector('[class*="username"]');
        if (usernameElement) {
            author = usernameElement.textContent?.trim() || 'Unknown';
        }
        
        // Extract worker name from farm messages
        const workerNameMatch = content.match(/Autor:\s*([^,\n]+)/i);
        if (workerNameMatch) {
            const workerName = workerNameMatch[1].trim();
            if (workerName && workerName !== 'Unknown' && workerName.length > 0) {
                author = workerName;
            }
        }
        
        const timestampElement = messageNode.querySelector('time');
        if (timestampElement) {
            discordTimestamp = timestampElement.getAttribute('datetime') || new Date().toISOString();
        }
        
        // Create unique message ID
        const contentHash = content.substring(0, 150).replace(/\s+/g, ' ').trim();
        const messageId = `${author}-${contentHash}-scrape-${Date.now()}`;
        
        // Check if already processed
        if (processedMessageIds.has(messageId) || scrapedMessageIds.has(messageId)) {
            scrapeStats.duplicates++;
            return false;
        }
        
        // Mark as scraped
        scrapedMessageIds.add(messageId);
        processedMessageIds.add(messageId);
        
        // Create log entry
        const logEntry = {
            id: messageId,
            timestamp: new Date().toISOString(),
            discordTimestamp: discordTimestamp,
            author: author,
            content: content,
            channelId: TARGET_CHANNEL_ID,
            source: 'discord_extension_v4_scrape'
        };
        
        messageQueue.push(logEntry);
        return true;
        
    } catch (error) {
        console.error('❌ Error processing scraped message:', error);
        scrapeStats.failed++;
        return false;
    }
}

// Export scraped data
async function exportScrapedData() {
    try {
        const exportData = {
            scrapeStats: scrapeStats,
            totalProcessedIds: processedMessageIds.size,
            totalScrapedIds: scrapedMessageIds.size,
            queuedMessages: messageQueue.length,
            channelId: TARGET_CHANNEL_ID,
            exportTimestamp: new Date().toISOString(),
            recentMessages: messageQueue.slice(-100) // Last 100 for preview
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        await chrome.downloads.download({
            url: url,
            filename: `discord_channel_scrape_${TARGET_CHANNEL_ID}_${Date.now()}.json`
        });
        
        showNotification(`Data exported! 
📊 ${exportData.totalProcessedIds} processed messages
🗂️ ${exportData.totalScrapedIds} scraped messages
📤 ${exportData.queuedMessages} queued for sending`);
        
    } catch (error) {
        console.error('❌ Failed to export data:', error);
        showNotification('Export failed! Check console for details.');
    }
}

// Utility functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function updateScrapeStatus(status) {
    if (scrapeStatusText) {
        scrapeStatusText.textContent = status;
    }
    console.log(`📊 ${status}`);
}

function updateProgress(percent) {
    if (scrapeProgressBar) {
        scrapeProgressBar.style.width = `${percent}%`;
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: #2f3136; color: white; padding: 20px; border-radius: 8px; 
                    z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.5); 
                    font-family: 'Segoe UI', sans-serif; white-space: pre-line; text-align: center;">
            ${message}
            <div style="margin-top: 15px;">
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #7289da; color: white; border: none; 
                               padding: 8px 16px; border-radius: 3px; cursor: pointer;">
                    OK
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// Enhanced monitoring with scraping capabilities
async function startMonitoring() {
    if (!isTargetChannel()) {
        console.log('⏸️ Not on target channel, extension inactive');
        setTimeout(startMonitoring, 5000);
        return;
    }

    await initializeStorage();

    const messageContainer = document.querySelector('[data-list-id="chat-messages"]');

    if (!messageContainer) {
        console.log('⏳ Waiting for Discord to load...');
        setTimeout(startMonitoring, 2000);
        return;
    }

    console.log('✅ Discord loaded, monitoring target channel:', TARGET_CHANNEL_ID);
    
    // Create scraping control panel
    createScrapeControlPanel();
    updateScrapeUI();

    // Process existing messages on page load
    setTimeout(async () => {
        const existingMessages = document.querySelectorAll('[class*="message"]');
        console.log(`🔍 Found ${existingMessages.length} existing messages on page`);

        let processedCount = 0;
        for (const msg of existingMessages) {
            const wasProcessed = await processNewMessage(msg, true);
            if (wasProcessed) processedCount++;
        }
        
        console.log(`📊 Processed ${processedCount} new messages from page load`);
        await saveMessageIds();
        updateScrapeUI();
    }, 3000);

    // Set up mutation observer for new messages
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(async (node) => {
                    if (node.nodeType === 1 && node.classList &&
                        (node.classList.toString().includes('message') ||
                            (node.querySelector && node.querySelector('[class*="message"]')))) {
                        await processNewMessage(node, false);
                        updateScrapeUI();
                    }
                });
            }
        });
    });

    observer.observe(messageContainer, {
        childList: true,
        subtree: true
    });

    // Start batch processing
    setInterval(processBatch, BATCH_INTERVAL);
    
    // Update UI periodically
    setInterval(updateScrapeUI, 3000);

    monitorChannelChanges();
}

// Process new message (existing logic)
async function processNewMessage(messageNode, isExistingMessage = false) {
    try {
        const content = messageNode.textContent?.trim();
        
        if (!content) return false;
        
        if (!isExistingMessage) {
            console.log('🔍 NEW MESSAGE DETECTED:', content.substring(0, 100) + '...');
        }
        
        let author = 'Unknown';
        let discordTimestamp = new Date().toISOString();
        
        const usernameElement = messageNode.querySelector('[class*="username"]');
        if (usernameElement) {
            author = usernameElement.textContent?.trim() || 'Unknown';
        }
        
        const workerNameMatch = content.match(/Autor:\s*([^,\n]+)/i);
        if (workerNameMatch) {
            const workerName = workerNameMatch[1].trim();
            if (workerName && workerName !== 'Unknown' && workerName.length > 0) {
                author = workerName;
            }
        }
        
        const timestampElement = messageNode.querySelector('time');
        if (timestampElement) {
            discordTimestamp = timestampElement.getAttribute('datetime') || new Date().toISOString();
        }
        
        const contentHash = content.substring(0, 150).replace(/\s+/g, ' ').trim();
        const messageId = `${author}-${contentHash}-timestamp-${Date.now()}`;

        if (processedMessageIds.has(messageId)) {
            return false;
        }

        processedMessageIds.add(messageId);

        const logEntry = {
            id: messageId,
            timestamp: new Date().toISOString(),
            discordTimestamp: discordTimestamp,
            author: author,
            content: content,
            channelId: TARGET_CHANNEL_ID,
            source: 'discord_extension_v4'
        };
        
        messageQueue.push(logEntry);

        if (processedMessageIds.size % 25 === 0) {
            await saveMessageIds();
        }

        return true;

    } catch (error) {
        console.error('❌ Error processing message:', error);
        return false;
    }
}

// Monitor for channel changes
function monitorChannelChanges() {
    let currentUrl = window.location.href;

    setInterval(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            console.log('🔄 Channel changed, restarting monitoring...');
            
            // Remove old control panel
            if (scrapeControlPanel) {
                scrapeControlPanel.remove();
                scrapeControlPanel = null;
            }
            
            // Stop any ongoing scraping
            isCurrentlyScraping = false;
            
            setTimeout(startMonitoring, 1000);
        }
    }, 2000);
}

// Process batch of messages (existing logic)
async function processBatch() {
    if (messageQueue.length === 0) return;
    
    const batch = messageQueue.splice(0, BATCH_SIZE);
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channelId: TARGET_CHANNEL_ID,
                messages: batch
            })
        });
        
        if (response.ok) {
            console.log(`✅ Batch of ${batch.length} messages processed successfully`);
        } else {
            console.error(`❌ Batch processing failed: ${response.status}`);
            messageQueue.unshift(...batch);
        }
    } catch (error) {
        console.error('❌ Network error processing batch:', error);
        messageQueue.unshift(...batch);
    }
}

// Global data exposure for dashboard integration
let globalMessageData = [];

function updateGlobalData() {
    const recentMessages = messageQueue.slice(0, 100);
    globalMessageData = [...recentMessages];
    
    window.discordExtensionData = globalMessageData;
    
    const event = new CustomEvent('extensionProcessedData', { detail: globalMessageData });
    window.dispatchEvent(event);
}

// Expose functions for debugging and manual control
window.startChannelScrape = startFullChannelScrape;
window.stopChannelScrape = stopScraping;
window.exportChannelData = exportScrapedData;
window.getExtensionData = () => globalMessageData;
window.getScrapeStats = () => scrapeStats;

// Update global data periodically
setInterval(updateGlobalData, 3000);

// Start monitoring when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring);
} else {
    startMonitoring();
}

console.log('🚀 Discord Channel Logger v4.0 ready with full scraping capabilities');