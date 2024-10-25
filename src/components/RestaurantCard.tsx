import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

interface RestaurantCardProps {
  id: string;
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  minOrder: string;
}

export default function RestaurantCard({ id, name, image, rating, deliveryTime, minOrder }: RestaurantCardProps) {
  return (
    <Link to={`/restaurant/${id}`} className="block">
      <div className="rounded-lg overflow-hidden shadow-md bg-white">
        <img src={image} alt={name} className="w-full h-48 object-cover" />
        <div className="p-4">
          <h3 className="font-semibold text-lg">{name}</h3>
          <div className="flex items-center mt-2 text-sm text-gray-600">
            <Star size={16} className="text-yellow-400 mr-1" />
            <span>{rating}</span>
            <span className="mx-2">•</span>
            <span>{deliveryTime}</span>
            <span className="mx-2">•</span>
            <span>Min. {minOrder}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}