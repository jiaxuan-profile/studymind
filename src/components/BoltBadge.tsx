// src/components/BoltBadge.tsx
import React from 'react';
import { useStore } from '../store';

interface BoltBadgeProps {
  className?: string;
}

const BoltBadge: React.FC<BoltBadgeProps> = ({ className }) => {
  const { theme } = useStore();

  const badgeSrc = theme === 'dark' 
    ? '/assets/white_circle_360x360.png'
    : '/assets/black_circle_360x360.png';

  const defaultClasses = "transition-opacity hover:opacity-80";

  return (
    <a 
      href="https://bolt.new/" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`${defaultClasses} ${className || ''}`}
      title="Powered by Bolt.new"
    >
      <img 
        src={badgeSrc}
        alt="Powered by Bolt.new" 
        className="w-full h-full object-contain"
      />
    </a>
  );
};

export default BoltBadge;