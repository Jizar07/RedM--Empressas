const fs = require('fs');
const path = require('path');

console.log('🔄 Resetting Weekly Rankings - Preserving All-Time Totals...');

function resetWeeklyRankings() {
  const totalsFile = path.join(process.cwd(), 'data', 'ranking-totals.json');

  if (!fs.existsSync(totalsFile)) {
    console.log('❌ No ranking totals file found');
    return;
  }

  const data = JSON.parse(fs.readFileSync(totalsFile, 'utf8'));
  let totalWorkers = 0;
  let totalPlantWorkers = 0;
  let totalAnimalWorkers = 0;
  let totalFerroviaWorkers = 0;

  // Reset weekly counters to 0, keep all-time totals
  for (const workerId in data) {
    const worker = data[workerId];

    // Reset weekly counters to zero
    worker.plants.thisWeek = 0;
    worker.animals.thisWeek = 0;
    worker.ferrovia.thisWeek = 0;

    // Update last activity
    worker.lastActivity = new Date().toISOString();

    totalWorkers++;
    if (worker.plants.allTime > 0) totalPlantWorkers++;
    if (worker.animals.allTime > 0) totalAnimalWorkers++;
    if (worker.ferrovia.allTime > 0) totalFerroviaWorkers++;

    console.log(`✅ Reset ${worker.workerName}: Plants (0 this week, ${worker.plants.allTime} total), Animals (0 this week, ${worker.animals.allTime} total), Ferrovia (0 this week, ${worker.ferrovia.allTime} total)`);
  }

  // Save the corrected data
  fs.writeFileSync(totalsFile, JSON.stringify(data, null, 2));

  console.log(`\n📊 Weekly Rankings Reset Complete:`);
  console.log(`Total workers: ${totalWorkers}`);
  console.log(`Workers with plant activities: ${totalPlantWorkers}`);
  console.log(`Workers with animal activities: ${totalAnimalWorkers}`);
  console.log(`Workers with ferrovia activities: ${totalFerroviaWorkers}`);
  console.log(`\n✅ All weekly counters reset to 0, all-time totals preserved!`);
}

try {
  resetWeeklyRankings();
} catch (error) {
  console.error('❌ Error resetting weekly rankings:', error);
}