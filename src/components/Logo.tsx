import React from 'react';
import { Truck } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'w-8 h-8 p-4',
    md: 'w-12 h-12 p-6',
    lg: 'w-16 h-16 p-8'
  };

  return (
    <div className={`rounded-full bg-black mx-auto w-fit mb-8`}>
      <Truck className={`${sizes[size]} text-white`} />
    </div>
  );
}