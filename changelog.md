# Changelog

All notable changes to this project will be documented in this file.
This file is synchronized with: https://github.com/Jizar07/RedM--Empressas

## Version History

### [0.056] - 2025-10-08 **[CURRENT VERSION]**
- **CRITICAL BUG FIX**: Adubo3 double-deduction causing worker underpayment by $225+ per session
- **PAYMENT ACCURACY**: Workers now correctly paid for all work minus single Adubo3 deduction
- **KEY FIX**:
  - Removed duplicate Adubo3 cost deduction from `recalculateSessionCredits()` function
  - Previously: Adubo3 deducted twice (once from aduboCost in calculation, again in embed display)
  - Now: Single deduction in embed by counting all Adubo3 plantTransactions
  - Example: Romano Delaerva was paid $3675.75, correct amount is $3900.75 ($225 difference)
- **TECHNICAL DETAILS**:
  - Removed lines 710-718 from WorkerActivityService.ts that deducted `expectation.aduboCost`
  - Embed display calculation (lines 1440-1448) remains as the single source of truth
  - Workers with seedExpectations containing aduboCost were systematically underpaid
- **FILES MODIFIED**:
  - src/services/WorkerActivityService.ts - Removed duplicate aduboCost deduction logic
- **IMPACT**: Past sessions with Adubo3 usage were underpaid. Future sessions calculate correctly.

### [0.055] - 2025-10-08
- **CONFIGURABLE COST SETTINGS**: Server-specific raising costs for accurate profit calculations
- **PLANT REVENUE CALCULATION FIX**: Corrected 2000 plants = $1000 mission (was 4000 incorrectly)
- **ANALYTICS ACCURACY**: Comprehensive analytics now account for server-specific Berçário/Veterinária costs
- **KEY FEATURES**:
  - PaymentConfig interface extended with costPerUnit fields (plants, animals)
  - Payment Settings UI with "Raising Costs" section for seed and animal feed costs
  - Backend analytics subtract configurable raising costs from material profit
  - Frontend analytics use dynamic costs fetched from payment config API
  - Multi-server support: Standard servers ($0 seeds, $23 animals) vs servers with farms ($0.01 seeds, $3.50 animals)
- **CALCULATION CORRECTIONS**:
  - Fixed plant divisor from 4000 to 2000 in comprehensive-analytics.ts:243
  - Workers now correctly profit $0.125/plant ($0.375 revenue - $0.25 payment)
  - Managers break even at $0.25/plant ($0.25 revenue - $0.25 payment)
  - Animal profit calculation: materialValue - (quantity × animalCostPerUnit)
  - Cost display: (totalPlants × plantCost) + (totalAnimals × animalCost)
- **TECHNICAL IMPLEMENTATION**:
  - Extended PaymentConfigService interface with costPerUnit for plants and animals
  - Created frontend API proxy routes: /api/payment-config and /api/payment-config/reset
  - Added config loading in comprehensive-analytics route handler
  - Enhanced frontend with loadPaymentConfig() to fetch costs on mount
  - Added validation for costPerUnit fields (must be non-negative)
- **FILES MODIFIED**:
  - src/services/PaymentConfigService.ts - Interface and default cost values
  - src/api/routes/payment-config.ts - Cost validation
  - src/api/routes/comprehensive-analytics.ts - Plant divisor fix, config loading, cost subtraction
  - frontend/components/PaymentSettings.tsx - Cost input fields UI
  - frontend/components/ComprehensiveAnalytics.tsx - Dynamic cost calculation
  - frontend/app/api/payment-config/route.ts - Proxy endpoint
  - frontend/app/api/payment-config/reset/route.ts - Reset endpoint
- **RESULT**: Analytics accurately reflect profit margins with server-specific costs. Servers with Berçário/Veterinária show higher profitability ($3.50 vs $23 animal costs). Plant revenue doubled from correction.

### [0.053] - 2025-10-04
- **WORKER PAYMENT ENHANCEMENT**: Complete unregistered plant detection and retroactive payment system
- **CATEGORY PERSISTENCE FIX**: Frontend inventory category changes now persist across refreshes
- **AUTO CHANNEL CLEANUP**: Worker channels automatically cleared on payment, keeping only pinned receipts
- **GLOBAL CATEGORY SYSTEM**: Comprehensive category customization with file-based persistence
- **RETROACTIVE PLANT DETECTION**: Scans Discord history to find plants deposited before categorization
- **KEY FEATURES**:
  - Frontend 3-step merge process preserves category customizations during inventory refresh
  - Backend ItemTranslationService with priority-based category system (customizations → hardcoded → detection)
  - scanForUnregisteredPlants() detects historical plant deposits using current categorization
  - clearWorkerChannel() bulk-deletes unpinned messages on payment completion
  - Unregistered plants displayed in separate "Detectadas Hoje" section in worker embeds
  - Payment calculations include both registered and unregistered plant transactions
- **TECHNICAL IMPLEMENTATION**:
  - Created `data/custom_item_categories.json` for persistent category overrides
  - Enhanced `useInventoryManager.ts` with 3-step merge (persistent file → Discord → merge)
  - Modified `ItemTranslationService.ts` with category customization loading and priority system
  - Added `/api/localization/category` POST endpoint for dynamic category updates
  - Updated `WorkerSession` interface with `unregisteredPlants` property
  - Implemented historical message scanning from session.startTime (up to 100 messages)
  - Integrated channel cleanup into payment flow with timing delay for embed pinning
- **BUG FIXES**:
  - Fixed category changes reverting on refresh (inventory rebuild was overwriting customizations)
  - Fixed Discord API limit error (changed limit from 200 to 100 messages)
  - Fixed category save in fallback creation path with direct state update
  - Fixed 404 errors when updating non-existent items by creating and saving category
- **FILES MODIFIED**:
  - frontend/hooks/useInventoryManager.ts - 3-step merge process and category preservation
  - src/services/ItemTranslationService.ts - Category customization system with file loading
  - src/api/routes/localization.ts - Category POST and reload endpoints
  - src/services/WorkerActivityService.ts - Unregistered plant detection, credit calculation, embed display, channel cleanup
- **RESULT**: Workers now get paid for ALL deposited plants (registered + historical) with automatic channel cleanup keeping only receipts

### [0.052] - 2025-09-30
- **UNIVERSAL DARK MODE IMPLEMENTATION**: Complete dark mode coverage across all frontend firm components
- **SYSTEMATIC APPROACH**: Identified and fixed 10+ components with batch sed commands for efficiency
- **COMPREHENSIVE PATTERNS**: Applied consistent dark mode styling for backgrounds, text, borders, badges
- **HOVER STATE FIX**: Resolved user-reported issue where light backgrounds appeared on mouse hover
- **COMPONENTS UPDATED**:
  - Bercário: Inventory, Clients, Analytics, Payments
  - Fazenda: Workers, Analytics, Dashboard Template
  - Ferrovia: Dashboard, Payments, Workers
  - Veterinária: Workers
- **STYLING PATTERNS**:
  - Backgrounds: `bg-white dark:bg-gray-800`, `bg-gray-50 dark:bg-gray-700`
  - Text: `text-gray-900 dark:text-white`, `text-gray-600 dark:text-gray-300`
  - Borders: `border-gray-200 dark:border-gray-700`
  - Badges: `bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300`
  - Hovers: `hover:bg-gray-50 dark:hover:bg-gray-700`
- **FILES MODIFIED**: BercarioInventory.tsx, BercarioClients.tsx, BercarioAnalytics.tsx, BercarioPayments.tsx, FazendaWorkers.tsx, FerroviaDashboard.tsx, FerroviaPayments.tsx, FerroviaWorkers.tsx, VeterinariaWorkers.tsx, TemplateFirmDashboard.tsx
- **RESULT**: Complete dark mode support across entire frontend with no light backgrounds in dark mode

### [0.051] - 2025-09-30
- **TEMPLATE SYSTEM OVERHAUL**: Complete replacement of generic templates with working system templates from Cabra da Peste
- **4 NEW FIRM TEMPLATES**: Created Fazenda (🌾), Ferrovia (🚂), Berçário (🐣), Veterinária (🏥) templates based on proven working systems
- **FERROVIA TEMPLATE ACCURACY**: Correctly configured without inventory component, matching actual working system
- **TEMPLATE STRUCTURE**: Each template includes proper components, theme colors, features, and data mapping
- **DATA PRESERVATION**: Original working firms remain untouched - templates are clean structure-only copies
- **MULTI-SERVER READY**: Templates prepared for deployment across multiple Discord servers with clean slate data
- **REMOVED OLD TEMPLATES**: Deleted fazenda-bw, generic, custom templates in favor of real working system templates
- **KEY FEATURES**:
  - FAZENDA_TEMPLATE: Dashboard, Estoque, Trabalhadores, Análises (green theme #16a34a)
  - FERROVIA_TEMPLATE: Dashboard, Trabalhadores, Análises, Pagamentos (emerald theme #059669) - NO inventory
  - BERCARIO_TEMPLATE: Dashboard, Inventário, Trabalhadores, Análises, Pagamentos (green theme)
  - VETERINARIA_TEMPLATE: Dashboard, Estoque, Trabalhadores, Análises (green theme)
- **TECHNICAL CHANGES**:
  - Updated `frontend/types/firmTemplates.ts` with 4 new template configurations
  - Modified `frontend/components/FirmTemplateRenderer.tsx` to handle new template types
  - Updated `frontend/components/EnhancedFirmConfigModal.tsx` interface and default values
  - Changed template type union from `'fazenda-bw' | 'generic' | 'custom'` to `'fazenda' | 'ferrovia' | 'bercario' | 'veterinaria'`
- **RESULT**: Template system now uses battle-tested structures from production server, ready for multi-server firm creation

### [0.050] - 2025-09-27
- **BERCARIO GLOBAL NAMING SYSTEM**: Complete Portuguese translation system for Bercario purchases (common_portion_pig → "Ração Suíno", pig_male → "Porco", sheep_female → "Ovelha Femea", book → "Livro")
- **BERCARIO WEEKLY SALES TRACKING**: Replaced "Saldo do Banco" with real-time weekly sales calculation from Sunday 00:01 to Saturday 23:59 with auto-reset
- **CONDITIONAL FIRM LOGIC**: All changes isolated to Bercario only (`firm.id === 'bercario'`) with proper fallbacks for other firms
- **REAL-TIME CALCULATION**: Weekly sales calculated directly from activities data without backend dependency, updates every 60 seconds
- **PATTERN MATCHING FIX**: Corrected message parsing to match actual Discord format ("na loja" vs "na loja por")

### [0.049] - 2025-09-25
- **VETERINARIA MATERIAL FLOW TRACKING**: Complete implementation of cross-channel material tracking system for Veterinaria workers
- **WORKER NAME CONSOLIDATION**: Fixed worker duplicate issues by merging workers with same username but different user IDs
- **REGEX PATTERN OPTIMIZATION**: Enhanced Discord message parsing with flexible patterns for "Item adicionado::" and "Item removido::" formats
- **CROSS-FIRM CORRELATION**: Successfully implemented correlation between inventory data and Discord channel logs across Veterinaria, Bercario, and Fazenda
- **MODAL INTERFACE ENHANCEMENT**: Eye icon modal system with tabbed interface showing material balance, flow diagrams, recipe tracking, and timeline
- **RECIPE DETECTION SYSTEM**: Automated detection of Libidgel crafting attempts with ingredient progress tracking
- **KEY FEATURES**:
  - Material flow tracking from Veterinaria to Bercario/Fazenda deposits
  - Recipe completion detection for 4 Libidgel variants (Bovino, Suíno, Aviário, Caprino)
  - Missing material detection and suspicious activity alerts
  - Comprehensive worker activity correlation across multiple Discord channels
  - Enhanced debugging and logging system for troubleshooting
- **TECHNICAL IMPROVEMENTS**: Fixed circular dependencies, improved worker matching algorithms, optimized channel data fetching

### [0.048] - 2025-09-24
- **TYPESCRIPT COMPILATION FIX**: Complete resolution of all TypeScript compilation errors preventing server startup
- **EMBED FORMAT DOCUMENTATION**: Comprehensive documentation of Farm and Ferrovia embed formats with timestamp improvements
- **BOX TYPE SYSTEM CONFIRMATION**: Verified and documented all 4 configured box types in RecipeService
- **FRAUD DETECTION ENHANCEMENT**: Advanced BoxOriginAnalyzer with plant-to-box ratio analysis and external box detection
- **ARCHITECTURE IMPROVEMENTS**: Fixed multiple service singleton patterns and transaction type mismatches
- **KEY FIXES**:
  - Fixed duplicate getAllActiveSessions() method in SupplyChainService
  - Resolved variable scoping issues in MultiChannelForwarder
  - Updated transaction types from MISSION_COMPLETED to FERROVIA_MISSION_COMPLETED
  - Fixed property references from startDate to startTime in ferrovia-user-metrics
- **SYSTEM FEATURES**: DD/MM HH:mm:ss timestamps, smart summarization, transparent payment calculation, NET plant tracking
- **BOX TYPES**: Caixa de Legumes, Caixa de Verduras, Caixa de Ervas, Caixa de Frutas (25 boxes each)
- **RESULT**: System fully operational with comprehensive fraud detection and improved embed documentation

### [0.047] - 2025-09-23
- **WEEKLY RANKINGS SYSTEM FIX**: Complete overhaul of weekly ranking calculations
- **REAL CURRENT WEEK DATA**: Fixed impossible weekly numbers (144k plants) by implementing proper current week boundary parsing
- **TIMESTAMP FILTERING**: Activities now correctly filtered from Sunday 00:00 - Saturday 23:59 Brazilian timezone
- **ACCURATE CALCULATIONS**: System now shows realistic weekly totals: 31,870 plants, 172 animals, 48 Ferrovia missions
- **PROPER FORMAT**: "X plantas esta semana, Y total" format working correctly with real data
- **API ENHANCEMENT**: /api/worker-rankings/weekly returns accurate current week rankings
- **DATA INTEGRITY**: 64 worker session files properly parsed with timestamp validation
- **RANKING LEADERS**: Kenai Comanches (6,980 plants), Gaioto Silva (4,020), john Weslley (4,000) this week

### [0.046] - 2025-09-22
- **COMPLETE ARTESANATO RECIPES SYSTEM**: Added comprehensive crafting recipes system
- **12 NEW RECIPES**: All Artesanato recipes from screenshots implemented
- **RECIPE DOCUMENTATION**: Created ArtesanatoRecipes.md with complete recipe database
- **FRONTEND INTEGRATION**: All recipes visible in frontend with proper pricing
- **PRICING SYSTEM**: Added fallback prices for all new Artesanato materials
- **ORANGE COLOR THEME**: ARTESANATO category styling for visual distinction

### [0.045] - 2025-09-20
- **CRITICAL BUG FIX**: Complete Player Management System Architecture Overhaul
- **PLAYER MATCHING SYSTEM**: Fixed broken online/offline status between PlayerManagement and KnownPeople
- **ROOT CAUSE RESOLUTION**: Switched from unstable session ID matching to persistent name-based matching
- **DATA STRUCTURE CHANGE**: Updated `KnownPlayer` interface - `playerId` → `playerName` for consistency
- **BOOT ID CLARITY**: Renamed "ID" column to "Boot" to distinguish from player names, shows live boot ID
- **REAL-TIME SYNC**: KnownPeople now correctly shows current boot ID when players are online
- **DATA MIGRATION**: Automatic migration system for existing localStorage data + manual fix functions
- **VALIDATION SYSTEM**: PlayerName field protection prevents accidental anchor changes during edits
- **DEBUG TOOLKIT**: Added troubleshooting functions (`debugPlayerData`, `fixPlayerEntry`)
- **CONSISTENCY GUARANTEE**: Players maintain correct online status across login sessions
- **FILES MODIFIED**:
  - `frontend/types/index.ts` - Updated KnownPlayer interface structure
  - `frontend/lib/api.ts` - Complete storage system overhaul with migration
  - `frontend/components/PlayerManagement.tsx` - Name-based matching + Boot column
  - `frontend/components/KnownPlayersCard.tsx` - Fixed matching logic + live boot ID display

### [0.044] - 2025-09-18
- **UI/UX ENHANCEMENT**: Complete Worker Management Table Overhaul with Full Text Display
- **RANKING SYSTEM**: Implemented performance-based ranking that follows workers across all sort criteria
- **TEXT DISPLAY**: Eliminated all abbreviations - full Portuguese text throughout interface
  - "Trans." → "Transações"
  - "Perf." → "Performance"
  - "Última" → "Última Atividade"
  - "Ger./Trab." → "Gerente/Trabalhador"
- **DATA VISIBILITY**: Worker names and full Discord IDs now display without truncation
- **SMART RANKING**: #1 rank follows top performer regardless of alphabetical or other sorting
- **VISUAL CONSISTENCY**: Maintained star icon distinction for performance-based rankings
- **TABLE OPTIMIZATION**: Responsive column widths for optimal space utilization
- **FILES MODIFIED**:
  - frontend/components/FazendaCDPWorkersManagementNew.tsx - Complete table enhancement system

### [0.043] - 2025-09-17
- **ARCHITECTURAL ENHANCEMENT**: Complete Ferrovia System Singleton Pattern Implementation
- **FERROVIA FIX**: Applied singleton pattern to FerroviaSessionService resolving multiple instance issues (API server + MultiChannelForwarder)
- **SUPPLY CHAIN FIX**: Applied singleton pattern to SupplyChainService resolving massive multiple instance problem (9 separate instances)
- **VERIFICATION RELIABILITY**: Eliminated verification/reset button failures due to service instance isolation in Ferrovia system
- **SESSION CONSISTENCY**: Unified session state management across all Ferrovia operations preventing data inconsistency
- **ARCHITECTURAL PARITY**: Ferrovia system now has identical singleton architecture as farm worker system
- **FILES MODIFIED**:
  - src/services/FerroviaSessionService.ts - Singleton pattern implementation
  - src/services/SupplyChainService.ts - Singleton pattern implementation
  - src/services/MultiChannelForwarder.ts - Updated to use FerroviaSessionService singleton
  - src/api/server.ts - Updated to use FerroviaSessionService singleton
  - src/handlers/supplyChainHandlers.ts - Updated to use SupplyChainService singleton (3 locations)
  - src/bot/commands/supply-chain/status.ts - Updated to use SupplyChainService singleton (2 locations)
  - src/api/routes/webhook-receiver.ts - Updated to use SupplyChainService singleton
  - src/api/routes/supply-chain.ts - Updated to use SupplyChainService singleton
- **RESULT**: Both farm worker and Ferrovia systems now use unified singleton service architecture preventing all multiple instance issues

### [0.042] - 2025-09-17
- **CRITICAL FIX**: Complete Zombie Session Resurrection Resolution & Architecture Unification
- **SESSION INTEGRITY**: Fixed zombie sessions being reactivated after payment, preventing paid sessions from coming back to life
- **RACE CONDITION RESOLUTION**: Eliminated redundant delete/save operations causing sessions to remain in active-sessions.json after archiving
- **SINGLETON ARCHITECTURE**: Converted WorkerChannelService to singleton pattern ensuring unified session tracking across all systems
- **PAYMENT SYSTEM FIX**: Resolved "session not found" errors during payment by unifying service instances (API, MultiChannelForwarder, FerroviaSessionService)
- **ZOMBIE DETECTION**: Added comprehensive archived session validation to prevent loading dead sessions back into memory
- **PAYMENT PROTECTION**: Implemented `pending_payment` status during processing to prevent concurrent operation interference
- **PERFORMANCE OPTIMIZATION**: Created SessionCleanupService for automated session maintenance and file optimization
- **DATA CLEANUP**: Removed 6 zombie sessions that were corrupting the payment system
- **ENHANCED LOGGING**: Added detailed session lifecycle tracking for better debugging and monitoring
- **DEVELOPMENT RULES**: Enhanced CLAUDE.md with server management prohibitions for safer development workflow
- **FILES AFFECTED**:
  - Enhanced: WorkerActivityService.ts, WorkerChannelService.ts (singleton), MultiChannelForwarder.ts, FerroviaSessionService.ts
  - Created: SessionCleanupService.ts
  - Updated: API routes, CLAUDE.md development rules
- **RESULT**: Completely stable payment system with proper session isolation and unified architecture

### [0.041] - 2025-09-16
- **MAJOR ENHANCEMENT**: Complete Registration Database Cleanup & Auto-Pin System Implementation
- **DATABASE CLEANUP**: Cleaned registrations.json from 103 to 25 active workers, removed 78 duplicate/stale entries
- **WORKER MAPPING AUDIT**: Added missing channel mappings for Nelio Tavares, GraceAne Fieldstorm, and Robinho Makhachev
- **PAYMENT LOGIC FIX**: Enhanced plant payment to only pay for seed-expected plants (not Ferrovia returns)
- **AUTO-PIN SYSTEM**: Worker and Ferrovia embeds now auto-pin to prevent deletion by /clear commands
- **PRICE UPDATES**: Updated default plant price ($2.50→$0.15) and animal price ($40→$60)
- **SYSTEM INTEGRITY**: All 26 active workers now have proper channel mappings and functioning payment tracking

### [0.040] - 2025-09-15
- **CRITICAL FIX**: Resolved Worker Receipt Reactivation Issue - Sessions No Longer Revert from Paid Status
- **ROOT CAUSE**: Race condition between payment completion and new worker activity causing paid sessions to be reused
- **ENHANCED SESSION FILTERING**: WorkerActivityService now properly filters paid/rejected sessions during loading and saving
- **IMPROVED loadActiveSessions()**: Only loads sessions with "active" status, preventing paid sessions from being reloaded
- **IMPROVED saveActiveSessions()**: Only saves sessions with "active" status to prevent stale data persistence
- **RECEIPT INTEGRITY**: Paid worker receipts now remain permanent and cannot be reactivated by new transactions
- **SESSION ISOLATION**: New worker activity after payment creates fresh sessions instead of reusing paid ones
- **VERIFIED FIX**: Bot logs confirm proper session filtering with "skipped non-active sessions" messages
- **FILES MODIFIED**:
  - `src/services/WorkerActivityService.ts` - Enhanced session filtering logic in load/save methods
  - `data/worker-sessions/active-sessions.json` - Corrected session status for affected workers

### [0.039] - 2025-09-15
- **MAJOR ENHANCEMENT**: Implemented Self-Healing Worker Channel Mapping System
- **ROOT CAUSE FIX**: Resolved FerroviaSessionService caching stale channel IDs that overrode manual fixes
- **SELF-HEALING LOGIC**: FerroviaSessionService now automatically gets current channel IDs from WorkerChannelService
- **CHANNEL MAPPING CORRECTIONS**: Fixed Jizar Stoffeliz and Koda Smith channel references across all data files
- **ARCHITECTURE IMPROVEMENT**: Added WorkerChannelService dependency to FerroviaSessionService for authoritative channel lookups
- **PREVENTION SYSTEM**: System now auto-corrects when worker channels change, eliminating future manual intervention
- **ENHANCED LOGGING**: Added detailed logging for channel ID updates and corrections
- **FILES MODIFIED**:
  - `src/services/FerroviaSessionService.ts` - Added self-healing channel lookup logic
  - `data/worker-channels/worker-mappings.json` - Updated channel mappings
  - `data/ferrovia-embeds/active-embeds.json` - Auto-corrected by new logic
  - `data/worker-sessions/active-sessions.json` - Updated channel references
- **RESULT**: Eliminated "Unknown Channel" errors permanently, system maintains accuracy automatically

### [0.038] - 2025-09-14
- **CRITICAL FIX**: Resolved Missing Worker Channel Mappings for All Registered Users
- **IDENTIFIED**: 4 registered workers with 🌾 channels missing from worker-mappings.json
- **ADDED MAPPINGS**:
  - Thiago Bennett (924392622552916028) → Channel 1416785592989257878
  - Bartholomeu Dias (198538680686608384) → Channel 1416530771283546274
  - Anisio Lima (388494830483013638) → Channel 1416847554544668815
  - john Weslley (398270963969425408) → Channel 1416880519165120542
- **SYSTEM STATUS**: Bot now properly tracking 23 worker channel mappings (up from 19)
- **ROOT CAUSE**: Worker mapping API calls failing during registration since September 12th implementation
- **RESULT**: All registered workers with 🌾 channels now receive embeds properly

### [0.037] - 2025-09-14 **[RESTORE POINT]**
- **CRITICAL**: Fixed Worker Channel Mapping System for Missing Users
- **DIAGNOSED**: Thiago Bennett and other workers had registration data but missing worker-mappings.json entries
- **ROOT CAUSE**: Worker mapping API calls failing during registration process (registrationInteraction.ts:384-410)
- **RESOLVED**: Manual worker mapping creation and API registration for affected users
- **CLEANED**: Removed unused createWorkerChannelMapping method causing TypeScript compilation errors
- **RESULT**: All registered workers can now receive embeds in their channels

### [0.036] - 2025-09-14
- **MAJOR**: Fixed Worker Payment Calculation and Embed Display Transparency
- **FIXED**: Plant payment logic to pay for ALL plants deposited, not just those matching seed expectations
- **DISCOVERED**: Koda Smith's $5,486 was correct - 19,520 plants × $0.25 + animals (not inflated)
- **IMPLEMENTED**: Smart embed summarization with formatTransactionsWithSummarization() for Discord character limits
- **ADDED**: Individual transaction display with timestamps until limit, then hourly grouping
- **SEPARATED**: Seeds taken and plants deposited into distinct embed sections with timestamps
- **ENHANCED**: Transparent math display: seeds taken → expected plants → actual deposits → payment calculation
- **REMOVED**: Confusing seed expectation strikethrough display (only showed 8/21 expectations)
- **FIXED**: TypeScript compilation errors by removing unused methods
- **TECHNICAL**: Character limit handling with progressive summarization (individual → hourly groups)
- **RESULT**: Clear, transparent worker payment display showing complete transaction history and calculations

### [0.035] - 2025-09-13 **[RESTORE POINT]**
- **MAJOR**: Complete Ferrovia Button System Implementation with Manager-Only Permissions
- **REPLACED**: Non-working Analytics and Responsibilities buttons with Verified (green) and Reset (red) buttons
- **IMPLEMENTED**: Manager-only button visibility and interaction system for both Farm and Ferrovia embeds
- **ADDED**: Comprehensive permission checking using farm service configuration (acceptRoles)
- **CREATED**: ferroviaHandlers.ts with handleFerroviaVerified and handleFerroviaReset functions
- **ENHANCED**: Verified button creates receipts like farm payall functionality with session summary
- **ADDED**: Reset button clears all session data and updates embed immediately
- **FIXED**: Critical session lookup bug by using shared SupplyChainService instance
- **IMPROVED**: Portuguese translations in Ferrovia embeds via ItemTranslationService integration
- **IMPLEMENTED**: Net plant tracking system distinguishing Farm service deposits vs Ferrovia returns
- **ENHANCED**: Context-based activity classification (withdrawals - deposits) for accurate net usage display
- **TECHNICAL**: Updated FerroviaSessionService, created handler system, fixed shared service instance access
- **RESULT**: Complete manager-only button system with proper receipts, reset functionality, and Portuguese display

### [0.034] - 2025-09-12 **[RESTORE POINT]**
- **MAJOR**: Backend Workers Channel Modifications - Complete UI/UX Enhancement
- **REMOVED**: Reject button functionality completely from worker management system
- **ENHANCED**: Edit modal with comprehensive amount/quantity editing capabilities
- **ADDED**: New modal fields for editing transaction amounts (animal deliveries) and quantities (plant transactions)
- **IMPROVED**: Edit validation system requiring at least one field (name, quantity, or amount)
- **IMPLEMENTED**: Automatic credit recalculation after transaction edits to maintain accuracy
- **FIXED**: Payment button behavior to show proper paid status and remove all buttons
- **ADDED**: Visual paid status indicators (blue color, "Pago" title, "Total Pago" instead of "Total a Receber")
- **UPDATED**: API endpoints to handle new editing parameters with comprehensive validation
- **REMOVED**: All reject-related imports, handlers, and permission types from interaction system
- **ENHANCED**: Worker management workflow now streamlined to Pay and Edit only (no reject option)
- **TECHNICAL**: Updated WorkerActivityService, API routes, and handler functions for new editing capabilities
- **RESULT**: Cleaner, more efficient worker management with comprehensive editing and clear payment completion

### [0.033] - 2025-09-12 **[RESTORE POINT]**
- **CRITICAL FIX**: Worker Activity Dynamic Pricing System & Permission System
- **FIXED**: Price synchronization - removed all hardcoded $0.15 values from backend services
- **UPDATED**: Frontend authentication token for proper API communication with backend
- **RESOLVED**: Server role permissions - farm service config now uses correct Discord server roles
- **ENHANCED**: WorkerActivityService.ts, ActivityVerificationService.ts, OCRService.ts use dynamic pricing
- **CORRECTED**: farm-service-config.json updated with proper role permissions (👑│CEO, ❪★❱ Gerentes)
- **RESULT**: Worker activity system now correctly uses $0.25/plant as configured in UI
- **TESTED**: Button interactions (reject/edit/payment) fully functional with proper permissions
- **VERIFIED**: totalCredits calculation accurate: 280 plants × $0.25 = $70.00 ✅

### [0.032] - 2025-09-12 **[RESTORE POINT]**
- **MAJOR**: Complete Worker Activity Tracking System with Portuguese Translation Support
- **NEW**: ItemTranslationService with 50+ item mappings (internal names ↔ Portuguese display names)
- **ENHANCED**: WorkerChannelService integrated with translation service for Portuguese embeds
- **FIXED**: Registration system authentication issues preventing worker mapping creation
- **IMPROVED**: Direct worker activity processing in bot (eliminated frontend roundtrip inefficiency)
- **ADDED**: Comprehensive seed withdrawal detection (Bulrush_Seed → "Semente de Junco" in embeds)
- **INTEGRATED**: Worker activity system with existing registration flow for automatic mapping
- **RESOLVED**: Discord category 50-channel limit issue blocking new worker registrations
- **RESULT**: Complete worker activity tracking with Portuguese naming, flexible payments, and seamless registration
- **TECHNICAL**: Seeds → Plants → Animals tracking with real work metrics instead of rigid ratios

### [0.031] - 2025-09-11 **[RESTORE POINT]**
- **ENHANCED**: Worker Edit Modal with Comprehensive Editing Functionality - Complete redesign of edit button behavior
- **IMPROVED**: Edit button now opens actual editing interface instead of just showing navigation options
- **ADDED**: Worker Settings section with status dropdown (Active/Inactive/On Vacation/Suspended), role assignment (Worker/Supervisor/Manager/Trainee)
- **NEW**: Performance rating system with 5-star interactive rating and supervisor notes textarea
- **ENHANCED**: Activity configuration toggles for tracking, inactivity notifications, and performance alerts
- **IMPROVED**: Professional modal layout with enhanced stats display in formatted cards
- **ADDED**: Primary "Salvar Alterações" button for saving all changes made in edit interface
- **FIXED**: User feedback issue where edit button wasn't providing actual editing capabilities
- **UI/UX**: Complete modal redesign with proper sections, spacing, and warning messages about change impacts

### [0.030] - 2025-09-11 **[RESTORE POINT]**
- **ENHANCED**: Fazenda Cabra da Peste dashboard improvements and bank balance implementation
- **IMPROVED**: Activity display limits increased from 20 to 100 for both item and money activities
- **FIXED**: Bank balance display now shows actual farm balance instead of cumulative revenue total
- **ADDED**: getCurrentBankBalance() function to extract real balance from Discord messages
- **CHANGED**: "Receita Total" metric card replaced with "Saldo do Banco" showing current farm balance
- **RESOLVED**: Bank balance parsing with proper regex patterns for multiline Discord message formats
- **UI**: Removed icon from balance metric card to resolve positioning issues

### [0.029] - 2025-09-10 **[RESTORE POINT]**
- **MAJOR FEATURE**: Complete Global Naming/Translation System Implementation
- **NEW**: Global translation system for Fazenda Cabra da Peste firm with 121+ item translations
- **ENHANCED**: Backend message parsing to extract actual worker names from animal delivery transactions
- **FIXED**: Animal delivery format now shows "BONNIE BENNETT vendeu 4 animais no matadouro por $160.00" instead of "Spidey Bot depositou $160.00"
- **IMPROVED**: TemplateFirmDashboard translation integration matching FazendaBW formatting exactly
- **ADDED**: Support for "global" itemTranslations setting in firm configurations
- **RESOLVED**: Worker name extraction from "Ação:" field in Discord messages using regex pattern matching
- **VALIDATED**: Portuguese translations working across all firm components (bulrush → junco, etc.)

### [0.028] - 2025-09-10
- **MAJOR FIX**: Complete Discord Message Processing System for New Firms
- **FIXED**: MultiChannelForwarder payload format missing required `source` and `channelId` fields
- **ENHANCED**: Dynamic farm ID regex patterns - now supports any farm ID (`fazenda_\d+`) instead of hardcoded values
- **IMPROVED**: Discord message parsing to handle double colon formatting (`Autor::` and `Item removido::`)
- **RESOLVED**: New firm channels not showing Discord activity despite successful message reception
- **CONFIRMED**: Real-time message processing working across multiple users and firms
- **VALIDATED**: Individual channel log files (100-message limit) functioning correctly
- **CLEANED**: Display formatting now shows proper usernames and item names without extra colons
- **ARCHITECTURE**: Robust message flow from Discord → Bot → MultiChannelForwarder → Webhook → Storage
- **PERFORMANCE**: Efficient individual file storage system preventing cross-channel data contamination
- **RESULT**: Fully operational Discord activity tracking for all firms with clean, professional display

### [0.027] - 2025-09-10 **[RESTORE POINT]**
- **MAJOR RELEASE**: Complete Multi-Server Discord OAuth & Firm Management System
- **IMPLEMENTED**: NextAuth Discord OAuth with guild fetching and admin permission filtering
- **ADDED**: Global ServerContext for server state management across entire application
- **ENHANCED**: All API calls now automatically filtered by selected server ID via axios interceptors
- **CREATED**: Server-scoped firm management - firms restricted to pre-selected Discord servers
- **IMPROVED**: Role fetching now scoped to selected server only in firm creation
- **STREAMLINED**: Server selection workflow with automatic persistence across sessions
- **ADDED**: Clear messaging and user guidance when no server selected
- **ARCHITECTURE**: Production-ready multi-server deployment with isolated firm management
- **SECURITY**: Comprehensive permission system with proper Discord admin detection
- **SCALABILITY**: Clean separation of server contexts for unlimited Discord server support
- **RESULT**: Truly multi-server bot ready for deployment across multiple Discord communities

### [0.026] - 2025-09-05 **[RESTORE POINT]**
- **FIXED**: Discord OAuth2 localhost redirect SSL error with comprehensive authentication system overhaul
- **IMPLEMENTED**: Custom Discord OAuth callback endpoint bypassing NextAuth localhost issues
- **UPDATED**: Discord Client ID/Secret to correct application (1406656805500883104)
- **ADDED**: Automatic channel monitoring setup when creating new firms
- **RESOLVED**: All localhost SSL protocol errors in OAuth flow
- **ENHANCED**: Firm creation now automatically configures Discord channel monitoring

### [0.025] - 2025-08-30 **[RESTORE POINT]**
- **FIXED**: User deletion persistence with timestamp-based tracking system

### [0.024] - 2025-08-28 **[RESTORE POINT]**
- **FIXED**: Discord OAuth callback redirect localhost issue - Complete OAuth flow restoration for remote domain access
- **RESOLVED**: Final redirect after successful Discord authentication now goes to `https://fazenda.stoffeltech.com` instead of localhost
- **FIXED**: Token exchange redirect_uri changed from hardcoded localhost to proper domain callback URL
- **ENHANCED**: Error redirects now use domain instead of localhost-based `request.url` that was causing SSL errors
- **ELIMINATED**: "This site can't provide a secure connection" SSL protocol error from localhost redirect attempts
- **COMPLETE OAUTH FLOW**: Login → Discord authorization → fazenda.stoffeltech.com callback → successful auth → domain redirect
- **RESULT**: Users can now successfully authenticate via Discord when accessing from fazenda.stoffeltech.com without localhost redirect issues
- Technical implementation:
  - Fixed `frontend/app/api/auth/callback/discord/route.ts:23` - Token exchange redirect_uri
  - Fixed `frontend/app/api/auth/callback/discord/route.ts:45` - Final successful authentication redirect
  - Fixed `frontend/app/api/auth/callback/discord/route.ts:31,63` - Error redirect handling for proper domain use
- Status: ✅ Complete OAuth authentication system fully functional for remote domain access through Cloudflare Tunnel

### [0.023] - 2025-08-28 **[RESTORE POINT]**
- **FIXED**: Animal Service Completion Parsing - BotMessageForwarder now correctly extracts author from "Ação:" field
- **ENHANCED**: Author Detection Logic - Smart field detection for animal services vs regular deposits 
- **IMPROVED**: Message Type Intelligence - Only applies to CAIXA ORGANIZAÇÃO - DEPÓSITO messages to avoid breaking normal deposits
- **RESULT**: Animal service completions now show "Jizar Stoffeliz vendeu 4 animais no matadouro por $156.80" instead of "Spidey Bot deposited"
- **COMPATIBILITY**: Preserves existing logic for normal deposits/withdrawals with "Autor:" field

### [0.022] - 2025-08-28 **[RESTORE POINT]**
- **IMPLEMENTED**: Complete Bot Monitoring System - BotMessageForwarder service handles Discord bot's embed format
- **ENHANCED**: Channel Configuration UI with preset endpoints (Frontend/Backend/Custom) and quick-add buttons
- **FIXED**: Author Extraction - Removes "| FIXO: 75119" suffix to show clean usernames  
- **FIXED**: Aggressive Deduplication - Replaced content-based with simple message ID + timestamp approach
- **RESULT**: Bot monitoring works seamlessly, similar transactions (same amounts) no longer blocked
- **COMPATIBILITY**: System supports both extension and bot monitoring simultaneously

### [0.021] - 2025-08-27
- **FIXED**: Extension Real-Time Detection - Updated MutationObserver for instant Discord message processing
- **IMPLEMENTED**: Smart Content-Based Deduplication System using exact timestamps as pivot
- **CLEANED**: Removed 249 duplicate messages from testing (644→395 messages)  
- **FIXED**: Discord interaction timeout errors with graceful error handling
- **RESULT**: Complete real-time system with zero duplicates and instant updates

### [0.020] - 2025-08-27
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

### [0.054] - 2025-10-08
- **Language Switcher System**: Complete English/Portuguese translation with USA 🇺🇸 / Brazil 🇧🇷 flag toggle
  - Created LanguageContext with localStorage persistence (default: pt-BR)
  - 150+ translation keys organized by category (nav, dashboard, admin, servicos, firms, common)
  - SVG flag icons for cross-platform compatibility
  - useTranslation hook with nested key support
  - Translated entire main dashboard interface
- **Dashboard Reorganization**: Transformed sparse landing page into comprehensive command center
  - **Removed Admin Tab**: Eliminated redundant navigation tab
  - **Firm Quick Access Cards**: 5 prominent clickable cards (🌾 Fazenda, 🚂 Ferrovia, 🐣 Berçário, 🏥 Veterinária, 🏪 Armaria)
  - **Moved Admin Tools to Dashboard**: All 9 admin tool cards now visible on main page
  - **Streamlined Quick Actions**: Simplified to 3 essential actions (Server Status, Serviços, Channel Parser)
  - Better space utilization, organized sections, reduced navigation

### [0.042] - 2025-09-17
- **Payment System Fix**: Changed to pay workers for ALL plants deposited, not just those matching seed expectations
- **Button Logic Fix**: Pay Worker button now shows when any plants are deposited
- **Pin Message Cleanup Enhancement**: Improved deletion of Discord system messages
  - Increased detection time and message fetch limit
  - Now deletes ALL pin messages, not just first one
  - Added utility method for bulk cleanup
  - Rate limit protection with delays

---
*Note: This changelog is used for code reverts in case of problems. Each version should be tagged in the repository.*
### [0.054] - 2025-10-08 **[CURRENT VERSION]**
- **ADUBO3 DEDUCTION SYSTEM FIX**: Complete implementation of Adubo3 cost deductions in financial calculations
- **PAYMENT DISPLAY ENHANCEMENT**: Payment history now shows Discord usernames instead of user IDs
- **FINANCIAL TRANSPARENCY**: Complete itemized breakdown with timestamps for all Adubo3 deductions
- **KEY FEATURES**:
  - Frontend calculates Adubo3 deductions from plantTransactions instead of non-existent seedExpectations fields
  - Backend Discord embeds filter out Adubo3 from seed expectations (they're materials, not services)
  - Both active and paid embeds subtract Adubo3 costs from total amounts
  - Payment records display paidByName with fallback to paidBy for username resolution
  - Deductions section shows individual Adubo3 withdrawals with timestamps and costs
- **TECHNICAL IMPLEMENTATION**:
  - Modified `FazendaCDPWorkersManagementNew.tsx` Aguardando Pagamento tab:
    - Lines 1736-1753: Calculate deductions by scanning plantTransactions for seed_taken Adubo3
    - Lines 2024-2073: Build itemized deductions list with timestamps from actual transactions
    - Line 1747: Subtract totalDeductions from totalCredits for accurate payment total
  - Modified `WorkerActivityService.ts` Discord embeds (4 locations):
    - Lines 1217-1245, 1531-1553: Filter Adubo3 from seed expectations display
    - Lines 1385-1402, 1686-1702: Calculate and subtract Adubo3 deductions from totals
  - Modified payment display in 4 frontend locations to use paidByName || paidBy pattern
  - Adubo3 cost calculation: quantity × $0.75 per unit
- **BUG FIXES**:
  - Fixed deductions not appearing because code looked for aduboCost field that didn't exist in data
  - Fixed Total a Receber showing credits without subtracting deductions
  - Fixed payment history showing Discord IDs (1127730801182777355) instead of usernames (r3dley)
  - Fixed Adubo3 entries cluttering seed expectations section
- **DISPLAY IMPROVEMENTS**:
  - Deductions show as: "🌿 Adubo3: 200 unidades" with timestamp "07/10, 07:37" and cost "-$150.00"
  - Subtotal Deduções displays total of all Adubo3 costs
  - Total a Pagar correctly shows: Credits - Deductions = Final Amount
  - Payment history displays: "Pagamento #0 por r3dley $2987.50" with proper username
- **FILES MODIFIED**:
  - `frontend/components/FazendaCDPWorkersManagementNew.tsx` (deduction calculation, payment display)
  - `src/services/WorkerActivityService.ts` (embed filtering and total calculations)
- **RESULT**: Workers and managers see accurate financial breakdown with complete Adubo3 cost transparency, proper deductions from payment totals, and readable payment history with Discord usernames
