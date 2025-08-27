# Changelog

All notable changes to this project will be documented in this file.
This file is synchronized with: https://github.com/Jizar07/RedM--Empressas

## Version History

### [0.020] - 2025-08-27 **[CURRENT]**
- **MAJOR ARCHITECTURE OVERHAUL**: Replaced continuous polling with proper event-driven real-time updates
- **Event-Driven System**: Browser extension dispatches immediate `newDiscordMessage` events when Discord activity detected
- **Performance Revolution**: Eliminated second-by-second polling, now only 60-minute safety sync + instant event updates
- **Enhanced User Management**: Complete overhaul of user analytics with clickable column sorting, detailed inventory breakdowns
- **Advanced User Analytics**: Comprehensive modal with financial summaries, inventory totals by specific item types
- **Item Translation Integration**: Fixed item name display across all components using centralized translation system
- **Bank Balance Dashboard**: Added real-time bank balance card parsing "Saldo após depósito/saque" from Discord messages
- **React Performance Optimization**: Added memoization to prevent infinite re-renders, fixed React Strict Mode issues
- **Global State Management**: Implemented singleton patterns to prevent duplicate intervals and resource leaks
- **Improved UX**: Clickable table headers, activity counters, responsive 5-card dashboard layout

### [0.019] - 2025-08-27
- **Complete Financial Transaction Display Overhaul**: Fixed redundant display format and improved transaction categorization
- **Proper Sales vs Direct Deposit Parsing**: Added separate parsing for sales deposits (with "Ação:" field) vs direct deposits
- **TypeScript Compilation Fixes**: Updated target to ES2018, fixed downlevelIteration and type assertion errors
- **Enhanced Display Format**: Implemented clean format - Sales: "Zero Bala vendeu 4 animais no matadouro por $160.00", Direct: "Jizar Stoffeliz depositou $4000.00"
- **Improved Regex Patterns**: Added negative lookahead to prevent sales from being categorized as direct deposits
- **Transaction Type Distinction**: Sales marked as 'venda', direct deposits as 'deposito', withdrawals as 'saque'
- **Frontend Error Resolution**: Fixed all TypeScript compilation errors and improved display logic

### [0.018] - 2025-08-26
- **Dashboard Money Transaction Display Fix**: Fixed formatting of financial transactions in frontend dashboard
- **Proper Transaction Parsing**: Corrected SAQUE and DEPÓSITO message parsing to extract actual usernames from message content
- **Display Format Standardization**: Implemented [USERNAME] [DESCRIPTION] [AMOUNT] format as requested
- **Removed Bot Author Artifacts**: Eliminated "Unknown" and "Spidey Bot" authors, now showing actual player names
- **Enhanced Regex Patterns**: Created specific patterns for withdrawals (sacou do caixa) and deposits (vendeu animais no matadouro)
- **File Recovery**: Restored accidentally deleted discord-messages.json file containing 60 captured messages
- Technical implementation:
  - Updated /api/webhook/channel-messages/route.ts parseDiscordMessage() function
  - Fixed displayText generation to return proper format strings
  - Enhanced regex patterns for proper username extraction from Discord content
  - Removed confidence fields and simplified parsing logic
- Status: Dashboard now displays transactions correctly without duplicate usernames or amounts

### [0.017] - 2025-08-25
- **🔒 MAJOR: Complete Farm Service Role-Based Security & Comprehensive System Fixes**: Implemented comprehensive role-based security system with complete audit trail and resolved multiple critical system issues
- **Role-Based Button Visibility**: Implemented dynamic button visibility system where Accept/Edit/Reject/Pay buttons only show for users with configured permissions
- **Permission Validation System**: Added userHasPermission() function with comprehensive role checking against farm-service-config.json (acceptRoles, editRoles, rejectRoles)
- **Complete Audit Trail Implementation**: Added full accountability tracking showing who approved, edited, rejected, and paid for each service
- **Frontend Connection Issues Fixed**: Resolved "connection error when saving settings" with automatic backend discovery system testing ports 3000, 3050, 8080, 8086
- **Orders System Interaction Fix**: Resolved critical "interaction failed" error when clicking "fazer encomenda" button by merging duplicate InteractionCreate event handlers
- **Pay All Receipt Complete Display**: Fixed Pay All receipts to show ALL services instead of limiting to first 5, with proper numbering and approval information
- **Enhanced Service Display**: Both persistent and final receipts now show complete service history with format: "1. 🐄 3 Ovino - $180.00 (✅ jizarstoffel)"
- **Pinned Message Preservation**: Pay All cleanup now preserves pinned messages while clearing other content
- **Comprehensive Security Logging**: Added detailed permission checking logs with role validation for debugging and audit purposes
- Technical implementation:
  - Enhanced farm service system with role-based visibility using dynamic permission checks
  - Fixed duplicate event handler conflict by merging orders handling into main interactionCreate.ts
  - Implemented backend auto-discovery with timeout protection and retry mechanisms
  - Added complete audit trail with approvedBy, editedBy, and paidBy tracking throughout service lifecycle
  - Enhanced receipt display with Discord character limit handling and intelligent truncation
  - Updated service storage to include approval and editing metadata for complete transparency
- Files modified:
  - src/bot/commands/farm/submit-service.ts - Major security enhancements, audit trail, complete service display
  - src/bot/events/interactionCreate.ts - Merged orders handling to resolve interaction conflicts
  - frontend/components/FarmServiceSettings.tsx - Backend discovery, enhanced role selection with retry logic
  - src/api/routes/discord-roles.ts - Improved error handling and debugging capabilities
  - src/bot/events/ordersInteraction.handler.ts - Renamed to prevent duplicate event registration
- Security features:
  - ✅ Role-based button visibility (users only see buttons they can use)
  - ✅ Permission validation on all interactions with fallback security
  - ✅ Complete audit trail from submission through payment
  - ✅ Enhanced error handling and debugging throughout
  - ✅ Configurable role permissions with real-time validation
- Status: 🟢 Production-ready system with complete security, audit trail, and all critical issues resolved

### [0.016] - 2025-08-25
- **Complete Farm Service Role-Based Security Implementation**: Implemented comprehensive role-based permission system for all farm service actions
- **Enhanced Audit Trail**: Added complete tracking of who approved, edited, rejected, and paid for services
- **Fixed Frontend Connectivity**: Resolved connection errors with backend auto-discovery system
- **Orders System Integration**: Fixed interaction handling conflicts between farm and orders systems
- **Complete Service Display**: Enhanced Pay All and persistent receipts to show full service history
- **System Integration**: All major components working together with comprehensive error handling

### [0.015] - 2025-08-25 **[RESTORE POINT]**
- **Pre-Farm System Security Update**: Established restore point before implementing major role-based security changes
- **System State Backup**: Complete working state captured including farm services, registration system, and frontend functionality
- **Recovery Point**: Commit available for instant rollback if major changes cause issues during development

### [0.014] - 2025-08-25
- **Enhanced Farm Service Management**: Added comprehensive CRUD operations and advanced filtering/sorting capabilities
- **Fixed ServerMonitor Issues**: Resolved Socket.io dependency problems with REST API integration
- **Improved Service History**: Complete player search, summaries, and receipt history display
- **Enhanced Error Handling**: Fixed bot crashes from expired Discord interactions

### [0.013] - 2025-08-24
- **Fixed Discord User Registration System Emergency**: Registration button in #registre-se channel completely non-functional
- **Root Cause**: File `registrationInteraction.ts` was renamed to `.disabled` preventing button handler from loading
- **Fix Applied**: Renamed `registrationInteraction.ts.disabled` back to `registrationInteraction.ts` to restore functionality
- **Related Issue Found**: `ordersInteraction.ts.disabled` also discovered (orders system may be affected)
- **Context**: Issue discovered while attempting Socket.io implementation for frontend real-time updates
- **User Impact**: Critical - users unable to register on Discord server, extreme frustration
- **Resolution Time**: Immediate fix once root cause identified
- **Status**: ✅ Registration button handler restored and functional

### [0.012] - 2025-08-24
- **Fixed ServerMonitor Real-Time Data Display - CORS Issue Resolved**: Completely resolved critical issue preventing ServerMonitor from displaying real RedM server data
- **CORS Proxy Solution**: Created three Next.js API routes to bypass browser CORS restrictions:
  - `/api/server-proxy/info` - Server information and resource list (working)
  - `/api/server-proxy/players` - Complete player list with ping data (316+ players)
  - `/api/server-proxy/dynamic` - Real-time player count and server status (316/2048 online)
- **Real Data Display Verified**: ServerMonitor now shows actual live RedM server data instead of fake 0/64 fallback:
  - Server name: "ATLANTA SEASON 2 - 3 ANOS ONLINE"
  - Player count: 316+ out of 2048 maximum slots
  - Complete player list with names and ping values
  - Real-time updates every 30 seconds without page refresh
- **Enhanced User Experience**: Added spinning refresh button with loading states and comprehensive error handling
- **Configuration Fix**: Removed conflicting Next.js proxy configuration that was interfering with new API routes
- **Worker Functionality Removal**: Completed removal of all worker linking functionality as requested by user
- **Independent Operation**: ServerMonitor now fully standalone without backend dependencies
- Technical implementation:
  - Created three API proxy routes using Next.js 14 App Router with server-side fetching
  - Updated ServerMonitor component to use proxy routes instead of direct HTTPS calls
  - Fixed next.config.js by removing blanket `/api/*` proxy to port 3050
  - Enhanced fetchServerData() with isRefreshing state and visual feedback
  - Removed all worker-related interfaces, state variables, and UI components
  - Added comprehensive error handling for server offline states
- Root cause analysis:
  - Browser CORS policies prevented direct calls from localhost:3051 to RedM server
  - Next.js proxy configuration was intercepting API routes before they could execute
  - Component was falling back to mock data when real API calls failed silently
  - User frustration: "why does it say 0/64 players online when reality is 313/2048"
- Files created:
  - /app/api/server-proxy/info/route.ts - Server info proxy with HTTP endpoint
  - /app/api/server-proxy/players/route.ts - Players data proxy with HTTP endpoint
  - /app/api/server-proxy/dynamic/route.ts - Dynamic server data proxy with HTTP endpoint
- Files modified:
  - /components/ServerMonitor.tsx - Updated API calls, removed worker functionality, enhanced UX
  - /next.config.js - Removed conflicting proxy configuration blocking API routes
- Testing verified:
  - API routes return real server data: 316+ players online, server name, complete player list
  - ServerMonitor displays actual live data from RedM server at 131.196.197.140:30120
  - Real-time updates work without page refresh using 30-second polling
  - Enhanced refresh button shows loading states and prevents duplicate requests
- Status: 🟢 ServerMonitor fully functional with real-time RedM server data display
- **CRITICAL ISSUE RESOLVED**: User can now see actual 316+ players online instead of fake 0/64 data

### [0.011] - 2025-08-24
- **Added Basic Moderation Commands and Frontend Management**: Implemented comprehensive moderation system foundation
- **Created /clear Command**: Bulk message deletion with filters for user and content (1-100 messages), requires ManageMessages permission
- **Built ModerationSettings Component**: Complete frontend interface for managing bot moderation features with three tabs
- **Implemented Moderation API**: Backend endpoints at `/api/moderation/config` for loading/saving moderation settings
- **Designed Three-Tab Interface**:
  - Clear Command Settings: Enable/disable, default limit, require reason, log channel configuration
  - Auto Moderation Settings: Language filter, spam protection, caps limit, max mentions/emojis, custom word filtering
  - Auto Reply Settings: Keyword-based auto responses with exact/partial match support
- **Integrated into Admin Panel**: Added Moderation Settings section with Gavel icon in admin dashboard
- **File-Based Configuration**: Persistent storage using `/data/moderation-config.json`
- **TypeScript Compliance**: Fixed all type errors and build issues for clean compilation
- Technical implementation:
  - Created `/src/bot/commands/moderation/clear.ts` with Discord.js v14 slash command structure
  - Built `/frontend/components/ModerationSettings.tsx` with React hooks and tabbed interface
  - Added `/src/api/routes/moderation.ts` for configuration management
  - Updated frontend routing to include moderation-settings tab
  - Fixed TypeScript errors (unused parameters, missing types, return paths)
- Files created/modified:
  - src/bot/commands/moderation/clear.ts - Clear command implementation
  - frontend/components/ModerationSettings.tsx - Complete moderation UI
  - src/api/routes/moderation.ts - Configuration API endpoints
  - frontend/app/page.tsx - Admin panel integration
  - src/api/server.ts - API route registration
- Features ready for future implementation:
  - Auto-moderation logic framework (structure ready, implementation pending)
  - Auto-reply system framework (structure ready, implementation pending)
  - Custom word filtering system (UI complete, backend logic pending)
- Status: 🟢 Clear command functional, moderation framework established

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