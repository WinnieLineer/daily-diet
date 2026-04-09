import React, { useState, useRef, useEffect } from 'react';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { Camera, Loader2, Check, Lightbulb, Flame, MessageSquareQuote, AlertCircle, RefreshCw, Image as ImageIcon, X } from 'lucide-react';
import { analyzeFoodImage } from '../lib/gemini';
import { db } from '../db';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

const FoodDetective = ({ onLogAdded }) => {
  const [mode, setMode] = useState('ai'); // 'ai' or 'manual'
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

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
          onClick={() => setShowActionSheet(true)}
          className="aspect-video border-4 border-dashed border-black rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all bg-gradient-to-br from-white to-gray-50 hover:bg-accent/10 hover:border-accent hover:shadow-[0_0_0_4px_rgba(253,224,71,0.2)] group mt-2"
        >
          <div className="bg-black text-white rounded-2xl p-3 mb-3 group-hover:scale-110 transition-transform shadow-neo-sm">
            <Camera size={28} />
          </div>
          <p className="font-bold text-sm text-black">拍下或上傳食物照</p>
          <p className="text-xs text-gray-500 mt-1">讓 AI 幫你分析熱量！</p>
          
          {/* Hidden inputs for different purposes */}
          <input 
            type="file" 
            ref={cameraInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={galleryInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </motion.div>
      )}

      {/* Premium Photo Action Sheet */}
      <AnimatePresence>
        {showActionSheet && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 sm:pb-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowActionSheet(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white border-4 border-black rounded-[2.5rem] p-6 shadow-neo overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-xl italic tracking-tight">📸 選擇照片來源</h3>
                <button onClick={() => setShowActionSheet(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-3">
                <button 
                  onClick={() => { setShowActionSheet(false); setTimeout(() => cameraInputRef.current?.click(), 100); }}
                  className="w-full group flex items-center gap-4 p-4 bg-black text-white rounded-3xl border-4 border-black hover:bg-zinc-800 transition-all active:scale-95"
                >
                  <div className="bg-accent text-black p-3 rounded-2xl group-hover:scale-110 transition-transform">
                    <Camera size={24} />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-lg leading-tight italic">拍照模式</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">開啟相機直接拍攝</div>
                  </div>
                </button>

                <button 
                  onClick={() => { setShowActionSheet(false); setTimeout(() => galleryInputRef.current?.click(), 100); }}
                  className="w-full group flex items-center gap-4 p-4 bg-white text-black rounded-3xl border-4 border-black hover:bg-gray-50 transition-all active:scale-95"
                >
                  <div className="bg-gray-100 text-black p-3 rounded-2xl group-hover:scale-110 transition-transform border-2 border-black/5">
                    <ImageIcon size={24} />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-lg leading-tight italic">從相簿選擇</div>
                    <div className="text-[10px] uppercase tracking-widest text-black/40 font-bold">上傳手機內的照片</div>
                  </div>
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Powered by AI Detective 🐼</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


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
        {(mode === 'ai' && result) && (
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
                onClick={() => { setPreview(null); setResult(null); }}
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
