'use client';

import { useState, FormEvent } from 'react';
import { Button } from "@/components/ui/button";

interface ConferenceRegistrationFormProps {
  conferenceName?: string;
  conferenceId?: string;
  conferenceTitle?: string;
}

export function ConferenceRegistrationForm({ conferenceName, conferenceId, conferenceTitle }: ConferenceRegistrationFormProps) {
  const eventName = conferenceName || conferenceTitle || 'Мероприятие';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    institution: '',
    certificate: false,
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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
      const response = await fetch('/api/conferences/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          conference: eventName,
          conferenceId: conferenceId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage(data.message || 'Регистрация успешно отправлена!');
        setFormData({
          name: '',
          email: '',
          phone: '',
          institution: '',
          certificate: false,
          consent: false,
        });
      } else {
        setSubmitStatus('error');
        setSubmitMessage(data.error || 'Произошла ошибка при отправке формы');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
      setSubmitMessage('Произошла ошибка при отправке формы. Пожалуйста, попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h3 className="text-xl font-semibold text-green-900 mb-2">Регистрация успешна!</h3>
          <p className="text-green-700 mb-4">{submitMessage}</p>
          <Button
            onClick={() => setSubmitStatus('idle')}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            Зарегистрировать еще одного участника
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {submitMessage}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
          ФИО *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${
            errors.name ? 'border-red-300' : 'border-slate-300'
          }`}
          placeholder="Иванов Иван Иванович"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${
            errors.email ? 'border-red-300' : 'border-slate-300'
          }`}
          placeholder="doctor@clinic.ru"
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
          Телефон *
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${
            errors.phone ? 'border-red-300' : 'border-slate-300'
          }`}
          placeholder="+7 (999) 000-00-00"
        />
        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="institution" className="block text-sm font-medium text-slate-700 mb-2">
          Медицинское учреждение
        </label>
        <input
          type="text"
          id="institution"
          name="institution"
          value={formData.institution}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
          placeholder="Название клиники"
        />
      </div>

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="certificate"
          name="certificate"
          checked={formData.certificate}
          onChange={handleChange}
          className="mt-1 w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
        />
        <label htmlFor="certificate" className="text-sm text-slate-600">
          Хочу получить удостоверение 16 часов (оплата 5.000 руб.)
        </label>
      </div>

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="consent"
          name="consent"
          checked={formData.consent}
          onChange={handleChange}
          required
          className={`mt-1 w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 ${
            errors.consent ? 'border-red-300' : ''
          }`}
        />
        <label htmlFor="consent" className="text-sm text-slate-600">
          Согласен на обработку персональных данных и получение информационных сообщений *
        </label>
      </div>
      {errors.consent && <p className="text-sm text-red-600 -mt-2">{errors.consent}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-slate-900 hover:bg-slate-800 rounded-full py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Отправка...' : 'Зарегистрироваться'}
      </Button>
    </form>
  );
}

