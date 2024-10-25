import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Store, ShoppingCart, User } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t py-2 px-4">
      <div className="max-w-md mx-auto flex justify-between items-center">
        <Link
          to="/home"
          className={`flex flex-col items-center ${
            isActive("/home") ? "text-black" : "text-gray-400"
          }`}
        >
          <Home size={24} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link
          to="/explore"
          className={`flex flex-col items-center ${
            isActive("/explore") ? "text-black" : "text-gray-400"
          }`}
        >
          <Store size={24} />
          <span className="text-xs mt-1">Explore</span>
        </Link>
        <Link
          to="/cart"
          className={`flex flex-col items-center ${
            isActive("/cart") ? "text-black" : "text-gray-400"
          }`}
        >
          <ShoppingCart size={24} />
          <span className="text-xs mt-1">Cart</span>
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center ${
            isActive("/profile") ? "text-black" : "text-gray-400"
          }`}
        >
          <User size={24} />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
