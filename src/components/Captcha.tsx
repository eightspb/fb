'use client';

import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

function createCaptchaVisuals() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return {
    code,
    glyphStyles: code.split('').map(() => ({
      transform: `rotate(${Math.random() * 20 - 10}deg)`,
      color: `hsl(${Math.random() * 60 + 200}, 70%, 40%)`,
    })),
    noiseLines: Array.from({ length: 3 }, () => ({
      width: `${Math.random() * 50 + 20}%`,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 50}%`,
      transform: `rotate(${Math.random() * 90 - 45}deg)`,
    })),
  };
}

export function Captcha({ onVerify, onError, className = '' }: CaptchaProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [captchaVisuals, setCaptchaVisuals] = useState(createCaptchaVisuals);
  const { code: captchaCode, glyphStyles, noiseLines } = captchaVisuals;

  const generateCaptcha = useCallback(() => {
    setCaptchaVisuals(createCaptchaVisuals());
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
                    ...(glyphStyles[index] ?? {}),
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
            <div className="absolute inset-0 pointer-events-none">
              {noiseLines.map((style, i) => (
                <div
                  key={i}
                  className="absolute h-px bg-slate-400 opacity-30"
                  style={style}
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
          Проверить
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
