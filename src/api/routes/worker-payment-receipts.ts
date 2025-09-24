import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

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
router.get('/worker-payment-receipts', async (_req: Request, res: Response) => {
  try {
    const receiptsDir = path.join(process.cwd(), 'data', 'worker-sessions', 'payments');

    // Ensure directory exists
    try {
      await fs.access(receiptsDir);
    } catch {
      res.json({ receipts: [] });
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

    res.json({ receipts });
  } catch (error) {
    console.error('Error fetching worker payment receipts:', error);
    res.status(500).json({ error: 'Failed to fetch worker payment receipts' });
  }
});

// Get single worker payment receipt
router.get('/worker-payment-receipts/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const filePath = path.join(process.cwd(), 'data', 'worker-sessions', 'payments', `${sessionId}.json`);

    const content = await fs.readFile(filePath, 'utf-8');
    const receipt = JSON.parse(content);

    res.json(receipt);
  } catch (error) {
    console.error('Error fetching worker payment receipt:', error);
    res.status(404).json({ error: 'Payment receipt not found' });
  }
});

// Get worker payment receipts by worker ID
router.get('/worker-payment-receipts/worker/:workerId', async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const receiptsDir = path.join(process.cwd(), 'data', 'worker-sessions', 'payments');

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

    res.json({ receipts: workerReceipts });
  } catch (error) {
    console.error('Error fetching worker payment receipts:', error);
    res.status(500).json({ error: 'Failed to fetch worker payment receipts' });
  }
});

export default router;