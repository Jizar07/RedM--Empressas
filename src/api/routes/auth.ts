import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import AuthService from '../../services/AuthService';

const router = Router();

// Validate session and return user info
router.get('/session', authenticateUser, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get fresh data from Discord API
    const bot = req.app.get('botClient');
    const authService = AuthService.getInstance(bot);
    const freshUserData = await authService.refreshUserData(req.user.discordId);

    if (!freshUserData) {
      return res.status(403).json({ error: 'User no longer in target guild' });
    }

    res.json({
      user: freshUserData,
      permissions: {
        isAdmin: authService.isAdmin(freshUserData.roles),
        isModerator: authService.isModerator(freshUserData.roles),
        canManagePlayers: authService.isModerator(freshUserData.roles),
        canAccessChannelParser: authService.isModerator(freshUserData.roles),
      }
    });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh user roles and permissions
router.post('/refresh', authenticateUser, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const bot = req.app.get('botClient');
    const authService = AuthService.getInstance(bot);
    const freshUserData = await authService.refreshUserData(req.user.discordId);

    if (!freshUserData) {
      return res.status(403).json({ error: 'User no longer in target guild' });
    }

    res.json({
      message: 'User data refreshed successfully',
      user: freshUserData,
      permissions: {
        isAdmin: authService.isAdmin(freshUserData.roles),
        isModerator: authService.isModerator(freshUserData.roles),
        canManagePlayers: authService.isModerator(freshUserData.roles),
        canAccessChannelParser: authService.isModerator(freshUserData.roles),
      }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;