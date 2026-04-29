import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, ArrowBigDown } from 'lucide-react';
import { t } from '../lib/translations';
import NeoButton from './NeoButton';

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(standalone);

    // 2. Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // 3. Listen for Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. For iOS, show prompt after a short delay if not standalone
    if (ios && !standalone) {
      const timer = setTimeout(() => {
        // Only show if not dismissed recently
        if (!localStorage.getItem('pwa_prompt_dismissed')) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 left-4 right-4 z-[500]"
      >
        <div className="bg-white border-4 border-black p-5 rounded-[2rem] shadow-neo flex flex-col gap-4 relative overflow-hidden">
          <button 
            onClick={dismissPrompt}
            className="absolute top-4 right-4 p-1 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex gap-4 items-start pr-8">
            <div className="w-12 h-12 bg-accent border-4 border-black rounded-2xl flex items-center justify-center shrink-0 shadow-neo-sm">
              <Download size={24} className="text-black" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black italic text-lg leading-tight">{t('pwa_install_title')}</h3>
              <p className="text-xs font-bold text-zinc-500 leading-relaxed">
                {t('pwa_install_desc')}
              </p>
            </div>
          </div>

          {isIOS ? (
            <div className="bg-accent/10 border-2 border-black border-dashed p-3 rounded-xl flex items-center gap-3">
              <div className="bg-white border-2 border-black p-1.5 rounded-lg shrink-0">
                <Share size={16} />
              </div>
              <p className="text-[10px] font-black leading-tight italic">
                {t('pwa_ios_hint').replace('{icon}', '')}
              </p>
              <ArrowBigDown size={20} className="text-black animate-bounce shrink-0" />
            </div>
          ) : (
            <NeoButton 
              variant="black" 
              className="w-full h-12 rounded-xl text-sm"
              onClick={handleInstallClick}
            >
              {t('pwa_install_btn')}
            </NeoButton>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
