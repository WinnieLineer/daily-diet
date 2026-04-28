import React, { useState, useRef, useEffect } from 'react';
import NeoButton from './NeoButton';
import NeoCard from './NeoCard';
import { Camera, Loader2, Check, Lightbulb, Flame, MessageSquareQuote, AlertCircle, RefreshCw, Image as ImageIcon, X, MapPin, Star, Trash2, Bell } from 'lucide-react';
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

export default function FoodDetective({ onLogAdded, summary, goals, recentLogs = [], setAdvice, adviceUpdateLockRef, favoriteUpdateTrigger }) {
  const [mode, setMode] = useState('ai'); // 'ai', 'manual', or 'favorites'
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
  const pendingCoordsRef = useRef(null); // stores pre-fetched coords from camera open
  const analysisIdRef = useRef(0);
  const [favorites, setFavorites] = useState([]);
  const [favToast, setFavToast] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [nutritionFacts, setNutritionFacts] = useState([]);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isResuming, setIsResuming] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
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
    return 'snack'; // Night snack
  });
  const [wantsNotification, setWantsNotification] = useState(() => {
    const saved = localStorage.getItem('wants_notification');
    if (saved !== null) return saved === 'true';
    return Notification.permission === 'granted';
  });
  const wantsNotificationRef = useRef(wantsNotification);

  // Sync ref with state and persist preference
  useEffect(() => {
    wantsNotificationRef.current = wantsNotification;
    localStorage.setItem('wants_notification', wantsNotification.toString());
  }, [wantsNotification]);

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
    if (aiLoading) {
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
  }, [aiLoading, nutritionFacts.length]);

  // Search logic
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
          
        // Deduplicate and limit
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

  // Helper for image hashing to ensure consistent results
  const hashImage = async (base64) => {
    const msgUint8 = new TextEncoder().encode(base64);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const performAnalysis = async (compressedBase64, locationPromise) => {
    // Increment analysis ID to invalidate previous requests
    const currentAnalysisId = ++analysisIdRef.current;
    
    setAiLoading(true);
    setAiError(null);
    setLoadTime(ANALYSIS_DURATION_SECONDS);

    // 🚀 Signal to App that we are busy (prevents auto-reload on visibility change)
    document.body.classList.add('ai-analyzing');

    try {
      // 🚀 1. Check Image Cache First for consistency
      const imgHash = await hashImage(compressedBase64);
      const cached = await db.analysisCache.get(imgHash);
      
      let data;
      let location = getCachedLocation();

      if (cached) {
        console.log("🚀 Using cached result for consistency");
        data = cached.result;
        setLoadTime(1); // Fast track loading UI
      } else {
        // 🚀 2. Resolve location if no cache
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
          foodLogs: recentLogs
        };

        const res = await analyzeFoodImage(compressedBase64, dailyContext, getLanguage());
        if (currentAnalysisId !== analysisIdRef.current) return;
        
        data = res;
        
        // 🚀 3. Save to cache
        if (data && data.dish_name) {
          await db.analysisCache.put({
            hash: imgHash,
            result: data,
            timestamp: Date.now()
          });
        }
      }

      // Update pending analysis with location if it was found
      if (currentAnalysisId === analysisIdRef.current && location) {
        try {
          await db.pendingAnalysis.update('current', { location });
        } catch (err) {
          // Ignore abort errors if we just deleted it
          if (err.name !== 'AbortError' && err.name !== 'NotFoundError') throw err;
        }
      }

      if (currentAnalysisId === analysisIdRef.current && data && data.dish_name) {
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

        // 🚀 Notify user
        const title = t('ai_complete_title');
        const body = `${t('ai_complete_body')}\n${data.dish_name}: ${data.calories}kcal`;
        await notifyUser(title, body);

        if (document.visibilityState === 'visible' && mode !== 'ai') {
          setSuccessToast(data.dish_name);
          setTimeout(() => setSuccessToast(null), 5000);
        }
      }
    } catch (err) {
      if (currentAnalysisId !== analysisIdRef.current) return;
      if (err.name === 'AbortError') return; // Silent ignore on manual cancel

      console.error("AI Analysis Error:", err);
      const errorMsg = err.message || t('ai_error') || "AI 辨識發生錯誤，請稍後再試。";
      setAiError(errorMsg);

      // 🚀 Notify user of failure
      const title = t('ai_fail_title');
      const body = `${t('ai_fail_body')}\n${errorMsg}`;
      
      // Always call notifyUser for sensory feedback (sound/title)
      await notifyUser(title, body);

      if (document.visibilityState === 'visible' && mode !== 'ai') {
        setErrorToast(errorMsg);
        setTimeout(() => setErrorToast(null), 5000);
      }
    } finally {
      if (currentAnalysisId === analysisIdRef.current) {
        setAiLoading(false);
        setIsResuming(false);
        document.body.classList.remove('ai-analyzing');
      }
    }
  };

  const cancelAnalysis = () => {
    analysisIdRef.current++; // Invalidate current analysis
    setAiLoading(false);
    setIsResuming(false);
    setPreview(null);
    setResult(null);
    setAiError(null);
    document.body.classList.remove('ai-analyzing');
    db.pendingAnalysis.delete('current');
  };

  // Generic Notification Helper
  const notifyUser = async (title, body) => {
    // If permission not granted, we can't do system notification but we can still flash title/sound
    const baseUrl = import.meta.env.BASE_URL || '/';
    const icon = `${baseUrl}pwa-192x192.png`.replace(/\/+/g, '/');
    const badge = `${baseUrl}favicon.png`.replace(/\/+/g, '/');
    
    if (!wantsNotificationRef.current) return;

    // 🔊 Fallback 1: Audio Feedback
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {}

    // 🏷️ Fallback 2: Title Flashing
    const originalTitle = document.title;
    let isFlashing = true;
    const interval = setInterval(() => {
      document.title = isFlashing ? `⚠️ ${title}` : originalTitle;
      isFlashing = !isFlashing;
    }, 1000);
    const stopFlashing = () => {
      clearInterval(interval);
      document.title = originalTitle;
      window.removeEventListener('focus', stopFlashing);
    };
    window.addEventListener('focus', stopFlashing);

    // 📲 System Notification (only if hidden)
    if (document.visibilityState !== 'hidden') return;
    try {
      if (Notification.permission === 'granted' && wantsNotificationRef.current) {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.showNotification(title, { body, icon, badge, tag: 'analysis-status', renotify: true });
          } else {
            new Notification(title, { body, icon });
          }
        } else {
          new Notification(title, { body, icon });
        }
      }
    } catch (err) {}
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
      dataToSave = {
        ...result,
        image: preview,
        advice: result.panda_comment || null
      };
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
    
    setManualSaving(true);
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    await db.dietLogs.add({
      ...dataToSave,
      date: localDate,
      timestamp: Date.now(),
      location: dataToSave.location || null,
      category: selectedCategory
    });
    
    if (mode === 'ai') {
      setPreview(null);
      setResult(null);
      setOriginalResult(null);
      setMultiplier(1);
      setShowCustomMultiplier(false);
    }
    setManualEntry({ dish_name: '', calories: '', protein: '', water: '' });
    onLogAdded(mode === 'ai' ? 'skip' : 'fetch');
    setManualSaving(false);
  };

  const handleNotificationToggle = async () => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      const nextState = !wantsNotification;
      setWantsNotification(nextState);
      localStorage.setItem('diet_notify_preference', nextState);
      if (nextState) {
        new Notification(t('notification_granted'));
      }
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setWantsNotification(true);
        localStorage.setItem('diet_notify_preference', 'true');
        new Notification(t('notification_granted'));
      }
    }
  };

  return (
    <NeoCard className="space-y-4 bg-white/60 backdrop-blur-sm relative overflow-hidden">
      <div className="flex items-center justify-between gap-2 mb-2">
        <AnimatePresence>
          {successToast && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-0 left-0 right-0 z-50 flex justify-center"
            >
              <div className="bg-emerald-500 text-white px-4 py-2 rounded-2xl shadow-neo-sm font-black italic text-xs flex items-center gap-2">
                <Check size={14} /> {successToast} {t('ai_complete_title')}
              </div>
            </motion.div>
          )}
          {errorToast && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-0 left-0 right-0 z-50 flex justify-center"
            >
              <div className="bg-rose-500 text-white px-4 py-2 rounded-2xl shadow-neo-sm font-black italic text-xs flex items-center gap-2">
                <AlertCircle size={14} /> {t('ai_fail_title')}
              </div>
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
              const lastWaterLog = await db.dietLogs
                .where('timestamp')
                .above(twoMinutesAgo)
                .filter(log => log.dish_name.includes(t('water')))
                .last();

              if (lastWaterLog) {
                await db.dietLogs.update(lastWaterLog.id, {
                  water: (Number(lastWaterLog.water) || 0) + 250,
                  timestamp: timestamp
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
            className="w-11 h-11 flex items-center justify-center bg-white rounded-full border-4 border-black active:scale-90 transition-all shadow-neo-sm hover:bg-sky-50 shrink-0 overflow-hidden"
            title={t('add_water')}
          >
            <img 
              src={`${import.meta.env.BASE_URL}water.png`} 
              alt="250ml" 
              className="w-full h-full object-cover p-1"
            />
          </button>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl border-2 border-black shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'ai',        label: t('ai_mode') },
            { id: 'manual',    label: t('manual_mode') },
            { id: 'favorites', label: t('favorites_mode') },
            { id: 'search',    label: t('search_mode') },
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
              }}
            >
              <span className="relative">
                {tab.label}
                {tab.id === 'ai' && aiLoading && mode !== 'ai' && (
                  <motion.div 
                    layoutId="ai-bg-status"
                    className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-accent rounded-full border border-white animate-pulse"
                  />
                )}
              </span>
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
                // Pre-fetch location while camera is opening
                navigator.geolocation.getCurrentPosition(
                  pos => { pendingCoordsRef.current = pos.coords; },
                  () => {},
                  { timeout: 5000 }
                );
              }
            }}
            className="group flex flex-col items-center justify-center gap-3 p-6 bg-accent border-4 border-black rounded-3xl shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <div className="bg-white p-3 rounded-2xl border-4 border-black transition-transform">
              <Camera size={32} />
            </div>
            <span className="font-black italic text-lg">{t('camera')}</span>
          </button>
          
          <button 
            onClick={() => galleryInputRef.current?.click()}
            className="group flex flex-col items-center justify-center gap-3 p-6 bg-white border-4 border-black rounded-3xl shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <div className="bg-zinc-100 p-3 rounded-2xl border-4 border-black transition-transform">
              <ImageIcon size={32} />
            </div>
            <span className="font-black italic text-lg">{t('gallery')}</span>
          </button>

          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageUpload} />
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple="multiple" className="hidden" ref={galleryInputRef} onChange={handleImageUpload} />
        </motion.div>
      )}

      {showDesktopCamera && (
        <DesktopCamera 
          onClose={() => setShowDesktopCamera(false)} 
          onCapture={handleCameraCapture}
          onLocationReady={(coords) => { pendingCoordsRef.current = coords; }}
        />
      )}

      {mode === 'ai' && preview && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="relative aspect-square sm:aspect-video rounded-[2.5rem] overflow-hidden border-4 border-black shadow-neo group">
            <img src={preview} className="w-full h-full object-cover" alt="Preview" />
            {!aiLoading && (
              <button 
                onClick={cancelAnalysis}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black text-white p-2 rounded-full backdrop-blur-md border border-white/20 transition-all active:scale-95"
              >
                <X size={20} />
              </button>
            )}
            {aiError && (
              <div className="absolute inset-0 bg-rose-500/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white z-[70]">
                <AlertCircle size={48} className="mb-4 animate-bounce" />
                <p className="font-black italic text-sm mb-6 break-words max-w-full">
                  {aiError}
                </p>
                <NeoButton 
                  variant="black" 
                  className="h-12 px-8 text-xs flex items-center justify-center gap-2 shadow-lg"
                  onClick={() => performAnalysis(preview, null)}
                >
                  <RefreshCw size={16} /> {t('retry')}
                </NeoButton>
              </div>
            )}
          </div>

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-accent border-4 border-black p-4 rounded-[2rem] shadow-neo-sm">
                  <div className="flex items-center gap-2 mb-1 opacity-60">
                    <Flame size={14} className="font-black" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('calories')}</span>
                  </div>
                  <div className="text-2xl font-black italic">{result.calories} <span className="text-xs">kcal</span></div>
                </div>
                <div className="bg-white border-4 border-black p-4 rounded-[2rem] shadow-neo-sm">
                  <div className="flex items-center gap-2 mb-1 opacity-60">
                    <Star size={14} className="font-black" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('protein')}</span>
                  </div>
                  <div className="text-2xl font-black italic">{result.protein} <span className="text-xs">g</span></div>
                </div>
              </div>

              <NeoCard className="bg-white border-4 border-black">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black italic leading-tight mb-2">
                      {result.dish_name}
                    </h3>
                    
                    {/* Portion Control Multiplier */}
                    <div className="mb-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 ml-1">{t('portion_size')}</div>
                      <div className="flex overflow-x-auto no-scrollbar items-center gap-2 -mx-1 px-1 py-0.5">
                        {[0.5, 1, 1.5, 2].map(m => (
                          <button
                            key={m}
                            onClick={() => {
                              handleMultiplierChange(m);
                              setShowCustomMultiplier(false);
                            }}
                            className={twMerge(
                              "px-2 py-1.5 rounded-xl font-black text-[10px] border-2 transition-all active:scale-95 shrink-0 min-w-[42px]",
                              multiplier === m && !showCustomMultiplier
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-black/10 hover:border-black"
                            )}
                          >
                            x{m}
                          </button>
                        ))}
                        <button
                          onClick={() => setShowCustomMultiplier(true)}
                          className={twMerge(
                            "px-3 py-1.5 rounded-xl font-black text-[10px] border-2 transition-all active:scale-95 shrink-0 whitespace-nowrap",
                            showCustomMultiplier
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-black/10 hover:border-black"
                          )}
                        >
                          {t('custom')}...
                        </button>
                      </div>
                    </div>

                    {showCustomMultiplier && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 mb-4"
                      >
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={multiplier}
                          onChange={(e) => handleMultiplierChange(e.target.value)}
                          className="w-20 border-2 border-black p-1.5 rounded-xl font-black text-center"
                          autoFocus
                        />
                        <span className="font-black text-xs">{t('times_portion')}</span>
                      </motion.div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1.5 rounded-xl border border-black/5">
                        <MapPin size={14} className="text-zinc-400" />
                        <span className="text-[10px] font-bold text-zinc-500">
                          {locationLoading ? t('locating') : (result.location || t('unknown_location'))}
                        </span>
                        {!locationLoading && !result.location && (
                          <button onClick={fetchCurrentLocation} className="text-accent hover:text-accent/80 ml-1">
                            <RefreshCw size={12} className="animate-pulse" />
                          </button>
                        )}
                      </div>
                      
                      {/* Meal Category Selector */}
                      <div className="flex bg-zinc-50 p-1 rounded-xl border border-black/5">
                        {['breakfast', 'lunch', 'dinner', 'snack'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={twMerge(
                              "px-2 py-1 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all",
                              selectedCategory === cat ? "bg-black text-white" : "text-zinc-400 hover:text-zinc-600"
                            )}
                          >
                            {t(cat)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {result.water > 0 && (
                    <div className="bg-sky-50 border-2 border-sky-200 p-2 rounded-2xl flex flex-col items-center gap-1 shrink-0">
                      <div className="text-sky-500 font-black text-xs">🚰</div>
                      <div className="text-[10px] font-black text-sky-600">+{result.water}ml</div>
                    </div>
                  )}
                </div>

                {result.description && (
                  <div className="bg-zinc-50 border-l-4 border-black p-3 mb-6 rounded-r-xl">
                    <div className="flex gap-2 items-start opacity-40 mb-1">
                      <Lightbulb size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{t('composition')}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-600 leading-relaxed italic">
                      {result.description}
                    </p>
                  </div>
                )}

                {result.panda_comment && (
                  <div className="bg-accent/10 border-4 border-black p-4 rounded-[2rem] mb-6 relative shadow-neo-sm">
                    <div className="absolute top-[-12px] left-4 bg-accent border-2 border-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <MessageSquareQuote size={10} className="fill-black" />
                      <span className="text-[8px] font-black uppercase tracking-wider">{t('panda_coach')}</span>
                    </div>
                    <p className="text-sm font-black italic leading-snug">
                      "{result.panda_comment}"
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <NeoButton 
                    variant="black" 
                    className="flex-1 h-16 text-lg flex items-center justify-center gap-2 group"
                    onClick={saveLog}
                  >
                    <Check size={24} className="group-hover:scale-110 transition-transform" />
                    {t('log_meal')}
                  </NeoButton>
                  <button 
                    onClick={() => { setPreview(null); setResult(null); }}
                    className="w-16 h-16 bg-white border-4 border-black rounded-[1.5rem] flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all shadow-neo-sm"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              </NeoCard>
            </motion.div>
          )}
        </motion.div>
      )}

      {mode === 'manual' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1 ml-1">{t('food_name')}</label>
              <input 
                type="text" 
                placeholder={t('manual_placeholder')}
                value={manualEntry.dish_name}
                onChange={(e) => setManualEntry({ ...manualEntry, dish_name: e.target.value })}
                className="w-full border-4 border-black p-4 rounded-2xl font-bold bg-white focus:ring-4 ring-accent/20 transition-all outline-none"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1 ml-1">{t('calories')}</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={manualEntry.calories}
                  onChange={(e) => setManualEntry({ ...manualEntry, calories: e.target.value })}
                  className="w-full border-4 border-black p-4 rounded-2xl font-mono font-bold bg-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1 ml-1">{t('protein')}</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={manualEntry.protein}
                  onChange={(e) => setManualEntry({ ...manualEntry, protein: e.target.value })}
                  className="w-full border-4 border-black p-4 rounded-2xl font-mono font-bold bg-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1 ml-1">{t('water_unit')}</label>
                <input 
                  type="number" 
                  placeholder="0"
                  value={manualEntry.water}
                  onChange={(e) => setManualEntry({ ...manualEntry, water: e.target.value })}
                  className="w-full border-4 border-black p-4 rounded-2xl font-mono font-bold bg-white outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1 ml-1">{t('category')}</label>
                <div className="flex bg-white border-4 border-black p-1 rounded-2xl">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={twMerge(
                        "flex-1 py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all",
                        selectedCategory === cat ? "bg-black text-white" : "text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      {t(cat)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <NeoButton 
            variant="black" 
            className="w-full h-16 text-lg flex items-center justify-center gap-2 group disabled:opacity-50"
            onClick={saveLog}
            disabled={!manualEntry.dish_name || manualSaving}
          >
            {manualSaving ? <Loader2 className="animate-spin" /> : <><Check size={24} /> {t('log_meal')}</>}
          </NeoButton>
        </motion.div>
      )}

      {mode === 'favorites' && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {favToast && (
             <div className="bg-black text-white text-[10px] font-black px-3 py-2 rounded-xl text-center animate-bounce">
               {favToast}
             </div>
          )}
          
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {favorites.map((item) => (
                <button
                  key={item.id}
                  onClick={async () => {
                    setManualSaving(true);
                    const now = new Date();
                    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    await db.dietLogs.add({
                      dish_name: item.dish_name,
                      calories: item.calories,
                      protein: item.protein,
                      water: item.water || 0,
                      description: item.description,
                      date: localDate,
                      timestamp: Date.now(),
                      category: selectedCategory
                    });
                    setFavToast(t('added_to_today'));
                    setTimeout(() => setFavToast(null), 1500);
                    onLogAdded('fetch');
                    setManualSaving(false);
                  }}
                  className="flex items-center justify-between p-3 bg-white border-4 border-black rounded-2xl hover:bg-zinc-50 active:scale-[0.98] transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm truncate">{item.dish_name}</div>
                    <div className="flex gap-2 text-[10px] font-bold font-mono text-zinc-400">
                      <span>🔥 {item.calories}</span>
                      <span>🍖 {item.protein}</span>
                      {item.water > 0 && <span>🚰 {item.water}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={18} className="text-zinc-200 group-hover:text-emerald-500 transition-colors" />
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        await db.favorites.delete(item.id);
                        loadFavorites();
                      }}
                      className="p-1 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </button>
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
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="relative">
            <input 
              type="text" 
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-4 border-black p-4 rounded-2xl font-bold bg-white focus:ring-4 ring-accent/20 transition-all outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {searchResults.length > 0 ? (
              searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={async () => {
                    setManualSaving(true);
                    const now = new Date();
                    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    await db.dietLogs.add({
                      dish_name: item.dish_name,
                      calories: item.calories,
                      protein: item.protein,
                      water: item.water || 0,
                      description: item.description,
                      date: localDate,
                      timestamp: Date.now(),
                      category: selectedCategory
                    });
                    setFavToast(t('added_to_today'));
                    setTimeout(() => setFavToast(null), 1500);
                    onLogAdded('fetch');
                    setManualSaving(false);
                    setMode('ai'); 
                    setSearchQuery('');
                  }}
                  className="flex items-center justify-between p-3 bg-white border-4 border-black rounded-2xl hover:bg-zinc-50 active:scale-[0.98] transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm truncate">{item.dish_name}</div>
                    <div className="flex gap-2 text-[10px] font-bold font-mono text-zinc-400">
                      <span>🔥 {item.calories}</span>
                      <span>🍖 {item.protein}</span>
                    </div>
                  </div>
                  <Check size={18} className="text-zinc-200 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))
            ) : searchQuery.trim() !== '' ? (
              <div className="text-center py-10 border-4 border-dashed border-zinc-200 rounded-3xl">
                 <p className="text-zinc-400 font-bold italic text-sm">{t('no_search_results')}</p>
              </div>
            ) : null}
          </div>
        </motion.div>
      )}

      {aiLoading && (
        <div className="absolute -inset-6 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center rounded-[2rem] overflow-hidden">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="relative">
              <Loader2 size={52} className="text-accent animate-spin" strokeWidth={4} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-black font-mono text-[9px] -mr-0.5">{loadTime}s</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
              <span className="text-sm">🐼</span>
              <span className="text-white text-[9px] font-black tracking-tight uppercase">{t('ai_calculating')}</span>
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFactIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-1.5 px-2 mb-4"
            >
              <div className="bg-accent text-black px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest inline-block border border-black mb-1">
                {t('food_fact')}
              </div>
              <p className="text-white font-black italic text-sm sm:text-base leading-tight max-w-[240px] mx-auto text-balance">
                {nutritionFacts[currentFactIndex]?.fact || t('analyzing')}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-1.5 mb-6">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                className="w-1.5 h-1.5 bg-accent rounded-full"
              />
            ))}
          </div>
          
          <div className="w-full max-w-[240px] space-y-3">
            {isResuming && (
              <p className="text-accent text-[9px] font-black italic animate-pulse">
                {t('resuming_analysis')}
              </p>
            )}

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 rounded-2xl flex items-center justify-between gap-3"
            >
              <div className="text-left min-w-0">
                <p className="text-white text-[8px] font-black uppercase tracking-tight leading-none mb-1 truncate">{t('notification_ask')}</p>
                <p className="text-white/60 text-[7px] font-bold leading-none truncate">{t('notification_ask_sub')}</p>
              </div>
              <button 
                onClick={handleNotificationToggle}
                className={twMerge(
                  "w-8 h-4 rounded-full border border-white relative transition-all duration-300 shrink-0",
                  wantsNotification ? "bg-emerald-400 border-emerald-400" : "bg-white/10"
                )}
              >
                <motion.div 
                  animate={{ x: wantsNotification ? 16 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-lg" 
                />
              </button>
            </motion.div>

            <button 
              onClick={cancelAnalysis}
              className="mx-auto text-white/30 hover:text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
            >
              <X size={10} /> {t('cancel')}
            </button>
          </div>
        </div>
      )}

    </NeoCard>
  );
}
