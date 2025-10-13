import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Helper function for server-specific payments path
function getPaymentsDir(serverId?: string): string {
  if (serverId) {
    return path.join(process.cwd(), 'data', 'worker-sessions', serverId, 'payments');
  }
  return path.join(process.cwd(), 'data', 'worker-sessions', 'payments');
}

interface WorkerPaymentReceipt {
  sessionId: string;
  workerId: string;
  workerName: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  paidAt: string;
  plantTransactions: Array<{
    type: string;
    itemName: string;
    quantity: number;
    transactionId: string;
    timestamp: string;
  }>;
  animalTransactions: Array<{
    type: string;
    quantity: number;
    amount: number;
    transactionId: string;
    timestamp: string;
  }>;
}

// Get all worker payment receipts
router.get('/worker-payment-receipts', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const receiptsDir = getPaymentsDir(serverId);

    // Ensure directory exists
    try {
      await fs.access(receiptsDir);
    } catch {
      res.json({ receipts: [], serverId: serverId || 'legacy' });
      return;
    }

    // Read all receipt files
    const files = await fs.readdir(receiptsDir);
    const receipts: WorkerPaymentReceipt[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(receiptsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const receipt = JSON.parse(content);
          receipts.push(receipt);
        } catch (error) {
          console.error(`Error reading payment receipt file ${file}:`, error);
        }
      }
    }

    // Sort by payment date (newest first)
    receipts.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    res.json({ receipts, serverId: serverId || 'legacy' });
  } catch (error) {
    console.error('Error fetching worker payment receipts:', error);
    res.status(500).json({ error: 'Failed to fetch worker payment receipts' });
  }
});

// Get single worker payment receipt
router.get('/worker-payment-receipts/:sessionId', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const { sessionId } = req.params;
    const receiptsDir = getPaymentsDir(serverId);
    const filePath = path.join(receiptsDir, `${sessionId}.json`);

    const content = await fs.readFile(filePath, 'utf-8');
    const receipt = JSON.parse(content);

    res.json({ ...receipt, serverId: serverId || 'legacy' });
  } catch (error) {
    console.error('Error fetching worker payment receipt:', error);
    res.status(404).json({ error: 'Payment receipt not found' });
  }
});

// Get worker payment receipts by worker ID
router.get('/worker-payment-receipts/worker/:workerId', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string | undefined;
    const { workerId } = req.params;
    const receiptsDir = getPaymentsDir(serverId);

    const files = await fs.readdir(receiptsDir);
    const workerReceipts: WorkerPaymentReceipt[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(receiptsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const receipt = JSON.parse(content);

          if (receipt.workerId === workerId) {
            workerReceipts.push(receipt);
          }
        } catch (error) {
          console.error(`Error reading payment receipt file ${file}:`, error);
        }
      }
    }

    // Sort by payment date (newest first)
    workerReceipts.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    res.json({ receipts: workerReceipts, serverId: serverId || 'legacy' });
  } catch (error) {
    console.error('Error fetching worker payment receipts:', error);
    res.status(500).json({ error: 'Failed to fetch worker payment receipts' });
  }
});

export default router;