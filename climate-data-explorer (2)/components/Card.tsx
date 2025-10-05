
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleIcon?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, titleIcon }) => {
  return (
    <div className={`bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg flex flex-col ${className}`}>
      {title && (
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
          {titleIcon && <span className="mr-2">{titleIcon}</span>}
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};
