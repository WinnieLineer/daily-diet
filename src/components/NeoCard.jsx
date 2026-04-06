import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const NeoCard = ({ children, className, ...props }) => {
  return (
    <motion.div
      whileHover={{ y: -2, x: -2 }}
      className={twMerge('neo-card p-6', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default NeoCard;
