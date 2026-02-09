'use client';

import { useState, useCallback } from 'react';
import { Loader2, Check, Shield } from 'lucide-react';

interface SimpleCaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function SimpleCaptcha({ onVerify, onError, className = '' }: SimpleCaptchaProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleVerify = useCallback(async () => {
    setIsLoading(true);
    
    // Имитация проверки (в реальном приложении здесь был бы запрос к API)
    setTimeout(() => {
      const token = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      setIsVerified(true);
      onVerify(token);
      setIsLoading(false);
    }, 800);
  }, [onVerify]);

  const handleReset = useCallback(() => {
    setIsVerified(false);
    setIsLoading(false);
  }, []);

  return (
    <div className={`space-y-3 ${className}`}>
      <div 
        className={`
          relative border rounded-lg p-4 cursor-pointer transition-all duration-200
          ${isVerified 
            ? 'border-green-300 bg-green-50' 
            : isHovered 
              ? 'border-teal-400 bg-teal-50' 
              : 'border-slate-300 bg-white hover:border-slate-400'
          }
        `}
        onClick={!isVerified ? handleVerify : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <div className={`
            relative w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center
            ${isVerified 
              ? 'border-green-500 bg-green-500' 
              : isHovered 
                ? 'border-teal-500' 
                : 'border-slate-400'
            }
          `}>
            {isLoading ? (
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            ) : isVerified ? (
              <Check className="w-3 h-3 text-white" />
            ) : null}
          </div>

          {/* Text */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-600" />
              <span className={`text-sm font-medium ${
                isVerified ? 'text-green-700' : 'text-slate-700'
              }`}>
                {isVerified ? 'Я не робот' : 'Я не робот'}
              </span>
            </div>
            {!isVerified && (
              <p className="text-xs text-slate-500 mt-1">
                Нажмите, чтобы подтвердить, что вы человек
              </p>
            )}
          </div>

          {/* Reset button for verified state */}
          {isVerified && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          </div>
        )}
      </div>

      {/* Success message */}
      {isVerified && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Check className="w-4 h-4" />
          <span>Проверка пройдена успешно</span>
        </div>
      )}
    </div>
  );
}
