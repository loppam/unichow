import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Truck } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-full bg-black p-6 mb-8 mx-auto w-fit">
          <Truck className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-8 text-center">Login</h1>

        <form className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <Link to="/forgot-password" className="text-sm text-gray-600 block">
            Forgot password?
          </Link>
          <button
            type="submit"
            className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium mt-6"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-gray-800 font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
