'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export const Card = ({ 
  children, 
  className = '', 
  hover = false, 
  loading = false,
  onClick 
}: CardProps) => {
  const baseClasses = `
    bg-white dark:bg-gray-800 
    rounded-xl shadow-sm border border-gray-200 dark:border-gray-700
    ${hover ? 'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${loading ? 'animate-pulse' : ''}
    ${className}
  `;

  const CardComponent = onClick ? motion.div : 'div';

  return (
    <CardComponent
      className={baseClasses}
      onClick={onClick}
      whileHover={hover ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
    >
      {loading ? (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="h-8 bg-gray-300 rounded w-full"></div>
          </div>
        </div>
      ) : (
        children
      )}
    </CardComponent>
  );
};

export const CardHeader = ({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) => (
  <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);

export const CardBody = ({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) => (
  <div className={`px-6 py-4 border-t border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);