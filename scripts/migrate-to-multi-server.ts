import fs from 'fs/promises';
import path from 'path';

// Server IDs
const CABRA_DA_PESTE = '1274479410107646004';
const FAZENDA_BOT = '1413530823788859424';

const DATA_DIR = path.join(process.cwd(), 'data');

interface MigrationSummary {
  configFiles: string[];
  directories: string[];
  filesM

oved: number;
  errors: string[];
}

async function migrate(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    configFiles: [],
    directories: [],
    filesMoved: 0,
    errors: []
  };

  console.log('🚀 Starting multi-server migration...\n');
  console.log(`📦 Migrating Cabra da Peste data to: ${CABRA_DA_PESTE}`);
  console.log(`📦 Creating directories for Fazenda Bot: ${FAZENDA_BOT}\n`);

  try {
    // Phase 1: Migrate Config Files
    console.log('📋 Phase 1: Migrating config files...');
    await migrateConfigFile('farm-service-config.json', summary);
    await migrateConfigFile('ferrovia-service-config.json', summary);
    await migrateConfigFile('payment-audit-config.json', summary);

    // Phase 2: Migrate Data Directories
    console.log('\n📂 Phase 2: Migrating data directories...');
    const directoriesToMigrate = [
      'worker-sessions',
      'supply-chain',
      'weekly-rankings',
      'weekly-sales',
      'manager-balances',
      'manager-withdrawals',
      'worker-channels',
      'worker-prices',
      'paid-receipts',
      'payment-receipts',
      'persistent-receipts',
      'verification-logs',
      'payment-audits',
      'export-history',
      'players'
    ];

    for (const dir of directoriesToMigrate) {
      await migrateDirectory(dir, summary);
    }

    // Phase 3: Create directories for Fazenda Bot
    console.log('\n📁 Phase 3: Creating directories for Fazenda Bot...');
    for (const dir of directoriesToMigrate) {
      await createServerDirectory(dir, FAZENDA_BOT, summary);
    }

    // Phase 4: Verification
    console.log('\n✅ Phase 4: Verification...');
    await verify(summary);

    return summary;
  } catch (error: any) {
    summary.errors.push(`Migration failed: ${error.message}`);
    throw error;
  }
}

async function migrateConfigFile(filename: string, summary: MigrationSummary): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);

  try {
    // Check if file exists
    await fs.access(filePath);

    // Read current config
    const data = await fs.readFile(filePath, 'utf8');
    const currentConfig = JSON.parse(data);

    // Check if already migrated
    if (currentConfig.servers) {
      console.log(`  ⏭️  ${filename} already migrated`);
      return;
    }

    // Create new server-based structure
    const newConfig = {
      servers: {
        [CABRA_DA_PESTE]: currentConfig
      }
    };

    // Save migrated config
    await fs.writeFile(filePath, JSON.stringify(newConfig, null, 2));
    summary.configFiles.push(filename);
    console.log(`  ✅ ${filename} migrated to server-based format`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`  ⏭️  ${filename} not found, skipping`);
    } else {
      summary.errors.push(`Error migrating ${filename}: ${error.message}`);
      console.error(`  ❌ ${filename} migration failed: ${error.message}`);
    }
  }
}

async function migrateDirectory(dirName: string, summary: MigrationSummary): Promise<void> {
  const sourcePath = path.join(DATA_DIR, dirName);
  const targetPath = path.join(DATA_DIR, dirName, CABRA_DA_PESTE);

  try {
    // Check if source exists
    const exists = await fileExists(sourcePath);
    if (!exists) {
      console.log(`  ⏭️  ${dirName}/ not found, skipping`);
      return;
    }

    // Check if already migrated
    const targetExists = await fileExists(targetPath);
    if (targetExists) {
      console.log(`  ⏭️  ${dirName}/ already migrated`);
      return;
    }

    // Create target directory
    await fs.mkdir(targetPath, { recursive: true });

    // Get all files and subdirectories
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });

    for (const entry of entries) {
      const source = path.join(sourcePath, entry.name);
      const target = path.join(targetPath, entry.name);

      // Skip if it's the target directory itself
      if (entry.name === CABRA_DA_PESTE || entry.name === FAZENDA_BOT) {
        continue;
      }

      if (entry.isDirectory()) {
        // Move entire directory
        await fs.rename(source, target);
        console.log(`    📁 Moved ${dirName}/${entry.name}/`);
      } else {
        // Move file
        await fs.rename(source, target);
        summary.filesMoved++;
        console.log(`    📄 Moved ${dirName}/${entry.name}`);
      }
    }

    summary.directories.push(dirName);
    console.log(`  ✅ ${dirName}/ migrated`);
  } catch (error: any) {
    summary.errors.push(`Error migrating ${dirName}: ${error.message}`);
    console.error(`  ❌ ${dirName}/ migration failed: ${error.message}`);
  }
}

async function createServerDirectory(dirName: string, serverId: string, summary: MigrationSummary): Promise<void> {
  const dirPath = path.join(DATA_DIR, dirName, serverId);

  try {
    const exists = await fileExists(dirPath);
    if (exists) {
      console.log(`  ⏭️  ${dirName}/${serverId}/ already exists`);
      return;
    }

    await fs.mkdir(dirPath, { recursive: true });
    console.log(`  ✅ Created ${dirName}/${serverId}/`);
  } catch (error: any) {
    summary.errors.push(`Error creating ${dirName}/${serverId}: ${error.message}`);
    console.error(`  ❌ Failed to create ${dirName}/${serverId}/: ${error.message}`);
  }
}

async function verify(summary: MigrationSummary): Promise<void> {
  console.log('\n📊 Migration Summary:');
  console.log(`  Config files migrated: ${summary.configFiles.length}`);
  console.log(`  Directories migrated: ${summary.directories.length}`);
  console.log(`  Files moved: ${summary.filesMoved}`);
  console.log(`  Errors: ${summary.errors.length}`);

  if (summary.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    summary.errors.forEach(err => console.log(`  - ${err}`));
  }

  // Verify critical directories exist
  const criticalDirs = [
    `worker-sessions/${CABRA_DA_PESTE}`,
    `supply-chain/${CABRA_DA_PESTE}`,
    `weekly-rankings/${CABRA_DA_PESTE}`
  ];

  console.log('\n🔍 Verifying critical directories...');
  for (const dir of criticalDirs) {
    const dirPath = path.join(DATA_DIR, dir);
    const exists = await fileExists(dirPath);
    if (exists) {
      console.log(`  ✅ ${dir}/`);
    } else {
      console.log(`  ❌ ${dir}/ - MISSING!`);
      summary.errors.push(`Critical directory missing: ${dir}`);
    }
  }

  if (summary.errors.length === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please review above.');
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Run migration
migrate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
