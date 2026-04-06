import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import NeoCard from './NeoCard';
import NeoButton from './NeoButton';
import { db } from '../db';
import { Plus } from 'lucide-react';

const WeightTracker = () => {
  const [weight, setWeight] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const logs = await db.weightLogs.orderBy('timestamp').limit(30).toArray();
    setHistory(logs.map(log => ({
      ...log,
      dateFormatted: log.date.split('-').slice(1).join('/')
    })));
  };

  const addWeight = async (e) => {
    e.preventDefault();
    if (!weight) return;

    await db.weightLogs.add({
      weight: parseFloat(weight),
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    });

    setWeight('');
    fetchHistory();
  };

  return (
    <NeoCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold italic">⚖️ 體重追蹤</h2>
      </div>

      <form onSubmit={addWeight} className="flex gap-2">
        <input 
          type="number" 
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="輸入體重 (kg)"
          className="flex-1 border-4 border-black p-2 rounded-2xl focus:outline-none focus:ring-2 ring-accent"
        />
        <NeoButton type="submit" variant="accent" className="px-4">
          <Plus size={20} />
        </NeoButton>
      </form>

      <div className="h-48 w-full">
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="dateFormatted" 
                axisLine={{ stroke: '#000', strokeWidth: 2 }}
                tickLine={false}
                tick={{ fontSize: 12, fontWeight: 'bold' }}
              />
              <YAxis 
                hide 
                domain={['dataMin - 2', 'dataMax + 2']} 
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '1rem', 
                  border: '4px solid #000',
                  boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#000" 
                strokeWidth={4} 
                dot={{ r: 4, stroke: '#000', strokeWidth: 2, fill: '#FDE047' }}
                activeDot={{ r: 6, stroke: '#000', strokeWidth: 2, fill: '#000' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">
            暫無數據，快來記錄第一次體重吧！
          </div>
        )}
      </div>
    </NeoCard>
  );
};

export default WeightTracker;
