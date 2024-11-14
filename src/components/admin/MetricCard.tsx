import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  description?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, description }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h3 className="text-lg font-semibold">{title}</h3>
    <div className="mt-2">
      <span className="text-2xl font-bold">{value}</span>
      {trend !== undefined && (
        <span className={`ml-2 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    {description && (
      <p className="text-gray-500 text-sm mt-2">{description}</p>
    )}
  </div>
); 