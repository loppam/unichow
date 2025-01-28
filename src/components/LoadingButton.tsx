import React from "react";

interface LoadingButtonProps {
  isLoading: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  onClick,
  children,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full py-3 bg-black text-white rounded-lg hover:bg-gray-900 ${className}`}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Saving...
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;
