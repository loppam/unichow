import { Link } from "react-router-dom";
import { Star } from "lucide-react";

interface RestaurantCardProps {
  id: string;
  name: string;
  image: string;
  rating?: number;
  averagePreparationTime?: number;
  minimumOrder: number;
}

export default function RestaurantCard({
  id,
  name,
  image,
  rating,
  averagePreparationTime,
  minimumOrder,
}: RestaurantCardProps) {
  const formatDeliveryTime = (time?: number) => {
    if (!time) return 'N/A';
    return `${time} mins`;
  };

  return (
    <Link to={`/restaurant/${id}`} className="block">
      <div className="rounded-lg overflow-hidden shadow-sm bg-white">
        <div className="relative h-48">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              img.onerror = null;
              if (!img.src.endsWith('default-restaurant.jpeg')) {
                img.src = '/default-restaurant.jpg';
              }
            }}
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-xl">{name}</h3>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="ml-1">{rating || 'N/A'}</span>
            </div>
            <span>•</span>
            <span>{formatDeliveryTime(averagePreparationTime)}</span>
            <span>•</span>
            <span>Min. ₦{minimumOrder.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
