import { Router, Response } from 'express';
import RegistrationService from '../../services/RegistrationService';
import { authenticateUser, requireAdmin } from '../middleware/auth';

const router = Router();

// Get all Discord roles (temporarily bypass auth for testing)
router.get('/discord/roles', async (_req: any, res: Response): Promise<any> => {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      return res.status(500).json({ error: 'Guild ID not configured' });
    }

    const roles = await RegistrationService.getDiscordRoles(guildId);
    
    // Format roles for frontend
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      position: role.position,
      mentionable: role.mentionable,
      hoisted: role.hoist,
      memberCount: role.members.size
    }));

    res.json(formattedRoles);
  } catch (error) {
    console.error('Error fetching Discord roles:', error);
    res.status(500).json({ error: 'Failed to fetch Discord roles' });
  }
});

// Get all Discord categories (temporarily bypass auth for testing)
router.get('/discord/categories', async (_req: any, res: Response): Promise<any> => {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      return res.status(500).json({ error: 'Guild ID not configured' });
    }

    const categories = await RegistrationService.getDiscordCategories(guildId);
    
    // Format categories for frontend
    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      position: category.position,
      channelCount: category.children.cache.size
    }));

    res.json(formattedCategories);
  } catch (error) {
    console.error('Error fetching Discord categories:', error);
    res.status(500).json({ error: 'Failed to fetch Discord categories' });
  }
});

// Get registration form configuration (temporarily bypass auth)
router.get('/config', async (_req: any, res: Response): Promise<any> => {
  try {
    const config = await RegistrationService.getFormConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching form config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Update registration form configuration (temporarily bypass auth)
router.put('/config', async (req: any, res: Response): Promise<any> => {
  try {
    const config = await RegistrationService.updateFormConfig(req.body);
    res.json(config);
  } catch (error) {
    console.error('Error updating form config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Check if user is registered
router.get('/check/:userId', async (req: any, res: Response): Promise<any> => {
  try {
    const isRegistered = await RegistrationService.isUserRegistered(req.params.userId);
    res.json({ isRegistered });
  } catch (error) {
    console.error('Error checking registration:', error);
    res.status(500).json({ error: 'Failed to check registration status' });
  }
});

// Submit registration (called by Discord bot)
router.post('/submit', async (req: any, res: Response): Promise<any> => {
  try {
    // Verify request is from bot (simple token check)
    const botToken = req.headers['x-bot-token'];
    if (botToken !== process.env.DISCORD_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const registration = await RegistrationService.submitRegistration(req.body);
    res.json(registration);
  } catch (error: any) {
    console.error('Error submitting registration:', error);
    res.status(400).json({ error: error.message || 'Failed to submit registration' });
  }
});

// Get all registrations (temporarily bypass auth)
router.get('/list', async (req: any, res: Response): Promise<any> => {
  try {
    const filter: any = {};
    
    if (req.query.approved !== undefined) {
      filter.approved = req.query.approved === 'true';
    }
    if (req.query.functionId) {
      filter.functionId = req.query.functionId as string;
    }
    if (req.query.startDate) {
      filter.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filter.endDate = new Date(req.query.endDate as string);
    }

    const registrations = await RegistrationService.getAllRegistrations(filter);
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Get registration statistics (temporarily bypass auth)
router.get('/stats', async (_req: any, res: Response): Promise<any> => {
  try {
    const stats = await RegistrationService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Approve registration (admin only)
router.put('/approve/:userId', authenticateUser, requireAdmin, async (req: any, res: Response): Promise<any> => {
  try {
    const approvedBy = (req as any).user?.id || 'admin';
    const registration = await RegistrationService.approveRegistration(
      req.params.userId,
      approvedBy
    );
    res.json(registration);
  } catch (error: any) {
    console.error('Error approving registration:', error);
    res.status(400).json({ error: error.message || 'Failed to approve registration' });
  }
});

// Deny registration (admin only)
router.put('/deny/:userId', authenticateUser, requireAdmin, async (req: any, res: Response): Promise<any> => {
  try {
    const deniedBy = (req as any).user?.id || 'admin';
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Denial reason is required' });
    }

    const registration = await RegistrationService.denyRegistration(
      req.params.userId,
      deniedBy,
      reason
    );
    res.json(registration);
  } catch (error: any) {
    console.error('Error denying registration:', error);
    res.status(400).json({ error: error.message || 'Failed to deny registration' });
  }
});

// Update registration (admin only)
router.put('/update/:userId', authenticateUser, requireAdmin, async (req: any, res: Response): Promise<any> => {
  try {
    const registration = await RegistrationService.updateRegistration(
      req.params.userId,
      req.body
    );
    res.json(registration);
  } catch (error) {
    console.error('Error updating registration:', error);
    res.status(500).json({ error: 'Failed to update registration' });
  }
});

// Delete registration (admin only)
router.delete('/delete/:userId', authenticateUser, requireAdmin, async (req: any, res: Response): Promise<any> => {
  try {
    const deleted = await RegistrationService.deleteRegistration(req.params.userId);
    res.json({ success: deleted });
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({ error: 'Failed to delete registration' });
  }
});

export default router;