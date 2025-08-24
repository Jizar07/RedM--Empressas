# Changelog

All notable changes to this project will be documented in this file.
This file is synchronized with: https://github.com/Jizar07/RedM--Empressas

## Version History

### [0.010] - 2025-08-24 **[RESTORE POINT]**
- **🎉 COMPLETE DISCORD FARM SERVICE UI/UX OVERHAUL - ALL WORKING**: Resolved all major user interface and workflow issues
- **Fixed Message Dismissal System**: All selection dropdowns (service type, animal type, plant type) now properly dismiss after user selection with clear confirmation messages
- **Fixed Receipt Creation Flow**: Persistent receipts now created IMMEDIATELY when admin clicks "Accept Service" - no longer delayed until "Pay Now"
- **Fixed Pay All Functionality**: Resolved "No receipt found" errors by fixing player name parsing for multi-word names and improving error handling
- **Fixed Modal Interaction Error**: Resolved InteractionAlreadyReplied error in plant selection by reordering interaction flow to show modal before updating message
- **Fixed Receipt Ordering**: Updated receipts now delete old message and create new one at bottom below new services for proper chronological order
- **Fixed Duplicate Payment Messages**: Eliminated duplicate final payment messages by removing redundant message creation in handleFinalPayment()
- **Enhanced Error Handling**: Added comprehensive logging and better error messages throughout entire workflow
- **Improved User Experience**: Combined plant selection confirmation with quantity modal response for smoother interaction flow  
- **Code Architecture Enhancement**: Added updatePersistentReceiptPaidStatus() function for proper individual payment tracking
- **TypeScript Compilation**: All builds pass without errors, comprehensive type safety maintained
- **🎯 MARKED AS RESTORE POINT**: System working perfectly with all reported issues resolved
- Technical implementation:
  - Fixed interaction.update() calls to show selected items and remove dropdown components
  - Modified handleReceiptAccept() to immediately call createOrUpdatePersistentReceipt() 
  - Fixed player name parsing in handleFinalPayment() using customIdParts.slice(3).join('_')
  - Reordered plant selection flow to show modal before dismissing dropdown
  - Enhanced persistent receipt message management to delete old and create new at bottom
  - Removed duplicate channel.send() call in final payment processing
  - Added comprehensive error logging with file path verification
- Files modified:
  - src/bot/commands/farm/submit-service.ts - Major UI/UX fixes, receipt flow improvements
  - src/bot/events/interactionCreate.ts - Enhanced interaction handling
- Status: 🟢 ALL ISSUES RESOLVED - SYSTEM FULLY FUNCTIONAL

### [0.009] - 2025-08-22
- **Selective System Revert**: Reverted OnlineFamilyMembers functionality while preserving Discord command management system
- **Discord Commands Restored**: Maintained configurable Discord slash command creation system with Portuguese support
- **OnlineFamilyMembers Removed**: Eliminated Steam-to-Discord name matching and family member tracking system
- **TypeScript Fixes**: Resolved compilation errors (uuid package installation, Command interface compatibility)
- **Frontend Cache Fix**: Resolved Next.js build corruption by clearing .next directory
- **System Architecture**: Discord command management operational, player tracking removed as requested

### [0.008] - 2025-08-20
- **CRITICAL BUG FIX**: Resolved major inventory corruption issue caused by Discord bot historical message flooding
- **Fixed Historical Message Spam**: Disabled processAllChannelMessages() function that was sending 100+ duplicate messages to webhook on every bot restart
- **Removed Message Type Filtering**: Eliminated unnecessary INSERIR ITEM/REMOVER ITEM/FARM filtering that was blocking legitimate activities
- **Fixed Webhook Communication**: Updated webhook payload format to match receiving system requirements (channelId, messages array)
- **Eliminated 400/404 Errors**: Resolved communication issues between Discord bot and external website system
- Root cause identified:
  - Bot was processing ALL 100 historical Discord messages every time it restarted
  - Other system was calling bot API every 5 minutes and processing historical data as new activities
  - This created thousands of duplicate farm activities with embedded Discord chat history
  - Message type filtering was preventing legitimate activities like Kathryn Davis wateringcan transactions (03:05:22, 03:05:18, 03:05:10) from being processed
- Technical fixes implemented:
  - Disabled historical message processing in src/bot/events/ready.ts
  - Removed all message type filtering logic from backend APIs and frontend components
  - Fixed webhook payload format mismatch between bot and receiving system
  - Updated frontend to remove message type selection interface
  - Enhanced API endpoints to send ALL messages without arbitrary filtering
- Performance improvements:
  - Before: Bot restart caused 100+ duplicate webhook calls with historical spam
  - After: Bot restart has zero impact on webhook data, only processes NEW messages
  - Eliminated inventory system corruption completely
  - Fixed missing activity data issues
- Files modified:
  - src/bot/events/ready.ts - Removed processAllChannelMessages, cleaned unused code
  - src/bot/events/messageCreate.ts - Fixed webhook format, removed filtering
  - src/api/routes/bot-api.ts - Removed isFarmMessage filtering
  - frontend/components/ChannelLogsConfig.tsx - Removed message types interface
- System now operates cleanly:
  - Discord Bot (3050): Processes only NEW messages, sends proper webhook format
  - Frontend (3051): Clean interface without filtering, manages configurations
  - External System (8086): Receives clean webhook data without duplicates

### [0.007] - 2025-08-19
- **ANTI-FLOODING SYSTEM**: Implemented comprehensive Discord webhook message management
- **Message Update Logic**: Bot now updates existing messages instead of creating new ones
- **Website Integration**: Redirected website webhooks through bot API to prevent channel flooding
- **Message Manager Service**: Created persistent message tracking with messageType + channelId keys
- Key features implemented:
  - MessageManagerService.ts for tracking and updating Discord messages
  - Webhook receiver API at `/api/webhook/update-message` to replace Discord webhooks
  - Support for multiple message types per channel (farm_update, announcements, etc.)
  - Real-time message updates when website sends new data
  - Complete CRUD operations for managed messages
- Technical implementation:
  - POST /api/webhook/update-message - Update or create managed messages
  - DELETE /api/webhook/delete-message - Remove managed messages
  - GET /api/webhook/managed-messages - List all tracked messages
  - DELETE /api/webhook/clear-channel/:channelId - Clear channel tracking
- Website integration changes:
  - Before: Website → Discord webhook → New message every time → Channel flooding
  - After: Website → Bot API endpoint → Update existing message → No flooding
  - Payload format: `{channelId, messageType, title, description, fields, color}`
- Performance improvements:
  - Eliminated hundreds of spam messages flooding channel 1404492813290442902
  - Maximum 1 message per messageType, updated in real-time
  - Clean, organized channels with persistent status messages
- Files created:
  - src/services/MessageManagerService.ts - Core message management logic
  - src/api/routes/webhook-receiver.ts - Webhook API endpoints
  - test-webhook.js - Testing script for functionality verification
  - WEBHOOK_USAGE.md - Integration documentation
- Successfully tested message creation, updates, and multiple message types
- System ready for production use with complete anti-flooding protection

### [0.006] - 2025-08-18
- **MAJOR REGISTRATION SYSTEM OVERHAUL**: Complete rewrite of Discord registration system with critical bug fixes
- **Removed MongoDB dependency**: Converted entire system to file-based storage for improved performance and reliability
- **Fixed critical data bug**: Resolved issue where wrong functions were being assigned during registration
- **Enhanced channel creation**: Added emoji prefix support and fixed missing categoryId values for all functions
- **Removed approval system**: Eliminated requiresApproval functionality - all registrations now auto-approved
- **Fixed message flow**: Implemented proper step-by-step message dismissal using Discord interaction updates
- **Performance improvements**: Registration time reduced from 35+ seconds to under 5 seconds
- Key features implemented:
  - File-based storage system (/data/registration-config.json, /data/registrations.json)
  - Emoji prefix channel naming (🌾・, 🌿・, ❤️・, etc.)
  - Role-based channel permissions with allowedRoles arrays  
  - Progressive message replacement (steps dismiss after completion)
  - Automatic role assignment and channel creation
  - Real-time analytics with file-based data
  - Enhanced frontend with tab system (5 sections)
  - Removed all approval checkboxes and workflows
- Technical fixes:
  - Fixed tempData deletion timing bug in registrationInteraction.ts
  - Converted RegistrationService.ts to file-based only operations
  - Updated interaction handlers to use deferUpdate() for proper message flow
  - Added missing categoryId values for channel creation
  - Enhanced emoji prefix input support (including middle dot ・ character)
  - Resolved Discord role hierarchy permission issues
- System now fully functional with fast, reliable file-based operations

### [0.005] - 2025-08-17
- Implemented complete Discord OAuth2 authentication system
- Added "Login with Discord" functionality for dashboard access
- Created role-based access control with Discord server roles
- Features implemented:
  - Discord OAuth2 integration with NextAuth.js
  - Protected routes and authentication middleware
  - User session management with JWT tokens
  - Role verification (Admin, Moderator, Member)
  - Discord server membership verification
  - Audit logging for sensitive operations
- Created authentication components:
  - Login/signin/error pages
  - User menu with Discord avatar
  - Protected route wrappers
  - Role-based component guards
- Added API authentication middleware
- Secured all sensitive endpoints
- Fixed NextAuth compatibility issues with Next.js 14
- Created manual OAuth callback handler as fallback
- Configuration:
  - OAuth2 Client ID: 1406799740108017674
  - Guild ID: 1205749564775211049
  - Scopes: identify, guilds, guilds.members.read

### [0.004] - 2025-08-17
- Added comprehensive Discord channel parsing and webhook integration system
- Created ChannelParserService with Discord embed content extraction
- Implemented `/parse-channel` Discord slash command with admin permissions
- Built complete frontend interface with "Channel Parser" tab
- Added REST API endpoints for channel parsing and preview
- Features:
  - Parse messages from any Discord channel by ID
  - Extract content from Discord embeds (titles, descriptions, fields)
  - Send structured JSON data to external webhooks
  - Filter by user ID, keywords, date ranges, and message limits
  - Real-time preview functionality
  - Comprehensive error handling and validation
- Enhanced embed parsing to handle complex Discord message formats
- Fixed issue where embed-only messages showed "[No content]"
- Added TypeScript types and comprehensive testing

### [0.003] - 2025-08-17
- Created complete Next.js 14 frontend dashboard
- Implemented Atlanta Server management tab with real-time data
- Added comprehensive player management system
- Features:
  - Real-time server status monitoring (players: 121/2048)
  - Advanced player list with sorting and filtering
  - Known player system with custom fields (display name, job, position, IDs)
  - Local storage persistence for player data
  - Responsive design with Tailwind CSS
  - API integration with live server data
- Updated ports: Backend (3050), Frontend (3051)
- Connected to Atlanta RedM server (131.196.197.140:30120)

### [0.002] - 2025-08-17
- Implemented core Discord bot functionality with TypeScript
- Added Discord.js v14 integration with slash commands
- Created RedM server integration service
- Implemented REST API server with Express.js
- Added Socket.io for real-time updates
- Created command structure (info, admin, redm categories)
- Added MongoDB database service with retry logic
- Implemented basic commands: ping, status
- Created comprehensive project documentation

### [0.001] - 2025-01-17
- Initial project setup
- Created changelog.md for version tracking
- Created devlog.md for local development tracking
- Created CLAUDE.md for AI assistant guidance
- Repository: https://github.com/Jizar07/RedM--Empressas

---
*Note: This changelog is used for code reverts in case of problems. Each version should be tagged in the repository.*