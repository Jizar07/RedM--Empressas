console.log('🚀 Discord Monitor Extension loaded');

const TARGET_CHANNEL = '1356704279204724746';
const WEBHOOK_URL = 'http://localhost:3051/api/webhook/channel-messages';
let processedMessages = new Set();

function isTargetChannel() {
    const isTarget = window.location.href.includes(TARGET_CHANNEL);
    console.log('🔍 Checking channel:', window.location.href, 'Target:', isTarget);
    return isTarget;
}

async function sendMessage(messageData) {
    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                channelId: TARGET_CHANNEL,
                messages: [messageData]
            })
        });
        
        // Notify frontend immediately of new data
        window.dispatchEvent(new CustomEvent('newDiscordMessage', {
            detail: messageData
        }));
        console.log('📡 Dispatched newDiscordMessage event');
        
    } catch (error) {
        console.error('Send failed:', error);
    }
}

// Process a message immediately when detected
async function processNewMessage(messageNode, isExistingMessage = false) {
    try {
        const content = messageNode.textContent?.trim();
        
        if (!content) return false;
        
        if (!isExistingMessage) {
            console.log('🔍 NEW MESSAGE DETECTED:');
            console.log(content.substring(0, 200) + '...');
        }
        
        // Check for duplicates
        if (processedMessages.has(content)) {
            if (!isExistingMessage) {
                console.log('⏭️ Skipping duplicate message');
            }
            return false;
        }
        
        // Mark as processed
        processedMessages.add(content);
        
        const messageContainer = messageNode.closest('[class*="message"]') || messageNode;
        const author = messageContainer?.querySelector('[class*="username"]')?.textContent?.trim() || 'Unknown';
        const timeEl = messageContainer?.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || new Date().toISOString();
        
        const messageData = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: timestamp,
            author: author,
            content: content,
            source: 'monitor'
        };
        
        await sendMessage(messageData);
        return true;
        
    } catch (error) {
        console.error('❌ Error processing message:', error);
        return false;
    }
}

function scanMessages() {
    if (!isTargetChannel()) return;
    
    const messages = document.querySelectorAll('[data-list-item-id*="chat-messages"]');
    console.log('📬 Found', messages.length, 'message elements');
    messages.forEach(msg => processNewMessage(msg, true));
}

function startMonitoring() {
    if (!isTargetChannel()) {
        setTimeout(startMonitoring, 2000);
        return;
    }
    
    const messageContainer = document.querySelector('[data-list-id="chat-messages"]');
    
    if (!messageContainer) {
        console.log('⏳ Waiting for Discord to load...');
        setTimeout(startMonitoring, 2000);
        return;
    }
    
    console.log('✅ Discord loaded, monitoring target channel:', TARGET_CHANNEL);
    
    // Process existing messages on page load
    setTimeout(() => {
        console.log('⏰ Initial scan after delay');
        scanMessages();
    }, 3000);
    
    // Set up mutation observer for immediate real-time detection
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(async (node) => {
                    if (node.nodeType === 1 && node.classList &&
                        (node.classList.toString().includes('message') ||
                            (node.querySelector && node.querySelector('[class*="message"]')))) {
                        await processNewMessage(node, false); // false = new message
                    }
                });
            }
        });
    });
    
    observer.observe(messageContainer, {
        childList: true,
        subtree: true
    });
}

startMonitoring();