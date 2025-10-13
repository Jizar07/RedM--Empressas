import { Router, Request, Response } from 'express';
import WeeklySalesService from '../../services/WeeklySalesService';

const router = Router();

// Get current week's sales information
router.get('/current', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const weeklySalesService = WeeklySalesService.getInstance();
    const currentWeekInfo = weeklySalesService.getCurrentWeekInfo(serverId);

    res.json({
      success: true,
      data: currentWeekInfo,
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('Error getting current week sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current week sales',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current week's detailed data (transactions)
router.get('/current/details', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const weeklySalesService = WeeklySalesService.getInstance();
    const currentWeekData = weeklySalesService.getCurrentWeekData(serverId);

    res.json({
      success: true,
      data: currentWeekData,
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('Error getting current week detailed data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current week detailed data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all weekly sales data for analytics
router.get('/all', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const weeklySalesService = WeeklySalesService.getInstance();
    const allWeeklyData = weeklySalesService.getAllWeeklyData(serverId);

    // Return summary data (without individual transactions for performance)
    const summaryData = allWeeklyData.map(week => ({
      weekIdentifier: week.weekIdentifier,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      totalSales: week.totalSales,
      totalTransactions: week.totalTransactions,
      dateRange: `${week.weekStart.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      })} - ${week.weekEnd.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      })}`
    }));

    res.json({
      success: true,
      data: summaryData,
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('Error getting all weekly sales data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get all weekly sales data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add a manual sale transaction (for testing or manual entries)
router.post('/transaction', async (req: Request, res: Response): Promise<void> => {
  try {
    const { workerName, itemName, quantity, amount, channelId, serverId } = req.body;

    if (!workerName || !itemName || !quantity || !amount) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: workerName, itemName, quantity, amount'
      });
      return;
    }

    const weeklySalesService = WeeklySalesService.getInstance();
    weeklySalesService.addSaleTransaction({
      workerName,
      itemName,
      quantity: Number(quantity),
      amount: Number(amount),
      timestamp: new Date(),
      channelId
    }, serverId);

    const updatedWeekInfo = weeklySalesService.getCurrentWeekInfo(serverId);

    res.json({
      success: true,
      message: 'Sale transaction added successfully',
      data: updatedWeekInfo,
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('Error adding sale transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add sale transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific week's data
router.get('/week/:weekIdentifier', async (req: Request, res: Response): Promise<void> => {
  try {
    const { weekIdentifier } = req.params;
    const serverId = req.query.serverId as string | undefined;
    const weeklySalesService = WeeklySalesService.getInstance();
    const allWeeklyData = weeklySalesService.getAllWeeklyData(serverId);

    const specificWeek = allWeeklyData.find(week => week.weekIdentifier === weekIdentifier);

    if (!specificWeek) {
      res.status(404).json({
        success: false,
        error: `Week data not found for ${weekIdentifier}`
      });
      return;
    }

    res.json({
      success: true,
      data: specificWeek,
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('Error getting specific week data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get specific week data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cleanup old data (admin endpoint)
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const { weeksToKeep, serverId } = req.query;
    const weeklySalesService = WeeklySalesService.getInstance();

    const weeks = weeksToKeep ? parseInt(weeksToKeep as string) : 12;
    weeklySalesService.cleanupOldData(weeks, serverId as string | undefined);

    res.json({
      success: true,
      message: `Cleaned up old weekly data, kept last ${weeks} weeks`,
      serverId: serverId || 'legacy'
    });
  } catch (error) {
    console.error('Error cleaning up old data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup old data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;