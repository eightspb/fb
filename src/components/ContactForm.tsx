'use client';

import { useState, FormEvent } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { getCsrfToken } from '@/lib/csrf-client';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  consent?: string;
}

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    consent: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Имя обязательно для заполнения';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Имя должно содержать минимум 2 символа';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен для заполнения';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Введите корректный email адрес';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Телефон обязателен для заполнения';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Введите корректный номер телефона';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Сообщение обязательно для заполнения';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Сообщение должно содержать минимум 10 символов';
    }

    if (!formData.consent) {
      newErrors.consent = 'Необходимо согласие на обработку персональных данных';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    try {
      console.log('[Contact Form] Отправка данных формы:', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        messageLength: formData.message.length,
        consent: formData.consent,
      });

      const csrfToken = await getCsrfToken();
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(formData),
      });

      console.log('[Contact Form] Ответ от сервера:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();
      console.log('[Contact Form] Данные ответа:', data);

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage('Сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: '',
          consent: false,
        });
        setErrors({});
      } else {
        setSubmitStatus('error');
        const errorMsg = data.error || data.details || 'Произошла ошибка при отправке сообщения. Пожалуйста, попробуйте еще раз.';
        setSubmitMessage(errorMsg);
        console.error('[Contact Form] Ошибка отправки:', {
          status: response.status,
          error: data.error,
          details: data.details,
        });
      }
    } catch (error: any) {
      console.error('[Contact Form] Исключение при отправке:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      setSubmitStatus('error');
      setSubmitMessage(`Произошла ошибка при отправке сообщения: ${error?.message || 'Неизвестная ошибка'}. Пожалуйста, попробуйте еще раз.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  return (
    <Card className="card-hover gradient-card-pink shine-effect">
      <CardContent className="card-content">
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitStatus === 'success' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
              {submitMessage}
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
              {submitMessage}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-semibold mb-2 gradient-text-pink">
              Имя *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`neumorphic-input w-full ${
                errors.name ? 'ring-2 ring-red-400' : ''
              }`}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2 gradient-text-blue">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`neumorphic-input w-full ${
                errors.email ? 'ring-2 ring-red-400' : ''
              }`}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold mb-2 gradient-text-purple">
              Телефон *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`neumorphic-input w-full ${
                errors.phone ? 'ring-2 ring-red-400' : ''
              }`}
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-semibold mb-2 gradient-text-rose">
              Сообщение *
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              className={`neumorphic-textarea w-full ${
                errors.message ? 'ring-2 ring-red-400' : ''
              }`}
              disabled={isSubmitting}
            />
            {errors.message && (
              <p className="mt-1 text-sm text-red-600">{errors.message}</p>
            )}
          </div>

          <div>
            <label className="flex items-start">
              <input
                type="checkbox"
                name="consent"
                checked={formData.consent}
                onChange={handleChange}
                className="neumorphic-checkbox mt-1 mr-3"
                disabled={isSubmitting}
              />
              <span className={`text-sm ${errors.consent ? 'text-red-600' : 'opacity-80'}`}>
                Согласие на обработку персональных данных *
              </span>
            </label>
            {errors.consent && (
              <p className="mt-1 text-sm text-red-600 ml-7">{errors.consent}</p>
            )}
          </div>

          <button
            type="submit"
            className="neumorphic-button w-full py-3 text-lg font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить сообщение'}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

