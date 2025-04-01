import { Link, useLocation } from "react-router-dom";
import { Home, Store, User, ShoppingBag } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto flex justify-between items-center px-6 py-2 h-14">
        <Link
          to="/home"
          className={`flex flex-col items-center flex-1 min-w-0 ${
            isActive("/home") ? "text-black" : "text-gray-400"
          }`}
        >
          <Home size={20} />
          <span className="text-xs mt-1 truncate">Home</span>
        </Link>
        <Link
          to="/explore"
          className={`flex flex-col items-center flex-1 min-w-0 ${
            isActive("/explore") ? "text-black" : "text-gray-400"
          }`}
        >
          <Store size={20} />
          <span className="text-xs mt-1 truncate">Explore</span>
        </Link>
        <Link
          to="/orders"
          className={`flex flex-col items-center flex-1 min-w-0 ${
            isActive("/orders") ? "text-black" : "text-gray-400"
          }`}
        >
          <ShoppingBag size={20} />
          <span className="text-xs mt-1 truncate">Orders</span>
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center flex-1 min-w-0 ${
            isActive("/profile") ? "text-black" : "text-gray-400"
          }`}
        >
          <User size={20} />
          <span className="text-xs mt-1 truncate">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
