import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const IncludeLogo: React.FC<LogoProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn(sizeClasses[size], className)}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 173.53 173.53"
        className="w-full h-full"
      >
        <defs>
          <style>{`.cls-1{fill:#accceb;}.cls-2{fill:#4570ac;}`}</style>
        </defs>
        <g>
          <g>
            <path className="cls-1" d="M77,50.51S79.41.52,99.74,0C122.06-.56,80.5,63,79.53,64.68,77.5,68.16,76.4,56.37,77,50.51Z"></path>
            <path className="cls-2" d="M93.28,60S121,5.86,143.76,15.46C168.78,26,90.91,75.65,89,77,85,79.84,89.7,66.23,93.28,60Z"></path>
            <path className="cls-2" d="M80.66,113.28S53,167.44,30.17,157.84C5.16,147.3,83,97.65,84.92,96.31,88.92,93.47,84.24,107.08,80.66,113.28Z"></path>
            <path className="cls-2" d="M113.6,93s54.16,27.71,44.56,50.49C147.62,168.46,98,90.59,96.62,88.7,93.79,84.71,107.39,89.38,113.6,93Z"></path>
            <path className="cls-2" d="M60.34,80.34S6.18,52.64,15.78,29.86C26.32,4.85,76,82.71,77.32,84.61,80.15,88.6,66.55,83.92,60.34,80.34Z"></path>
            <path className="cls-1" d="M96.55,123s-2.43,50-22.76,50.51C51.47,174.1,93,110.5,94,108.85,96,105.37,97.13,117.16,96.55,123Z"></path>
            <path className="cls-1" d="M123,77s50,2.43,50.51,22.76c.57,22.32-63-19.24-64.68-20.21C105.37,77.5,117.16,76.4,123,77Z"></path>
            <path className="cls-1" d="M50.51,96.55S.52,94.12,0,73.79C-.56,51.47,63,93,64.68,94,68.16,96,56.37,97.13,50.51,96.55Z"></path>
          </g>
        </g>
      </svg>
    </div>
  );
}; 