import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

// Full screen loading spinner
export const FullScreenLoader = ({ text = 'Loading...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="large" text={text} />
    </div>
  );
};

// Inline loading spinner
export const InlineLoader = ({ text = 'Loading...', className = '' }) => {
  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <LoadingSpinner size="small" text={text} />
    </div>
  );
};

export default LoadingSpinner;