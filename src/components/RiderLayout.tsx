import { ReactNode } from 'react';
import RiderNavigation from './RiderNavigation';

interface RiderLayoutProps {
  children: ReactNode;
}

export default function RiderLayout({ children }: RiderLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
      <RiderNavigation />
    </div>
  );
} 