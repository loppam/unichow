import { Link } from "react-router-dom";
import { Truck } from "lucide-react";

export default function Welcome() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="rounded-full bg-black p-8 mb-8">
          <Truck className="w-16 h-16 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">UniChow</h1>
        <div className="w-full flex gap-4 mt-8">
          <Link
            to="/login"
            className="flex-1 bg-gray-800 text-white py-3 rounded-lg text-center font-medium"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-lg text-center font-medium"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
