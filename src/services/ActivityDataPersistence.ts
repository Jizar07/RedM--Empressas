import fs from 'fs/promises';
import path from 'path';
import { ItemActivity, CrossFirmTransfer, RecipeAttempt, WorkerGlobalProfile } from './GlobalWorkerTracker';
import { CraftingPrediction, AnomalyDetection } from './RecipeValidator';

export interface PersistedData {
  activities: ItemActivity[];
  crossFirmTransfers: CrossFirmTransfer[];
  recipeAttempts: RecipeAttempt[];
  workerProfiles: WorkerGlobalProfile[];
  craftingPredictions: CraftingPrediction[];
  anomalies: AnomalyDetection[];
  metadata: {
    lastSaved: string;
    version: string;
    totalRecords: number;
    dataIntegrity: {
      activitiesCount: number;
      workersCount: number;
      transfersCount: number;
      recipesCount: number;
    };
  };
}

export interface DataExportOptions {
  includeActivities?: boolean;
  includeTransfers?: boolean;
  includeRecipes?: boolean;
  includeProfiles?: boolean;
  includePredictions?: boolean;
  includeAnomalies?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  workers?: string[];
  firms?: string[];
  format?: 'json' | 'csv';
}

export class ActivityDataPersistence {
  private static instance: ActivityDataPersistence | null = null;
  private readonly dataDir: string;
  private readonly backupDir: string;

  // File paths
  private readonly activitiesFile: string;
  private readonly transfersFile: string;
  private readonly recipesFile: string;
  private readonly profilesFile: string;
  private readonly predictionsFile: string;
  private readonly anomaliesFile: string;
  private readonly metadataFile: string;

  // Configuration
  private readonly AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_BACKUP_FILES = 10;
  private readonly COMPRESSION_ENABLED = true;

  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'global-tracking');
    this.backupDir = path.join(this.dataDir, 'backups');

    this.activitiesFile = path.join(this.dataDir, 'activities.json');
    this.transfersFile = path.join(this.dataDir, 'transfers.json');
    this.recipesFile = path.join(this.dataDir, 'recipe-attempts.json');
    this.profilesFile = path.join(this.dataDir, 'worker-profiles.json');
    this.predictionsFile = path.join(this.dataDir, 'crafting-predictions.json');
    this.anomaliesFile = path.join(this.dataDir, 'anomalies.json');
    this.metadataFile = path.join(this.dataDir, 'metadata.json');

    this.initializeDirectories();
    this.startAutoSave();
  }

  public static getInstance(): ActivityDataPersistence {
    if (!ActivityDataPersistence.instance) {
      ActivityDataPersistence.instance = new ActivityDataPersistence();
    }
    return ActivityDataPersistence.instance;
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log('📁 ActivityDataPersistence: Directories initialized');
    } catch (error) {
      console.error('❌ ActivityDataPersistence: Error initializing directories:', error);
    }
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.performAutoSave();
    }, this.AUTO_SAVE_INTERVAL);

    console.log(`⏰ ActivityDataPersistence: Auto-save started (${this.AUTO_SAVE_INTERVAL / 1000 / 60} min intervals)`);
  }

  private async performAutoSave(): Promise<void> {
    try {
      // This would integrate with GlobalWorkerTracker to get current data
      console.log('💾 ActivityDataPersistence: Performing auto-save...');
      // Implementation would go here to save current state
    } catch (error) {
      console.error('❌ ActivityDataPersistence: Auto-save failed:', error);
    }
  }

  // Methods below are not yet implemented
}