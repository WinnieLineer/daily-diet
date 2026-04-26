import React, { useState, useRef, useEffect } from 'react';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { Camera, Loader2, Check, Lightbulb, Flame, MessageSquareQuote, AlertCircle, RefreshCw, Image as ImageIcon, X, MapPin, Star, Trash2 } from 'lucide-react';
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

    // Silently start fetching location in the background if permission is granted
    // iOS Safari oftens throws error on navigator.permissions.query('geolocation'), so we fallback to a localStorage flag tracking previous consent
    const permissionGranted = localStorage.getItem('location_granted') === 'true';
    if (navigator.geolocation && onLocationReady) {
      try {
        navigator.permissions.query({ name: 'geolocation' }).then(permission => {
          if (permission.state === 'granted' || permissionGranted) {
            fetchBackground();
          }
        }).catch(() => {
          if (permissionGranted) fetchBackground();
        });
      } catch (err) {
        if (permissionGranted) fetchBackground();
      }
    }

    function fetchBackground() {
      navigator.geolocation.getCurrentPosition(
        pos => {
          localStorage.setItem('location_granted', 'true');
          onLocationReady(pos.coords);
        },
        () => {}, // silent fail
        { timeout: 8000, maximumAge: 30000 }
      );
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

export default function FoodDetective({ onLogAdded, summary, goals, recentLogs = [], setAdvice, adviceUpdateLockRef }) {
  const [mode, setMode] = useState('ai'); // 'ai', 'manual', or 'favorites'
  const [loading, setLoading] = useState(false);
  const [loadTime, setLoadTime] = useState(0);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [manualEntry, setManualEntry] = useState({ dish_name: '', calories: '', protein: '', water: '' });
  const [locationLoading, setLocationLoading] = useState(false);
  const [showDesktopCamera, setShowDesktopCamera] = useState(false);
  const pendingCoordsRef = useRef(null); // stores pre-fetched coords from camera open
  const [favorites, setFavorites] = useState([]);
  const [favToast, setFavToast] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [nutritionFacts, setNutritionFacts] = useState([]);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isResuming, setIsResuming] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [originalResult, setOriginalResult] = useState(null);
  const [showCustomMultiplier, setShowCustomMultiplier] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 19) return 'dinner';
    return 'snack';
  });

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
          // Auto-cleanup on success handled in performAnalysis finally
        } else if (pending) {
          // Stale data cleanup
          await db.pendingAnalysis.delete('current');
        }
      } catch (err) {
        console.warn("Recovery failed:", err);
      }
    };
    checkPending();
  }, []);

  // Load favorites when tab is shown
  const loadFavorites = async () => {
    const items = await db.favorites.toArray();
    setFavorites(items);
  };

  // Cycle through nutrition facts during loading
  useEffect(() => {
    let interval;
    if (loading) {
      // Fetch facts when loading starts (if not already fetched or to get latest)
      const fetchFacts = async () => {
        const lang = getLanguage();
        let items = await db.nutritionFacts.where('lang').equals(lang).toArray();
        
        // Priority Logic: Show facts related to missing nutrients
        const proteinShort = goals.protein - summary.protein;
        const waterShort = goals.water - summary.water;
        const isNight = new Date().getHours() >= 21;

        items = items.sort((a, b) => {
          const aText = a.fact.toLowerCase();
          // If late at night, prioritize facts about digestion/metabolism
          if (isNight && (aText.includes('消化') || aText.includes('代謝') || aText.includes('睡眠'))) return -1;
          // If protein deficit is large, prioritize protein facts
          if (proteinShort > 20 && (aText.includes('蛋') || aText.includes('肉') || aText.includes('肌肉'))) return -1;
          // If water is low, prioritize hydration
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
          // Every 5 seconds, change the fact
          if (next % 5 === 0) {
            setCurrentFactIndex(curr => (nutritionFacts.length > 0 ? (curr + 1) % nutritionFacts.length : 0));
          }
          return next;
        });
      }, 1000); // Tick every 1 second
    } else {
      setLoadTime(ANALYSIS_DURATION_SECONDS);
      setCurrentFactIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading, nutritionFacts.length]);

  useEffect(() => {
    if (mode === 'favorites') loadFavorites();
  }, [mode]);

  const getCurrentLocation = () => {
    // We will no longer use browser geolocation for manual/water
    return Promise.resolve(null);
  };

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
      
      if (houseNumber && !houseNumber.includes('號')) {
        houseNumber += '號';
      }
      
      // Return a structured string that we can parse if needed
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
      // Valid for 15 minutes
      if (Date.now() - data.timestamp < 15 * 60 * 1000) {
        return data.location;
      }
    } catch (e) {}
    return null;
  };

  const saveLocationToCache = (location) => {
    if (!location) return;
    localStorage.setItem('last_known_location', JSON.stringify({
      location,
      timestamp: Date.now()
    }));
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

  const analysisIdRef = useRef(0);

  const performAnalysis = async (compressedBase64, locationPromise) => {
    // Increment analysis ID to invalidate previous requests
    const currentAnalysisId = ++analysisIdRef.current;
    
    setLoading(true);
    setAiError(null);
    setLoadTime(ANALYSIS_DURATION_SECONDS);

    try {
      // 1. Try Cache First
      let location = getCachedLocation();
      
      // 2. If no cache, resolve location in background
      if (!location) {
        location = await (locationPromise instanceof Promise ? locationPromise : Promise.resolve(locationPromise ?? null));
        if (location) saveLocationToCache(location);
      }

      // Update pending analysis with location if it was found
      if (location) {
        await db.pendingAnalysis.update('current', { location });
      }

      const dailyContext = {
        calories: summary.calories,
        calorieGoal: goals.calories,
        protein: summary.protein,
        proteinGoal: goals.protein,
        water: summary.water,
        waterGoal: goals.water,
        foodLogs: recentLogs
      };

      const data = await analyzeFoodImage(compressedBase64, dailyContext, getLanguage());
      
      // 🚀 Check if this request is still valid (not cancelled)
      if (currentAnalysisId !== analysisIdRef.current) return;

      if (data && data.dish_name) {
        const finalResult = { ...data, location };
        setResult(finalResult);
        setOriginalResult(finalResult);
        setMultiplier(1);
        setShowCustomMultiplier(false);
        
        // Clear pending on success
        await db.pendingAnalysis.delete('current');
        
        // 🚀 Set the lock immediately!
        if (adviceUpdateLockRef) adviceUpdateLockRef.current = true;
        
        if (data.panda_comment && setAdvice) setAdvice(data.panda_comment);
        if (data.fun_fact) {
          const exists = await db.nutritionFacts.where('fact').equals(data.fun_fact).count();
          if (exists === 0) await db.nutritionFacts.add({ fact: data.fun_fact, lang: getLanguage() });
        }
      }
    } catch (err) {
      if (currentAnalysisId !== analysisIdRef.current) return;
      console.error("AI Analysis Error:", err);
      setAiError(err.message || t('ai_error') || "AI 辨識發生錯誤，請稍後再試。");
    } finally {
      if (currentAnalysisId === analysisIdRef.current) {
        setLoading(false);
        setIsResuming(false);
      }
    }
  };

  // locationPromise: optional Promise<string|null> for background location resolution
  const handleAnalysis = async (base64, locationPromise = null) => {
    try {
      // Immediately start compression
      const compressedBase64 = await compressImage(base64);
      
      // Save for recovery (without location initially, location will update when ready)
      await db.pendingAnalysis.put({
        key: 'current',
        base64: compressedBase64,
        location: null,
        timestamp: Date.now()
      });

      await performAnalysis(compressedBase64, locationPromise);
    } catch (err) {
      console.error("Preparation Error:", err);
      setAiError(t('ai_error') || "圖片處理失敗");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Read the file immediately so we can show preview + loading ASAP
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

    // Show preview & start loading right away — no waiting for location
    setPreview(base64);

    // Build a background location promise that runs in parallel with AI analysis
    const locationPromise = (async () => {
      // 1. Try EXIF GPS (fast, local)
      try {
        const gps = await exifr.gps(file);
        if (gps?.latitude && gps?.longitude) {
          return await reverseGeocode(gps.latitude, gps.longitude);
        }
      } catch (err) {
        console.warn("EXIF extraction failed:", err);
      }

      // 2. Fallback: use geolocation if permission already granted
      if (navigator.geolocation) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (permission.state === 'granted') {
            return await new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                async (pos) => resolve(await reverseGeocode(pos.coords.latitude, pos.coords.longitude)),
                () => resolve(null),
                { timeout: 5000 }
              );
            });
          }
        } catch (err) { console.warn("Auto-location check failed:", err); }
      }
      return null;
    })();

    await handleAnalysis(base64, locationPromise);
  };

  const handleCameraCapture = async (base64) => {
    setShowDesktopCamera(false);
    // Show preview & loading immediately, resolve location in background
    setPreview(base64);


    const locationPromise = (async () => {
      try {
        const coords = pendingCoordsRef.current;
        if (coords) {
          return await reverseGeocode(coords.latitude, coords.longitude);
        } else if (navigator.geolocation) {
          return await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (pos) => resolve(await reverseGeocode(pos.coords.latitude, pos.coords.longitude)),
              () => resolve(null),
              { timeout: 5000 }
            );
          });
        }
      } catch (err) { console.warn("Location error:", err); }
      finally { pendingCoordsRef.current = null; }
      return null;
    })();

    await handleAnalysis(base64, locationPromise);
  };

  const handleMultiplierChange = (m) => {
    const val = parseFloat(m);
    if (isNaN(val) || val <= 0) return;
    
    setMultiplier(val);
    if (!originalResult) return;
    
    const updatedResult = {
      ...originalResult,
      calories: Math.round(originalResult.calories * val),
      protein: Number((originalResult.protein * val).toFixed(1)),
      water: Math.round(originalResult.water * val),
      dish_name: val === 1 
        ? originalResult.dish_name 
        : t('multiplier_format').replace('{n}', val).replace('{name}', originalResult.dish_name)
    };
    setResult(updatedResult);
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
      location: dataToSave.location || null,
      category: selectedCategory
    });
    
    setPreview(null);
    setResult(null);
    setOriginalResult(null);
    setMultiplier(1);
    setShowCustomMultiplier(false);
    setManualEntry({ dish_name: '', calories: '', protein: '', water: '' });
    onLogAdded(mode === 'ai' ? 'skip' : 'fetch');
    setLoading(false);
  };

  return (
    <NeoCard className="space-y-4 bg-white/60 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xl font-black italic"></h2>
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
                  water: (Number(lastWaterLog.water) || 0) + 250,
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
              onLogAdded('fetch');
            }}
            className="text-[10px] font-black bg-white text-black px-2 py-1 rounded-xl border-2 border-black active:scale-95 transition-all whitespace-nowrap shadow-neo-sm hover:bg-zinc-50"
          >
            {t('add_water')}
          </button>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border-2 border-black shrink-0">
          {[
            { id: 'ai',        label: t('ai_mode') },
            { id: 'manual',    label: t('manual_mode') },
            { id: 'favorites', label: t('favorites_mode') },
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
          onLocationReady={(coords) => { pendingCoordsRef.current = coords; }}
        />
      )}



      {mode === 'ai' && preview && (
        <div className="w-full space-y-4">
          <div className="aspect-[3/4] border-4 border-black rounded-[2.5rem] overflow-hidden relative bg-zinc-900 flex items-center justify-center shadow-neo">
            <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-40 blur-sm absolute inset-0" />
            <img src={preview} alt="Preview" className="relative z-10 max-w-full max-h-full object-contain" />
            {loading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center backdrop-blur-md z-50 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col items-center w-full max-w-[280px] space-y-3 py-6 px-4 m-auto">
                  {/* Status Badge */}
                  <div className="bg-accent/20 text-accent px-3 py-1 rounded-full border border-accent/40 inline-flex items-center gap-2 shadow-[0_0_10px_rgba(255,183,0,0.1)]">
                    <Loader2 className="animate-spin text-accent" size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                      {isResuming ? t('resuming_analysis') : t('ai_analyzing_status')}
                    </span>
                  </div>
                  
                  {/* Fact Box */}
                  <AnimatePresence mode="wait">
                    {nutritionFacts.length > 0 && (
                      <motion.div
                        key={currentFactIndex}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="text-center bg-white/5 p-4 rounded-3xl border border-white/10 w-full"
                      >
                        <span className="text-accent/60 font-black uppercase tracking-[0.2em] text-[8px] block border-b border-accent/20 pb-1 mb-2">
                          {t('food_fact')}
                        </span>
                        <p className="text-white font-bold italic text-xs leading-relaxed">
                          "{nutritionFacts[currentFactIndex]?.fact}"
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Progress Indicator */}
                  <div className="flex flex-col items-center w-full gap-1.5 pt-1">
                    <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-accent"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: ANALYSIS_DURATION_SECONDS, ease: "linear" }}
                      />
                    </div>
                    <span className="text-accent font-mono text-[10px] font-black tracking-tighter">
                      {loadTime} {t('sec_remaining')}
                    </span>
                  </div>

                  <button 
                    onClick={async () => {
                      analysisIdRef.current++; // 🚀 Invalidate pending request immediately
                      await db.pendingAnalysis.delete('current'); // Clear persistence
                      setLoading(false);
                      setIsResuming(false);
                      setPreview(null);
                      setAiError(null);
                    }}
                    className="mt-4 text-[11px] font-black uppercase tracking-[0.15em] text-zinc-100 hover:text-white transition-all bg-white/15 px-6 py-2.5 rounded-full border-2 border-white/20 hover:border-white/40 hover:bg-white/20 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.05)] shrink-0"
                  >
                    {t('cancel_analysis')}
                  </button>
                </div>
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
              
              {/* Portion Multiplier Selector */}
              <div className="flex flex-wrap items-center gap-2 mb-4 bg-white/5 p-2 rounded-2xl border border-white/10">
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{t('portion')}</span>
                </div>
                <div className="flex gap-1">
                  {[0.5, 1, 2].map(val => (
                    <button 
                      key={val}
                      onClick={() => {
                        setShowCustomMultiplier(false);
                        handleMultiplierChange(val);
                      }}
                      className={twMerge(
                        "px-3 py-1 rounded-xl text-[10px] font-black transition-all border-2",
                        multiplier === val && !showCustomMultiplier
                          ? "bg-accent text-black border-accent" 
                          : "bg-white/5 text-white/60 border-transparent hover:bg-white/10"
                      )}
                    >
                      {val === 0.5 ? '1/2' : val + 'x'}
                    </button>
                  ))}
                  <button 
                    onClick={() => setShowCustomMultiplier(!showCustomMultiplier)}
                    className={twMerge(
                      "px-3 py-1 rounded-xl text-[10px] font-black transition-all border-2",
                      showCustomMultiplier 
                        ? "bg-accent text-black border-accent" 
                        : "bg-white/5 text-white/60 border-transparent hover:bg-white/10"
                    )}
                  >
                    {t('custom')}
                  </button>
                </div>
                
                <AnimatePresence>
                  {showCustomMultiplier && (
                    <motion.div 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden flex items-center gap-2 ml-auto"
                    >
                      <input 
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={multiplier}
                        onChange={(e) => handleMultiplierChange(e.target.value)}
                        className="w-16 bg-white/10 border-2 border-white/20 rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none focus:border-accent transition-colors"
                      />
                      <span className="text-xs font-bold text-white/40">x</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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
                onClick={() => { 
                  setPreview(null); 
                  setResult(null); 
                  setOriginalResult(null); 
                  setMultiplier(1);
                  setShowCustomMultiplier(false);
                }}
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
          
          <div className="flex flex-wrap gap-2">
            {['breakfast', 'lunch', 'dinner', 'snack'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={twMerge(
                  "px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all",
                  selectedCategory === cat ? "bg-black text-white border-black" : "bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100"
                )}
              >
                {t(cat)}
              </button>
            ))}
          </div>

          <NeoButton className="w-full mt-1" variant="black" disabled={!manualEntry.dish_name} onClick={saveLog}>
            <Check size={16} className="inline mr-1" /> {t('save_record')}
          </NeoButton>
        </motion.div>
      )}

      {mode === 'favorites' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-2">
          {/* Toast for quick add */}
          <AnimatePresence>
            {favToast && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="bg-white text-black text-xs font-black px-4 py-2 rounded-2xl border-4 border-black shadow-neo-sm flex items-center gap-2 justify-center"
              >
                <div className="bg-emerald-500 p-0.5 rounded-full border border-black">
                  <Check size={10} strokeWidth={4} className="text-white" />
                </div>
                {favToast}
              </motion.div>
            )}
          </AnimatePresence>

          {favorites.length > 0 ? (
            favorites.map((fav) => (
              <motion.div
                key={fav.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center justify-between p-3 border-4 border-black rounded-2xl bg-white hover:bg-zinc-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm leading-tight truncate">{fav.dish_name}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold font-mono">
                    {fav.calories > 0 && (
                      <span className="text-black bg-accent px-1.5 py-0.5 rounded whitespace-nowrap">🔥{fav.calories}</span>
                    )}
                    {fav.protein > 0 && (
                      <span className="text-white bg-black px-1.5 py-0.5 rounded whitespace-nowrap">🍖{fav.protein}g</span>
                    )}
                    {fav.water > 0 && (
                      <span className="text-black border-2 border-black px-1.5 py-0.5 rounded whitespace-nowrap">🚰{fav.water}ml</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={async () => {
                      const now = new Date();
                      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      await db.dietLogs.add({
                        dish_name: fav.dish_name,
                        calories: fav.calories || 0,
                        protein: fav.protein || 0,
                        water: fav.water || 0,
                        description: fav.description || '',
                        date: localDate,
                        timestamp: Date.now(),
                        location: null
                      });
                      setFavToast(t('favorite_added_toast'));
                      setTimeout(() => setFavToast(null), 1500);
                      onLogAdded('fetch');
                    }}
                    className="bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-xl border-2 border-black hover:bg-zinc-800 transition-all active:scale-95"
                  >
                    {t('quick_add')}
                  </button>
                  <button
                    onClick={async () => {
                      await db.favorites.delete(fav.id);
                      loadFavorites();
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title={t('remove_favorite')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-10 border-4 border-dashed border-gray-200 rounded-2xl">
              <Star size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-400 italic text-sm font-bold">{t('favorites_empty')}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* AI Error Overlay - Moved to root level to avoid clipping */}
      <AnimatePresence>
        {!loading && aiError && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md rounded-[2.5rem]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border-4 border-black rounded-[2.5rem] p-8 shadow-neo w-full max-w-xs flex flex-col items-center text-center space-y-6"
            >
              <div className="bg-rose-100 p-4 rounded-full border-4 border-black shadow-neo-sm">
                <AlertCircle className="text-rose-500" size={32} />
              </div>
              
              <div className="space-y-2 w-full overflow-hidden">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">{t('ai_error_title')}</h3>
                <div className="bg-rose-50/50 p-4 rounded-2xl border-2 border-dashed border-rose-200">
                  <p className="text-[10px] font-mono font-bold text-rose-700/80 leading-relaxed break-all line-clamp-6 overflow-y-auto">
                    {aiError}
                  </p>
                </div>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={() => performAnalysis(preview, result?.location)}
                  className="w-full bg-accent text-black py-4 rounded-2xl border-4 border-black font-black text-sm shadow-neo active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} /> {t('retry_button') || "重試一次"}
                </button>
                
                <button 
                  onClick={() => { setPreview(null); setAiError(null); }}
                  className="w-full bg-white text-gray-400 py-3 rounded-2xl font-black text-xs hover:text-black transition-colors"
                >
                  {t('cancel') || "取消"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </NeoCard>
  );
};

// Removed redundant export default
