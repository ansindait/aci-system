import React from 'react';

interface NotificationDotProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const NotificationDot: React.FC<NotificationDotProps> = ({ 
  count, 
  size = 'md',
  className = '' 
}) => {
  if (count === 0) return null;

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm'
  };

  const textSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm'
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        bg-red-500 
        text-white 
        rounded-full 
        flex 
        items-center 
        justify-center 
        font-bold 
        shadow-sm
        ${className}
      `}
      title={`${count} pending request${count > 1 ? 's' : ''}`}
    >
      <span className={`${textSizeClasses[size]} font-semibold`}>
        {count > 99 ? '99+' : count}
      </span>
    </div>
  );
};

export default NotificationDot; 