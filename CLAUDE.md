# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RedM Discord Bot - A comprehensive Discord bot for managing RedM (Red Dead Redemption Online RP) servers with web dashboard integration. Built with TypeScript, Discord.js v14, and Express.js.

## Setup and Development

### Development Commands
```bash
npm run dev       # Start development server with hot reload
npm run build     # Build TypeScript to JavaScript
npm run start     # Start production server
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript type checking
```

### Required Environment Variables
- `DISCORD_TOKEN` - Discord bot token (required)
- `DISCORD_CLIENT_ID` - Discord application ID (required)
- `DISCORD_GUILD_ID` - Discord server ID for development (required)
- `REDM_SERVER_IP` - RedM server IP address
- `REDM_SERVER_PORT` - RedM server port (default: 30120)
- `MONGODB_URI` - MongoDB connection string

## Architecture

### Project Structure
```
src/
├── bot/                 # Discord bot core
│   ├── BotClient.ts    # Main bot class extending Discord.js Client
│   ├── commands/       # Slash commands organized by category
│   │   ├── info/      # General info commands (ping, help)
│   │   ├── admin/     # Admin commands (kick, ban, restart)
│   │   └── redm/      # RedM-specific commands (status, players)
│   └── events/        # Discord event handlers
├── api/                # REST API for dashboard
│   ├── server.ts      # Express server setup
│   └── routes/        # API endpoints
├── services/          # Business logic
│   ├── RedMService.ts # RedM server communication
│   └── DatabaseService.ts # MongoDB connection
└── config/           # Configuration files
Webbased/              # Farm management system (Port 8086)
├── client/            # React frontend for farm management
├── server/            # Node.js backend with API routes
├── data/              # JSON data storage for farm operations
└── server.js          # Main server file
```

### Key Technologies
- **Discord.js v14** - Discord bot framework
- **Express.js** - REST API server
- **Socket.io** - Real-time updates to dashboard
- **MongoDB/Mongoose** - Data persistence
- **TypeScript** - Type safety
- **Axios** - HTTP client for RedM API calls

### RedM Integration
The bot communicates with RedM servers using:
- `/info.json` - Server information
- `/players.json` - Player list
- `/dynamic.json` - Dynamic server data
- RCON commands for server management (kick, ban, restart)

### Discord Channel Parsing
The bot includes comprehensive channel parsing functionality:
- **ChannelParserService**: Extracts messages from Discord channels by ID
- **Embed Support**: Parses content from Discord embeds (titles, descriptions, fields)
- **Webhook Integration**: Sends structured JSON data to external webhooks
- **Filtering**: Support for user ID, keyword, date range, and message limit filters
- **Frontend Interface**: User-friendly web interface in dashboard
- **API Endpoints**: `/api/channel-parser/parse` and `/api/channel-parser/preview`
- **Discord Command**: `/parse-channel` slash command with admin permissions

### Message Management System (Anti-Flooding)
The bot includes an advanced message management system to prevent Discord channel flooding:
- **MessageManagerService**: Tracks and manages persistent Discord messages using messageType + channelId keys
- **Webhook Receiver API**: Receives data from external websites instead of direct Discord webhooks
- **Message Update Logic**: Updates existing messages instead of creating new ones for each update
- **Multiple Message Types**: Support for different persistent message types in the same channel
- **API Endpoints**: 
  - `POST /api/webhook/update-message` - Update or create managed messages
  - `DELETE /api/webhook/delete-message` - Remove managed messages
  - `GET /api/webhook/managed-messages` - List all tracked messages
  - `DELETE /api/webhook/clear-channel/:channelId` - Clear channel tracking
- **Website Integration**: External websites send to bot API instead of Discord webhooks directly
- **Performance**: Eliminates message spam, maintains clean organized channels with real-time updates

## Custom Commands

### /update
When you see "/update" command from the user, perform the following actions:
1. Get the current timestamp using `date '+%Y-%m-%d %H:%M:%S'`
2. Update devlog.md with:
   - Current timestamp (to the second)
   - The user's prompt/request
   - Summary of changes made
3. Update changelog.md if there are version-worthy changes
4. Update CLAUDE.md if there are architectural or command changes

## Recent Major Updates (v0.017) **[CURRENT VERSION]**

### Complete Farm Service Role-Based Security & System Integration (v0.017) 
- **Enhancement**: Comprehensive role-based security system with complete audit trail
- **Features**: 
  - **Role-Based Button Visibility**: Accept/Edit/Reject/Pay buttons only show for users with configured permissions
  - **Permission Validation**: All interactions validate user roles against farm-service-config.json
  - **Complete Audit Trail**: Shows who approved, edited, rejected, and paid for each service
  - **Frontend Connectivity**: Auto-discovery system resolves backend connection issues
  - **Orders System Integration**: Fixed interaction handler conflicts between farm and orders systems
  - **Enhanced Service Display**: Pay All and persistent receipts show complete service history
  - **Security Logging**: Comprehensive permission checking with detailed debugging logs
- **Result**: Production-ready system with complete security, transparency, and audit capabilities

### Farm Service UI/UX Overhaul - ALL WORKING (v0.010-v0.016) **[RESTORE POINTS]**
- **Comprehensive Fixes**: All critical UI/UX issues resolved across multiple versions
- **Core Functionality**: Complete farm service workflow operational
- **Key Features**: Message dismissal, receipt flow, payment processing, modal interactions
- **System Integration**: Farm services, orders system, frontend, and backend all working together

### Historical Message Flooding Fix (v0.008)

### Historical Message Flooding Fix
- **Issue**: Bot was sending 100+ historical Discord messages to webhook every time it restarted
- **Impact**: Caused inventory corruption in external system when it processed historical data as new activities
- **Fix**: Disabled processAllChannelMessages() in src/bot/events/ready.ts
- **Result**: Bot now only processes NEW Discord messages, eliminating duplicate data flooding

### Message Type Filtering Removal
- **Issue**: INSERIR ITEM/REMOVER ITEM/FARM filtering was blocking legitimate activities
- **Impact**: Missing farm activities (e.g., Kathryn Davis wateringcan transactions)
- **Fix**: Removed all message type filtering from backend and frontend
- **Result**: ALL Discord messages now processed without arbitrary blocking

### Webhook Communication Fix
- **Issue**: Format mismatch between bot webhook payload and receiving system
- **Impact**: 400/404 errors, failed data transmission
- **Fix**: Updated payload format to {channelId, messages: [array]} expected by receiver
- **Result**: Clean webhook communication, no more errors

### System Architecture (Current)
- **Discord Bot (Port 3050)**: Processes NEW messages only, sends proper webhook format
- **Frontend (Port 3051)**: Clean interface without filtering, channel configuration management
- **Webbased System (Port 8086)**: Farm management web application with inventory, payments, and analytics
  - React frontend with comprehensive farm management components
  - Node.js backend with API routes and data management services
  - Socket.io for real-time updates
  - Integrates with Discord bot via webhooks at localhost:3050
  - JSON-based data storage for inventory, users, payments, and farm operations

## File Management

### Version Control Files
- **changelog.md**: Tracks application versions (starting at 0.001) for code reverts. Synced with https://github.com/Jizar07/RedM--Empressas
- **devlog.md**: Local development log with precise timestamps (to the second) tracking all prompts and changes
- **CLAUDE.md**: This file - guidance for Claude Code instances

### Update Process
When updating .md files:
1. Always fetch current system time with precision to seconds
2. Document all prompts in devlog.md
3. Increment version in changelog.md when significant changes are made
4. Keep detailed records for potential code reverts

## Notes

- This CLAUDE.md file should be updated as the Discord bot project grows
- Add specific build, test, and deployment commands once they are established
- Document any Discord API patterns or bot-specific conventions used in the codebase
- Repository: https://github.com/Jizar07/RedM--Empressas