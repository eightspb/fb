import type { Metadata } from "next";
import "./globals.css";
import VisitorTracker from "@/components/VisitorTracker";
import AnnouncementBanner from "@/components/AnnouncementBanner";

// Безопасная загрузка шрифтов с обработкой ошибок
let geistSans: any = {
  variable: "--font-geist-sans",
  className: ""
};
let geistMono: any = {
  variable: "--font-geist-mono", 
  className: ""
};

try {
  // Динамический импорт с обработкой ошибок
  const { Geist, Geist_Mono } = require("next/font/google");
  
  geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    display: "swap",
    fallback: ["system-ui", "arial"],
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  });

  geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: "swap",
    fallback: ["monospace"],
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  });
} catch (error) {
  console.warn("Failed to load Google Fonts, using system fonts:", error);
  // Используем системные шрифты как fallback
}

export const metadata: Metadata = {
  title: {
    default: "Компания Зенит - Официальный дистрибьютор ВАБ завода Сишань в РФ",
    template: "%s | Компания Зенит",
  },
  description: "Официальный дистрибьютор оборудования для вакуумной аспирационной биопсии (ВАБ) молочной железы. Клиническая ценность и передовые технологии для медицинских специалистов.",
  keywords: ["ВАБ", "вакуумная аспирационная биопсия", "медицинское оборудование", "маммология", "биопсия молочной железы", "DK-B-MS", "Сишань"],
  authors: [{ name: "Компания Зенит" }],
  creator: "Компания Зенит",
  publisher: "Компания Зенит",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://fibroadenoma.net"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "Компания Зенит",
    title: "Компания Зенит - Официальный дистрибьютор ВАБ завода Сишань в РФ",
    description: "Официальный дистрибьютор оборудования для вакуумной аспирационной биопсии (ВАБ) молочной железы. Клиническая ценность и передовые технологии для медицинских специалистов.",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://fibroadenoma.net"}/images/logo.png`,
        width: 1200,
        height: 630,
        alt: "Компания Зенит - Официальный дистрибьютор ВАБ завода Сишань",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Компания Зенит - Официальный дистрибьютор ВАБ завода Сишань в РФ",
    description: "Официальный дистрибьютор оборудования для вакуумной аспирационной биопсии (ВАБ) молочной железы.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Компания Зенит',
    description: 'Официальный дистрибьютор ВАБ завода Сишань в РФ',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://fibroadenoma.net',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fibroadenoma.net'}/logo.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+7-812-748-22-13',
      contactType: 'Customer Service',
      email: 'info@zenitmed.ru',
      areaServed: 'RU',
      availableLanguage: 'Russian',
    },
    sameAs: [
      // Add social media links when available
    ],
  };

  return (
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Yandex.Metrika counter */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.webvisor.org/metrika/tag_ww.js?id=107144344','ym');ym(107144344,'init',{ssr:true,webvisor:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`,
          }}
        />
        {/* /Yandex.Metrika counter */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/107144344" style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>
        <VisitorTracker />
        <AnnouncementBanner />
        {children}
      </body>
    </html>
  );
}
