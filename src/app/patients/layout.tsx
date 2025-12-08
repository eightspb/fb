import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Пациентам",
  description: "Информация о вакуумной аспирационной биопсии (ВАБ) молочной железы для пациентов. Как проходит процедура, преимущества, показания и противопоказания, часто задаваемые вопросы.",
  openGraph: {
    title: "Пациентам - Информация о ВАБ | FB.NET",
    description: "Информация о вакуумной аспирационной биопсии (ВАБ) молочной железы для пациентов. Как проходит процедура, преимущества, показания и противопоказания.",
    url: "/patients",
  },
  twitter: {
    title: "Пациентам - Информация о ВАБ | FB.NET",
    description: "Информация о вакуумной аспирационной биопсии (ВАБ) молочной железы для пациентов.",
  },
};

export default function PatientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

