const fs = require('fs');
const path = require('path');

console.log('📊 Calculating CURRENT WEEK Rankings from ALL Activities Since Sunday 00:00...');

function getCurrentWeekBoundaries() {
  const now = new Date();
  const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

  // Get this week's Sunday at 00:00 Brazil time
  const weekStart = new Date(brazilTime);
  weekStart.setDate(brazilTime.getDate() - brazilTime.getDay()); // Go to Sunday
  weekStart.setHours(0, 0, 0, 0);

  // Get this week's Saturday at 23:59 Brazil time
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  console.log(`📅 Current Week: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
  return { weekStart, weekEnd };
}

function parseWorkerSessionsForCurrentWeek(weekStart, weekEnd) {
  const workerSessionsDir = path.join(process.cwd(), 'data', 'worker-sessions', 'archived');

  if (!fs.existsSync(workerSessionsDir)) {
    console.log('❌ Archived sessions directory not found');
    return {};
  }

  const sessionFiles = fs.readdirSync(workerSessionsDir).filter(file => file.endsWith('.json'));
  console.log(`📁 Found ${sessionFiles.length} session files to analyze`);

  const weeklyStats = {};
  let totalThisWeekPlants = 0;
  let totalThisWeekAnimals = 0;
  let totalThisWeekFerrovia = 0;

  for (const file of sessionFiles) {
    try {
      const sessionPath = path.join(workerSessionsDir, file);
      const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));

      if (!sessionData.workerId || !sessionData.workerName) {
        continue;
      }

      // Initialize worker stats if not exists
      if (!weeklyStats[sessionData.workerId]) {
        weeklyStats[sessionData.workerId] = {
          workerId: sessionData.workerId,
          workerName: sessionData.workerName,
          plants: { thisWeek: 0, allTime: 0 },
          animals: { thisWeek: 0, allTime: 0 },
          ferrovia: { thisWeek: 0, allTime: 0 },
          lastActivity: new Date().toISOString()
        };
      }

      // Check plant transactions
      if (sessionData.plantTransactions && Array.isArray(sessionData.plantTransactions)) {
        sessionData.plantTransactions.forEach((transaction) => {
          if (transaction.type === 'plant_deposited' && transaction.quantity) {
            // Check if transaction is within current week
            const transactionDate = new Date(transaction.timestamp || sessionData.startTime || sessionData.endTime);

            if (transactionDate >= weekStart && transactionDate <= weekEnd) {
              weeklyStats[sessionData.workerId].plants.thisWeek += transaction.quantity;
              totalThisWeekPlants += transaction.quantity;
              console.log(`🌱 THIS WEEK: ${sessionData.workerName} +${transaction.quantity} ${transaction.itemName} (${transactionDate.toISOString()})`);
            }

            // Always add to all-time
            weeklyStats[sessionData.workerId].plants.allTime += transaction.quantity;
          }
        });
      }

      // Check animal transactions
      if (sessionData.animalTransactions && Array.isArray(sessionData.animalTransactions)) {
        sessionData.animalTransactions.forEach((transaction) => {
          if (transaction.quantity) {
            const transactionDate = new Date(transaction.timestamp || sessionData.startTime || sessionData.endTime);

            if (transactionDate >= weekStart && transactionDate <= weekEnd) {
              weeklyStats[sessionData.workerId].animals.thisWeek += transaction.quantity;
              totalThisWeekAnimals += transaction.quantity;
              console.log(`🐄 THIS WEEK: ${sessionData.workerName} +${transaction.quantity} animals (${transactionDate.toISOString()})`);
            }

            weeklyStats[sessionData.workerId].animals.allTime += transaction.quantity;
          }
        });
      }

    } catch (error) {
      console.warn(`⚠️ Error parsing session ${file}:`, error.message);
    }
  }

  console.log(`\n📊 CURRENT WEEK TOTALS:`);
  console.log(`🌱 Plants deposited this week: ${totalThisWeekPlants}`);
  console.log(`🐄 Animals sold this week: ${totalThisWeekAnimals}`);
  console.log(`🚂 Ferrovia missions this week: ${totalThisWeekFerrovia}`);

  return weeklyStats;
}

function parseChannelLogsForCurrentWeek(weekStart, weekEnd) {
  const channelLogsDir = path.join(process.cwd(), 'frontend', 'public', 'channel-logs');

  if (!fs.existsSync(channelLogsDir)) {
    console.log('❌ Channel logs directory not found');
    return {};
  }

  const files = fs.readdirSync(channelLogsDir).filter(file => file.endsWith('.json'));
  console.log(`📁 Found ${files.length} channel log files to analyze`);

  const ferroviaStats = {};
  let totalThisWeekFerrovia = 0;

  for (const file of files) {
    const channelPath = path.join(channelLogsDir, file);

    try {
      const data = JSON.parse(fs.readFileSync(channelPath, 'utf8'));

      if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach((msg) => {
          const content = msg.content || msg.embedContent || '';
          const messageDate = new Date(msg.timestamp);

          // Only process messages from current week
          if (messageDate >= weekStart && messageDate <= weekEnd) {
            if (content.includes('ATLANTA TREM') && content.includes('ENTREGA COMPLETA')) {
              const authorMatch = content.match(/Autor::\s+([^|]+?)\s+\|\s+FIXO:/i);
              if (authorMatch) {
                const workerName = authorMatch[1].trim();

                if (!ferroviaStats[workerName]) {
                  ferroviaStats[workerName] = 0;
                }
                ferroviaStats[workerName]++;
                totalThisWeekFerrovia++;
                console.log(`🚂 THIS WEEK: ${workerName} completed Ferrovia mission (${messageDate.toISOString()})`);
              }
            }
          }
        });
      }
    } catch (error) {
      console.warn(`⚠️ Error parsing ${file}:`, error.message);
    }
  }

  console.log(`🚂 Total Ferrovia missions this week: ${totalThisWeekFerrovia}`);
  return ferroviaStats;
}

function updateRankingTotals(weeklyStats, ferroviaStats) {
  const totalsFile = path.join(process.cwd(), 'data', 'ranking-totals.json');
  let allTimeData = {};

  // Load existing all-time data
  if (fs.existsSync(totalsFile)) {
    allTimeData = JSON.parse(fs.readFileSync(totalsFile, 'utf8'));
  }

  // Update with calculated weekly data
  for (const workerId in weeklyStats) {
    const worker = weeklyStats[workerId];

    if (!allTimeData[workerId]) {
      allTimeData[workerId] = {
        workerId: worker.workerId,
        workerName: worker.workerName,
        plants: { thisWeek: 0, allTime: 0 },
        animals: { thisWeek: 0, allTime: 0 },
        ferrovia: { thisWeek: 0, allTime: 0 },
        lastActivity: new Date().toISOString()
      };
    }

    // Set THIS WEEK's calculated values
    allTimeData[workerId].plants.thisWeek = worker.plants.thisWeek;
    allTimeData[workerId].animals.thisWeek = worker.animals.thisWeek;

    // Preserve or set all-time totals
    allTimeData[workerId].plants.allTime = worker.plants.allTime;
    allTimeData[workerId].animals.allTime = worker.animals.allTime;

    allTimeData[workerId].lastActivity = new Date().toISOString();
    allTimeData[workerId].workerName = worker.workerName;
  }

  // Add ferrovia data
  for (const workerName in ferroviaStats) {
    // Find worker by name in allTimeData
    const workerId = Object.keys(allTimeData).find(id =>
      allTimeData[id].workerName === workerName
    ) || 'unknown';

    if (!allTimeData[workerId]) {
      allTimeData[workerId] = {
        workerId: workerId,
        workerName: workerName,
        plants: { thisWeek: 0, allTime: 0 },
        animals: { thisWeek: 0, allTime: 0 },
        ferrovia: { thisWeek: 0, allTime: 0 },
        lastActivity: new Date().toISOString()
      };
    }

    allTimeData[workerId].ferrovia.thisWeek = ferroviaStats[workerName];
    // Keep existing all-time ferrovia or set it
    if (allTimeData[workerId].ferrovia.allTime < ferroviaStats[workerName]) {
      allTimeData[workerId].ferrovia.allTime = ferroviaStats[workerName];
    }
  }

  // Save updated data
  fs.writeFileSync(totalsFile, JSON.stringify(allTimeData, null, 2));

  console.log(`\n✅ Updated ranking totals with REAL current week data!`);
  return allTimeData;
}

try {
  const { weekStart, weekEnd } = getCurrentWeekBoundaries();

  console.log('\n=== ANALYZING WORKER SESSIONS FOR CURRENT WEEK ===');
  const weeklyStats = parseWorkerSessionsForCurrentWeek(weekStart, weekEnd);

  console.log('\n=== ANALYZING CHANNEL LOGS FOR CURRENT WEEK ===');
  const ferroviaStats = parseChannelLogsForCurrentWeek(weekStart, weekEnd);

  console.log('\n=== UPDATING RANKING TOTALS ===');
  const finalData = updateRankingTotals(weeklyStats, ferroviaStats);

  // Show top current week performers
  const plantWorkers = Object.values(finalData)
    .filter(w => w.plants.thisWeek > 0)
    .sort((a, b) => b.plants.thisWeek - a.plants.thisWeek)
    .slice(0, 10);

  console.log('\n🏆 TOP 10 PLANT WORKERS THIS WEEK:');
  plantWorkers.forEach((worker, i) => {
    console.log(`  ${i+1}. ${worker.workerName}: ${worker.plants.thisWeek} plantas esta semana, ${worker.plants.allTime} total`);
  });

  const animalWorkers = Object.values(finalData)
    .filter(w => w.animals.thisWeek > 0)
    .sort((a, b) => b.animals.thisWeek - a.animals.thisWeek)
    .slice(0, 10);

  console.log('\n🏆 TOP 10 ANIMAL WORKERS THIS WEEK:');
  animalWorkers.forEach((worker, i) => {
    console.log(`  ${i+1}. ${worker.workerName}: ${worker.animals.thisWeek} animais esta semana, ${worker.animals.allTime} total`);
  });

  const ferroviaWorkers = Object.values(finalData)
    .filter(w => w.ferrovia.thisWeek > 0)
    .sort((a, b) => b.ferrovia.thisWeek - a.ferrovia.thisWeek);

  console.log('\n🏆 FERROVIA WORKERS THIS WEEK:');
  ferroviaWorkers.forEach((worker, i) => {
    console.log(`  ${i+1}. ${worker.workerName}: ${worker.ferrovia.thisWeek} missões esta semana, ${worker.ferrovia.allTime} total`);
  });

  console.log('\n✅ Current week rankings calculated correctly!');

} catch (error) {
  console.error('❌ Error calculating current week rankings:', error);
}