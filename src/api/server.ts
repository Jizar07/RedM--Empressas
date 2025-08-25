import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import config from '../config/config';
import { BotClient } from '../bot/BotClient';
import statusRoutes from './routes/status';
import playerRoutes from './routes/players';
import botRoutes from './routes/bot';
import channelParserRoutes from './routes/channel-parser';
import authRoutes from './routes/auth';
import registrationRoutes from './routes/registration';
import ordersRoutes from './routes/orders';
import webhookReceiverRoutes, { setMessageManager } from './routes/webhook-receiver';
import channelLogsConfigRoutes from './routes/channel-logs-config';
import botApiRoutes from './routes/bot-api';
import internalApiRoutes from './routes/internal-api';
import userChannelLinkRoutes from './routes/user-channel-link';
import forceSyncRoutes from './routes/force-sync';
import discordCommandsRoutes from './routes/discord-commands';
import serviceSubmissionsRoutes from './routes/service-submissions';
import farmServiceConfigRoutes from './routes/farm-service-config';
import farmServiceDataRoutes from './routes/farm-service-data';
import discordRolesRoutes from './routes/discord-roles';
import moderationRoutes from './routes/moderation';

export async function startApiServer(bot: BotClient): Promise<void> {
  // Make bot client available globally for API routes
  (global as any).botClient = bot;
  
  const app: Express = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.frontend.url,
      credentials: true,
    },
  });
  
  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: config.frontend.url,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  
  if (config.environment.isDevelopment) {
    app.use(morgan('dev'));
  }
  
  // Store bot instance in app locals
  app.locals.bot = bot;
  app.locals.io = io;
  app.set('botClient', bot);
  
  // Initialize message manager for webhook receiver
  setMessageManager(bot.messageManager);
  
  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      bot: {
        ready: bot.isReady(),
        guilds: bot.guilds.cache.size,
        users: bot.users.cache.size,
      },
    });
  });
  
  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/status', statusRoutes);
  app.use('/api/players', playerRoutes);
  app.use('/api/bot', botRoutes);
  app.use('/api/channel-parser', channelParserRoutes);
  app.use('/api/registration', registrationRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/webhook', webhookReceiverRoutes);
  app.use('/api/channel-logs', channelLogsConfigRoutes);
  app.use('/api', botApiRoutes);
  
  // Discord commands management
  app.use('/api/discord', discordCommandsRoutes);
  
  // Farm service submissions
  app.use('/api/service-submissions', serviceSubmissionsRoutes);
  
  // Farm service configuration
  app.use('/api/farm-service', farmServiceConfigRoutes);
  
  // Farm service data (history, overview)
  app.use('/api/farm-service-data', farmServiceDataRoutes);
  
  // Moderation configuration
  app.use('/api/moderation', moderationRoutes);
  
  // Discord roles (use different path to avoid conflict)
  app.use('/api/discord-roles', discordRolesRoutes);
  
  // Internal API Routes (NO AUTHENTICATION - for system-to-system communication)
  app.use('/api/internal', internalApiRoutes);
  
  // User-Channel Linking Routes
  app.use('/api/user-channel-link', userChannelLinkRoutes);
  
  // Force Sync Routes
  app.use('/api/force-sync', forceSyncRoutes);
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('🔌 New socket connection:', socket.id);
    
    socket.on('subscribe:status', () => {
      socket.join('status-updates');
    });
    
    socket.on('subscribe:players', () => {
      socket.join('player-updates');
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });
  
  // Start server status updates
  startStatusBroadcast(io);
  
  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      error: {
        message: err.message || 'Internal server error',
        status: err.status || 500,
      },
    });
  });
  
  // Start server
  httpServer.listen(config.api.port, config.api.host, () => {
    console.log(`✅ API server running at http://${config.api.host}:${config.api.port}`);
  });
}

function startStatusBroadcast(io: SocketIOServer): void {
  setInterval(async () => {
    try {
      const RedMService = (await import('../services/RedMService')).default;
      const serverInfo = await RedMService.getServerInfo();
      
      io.to('status-updates').emit('server:status', serverInfo);
    } catch (error) {
      console.error('Error broadcasting status:', error);
    }
  }, 30000); // Every 30 seconds
}