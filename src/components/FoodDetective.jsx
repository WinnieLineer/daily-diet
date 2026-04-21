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

  const handleAnalysis = async (base64, location) => {
    setLoading(true);
    setResult(null);
    setAiError(null);
    setLoadTime(ANALYSIS_DURATION_SECONDS);

    try {
      const compressedBase64 = await compressImage(base64);
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
      
      if (data && data.dish_name) {
        setResult({ ...data, location });
        
        // 🚀 Set the lock immediately!
        if (adviceUpdateLockRef) adviceUpdateLockRef.current = true;
        
        if (data.panda_comment && setAdvice) setAdvice(data.panda_comment);
        if (data.fun_fact) {
          const exists = await db.nutritionFacts.where('fact').equals(data.fun_fact).count();
          if (exists === 0) await db.nutritionFacts.add({ fact: data.fun_fact, lang: getLanguage() });
        }
      }
    } catch (err) {
      setAiError(err.message || t('ai_error'));
    } finally {
      setLoading(false);
    }
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
      setPreview(reader.result);
      await handleAnalysis(reader.result, finalLocation);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = async (base64) => {
    setShowDesktopCamera(false);
    setPreview(base64);
    
    let autoLocation = null;
    try {
      const coords = pendingCoordsRef.current;
      if (coords) {
        autoLocation = await reverseGeocode(coords.latitude, coords.longitude);
      } else if (navigator.geolocation) {
        autoLocation = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            resolve(loc);
          }, () => resolve(null), { timeout: 5000 });
        });
      }
    } catch (err) { console.warn("Location error:", err); }
    finally { pendingCoordsRef.current = null; }

    await handleAnalysis(base64, autoLocation);
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
          <div className="min-h-[200px] max-h-[500px] border-4 border-black rounded-3xl overflow-hidden relative bg-zinc-100 flex items-center justify-center">
            <img src={preview} alt="Preview" className="max-w-full max-h-[500px] object-contain" />
            {loading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center backdrop-blur-md p-4 z-50">
                <div className="flex flex-col items-center w-full max-w-[280px] space-y-3">
                  {/* Status Badge */}
                  <div className="bg-accent/20 text-accent px-3 py-1 rounded-full border border-accent/40 inline-flex items-center gap-2 shadow-[0_0_10px_rgba(255,183,0,0.1)]">
                    <Loader2 className="animate-spin text-accent" size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('ai_analyzing_status')}</span>
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
                      {loadTime} SEC REMAINING
                    </span>
                  </div>
                </div>
              </div>
            )}
            {!loading && aiError && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md p-6 text-center">
                <AlertCircle className="text-rose-500 mb-3" size={48} />
                <span className="text-white font-bold text-sm mb-4">{aiError}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setPreview(null); setAiError(null); }}
                    className="bg-white/10 text-white px-4 py-2 rounded-xl border-2 border-white/20 font-bold text-xs"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={() => {
                      if (preview) {
                        setLoading(true);
                        setAiError(null);
                        analyzeFoodImage(preview, {
                          calories: summary.calories,
                          calorieGoal: goals.calories,
                          protein: summary.protein,
                          proteinGoal: goals.protein,
                          water: summary.water,
                          waterGoal: goals.water,
                          foodLogs: recentLogs
                        }, getLanguage())
                          .then(data => {
                            setResult(data);
                            setAiError(null);
                          })
                          .catch(err => setAiError(err.message))
                          .finally(() => setLoading(false));
                      }
                    }}
                    className="bg-accent text-black px-6 py-2 rounded-xl border-4 border-black font-black text-xs shadow-neo-sm active:scale-95"
                  >
                    <RefreshCw size={14} className="inline mr-1" /> {t('retry_button') || '重試'}
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
    </NeoCard>
  );
};

// Removed redundant export default
