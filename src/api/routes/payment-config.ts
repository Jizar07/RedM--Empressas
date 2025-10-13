import { Router, Request, Response } from 'express';
import { PaymentConfigService, PaymentConfig } from '../../services/PaymentConfigService';

const router = Router();
const paymentConfigService = PaymentConfigService.getInstance();

// GET /api/payment-config - Get current payment configuration
router.get('/', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    console.log(`📄 Getting payment configuration${serverId ? ` for server ${serverId}` : ''}`);
    const config = await paymentConfigService.getConfig(serverId);

    res.json({
      success: true,
      data: config,
      serverId: serverId || 'default'
    });
  } catch (error: any) {
    console.error('❌ Error getting payment config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment configuration',
      details: error.message
    });
  }
});

// POST /api/payment-config - Update payment configuration
router.post('/', async (req: Request, res: Response) => {
  try {
    const { serverId, ...config } = req.body as PaymentConfig & { serverId?: string };

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    console.log(`💾 Updating payment configuration for server ${serverId}`);

    // Validate required fields
    if (!config.defaultPrices || !config.inventoryVerification || !config.rolePermissions) {
      return res.status(400).json({
        success: false,
        error: 'Missing required configuration sections'
      });
    }

    // Validate pricing values
    if (config.defaultPrices.plants.unitPrice < 0 ||
        config.defaultPrices.animals.unitPrice < 0 ||
        config.defaultPrices.ferrovia.unitPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'Unit prices must be non-negative'
      });
    }

    // Validate cost values
    if (config.defaultPrices.plants.costPerUnit < 0 ||
        config.defaultPrices.animals.costPerUnit < 0) {
      return res.status(400).json({
        success: false,
        error: 'Cost per unit must be non-negative'
      });
    }

    // Validate inventory verification settings
    if (config.inventoryVerification.timeWindowMinutes < 1 ||
        config.inventoryVerification.timeWindowMinutes > 1440) { // max 24 hours
      return res.status(400).json({
        success: false,
        error: 'Time window must be between 1 and 1440 minutes'
      });
    }

    if (config.inventoryVerification.tolerance < 0 ||
        config.inventoryVerification.tolerance > 10) {
      return res.status(400).json({
        success: false,
        error: 'Tolerance must be between 0 and 10'
      });
    }

    await paymentConfigService.updateConfig(config as PaymentConfig, serverId);

    return res.json({
      success: true,
      message: 'Payment configuration updated successfully',
      data: config,
      serverId
    });
  } catch (error: any) {
    console.error('❌ Error updating payment config:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update payment configuration',
      details: error.message
    });
  }
});

// POST /api/payment-config/reset - Reset to default configuration
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.body;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    console.log(`🔄 Resetting payment configuration to defaults for server ${serverId}`);
    await paymentConfigService.resetToDefaults(serverId);
    const config = await paymentConfigService.getConfig(serverId);

    res.json({
      success: true,
      message: 'Payment configuration reset to defaults',
      data: config,
      serverId
    });
  } catch (error: any) {
    console.error('❌ Error resetting payment config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset payment configuration',
      details: error.message
    });
  }
});

// GET /api/payment-config/defaults - Get default pricing for command use
router.get('/defaults', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const defaults = await paymentConfigService.getDefaultPrices(serverId);

    res.json({
      success: true,
      data: defaults,
      serverId: serverId || 'default'
    });
  } catch (error: any) {
    console.error('❌ Error getting payment defaults:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment defaults',
      details: error.message
    });
  }
});

export default router;