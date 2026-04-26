import React from 'react';
import { motion } from 'framer-motion';

const DancingPanda = ({ className }) => {
  return (
    <motion.div 
      className={className}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative flex items-center justify-center"
    >
      <motion.svg 
        viewBox="0 0 200 220" 
        className="w-full h-full drop-shadow-[10px_10px_0_rgba(0,0,0,0.1)]"
        animate={{ 
          rotate: [-3, 3, -3],
          y: [0, -8, 0]
        }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Shadow under feet */}
        <ellipse cx="100" cy="205" rx="40" ry="8" fill="rgba(0,0,0,0.1)" />

        {/* Ears with bounce */}
        <motion.g animate={{ scaleY: [1, 1.1, 1] }} transition={{ duration: 0.75, repeat: Infinity }}>
          <circle cx="55" cy="45" r="22" fill="black" />
          <circle cx="145" cy="45" r="22" fill="black" />
        </motion.g>
        
        {/* Head and Body Combined for Premium Look */}
        <path 
          d="M100 35 C50 35 30 80 30 130 C30 180 60 200 100 200 C140 200 170 180 170 130 C170 80 150 35 100 35Z" 
          fill="white" 
          stroke="black" 
          strokeWidth="8" 
        />
        
        {/* Eye Patches */}
        <ellipse cx="70" cy="110" rx="22" ry="28" fill="black" transform="rotate(-15, 70, 110)" />
        <ellipse cx="130" cy="110" rx="22" ry="28" fill="black" transform="rotate(15, 130, 110)" />
        
        {/* Eyes (Blinking) */}
        <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 3, repeat: Infinity }}>
          <circle cx="72" cy="105" r="6" fill="white" />
          <circle cx="128" cy="105" r="6" fill="white" />
        </motion.g>
        
        {/* Nose and Mouth */}
        <path d="M90 145 Q100 155 110 145" stroke="black" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="100" cy="140" r="6" fill="black" />
        
        {/* Hands (Dancing Action) */}
        <motion.path 
          d="M35 140 Q10 120 15 160" 
          stroke="black" 
          strokeWidth="15" 
          strokeLinecap="round" 
          animate={{ rotate: [-30, 10, -30], x: [-5, 5, -5] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path 
          d="M165 140 Q190 120 185 160" 
          stroke="black" 
          strokeWidth="15" 
          strokeLinecap="round" 
          animate={{ rotate: [30, -10, 30], x: [5, -5, 5] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Feet */}
        <circle cx="70" cy="195" r="18" fill="black" />
        <circle cx="130" cy="195" r="18" fill="black" />

        {/* Decorative Musical Notes to convey dancing */}
        <motion.text 
          x="180" y="60" fontSize="24" 
          animate={{ y: [60, 40, 60], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        >🎵</motion.text>
        <motion.text 
          x="20" y="80" fontSize="20" 
          animate={{ y: [80, 60, 80], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
        >🎶</motion.text>
      </motion.svg>
    </motion.div>
  );
};

export default DancingPanda;
