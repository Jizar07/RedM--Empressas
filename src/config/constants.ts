export const Constants = {
  Colors: {
    Primary: 0x8b0000,    // Dark Red (RDR2 theme)
    Success: 0x228b22,    // Forest Green
    Warning: 0xffa500,    // Orange
    Error: 0xdc143c,      // Crimson
    Info: 0x4682b4,       // Steel Blue
  },
  
  Emojis: {
    Success: '✅',
    Error: '❌',
    Warning: '⚠️',
    Info: 'ℹ️',
    Loading: '⏳',
    Online: '🟢',
    Offline: '🔴',
    Restart: '🔄',
    Player: '🤠',
    Sheriff: '⭐',
    Outlaw: '🏴‍☠️',
  },
  
  RedM: {
    DefaultPort: 30120,
    MaxPlayers: 32,
    HeartbeatInterval: 30000, // 30 seconds
    TimeoutThreshold: 60000,  // 1 minute
  },
  
  Bot: {
    Prefix: '!',
    CooldownDefault: 3,    // 3 seconds (in seconds, gets multiplied by 1000 for milliseconds)
    MaxMessageLength: 2000,
    MaxEmbedFields: 25,
  },
  
  API: {
    RateLimit: {
      WindowMs: 15 * 60 * 1000, // 15 minutes
      Max: 100,                  // requests per window
    },
    Timeout: 10000,              // 10 seconds
  },
  
  Database: {
    MaxRetries: 3,
    RetryDelay: 5000,            // 5 seconds
  },
} as const;