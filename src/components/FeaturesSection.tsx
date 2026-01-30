'use client';

import React from 'react';
import { Activity, Shield, Zap, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { GridPattern } from './GridPattern';

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  delay?: number;
}

// Predefined patterns to ensure consistency between server and client
const FEATURE_PATTERNS = [
  [[7, 1], [8, 2], [9, 3], [10, 1], [8, 4]],
  [[7, 2], [8, 3], [9, 4], [10, 2], [8, 5]],
  [[7, 3], [8, 4], [9, 5], [10, 3], [8, 6]],
  [[7, 4], [8, 5], [9, 6], [10, 4], [8, 3]]
] as [number, number][][];

function getPatternByIndex(index: number): [x: number, y: number][] {
  return FEATURE_PATTERNS[index % FEATURE_PATTERNS.length];
}

function FeatureCardComponent({
  icon: Icon,
  title,
  description,
  delay = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="group bg-white/80 backdrop-blur-sm relative isolate z-0 flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-teal-200/50 px-6 py-8 transition-all duration-300 hover:shadow-xl hover:border-teal-300"
    >
      <div className="absolute inset-0">
        <div className="absolute -inset-[25%] -skew-y-12 [mask-image:linear-gradient(225deg,black,transparent)]">
          <GridPattern
            width={30}
            height={30}
            x={0}
            y={0}
            squares={getPatternByIndex(delay * 10)}
            className="fill-teal-200/30 stroke-teal-200/50 absolute inset-0 size-full translate-y-2 transition-transform duration-150 ease-out group-hover:translate-y-0"
          />
        </div>
        <div className="absolute -inset-[10%] opacity-0 blur-[50px] transition-opacity duration-150 group-hover:opacity-20 bg-gradient-to-br from-teal-400 via-blue-300 to-teal-300" />
      </div>
      <div className="relative z-10">
        <div className="mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br from-teal-100 to-blue-100">
          <Icon className="w-6 h-6 text-teal-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  const features = [
    {
      icon: Activity,
      title: "Без операции",
      description: "Нет необходимости в операционной и общем наркозе",
    },
    {
      icon: Shield,
      title: "Стационарозамещающая",
      description: "Через час после процедуры пациентка идет домой",
    },
    {
      icon: Zap,
      title: "Высокая точность",
      description: "УЗИ-контроль обеспечивает точное попадание в образование",
    },
    {
      icon: CheckCircle,
      title: "Быстро",
      description: "Один специалист проводит 2-3 процедуры в час",
    },
  ];

  return (
    <div className="w-full py-24 bg-gradient-to-b from-white to-teal-50/30">
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-blue-600">
              Преимущества ВАБ
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Современная технология вакуумной аспирационной биопсии для комфортной и эффективной диагностики.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCardComponent
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
