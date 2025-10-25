'use client';

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-6xl">
      <div className="bg-white/70 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg border border-pink-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-blue-400 flex items-center justify-center">
              <span className="text-white text-lg">🔬</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-blue-600">
              FB.NET
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <Link href="/" className="px-4 py-2 text-gray-700 hover:text-pink-600 font-medium rounded-full hover:bg-white/50 transition-colors">
              Главная
            </Link>
            <Link href="/patients" className="px-4 py-2 text-gray-700 hover:text-pink-600 font-medium rounded-full hover:bg-white/50 transition-colors">
              Пациентам
            </Link>
            <Link href="/equipment" className="px-4 py-2 text-gray-700 hover:text-pink-600 font-medium rounded-full hover:bg-white/50 transition-colors">
              Оборудование
            </Link>
            <Link href="/training" className="px-4 py-2 text-gray-700 hover:text-pink-600 font-medium rounded-full hover:bg-white/50 transition-colors">
              Обучение
            </Link>
            <Link href="/news" className="px-4 py-2 text-gray-700 hover:text-pink-600 font-medium rounded-full hover:bg-white/50 transition-colors">
              Новости
            </Link>
            <Link href="/conferences" className="px-4 py-2 text-gray-700 hover:text-pink-600 font-medium rounded-full hover:bg-white/50 transition-colors">
              Конференции
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-2">
            <Link href="/contacts" className="px-4 py-2 text-gray-700 hover:text-pink-600 font-medium rounded-full hover:bg-white/50 transition-colors">
              Контакты
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-full bg-white/50"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 bg-white/90 rounded-2xl p-4 shadow-lg border border-pink-200/50">
            <div className="flex flex-col space-y-3">
              <Link href="/" className="px-4 py-3 text-gray-700 hover:text-pink-600 font-medium rounded-lg hover:bg-white transition-colors">
                Главная
              </Link>
              <Link href="/patients" className="px-4 py-3 text-gray-700 hover:text-pink-600 font-medium rounded-lg hover:bg-white transition-colors">
                Пациентам
              </Link>
              <Link href="/equipment" className="px-4 py-3 text-gray-700 hover:text-pink-600 font-medium rounded-lg hover:bg-white transition-colors">
                Оборудование
              </Link>
              <Link href="/training" className="px-4 py-3 text-gray-700 hover:text-pink-600 font-medium rounded-lg hover:bg-white transition-colors">
                Обучение
              </Link>
              <Link href="/news" className="px-4 py-3 text-gray-700 hover:text-pink-600 font-medium rounded-lg hover:bg-white transition-colors">
                Новости
              </Link>
              <Link href="/conferences" className="px-4 py-3 text-gray-700 hover:text-pink-600 font-medium rounded-lg hover:bg-white transition-colors">
                Конференции
              </Link>
              <Link href="/contacts" className="px-4 py-3 text-gray-700 hover:text-pink-600 font-medium rounded-lg hover:bg-white transition-colors">
                Контакты
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
