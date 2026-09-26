import Dexie from 'dexie';
import { getLocalDateString } from './lib/constants';

export const db = new Dexie('dailyDietDB');

db.version(4).stores({
  dietLogs: '++id, date, dish_name, calories, protein, water, timestamp, location',
  weightLogs: '++id, date, weight, timestamp',
  settings: 'key' // key-value store for goals
});

db.version(8).stores({
  dietLogs: '++id, date, dish_name, calories, protein, water, timestamp, location',
  weightLogs: '++id, date, weight, timestamp',
  settings: 'key',
  favorites: '++id, dish_name',
  nutritionFacts: '++id, fact, lang',
  pendingAnalysis: 'key',
  analysisCache: 'hash'
});

db.version(9).stores({
  dietLogs: '++id, date, dish_name, calories, protein, water, timestamp, location',
  weightLogs: '++id, date, weight, timestamp',
  settings: 'key',
  favorites: '++id, dish_name',
  nutritionFacts: '++id, fact, lang',
  pendingAnalysis: 'key',
  analysisCache: 'hash',
  poopLogs: '++id, timestamp'
});

// 🛡️ WebKit / iOS Safari 暫態 IndexedDB 連線異常自動自癒機制 (WebKit Bug 197050)
if (typeof window !== 'undefined') {
  db.on('versionchange', () => {
    console.warn('[IndexedDB] Database version change detected, closing old connection');
    try { db.close(); } catch (e) {}
  });

  db.on('blocked', () => {
    console.warn('[IndexedDB] Database connection blocked by another tab or background process');
  });
}

/**
 * 🛡️ 當 WebKit 背景喚醒時若遭遇 IndexedDB 內部連線中斷，重置連線以便後續操作重新連接
 */
export function handleIndexedDbServerError(err) {
  const msg = String(err?.message || err || '');
  if (
    msg.includes('Indexed Database server') ||
    msg.includes('internal error was encountered in the Indexed Database server') ||
    msg.includes('without an in-progress transaction') ||
    msg.includes('Connection to Indexed Database server lost') ||
    msg.includes('UnknownError') ||
    msg.includes('DatabaseClosedError')
  ) {
    console.warn('[IndexedDB] WebKit transient database connection error detected, resetting connection...', err);
    try {
      if (db.isOpen()) {
        db.close();
      }
    } catch (e) {}
    return true;
  }
  return false;
}

export async function getDailySummary(date) {
  try {
    const logs = await db.dietLogs.where('date').equals(date).toArray();
    const summary = logs.reduce((acc, log) => {
      acc.calories += Number(log.calories) || 0;
      acc.protein += Number(log.protein) || 0;
      acc.water += Number(log.water) || 0;
      acc.carbs += Number(log.carbs) || 0;
      acc.fat += Number(log.fat) || 0;
      return acc;
    }, { calories: 0, protein: 0, water: 0, carbs: 0, fat: 0 });

    return {
      calories: Math.round(summary.calories),
      protein: Math.round(summary.protein * 10) / 10,
      water: Math.round(summary.water),
      carbs: Math.round(summary.carbs * 10) / 10,
      fat: Math.round(summary.fat * 10) / 10
    };
  } catch (err) {
    console.warn('[IndexedDB] getDailySummary fallback on cursor error:', err);
    return {
      calories: 0,
      protein: 0,
      water: 0,
      carbs: 0,
      fat: 0
    };
  }
}

export async function calculateStreak() {
  try {
    const allLogs = await db.dietLogs.orderBy('date').uniqueKeys();
    if (!allLogs || allLogs.length === 0) return 0;

    // Sort dates descending (string comparison for YYYY-MM-DD is exact and immune to Date timezone issues)
    const dates = allLogs.sort((a, b) => b.localeCompare(a));
    
    const today = getLocalDateString(new Date());
    const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
    
    // If the most recent log isn't today or yesterday, streak is broken
    if (dates[0] !== today && dates[0] !== yesterday) return 0;
    
    let streak = 0;
    // Parse YYYY-MM-DD into local noon (12:00:00) to prevent UTC midnight timezone shifts
    const [y, m, d] = dates[0].split('-').map(Number);
    const baseDate = new Date(y, m - 1, d, 12, 0, 0);
    
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(baseDate);
      expectedDate.setDate(baseDate.getDate() - i);
      const expectedStr = getLocalDateString(expectedDate);
      
      if (dates[i] === expectedStr) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  } catch (err) {
    console.warn('[IndexedDB] calculateStreak fallback on cursor error:', err);
    return 0;
  }
}
