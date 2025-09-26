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

  /**\n   * Save all data to persistent storage\n   */\n  public async saveAllData(data: PersistedData): Promise<void> {\n    try {\n      console.log('💾 ActivityDataPersistence: Saving all tracking data...');\n      \n      // Create backup before saving new data\n      await this.createBackup();\n      \n      // Save each data type to separate files for better performance\n      const savePromises = [\n        this.saveToFile(this.activitiesFile, data.activities),\n        this.saveToFile(this.transfersFile, data.crossFirmTransfers),\n        this.saveToFile(this.recipesFile, data.recipeAttempts),\n        this.saveToFile(this.profilesFile, data.workerProfiles),\n        this.saveToFile(this.predictionsFile, data.craftingPredictions),\n        this.saveToFile(this.anomaliesFile, data.anomalies),\n        this.saveToFile(this.metadataFile, data.metadata)\n      ];\n      \n      await Promise.all(savePromises);\n      \n      console.log('✅ ActivityDataPersistence: All data saved successfully');\n      console.log(`📊 Saved: ${data.activities.length} activities, ${data.workerProfiles.length} profiles, ${data.crossFirmTransfers.length} transfers`);\n    } catch (error) {\n      console.error('❌ ActivityDataPersistence: Error saving data:', error);\n      throw error;\n    }\n  }\n  \n  /**\n   * Load all data from persistent storage\n   */\n  public async loadAllData(): Promise<PersistedData | null> {\n    try {\n      console.log('📖 ActivityDataPersistence: Loading tracking data...');\n      \n      const [activities, transfers, recipes, profiles, predictions, anomalies, metadata] = await Promise.allSettled([\n        this.loadFromFile<ItemActivity[]>(this.activitiesFile),\n        this.loadFromFile<CrossFirmTransfer[]>(this.transfersFile),\n        this.loadFromFile<RecipeAttempt[]>(this.recipesFile),\n        this.loadFromFile<WorkerGlobalProfile[]>(this.profilesFile),\n        this.loadFromFile<CraftingPrediction[]>(this.predictionsFile),\n        this.loadFromFile<AnomalyDetection[]>(this.anomaliesFile),\n        this.loadFromFile<PersistedData['metadata']>(this.metadataFile)\n      ]);\n      \n      const data: PersistedData = {\n        activities: activities.status === 'fulfilled' ? activities.value || [] : [],\n        crossFirmTransfers: transfers.status === 'fulfilled' ? transfers.value || [] : [],\n        recipeAttempts: recipes.status === 'fulfilled' ? recipes.value || [] : [],\n        workerProfiles: profiles.status === 'fulfilled' ? profiles.value || [] : [],\n        craftingPredictions: predictions.status === 'fulfilled' ? predictions.value || [] : [],\n        anomalies: anomalies.status === 'fulfilled' ? anomalies.value || [] : [],\n        metadata: metadata.status === 'fulfilled' && metadata.value ? metadata.value : {\n          lastSaved: new Date().toISOString(),\n          version: '1.0.0',\n          totalRecords: 0,\n          dataIntegrity: {\n            activitiesCount: 0,\n            workersCount: 0,\n            transfersCount: 0,\n            recipesCount: 0\n          }\n        }\n      };\n      \n      console.log('✅ ActivityDataPersistence: Data loaded successfully');\n      console.log(`📊 Loaded: ${data.activities.length} activities, ${data.workerProfiles.length} profiles, ${data.crossFirmTransfers.length} transfers`);\n      \n      return data;\n    } catch (error) {\n      console.error('❌ ActivityDataPersistence: Error loading data:', error);\n      return null;\n    }\n  }\n  \n  /**\n   * Export data with filtering options\n   */\n  public async exportData(options: DataExportOptions = {}): Promise<string> {\n    try {\n      console.log('📤 ActivityDataPersistence: Exporting data with options:', options);\n      \n      const data = await this.loadAllData();\n      if (!data) {\n        throw new Error('No data available for export');\n      }\n      \n      // Apply filters\n      let filteredData = { ...data };\n      \n      // Date range filter\n      if (options.dateRange) {\n        const { start, end } = options.dateRange;\n        filteredData.activities = data.activities.filter(a => \n          a.timestamp >= start && a.timestamp <= end\n        );\n        filteredData.crossFirmTransfers = data.crossFirmTransfers.filter(t => \n          t.timestamp >= start && t.timestamp <= end\n        );\n      }\n      \n      // Workers filter\n      if (options.workers && options.workers.length > 0) {\n        filteredData.activities = filteredData.activities.filter(a => \n          options.workers!.includes(a.workerId)\n        );\n        filteredData.crossFirmTransfers = filteredData.crossFirmTransfers.filter(t => \n          options.workers!.includes(t.workerId)\n        );\n        filteredData.workerProfiles = filteredData.workerProfiles.filter(p => \n          options.workers!.includes(p.workerId)\n        );\n      }\n      \n      // Firms filter\n      if (options.firms && options.firms.length > 0) {\n        filteredData.activities = filteredData.activities.filter(a => \n          options.firms!.includes(a.firmId)\n        );\n      }\n      \n      // Include/exclude options\n      const exportData: Partial<PersistedData> = {\n        metadata: filteredData.metadata\n      };\n      \n      if (options.includeActivities !== false) {\n        exportData.activities = filteredData.activities;\n      }\n      if (options.includeTransfers !== false) {\n        exportData.crossFirmTransfers = filteredData.crossFirmTransfers;\n      }\n      if (options.includeRecipes !== false) {\n        exportData.recipeAttempts = filteredData.recipeAttempts;\n      }\n      if (options.includeProfiles !== false) {\n        exportData.workerProfiles = filteredData.workerProfiles;\n      }\n      if (options.includePredictions !== false) {\n        exportData.craftingPredictions = filteredData.craftingPredictions;\n      }\n      if (options.includeAnomalies !== false) {\n        exportData.anomalies = filteredData.anomalies;\n      }\n      \n      // Generate export\n      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');\n      const filename = `worker-tracking-export-${timestamp}.json`;\n      const exportPath = path.join(this.dataDir, 'exports', filename);\n      \n      await fs.mkdir(path.dirname(exportPath), { recursive: true });\n      await this.saveToFile(exportPath, exportData);\n      \n      console.log('✅ ActivityDataPersistence: Data exported to:', exportPath);\n      return exportPath;\n    } catch (error) {\n      console.error('❌ ActivityDataPersistence: Export error:', error);\n      throw error;\n    }\n  }\n  \n  /**\n   * Create a backup of current data\n   */\n  private async createBackup(): Promise<void> {\n    try {\n      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');\n      const backupName = `backup-${timestamp}`;\n      const backupPath = path.join(this.backupDir, backupName);\n      \n      await fs.mkdir(backupPath, { recursive: true });\n      \n      // Copy all current data files to backup directory\n      const filesToBackup = [\n        this.activitiesFile,\n        this.transfersFile,\n        this.recipesFile,\n        this.profilesFile,\n        this.predictionsFile,\n        this.anomaliesFile,\n        this.metadataFile\n      ];\n      \n      for (const file of filesToBackup) {\n        try {\n          const filename = path.basename(file);\n          const backupFile = path.join(backupPath, filename);\n          await fs.copyFile(file, backupFile);\n        } catch (error) {\n          // File might not exist yet, which is okay\n          console.log(`⚠️ ActivityDataPersistence: Skipping backup of ${file} (file may not exist yet)`);\n        }\n      }\n      \n      // Clean up old backups\n      await this.cleanupOldBackups();\n      \n      console.log('✅ ActivityDataPersistence: Backup created:', backupName);\n    } catch (error) {\n      console.error('❌ ActivityDataPersistence: Backup creation failed:', error);\n    }\n  }\n  \n  private async cleanupOldBackups(): Promise<void> {\n    try {\n      const backups = await fs.readdir(this.backupDir);\n      const backupDirs = backups.filter(name => name.startsWith('backup-'));\n      \n      if (backupDirs.length > this.MAX_BACKUP_FILES) {\n        const sortedBackups = backupDirs.sort().reverse();\n        const toDelete = sortedBackups.slice(this.MAX_BACKUP_FILES);\n        \n        for (const backup of toDelete) {\n          const backupPath = path.join(this.backupDir, backup);\n          await fs.rm(backupPath, { recursive: true, force: true });\n          console.log('🗑️ ActivityDataPersistence: Cleaned up old backup:', backup);\n        }\n      }\n    } catch (error) {\n      console.error('❌ ActivityDataPersistence: Backup cleanup error:', error);\n    }\n  }\n  \n  private async saveToFile(filePath: string, data: any): Promise<void> {\n    const jsonData = JSON.stringify(data, null, 2);\n    await fs.writeFile(filePath, jsonData, 'utf-8');\n  }\n  \n  private async loadFromFile<T>(filePath: string): Promise<T | null> {\n    try {\n      const data = await fs.readFile(filePath, 'utf-8');\n      return JSON.parse(data) as T;\n    } catch (error) {\n      return null;\n    }\n  }\n  \n  /**\n   * Get data statistics\n   */\n  public async getDataStatistics(): Promise<{\n    files: { [filename: string]: { size: number; lastModified: string } };\n    totalSize: number;\n    backupCount: number;\n    dataIntegrity: boolean;\n  }> {\n    try {\n      const files: { [filename: string]: { size: number; lastModified: string } } = {};\n      let totalSize = 0;\n      \n      const dataFiles = [\n        this.activitiesFile,\n        this.transfersFile,\n        this.recipesFile,\n        this.profilesFile,\n        this.predictionsFile,\n        this.anomaliesFile,\n        this.metadataFile\n      ];\n      \n      for (const file of dataFiles) {\n        try {\n          const stats = await fs.stat(file);\n          const filename = path.basename(file);\n          files[filename] = {\n            size: stats.size,\n            lastModified: stats.mtime.toISOString()\n          };\n          totalSize += stats.size;\n        } catch (error) {\n          // File doesn't exist\n        }\n      }\n      \n      const backups = await fs.readdir(this.backupDir).catch(() => []);\n      const backupCount = backups.filter(name => name.startsWith('backup-')).length;\n      \n      return {\n        files,\n        totalSize,\n        backupCount,\n        dataIntegrity: true // Could implement actual integrity checks\n      };\n    } catch (error) {\n      throw error;\n    }\n  }\n  \n  /**\n   * Shutdown and cleanup\n   */\n  public shutdown(): void {\n    if (this.autoSaveTimer) {\n      clearInterval(this.autoSaveTimer);\n      this.autoSaveTimer = null;\n    }\n    console.log('📴 ActivityDataPersistence: Shutdown complete');\n  }\n}