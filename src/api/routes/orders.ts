import { Router, Request, Response } from 'express';
import OrdersService, { OrderStatus } from '../../services/OrdersService';

const router = Router();

router.get('/config', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const config = await OrdersService.getConfig(serverId);
    res.json(config);
  } catch (error) {
    console.error('Error fetching orders config:', error);
    res.status(500).json({ error: 'Failed to fetch orders configuration' });
  }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const config = await OrdersService.updateConfig(serverId, req.body);
    if (!config) {
      return res.status(500).json({ error: 'Failed to update orders configuration' });
    }
    return res.json(config);
  } catch (error) {
    console.error('Error updating orders config:', error);
    return res.status(500).json({ error: 'Failed to update orders configuration' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }

    const filters: any = {};

    if (req.query.status) {
      filters.status = req.query.status as OrderStatus;
    }
    if (req.query.firmId) {
      filters.firmId = req.query.firmId as string;
    }
    if (req.query.customerId) {
      filters.customerId = req.query.customerId as string;
    }
    if (req.query.supplierId) {
      filters.supplierId = req.query.supplierId as string;
    }
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    const orders = await OrdersService.getAllOrders(serverId, filters);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const order = await OrdersService.createOrder(serverId, req.body);
    if (!order) {
      return res.status(500).json({ error: 'Failed to create order' });
    }
    return res.status(201).json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);

    if (error.message?.includes('Order limit reached') ||
        error.message?.includes('Cooldown active')) {
      return res.status(429).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Failed to create order' });
    }
  }
});

router.put('/:orderId/status', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const { orderId } = req.params;
    const { status, userId, reason } = req.body;

    if (!status || !userId) {
      return res.status(400).json({ error: 'Status and userId are required' });
    }

    const order = await OrdersService.updateOrderStatus(
      serverId,
      orderId,
      status as OrderStatus,
      userId,
      reason
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (error: any) {
    console.error('Error updating order status:', error);

    if (error.message === 'Unauthorized to update this order') {
      return res.status(403).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Failed to update order status' });
    }
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const stats = await OrdersService.getOrderStats(serverId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
});

router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const orders = await OrdersService.getUserOrders(serverId, userId, limit);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

router.get('/user/:userId/active', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const { userId } = req.params;
    const orders = await OrdersService.getUserActiveOrders(serverId, userId);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user active orders:', error);
    res.status(500).json({ error: 'Failed to fetch user active orders' });
  }
});

router.get('/firm/:firmId', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const { firmId } = req.params;
    const status = req.query.status as OrderStatus | undefined;

    const orders = await OrdersService.getFirmOrders(serverId, firmId, status);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching firm orders:', error);
    res.status(500).json({ error: 'Failed to fetch firm orders' });
  }
});

// DELETE endpoint to delete an order
router.delete('/:orderId', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const { orderId } = req.params;

    const deleted = await OrdersService.deleteOrder(serverId, orderId);

    if (!deleted) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return res.status(500).json({ error: 'Failed to delete order' });
  }
});

// PUT endpoint for full order updates
router.put('/:orderId', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;
    if (!serverId) {
      return res.status(400).json({ error: 'Server ID is required' });
    }
    const { orderId } = req.params;

    const order = await OrdersService.updateOrder(serverId, orderId, req.body);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return res.status(500).json({ error: 'Failed to update order' });
  }
});

router.get('/discord/roles', async (req: Request, res: Response) => {
  try {
    const botClient = req.app.get('botClient');
    const serverId = req.query.serverId as string || process.env.DISCORD_GUILD_ID || '1205749564775211049';

    if (!botClient) {
      return res.status(503).json({ error: 'Bot not connected to Discord' });
    }

    const guild = botClient.guilds.cache.get(serverId);
    if (!guild) {
      return res.status(503).json({ error: 'Server not found' });
    }
    const roles = guild.roles.cache
      .filter((role: any) => !role.managed && role.name !== '@everyone')
      .map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        memberCount: role.members.size
      }))
      .sort((a: any, b: any) => b.position - a.position);

    return res.json(roles);
  } catch (error) {
    console.error('Error fetching Discord roles:', error);
    return res.status(500).json({ error: 'Failed to fetch Discord roles' });
  }
});

router.get('/discord/users', async (req: Request, res: Response) => {
  try {
    const botClient = req.app.get('botClient');
    const serverId = req.query.serverId as string || process.env.DISCORD_GUILD_ID || '1205749564775211049';

    if (!botClient) {
      return res.status(503).json({ error: 'Bot not connected to Discord' });
    }

    const guild = botClient.guilds.cache.get(serverId);
    if (!guild) {
      return res.status(503).json({ error: 'Server not found' });
    }
    const users = Array.from(guild.members.cache.values())
      .filter((member: any) => !member.user.bot)
      .map((member: any) => ({
        id: member.id,
        username: member.user.username,
        displayName: member.displayName,
        roleIds: Array.from(member.roles.cache.keys()).filter(id => id !== guild.id) // Exclude @everyone role
      }))
      .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));

    return res.json(users);
  } catch (error) {
    console.error('Error fetching Discord users:', error);
    return res.status(500).json({ error: 'Failed to fetch Discord users' });
  }
});

router.get('/discord/categories', async (req: Request, res: Response) => {
  try {
    const botClient = req.app.get('botClient');
    const serverId = req.query.serverId as string || process.env.DISCORD_GUILD_ID || '1205749564775211049';

    if (!botClient) {
      return res.status(503).json({ error: 'Bot not connected to Discord' });
    }

    const guild = botClient.guilds.cache.get(serverId);
    if (!guild) {
      return res.status(503).json({ error: 'Server not found' });
    }
    const categories = guild.channels.cache
      .filter((channel: any) => channel.type === 4) // Category channels
      .map((category: any) => ({
        id: category.id,
        name: category.name,
        position: category.position,
        channelCount: guild.channels.cache.filter((ch: any) => ch.parentId === category.id).size
      }))
      .sort((a: any, b: any) => a.position - b.position);

    return res.json(categories);
  } catch (error) {
    console.error('Error fetching Discord categories:', error);
    return res.status(500).json({ error: 'Failed to fetch Discord categories' });
  }
});

export default router;