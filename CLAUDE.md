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

## Recent Major Updates (v0.038) **[CURRENT VERSION]**

### Complete Worker Channel Mapping Resolution (v0.038)
- **Critical Fix**: Resolved missing worker channel mappings for all registered users
- **Identified**: 4 registered workers with 🌾 channels missing from worker-mappings.json
- **Added Mappings**:
  - Thiago Bennett (924392622552916028) → Channel 1416785592989257878
  - Bartholomeu Dias (198538680686608384) → Channel 1416530771283546274
  - Anisio Lima (388494830483013638) → Channel 1416847554544668815
  - john Weslley (398270963969425408) → Channel 1416880519165120542
- **System Status**: Bot now tracking 23 worker channel mappings (up from 19)
- **Root Cause**: Worker mapping API calls failing during registration since September 12th
- **Result**: All registered workers with 🌾 channels now receive embeds properly

### Critical Worker Channel Mapping System Fix (v0.037)
- **Issue**: Registered workers missing from worker-mappings.json, preventing embed delivery
- **Root Cause**: Worker mapping API calls (registrationInteraction.ts:384-410) failing silently during registration
- **Resolution**: Manual worker mapping creation and API registration system
- **Impact**: All 65 registered workers can now receive embeds in their Discord channels
- **Prevention**: Added comprehensive error handling and logging for future registrations

### Worker Payment Transparency & Smart Embed Display (v0.036)
- **Fixed Payment Logic**: Workers now get paid for ALL plants deposited, not just those matching seed expectations
- **Smart Embed Summarization**: New formatTransactionsWithSummarization() handles Discord's character limits intelligently
  - Shows individual transactions with timestamps until approaching limit
  - Automatically switches to hourly summaries (e.g., "3:00-3:59: 2000 Trigo, 1500 Junco (6 transações)")
- **Separated Display Sections**:
  - 🌱 Sementes Retiradas - Seeds taken with timestamps and totals
  - 🌾 Plantas Depositadas - Plants deposited with timestamps and payment calculation
- **Transparent Math**: Clear display shows complete calculation path:
  - Seeds taken (e.g., 2,005) → Expected plants (20,050) → Actual deposits (19,520) → Payment ($4,880)
- **Removed Confusion**: Eliminated old seed expectation strikethrough display that was incomplete
- **Result**: Workers see exactly where their payment comes from with full transaction history

### Complete Ferrovia Button System with Manager-Only Permissions (v0.035)
- **Manager-Only Button System**: Implemented comprehensive permission checking for both Farm and Ferrovia embed buttons
- **Button Replacement**: Replaced non-functional Analytics/Responsibilities buttons with Verified (green) and Reset (red) buttons
- **Ferrovia Handlers**: Created complete handler system in `src/handlers/ferroviaHandlers.ts` with permission validation
- **Receipt System**: Verified button creates receipts identical to farm payall functionality with session summaries
- **Reset Functionality**: Reset button clears all session data and immediately updates embed display
- **Critical Bug Fix**: Resolved session lookup issue by using shared SupplyChainService instance instead of creating new instances
- **Portuguese Integration**: Enhanced Ferrovia embeds with ItemTranslationService for proper Portuguese item names
- **Net Plant Tracking**: Implemented context-aware plant tracking distinguishing Farm deposits from Ferrovia returns
- **Permission System**: All buttons now manager-only using farm service configuration roles (acceptRoles)
- **Result**: Complete manager-controlled Ferrovia system with proper receipts, data management, and Portuguese display

## Previous Major Updates (v0.034)

### Backend Workers Channel Modifications - Complete UI/UX Enhancement (v0.034)
- **Streamlined Worker Management**: Removed reject button functionality completely, simplified workflow to Pay and Edit only
- **Enhanced Edit Capabilities**: Added comprehensive editing for transaction amounts (animal deliveries) and quantities (plant transactions)
- **Smart Edit Validation**: Requires at least one field (name, quantity, or amount) with proper number format validation
- **Automatic Recalculation**: Credits automatically recalculated after transaction edits to maintain system accuracy
- **Payment Status Enhancement**: Payment button now updates session to 'paid' status with blue embed, "Total Pago" display
- **Button Management**: All buttons automatically removed after payment completion (clean paid status)
- **API Enhancement**: Worker-activity endpoints updated with comprehensive validation for new editing parameters
- **Import Cleanup**: Removed all reject-related imports fixing TypeScript compilation errors
- **Result**: Clean, efficient worker management with comprehensive editing and clear payment completion workflow

### Complete Global Naming/Translation System Implementation (v0.029)
- **Global Translation System**: Implemented comprehensive global naming system for Fazenda Cabra da Peste firm
- **Worker Name Extraction**: Fixed animal delivery transactions to extract actual worker names from Discord message content
- **Translation Integration**: Connected global localization service with 121+ Portuguese translations (bulrush → junco, common_portion_chicken → Racao Avino)
- **Backend Parsing Enhancement**: Added regex pattern matching to extract worker names from "Ação:" field in Discord messages
- **Frontend Display Fix**: Updated TemplateFirmDashboard to match FazendaBW formatting exactly for animal deliveries
- **Type System Update**: Enhanced TypeScript interfaces to support both custom translations and "global" setting
- **Result**: Animal deliveries now display correctly as "BONNIE BENNETT vendeu 4 animais no matadouro por $160.00" instead of "Spidey Bot depositou $160.00"

## Previous Major Updates (v0.027)

### Complete Multi-Server Discord OAuth & Firm Management System (v0.027)
- **Multi-Server Architecture**: Complete implementation of server-scoped operations with global ServerContext
- **NextAuth Integration**: Full Discord OAuth with guild fetching, admin permission detection, and session management
- **Server Filtering System**: All API calls automatically include selected server ID via axios interceptors
- **Firm Management Revolution**: Server-scoped firm creation with automatic role population from selected Discord server
- **Enhanced User Experience**: Streamlined server selection workflow with clear messaging and persistence
- **Production-Ready Security**: Comprehensive permission system with proper Discord admin role detection
- **Scalable Architecture**: Clean separation of server contexts supporting unlimited Discord servers
- **Technical Components**:
  - `frontend/contexts/ServerContext.tsx` - Global server state management
  - `frontend/lib/api.ts` - Axios interceptor for automatic server filtering
  - `frontend/hooks/useFirmAccess.ts` - Server-aware firm access control
  - `frontend/components/ServerSelector.tsx` - Enhanced server selection component
  - `frontend/components/EnhancedFirmConfigModal.tsx` - Server-integrated firm creation
  - `frontend/lib/auth-options.ts` - NextAuth Discord OAuth with guild fetching
- **Result**: Truly multi-server Discord bot deployment with isolated firm management per server

## Previous Major Updates

### Event-Driven Real-Time Architecture Revolution (v0.020)
- **System Architecture**: Completely replaced continuous polling with proper event-driven updates
- **Browser Extension Enhancement**: Added immediate `newDiscordMessage` event dispatch when Discord activity detected
- **Performance Revolution**: Eliminated second-by-second polling, implemented 60-minute safety sync + instant notifications  
- **React Optimization**: Fixed React Strict Mode issues, implemented global singletons, added memoization for performance
- **Enhanced User Management**: Complete TrabalhadoresBWManagement overhaul with clickable sorting, detailed analytics
- **Advanced User Analytics**: Comprehensive modal with financial summaries, inventory totals by specific item types
- **Dashboard Improvements**: Added bank balance card parsing "Saldo após depósito/saque", 5-metric responsive layout
- **Translation Integration**: Fixed item name display across all components using centralized translation system
- **Global State Management**: Implemented singleton patterns to prevent duplicate intervals and resource leaks
- **Result**: Near-zero resource usage with instant real-time updates, resolved all performance bottlenecks

## Previous Major Updates

### Financial Transaction Display Fix & Enhanced Parsing (v0.019)
- **Enhancement**: Complete overhaul of financial transaction display and parsing system
- **Features**: 
  - **Transaction Type Distinction**: Separate parsing for sales deposits (with "Ação:" field) vs direct deposits
  - **Clean Display Format**: Eliminated redundant information, implemented proper Portuguese flow
    - Sales: "Zero Bala vendeu 4 animais no matadouro por $160.00"
    - Direct deposits: "Jizar Stoffeliz depositou $4000.00"
    - Withdrawals: "Zero Bala sacou $1000.00"
  - **Enhanced Regex Patterns**: Added negative lookahead `(?!.*Ação:)` to prevent misclassification
  - **Transaction Categories**: Sales marked as 'venda', deposits as 'deposito', withdrawals as 'saque'
  - **TypeScript Fixes**: Updated target to ES2018, fixed downlevelIteration and type assertion errors
  - **Frontend Error Resolution**: Resolved all compilation errors and improved display logic
- **Files Modified**: 
  - `frontend/app/api/webhook/channel-messages/route.ts` - Enhanced parseDiscordMessage() function
  - `frontend/components/FazendaBW.tsx` - Improved transaction display logic
  - `frontend/tsconfig.json` - Updated TypeScript configuration
- **Result**: Clean, non-redundant financial transaction display with proper Portuguese grammar

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

## Core Development Rules

- **DO NOT MAKE ASSUMPTIONS** - Always verify requirements and implementation details
- **DO NOT OVERCOMPLICATE THINGS** - Keep solutions simple and maintainable
- **USE SIMPLE SOLUTIONS** - Prefer straightforward approaches over complex ones
- **IF YOU DON'T KNOW, ASK** - Seek clarification rather than guessing
- **🚨 CRITICAL: DO NOT FUCKING MAKE CHANGES OR RUN PROGRAMS WITHOUT EXPLICIT PERMISSION** - NEVER delete files, kill processes, modify code, or execute commands without the user's direct approval

## MANDATORY PRE-RESPONSE CHECKLIST

**BEFORE RESPONDING TO ANY REQUEST:**
1. **Read this request carefully** - What exactly is being asked?
2. **Check: Am I making assumptions?** - Am I assuming something that wasn't explicitly stated?
3. **Check: Should I ask clarifying questions first?** - Do I need more information before proceeding?
4. **If yes to either check, ASK QUESTIONS BEFORE DOING ANYTHING**
5. **Never create new files/systems when existing ones likely exist**
6. **Never assume user needs something built from scratch**

## ENFORCEMENT MECHANISMS

### User Trigger Phrases
- When user says "Following CLAUDE.md rules:" - Consciously apply all rules before responding
- When user says "DO NOT ASSUME ANYTHING" - Ask clarifying questions first
- When user says "ASK QUESTIONS FIRST" - Do not provide solutions, only ask questions
- When user says "STOP - READ THE RULES" - Immediately stop and re-read this section

### Assumption Prevention
- **Default response to requests: Ask clarifying questions first**
- **Never assume user needs new code/files/systems created**
- **Always ask about existing implementations before suggesting new ones**
- **When in doubt, ask "What do you have already?" or "Show me your current setup"**

## MANDATORY PRE-RESPONSE CHECKLIST

**BEFORE RESPONDING TO ANY REQUEST:**
1. **Read this request carefully** - What exactly is being asked?
2. **Check: Am I making assumptions?** - Am I assuming something that wasn't explicitly stated?
3. **Check: Should I ask clarifying questions first?** - Do I need more information before proceeding?
4. **If yes to either check, ASK QUESTIONS BEFORE DOING ANYTHING**
5. **Never create new files/systems when existing ones likely exist**
6. **Never assume user needs something built from scratch**

## ENFORCEMENT MECHANISMS

### User Trigger Phrases
- When user says "Following CLAUDE.md rules:" - Consciously apply all rules before responding
- When user says "DO NOT ASSUME ANYTHING" - Ask clarifying questions first
- When user says "ASK QUESTIONS FIRST" - Do not provide solutions, only ask questions
- When user says "STOP - READ THE RULES" - Immediately stop and re-read this section

### Assumption Prevention
- **Default response to requests: Ask clarifying questions first**
- **Never assume user needs new code/files/systems created**
- **Always ask about existing implementations before suggesting new ones**
- **When in doubt, ask "What do you have already?" or "Show me your current setup"**

## Notes

- This CLAUDE.md file should be updated as the Discord bot project grows
- Add specific build, test, and deployment commands once they are established
- Document any Discord API patterns or bot-specific conventions used in the codebase
- Repository: https://github.com/Jizar07/RedM--Empressas