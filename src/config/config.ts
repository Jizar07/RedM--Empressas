import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  discord: {
    token: string;
    clientId: string;
    guildId: string;
  };
  api: {
    port: number;
    host: string;
  };
  database: {
    uri: string;
  };
  redm: {
    serverIp: string;
    serverPort: number;
    apiKey: string;
    rconPassword: string;
  };
  frontend: {
    url: string;
  };
  security: {
    jwtSecret: string;
    sessionSecret: string;
  };
  environment: {
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
  };
  messageManager: {
    defaultChannelId: string;
  };
}

const config: Config = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
  },
  api: {
    port: parseInt(process.env.API_PORT || '3000', 10),
    host: process.env.API_HOST || 'localhost',
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/redm-bot',
  },
  redm: {
    serverIp: process.env.REDM_SERVER_IP || '',
    serverPort: parseInt(process.env.REDM_SERVER_PORT || '30120', 10),
    apiKey: process.env.REDM_SERVER_API_KEY || '',
    rconPassword: process.env.REDM_RCON_PASSWORD || '',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3001',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'change_this_in_production',
    sessionSecret: process.env.SESSION_SECRET || 'change_this_in_production',
  },
  environment: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
  messageManager: {
    defaultChannelId: process.env.MESSAGE_MANAGER_CHANNEL_ID || '1404492813290442902',
  },
};

export function validateConfig(): void {
  const required = [
    'discord.token',
    'discord.clientId',
    'discord.guildId',
  ];
  
  const missing: string[] = [];
  
  for (const key of required) {
    const keys = key.split('.');
    let value: any = config;
    
    for (const k of keys) {
      value = value[k];
    }
    
    if (!value) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required configuration:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\n📝 Please update your .env file with the required values.');
    process.exit(1);
  }
}

export default config;