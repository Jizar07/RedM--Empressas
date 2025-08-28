import { Router, Request, Response } from 'express';
import { FirmConfigService } from '../../services/FirmConfigService';

const router = Router();
const firmService = FirmConfigService.getInstance();

// Get all firms
router.get('/', async (_req: Request, res: Response) => {
  try {
    const firms = firmService.getAllFirms();
    res.json({
      success: true,
      firms,
      count: Object.keys(firms).length
    });
  } catch (error) {
    console.error('❌ Error fetching firms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch firms',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific firm by ID
router.get('/:firmId', async (req: Request, res: Response) => {
  try {
    const { firmId } = req.params;
    const firm = firmService.getFirm(firmId);
    
    if (!firm) {
      return res.status(404).json({
        success: false,
        error: `Firm with ID "${firmId}" not found`
      });
    }

    return res.json({
      success: true,
      firm
    });
  } catch (error) {
    console.error('❌ Error fetching firm:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch firm',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get firms accessible to user based on roles
router.post('/accessible', async (req: Request, res: Response) => {
  try {
    const { userRoles } = req.body;
    
    if (!Array.isArray(userRoles)) {
      return res.status(400).json({
        success: false,
        error: 'userRoles must be an array'
      });
    }

    const accessibleFirms = firmService.getFirmsForRoles(userRoles);
    
    return res.json({
      success: true,
      firms: accessibleFirms,
      count: accessibleFirms.length,
      userRoles
    });
  } catch (error) {
    console.error('❌ Error fetching accessible firms:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch accessible firms',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new firm
router.post('/', async (req: Request, res: Response) => {
  try {
    const firmData = req.body;
    
    // Validate required fields
    if (!firmData.name || !firmData.channelId || !Array.isArray(firmData.allowedRoles)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, channelId, allowedRoles'
      });
    }

    if (!firmData.monitoring || !firmData.monitoring.endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Missing required monitoring configuration'
      });
    }

    const newFirm = firmService.createFirm(firmData);
    
    return res.status(201).json({
      success: true,
      message: 'Firm created successfully',
      firm: newFirm
    });
  } catch (error) {
    console.error('❌ Error creating firm:', error);
    return res.status(400).json({
      success: false,
      error: 'Failed to create firm',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update existing firm
router.put('/:firmId', async (req: Request, res: Response) => {
  try {
    const { firmId } = req.params;
    const updateData = { ...req.body, id: firmId };
    
    const updatedFirm = firmService.updateFirm(updateData);
    
    return res.json({
      success: true,
      message: 'Firm updated successfully',
      firm: updatedFirm
    });
  } catch (error) {
    console.error('❌ Error updating firm:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      error: 'Failed to update firm',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Toggle firm enabled status
router.patch('/:firmId/toggle', async (req: Request, res: Response) => {
  try {
    const { firmId } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled field must be a boolean'
      });
    }
    
    const updatedFirm = firmService.toggleFirmEnabled(firmId, enabled);
    
    return res.json({
      success: true,
      message: `Firm ${enabled ? 'enabled' : 'disabled'} successfully`,
      firm: updatedFirm
    });
  } catch (error) {
    console.error('❌ Error toggling firm status:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      error: 'Failed to toggle firm status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete firm
router.delete('/:firmId', async (req: Request, res: Response) => {
  try {
    const { firmId } = req.params;
    firmService.deleteFirm(firmId);
    
    return res.json({
      success: true,
      message: 'Firm deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting firm:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      error: 'Failed to delete firm',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get system settings
router.get('/system/settings', async (_req: Request, res: Response) => {
  try {
    const settings = firmService.getSettings();
    
    return res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('❌ Error fetching system settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch system settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update system settings
router.put('/system/settings', async (req: Request, res: Response) => {
  try {
    const settings = firmService.updateSettings(req.body);
    
    return res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('❌ Error updating system settings:', error);
    return res.status(400).json({
      success: false,
      error: 'Failed to update system settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get monitored channels (for bot integration)
router.get('/system/monitored-channels', async (_req: Request, res: Response) => {
  try {
    const channels = firmService.getMonitoredChannels();
    
    return res.json({
      success: true,
      channels,
      count: channels.length
    });
  } catch (error) {
    console.error('❌ Error fetching monitored channels:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch monitored channels',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint connectivity
router.post('/test-endpoint', async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'endpoint field is required'
      });
    }

    // Test the endpoint with a simple ping
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      from: 'firm-config-service'
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseText = await response.text();
    
    return res.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseText,
      endpoint
    });
  } catch (error) {
    console.error('❌ Error testing endpoint:', error);
    return res.json({
      success: false,
      error: 'Endpoint test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reload configuration from file
router.post('/system/reload', async (_req: Request, res: Response) => {
  try {
    firmService.reloadConfig();
    
    return res.json({
      success: true,
      message: 'Configuration reloaded successfully'
    });
  } catch (error) {
    console.error('❌ Error reloading configuration:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reload configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;