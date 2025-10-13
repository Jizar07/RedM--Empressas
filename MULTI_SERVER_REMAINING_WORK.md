# Multi-Server Implementation - Remaining Work Plan

## Project Status: 45% Complete

**Last Updated:** 2025-10-13
**Version:** v0.072

---

## ✅ Phase 1: Data Migration (COMPLETE)

- [x] Create migration script with 4-phase process
- [x] Migrate 302 files from flat structure to server-specific directories
- [x] Transform 3 config files to server-based structure
- [x] Verify zero data loss
- [x] **Result:** Cabra da Peste data safely migrated to `data/*/1274479410107646004/`

---

## ✅ Phase 2: Backend Services (COMPLETE)

All 6 core services updated with multi-server support:

### Completed Services:
1. [x] **WorkerActivityService** (v0.064) - Farm worker session management
2. [x] **SupplyChainService** (v0.065) - Ferrovia supply chain tracking
3. [x] **WeeklyRankingService** (v0.066) - Weekly worker rankings with date-range filtering
4. [x] **WeeklySalesService** (v0.067) - Weekly sales tracking
5. [x] **PaymentAuditService** (v0.068) - Payment verification and manager withdrawals
6. [x] **FirmConfigService** (v0.069) - Firm configuration management

### Pattern Established:
- `serverId?` parameter on all public methods
- Path helper methods with fallback to legacy
- Map-based config caching per server
- Multi-server load: scan all numeric directories + legacy
- Multi-server save: group by serverId, write to respective paths
- Atomic writes where applicable

---

## 🔄 Phase 3: API Routes (15% COMPLETE)

### ✅ Completed API Routes (5/~34):

1. [x] **worker-rankings.ts** (v0.070)
   - GET /weekly, /weekly/stats, /weekly/prizes
   - All endpoints accept serverId query param

2. [x] **firms-config.ts** (v0.070)
   - GET /, /:firmId, /system/settings, /system/monitored-channels
   - POST /, /system/reload
   - PUT /:firmId, /system/settings
   - PATCH /:firmId/toggle
   - DELETE /:firmId
   - 9 endpoints fully updated

3. [x] **supply-chain.ts** (v0.071)
   - POST /session, /transaction, /revenue-distribution, /maintenance/check-overdue
   - GET /session/:workerId, /sessions, /accountability/:workerId, /responsibilities, /analytics
   - DELETE /session/:workerId
   - 10 endpoints fully updated

4. [x] **weekly-sales.ts** (v0.072)
   - GET /current, /current/details, /all, /week/:weekIdentifier
   - POST /transaction
   - DELETE /cleanup
   - 6 endpoints fully updated

5. [x] **payment-config.ts** (Already complete)
   - GET /, /defaults
   - POST /, /reset
   - All endpoints already have serverId support

### 🚧 High-Priority Routes (Remaining):

#### **worker-activity.ts** (COMPLEX - Estimated 3-4 hours)
**Status:** Not started
**Complexity:** HIGH - Requires WorkerChannelService refactoring
**Endpoints to update (13):**
- POST / - Process worker transaction
- GET /mapping/:workerId - Get worker channel mapping
- POST /mapping - Register worker channel
- GET /mappings - Get all worker mappings
- GET /sessions - Get active sessions
- POST /pay/:workerId - Pay worker
- PUT /transaction/:workerId/:transactionId - Edit transaction
- DELETE /transaction/:workerId/:transactionId - Delete transaction
- GET /all-workers - Get all registered workers
- GET /worker-details/:workerId - Get detailed worker data

**Blockers:**
1. **WorkerChannelService** needs multi-server support
2. Direct disk reads need refactoring (registrations.json, archived sessions, payments)
3. Multiple data sources need server-scoping:
   - `data/registrations.json` → `data/registrations/{serverId}/`
   - `data/worker-sessions/archived/` → `data/worker-sessions/{serverId}/archived/`
   - `data/worker-sessions/payments/` → `data/worker-sessions/{serverId}/payments/`
   - `data/ferrovia-embeds/active-embeds.json` → `data/ferrovia-embeds/{serverId}/`

**Recommended Approach:**
1. Update WorkerChannelService to accept serverId in constructor/getInstance()
2. Create helper methods for path resolution (getRegistrationsPath, getArchivedDir, etc.)
3. Update all disk read operations to use server-specific paths
4. Add serverId parameter to all API endpoints
5. Test thoroughly with both servers

---

#### **farm-service-config.ts** (Estimated 1 hour)
**Status:** Not started
**Complexity:** MEDIUM
**Endpoints to update (~8):**
- GET / - Get farm service config
- POST / - Update farm service config
- GET /monitored-channels - Get channels to monitor
- POST /reload - Reload configuration
- And others...

**Requirements:**
- May need FarmServiceConfigService (check if exists)
- Config file transformation to server-based structure
- Standard query/body parameter extraction pattern

---

#### **farm-service-data.ts** (Estimated 1 hour)
**Status:** Not started
**Complexity:** MEDIUM
**Endpoints to update (~10):**
- GET /submissions - Get all submissions
- POST /submission - Create submission
- PUT /submission/:submissionId - Update submission
- DELETE /submission/:submissionId - Delete submission
- And others...

**Requirements:**
- Uses FarmServiceDataService or similar
- Standard serverId parameter pattern

---

#### **service-submissions.ts** (Estimated 45 mins)
**Status:** Not started
**Complexity:** LOW-MEDIUM
**Endpoints:** Unknown count

---

#### **worker-payment-receipts.ts** (Estimated 30 mins)
**Status:** Not started
**Complexity:** LOW-MEDIUM
**Endpoints:** Unknown count

---

#### **worker-prices.ts** (Estimated 30 mins)
**Status:** Not started
**Complexity:** LOW
**Endpoints:** Unknown count

---

### 📊 Lower-Priority Routes (Estimated 5-8 hours total):

These routes may not need immediate multi-server support but should be evaluated:

1. **comprehensive-analytics.ts** - Analytics aggregation
2. **inventory-analytics.ts** - Inventory tracking
3. **global-worker-analytics.ts** - Worker statistics
4. **ferrovia-user-metrics.ts** - Ferrovia-specific metrics
5. **export-data.ts** - CSV export functionality
6. **discord-channels.ts** - Discord channel management
7. **guilds.ts** - Guild information
8. **orders.ts** - Order management system
9. **channel-parser.ts** - Discord message parsing
10. **registration.ts** - Worker registration
11. **webhook endpoints** - Various webhook receivers
12. **~10-15 additional routes** - Need full audit

**Recommendation:** Complete high-priority routes first, then evaluate which of these truly need multi-server support based on actual usage patterns.

---

## 📱 Phase 4: Frontend Updates (NOT STARTED)

### Required Changes:

#### 1. **ServerContext Integration** (Estimated 2 hours)
**File:** `frontend/contexts/ServerContext.tsx` (may already exist from v0.027)
**Tasks:**
- Verify ServerContext provides current serverId
- Add server selection UI if not present
- Ensure serverId persists across page navigation
- Add server switching functionality

#### 2. **useServer() Hook Integration** (Estimated 4-6 hours)
**Pattern:** All components that call API routes need to include serverId
**Affected Components (~20-30):**
- `FazendaBW.tsx` - Main farm dashboard
- `TemplateFirmDashboard.tsx` - Generic firm dashboard
- `TrabalhadoresBWManagement.tsx` - Worker management
- `FerroviaSessionTable.tsx` - Ferrovia tracking
- `WeeklyRankingsDisplay.tsx` - Rankings display
- `PaymentReceiptModal.tsx` - Payment receipts
- All firm-specific components
- All analytics components

**Example Pattern:**
```typescript
// Before:
const response = await api.get('/api/worker-rankings/weekly');

// After:
const { serverId } = useServer();
const response = await api.get('/api/worker-rankings/weekly', {
  params: { serverId }
});
```

#### 3. **API Proxy Routes** (Estimated 2-3 hours)
**Location:** `frontend/app/api/*/route.ts`
**Tasks:**
- Create Next.js API proxies for each backend route
- Extract serverId from frontend requests
- Forward to backend with serverId parameter
- Handle both query and body parameters

**Example Routes Needed:**
- `/api/worker-rankings/route.ts`
- `/api/firms-config/route.ts`
- `/api/supply-chain/route.ts`
- `/api/weekly-sales/route.ts`
- `/api/worker-activity/route.ts`
- ~25-30 additional proxy routes

**Pattern:**
```typescript
// frontend/app/api/worker-rankings/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serverId = searchParams.get('serverId');

  const backendUrl = `${process.env.BACKEND_URL}/api/worker-rankings?serverId=${serverId}`;
  const response = await fetch(backendUrl);
  return Response.json(await response.json());
}
```

#### 4. **Server Selection UI** (Estimated 1-2 hours)
**Location:** Dashboard header or navigation
**Features:**
- Dropdown to select between Cabra da Peste and Fazenda Bot
- Visual indicator of current server
- Persist selection in localStorage
- Trigger data refresh on server change

---

## 🧪 Phase 5: Testing & Verification (NOT STARTED)

### Test Plan:

#### 1. **Cabra da Peste Server Testing** (Estimated 2 hours)
**Server ID:** 1274479410107646004
**Critical Tests:**
- [ ] Load existing farm sessions - verify all 302 migrated files readable
- [ ] Load existing worker rankings - verify historical data intact
- [ ] Load existing weekly sales - verify all weeks present
- [ ] Load existing Ferrovia sessions - verify supply chain data
- [ ] Load existing firm configurations - verify all 4 firms (Fazenda, Ferrovia, Berçário, Veterinária)
- [ ] Create new worker session - verify saves to correct server directory
- [ ] Complete weekly reset - verify isolation from Fazenda Bot
- [ ] Generate payment receipt - verify correct paths and data

#### 2. **Fazenda Bot Server Testing** (Estimated 2 hours)
**Server ID:** 1413530823788859424
**Critical Tests:**
- [ ] Verify empty/default state (no data copied from Cabra da Peste)
- [ ] Create first firm - verify saves to Fazenda Bot directory
- [ ] Create first worker session - verify directory structure creation
- [ ] Register first worker - verify registration isolation
- [ ] Complete first payment - verify payment directory structure
- [ ] Verify NO data leakage from Cabra da Peste

#### 3. **Data Isolation Testing** (Estimated 1 hour)
**Critical Tests:**
- [ ] Create session on Cabra da Peste - verify NOT visible on Fazenda Bot
- [ ] Create firm on Fazenda Bot - verify NOT visible on Cabra da Peste
- [ ] Update ranking on Cabra da Peste - verify Fazenda Bot unchanged
- [ ] Switch servers in frontend - verify data refreshes correctly
- [ ] Simultaneous operations on both servers - verify no conflicts

#### 4. **Legacy Path Testing** (Estimated 1 hour)
**Tests:**
- [ ] Service loads legacy data when no serverId provided
- [ ] Service falls back to legacy paths when server directory missing
- [ ] API routes handle missing serverId gracefully
- [ ] Frontend displays legacy data when no server selected

---

## 🔧 Phase 6: Bot Command Updates (NOT STARTED)

### Discord Bot Commands Needing Updates:

#### **register-setup.ts** (Estimated 1 hour)
**Location:** `src/bot/commands/admin/register-setup.ts`
**Issue:** Line 80 - Expected 2 arguments, got 1
**Fix:** Add serverId parameter to getServiceConfig() call
**Impact:** Worker registration system

#### **encomenda.ts** (Orders System) (Estimated 1 hour)
**Location:** `src/bot/commands/orders/encomenda.ts`
**Issue:** Line 356 - Property 'supplierId' does not exist
**Fix:** Update from single supplier to multi-supplier arrays
**Impact:** Order creation system

#### **Other Bot Commands** (Estimated 2-3 hours)
**Unknown count of commands that:**
- Call backend API routes
- Read/write configuration files
- Access worker session data
- Use firm configurations

**Recommended Approach:**
1. Extract guild.id from Discord interaction
2. Pass as serverId to all backend calls
3. Update any direct file access to use server-specific paths

---

## 📋 Phase 7: Cleanup & Optimization (NOT STARTED)

### Tasks:

#### 1. **Remove Fallback Paths** (Estimated 1 hour)
**When:** After both servers verified working
**Tasks:**
- Remove legacy path fallbacks from all services
- Update to require serverId parameter (not optional)
- Remove backward compatibility code

#### 2. **Update Error Messages** (Estimated 30 mins)
**Tasks:**
- Add "serverId required" error messages
- Improve server-specific error logging
- Add server context to all console logs

#### 3. **Documentation Updates** (Estimated 1 hour)
**Tasks:**
- Update CLAUDE.md with multi-server architecture
- Document serverId parameter pattern
- Add troubleshooting guide for server selection
- Document data directory structure

#### 4. **Performance Optimization** (Estimated 2 hours)
**Tasks:**
- Review Map cache usage - ensure no memory leaks
- Optimize multi-server data loading
- Add indexes or caching for frequently accessed data
- Profile API response times for both servers

---

## 📊 Summary & Time Estimates

### Work Completed:
- **Phase 1:** Data Migration - ✅ 100% Complete (4 hours)
- **Phase 2:** Backend Services - ✅ 100% Complete (8 hours)
- **Phase 3:** API Routes - 🔄 15% Complete (3 hours / 20 estimated)

### Work Remaining:

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| **Phase 3** | Complete remaining API routes | 17 hours | 🔴 CRITICAL |
| **Phase 4** | Frontend updates | 10 hours | 🔴 CRITICAL |
| **Phase 5** | Testing & verification | 6 hours | 🔴 CRITICAL |
| **Phase 6** | Bot command updates | 4 hours | 🟡 HIGH |
| **Phase 7** | Cleanup & optimization | 4.5 hours | 🟢 MEDIUM |
| **TOTAL** | | **41.5 hours** | |

### Current Progress:
- **Overall:** 45% Complete (15 hours / ~56 hours total)
- **Critical Path:** API Routes → Frontend → Testing

### Risk Assessment:

#### 🔴 HIGH RISK:
1. **worker-activity.ts complexity** - Most complex route, touches many services
2. **Frontend integration scope** - 20-30 components need updates
3. **Data isolation bugs** - Risk of Cabra da Peste data corruption

#### 🟡 MEDIUM RISK:
1. **Bot command compatibility** - May have more affected commands than identified
2. **Performance degradation** - Multi-server operations may be slower
3. **Testing coverage** - May miss edge cases without thorough testing

#### 🟢 LOW RISK:
1. **Migration reversal** - Can restore from git if needed
2. **Legacy path support** - Fallback mechanisms in place
3. **Incremental deployment** - Can deploy phase by phase

---

## 🎯 Recommended Next Steps

### Immediate (Next Session):
1. ✅ Push all commits to git (DONE)
2. ✅ Create this detailed plan (DONE)
3. 🔄 Complete worker-activity.ts updates (3-4 hours)
4. 🔄 Complete farm-service routes (2-3 hours)
5. 🔄 Test TypeScript compilation after each route

### Short-term (Next 2-3 sessions):
1. Complete all high-priority API routes
2. Begin frontend ServerContext integration
3. Create first batch of API proxy routes
4. Test basic server switching in frontend

### Medium-term (Next week):
1. Complete all frontend component updates
2. Complete all API proxy routes
3. Run full test suite on both servers
4. Update bot commands
5. Document any issues or edge cases

### Long-term (Before production):
1. Complete all testing phases
2. Performance profiling and optimization
3. Remove legacy fallback paths
4. Update all documentation
5. Create deployment guide

---

## 📝 Notes & Considerations

### Design Decisions Made:
1. **Server-specific directories** - Cleaner separation than shared files with server filtering
2. **Map-based caching** - Better performance than reloading config on every request
3. **Fallback to legacy** - Allows gradual migration, reduces risk
4. **serverId in request** - More flexible than extracting from session/headers

### Technical Debt Identified:
1. **WorkerChannelService** - Needs refactoring for better testability
2. **Direct disk reads** - Should use service layer instead
3. **Config file formats** - Some use flat structure, some use server-based (inconsistent)
4. **Error handling** - Many routes lack proper serverId validation

### Future Enhancements:
1. **Server dashboard** - View all servers from admin panel
2. **Data migration tools** - Move data between servers if needed
3. **Cross-server analytics** - Compare metrics across servers
4. **Server templates** - Quick setup for new servers with predefined configs

---

**Document Version:** 1.0
**Last Updated:** 2025-10-13
**Status:** Phase 3 in progress (API Routes)
**Next Milestone:** Complete high-priority API routes
