# System Architecture Documentation

## Singleton Service Initialization Order

This document explains the initialization order of singleton services to avoid circular dependencies and ensure proper startup.

### Core Services (No Dependencies)

These services can be initialized first as they have no dependencies on other services:

1. **ItemTranslationService** - Provides Portuguese translations for items
2. **RecipeService** / **MultiSourceRecipeService** - Recipe calculations
3. **FileStorageService** - File I/O operations

### Database and Configuration Services

4. **DatabaseService** - MongoDB connection (if configured)
5. **LocalizationService** - Manages global translations
6. **FirmConfigService** - Firm configuration management

### Discord-Dependent Services

These services require the Discord client to be initialized:

7. **DiscordRoleService** - Requires Discord client
8. **WorkerChannelService** - Requires Discord client

### Business Logic Services

9. **SupplyChainService** - Supply chain tracking (uses RecipeService)
10. **BoxOriginAnalyzer** - Box origin analysis
11. **ActivityIntentAnalyzer** - Activity intent detection
12. **ManagerMoneyVerificationService** - Money verification

### Worker and Session Services

13. **WorkerActivityService** - Worker activity tracking
14. **PaymentAuditService** - Payment auditing
15. **WeeklyRankingService** - Worker rankings

### High-Level Orchestration Services

16. **FerroviaSessionService** - Ferrovia management (requires Discord client + SupplyChainService)
17. **GlobalWorkerTracker** - Global tracking (uses MultiSourceRecipeService)
18. **RealTimeMonitoringService** - Real-time monitoring (requires GlobalWorkerTracker) **[DELAYED 1s]**

### Initialization Notes

- **RealTimeMonitoringService** uses a 1-second delayed initialization to avoid circular dependency with GlobalWorkerTracker
- Services using the singleton pattern should call `getInstance()` only after dependencies are ready
- The Discord bot client is initialized before any Discord-dependent services
- File-based services (FileStorageService) are initialized early to ensure data directories exist

### Memory Management

All singleton services implement proper cleanup methods:
- `shutdown()` - Cleans up timers, intervals, and event listeners
- Services with intervals: RealTimeMonitoringService, GlobalWorkerTracker
- Services with timeouts: GlobalWorkerTracker (initialization timeout)

### Service Dependencies Graph

```
RecipeService
    └── SupplyChainService
            └── FerroviaSessionService

GlobalWorkerTracker
    └── RealTimeMonitoringService (delayed 1s)

Discord Client
    ├── DiscordRoleService
    ├── WorkerChannelService
    └── FerroviaSessionService
```

### Best Practices

1. **Always check for null** when calling `getInstance()` on services that may not be initialized yet
2. **Use lazy initialization** for services that are only needed sometimes
3. **Implement shutdown methods** for proper cleanup
4. **Avoid circular dependencies** by using delayed initialization where necessary
5. **Use indexed data structures** (Map, Set) instead of arrays for O(1) lookups
6. **Implement file write queues** to prevent race conditions on concurrent writes

## Performance Optimizations

### Backend
- **File Write Queue**: Prevents concurrent write corruption
- **Indexed Lookups**: O(1) cross-firm transfer detection using Map
- **Circular Buffers**: Bounded memory for history arrays
- **Rate Limiting**: Discord API calls with exponential backoff

### Frontend
- **Dynamic Imports**: 40% bundle size reduction
- **Memoization**: Combined useMemo hooks to prevent cascade re-renders
- **Error Boundaries**: Prevent single component errors from crashing app
- **Type Safety**: Proper type guards and null checks

## Code Quality Standards

### Naming Conventions
- Services use `getInstance()` for singleton pattern
- Private methods prefixed with `private`
- Constants in UPPER_SNAKE_CASE
- Types/Interfaces in PascalCase

### File Organization
- Services in `src/services/`
- Types/Interfaces in `src/interfaces/` or co-located with services
- Utilities in `src/utils/` or `frontend/lib/`
- Shared frontend utilities in `frontend/lib/`

### Error Handling
- All async operations wrapped in try-catch
- Errors logged with context
- Rate limit errors handled with retry logic
- File operations use atomic rename pattern
