import React from 'react';
import { twMerge } from 'tailwind-merge';

const NeoButton = ({ children, className, variant = 'white', ...props }) => {
  const variants = {
    white: 'bg-white',
    accent: 'bg-accent',
    black: 'bg-black text-white',
  };

  return (
    <button
      className={twMerge(
        'neo-button',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default NeoButton;
