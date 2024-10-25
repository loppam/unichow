import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Input from '../components/Input';

export default function ForgotPassword() {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [value, setValue] = useState('');

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <Logo size="md" />
        <h1 className="text-2xl font-bold mb-2 text-center">Forgot Password</h1>
        <p className="text-center text-gray-600 mb-8">
          Select a method to reset your password
        </p>

        <div className="space-y-4">
          <Input
            type={method === 'email' ? 'email' : 'tel'}
            placeholder={method === 'email' ? 'Send To Your Email' : 'Send To Your Number'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <div className="flex gap-4">
            <button
              className={`flex-1 py-3 rounded-lg font-medium ${
                method === 'email' ? 'bg-gray-800 text-white' : 'bg-gray-100'
              }`}
              onClick={() => setMethod('email')}
            >
              Email
            </button>
            <button
              className={`flex-1 py-3 rounded-lg font-medium ${
                method === 'phone' ? 'bg-gray-800 text-white' : 'bg-gray-100'
              }`}
              onClick={() => setMethod('phone')}
            >
              Phone
            </button>
          </div>

          <button className="btn-primary w-full">
            Continue
          </button>
        </div>

        <Link to="/login" className="block text-center mt-6 text-gray-600">
          Back to Login
        </Link>
      </div>
    </div>
  );
}