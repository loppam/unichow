import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Menu, Settings } from "lucide-react";

export default function RestaurantNavigation() {
  const location = useLocation();

  const navItems = [
    { path: '/restaurant-dashboard', icon: Home, label: 'Dashboard' },
    { path: '/restaurant-orders', icon: ShoppingBag, label: 'Orders' },
    { path: '/restaurant-menu', icon: Menu, label: 'Menu' },
    { path: '/restaurant-settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t pb-safe">
      <div className="max-w-md mx-auto flex justify-between px-4 md:px-6">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center py-2 px-3 md:py-3 md:px-6 min-w-[64px] ${
              location.pathname === path ? 'text-black' : 'text-gray-500'
            }`}
          >
            <Icon className="h-5 w-5 md:h-6 md:w-6" />
            <span className="text-[10px] md:text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
