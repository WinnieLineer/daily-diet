import React, { useState, useRef } from 'react';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { Camera, Upload, Loader2, Check } from 'lucide-react';
import { analyzeFoodImage } from '../lib/gemini';
import { db } from '../db';

const FoodDetective = ({ onLogAdded }) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

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
    if (!result) return;
    
    await db.dietLogs.add({
      ...result,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    });
    
    setPreview(null);
    setResult(null);
    onLogAdded();
  };

  return (
    <NeoCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold italic">🔍 AI 飲食偵探</h2>
      </div>

      {!preview ? (
        <div 
          onClick={() => fileInputRef.current.click()}
          className="aspect-square border-4 border-dashed border-black rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors bg-white"
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
      ) : (
        <div className="w-full space-y-4">
          <div className="aspect-square border-4 border-black rounded-3xl overflow-hidden relative">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="animate-spin text-white" size={48} />
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
              <Check size={18} className="inline mr-1" /> 儲存紀錄
            </NeoButton>
          </div>
        </div>
      )}
    </NeoCard>
  );
};

export default FoodDetective;
