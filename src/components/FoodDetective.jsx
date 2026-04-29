import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { Camera, Loader2, Check, Lightbulb, Flame, MessageSquareQuote, AlertCircle, RefreshCw, Image as ImageIcon, X, MapPin, Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeFoodImage } from '../lib/gemini';
import { db } from '../db';
import exifr from 'exifr';
import { t, getLanguage } from '../lib/translations';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { ANALYSIS_DURATION_SECONDS, IMAGE_MAX_DIMENSION, IMAGE_QUALITY } from '../lib/constants';

const DesktopCamera = ({ onCapture, onClose, onLocationReady }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Camera access failed", err);
        setError(t('camera_error') || "Camera access denied or not found");
      }
    }
    setupCamera();

    const permissionGranted = localStorage.getItem('location_granted') === 'true';
    if (navigator.geolocation && onLocationReady) {
      if (permissionGranted) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            localStorage.setItem('location_granted', 'true');
            onLocationReady(pos.coords);
          },
          () => {}, 
          { timeout: 8000, maximumAge: 30000 }
        );
      }
    }

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
      onCapture(canvas.toDataURL('image/jpeg', 0.9));
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[700] bg-black flex flex-col">
      <div className="relative flex-1">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
            <AlertCircle size={48} className="text-rose-500 mb-4" />
            <p className="font-black italic">{error}</p>
            <button onClick={onClose} className="mt-8 bg-white text-black px-8 py-3 rounded-2xl font-black italic shadow-neo">
              {t('close')}
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror-x" />
            <canvas ref={canvasRef} className="hidden" />
            <button onClick={onClose} className="absolute top-6 right-6 bg-black/50 text-white p-2 rounded-full backdrop-blur-md border-2 border-white/20">
              <X size={24} />
            </button>
            <div className="absolute bottom-12 left-0 right-0 flex justify-center">
              <button 
                onClick={capture}
                className="w-20 h-20 bg-white rounded-full border-8 border-black/20 flex items-center justify-center active:scale-90 transition-all shadow-2xl"
              >
                <div className="w-12 h-12 bg-rose-500 rounded-full" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default function FoodDetective({ onLogAdded, summary, goals, recentLogs = [], setAdvice, adviceUpdateLockRef, favoriteUpdateTrigger, userName }) {
  const [mode, setMode] = useState('ai'); 
  const [aiLoading, setAiLoading] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(null);
  const [errorToast, setErrorToast] = useState(null);
  const [loadTime, setLoadTime] = useState(0);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [manualEntry, setManualEntry] = useState({ dish_name: '', calories: '', protein: '', water: '' });
  const [locationLoading, setLocationLoading] = useState(false);
  const [showDesktopCamera, setShowDesktopCamera] = useState(false);
  const pendingCoordsRef = useRef(null); 
  const analysisIdRef = useRef(0);
  const [favorites, setFavorites] = useState([]);
  const [favToast, setFavToast] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [nutritionFacts, setNutritionFacts] = useState([]);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isResuming, setIsResuming] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierInput, setMultiplierInput] = useState('1');
  const [originalResult, setOriginalResult] = useState(null);
  const [showCustomMultiplier, setShowCustomMultiplier] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 14) return 'lunch';
    if (hour >= 14 && hour < 17) return 'snack';
    if (hour >= 17 && hour < 21) return 'dinner';
    return 'snack';
  });
  const [isRoastExpanded, setIsRoastExpanded] = useState(false);

  // Recovery Logic
  useEffect(() => {
    const checkPending = async () => {
      try {
        const pending = await db.pendingAnalysis.get('current');
        if (pending && (Date.now() - pending.timestamp < 5 * 60 * 1000)) {
          setIsResuming(true);
          setPreview(pending.base64);
          await performAnalysis(pending.base64, pending.location);
          setIsResuming(false);
        } else if (pending) {
          await db.pendingAnalysis.delete('current');
        }
      } catch (err) {
        console.warn("Recovery failed:", err);
      }
    };
    checkPending();
  }, []);

  const loadFavorites = async () => {
    const items = await db.favorites.toArray();
    setFavorites(items);
  };

  useEffect(() => {
    let interval;
    if (aiLoading) {
      const fetchFacts = async () => {
        const lang = getLanguage();
        let items = await db.nutritionFacts.where('lang').equals(lang).toArray();
        const proteinShort = goals.protein - summary.protein;
        const waterShort = goals.water - summary.water;
        const isNight = new Date().getHours() >= 21;

        items = items.sort((a, b) => {
          const aText = a.fact.toLowerCase();
          if (isNight && (aText.includes('消化') || aText.includes('代謝') || aText.includes('睡眠'))) return -1;
          if (proteinShort > 20 && (aText.includes('蛋') || aText.includes('肉') || aText.includes('肌肉'))) return -1;
          if (waterShort > 800 && (aText.includes('水') || aText.includes('代謝'))) return -1;
          return 0;
        });
        setNutritionFacts(items);
      };
      fetchFacts();

      setLoadTime(ANALYSIS_DURATION_SECONDS);
      interval = setInterval(() => {
        setLoadTime(prev => {
          const next = prev > 0 ? prev - 1 : 0;
          if (next % 5 === 0) {
            setCurrentFactIndex(curr => (nutritionFacts.length > 0 ? (curr + 1) % nutritionFacts.length : 0));
          }
          return next;
        });
      }, 1000);
    } else {
      setLoadTime(ANALYSIS_DURATION_SECONDS);
      setCurrentFactIndex(0);
    }
    return () => clearInterval(interval);
  }, [aiLoading, nutritionFacts.length]);

  useEffect(() => {
    if (mode === 'search') {
      const doSearch = async () => {
        if (!searchQuery.trim()) {
          setSearchResults([]);
          return;
        }
        const matches = await db.dietLogs
          .filter(log => log.dish_name.toLowerCase().includes(searchQuery.toLowerCase()))
          .reverse()
          .sortBy('timestamp');
          
        const uniqueMatches = [];
        const seen = new Set();
        for (const m of matches) {
          if (!seen.has(m.dish_name)) {
            uniqueMatches.push(m);
            seen.add(m.dish_name);
          }
          if (uniqueMatches.length >= 30) break;
        }
        setSearchResults(uniqueMatches);
      };
      doSearch();
    }
  }, [searchQuery, mode]);

  useEffect(() => {
    if (mode === 'favorites') loadFavorites();
  }, [mode, favoriteUpdateTrigger]);

  const reverseGeocode = async (lat, lon) => {
    setLocationLoading(true);
    try {
      const lang = getLanguage();
      const acceptLang = lang === 'zh' ? 'zh-TW,zh;q=0.9' : 'en-US,en;q=0.9';
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
        headers: {
          'Accept-Language': acceptLang,
          'User-Agent': 'DailyDietApp/1.0'
        }
      });
      const data = await response.json();
      const addr = data.address;
      const city = addr.city || addr.state || '';
      const suburb = addr.suburb || addr.town || addr.district || '';
      const road = addr.road || addr.pedestrian || '';
      let houseNumber = addr.house_number || '';
      if (houseNumber && !houseNumber.includes('號')) houseNumber += '號';
      return `${city}${suburb} ${road}${houseNumber}`.trim();
    } catch (err) {
      console.error("Geocoding error:", err);
      return t('unknown');
    } finally {
      setLocationLoading(false);
    }
  };

  const getCachedLocation = () => {
    const cached = localStorage.getItem('last_known_location');
    if (!cached) return null;
    try {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < 15 * 60 * 1000) return data.location;
    } catch (e) {}
    return null;
  };

  const saveLocationToCache = (location) => {
    if (!location) return;
    localStorage.setItem('last_known_location', JSON.stringify({ location, timestamp: Date.now() }));
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      localStorage.setItem('location_granted', 'true');
      const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      setResult(prev => ({ ...prev, location: loc }));
    }, (err) => {
      console.error("Geolocation error:", err);
      setLocationLoading(false);
    }, { timeout: 10000 });
  };

  const compressImage = (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = IMAGE_MAX_DIMENSION;
        const MAX_HEIGHT = IMAGE_MAX_DIMENSION;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
      };
      img.src = base64;
    });
  };

  const hashImage = async (base64) => {
    const msgUint8 = new TextEncoder().encode(base64);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const performAnalysis = async (compressedBase64, locationPromise) => {
    const currentAnalysisId = ++analysisIdRef.current;
    setAiLoading(true);
    setAiError(null);
    setLoadTime(ANALYSIS_DURATION_SECONDS);
    document.body.classList.add('ai-analyzing');

    try {
      const imgHash = await hashImage(compressedBase64);
      const cached = await db.analysisCache.get(imgHash);
      let data;
      let location = getCachedLocation();

      if (cached) {
        data = cached.result;
        setLoadTime(1);
      } else {
        if (!location) {
          location = await (locationPromise instanceof Promise ? locationPromise : Promise.resolve(locationPromise ?? null));
          if (location) saveLocationToCache(location);
        }

        const dailyContext = {
          calories: summary.calories,
          calorieGoal: goals.calories,
          protein: summary.protein,
          proteinGoal: goals.protein,
          water: summary.water,
          waterGoal: goals.water,
          foodLogs: recentLogs,
          userName: userName
        };

        const res = await analyzeFoodImage(compressedBase64, dailyContext, getLanguage());
        if (currentAnalysisId !== analysisIdRef.current) return;
        data = res;
        
        if (data && data.dish_name) {
          await db.analysisCache.put({ hash: imgHash, result: data, timestamp: Date.now() });
        }
      }

      if (currentAnalysisId === analysisIdRef.current && location) {
        try {
          await db.pendingAnalysis.update('current', { location });
        } catch (err) {
          if (err.name !== 'AbortError' && err.name !== 'NotFoundError') throw err;
        }
      }

      if (currentAnalysisId === analysisIdRef.current && data && data.dish_name) {
        const finalResult = { ...data, location };
        setResult(finalResult);
        setOriginalResult(finalResult);
        setMultiplier(1);
        setShowCustomMultiplier(false);
        await db.pendingAnalysis.delete('current');
        if (adviceUpdateLockRef) adviceUpdateLockRef.current = true;
        if (data.panda_comment && setAdvice) setAdvice(data.panda_comment);
      }
    } catch (err) {
      if (currentAnalysisId !== analysisIdRef.current) return;
      if (err.name === 'AbortError') return;
      console.error("AI Analysis Error:", err);
      const errorMsg = err.message || t('ai_error');
      setAiError(errorMsg);
    } finally {
      if (currentAnalysisId === analysisIdRef.current) {
        setAiLoading(false);
        setIsResuming(false);
        document.body.classList.remove('ai-analyzing');
      }
    }
  };

  const cancelAnalysis = () => {
    analysisIdRef.current++;
    setAiLoading(false);
    setIsResuming(false);
    setPreview(null);
    setResult(null);
    setAiError(null);
    document.body.classList.remove('ai-analyzing');
    db.pendingAnalysis.delete('current');
  };

  const handleAnalysis = async (base64, locationPromise = null) => {
    try {
      const compressedBase64 = await compressImage(base64);
      await db.pendingAnalysis.put({ key: 'current', base64: compressedBase64, location: null, timestamp: Date.now() });
      await performAnalysis(compressedBase64, locationPromise);
    } catch (err) {
      console.error("Preparation Error:", err);
      setAiError(t('ai_error'));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    setPreview(base64);
    const locationPromise = (async () => {
      try {
        const gps = await exifr.gps(file);
        if (gps?.latitude && gps?.longitude) return await reverseGeocode(gps.latitude, gps.longitude);
      } catch (err) {}
      if (navigator.geolocation) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (permission.state === 'granted') {
            return await new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                async (pos) => resolve(await reverseGeocode(pos.coords.latitude, pos.coords.longitude)),
                () => resolve(null), { timeout: 5000 }
              );
            });
          }
        } catch (err) {}
      }
      return null;
    })();
    await handleAnalysis(base64, locationPromise);
  };

  const handleCameraCapture = async (base64) => {
    setShowDesktopCamera(false);
    setPreview(base64);
    const locationPromise = (async () => {
      try {
        const coords = pendingCoordsRef.current;
        if (coords) return await reverseGeocode(coords.latitude, coords.longitude);
        else if (navigator.geolocation) {
          return await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (pos) => resolve(await reverseGeocode(pos.coords.latitude, pos.coords.longitude)),
              () => resolve(null), { timeout: 5000 }
            );
          });
        }
      } catch (err) {}
      finally { pendingCoordsRef.current = null; }
      return null;
    })();
    await handleAnalysis(base64, locationPromise);
  };

  const handleMultiplierChange = (m) => {
    setMultiplierInput(m.toString());
    const val = parseFloat(m);
    if (isNaN(val) || val <= 0) return;
    setMultiplier(val);
    if (!originalResult) return;
    const updatedResult = {
      ...originalResult,
      calories: Math.round(originalResult.calories * val),
      protein: Number((originalResult.protein * val).toFixed(1)),
      water: Math.round(originalResult.water * val),
      dish_name: val === 1 ? originalResult.dish_name : t('multiplier_format').replace('{n}', val).replace('{name}', originalResult.dish_name)
    };
    setResult(updatedResult);
  };

  const saveLog = async () => {
    let dataToSave = null;
    if (mode === 'ai' && result) {
      dataToSave = { ...result, image: preview, advice: result.panda_comment || null };
    } else if (mode === 'manual' && manualEntry.dish_name) {
      dataToSave = { dish_name: manualEntry.dish_name, calories: Number(manualEntry.calories) || 0, protein: Number(manualEntry.protein) || 0, water: Number(manualEntry.water) || 0, description: t('manual_desc') };
    }
    if (!dataToSave) return;
    setManualSaving(true);
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await db.dietLogs.add({ ...dataToSave, date: localDate, timestamp: Date.now(), location: dataToSave.location || null, category: selectedCategory });
    if (mode === 'ai') { setPreview(null); setResult(null); setOriginalResult(null); setMultiplier(1); setShowCustomMultiplier(false); }
    setManualEntry({ dish_name: '', calories: '', protein: '', water: '' });
    onLogAdded(mode === 'ai' ? 'skip' : 'fetch');
    setManualSaving(false);
  };

  return (
    <NeoCard className="bg-white/60 backdrop-blur-sm relative overflow-hidden p-0">
      <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <AnimatePresence>
          {successToast && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-0 left-0 right-0 z-50 flex justify-center">
              <div className="bg-emerald-500 text-white px-4 py-2 rounded-2xl shadow-neo-sm font-black italic text-xs flex items-center gap-2"><Check size={14} /> {successToast} {t('ai_complete_title')}</div>
            </motion.div>
          )}
          {errorToast && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-0 left-0 right-0 z-50 flex justify-center">
              <div className="bg-rose-500 text-white px-4 py-2 rounded-2xl shadow-neo-sm font-black italic text-xs flex items-center gap-2"><AlertCircle size={14} /> {t('ai_fail_title')}</div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={async () => {
              const now = new Date();
              const timestamp = now.getTime();
              const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              const twoMinutesAgo = timestamp - (2 * 60 * 1000);
              const lastWaterLog = await db.dietLogs.where('timestamp').above(twoMinutesAgo).filter(log => log.dish_name.includes(t('water'))).last();
              if (lastWaterLog) { await db.dietLogs.update(lastWaterLog.id, { water: (Number(lastWaterLog.water) || 0) + 250, timestamp: timestamp }); }
              else { await db.dietLogs.add({ dish_name: `🚰 ${t('water')}`, calories: 0, protein: 0, water: 250, date: localDate, timestamp: timestamp, location: null }); }
              onLogAdded('fetch');
            }}
            className="w-12 h-12 flex items-center justify-center bg-white rounded-full border-4 border-black active:scale-90 transition-all shadow-neo-sm hover:bg-sky-50 shrink-0 overflow-hidden"
            title={t('add_water')}
          >
            <img src={`${import.meta.env.BASE_URL}water.png`} alt="250ml" className="w-10 h-10 object-contain" />
          </button>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border-2 border-black shrink-0 overflow-x-auto no-scrollbar">
          {[{ id: 'ai', label: t('ai_mode') }, { id: 'manual', label: t('manual_mode') }, { id: 'favorites', label: t('favorites_mode') }, { id: 'search', label: t('search_mode') }].map(tab => (
            <button key={tab.id} className={twMerge("px-2 py-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap border-2 border-transparent", mode === tab.id ? "bg-black text-white border-black" : "hover:bg-white text-gray-600")} onClick={() => setMode(tab.id)}>
              <span className="relative">{tab.label}{tab.id === 'ai' && aiLoading && mode !== 'ai' && <motion.div layoutId="ai-bg-status" className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-accent rounded-full border border-white animate-pulse" />}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'ai' && !preview && (
        <div className="grid grid-cols-2 gap-4 w-full mt-2">
          <button 
            onClick={() => {
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              if (isMobile) cameraInputRef.current?.click();
              else {
                setShowDesktopCamera(true);
                navigator.geolocation.getCurrentPosition(pos => { pendingCoordsRef.current = pos.coords; }, () => {}, { timeout: 5000 });
              }
            }}
            className="group flex flex-col items-center justify-center gap-3 p-6 bg-accent border-4 border-black rounded-[2.5rem] shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all active:translate-x-0 active:translate-y-0"
          >
            <div className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl border-4 border-black shadow-neo-sm"><Camera size={28} /></div>
            <span className="font-black italic text-lg uppercase tracking-tighter">{t('camera')}</span>
          </button>
          
          <button 
            onClick={() => galleryInputRef.current?.click()}
            className="group flex flex-col items-center justify-center gap-3 p-6 bg-white border-4 border-black rounded-[2.5rem] shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all active:translate-x-0 active:translate-y-0"
          >
            <div className="w-14 h-14 flex items-center justify-center bg-zinc-100 rounded-2xl border-4 border-black shadow-neo-sm"><ImageIcon size={28} /></div>
            <span className="font-black italic text-lg uppercase tracking-tighter">{t('gallery')}</span>
          </button>

          <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageUpload} />
          <input type="file" accept="image/*" multiple className="hidden" ref={galleryInputRef} onChange={handleImageUpload} />
        </div>
      )}

      {showDesktopCamera && <DesktopCamera onClose={() => setShowDesktopCamera(false)} onCapture={handleCameraCapture} onLocationReady={(coords) => { pendingCoordsRef.current = coords; }} />}

      {mode === 'ai' && preview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden border-4 border-black shadow-neo">
            <img src={preview} className="w-full h-full object-cover" alt="Preview" />
            {!aiLoading && <button onClick={cancelAnalysis} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-md border border-white/20"><X size={20} /></button>}
            {aiError && <div className="absolute inset-0 bg-rose-500/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white z-[70]"><AlertCircle size={48} className="mb-4 animate-bounce" /><p className="font-black italic text-sm mb-6">{aiError}</p><NeoButton variant="black" className="h-12 px-8 text-xs flex items-center justify-center gap-2" onClick={() => performAnalysis(preview, null)}><RefreshCw size={16} /> {t('retry')}</NeoButton></div>}
          </div>

          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-accent border-4 border-black p-4 rounded-[2rem] shadow-neo-sm">
                  <div className="flex items-center gap-2 mb-1 opacity-60"><Flame size={14} /><span className="text-[10px] font-black uppercase">{t('calories')}</span></div>
                  <div className="text-2xl font-black italic">{result.calories} <span className="text-xs">kcal</span></div>
                </div>
                <div className="bg-white border-4 border-black p-4 rounded-[2rem] shadow-neo-sm">
                  <div className="flex items-center gap-2 mb-1 opacity-60"><Star size={14} /><span className="text-[10px] font-black uppercase">{t('protein')}</span></div>
                  <div className="text-2xl font-black italic">{result.protein} <span className="text-xs">g</span></div>
                </div>
              </div>

              <NeoCard className="bg-white border-4 border-black">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black italic mb-2">{result.dish_name}</h3>
                    <div className="mb-4"><div className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 ml-1">{t('portion_size')}</div><div className="flex overflow-x-auto no-scrollbar gap-2 -mx-1 px-1">{[0.5, 1, 1.5, 2].map(m => (<button key={m} onClick={() => { handleMultiplierChange(m); setShowCustomMultiplier(false); }} className={twMerge("px-2 py-1.5 rounded-xl font-black text-[10px] border-2 transition-all", multiplier === m && !showCustomMultiplier ? "bg-black text-white border-black" : "bg-white text-black border-black/10 hover:border-black")}>x{m}</button>))}<button onClick={() => { setShowCustomMultiplier(true); setMultiplierInput(''); }} className={twMerge("px-3 py-1.5 rounded-xl font-black text-[10px] border-2 transition-all", showCustomMultiplier ? "bg-black text-white border-black" : "bg-white text-black border-black/10 hover:border-black")}>{t('custom')}...</button></div></div>
                    {showCustomMultiplier && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-4"><input type="number" step="0.1" min="0.1" value={multiplierInput} onChange={(e) => handleMultiplierChange(e.target.value)} className="w-20 border-4 border-black p-1.5 rounded-xl font-black text-center outline-none focus:bg-zinc-50 transition-all" autoFocus placeholder="1.0" /><span className="font-black text-xs">{t('times_portion')}</span></motion.div>}
                    <div className="flex flex-wrap items-center gap-2 mt-2"><div className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1.5 rounded-xl border border-black/5"><MapPin size={14} className="text-zinc-400" /><span className="text-[10px] font-bold text-zinc-500">{locationLoading ? t('locating') : (result.location || t('unknown_location'))}</span>{!locationLoading && !result.location && (<button onClick={fetchCurrentLocation} className="text-accent hover:text-accent/80 ml-1"><RefreshCw size={12} className="animate-pulse" /></button>)}</div><div className="flex bg-zinc-50 p-1 rounded-xl border border-black/5">{['breakfast', 'lunch', 'dinner', 'snack'].map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={twMerge("px-2 py-1 text-[9px] font-black uppercase rounded-lg", selectedCategory === cat ? "bg-black text-white" : "text-zinc-400 hover:text-zinc-600")}>{t(cat)}</button>))}</div></div>
                  </div>
                </div>
                {result.panda_comment && (
                  <div className="bg-accent/5 border-4 border-black p-4 rounded-[2rem] mb-3 relative shadow-neo-sm">
                    <div className="absolute top-[-12px] left-4 bg-accent border-2 border-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Check size={10} className="text-black" strokeWidth={4} />
                      <span className="text-[8px] font-black uppercase tracking-widest">{t('panda_coach')}</span>
                    </div>
                    <p className="text-sm font-black italic leading-snug">
                      "{result.panda_comment}"
                    </p>
                  </div>
                )}

                {result.roast && (
                  <div className="bg-accent/10 border-4 border-black p-4 rounded-[2rem] mb-3 relative shadow-neo-sm transition-all">
                    <div className="absolute top-[-12px] left-4 bg-black text-white border-2 border-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <MessageSquareQuote size={10} className="fill-white" />
                      <span className="text-[8px] font-black uppercase tracking-widest">{t('panda_roast')}</span>
                    </div>
                    <p className="text-sm font-black italic text-black leading-snug">
                      "{result.roast}"
                    </p>
                  </div>
                )}
                <div className="flex gap-2"><NeoButton variant="black" className="flex-1 h-16 text-lg flex items-center justify-center gap-2" onClick={saveLog}><Check size={24} />{t('log_meal')}</NeoButton><button onClick={() => { setPreview(null); setResult(null); }} className="w-16 h-16 bg-white border-4 border-black rounded-[1.5rem] flex items-center justify-center shadow-neo-sm"><Trash2 size={24} /></button></div>
              </NeoCard>
            </motion.div>
          )}
        </motion.div>
      )}
      </div>

      {aiLoading && (
        <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center rounded-[2rem] overflow-hidden">
          <div className="flex flex-col items-center gap-2 mb-3">
            <div className="relative">
              <Loader2 size={40} className="text-accent animate-spin" strokeWidth={4} />
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-black font-mono text-[9px] -mr-0.5">{loadTime}s</span></div>
            </div>
            <span className="text-accent text-[9px] font-black uppercase tracking-widest leading-none">{t('analyzing')}</span>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentFactIndex} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="space-y-1 px-2 mb-4"
            >
              <div className="bg-accent text-black px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase inline-block border border-black mb-1">{t('food_fact')}</div>
              <p className="text-white font-black italic text-xs leading-tight max-w-[220px] mx-auto line-clamp-3">{nutritionFacts[currentFactIndex]?.fact || t('analyzing')}</p>
            </motion.div>
          </AnimatePresence>

          <div className="w-full max-w-[180px] space-y-3">
            <div className="bg-rose-500/20 border-2 border-rose-500 px-3 py-1.5 rounded-xl">
              <p className="text-rose-500 text-[8px] font-black uppercase leading-tight">{t('stay_on_page_warning')}</p>
            </div>
            <button onClick={cancelAnalysis} className="mx-auto text-white/30 hover:text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5"><X size={10} /> {t('cancel')}</button>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-4 pt-0">
      {mode === 'manual' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="space-y-3">
            <div><label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('food_name')}</label><input type="text" placeholder={t('manual_placeholder')} value={manualEntry.dish_name} onChange={(e) => setManualEntry({ ...manualEntry, dish_name: e.target.value })} className="w-full border-4 border-black p-4 rounded-2xl font-bold bg-white outline-none" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('calories')}</label><input type="number" placeholder="0" value={manualEntry.calories} onChange={(e) => setManualEntry({ ...manualEntry, calories: e.target.value })} className="w-full border-4 border-black p-4 rounded-2xl font-mono font-bold bg-white outline-none" /></div>
              <div><label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('protein')}</label><input type="number" placeholder="0" value={manualEntry.protein} onChange={(e) => setManualEntry({ ...manualEntry, protein: e.target.value })} className="w-full border-4 border-black p-4 rounded-2xl font-mono font-bold bg-white outline-none" /></div>
              <div><label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('water_unit')}</label><input type="number" placeholder="0" value={manualEntry.water} onChange={(e) => setManualEntry({ ...manualEntry, water: e.target.value })} className="w-full border-4 border-black p-4 rounded-2xl font-mono font-bold bg-white outline-none" /></div>
            </div>
            <div><label className="text-[10px] font-black uppercase text-zinc-400 block mb-1 ml-1">{t('category')}</label><div className="flex bg-white border-4 border-black p-1 rounded-2xl">{['breakfast', 'lunch', 'dinner', 'snack'].map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={twMerge("flex-1 py-2 text-[10px] font-black uppercase rounded-xl", selectedCategory === cat ? "bg-black text-white" : "text-zinc-400 hover:text-zinc-600")}>{t(cat)}</button>))}</div></div>
          </div>
          <NeoButton variant="black" className="w-full h-16 text-lg flex items-center justify-center gap-2 disabled:opacity-50" onClick={saveLog} disabled={!manualEntry.dish_name || manualSaving}>{manualSaving ? <Loader2 className="animate-spin" /> : <><Check size={24} /> {t('log_meal')}</>}</NeoButton>
        </motion.div>
      )}

      {mode === 'favorites' && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          {favToast && <div className="bg-black text-white text-[10px] font-black px-3 py-2 rounded-xl text-center animate-bounce">{favToast}</div>}
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {favorites.map((item) => (
                <div 
                  key={item.id} 
                  onClick={async () => { 
                    setManualSaving(true); 
                    const now = new Date(); 
                    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
                    await db.dietLogs.add({ dish_name: item.dish_name, calories: item.calories, protein: item.protein, water: item.water || 0, description: item.description, date: localDate, timestamp: Date.now(), category: selectedCategory }); 
                    setFavToast(t('added_to_today')); 
                    setTimeout(() => setFavToast(null), 1500); 
                    onLogAdded('fetch'); 
                    setManualSaving(false); 
                  }} 
                  className="flex items-center justify-between p-3 bg-white border-4 border-black rounded-2xl hover:bg-zinc-50 active:scale-[0.98] transition-all text-left group cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm truncate">{item.dish_name}</div>
                    <div className="flex gap-2 text-[10px] font-bold font-mono text-zinc-400"><span>🔥 {item.calories}</span><span>🍖 {item.protein}</span>{item.water > 0 && <span>🚰 {item.water}</span>}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={18} className="text-zinc-200 group-hover:text-emerald-500 transition-colors" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); db.favorites.delete(item.id); loadFavorites(); }} 
                      className="p-1 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-4 border-dashed border-zinc-200 rounded-3xl">
              <Star size={32} className="mx-auto text-zinc-200 mb-2" />
              <p className="text-zinc-400 font-bold italic text-sm">{t('no_favorites')}</p>
            </div>
          )}
        </motion.div>
      )}

      {mode === 'search' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="relative"><input type="text" placeholder={t('search_placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full border-4 border-black p-4 rounded-2xl font-bold bg-white outline-none" autoFocus /></div>
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {searchResults.length > 0 ? (
              searchResults.map((item) => (
                <div 
                  key={item.id} 
                  onClick={async () => { 
                    setManualSaving(true); 
                    const now = new Date(); 
                    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
                    await db.dietLogs.add({ dish_name: item.dish_name, calories: item.calories, protein: item.protein, water: item.water || 0, description: item.description, date: localDate, timestamp: Date.now(), category: selectedCategory }); 
                    setFavToast(t('added_to_today')); 
                    setTimeout(() => setFavToast(null), 1500); 
                    onLogAdded('fetch'); 
                    setManualSaving(false); 
                    setMode('ai'); 
                    setSearchQuery(''); 
                  }} 
                  className="flex items-center justify-between p-3 bg-white border-4 border-black rounded-2xl hover:bg-zinc-50 active:scale-[0.98] transition-all text-left group cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm truncate">{item.dish_name}</div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold font-mono text-zinc-400 mt-1">
                      {item.category && item.dish_name && !item.dish_name.startsWith(t(item.category)) && (
                        <span className="text-[7px] font-black uppercase tracking-tighter px-1 py-0.5 rounded bg-zinc-100 text-zinc-400 border border-zinc-200 shrink-0">{t(item.category)}</span>
                      )}
                      <span>🔥 {item.calories}</span><span>🍖 {item.protein}</span>
                    </div>
                  </div>
                  <Check size={18} className="text-zinc-200 group-hover:text-emerald-500 transition-colors" />
                </div>
              ))
            ) : searchQuery.trim() !== '' ? (
              <div className="text-center py-10 border-4 border-dashed border-zinc-200 rounded-3xl">
                <p className="text-zinc-400 font-bold italic text-sm">{t('no_search_results')}</p>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
      </div>
    </NeoCard>
  );
}
