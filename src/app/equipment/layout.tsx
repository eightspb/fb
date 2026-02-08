import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Система ВАБ Xishan DK-B-MS | Купить оборудование для биопсии",
  description: "Профессиональная система вакуумной биопсии Xishan DK-B-MS. Апертура 5-30 мм, 700 об/мин. Полный комплект для ВАБ: консоль, рукоятка, иглы. Узнать цену и заказать.",
  keywords: "система вакуумной биопсии, ВАБ Xishan, DK-B-MS, вакуумная аспирационная биопсия оборудование, купить аппарат ВАБ, иглы для биопсии, оборудование для маммологии",
  openGraph: {
    title: "Система ВАБ Xishan DK-B-MS | Золотой стандарт биопсии",
    description: "Инновационное оборудование для безоперационного удаления фиброаденом. Высокая точность, безопасность, апертура до 30 мм.",
    images: ["/images/equipment-main.png"],
    url: "/equipment",
    type: "website",
  },
};

export default function EquipmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
