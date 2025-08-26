# Discord Channel Logger Extension v3.0 + Dashboard Integration

Browser extension to capture Discord channel messages and display them in a beautiful dashboard interface.

## 🎯 Complete System Overview

This system consists of:
1. **Browser Extension** - Captures Discord messages from your personal account
2. **Discord Bot** - Processes webhook data with CORS enabled
3. **Dashboard Frontend** - Beautiful React interface showing farm activities
4. **Data Bridge** - Connects extension data to dashboard components

## 🚀 Installation

### Step 1: Install Browser Extension
1. **Open Chrome Extensions**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Load Extension**:
   - Click "Load unpacked"
   - Select this `discord_extension` folder
   - Extension should appear with name "Discord Channel Logger v3.0"

### Step 2: Start Discord Bot & Frontend
1. **Start Discord Bot** (Port 3050):
   ```bash
   npm run dev
   ```
   
2. **Start Frontend** (Port 3051):
   ```bash
   cd frontend && npm run dev
   ```

### Step 3: Navigate to Discord Channel
- Open Discord in your browser  
- Go to: https://discord.com/channels/1271178653417607219/1356704279204724746
- Extension will automatically detect and start monitoring

## 📊 Dashboard Access

1. **Open Dashboard**: http://localhost:3051
2. **Navigate to "Fazenda BW" Tab**
3. **View Real-time Farm Activities**: 
   - Item additions/removals
   - Financial transactions
   - Worker statistics
   - Live activity feeds

## 🔧 System Configuration

### Extension Settings (`content.js`):
- **Target Channel**: `1356704279204724746`
- **Bot Webhook**: `http://localhost:3050/api/webhook/channel-messages` 
- **Dashboard Bridge**: Automatic data forwarding
- **Batch Processing**: 5 messages every 2 seconds
- **Storage**: 30-day message retention

### Bot Settings (Updated CORS):
- **Ports**: 3050 (bot), 3051 (frontend)
- **CORS Origins**: Discord.com + localhost allowed
- **Webhook Endpoint**: `/api/webhook/channel-messages`

## ✨ New Dashboard Features

### 🏛️ Fazenda BW Dashboard
- **Real-time Activity Feed**: See live Discord activities
- **Smart Item Recognition**: Animals, plants, tools with emoji icons  
- **Financial Tracking**: Deposit/withdrawal monitoring
- **Worker Analytics**: Performance metrics per user
- **Activity Filtering**: Sort by time, user, quantity
- **Extension Status**: Connection health monitoring

### 📦 Components Available
- **FazendaBW.tsx**: Main dashboard with activity feeds
- **Estoque.js**: Inventory management (ready for integration)
- **Trabalhadores.js**: Worker performance tracking (ready for integration)

## 🔍 Monitoring & Debug

### Extension Console Logs
```javascript
📡 Discord Channel Logger v3.0 activated
✅ Discord loaded, monitoring target channel: 1356704279204724746
🔍 NEW MESSAGE DETECTED: [Message Content]
📝 Message queued: {author: 'User', contentPreview: '...'}
📦 Processing batch of X messages
✅ Batch processed successfully
🔄 Updated global data: X messages
```

### Dashboard Debug Commands
```javascript
// Check extension data in browser console
window.getExtensionData()

// Download extension logs
window.downloadDiscordLogs()

// View connection status
console.log(window.discordExtensionData)
```

### Bot Console Output
```
🔗 Browser extension message received: {channelId: '...', messageCount: X}
📝 Extension Messages: [List of processed activities]
```

## 🎮 Usage Workflow

1. **Start System**: Bot + Frontend running
2. **Install Extension**: Load in Chrome
3. **Open Discord**: Navigate to target channel  
4. **Open Dashboard**: Go to Fazenda BW tab
5. **Watch Live Data**: Activities appear in real-time
6. **Monitor Activities**: Items, money, workers all tracked

## 🔗 Data Flow

```
Discord Channel → Extension → Bot Webhook → Dashboard Components
                     ↓
                Global Events → React Components → UI Updates
```

## 🛠️ Troubleshooting

### Extension Issues
- ✅ Check `chrome://extensions/` - enabled?
- ✅ Console shows logs starting with 📡?
- ✅ Correct Discord channel URL?

### Bot Connection Issues  
- ✅ Bot running on port 3050?
- ✅ CORS errors in browser console?
- ✅ Webhook receiving data?

### Dashboard Issues
- ✅ Frontend running on port 3051?
- ✅ Fazenda BW tab visible?
- ✅ Extension status shows "Connected"?

## 📈 Version History

- **v3.0**: Complete dashboard integration with real-time data
- **v2.5**: Added dashboard bridge and global data exposure  
- **v2.0**: File-based system with farm keyword filtering
- **v1.0**: Original webhook-only version

## 🎯 Next Steps

The system is now fully functional! You can:
1. **Monitor Real-time**: Watch Discord activities flow into dashboard
2. **Extend Components**: Add Estoque/Trabalhadores to navigation
3. **Customize Filters**: Modify activity types and displays
4. **Add Analytics**: Build charts and reports from captured data

Perfect integration between Discord extension and your dashboard! 🚀