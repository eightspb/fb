'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ReportsPage() {
  const [rightBreastType, setRightBreastType] = useState('US III');
  const [leftBreastType, setLeftBreastType] = useState('US III');
  const [formData, setFormData] = useState({
    category: 'Доброкачественные',
    side: 'Левая молочная железа',
    sector: '7B',
    type: 'Простая киста',
    size1: '',
    size2: '',
    size3: '',
    depth: '',
    fromAreola: '',
    description: 'Обычно однородное безэховое образование с четкими контурами, округлой формы. Характерно для простой кисты. BIRADS 2.',
  });

  const formations = [
    {
      id: 1,
      type: 'Простая киста',
      side: 'Левая молочная железа',
      sector: '98',
      category: 'Доброкачественные',
      size: '2.0 x 2.0 x 2.0 мм',
      depth: '2.0 мм',
      fromAreola: '-',
      description: 'Обычно однородное безэховое образование с четкими контурами, округлой формы. Характерно для простой кисты. BIRADS 2.',
    },
  ];

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-[#e0e0e0]">
      {/* Header Navigation */}
      <header className="bg-blue-600 py-4 px-6 mb-6 shadow-lg sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">УЗИ Молочных Желез</h1>
          <nav className="flex gap-6 text-white text-sm">
            <Link href="/" className="hover:underline">Панель управления</Link>
            <Link href="/patients" className="hover:underline">Пациенты</Link>
            <Link href="/news" className="hover:underline">Архив</Link>
            <Link href="/" className="hover:underline">Статистика</Link>
            <Link href="/" className="hover:underline">Настройки</Link>
            <Link href="/" className="hover:underline">Выход</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 pb-8">
        {/* Main Title */}
        <h2 className="text-center text-3xl font-bold text-gray-800 mb-8">МаммоАпп - Система учёта УЗИ</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Breast Maps */}
            <div className="neumorphic-card p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Карты молочных желез</h3>
              <div className="grid grid-cols-2 gap-6 mb-4">
                {/* Right Breast */}
                <div className="neumorphic-small p-4">
                  <h4 className="text-sm font-medium mb-3 text-gray-700">Правая молочная железа</h4>
                  <div className="relative w-full aspect-square">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {/* Concentric circles */}
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#999" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="100" cy="100" r="60" fill="none" stroke="#999" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="100" cy="100" r="40" fill="none" stroke="#999" strokeWidth="1" strokeDasharray="2,2" />
                      
                      {/* Sectors */}
                      {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i * 30 - 90) * (Math.PI / 180);
                        const x2 = 100 + 85 * Math.cos(angle);
                        const y2 = 100 + 85 * Math.sin(angle);
                        return (
                          <line
                            key={i}
                            x1="100"
                            y1="100"
                            x2={x2}
                            y2={y2}
                            stroke="#999"
                            strokeWidth="1"
                          />
                        );
                      })}
                      
                      {/* Sector numbers */}
                      {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i * 30 - 60) * (Math.PI / 180);
                        const x = 100 + 70 * Math.cos(angle);
                        const y = 100 + 70 * Math.sin(angle);
                        return (
                          <text
                            key={i}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="12"
                            fill="#666"
                          >
                            {i + 1}
                          </text>
                        );
                      })}
                      
                      {/* Marker */}
                      <polygon
                        points="95,65 100,55 105,65"
                        fill="#FFD700"
                        stroke="#333"
                        strokeWidth="1"
                      />
                      <text x="100" y="68" textAnchor="middle" fontSize="12" fontWeight="bold">2</text>
                    </svg>
                  </div>
                </div>

                {/* Left Breast */}
                <div className="neumorphic-small p-4">
                  <h4 className="text-sm font-medium mb-3 text-gray-700">Левая молочная железа</h4>
                  <div className="relative w-full aspect-square">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {/* Concentric circles */}
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#999" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="100" cy="100" r="60" fill="none" stroke="#999" strokeWidth="1" strokeDasharray="2,2" />
                      <circle cx="100" cy="100" r="40" fill="none" stroke="#999" strokeWidth="1" strokeDasharray="2,2" />
                      
                      {/* Sectors */}
                      {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i * 30 - 90) * (Math.PI / 180);
                        const x2 = 100 + 85 * Math.cos(angle);
                        const y2 = 100 + 85 * Math.sin(angle);
                        return (
                          <line
                            key={i}
                            x1="100"
                            y1="100"
                            x2={x2}
                            y2={y2}
                            stroke="#999"
                            strokeWidth="1"
                          />
                        );
                      })}
                      
                      {/* Sector numbers */}
                      {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i * 30 - 60) * (Math.PI / 180);
                        const x = 100 + 70 * Math.cos(angle);
                        const y = 100 + 70 * Math.sin(angle);
                        return (
                          <text
                            key={i}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="12"
                            fill="#666"
                          >
                            {i + 1}
                          </text>
                        );
                      })}
                      
                      {/* Markers */}
                      <circle cx="40" cy="100" r="8" fill="#FF0000" stroke="#333" strokeWidth="1" />
                      <polygon points="40,92 40,88 45,92" fill="#FF0000" />
                      
                      <circle cx="120" cy="75" r="8" fill="#00FF00" stroke="#333" strokeWidth="1" />
                      <text x="120" y="78" textAnchor="middle" fontSize="10" fontWeight="bold">4</text>
                      
                      <circle cx="135" cy="125" r="8" fill="#00FF00" stroke="#333" strokeWidth="1" />
                      <text x="135" y="128" textAnchor="middle" fontSize="10" fontWeight="bold">1</text>
                      
                      <circle cx="75" cy="115" r="8" fill="#00FF00" stroke="#333" strokeWidth="1" />
                      <text x="75" y="118" textAnchor="middle" fontSize="10" fontWeight="bold">?</text>
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center">Нажмите на карту, чтобы добавить образование</p>
            </div>

            {/* General Study Information */}
            <div className="neumorphic-card p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Общая информация об исследовании</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Врач, проводивший исследование</label>
                <input
                  type="text"
                  className="neumorphic-input w-full"
                  defaultValue="Admin User"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Правая молочная железа</label>
                  <div className="flex gap-4 mb-3">
                    {['US I', 'US II', 'US III'].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rightBreast"
                          value={type}
                          checked={rightBreastType === type}
                          onChange={(e) => setRightBreastType(e.target.value)}
                          className="neumorphic-radio"
                        />
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Толщина паренхимы (мм)</label>
                  <input
                    type="text"
                    className="neumorphic-input w-full"
                    defaultValue="2.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Левая молочная железа</label>
                  <div className="flex gap-4 mb-3">
                    {['US I', 'US II', 'US III'].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="leftBreast"
                          value={type}
                          checked={leftBreastType === type}
                          onChange={(e) => setLeftBreastType(e.target.value)}
                          className="neumorphic-radio"
                        />
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Толщина паренхимы (мм)</label>
                  <input
                    type="text"
                    className="neumorphic-input w-full"
                    defaultValue="2.0"
                  />
                </div>
              </div>
            </div>

            {/* Study Protocol */}
            <div className="neumorphic-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Протокол исследования</h3>
                <button className="neumorphic-button px-6 py-2 text-sm font-medium">Сгенерировать</button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Заключение</label>
                <textarea
                  className="neumorphic-textarea w-full h-32"
                  defaultValue="Женщина 34 лет. УЗИ молочных желез без технических ограничений. Структура ткани соответствует возрасту. Диффузных изменений не выявлено. Признаков значимой патологии не обнаружено."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">Рекомендации</label>
                <textarea
                  className="neumorphic-textarea w-full h-32"
                  defaultValue="• Для простой кисты (BIRADS 2): продолжать рутинное ежегодное обследование молочных желез.&#10;• Для кисты со взвесью (BIRADS 3): провести повторное УЗИ через 6 месяцев для"
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Study Information */}
            <div className="neumorphic-card p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Информация об исследовании</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Пациент</label>
                  <input
                    type="text"
                    className="neumorphic-input w-full"
                    defaultValue="Анфиса Аксенова"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Врач</label>
                  <input
                    type="text"
                    className="neumorphic-input w-full"
                    defaultValue="Admin User"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Дата исследования</label>
                  <input
                    type="text"
                    className="neumorphic-input w-full"
                    defaultValue="27.09.2025"
                  />
                </div>
              </div>
            </div>

            {/* Add Formation */}
            <div className="neumorphic-card p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Добавление образований</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Категория</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className="neumorphic-select w-full"
                  >
                    <option>Доброкачественные</option>
                    <option>Злокачественные</option>
                    <option>Неопределенные</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Сторона</label>
                  <select
                    name="side"
                    value={formData.side}
                    onChange={handleFormChange}
                    className="neumorphic-select w-full"
                  >
                    <option>Правая молочная железа</option>
                    <option>Левая молочная железа</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Сектор</label>
                  <input
                    type="text"
                    name="sector"
                    value={formData.sector}
                    onChange={handleFormChange}
                    className="neumorphic-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Тип образования</label>
                  <div className="space-y-2">
                    {['Простая киста', 'Многокамерная киста', 'Простая дуктоктазия', 'Дольчатый узел', 'Крупный дольчатый узел'].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          checked={formData.type === type}
                          onChange={(e) => handleRadioChange('type', e.target.value)}
                          className="neumorphic-radio"
                        />
                        <span className="text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Размер 1</label>
                    <input
                      type="text"
                      name="size1"
                      value={formData.size1}
                      onChange={handleFormChange}
                      className="neumorphic-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Размер 2</label>
                    <input
                      type="text"
                      name="size2"
                      value={formData.size2}
                      onChange={handleFormChange}
                      className="neumorphic-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Размер 3</label>
                    <input
                      type="text"
                      name="size3"
                      value={formData.size3}
                      onChange={handleFormChange}
                      className="neumorphic-input w-full"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Глубина</label>
                    <input
                      type="text"
                      name="depth"
                      value={formData.depth}
                      onChange={handleFormChange}
                      className="neumorphic-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">От ареолы</label>
                    <input
                      type="text"
                      name="fromAreola"
                      value={formData.fromAreola}
                      onChange={handleFormChange}
                      className="neumorphic-input w-full"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Описание</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    className="neumorphic-textarea w-full h-24"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button className="neumorphic-button px-6 py-2 text-sm font-medium flex-1">Отмена</button>
                  <button className="neumorphic-button px-6 py-2 text-sm font-medium flex-1">Добавить образование</button>
                </div>
              </div>
            </div>

            {/* Formations List */}
            <div className="neumorphic-card p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Список образований</h3>
              
              <div className="space-y-4">
                {formations.map((formation) => (
                  <div key={formation.id} className="neumorphic-inset p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                        {formation.id}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">{formation.type}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {formation.side} • Сектор {formation.sector}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          Категория: {formation.category}
                        </p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Размеры: {formation.size}</p>
                          <p>Глубина: {formation.depth}</p>
                          <p>От ареолы: {formation.fromAreola} мм</p>
                          <p className="mt-2">Описание: {formation.description}</p>
                        </div>
                      </div>
                      <button className="text-red-500 hover:text-red-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <button className="neumorphic-button px-8 py-3 text-base font-medium">Отмена</button>
          <button className="neumorphic-button px-8 py-3 text-base font-medium">Сохранить изменения</button>
        </div>
      </div>
    </div>
  );
}

