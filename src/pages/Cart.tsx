import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import BottomNav from "../components/BottomNav";

const CART_ITEMS = [
  {
    id: "1",
    name: "Arena's Jollof Rice And Chicken",
    price: 2800,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80",
  },
];

export default function Cart() {
  const [items, setItems] = useState(CART_ITEMS); // Initialize state with CART_ITEMS
  const navigate = useNavigate(); // Use useNavigate instead of history

  const increaseQuantity = (id: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseQuantity = (id: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id && item.quantity > 0
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    navigate(-1); // Navigate back to the previous page
  };

  const deliveryPrice = 500;

  const calculateTotal = () => {
    return (
      items.reduce((acc, item) => acc + item.price * item.quantity, 0) +
      deliveryPrice
    );
  };

  const handleCheckout = () => {
    const total = calculateTotal();
    navigate(`/checkout?total=${total}`); // Pass total as a URL parameter
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-center">My Cart</h1>
      </header>

      <main className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center space-x-4 py-4 border-b last:border-0"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-gray-600">₦{item.price.toLocaleString()}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    className="p-1 rounded-md hover:bg-gray-100"
                    onClick={() => decreaseQuantity(item.id)}
                  >
                    <Minus size={16} />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    className="p-1 rounded-md hover:bg-gray-100"
                    onClick={() => increaseQuantity(item.id)}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="p-1 rounded-md hover:bg-gray-100 ml-4"
                    onClick={() => removeItem(item.id)}
                  >
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
            <span>₦{calculateTotal() - deliveryPrice}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>₦{deliveryPrice}</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t">
            <span>Total</span>
            <span>₦{calculateTotal()}.00</span>
          </div>
        </div>

        <button
          className="btn-primary w-full mt-4 flex justify-center items-center"
          onClick={handleCheckout}
        >
          Proceed to Checkout
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
