import { Router } from 'express';
import RedMService from '../../services/RedMService';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Get server status - requires authentication
router.get('/', authenticateUser, async (_req, res, next) => {
  try {
    const serverInfo = await RedMService.getServerInfo();
    res.json(serverInfo);
  } catch (error) {
    next(error);
  }
});

// Test connection - requires authentication
router.get('/test', authenticateUser, async (_req, res, next) => {
  try {
    const isConnected = await RedMService.testConnection();
    res.json({ connected: isConnected });
  } catch (error) {
    next(error);
  }
});

export default router;