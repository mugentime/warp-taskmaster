
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-300 mb-4">{title}</h2>
      <div className="h-full">{children}</div>
    </div>
  );
};

export default Card;