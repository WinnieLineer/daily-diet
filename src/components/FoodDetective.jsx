import React, { useState, useRef, useEffect } from 'react';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { Camera, Loader2, Check, Lightbulb, Flame, MessageSquareQuote, AlertCircle, RefreshCw, Image as ImageIcon, X, MapPin } from 'lucide-react';
import { analyzeFoodImage } from '../lib/gemini';
import { db } from '../db';
import exifr from 'exifr';
import { t, getLanguage } from '../lib/translations';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

const DesktopCamera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Camera access failed", err);
        setError(t('camera_error') || "Camera access denied or not found");
      }
    }
    setupCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
      >
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-8 text-center max-w-md">
            <AlertCircle size={48} className="text-rose-500 mb-4" />
            <p className="font-black italic text-lg">{error}</p>
            <button onClick={onClose} className="mt-6 bg-white text-black px-8 py-3 rounded-2xl font-black italic border-4 border-black shadow-neo">
              {t('cancel')}
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* UI Overlays */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top Controls */}
              <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start">
                <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                  <span className="text-white text-[9px] font-black uppercase tracking-widest">{t('ai_mode')}</span>
                </div>
                
                <button 
                  onClick={onClose} 
                  className="pointer-events-auto bg-black/40 hover:bg-black text-white p-2.5 rounded-full backdrop-blur-md border border-white/20 transition-all active:scale-95 shadow-xl"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Viewfinder Corners - Subtle and Semi-transparent */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] max-w-5xl max-h-[85vh] pointer-events-none">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-accent/40 rounded-tl-[2rem]" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-accent/40 rounded-tr-[2rem]" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-accent/40 rounded-bl-[2rem]" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-accent/40 rounded-br-[2rem]" />
              </div>

              {/* Shutter Button - Absolute Bottom and Very Small */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pb-4">
                <button 
                  onClick={capture}
                  className="pointer-events-auto group relative w-16 h-16 flex items-center justify-center transition-all active:scale-90"
                >
                  <div className="absolute inset-0 bg-white/10 rounded-full scale-125 backdrop-blur-sm border border-white/5" />
                  <div className="absolute inset-1.5 bg-white rounded-full border-2 border-black/10 group-hover:bg-zinc-100 transition-colors" />
                  <div className="w-8 h-8 bg-white/50 rounded-full border border-black/5" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

const FoodDetective = ({ onLogAdded }) => {
  const [mode, setMode] = useState('ai'); // 'ai' or 'manual'
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [manualEntry, setManualEntry] = useState({ dish_name: '', calories: '', protein: '', water: '' });
  const [locationLoading, setLocationLoading] = useState(false);
  const [showDesktopCamera, setShowDesktopCamera] = useState(false);

  const getCurrentLocation = () => {
    // We will no longer use browser geolocation for manual/water
    return Promise.resolve(null);
  };

  const reverseGeocode = async (lat, lon) => {
    setLocationLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
        headers: {
          'Accept-Language': 'zh-TW,zh;q=0.9',
          'User-Agent': 'DailyDietApp/1.0'
        }
      });
      const data = await response.json();
      const name = data.address.suburb || data.address.town || data.address.city || data.address.road || t('unknown');
      return name;
    } catch (err) {
      console.error("Geocoding error:", err);
      return t('unknown');
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      setResult(prev => ({ ...prev, location: loc }));
    }, (err) => {
      console.error("Geolocation error:", err);
      setLocationLoading(false);
    }, { timeout: 10000 });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Try to extract GPS from EXIF
    let exifLocation = null;
    try {
      const gps = await exifr.gps(file);
      if (gps && gps.latitude && gps.longitude) {
        exifLocation = await reverseGeocode(gps.latitude, gps.longitude);
      }
    } catch (err) {
      console.warn("EXIF extraction failed:", err);
    }

    // Auto-location fallback if no EXIF data but permission already granted
    let autoLocation = null;
    if (!exifLocation && navigator.geolocation) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          autoLocation = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(async (pos) => {
              const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
              resolve(loc);
            }, () => resolve(null), { timeout: 5000 });
          });
        }
      } catch (err) { console.warn("Auto-location check failed:", err); }
    }

    const finalLocation = exifLocation || autoLocation;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setPreview(base64);
      setLoading(true);
      setResult(null);

      try {
        const data = await analyzeFoodImage(base64, getLanguage());
        setResult({ ...data, location: finalLocation });
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async (base64) => {
    setShowDesktopCamera(false);
    setPreview(base64);
    setLoading(true);
    setResult(null);

    // Auto-location for camera capture
    let autoLocation = null;
    if (navigator.geolocation) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          autoLocation = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(async (pos) => {
              const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
              resolve(loc);
            }, () => resolve(null), { timeout: 5000 });
          });
        }
      } catch (err) { console.warn("Auto-location check failed:", err); }
    }

    try {
      const data = await analyzeFoodImage(base64, getLanguage());
      setResult({ ...data, location: autoLocation });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
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
        water: Number(manualEntry.water) || 0,
        description: t('manual_desc')
      };
    }
    if (!dataToSave) return;
    
    setLoading(true);
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    await db.dietLogs.add({
      ...dataToSave,
      date: localDate,
      timestamp: Date.now(),
      location: dataToSave.location || null
    });
    
    setPreview(null);
    setResult(null);
    setManualEntry({ dish_name: '', calories: '', protein: '', water: '' });
    onLogAdded();
  };

  return (
    <NeoCard className="space-y-4 bg-white/60 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xl font-black italic">📝 {t('food_detective')}</h2>
          <button 
            onClick={async () => {
              const now = new Date();
              const timestamp = now.getTime();
              const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              
              // Find if there's a water log within the last 2 minutes
              const twoMinutesAgo = timestamp - (2 * 60 * 1000);
              const lastWaterLog = await db.dietLogs
                .where('timestamp')
                .above(twoMinutesAgo)
                .filter(log => log.dish_name.includes(t('water')))
                .last();

              if (lastWaterLog) {
                await db.dietLogs.update(lastWaterLog.id, {
                  water: (lastWaterLog.water || 0) + 250,
                  timestamp: timestamp // Update timestamp to keep it "recent"
                });
              } else {
                await db.dietLogs.add({ 
                  dish_name: `🚰 ${t('water')}`, 
                  calories: 0, 
                  protein: 0, 
                  water: 250, 
                  date: localDate, 
                  timestamp: timestamp,
                  location: null
                });
              }
              onLogAdded();
            }}
            className="text-[10px] font-black bg-white text-black px-2 py-1 rounded-xl border-2 border-black active:scale-95 transition-all whitespace-nowrap shadow-neo-sm hover:bg-zinc-50"
          >
            {t('add_water')}
          </button>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border-2 border-black shrink-0">
          {[
            { id: 'ai',      label: t('ai_mode') },
            { id: 'manual',  label: t('manual_mode') },
          ].map(tab => (
            <button
              key={tab.id}
              className={twMerge(
                "px-2 py-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap border-2 border-transparent",
                mode === tab.id
                  ? "bg-black text-white border-black"
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-2 gap-3 mt-2"
        >
          <button 
            onClick={() => {
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              if (isMobile) {
                cameraInputRef.current?.click();
              } else {
                setShowDesktopCamera(true);
              }
            }}
            className="group flex flex-col items-center justify-center p-6 bg-black text-white rounded-[2.5rem] border-4 border-black hover:bg-zinc-800 transition-all active:scale-95 shadow-neo-sm"
          >
            <div className="bg-accent text-black p-4 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
              <Camera size={28} />
            </div>
            <div className="text-center">
              <div className="font-black text-lg italic">{t('camera')}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{t('camera_sub')}</div>
            </div>
          </button>

          <button 
            onClick={() => galleryInputRef.current?.click()}
            className="group flex flex-col items-center justify-center p-6 bg-white text-black rounded-[2.5rem] border-4 border-black hover:bg-gray-50 transition-all active:scale-95 shadow-neo-sm"
          >
            <div className="bg-gray-100 text-black p-4 rounded-2xl mb-3 group-hover:scale-110 transition-transform border-2 border-black/5">
              <ImageIcon size={28} />
            </div>
            <div className="text-center">
              <div className="font-black text-lg italic">{t('gallery')}</div>
              <div className="text-[10px] uppercase tracking-widest text-black/40 font-bold">{t('gallery_sub')}</div>
            </div>
          </button>

          {/* Hidden inputs */}
          <input type="file" ref={cameraInputRef} onChange={handleImageUpload} accept="image/*" capture="environment" className="hidden" />
          <input type="file" ref={galleryInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        </motion.div>
      )}

      {showDesktopCamera && (
        <DesktopCamera 
          onCapture={handleCameraCapture} 
          onClose={() => setShowDesktopCamera(false)} 
        />
      )}



      {mode === 'ai' && preview && (
        <div className="w-full space-y-4">
          <div className="min-h-[200px] max-h-[500px] border-4 border-black rounded-3xl overflow-hidden relative bg-zinc-100 flex items-center justify-center">
            <img src={preview} alt="Preview" className="max-w-full max-h-[500px] object-contain" />
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-md">
                <Loader2 className="animate-spin text-accent mb-3" size={48} />
                <span className="text-white font-bold animate-pulse text-sm">{t('ai_calculating')}</span>
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
              <div className="grid grid-cols-3 gap-2 font-mono text-[10px] sm:text-xs mb-4">
                <div className="flex flex-col items-center justify-center bg-accent text-black p-2 rounded-2xl font-bold border-2 border-black/10">
                  <Flame size={14} className="mb-0.5" />
                  <span>{result.calories} kcal</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-white text-black p-2 rounded-2xl font-bold border-2 border-black/10">
                  <span className="mb-0.5 text-base">🍖</span>
                  <span>{result.protein}g {t('protein')}</span>
                </div>
                <div className="flex flex-col items-center justify-center bg-black text-white p-2 rounded-2xl font-bold border-2 border-black/10">
                  <span className="mb-0.5 text-base">🚰</span>
                  <span>{result.water}ml {t('water_unit')}</span>
                </div>
              </div>
              
              <div className="border-t-2 border-white/20 pt-3 flex gap-2">
                <span className="text-accent flex-shrink-0 mt-0.5">📝</span>
                <p className="text-sm opacity-90 italic">"{result.description}"</p>
              </div>

              {/* Location Feedback */}
              <div className="mt-4 pt-3 border-t-2 border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={14} className={locationLoading ? "animate-bounce text-accent" : "text-gray-400"} />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{t('location')}</span>
                      <span className="text-xs font-bold truncate">
                        {locationLoading ? t('geocoding') : (result.location || t('no_location_found'))}
                      </span>
                    </div>
                  </div>
                  
                  {!result.location && !locationLoading && (
                    <button 
                      onClick={fetchCurrentLocation}
                      className="bg-white/10 hover:bg-white/20 text-[10px] font-black px-2 py-1 rounded-lg transition-colors border border-white/20 flex items-center gap-1"
                    >
                      <RefreshCw size={10} /> {t('get_current_location')}
                    </button>
                  )}
                </div>
                {!result.location && !locationLoading && (
                  <p className="text-[9px] text-white/30 italic mt-1">{t('location_hint')}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {result.fun_fact && (
                <div className="p-4 bg-white border-4 border-black rounded-3xl shadow-neo-sm flex gap-3">
                  <div className="bg-accent rounded-xl p-2 flex-shrink-0 border-2 border-black h-fit">
                    <Lightbulb size={18} className="text-black" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">{t('food_fact')}</span>
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
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40 block mb-1">{t('panda_roast')}</span>
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
                {t('cancel')}
              </NeoButton>
              <NeoButton className="flex-1" variant="black" disabled={loading || !result} onClick={saveLog}>
                <Check size={16} className="inline mr-1" /> {t('save_record')}
              </NeoButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'manual' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white border-4 border-black p-4 rounded-3xl mt-2">
          <div>
            <label className="text-xs font-black uppercase tracking-wider block mb-1.5 text-gray-500">{t('food_name')}</label>
            <input type="text" placeholder={t('food_placeholder')} value={manualEntry.dish_name} onChange={(e) => setManualEntry({...manualEntry, dish_name: e.target.value})} className="w-full border-4 border-black p-2.5 rounded-2xl focus:outline-none focus:ring-4 ring-accent/30 transition-all font-medium" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-black uppercase tracking-wider block mb-1.5 text-gray-500">{t('calories')} (kcal)</label>
              <input type="number" placeholder="0" value={manualEntry.calories} onChange={(e) => setManualEntry({...manualEntry, calories: e.target.value})} className="w-full border-4 border-black p-2.5 rounded-2xl focus:outline-none focus:ring-4 ring-accent/30 transition-all font-mono" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-black uppercase tracking-wider block mb-1.5 text-gray-500">{t('protein')} (g)</label>
              <input type="number" placeholder="0" value={manualEntry.protein} onChange={(e) => setManualEntry({...manualEntry, protein: e.target.value})} className="w-full border-4 border-black p-2.5 rounded-2xl focus:outline-none focus:ring-4 ring-accent/30 transition-all font-mono" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-black uppercase tracking-wider block mb-1.5 text-gray-500">{t('water_unit')} (ml)</label>
              <input type="number" placeholder="0" value={manualEntry.water} onChange={(e) => setManualEntry({...manualEntry, water: e.target.value})} className="w-full border-4 border-black p-2.5 rounded-2xl focus:outline-none focus:ring-4 ring-accent/30 transition-all font-mono" />
            </div>
          </div>
          <NeoButton className="w-full mt-1" variant="black" disabled={!manualEntry.dish_name} onClick={saveLog}>
            <Check size={16} className="inline mr-1" /> {t('save_record')}
          </NeoButton>
        </motion.div>
      )}
    </NeoCard>
  );
};

export default FoodDetective;
