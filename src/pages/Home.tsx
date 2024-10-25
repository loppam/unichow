import React from 'react';
import { Search } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import RestaurantCard from '../components/RestaurantCard';

const RESTAURANTS = [
  {
    id: '1',
    name: "Arena's Kitchen",
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    rating: 4.5,
    deliveryTime: '30-45 min',
    minOrder: '₦2,500'
  },
  {
    id: '2',
    name: 'Jollof Express',
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80',
    rating: 4.2,
    deliveryTime: '25-40 min',
    minOrder: '₦2,000'
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="search"
              placeholder="Search restaurants"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <h2 className="text-xl font-bold mb-4">Popular Restaurants</h2>
        <div className="space-y-4">
          {RESTAURANTS.map(restaurant => (
            <RestaurantCard key={restaurant.id} {...restaurant} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}