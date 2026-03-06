'use client';

import { useState, FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { getCsrfToken } from '@/lib/csrf-client';
import { SimpleCaptcha } from '@/components/SimpleCaptcha';

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
    city: '',
    institution: '',
    speciality: '',
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);

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

    if (!formData.city.trim()) {
      newErrors.city = 'Город обязателен для заполнения';
    }

    if (!formData.institution.trim()) {
      newErrors.institution = 'Медицинское учреждение обязательно для заполнения';
    }

    if (!formData.speciality.trim()) {
      newErrors.speciality = 'Специальность обязательна для заполнения';
    }

    if (!formData.consent) {
      newErrors.consent = 'Необходимо согласие на обработку персональных данных';
    }

    if (!captchaVerified) {
      newErrors.captcha = 'Пожалуйста, пройдите проверку CAPTCHA';
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
      const csrfToken = await getCsrfToken();
      const response = await fetch('/api/conferences/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
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
          city: '',
          institution: '',
          speciality: '',
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
      <div className="max-w-md mx-auto py-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Регистрация успешна!</h3>
          <p className="text-slate-600 mb-6">{submitMessage}</p>
          <Button
            onClick={() => setSubmitStatus('idle')}
            variant="outline"
            className="border-2 border-teal-200 text-teal-700 hover:bg-teal-50 rounded-xl px-6"
          >
            Зарегистрировать ещё одного участника
          </Button>
        </div>
      </div>
    );
  }

  const inputClasses = (field: string) =>
    `w-full px-4 py-3 bg-slate-50 border-2 rounded-xl focus:ring-0 focus:border-teal-500 focus:bg-white outline-none transition-all duration-200 placeholder:text-slate-400 ${
      errors[field] ? 'border-red-300 bg-red-50/50' : 'border-slate-200 hover:border-slate-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitStatus === 'error' && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 text-red-700 text-sm">
          {submitMessage}
        </div>
      )}

      {/* Full name — full width */}
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
          ФИО <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className={inputClasses('name')}
          placeholder="Иванов Иван Иванович"
        />
        {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
      </div>

      {/* Email + Phone — 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={inputClasses('email')}
            placeholder="doctor@clinic.ru"
          />
          {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Телефон <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className={inputClasses('phone')}
            placeholder="+7 (999) 000-00-00"
          />
          {errors.phone && <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>}
        </div>
      </div>

      {/* City + Speciality — 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Город <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
            className={inputClasses('city')}
            placeholder="Москва"
          />
          {errors.city && <p className="mt-1.5 text-xs text-red-600">{errors.city}</p>}
        </div>

        <div>
          <label htmlFor="speciality" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Специальность <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="speciality"
            name="speciality"
            value={formData.speciality}
            onChange={handleChange}
            required
            className={inputClasses('speciality')}
            placeholder="Хирург, онколог..."
          />
          {errors.speciality && <p className="mt-1.5 text-xs text-red-600">{errors.speciality}</p>}
        </div>
      </div>

      {/* Institution — full width */}
      <div>
        <label htmlFor="institution" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Медицинское учреждение <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="institution"
          name="institution"
          value={formData.institution}
          onChange={handleChange}
          required
          className={inputClasses('institution')}
          placeholder="Название клиники"
        />
        {errors.institution && <p className="mt-1.5 text-xs text-red-600">{errors.institution}</p>}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Consent */}
      <label htmlFor="consent" className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          id="consent"
          name="consent"
          checked={formData.consent}
          onChange={handleChange}
          required
          className={`mt-0.5 w-5 h-5 text-teal-600 border-2 border-slate-300 rounded focus:ring-teal-500 transition-colors group-hover:border-teal-400 ${
            errors.consent ? 'border-red-300' : ''
          }`}
        />
        <span className="text-sm text-slate-600 leading-snug">
          Согласен на обработку персональных данных и получение информационных сообщений <span className="text-red-400">*</span>
        </span>
      </label>
      {errors.consent && <p className="text-xs text-red-600 -mt-3">{errors.consent}</p>}

      <SimpleCaptcha
        onVerify={() => setCaptchaVerified(true)}
        onError={(error) => setSubmitMessage(error)}
      />
      {errors.captcha && <p className="text-xs text-red-600">{errors.captcha}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-xl py-6 text-lg font-bold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isSubmitting ? 'Отправка...' : 'Зарегистрироваться'}
      </Button>
    </form>
  );
}

