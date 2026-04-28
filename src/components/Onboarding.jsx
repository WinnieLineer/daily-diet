import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../lib/translations';
import NeoButton from './NeoButton';
import { Sparkles, Camera, BarChart3, ChevronRight, X, Bell } from 'lucide-react';

const slides = [
  {
    key: 'welcome',
    title: 'onboarding_welcome_title',
    desc: 'onboarding_welcome_desc',
    icon: '🐼',
    color: 'bg-accent'
  },
  {
    key: 'ai',
    title: 'onboarding_ai_title',
    desc: 'onboarding_ai_desc',
    icon: <Camera size={48} />,
    color: 'bg-white'
  },
  {
    key: 'notifications',
    title: 'onboarding_notif_title',
    desc: 'onboarding_notif_desc',
    icon: <Bell size={48} />,
    color: 'bg-emerald-400'
  },
  {
    key: 'panda',
    title: 'onboarding_panda_title',
    desc: 'onboarding_panda_desc',
    icon: '💬',
    color: 'bg-zinc-900',
    dark: true
  },
  {
    key: 'goal',
    title: 'onboarding_goal_title',
    desc: 'onboarding_goal_desc',
    icon: <BarChart3 size={48} />,
    color: 'bg-accent'
  },
  {
    key: 'permissions',
    title: 'notification_title',
    desc: 'notification_desc',
    icon: '🔔',
    color: 'bg-white',
    isPermission: true
  }
];

const Onboarding = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const next = async () => {
    // 🚀 Handle Permissions Slide
    if (slides[currentSlide].isPermission) {
      // 1. Request Notification Permission
      if ("Notification" in window && Notification.permission !== "granted") {
        await Notification.requestPermission();
      }

      // 2. Request Location Permission
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => {
              localStorage.setItem('location_granted', 'true');
              resolve();
            },
            () => resolve(),
            { timeout: 5000 }
          );
        });
      }
    }

    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const skip = () => onComplete();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 overflow-hidden touch-none"
    >
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="absolute top-10 left-10 w-40 h-40 border-8 border-black rotate-12" />
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full border-8 border-black -rotate-12" />
      </div>

      <div className="relative w-full max-w-sm flex-1 flex flex-col pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = offset.x;
              const swipeThreshold = 50;
              if (swipe < -swipeThreshold) {
                next();
              } else if (swipe > swipeThreshold) {
                prev();
              }
            }}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-8 cursor-grab active:cursor-grabbing"
          >
            {/* Visual Part */}
            <motion.div 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={`w-40 h-40 ${slides[currentSlide].color} border-8 border-black shadow-neo flex items-center justify-center text-6xl rounded-3xl relative`}
            >
              {slides[currentSlide].icon}
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-4 -right-4 bg-white border-4 border-black p-2 rounded-full"
              >
                <Sparkles size={20} className="text-accent fill-accent" />
              </motion.div>
            </motion.div>

            {/* Text Part */}
            <div className="space-y-4">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">
                {t(slides[currentSlide].title)}
              </h2>
              <p className="text-zinc-500 font-bold leading-relaxed px-4">
                {t(slides[currentSlide].desc)}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Progress Dots */}
        <div className="flex gap-2 justify-center mb-8">
          {slides.map((_, i) => (
            <motion.div 
              key={i}
              animate={{ 
                width: currentSlide === i ? 32 : 12,
                backgroundColor: currentSlide === i ? '#000' : '#ddd'
              }}
              className="h-3 rounded-full border-2 border-black"
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4 items-center mb-6">
          <button 
            onClick={skip}
            className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors px-4"
          >
            {t('onboarding_skip')}
          </button>
          
          <NeoButton 
            variant="black" 
            onClick={next}
            className="flex-1 h-16 text-lg flex items-center justify-center gap-2 group"
          >
            {currentSlide === slides.length - 1 ? t('onboarding_start_button') : t('onboarding_next')}
            {currentSlide !== slides.length - 1 && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </NeoButton>
        </div>
      </div>
    </motion.div>
  );
};

export default Onboarding;
