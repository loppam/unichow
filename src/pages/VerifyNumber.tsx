import React, { useState, useRef, useEffect } from 'react';
import Logo from '../components/Logo';

export default function VerifyNumber() {
  const [code, setCode] = useState(['', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      // Move to next input if value is entered
      if (value && index < 3) {
        inputs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <Logo size="md" />
        <h1 className="text-2xl font-bold mb-2 text-center">Verify Number</h1>
        <p className="text-center text-gray-600 mb-8">
          Please enter the 4-digit code sent to your number
        </p>

        <div className="flex justify-center gap-4 mb-8">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => inputs.current[index] = el}
              type="text"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              className="w-12 h-12 text-center text-2xl font-bold border rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none"
            />
          ))}
        </div>

        <button
          className="btn-primary w-full"
          onClick={() => {/* Handle verification */}}
        >
          Continue
        </button>

        <p className="text-center text-gray-600 mt-6">
          Didn't receive a code?{' '}
          <button className="text-black font-medium">
            Resend
          </button>
        </p>
      </div>
    </div>
  );
}