// Discord Extension Bridge - Connect Extension to Dashboard
// This script runs in the browser extension and forwards data to the dashboard

(function() {
  'use strict';
  
  console.log('🌉 Discord Extension Bridge loaded');
  
  // Dashboard connection endpoint
  const DASHBOARD_URL = 'http://localhost:3051'; // Next.js frontend port
  
  // Forward extension data to dashboard
  function forwardToDashboard(extensionMessages) {
    console.log('🔄 Forwarding', extensionMessages.length, 'messages to dashboard');
    
    // Send data to dashboard via custom event
    if (window.parent !== window) {
      // If in iframe, post to parent
      window.parent.postMessage({
        type: 'extensionData',
        data: extensionMessages
      }, DASHBOARD_URL);
    } else {
      // If in same window, dispatch custom event
      const event = new CustomEvent('extensionData', { detail: extensionMessages });
      window.dispatchEvent(event);
    }
    
    // Also try to send via fetch if dashboard is accessible
    try {
      fetch(`${DASHBOARD_URL}/api/extension-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: extensionMessages,
          timestamp: new Date().toISOString()
        })
      }).catch(err => {
        // Silently fail - dashboard might not be running
        console.debug('Dashboard API not available:', err.message);
      });
    } catch (error) {
      console.debug('Failed to send to dashboard API:', error);
    }
  }
  
  // Listen for extension data
  window.addEventListener('extensionProcessedData', (event) => {
    const messages = event.detail || [];
    if (messages.length > 0) {
      forwardToDashboard(messages);
    }
  });
  
  // Monitor extension activity and forward data
  let lastDataSent = 0;
  const DATA_SEND_INTERVAL = 5000; // Send every 5 seconds
  
  setInterval(() => {
    // Check if extension has new data
    if (window.discordExtensionData && Array.isArray(window.discordExtensionData)) {
      const now = Date.now();
      if (now - lastDataSent > DATA_SEND_INTERVAL) {
        forwardToDashboard(window.discordExtensionData);
        lastDataSent = now;
      }
    }
  }, 2000);
  
  console.log('🌉 Extension bridge ready - will forward data to dashboard');
})();