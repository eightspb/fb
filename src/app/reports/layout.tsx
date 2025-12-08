import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Отчёты",
  description: "Система учёта УЗИ молочных желез. Создание и редактирование протоколов исследования, управление образованиями.",
  openGraph: {
    title: "Отчёты - Система учёта УЗИ | FB.NET",
    description: "Система учёта УЗИ молочных желез. Создание и редактирование протоколов исследования.",
    url: "/reports",
  },
  twitter: {
    title: "Отчёты - Система учёта УЗИ | FB.NET",
    description: "Система учёта УЗИ молочных желез. Создание и редактирование протоколов исследования.",
  },
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


