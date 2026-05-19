import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const Theme520 = () => {
  const elements = useMemo(() => {
    const chars = ['5', '2', '0', '✨', '🌸', '520'];
    return Array.from({ length: 12 }).map((_, i) => {
      return {
        id: i,
        size: Math.random() * 12 + 16,
        left: i % 2 === 0 ? Math.random() * 20 + 5 : Math.random() * 20 + 75,
        duration: Math.random() * 20 + 25,
        delay: Math.random() * 15,
        sway: (Math.random() - 0.5) * 40,
        char: chars[i % chars.length]
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {elements.map((el) => (
        <motion.div
          key={el.id}
          className="absolute bottom-[-50px] text-rose-300/40 select-none font-black italic will-change-transform"
          initial={{ y: 0, x: 0, rotate: -15 }}
          animate={{
            y: '-110vh',
            x: el.sway,
            rotate: 15
          }}
          transition={{
            duration: el.duration,
            delay: el.delay,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{
            left: `${el.left}%`,
            fontSize: el.size
          }}
        >
          {el.char}
        </motion.div>
      ))}
    </div>
  );
};

export default Theme520;
