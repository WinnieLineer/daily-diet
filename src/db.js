import Dexie from 'dexie';

export const db = new Dexie('dailyDietDB');

db.version(1).stores({
  dietLogs: '++id, date, dish_name, calories, protein, timestamp',
  weightLogs: '++id, date, weight, timestamp'
});

// Helper to get daily totals
export async function getDailySummary(date) {
  const logs = await db.dietLogs.where('date').equals(date).toArray();
  return logs.reduce((acc, log) => {
    acc.calories += log.calories || 0;
    acc.protein += log.protein || 0;
    return acc;
  }, { calories: 0, protein: 0 });
}
