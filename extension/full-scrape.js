console.log('🚀 Discord Full Scraper - Pulling ALL lost transactions');

const TARGET_CHANNEL = '1356704279204724746';
const WEBHOOK_URL = 'http://localhost:3051/api/webhook/channel-messages';
let processedMessages = new Set();
let messageCount = 0;

function isTargetChannel() {
    const isTarget = window.location.href.includes(TARGET_CHANNEL);
    console.log('🔍 Checking channel:', window.location.href, 'Target:', isTarget);
    return isTarget;
}

async function sendBatch(messages) {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                channelId: TARGET_CHANNEL,
                messages: messages
            })
        });
        
        if (response.ok) {
            console.log(`📡 Sent batch of ${messages.length} messages`);
            return true;
        } else {
            console.error('❌ Failed to send batch:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Send failed:', error);
        return false;
    }
}

function extractMessageData(messageElement) {
    try {
        const content = messageElement.textContent?.trim();
        if (!content || processedMessages.has(content)) {
            return null;
        }
        
        processedMessages.add(content);
        
        const messageContainer = messageElement.closest('[class*="message"]') || messageElement;
        const author = messageContainer?.querySelector('[class*="username"]')?.textContent?.trim() || 'Unknown';
        const timeEl = messageContainer?.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || new Date().toISOString();
        
        return {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: timestamp,
            author: author,
            content: content,
            source: 'full-scrape'
        };
    } catch (error) {
        console.error('❌ Error extracting message:', error);
        return null;
    }
}

async function scrollToLoadMoreMessages() {
    return new Promise((resolve) => {
        const messageContainer = document.querySelector('[data-list-id="chat-messages"]');
        if (!messageContainer) {
            console.log('❌ Message container not found');
            resolve(false);
            return;
        }
        
        const scrollableElement = messageContainer.closest('[class*="scroller"]') || messageContainer.parentElement;
        const initialScrollTop = scrollableElement.scrollTop;
        
        // Scroll to top to load older messages
        scrollableElement.scrollTop = 0;
        
        // Wait for Discord to load new messages
        setTimeout(() => {
            const newScrollTop = scrollableElement.scrollTop;
            const hasNewContent = newScrollTop !== initialScrollTop || 
                                document.querySelectorAll('[data-list-item-id*="chat-messages"]').length > messageCount;
            
            console.log(`📜 Scroll result - Initial: ${initialScrollTop}, New: ${newScrollTop}, HasNew: ${hasNewContent}`);
            resolve(hasNewContent);
        }, 2000);
    });
}

async function fullChannelScrape() {
    if (!isTargetChannel()) {
        console.log('❌ Not in target channel');
        return;
    }
    
    console.log('🚀 Starting FULL channel scrape for all lost transactions...');
    
    let batch = [];
    let totalProcessed = 0;
    let maxScrollAttempts = 50; // Prevent infinite loops
    let scrollAttempts = 0;
    
    while (scrollAttempts < maxScrollAttempts) {
        // Get all current messages
        const messages = document.querySelectorAll('[data-list-item-id*="chat-messages"]');
        console.log(`📬 Found ${messages.length} message elements (attempt ${scrollAttempts + 1})`);
        
        let newMessagesFound = 0;
        
        // Process messages
        for (const msg of messages) {
            const messageData = extractMessageData(msg);
            if (messageData) {
                batch.push(messageData);
                newMessagesFound++;
                totalProcessed++;
                
                // Send in batches of 10
                if (batch.length >= 10) {
                    await sendBatch(batch);
                    batch = [];
                }
            }
        }
        
        console.log(`📊 New messages in this batch: ${newMessagesFound}, Total: ${totalProcessed}`);
        
        // Try to load more messages by scrolling
        const hasMoreMessages = await scrollToLoadMoreMessages();
        
        if (!hasMoreMessages || newMessagesFound === 0) {
            console.log('✅ No more messages to load, scraping complete!');
            break;
        }
        
        scrollAttempts++;
        messageCount = messages.length;
    }
    
    // Send remaining messages
    if (batch.length > 0) {
        await sendBatch(batch);
    }
    
    console.log(`🎉 FULL SCRAPE COMPLETE! Total messages processed: ${totalProcessed}`);
    console.log(`📊 Total unique messages found: ${processedMessages.size}`);
    
    // Notify completion
    window.dispatchEvent(new CustomEvent('fullScrapeComplete', {
        detail: {
            totalProcessed: totalProcessed,
            uniqueMessages: processedMessages.size
        }
    }));
}

// Start the full scrape
setTimeout(fullChannelScrape, 3000);