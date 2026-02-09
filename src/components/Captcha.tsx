'use client';

import { useState, useCallback, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function Captcha({ onVerify, onError, className = '' }: CaptchaProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [userInput, setUserInput] = useState('');

  const generateCaptcha = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setUserInput('');
    setIsVerified(false);
  }, []);

  const verifyCaptcha = useCallback(() => {
    if (userInput.toLowerCase() === captchaCode.toLowerCase()) {
      setIsVerified(true);
      onVerify(captchaCode);
    } else {
      setIsVerified(false);
      onError?.('Неверный код. Попробуйте еще раз.');
      setUserInput('');
    }
  }, [userInput, captchaCode, onVerify, onError]);

  // Initialize captcha on mount
  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <div 
            className="w-full h-12 bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-300 rounded-lg flex items-center justify-center select-none relative overflow-hidden"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(0,0,0,.03) 10px,
                rgba(0,0,0,.03) 20px
              )`,
            }}
          >
            <span className="text-2xl font-bold text-slate-700 tracking-widest select-none">
              {captchaCode.split('').map((char, index) => (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    transform: `rotate(${Math.random() * 20 - 10}deg)`,
                    color: `hsl(${Math.random() * 60 + 200}, 70%, 40%)`,
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-px bg-slate-400 opacity-30"
                  style={{
                    width: `${Math.random() * 50 + 20}%`,
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 50}%`,
                    transform: `rotate(${Math.random() * 90 - 45}deg)`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={generateCaptcha}
          className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Обновить код"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Введите код с картинки"
          className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${
            isVerified ? 'border-green-300 bg-green-50' : 'border-slate-300'
          }`}
          maxLength={6}
        />
        <button
          type="button"
          onClick={verifyCaptcha}
          disabled={!userInput || userInput.length !== 6}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Проверить'}
        </button>
      </div>

      {isVerified && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Код подтвержден
        </div>
      )}
    </div>
  );
}
