import React, { useState, useRef, useEffect } from 'react';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { Camera, Loader2, Check, Barcode } from 'lucide-react';
import { analyzeFoodImage, searchBarcodeWithAI } from '../lib/gemini';
import { db } from '../db';
import { twMerge } from 'tailwind-merge';
import { Html5Qrcode } from 'html5-qrcode';

const FoodDetective = ({ onLogAdded }) => {
  const [mode, setMode] = useState('ai'); // 'ai', 'manual', or 'barcode'
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  // Manual input state
  const [manualEntry, setManualEntry] = useState({ dish_name: '', calories: '', protein: '' });

  useEffect(() => {
    let html5QrCode = null;
    
    if (mode === 'barcode') {
      html5QrCode = new Html5Qrcode("reader");

      html5QrCode.start(
        { 
          facingMode: "environment" // Forces back camera, hides selection UI
        },
        {
          fps: 15,
          qrbox: { width: 250, height: 120 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // Stop scanning on success
          if (html5QrCode && html5QrCode.isScanning) {
            await html5QrCode.stop();
            html5QrCode.clear();
          }
          await handleBarcodeScan(decodedText);
        },
        (errorMessage) => {
          // Ignore frame errors
        }
      ).catch(err => {
        console.warn("Failed to start scanner", err);
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [mode]);

  const handleBarcodeScan = async (barcode) => {
    setLoading(true);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        const product = data.product;
        const name = product.product_name || product.generic_name || '未知名稱商品';
        const calories = product.nutriments?.['energy-kcal_100g'] || product.nutriments?.['energy-kcal'] || 0;
        const protein = product.nutriments?.['proteins_100g'] || product.nutriments?.['proteins'] || 0;

        setResult({
          dish_name: name,
          calories: Math.round(Number(calories)),
          protein: Math.round(Number(protein)),
          description: `條碼掃描: ${barcode}`
        });
      } else {
        // AI Fallback
        try {
          const aiData = await searchBarcodeWithAI(barcode);
          setResult({
            ...aiData,
            description: `AI 條碼預測: ${barcode} - ${aiData.description || ''}`
          });
        } catch (aiErr) {
          alert("找不到此商品的營養標示，且 AI 無法辨識，請嘗試手動輸入。");
          setMode('manual');
        }
      }
    } catch (err) {
      alert("掃描查詢失敗，請檢查網路狀態。");
      setMode('manual');
    } finally {
      setLoading(false);
    }
  };

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
    
    if ((mode === 'ai' || mode === 'barcode') && result) {
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
    if (mode === 'barcode') {
       setMode('ai'); // Switch back to 'ai' mode to unmount scanner properly
    }
    onLogAdded();
  };

  return (
    <NeoCard className="space-y-4 bg-white/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-xl font-bold italic">飲食紀錄</h2>
        <div className="flex gap-2 bg-muted p-1 rounded-2xl border-2 border-black overflow-x-auto w-full sm:w-auto overflow-y-hidden">
          <button 
            className={twMerge("px-2 py-1 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap", mode === 'ai' ? "bg-black text-white" : "hover:bg-white")}
            onClick={() => setMode('ai')}
          >
            📸 AI 鏡頭
          </button>
          <button 
            className={twMerge("px-2 py-1 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap", mode === 'barcode' ? "bg-black text-white" : "hover:bg-white")}
            onClick={() => { setMode('barcode'); setResult(null); }}
          >
            <Barcode size={16} className="inline mr-1 -mt-0.5" />掃條碼
          </button>
          <button 
            className={twMerge("px-2 py-1 text-xs sm:text-sm font-bold rounded-xl transition-colors whitespace-nowrap", mode === 'manual' ? "bg-black text-white" : "hover:bg-white")}
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

      {mode === 'barcode' && !result && !loading && (
        <div className="border-4 border-black rounded-3xl overflow-hidden bg-white mt-4">
           <div id="reader" width="100%"></div>
        </div>
      )}

      {loading && mode === 'barcode' && (
         <div className="aspect-video border-4 border-black rounded-3xl flex flex-col items-center justify-center bg-black/80">
            <Loader2 className="animate-spin text-white mb-2" size={48} />
            <span className="text-white font-bold animate-pulse">正在查詢營養成分...</span>
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
        </div>
      )}

      {((mode === 'ai' || mode === 'barcode') && result) && (
        <div className="w-full space-y-4 mt-4">
          <div className="p-4 bg-accent rounded-3xl border-4 border-black shadow-neo-sm animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-bold text-lg">{result.dish_name}</h3>
            <div className="flex gap-4 mt-1 font-mono text-sm">
              <span>🔥 {result.calories} kcal</span>
              <span>🍗 {result.protein}g protein</span>
            </div>
            <p className="text-xs mt-2 italic">{result.description}</p>
          </div>

          <div className="flex gap-2">
            <NeoButton 
              className="flex-1" 
              onClick={() => { 
                setPreview(null); 
                setResult(null); 
                if(mode === 'barcode') setMode('ai'); // Reset scanner properly
              }}
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
        <div className="space-y-4 bg-white border-4 border-black p-4 rounded-3xl mt-4 animate-in fade-in slide-in-from-top-2">
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
              <label className="text-sm font-bold block mb-1">總熱量 (kcal)</label>
              <input 
                type="number"
                placeholder="0"
                value={manualEntry.calories}
                onChange={(e) => setManualEntry({...manualEntry, calories: e.target.value})}
                className="w-full border-4 border-black p-2 rounded-2xl focus:outline-none focus:ring-2 ring-accent"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-bold block mb-1">總蛋白質 (g)</label>
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
            <Check size={18} className="inline mr-1" /> 儲存紀錄
          </NeoButton>
        </div>
      )}

    </NeoCard>
  );
};

export default FoodDetective;
