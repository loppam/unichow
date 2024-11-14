import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import Logo from '../components/Logo';
import Input from '../components/Input';

export default function ForgotPassword() {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!value) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (method === 'email') {
        await sendPasswordResetEmail(auth, value);
        setSuccess('Password reset email sent! Check your inbox.');
      } else {
        // Implement phone reset logic here
        // You'll need to set up phone authentication first
      }
    } catch (err) {
      setError('Failed to send reset instructions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <Logo size="md" />
        <h1 className="text-2xl font-bold mb-2 text-center">Forgot Password</h1>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-500 p-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <Input
            type={method === 'email' ? 'email' : 'tel'}
            placeholder={method === 'email' ? 'Enter your email' : 'Enter your phone number'}
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

          <button 
            className="btn-primary w-full"
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
        </div>

        <Link to="/login" className="block text-center mt-6 text-gray-600">
          Back to Login
        </Link>
      </div>
    </div>
  );
}