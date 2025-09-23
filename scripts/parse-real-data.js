const fs = require('fs');
const path = require('path');
const { WeeklyRankingService } = require('../dist/services/WeeklyRankingService.js');

console.log('📊 Parsing REAL Worker Data from Actual Discord Messages...');

function parseWorkerSessions() {
  const workerSessionsDir = path.join(process.cwd(), 'data', 'worker-sessions', 'archived');

  if (!fs.existsSync(workerSessionsDir)) {
    console.log('❌ Archived sessions directory not found');
    return;
  }

  const sessionFiles = fs.readdirSync(workerSessionsDir).filter(file => file.endsWith('.json'));
  console.log(`📁 Found ${sessionFiles.length} real worker session files`);

  const weeklyService = WeeklyRankingService.getInstance();
  let totalPlantTransactions = 0;
  let totalAnimalTransactions = 0;
  let totalWorkers = new Set();

  for (const file of sessionFiles) {
    try {
      const sessionPath = path.join(workerSessionsDir, file);
      const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

      if (!sessionData.workerId || !sessionData.workerName) {
        continue; // Skip invalid sessions
      }

      totalWorkers.add(sessionData.workerName);

      // Parse REAL plant transactions
      if (sessionData.plantTransactions && Array.isArray(sessionData.plantTransactions)) {
        sessionData.plantTransactions.forEach((transaction) => {
          if (transaction.type === 'plant_deposited' && transaction.quantity) {
            weeklyService.updateWorkerStats(
              sessionData.workerId,
              sessionData.workerName,
              'plants',
              transaction.quantity
            );
            totalPlantTransactions++;
            console.log(`🌱 ${sessionData.workerName}: +${transaction.quantity} ${transaction.itemName}`);
          }
        });
      }

      // Parse REAL animal transactions
      if (sessionData.animalTransactions && Array.isArray(sessionData.animalTransactions)) {
        sessionData.animalTransactions.forEach((transaction) => {
          if (transaction.quantity) {
            weeklyService.updateWorkerStats(
              sessionData.workerId,
              sessionData.workerName,
              'animals',
              transaction.quantity
            );
            totalAnimalTransactions++;
            console.log(`🐄 ${sessionData.workerName}: +${transaction.quantity} ${transaction.animalType || 'animals'}`);
          }
        });
      }

    } catch (error) {
      console.warn(`⚠️ Error parsing session ${file}:`, error.message);
    }
  }

  console.log(`\n📊 REAL Worker Sessions Summary:`);
  console.log(`Total unique workers: ${totalWorkers.size}`);
  console.log(`Total plant transactions: ${totalPlantTransactions}`);
  console.log(`Total animal transactions: ${totalAnimalTransactions}`);
}

function parseChannelLogs() {
  const channelLogsDir = path.join(process.cwd(), 'frontend', 'public', 'channel-logs');

  if (!fs.existsSync(channelLogsDir)) {
    console.log('❌ Channel logs directory not found');
    return;
  }

  const files = fs.readdirSync(channelLogsDir).filter(file => file.endsWith('.json'));
  console.log(`📁 Found ${files.length} channel log files`);

  const weeklyService = WeeklyRankingService.getInstance();
  let ferroviaActivities = 0;

  for (const file of files) {
    const channelPath = path.join(channelLogsDir, file);

    try {
      const data = JSON.parse(fs.readFileSync(channelPath, 'utf8'));

      if (data.messages && Array.isArray(data.messages)) {
        console.log(`📋 Processing ${data.messages.length} messages from ${file}`);

        data.messages.forEach((msg) => {
          // Only look for REAL Ferrovia missions from actual message content
          const content = msg.content || msg.embedContent || '';

          // Look for REAL Ferrovia activity patterns
          if (content.includes('ATLANTA TREM') && content.includes('ENTREGA COMPLETA')) {
            const authorMatch = content.match(/Autor::\s+([^|]+?)\s+\|\s+FIXO:/i);
            if (authorMatch) {
              const workerName = authorMatch[1].trim();
              weeklyService.updateWorkerStats('unknown', workerName, 'ferrovia', 1);
              ferroviaActivities++;
              console.log(`🚂 ${workerName}: Ferrovia mission completed`);
            }
          }
        });
      }
    } catch (error) {
      console.warn(`⚠️ Error parsing ${file}:`, error.message);
    }
  }

  console.log(`\n📊 REAL Channel Logs Summary:`);
  console.log(`Total Ferrovia missions: ${ferroviaActivities}`);
}

try {
  console.log('\n=== PARSING REAL WORKER SESSIONS ===');
  parseWorkerSessions();

  console.log('\n=== PARSING REAL CHANNEL LOGS ===');
  parseChannelLogs();

  // Get final REAL rankings
  const weeklyService = WeeklyRankingService.getInstance();
  const weeklyData = weeklyService.getWeeklyRankings();

  console.log('\n📈 REAL WEEKLY RANKINGS:');
  console.log(`🌱 Plant Rankings: ${weeklyData.plantRankings.length} workers`);
  console.log(`🐄 Animal Rankings: ${weeklyData.animalRankings.length} workers`);
  console.log(`🚂 Ferrovia Rankings: ${weeklyData.ferroviaRankings.length} workers`);

  if (weeklyData.plantRankings.length > 0) {
    console.log('\nTop 10 REAL Plant Workers:');
    weeklyData.plantRankings.slice(0, 10).forEach((worker, i) => {
      console.log(`  ${i+1}. ${worker.workerName}: ${worker.plants.thisWeek} this week, ${worker.plants.allTime} total`);
    });
  }

  if (weeklyData.animalRankings.length > 0) {
    console.log('\nTop 10 REAL Animal Workers:');
    weeklyData.animalRankings.slice(0, 10).forEach((worker, i) => {
      console.log(`  ${i+1}. ${worker.workerName}: ${worker.animals.thisWeek} this week, ${worker.animals.allTime} total`);
    });
  }

  if (weeklyData.ferroviaRankings.length > 0) {
    console.log('\nTop 10 REAL Ferrovia Workers:');
    weeklyData.ferroviaRankings.slice(0, 10).forEach((worker, i) => {
      console.log(`  ${i+1}. ${worker.workerName}: ${worker.ferrovia.thisWeek} this week, ${worker.ferrovia.allTime} total`);
    });
  }

  console.log('\n✅ Weekly rankings populated with REAL DATA ONLY!');

} catch (error) {
  console.error('❌ Error parsing real data:', error);
}