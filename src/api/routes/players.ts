import { Router } from 'express';
import RedMService from '../../services/RedMService';
import { authenticateUser, requireModerator, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get player list - requires authentication
router.get('/', authenticateUser, async (_req, res, next) => {
  try {
    const players = await RedMService.getPlayerList();
    res.json(players);
  } catch (error) {
    next(error);
  }
});

// Get player info - requires authentication  
router.get('/:id', authenticateUser, async (req, res, next) => {
  try {
    const player = await RedMService.getPlayerInfo(req.params.id);
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    res.json(player);
  } catch (error) {
    next(error);
  }
});

// Kick player - requires moderator permissions
router.post('/:id/kick', authenticateUser, requireModerator, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { reason = 'No reason provided' } = req.body;
    const success = await RedMService.kickPlayer(req.params.id, reason);
    
    // Log the action
    console.log(`Player ${req.params.id} kicked by ${req.user?.username} (${req.user?.discordId}). Reason: ${reason}`);
    
    res.json({ 
      success, 
      playerId: req.params.id, 
      action: 'kick',
      moderator: req.user?.username
    });
  } catch (error) {
    next(error);
  }
});

// Ban player - requires moderator permissions
router.post('/:id/ban', authenticateUser, requireModerator, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { reason = 'No reason provided', duration } = req.body;
    const success = await RedMService.banPlayer(req.params.id, reason, duration);
    
    // Log the action
    console.log(`Player ${req.params.id} banned by ${req.user?.username} (${req.user?.discordId}). Reason: ${reason}, Duration: ${duration || 'permanent'}`);
    
    res.json({ 
      success, 
      playerId: req.params.id, 
      action: 'ban',
      moderator: req.user?.username,
      duration
    });
  } catch (error) {
    next(error);
  }
});

export default router;