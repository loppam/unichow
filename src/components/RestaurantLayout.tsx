import { ReactNode } from 'react';
import RestaurantNavigation from './RestaurantNavigation';

interface RestaurantLayoutProps {
  children: ReactNode;
}

export default function RestaurantLayout({ children }: RestaurantLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
      <RestaurantNavigation />
    </div>
  );
} 