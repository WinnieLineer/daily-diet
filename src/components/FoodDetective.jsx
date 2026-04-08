import React, { useState, useRef, useEffect } from 'react';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { Camera, Loader2, Check, Barcode, Lightbulb, Flame, MessageSquareQuote } from 'lucide-react';
import { analyzeFoodImage } from '../lib/gemini';
import { db } from '../db';
import { twMerge } from 'tailwind-merge';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';

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
    let timeoutId = null;
    
    if (mode === 'barcode') {
      // Small delay to ensure the #reader element is rendered in DOM before starting scanner
      timeoutId = setTimeout(() => {
        const readerElement = document.getElementById("reader");
        if (!readerElement) {
          console.error("Reader element not found in DOM");
          return;
        }

        html5QrCode = new Html5Qrcode("reader");
        html5QrCode.start(
          { 
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          {
            fps: 10,
            qrbox: { width: 300, height: 120 },
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E
            ]
          },
          async (decodedText) => {
            if (html5QrCode && html5QrCode.isScanning) {
              await html5QrCode.stop();
              html5QrCode.clear();
            }
            await handleBarcodeScan(decodedText);
          },
          () => {}
        ).catch(err => {
          console.warn("Failed to start scanner", err);
        });
      }, 200); // 200ms delay to be safe
    }

    return () => {
      clearTimeout(timeoutId);
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
          description: `條碼掃描: ${barcode}`,
          fun_fact: '條碼掃描僅提供每百克營養資訊，實際攝取量請依食用份量計算喔！',
          roast: '掃個條碼就想知道熱量？你連包裝上的字都懶得看？ 😏',
        });
      } else {
        alert("資料庫中找不到此商品的條碼。\n\n請切換至「📸 AI 鏡頭」直接拍攝商品背面的【營養標示表】，讓 AI 幫你精準讀取！");
        setMode('ai');
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
    
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    await db.dietLogs.add({
      ...dataToSave,
      date: localDate,
      timestamp: Date.now(),
    });
    
    setPreview(null);
    setResult(null);
    setManualEntry({ dish_name: '', calories: '', protein: '' });
    if (mode === 'barcode') setMode('ai');
    onLogAdded();
  };

  return (
    <NeoCard className="space-y-4 bg-white/60 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-xl font-black italic tracking-tight">🍽️ 飲食偵探</h2>
        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl border-2 border-black overflow-x-auto w-full sm:w-auto overflow-y-hidden">
          {[
            { id: 'ai',      label: '📸 AI 鏡頭' },
            { id: 'manual',  label: '✍️ 手動' },
            { id: 'barcode', label: '📦 掃條碼' },
          ].map(tab => (
            <button
              key={tab.id}
              className={twMerge(
                "px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap border-2 border-transparent",
                mode === tab.id
                  ? "bg-black text-white border-black shadow-sm scale-[1.02]"
                  : "hover:bg-white text-gray-600"
              )}
              onClick={() => {
                setMode(tab.id);
                if (tab.id !== mode) setResult(null);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'ai' && !preview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => fileInputRef.current.click()}
          className="aspect-video border-4 border-dashed border-black rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all bg-gradient-to-br from-white to-gray-50 hover:bg-accent/10 hover:border-accent hover:shadow-[0_0_0_4px_rgba(253,224,71,0.2)] group mt-2"
        >
          <div className="bg-black text-white rounded-2xl p-3 mb-3 group-hover:scale-110 transition-transform shadow-neo-sm">
            <Camera size={28} />
          </div>
          <p className="font-bold text-sm text-black">拍下或上傳食物照</p>
          <p className="text-xs text-gray-500 mt-1">讓 AI 幫你分析熱量！</p>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        </motion.div>
      )}

      {mode === 'barcode' && !result && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border-4 border-black rounded-3xl overflow-hidden bg-black mt-4"
        >
          <div id="reader" width="100%"></div>
          <p className="text-white text-xs text-center font-bold py-2 opacity-60">將條碼對準框框掃描</p>
        </motion.div>
      )}

      {loading && mode === 'barcode' && (
        <div className="aspect-video border-4 border-black rounded-3xl flex flex-col items-center justify-center bg-black">
          <Loader2 className="animate-spin text-accent mb-3" size={44} />
          <span className="text-white font-bold animate-pulse">正在查詢營養成分...</span>
        </div>
      )}

      {mode === 'ai' && preview && (
        <div className="w-full space-y-4">
          <div className="aspect-video border-4 border-black rounded-3xl overflow-hidden relative">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                <Loader2 className="animate-spin text-accent mb-3" size={48} />
                <span className="text-white font-bold animate-pulse text-sm">🔍 AI 正在神算中...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {((mode === 'ai' || mode === 'barcode') && result) && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full space-y-4 mt-2"
          >
            <div className="p-4 bg-black text-white rounded-3xl border-4 border-black shadow-neo-sm">
              <h3 className="font-black text-lg leading-tight mb-3">{result.dish_name}</h3>
              <div className="flex flex-wrap gap-2 font-mono text-sm mb-4">
                <span className="flex items-center gap-1.5 bg-accent text-black px-3 py-1.5 rounded-2xl font-bold">
                  <Flame size={14} /> {result.calories} kcal
                </span>
                <span className="flex items-center gap-1.5 bg-white text-black px-3 py-1.5 rounded-2xl font-bold">
                  🍗 {result.protein}g 蛋白質
                </span>
              </div>
              
              <div className="border-t-2 border-white/20 pt-3 flex gap-2">
                <span className="text-accent flex-shrink-0 mt-0.5">📝</span>
                <p className="text-sm opacity-90 italic">"{result.description}"</p>
              </div>
            </div>

            <div className="space-y-3">
              {result.fun_fact && (
                <div className="p-4 bg-white border-4 border-black rounded-3xl shadow-neo-sm flex gap-3">
                  <div className="bg-accent rounded-xl p-2 flex-shrink-0 border-2 border-black h-fit">
                    <Lightbulb size={18} className="text-black" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">食物小知識</span>
                    <p className="text-sm font-bold leading-relaxed">{result.fun_fact}</p>
                  </div>
                </div>
              )}
              
              {result.roast && (
                <div className="p-4 bg-accent border-4 border-black rounded-3xl shadow-neo-sm flex gap-3">
                  <div className="bg-black rounded-xl p-2 flex-shrink-0 border-2 border-black h-fit">
                    <MessageSquareQuote size={18} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40 block mb-1">熊貓嘴砲</span>
                    <p className="text-sm font-bold leading-relaxed italic">"{result.roast}"</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <NeoButton 
                className="flex-1" 
                onClick={() => { setPreview(null); setResult(null); if(mode === 'barcode') setMode('ai'); }}
                disabled={loading}
              >
                取消
              </NeoButton>
              <NeoButton className="flex-1" variant="black" disabled={loading || !result} onClick={saveLog}>
                <Check size={16} className="inline mr-1" /> 儲存紀錄
              </NeoButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'manual' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white border-4 border-black p-4 rounded-3xl mt-2">
          <div>
            <label className="text-xs font-black uppercase tracking-wider block mb-1.5 text-gray-500">食物名稱</label>
            <input type="text" placeholder="例如：地瓜球、水煮雞胸..." value={manualEntry.dish_name} onChange={(e) => setManualEntry({...manualEntry, dish_name: e.target.value})} className="w-full border-4 border-black p-2.5 rounded-2xl focus:outline-none focus:ring-4 ring-accent/30 transition-all font-medium" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-black uppercase tracking-wider block mb-1.5 text-gray-500">熱量 (kcal)</label>
              <input type="number" placeholder="0" value={manualEntry.calories} onChange={(e) => setManualEntry({...manualEntry, calories: e.target.value})} className="w-full border-4 border-black p-2.5 rounded-2xl focus:outline-none focus:ring-4 ring-accent/30 transition-all font-mono" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-black uppercase tracking-wider block mb-1.5 text-gray-500">蛋白質 (g)</label>
              <input type="number" placeholder="0" value={manualEntry.protein} onChange={(e) => setManualEntry({...manualEntry, protein: e.target.value})} className="w-full border-4 border-black p-2.5 rounded-2xl focus:outline-none focus:ring-4 ring-accent/30 transition-all font-mono" />
            </div>
          </div>
          <NeoButton className="w-full mt-1" variant="black" disabled={!manualEntry.dish_name} onClick={saveLog}>
            <Check size={16} className="inline mr-1" /> 儲存紀錄
          </NeoButton>
        </motion.div>
      )}
    </NeoCard>
  );
};

export default FoodDetective;
