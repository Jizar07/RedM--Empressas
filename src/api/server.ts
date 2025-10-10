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
import webhookReceiverRoutes, { setMessageManager, setFerroviaSessionService, setDiscordRoleService } from './routes/webhook-receiver';
import channelLogsConfigRoutes from './routes/channel-logs-config';
import botApiRoutes from './routes/bot-api';
import internalApiRoutes from './routes/internal-api';
import userChannelLinkRoutes from './routes/user-channel-link';
import forceSyncRoutes from './routes/force-sync';
import serviceSubmissionsRoutes from './routes/service-submissions';
import farmServiceConfigRoutes from './routes/farm-service-config';
import farmServiceDataRoutes from './routes/farm-service-data';
import paymentConfigRoutes from './routes/payment-config';
import workerPaymentReceiptsRoutes from './routes/worker-payment-receipts';
import discordRolesRoutes from './routes/discord-roles';
import moderationRoutes from './routes/moderation';
import localizationRoutes from './routes/localization';
import firmsConfigRoutes from './routes/firms-config';
import workerActivityRoutes, { initializeWorkerChannelService } from './routes/worker-activity';
import workerPricesRoutes from './routes/worker-prices';
import workerRankingsRoutes from './routes/worker-rankings';
import supplyChainRoutes, { initializeSupplyChainService } from './routes/supply-chain';
import ferroviaUserMetricsRoutes from './routes/ferrovia-user-metrics';
import globalWorkerAnalyticsRoutes from './routes/global-worker-analytics';
import weeklySalesRoutes from './routes/weekly-sales';
import inventoryAnalyticsRoutes from './routes/inventory-analytics';
import comprehensiveAnalyticsRoutes from './routes/comprehensive-analytics';
import exportDataRoutes from './routes/export-data';
import discordChannelsRoutes from './routes/discord-channels';
import FerroviaSessionService from '../services/FerroviaSessionService';
import DiscordRoleService from '../services/DiscordRoleService';
import OrdersService from '../services/OrdersService';

export async function startApiServer(bot: BotClient): Promise<void> {
  // Make bot client available globally for API routes
  (global as any).botClient = bot;
  
  const app: Express = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        config.frontend.url,
        'https://fazenda.stoffeltech.com',
        'http://fazenda.stoffeltech.com'
      ],
      credentials: true,
    },
  });
  
  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: [
      config.frontend.url,
      'https://fazenda.stoffeltech.com',
      'http://fazenda.stoffeltech.com',
      'https://discord.com',
      'https://canary.discord.com',
      'https://ptb.discord.com'
    ],
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
  
  // Initialize worker channel service
  initializeWorkerChannelService(bot);
  
  // Initialize supply chain service
  initializeSupplyChainService();
  
  // Initialize Ferrovia session service
  const ferroviaSessionService = FerroviaSessionService.getInstance(bot);
  setFerroviaSessionService(ferroviaSessionService);
  console.log('🚂 FerroviaSessionService initialized');

  // Initialize Discord role service
  const discordRoleService = DiscordRoleService.getInstance(bot);
  setDiscordRoleService(discordRoleService);
  console.log('🎭 DiscordRoleService initialized');
  
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
  
  
  // Farm service submissions
  app.use('/api/service-submissions', serviceSubmissionsRoutes);
  
  // Farm service configuration
  app.use('/api/farm-service', farmServiceConfigRoutes);
  
  // Farm service data (history, overview)
  app.use('/api/farm-service-data', farmServiceDataRoutes);

  // Payment configuration
  app.use('/api/payment-config', paymentConfigRoutes);

  // Worker payment receipts
  app.use('/api', workerPaymentReceiptsRoutes);

  // Moderation configuration
  app.use('/api/moderation', moderationRoutes);
  
  // Discord roles (use different path to avoid conflict)
  app.use('/api/discord-roles', discordRolesRoutes);
  
  // Localization routes
  app.use('/api/localization', localizationRoutes);
  
  // Firms configuration routes
  app.use('/api/firms-config', firmsConfigRoutes);
  
  // Worker activity tracking routes
  app.use('/api/worker-activity', workerActivityRoutes);

  // Worker rankings routes
  app.use('/api/worker-rankings', workerRankingsRoutes);

  // Supply chain management routes
  app.use('/api/supply-chain', supplyChainRoutes);

  // Ferrovia user metrics and fraud detection routes
  app.use('/api/ferrovia', ferroviaUserMetricsRoutes);

  // Global worker analytics and comprehensive tracking routes
  app.use('/api/global-worker-analytics', globalWorkerAnalyticsRoutes);

  // Weekly sales tracking routes
  app.use('/api/weekly-sales', weeklySalesRoutes);

  // Inventory analytics routes (category-based tracking)
  app.use('/api/inventory-analytics', inventoryAnalyticsRoutes);

  // Comprehensive analytics from existing session data
  app.use('/api/comprehensive-analytics', comprehensiveAnalyticsRoutes);

  // Worker prices management routes
  app.use('/api', workerPricesRoutes);

  // Export data management routes
  app.use('/api/export-data', exportDataRoutes);

  // Discord channels routes
  app.use('/api/discord-channels', discordChannelsRoutes);

  // Internal API Routes (NO AUTHENTICATION - for system-to-system communication)
  app.use('/api/internal', internalApiRoutes);
  
  // User-Channel Linking Routes
  app.use('/api/user-channel-link', userChannelLinkRoutes);
  
  // Force Sync Routes
  app.use('/api/force-sync', forceSyncRoutes);
  
  // Make Socket.IO instance globally available
  app.set('io', io);
  (global as any).io = io;

  // Configure OrdersService with Socket.IO for real-time updates
  OrdersService.setIO(io);

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('🔌 New socket connection:', socket.id);

    socket.on('subscribe:status', () => {
      socket.join('status-updates');
    });

    socket.on('subscribe:players', () => {
      socket.join('player-updates');
    });

    socket.on('subscribe:orders', (data: { serverId: string }) => {
      const roomName = `orders-${data.serverId}`;
      socket.join(roomName);
      console.log(`📦 Socket ${socket.id} joined orders room: ${roomName}`);
    });

    socket.on('unsubscribe:orders', (data: { serverId: string }) => {
      const roomName = `orders-${data.serverId}`;
      socket.leave(roomName);
      console.log(`📦 Socket ${socket.id} left orders room: ${roomName}`);
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