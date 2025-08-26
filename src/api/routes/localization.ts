import { Router, Request, Response } from 'express';
import LocalizationService from '../../services/LocalizationService';

const router = Router();

/**
 * Routes for localization management
 */

/**
 * GET /api/localization/translations
 * Get all available translations
 */
router.get('/translations', (_req: Request, res: Response): void => {
  try {
    const translations = LocalizationService.getAllTranslations();
    
    res.json({
      success: true,
      data: {
        built_in_translations: translations,
        custom_overrides: translations,
        total_translations: Object.keys(translations).length,
        total_overrides: Object.keys(translations).length
      }
    });
  } catch (error) {
    console.error('Error getting translations:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting translations'
    });
  }
});

/**
 * POST /api/localization/override
 * Create or update manual translation override
 */
router.post('/override', (req: Request, res: Response): void => {
  try {
    const { itemId, displayName } = req.body;
    
    if (!itemId || !displayName) {
      res.status(400).json({
        success: false,
        error: 'itemId and displayName are required'
      });
      return;
    }
    
    const success = LocalizationService.setCustomDisplayName(itemId, displayName);
    
    if (success) {
      res.json({
        success: true,
        message: `Override created: ${itemId} -> ${displayName}`,
        data: {
          itemId,
          displayName,
          preview: LocalizationService.getBestDisplayName(itemId)
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error saving override'
      });
    }
  } catch (error) {
    console.error('Error creating override:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/localization/override/:itemId
 * Remove manual override
 */
router.delete('/override/:itemId', (req: Request, res: Response): void => {
  try {
    const { itemId } = req.params;
    
    const success = LocalizationService.removeCustomDisplayName(itemId);
    
    if (success) {
      res.json({
        success: true,
        message: `Override removed for: ${itemId}`,
        data: {
          itemId,
          new_display_name: LocalizationService.getBestDisplayName(itemId)
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Override not found'
      });
    }
  } catch (error) {
    console.error('Error removing override:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/localization/preview/:itemId
 * Preview how an item will be displayed
 */
router.get('/preview/:itemId', (req: Request, res: Response): void => {
  try {
    const { itemId } = req.params;
    
    const displayName = LocalizationService.getBestDisplayName(itemId);
    const customOverride = LocalizationService.getCustomDisplayName(itemId);
    
    res.json({
      success: true,
      data: {
        itemId,
        current_display_name: displayName,
        has_custom_override: !!customOverride,
        custom_override: customOverride,
        fallback_formatting: LocalizationService.normalizeAndFormat(itemId)
      }
    });
  } catch (error) {
    console.error('Error previewing item:', error);
    res.status(500).json({
      success: false,
      error: 'Error previewing item'
    });
  }
});

export default router;