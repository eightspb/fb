'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Lock } from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import { SimpleCaptcha } from '@/components/SimpleCaptcha';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaVerified) {
      setError('Пожалуйста, пройдите проверку CAPTCHA');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await adminCsrfFetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--frox-gray-100)] p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--frox-brand)' }}
          >
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--frox-gray-1100)]">Вход в админ-панель</h1>
          <p className="text-sm text-[var(--frox-gray-500)] mt-1">fibroadenoma.net</p>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--frox-neutral-border)] shadow-sm p-8">
          <form onSubmit={handleLogin} className="space-y-5" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-[var(--frox-gray-700)]">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
                autoFocus
              />
            </div>

            <SimpleCaptcha
              onVerify={() => setCaptchaVerified(true)}
              onError={(error) => setError(error)}
            />

            {error && (
              <div className="flex items-center gap-2 text-sm text-[var(--frox-red)] bg-red-50 border border-red-100 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
