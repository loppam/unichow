import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const CART_ITEMS = [
  {
    id: '1',
    name: "Arena's Jollof Rice And Chicken",
    price: 2800,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80'
  }
];

export default function Cart() {
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-center">My Cart</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          {CART_ITEMS.map(item => (
            <div key={item.id} className="flex items-center space-x-4 py-4 border-b last:border-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-gray-600">₦{item.price.toLocaleString()}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <button className="p-1 rounded-md hover:bg-gray-100">
                    <Minus size={16} />
                  </button>
                  <span>{item.quantity}</span>
                  <button className="p-1 rounded-md hover:bg-gray-100">
                    <Plus size={16} />
                  </button>
                  <button className="p-1 rounded-md hover:bg-gray-100 ml-4">
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₦2,800</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>₦500</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t">
            <span>Total</span>
            <span>₦3,300</span>
          </div>
        </div>

        <Link
          to="/checkout"
          className="btn-primary w-full mt-4 flex justify-center items-center"
        >
          Proceed to Checkout
        </Link>
      </main>

      <BottomNav />
    </div>
  );
}