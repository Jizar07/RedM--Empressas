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

function processMessage(element) {
    if (!element) return;
    
    const content = element.textContent?.trim();
    if (!content || processedMessages.has(content)) return;
    
    processedMessages.add(content);
    
    const messageContainer = element.closest('[class*="message"]');
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
    
    sendMessage(messageData);
}

function scanMessages() {
    console.log('📊 Scanning messages...');
    if (!isTargetChannel()) return;
    
    const messages = document.querySelectorAll('[data-list-item-id*="chat-messages"]');
    console.log('📬 Found', messages.length, 'message elements');
    messages.forEach(processMessage);
}

function startMonitoring() {
    if (!isTargetChannel()) {
        setTimeout(startMonitoring, 2000);
        return;
    }
    
    console.log('🔄 Starting monitoring, waiting for Discord to load messages...');
    
    // Wait for Discord to load messages, then scan
    setTimeout(() => {
        console.log('⏰ Initial scan after delay');
        scanMessages();
    }, 5000);
    
    // Monitor new messages
    const observer = new MutationObserver(() => scanMessages());
    const chatContainer = document.querySelector('[data-list-id="chat-messages"]');
    
    if (chatContainer) {
        observer.observe(chatContainer, {
            childList: true,
            subtree: true
        });
    }
    
    // Periodic scan every 15 minutes
    setInterval(scanMessages, 15 * 60 * 1000);
}

startMonitoring();