import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Storage paths
const EXPORT_CONFIG_DIR = path.join(process.cwd(), 'data', 'export-config');
const EXPORT_HISTORY_DIR = path.join(process.cwd(), 'data', 'export-history');
const EXPORTS_DIR = path.join(process.cwd(), 'exports');

// Active export jobs tracking
const activeJobs = new Map<string, ExportJob>();

interface ExportConfig {
  serverId: string;
  channels: string[];
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    categories?: string[]; // ['supply_chain', 'inventario', 'financeiro']
    transactionTypes?: string[]; // Specific transaction types
    workerNames?: string[];
    items?: string[];
    minConfidence?: 'high' | 'medium' | 'low';
  };
  reportTypes: ('detailed' | 'summary' | 'breakdown')[];
}

interface ExportJob {
  jobId: string;
  serverId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  config: ExportConfig;
  files?: string[];
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

interface ExportHistoryEntry {
  jobId: string;
  timestamp: string;
  config: ExportConfig;
  files: string[];
  fileCount: number;
  totalRecords?: number;
}

// Ensure required directories exist
async function ensureDirectories(): Promise<void> {
  await fs.mkdir(EXPORT_CONFIG_DIR, { recursive: true });
  await fs.mkdir(EXPORT_HISTORY_DIR, { recursive: true });
  await fs.mkdir(EXPORTS_DIR, { recursive: true });
}

// GET /api/export-data/config - Get saved export configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    await ensureDirectories();

    const configPath = path.join(EXPORT_CONFIG_DIR, `${serverId}.json`);

    try {
      const data = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(data);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      // Return default config if file doesn't exist
      const defaultConfig: ExportConfig = {
        serverId,
        channels: [],
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        filters: {
          categories: ['supply_chain', 'inventario', 'financeiro'],
          minConfidence: 'medium'
        },
        reportTypes: ['detailed', 'summary', 'breakdown']
      };

      res.json({
        success: true,
        data: defaultConfig
      });
    }
  } catch (error: any) {
    console.error('Error loading export config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/export-data/config - Save export configuration
router.post('/config', async (req: Request, res: Response) => {
  try {
    const config: ExportConfig = req.body;

    if (!config.serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    await ensureDirectories();

    const configPath = path.join(EXPORT_CONFIG_DIR, `${config.serverId}.json`);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    console.error('Error saving export config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/export-data/generate - Trigger export generation
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const config: ExportConfig = req.body;

    if (!config.serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    if (!config.channels || config.channels.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one channel must be selected'
      });
    }

    await ensureDirectories();

    // Create job ID
    const jobId = uuidv4();

    const job: ExportJob = {
      jobId,
      serverId: config.serverId,
      status: 'queued',
      progress: 0,
      config,
      startedAt: new Date()
    };

    // Store job
    activeJobs.set(jobId, job);

    // Start export process asynchronously
    processExport(job).catch(error => {
      console.error(`Export job ${jobId} failed:`, error);
      job.status = 'failed';
      job.error = error.message;
    });

    res.json({
      success: true,
      data: {
        jobId,
        status: 'queued'
      }
    });
  } catch (error: any) {
    console.error('Error starting export:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/export-data/status/:jobId - Check export progress
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = activeJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        files: job.files,
        error: job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }
    });
  } catch (error: any) {
    console.error('Error checking export status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/export-data/files - List available export files
router.get('/files', async (req: Request, res: Response) => {
  try {
    const serverId = req.query.serverId as string;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    await ensureDirectories();

    const historyPath = path.join(EXPORT_HISTORY_DIR, `${serverId}.json`);

    try {
      const data = await fs.readFile(historyPath, 'utf-8');
      const history: ExportHistoryEntry[] = JSON.parse(data);

      // Filter to only include existing files
      const validHistory = [];
      for (const entry of history) {
        const stillExists = await Promise.all(
          entry.files.map(async (file) => {
            try {
              const filePath = path.join(EXPORTS_DIR, serverId, file);
              await fs.access(filePath);
              return true;
            } catch {
              return false;
            }
          })
        );

        if (stillExists.some(exists => exists)) {
          validHistory.push(entry);
        }
      }

      res.json({
        success: true,
        data: validHistory
      });
    } catch (error) {
      // No history yet
      res.json({
        success: true,
        data: []
      });
    }
  } catch (error: any) {
    console.error('Error listing export files:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/export-data/download/:filename - Download CSV file
router.get('/download/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const serverId = req.query.serverId as string;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    // Security: Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    const filePath = path.join(EXPORTS_DIR, serverId, filename);

    try {
      await fs.access(filePath);
      res.download(filePath, filename);
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
  } catch (error: any) {
    console.error('Error downloading export file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/export-data/file/:filename - Delete old export
router.delete('/file/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const serverId = req.query.serverId as string;

    if (!serverId) {
      return res.status(400).json({
        success: false,
        error: 'serverId is required'
      });
    }

    // Security: Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    const filePath = path.join(EXPORTS_DIR, serverId, filename);

    try {
      await fs.unlink(filePath);

      // Update history
      const historyPath = path.join(EXPORT_HISTORY_DIR, `${serverId}.json`);
      try {
        const data = await fs.readFile(historyPath, 'utf-8');
        const history: ExportHistoryEntry[] = JSON.parse(data);

        const updatedHistory = history.map(entry => ({
          ...entry,
          files: entry.files.filter(f => f !== filename)
        })).filter(entry => entry.files.length > 0);

        await fs.writeFile(historyPath, JSON.stringify(updatedHistory, null, 2), 'utf-8');
      } catch {
        // Ignore history update errors
      }

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
  } catch (error: any) {
    console.error('Error deleting export file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Process export job asynchronously
 */
async function processExport(job: ExportJob): Promise<void> {
  try {
    job.status = 'processing';
    job.progress = 10;

    const { serverId, channels, dateRange, filters, reportTypes } = job.config;

    // Ensure server exports directory exists
    const serverExportsDir = path.join(EXPORTS_DIR, serverId);
    await fs.mkdir(serverExportsDir, { recursive: true });

    // Create configuration file for channel analyzer
    const configForAnalyzer = {
      channels,
      dateRange,
      filters,
      reportTypes,
      outputDir: serverExportsDir
    };

    const configPath = path.join(serverExportsDir, `config-${job.jobId}.json`);
    await fs.writeFile(configPath, JSON.stringify(configForAnalyzer, null, 2), 'utf-8');

    job.progress = 20;

    // Run channel analyzer for each channel
    const generatedFiles: string[] = [];

    for (let i = 0; i < channels.length; i++) {
      const channelId = channels[i];
      const channelProgress = 20 + (60 / channels.length) * i;
      job.progress = channelProgress;

      console.log(`📊 Processing channel ${i + 1}/${channels.length}: ${channelId}`);

      await new Promise<void>((resolve, reject) => {
        // Convert reportTypes array to comma-separated string
        const reportTypesStr = reportTypes.join(',');

        const analyzer = spawn('npx', [
          'tsx',
          path.join(process.cwd(), 'scripts', 'channel-analyzer.ts'),
          channelId,
          dateRange.start,
          dateRange.end,
          reportTypesStr
        ], {
          cwd: process.cwd(),
          env: { ...process.env },
          shell: true // Required for Windows to find npx
        });

        let output = '';
        let errorOutput = '';

        analyzer.stdout.on('data', (data) => {
          output += data.toString();
          console.log(`[Analyzer ${channelId}]: ${data.toString().trim()}`);
        });

        analyzer.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.error(`[Analyzer Error ${channelId}]: ${data.toString().trim()}`);
        });

        analyzer.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Channel ${channelId} processed successfully`);
            resolve();
          } else {
            console.error(`❌ Channel ${channelId} processing failed with code ${code}`);
            reject(new Error(`Channel analyzer failed with code ${code}: ${errorOutput}`));
          }
        });
      });
    }

    job.progress = 80;

    // Move generated files from exports/ to exports/{serverId}/
    // The channel-analyzer saves to exports/ but we need them in exports/{serverId}/
    const rootExportsDir = path.join(process.cwd(), 'exports');

    console.log(`📂 Looking for files in: ${rootExportsDir}`);
    console.log(`📂 Moving files to: ${serverExportsDir}`);
    console.log(`🔍 Date filter - start: ${dateRange.start}, end: ${dateRange.end}`);

    try {
      const rootFiles = await fs.readdir(rootExportsDir);
      console.log(`📁 Found ${rootFiles.length} items in exports directory:`, rootFiles);

      for (const file of rootFiles) {
        // Skip directories
        const sourcePath = path.join(rootExportsDir, file);
        const stat = await fs.stat(sourcePath);
        if (stat.isDirectory()) {
          console.log(`⏭️ Skipping directory: ${file}`);
          continue;
        }

        console.log(`🔎 Checking file: ${file}`);

        // Check if it's a CSV file from this export (contains the date range)
        const matchesDate = file.includes(dateRange.start) || file.includes(dateRange.end);
        console.log(`  - Is CSV: ${file.endsWith('.csv')}`);
        console.log(`  - Matches date: ${matchesDate} (contains ${dateRange.start} or ${dateRange.end})`);

        if (file.endsWith('.csv') && matchesDate) {
          const destPath = path.join(serverExportsDir, file);

          try {
            // Move the file
            await fs.rename(sourcePath, destPath);
            generatedFiles.push(file);
            console.log(`✅ Moved ${file} to ${serverId} directory`);
          } catch (error) {
            console.warn(`⚠️ Failed to move ${file}:`, error);
          }
        } else {
          console.log(`⏭️ File doesn't match criteria, skipping: ${file}`);
        }
      }
    } catch (error) {
      console.error(`⚠️ Failed to read exports directory:`, error);
    }

    console.log(`📊 Found ${generatedFiles.length} export files:`, generatedFiles);

    job.progress = 90;

    // Clean up config file
    try {
      await fs.unlink(configPath);
    } catch {
      // Ignore cleanup errors
    }

    // Update export history
    const historyPath = path.join(EXPORT_HISTORY_DIR, `${serverId}.json`);
    let history: ExportHistoryEntry[] = [];

    try {
      const data = await fs.readFile(historyPath, 'utf-8');
      history = JSON.parse(data);
    } catch {
      // New history file
    }

    const newEntry: ExportHistoryEntry = {
      jobId: job.jobId,
      timestamp: new Date().toISOString(),
      config: job.config,
      files: generatedFiles,
      fileCount: generatedFiles.length
    };

    history.unshift(newEntry);

    // Keep last 50 exports
    if (history.length > 50) {
      history = history.slice(0, 50);
    }

    await fs.writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');

    // Mark job as completed
    job.status = 'completed';
    job.progress = 100;
    job.files = generatedFiles;
    job.completedAt = new Date();

    console.log(`✅ Export job ${job.jobId} completed successfully`);
    console.log(`📁 Generated ${generatedFiles.length} files:`, generatedFiles);

    // Clean up old jobs after 1 hour
    setTimeout(() => {
      activeJobs.delete(job.jobId);
    }, 60 * 60 * 1000);

  } catch (error: any) {
    console.error(`❌ Export job ${job.jobId} failed:`, error);
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date();
    throw error;
  }
}

export default router;
