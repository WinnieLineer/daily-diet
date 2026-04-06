import React, { useState, useRef } from 'react';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { Camera, Upload, Loader2, Check, PenTool } from 'lucide-react';
import { analyzeFoodImage } from '../lib/gemini';
import { db } from '../db';
import { twMerge } from 'tailwind-merge';

const FoodDetective = ({ onLogAdded }) => {
  const [mode, setMode] = useState('ai'); // 'ai' or 'manual'
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  // Manual input state
  const [manualEntry, setManualEntry] = useState({ dish_name: '', calories: '', protein: '' });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setPreview(base64);
      setLoading(true);
      setResult(null);

      try {
        const data = await analyzeFoodImage(base64);
        setResult(data);
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveLog = async () => {
    let dataToSave = null;
    
    if (mode === 'ai' && result) {
      dataToSave = result;
    } else if (mode === 'manual' && manualEntry.dish_name) {
      dataToSave = {
        dish_name: manualEntry.dish_name,
        calories: Number(manualEntry.calories) || 0,
        protein: Number(manualEntry.protein) || 0,
        description: "手動紀錄"
      };
    }

    if (!dataToSave) return;
    
    await db.dietLogs.add({
      ...dataToSave,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    });
    
    // Reset state
    setPreview(null);
    setResult(null);
    setManualEntry({ dish_name: '', calories: '', protein: '' });
    onLogAdded();
  };

  return (
    <NeoCard className="space-y-4 bg-white/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold italic">飲食紀錄</h2>
        <div className="flex gap-2 bg-muted p-1 rounded-2xl border-2 border-black">
          <button 
            className={twMerge("px-3 py-1 text-sm font-bold rounded-xl transition-colors", mode === 'ai' ? "bg-black text-white" : "hover:bg-white")}
            onClick={() => setMode('ai')}
          >
            📸 AI 偵探
          </button>
          <button 
            className={twMerge("px-3 py-1 text-sm font-bold rounded-xl transition-colors", mode === 'manual' ? "bg-black text-white" : "hover:bg-white")}
            onClick={() => setMode('manual')}
          >
            ✍️ 手動輸入
          </button>
        </div>
      </div>

      {mode === 'ai' && !preview && (
        <div 
          onClick={() => fileInputRef.current.click()}
          className="aspect-video border-4 border-dashed border-black rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors bg-white mt-4"
        >
          <Camera size={48} className="mb-2" />
          <p className="font-bold">拍下或上傳食物照</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      )}

      {mode === 'ai' && preview && (
        <div className="w-full space-y-4">
          <div className="aspect-video border-4 border-black rounded-3xl overflow-hidden relative">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                <Loader2 className="animate-spin text-white mb-2" size={48} />
                <span className="text-white font-bold animate-pulse">AI 正在分析美味...</span>
              </div>
            )}
          </div>

          {result && (
            <div className="p-4 bg-accent rounded-3xl border-4 border-black shadow-neo-sm animate-in fade-in slide-in-from-bottom-2">
              <h3 className="font-bold text-lg">{result.dish_name}</h3>
              <div className="flex gap-4 mt-1 font-mono text-sm">
                <span>🔥 {result.calories} kcal</span>
                <span>🍗 {result.protein}g protein</span>
              </div>
              <p className="text-xs mt-2 italic">{result.description}</p>
            </div>
          )}

          <div className="flex gap-2">
            <NeoButton 
              className="flex-1" 
              onClick={() => { setPreview(null); setResult(null); }}
              disabled={loading}
            >
              取消
            </NeoButton>
            <NeoButton 
              className="flex-1" 
              variant="black" 
              disabled={loading || !result}
              onClick={saveLog}
            >
              <Check size={18} className="inline mr-1" /> 儲存
            </NeoButton>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className="space-y-4 bg-white border-4 border-black p-4 rounded-3xl mt-4">
          <div>
            <label className="text-sm font-bold block mb-1">食物名稱</label>
            <input 
              type="text"
              placeholder="例如：地瓜球、水煮胸..."
              value={manualEntry.dish_name}
              onChange={(e) => setManualEntry({...manualEntry, dish_name: e.target.value})}
              className="w-full border-4 border-black p-2 rounded-2xl focus:outline-none focus:ring-2 ring-accent"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-bold block mb-1">熱量 (kcal)</label>
              <input 
                type="number"
                placeholder="0"
                value={manualEntry.calories}
                onChange={(e) => setManualEntry({...manualEntry, calories: e.target.value})}
                className="w-full border-4 border-black p-2 rounded-2xl focus:outline-none focus:ring-2 ring-accent"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-bold block mb-1">蛋白質 (g)</label>
              <input 
                type="number"
                placeholder="0"
                value={manualEntry.protein}
                onChange={(e) => setManualEntry({...manualEntry, protein: e.target.value})}
                className="w-full border-4 border-black p-2 rounded-2xl focus:outline-none focus:ring-2 ring-accent"
              />
            </div>
          </div>
          <NeoButton 
            className="w-full mt-2" 
            variant="black" 
            disabled={!manualEntry.dish_name}
            onClick={saveLog}
          >
            <Check size={18} className="inline mr-1" /> 儲存手動紀錄
          </NeoButton>
        </div>
      )}

    </NeoCard>
  );
};

export default FoodDetective;
