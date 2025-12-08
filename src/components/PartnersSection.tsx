'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const PARTNERS = [
  { name: 'МНИОИ им. П.А. Герцена', logo: '/images/partners/mnioi.jpg', url: 'http://mnioi.ru' },
  { name: 'МЕДСИ', logo: '/images/partners/med-rf.jpg', url: 'http://med-rf.ru' },
  { name: 'МКНЦ имени А.С. Логинова', logo: '/images/partners/mknc.png', url: 'https://www.mknc.ru/' },
  { name: 'ФНКЦ ФМБА России', logo: '/images/partners/fnkc.png', url: 'https://fnkc-fmba.ru' },
  { name: 'Европейский Медицинский Центр', logo: '/images/partners/emc.png', url: 'https://www.emcmos.ru' },
  { name: 'ЦКБ РАН', logo: '/images/partners/ckbran.png', url: 'http://www.ckbran.ru' },
  { name: 'СПб больница РАН', logo: '/images/partners/spbkbran.png', url: 'https://spbkbran.ru/' },
  { name: 'Клиника Одинцова', logo: '/images/partners/odintsov.png', url: 'http://odintsovclinic.ru/' },
  { name: 'ККОД', logo: '/images/partners/kkod.jpg', url: '#' },
  { name: 'Евромед', logo: '/images/partners/euromed.png', url: 'http://www.euromed-omsk.ru/' },
  { name: 'Примамед', logo: '/images/partners/primamed.jpg', url: 'https://primamed-dv.ru/' },
  { name: 'Сонера', logo: '/images/partners/sonera.png', url: 'http://sonera-uzi.ru/' },
  { name: 'Клиника Фомина', logo: '/images/partners/fomin.png', url: 'http://dr-fomin.ru/' },
  { name: 'Grand Medica', logo: '/images/partners/gm.png', url: 'http://gm.clinic/' },
  { name: 'АО Медицина', logo: '/images/partners/medicina.png', url: 'https://www.medicina.ru/' },
  { name: 'Медицинский центр (Астана)', logo: '/images/partners/onko-astana.png', url: 'http://www.onko-astana.kz/index.php/ru/' },
  { name: 'Клиника Юнона', logo: '/images/partners/junona.png', url: 'http://junona-med.ru/' },
  { name: 'Самарский онкодиспансер', logo: '/images/partners/samara-onko.png', url: 'https://samaraonko.ru/' },
  { name: 'ЦНМТ', logo: '/images/partners/cnmt.png', url: 'https://cnmt.ru/' },
  { name: 'Моситалмед', logo: '/images/partners/mositalmed.png', url: 'https://mositalmed.ru/' },
  { name: 'Целитель', logo: '/images/partners/celitel.svg', url: 'https://celitel05.ru/' },
  { name: 'Здоровье (Дербент)', logo: '/images/partners/zdorovie-derbent.png', url: 'https://zdorovie-derbent.ru/' },
  { name: 'Альфа-Центр Здоровья', logo: '/images/partners/alfa-zdrav.webp', url: 'https://alfazdrav.ru/' },
  { name: 'Сургутская КБ', logo: '/images/partners/surgut-okb.png', url: 'https://surgut-okb.ru/' },
  { name: 'Медицинский комплекс ДВФУ', logo: '/images/partners/dvfu.png', url: 'https://med.dvfu.ru/' },
  { name: 'ФламингоМед', logo: '/images/partners/flamingomed.png', url: 'https://flamingomed.ru/' },
  { name: 'НМИЦ онкологии им. Петрова', logo: '/images/partners/petrova.png', url: 'https://niioncologii.ru/' },
];

export function PartnersSection() {
  return (
    <section className="w-full py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
            Наши партнеры
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Практически все ведущие медицинские центры, использующие метод вакуумной биопсии, являются нашими долгосрочными партнерами.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 items-center justify-items-center">
          {PARTNERS.map((partner, index) => (
            <motion.a
              key={index}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative w-full h-24 flex items-center justify-center p-4 bg-slate-200 rounded-xl border border-slate-300 hover:border-pink-300 hover:shadow-lg transition-all duration-300 grayscale hover:grayscale-0 hover:z-10"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              viewport={{ once: true }}
            >
              <div className="relative w-full h-full">
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  fill
                  className="object-contain p-2"
                />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl z-20">
                {partner.name}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

