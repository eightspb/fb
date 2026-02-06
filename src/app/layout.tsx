import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import VisitorTracker from "@/components/VisitorTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://fb.net"),
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
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://fb.net"}/images/logo.png`,
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
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://fb.net',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fb.net'}/logo.png`,
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}
