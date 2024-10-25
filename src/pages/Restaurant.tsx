import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Star } from "lucide-react";

const MENU_ITEMS = [
  {
    id: "1",
    name: "Arena's Jollof Rice And Chicken",
    price: "₦2,800",
    image:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "2",
    name: "Arena's Fried Rice And Chicken",
    price: "₦2,800",
    image:
      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80",
  },
];

export default function Restaurant() {
  const { id } = useParams();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="relative h-64">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80"
          alt="Restaurant cover"
          className="w-full h-full object-cover"
        />
        <Link
          to="/home"
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
        >
          <ArrowLeft size={24} />
        </Link>
      </header>

      <div className="relative -mt-8 bg-white rounded-t-3xl p-6">
        <h1 className="text-2xl font-bold">Arena's Kitchen</h1>
        <div className="flex items-center mt-2 text-sm text-gray-600">
          <Star size={16} className="text-yellow-400 mr-1" />
          <span>4.5</span>
          <span className="mx-2">•</span>
          <Clock size={16} className="mr-1" />
          <span>30-45 min</span>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">Menu</h2>
          <div className="space-y-4">
            {MENU_ITEMS.map((item) => (
              <div key={item.id} className="flex items-center space-x-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-gray-600">{item.price}</p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="w-6 h-6 rounded-md border-gray-300 text-gray-800 focus:ring-gray-800"
                />
              </div>
            ))}
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
            <Link
              to="/cart"
              className="btn-primary w-full flex justify-center items-center"
            >
              Add to cart ({selectedItems.length})
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
