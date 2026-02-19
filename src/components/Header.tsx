'use client';

import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "ГЛАВНАЯ" },
    { href: "/equipment", label: "ОБОРУДОВАНИЕ" },
    { href: "/training", label: "ОБУЧЕНИЕ" },
    { href: "/news", label: "НОВОСТИ" },
    { href: "/conferences", label: "КОНФЕРЕНЦИИ" },
    { href: "/patients", label: "ПАЦИЕНТАМ" },
  ];

  return (
    <header 
      className={cn(
        "fixed left-0 right-0 z-[100] transition-all duration-300",
        scrolled ? "py-4" : "py-6"
      )}
      style={{
        top: 'var(--banner-height, 0px)'
      }}
    >
      <nav className="container mx-auto px-4 md:px-6">
        <div className={cn(
          "relative rounded-full border transition-all duration-300 px-4 md:px-6 py-3 flex items-center justify-between",
          scrolled 
            ? "bg-white/80 backdrop-blur-lg border-slate-200 shadow-lg shadow-slate-200/20" 
            : "bg-white/50 backdrop-blur-sm border-transparent"
        )}>
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group relative z-10">
            <div className="relative w-[180px] h-[70px] -my-5 transition-transform group-hover:scale-155">
              <Image 
                src="/images/logo.png" 
                alt="Zenit Logo" 
                fill 
                sizes="(max-width: 768px) 150px, 180px"
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200",
                  pathname === link.href
                    ? "text-slate-900 bg-slate-100"
                    : "text-slate-600 hover:text-teal-600 hover:bg-white/50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/contacts">
              <Button size="sm" className="rounded-full bg-gradient-to-br from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-5 shadow-lg shadow-purple-500/20 border-0 transition-all duration-300 hover:shadow-purple-500/40 hover:-translate-y-0.5">
                КОНТАКТЫ
              </Button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden p-2 rounded-full hover:bg-slate-100 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 p-4 mt-2 lg:hidden animate-in slide-in-from-top-5 fade-in duration-200 z-50">
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xl shadow-slate-200/20">
              <div className="flex flex-col space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "px-4 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between group",
                      pathname === link.href && "bg-teal-50 text-teal-700"
                    )}
                  >
                    {link.label}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                  </Link>
                ))}
                <div className="pt-4 mt-2 border-t border-slate-100">
                  <Link href="/contacts" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white h-12 shadow-lg shadow-purple-500/20 border-0">
                      КОНТАКТЫ
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
