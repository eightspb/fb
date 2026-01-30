import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Linkedin, Mail, Phone, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-50 pt-16 pb-8 border-t border-slate-200">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="inline-block mb-4">
              <div className="relative w-[320px] h-[120px] -ml-4">
                <Image 
                  src="/images/logo.png" 
                  alt="Zenit Logo" 
                  fill 
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <p className="text-slate-600 text-sm leading-relaxed">
              Официальный дистрибьютор оборудования для вакуумной аспирационной биопсии (ВАБ) завода Сишань в РФ.
            </p>
            <p className="text-slate-500 text-xs">
              ООО «ЗЕНИТ»
            </p>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-6">Контакты</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-teal-500 mt-0.5" />
                <a href="tel:+78127482213" className="text-slate-600 hover:text-teal-600 transition-colors text-sm">
                  +7 (812) 748-22-13
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-teal-500 mt-0.5" />
                <a href="mailto:info@zenitmed.ru" className="text-slate-600 hover:text-teal-600 transition-colors text-sm">
                  info@zenitmed.ru
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-teal-500 mt-0.5" />
                <a href="https://fibroadenoma.net" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-teal-600 transition-colors text-sm">
                  fibroadenoma.net
                </a>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-6">Навигация</h4>
            <ul className="space-y-3">
              {[
                { href: "/equipment", label: "Оборудование" },
                { href: "/training", label: "Обучение" },
                { href: "/news", label: "Новости" },
                { href: "/conferences", label: "Конференции" },
                { href: "/patients", label: "Пациентам" },
                { href: "/contacts", label: "Контакты" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-slate-600 hover:text-teal-600 transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-6">Мы в соцсетях</h4>
            <div className="flex gap-4">
              {[
                { icon: Facebook, href: "#" },
                { icon: Twitter, href: "#" },
                { icon: Linkedin, href: "#" },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-500 hover:border-teal-200 hover:shadow-md transition-all duration-300"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs text-center md:text-left">
            © {new Date().getFullYear()} ООО «ЗЕНИТ». Все права защищены.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-slate-500 hover:text-slate-900 text-xs transition-colors">
              Политика конфиденциальности
            </Link>
            <Link href="/terms" className="text-slate-500 hover:text-slate-900 text-xs transition-colors">
              Условия использования
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
