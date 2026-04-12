import Dexie from 'dexie';

export const db = new Dexie('dailyDietDB');

db.version(4).stores({
  dietLogs: '++id, date, dish_name, calories, protein, water, timestamp, location',
  weightLogs: '++id, date, weight, timestamp',
  settings: 'key' // key-value store for goals
});

export async function getDailySummary(date) {
  const logs = await db.dietLogs.where('date').equals(date).toArray();
  return logs.reduce((acc, log) => {
    acc.calories += log.calories || 0;
    acc.protein += log.protein || 0;
    acc.water += log.water || 0;
    return acc;
  }, { calories: 0, protein: 0, water: 0 });
}

export async function calculateStreak() {
  const allLogs = await db.dietLogs.orderBy('date').uniqueKeys();
  if (!allLogs || allLogs.length === 0) return 0;

  // Sort dates descending
  const dates = allLogs.sort((a, b) => new Date(b) - new Date(a));
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // If the most recent log isn't today or yesterday, streak is broken
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  
  let streak = 0;
  let currentDate = new Date(dates[0]);
  
  for (let i = 0; i < dates.length; i++) {
    const expectedDate = new Date(currentDate);
    expectedDate.setDate(currentDate.getDate() - i);
    const expectedStr = expectedDate.toISOString().split('T')[0];
    
    if (dates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}
