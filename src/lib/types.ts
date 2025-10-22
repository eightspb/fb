// Database Entities for CMS

export interface Equipment {
  id: string;
  name: string;
  description: string;
  specifications: {
    indications: string[];
    modes: string[];
    consumables: string;
    requirements: string;
    training: string;
    service: string;
  };
  advantages: string[];
  comparisons: {
    feature: string;
    vab: string;
    analog1: string;
    analog2: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
  certificates: {
    name: string;
    number: string;
    date: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Consumable {
  id: string;
  name: string;
  purpose: string;
  compatibility: string;
  packaging: string;
  stock: number;
  instructions: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  installations: number;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  program: {
    module: string;
    goals: string;
    duration: string;
    topics: string;
    practice: string;
    requirements: string;
  }[];
  schedule: {
    date: string;
    city: string;
    speakers: string;
    cmeHours: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  title: string;
  type: 'conference' | 'masterclass' | 'webinar' | 'exhibition';
  date: string;
  location: string;
  speakers: string[];
  program: {
    time: string;
    activity: string;
  }[];
  cmeHours: number;
  quota: number;
  description: string;
  status: 'announced' | 'completed';
  media?: {
    photos: string[];
    videos: string[];
    materials: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Lecture {
  id: string;
  title: string;
  speaker: string;
  institution: string;
  specialization: string;
  topics: string[];
  videoUrl: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Speaker {
  id: string;
  name: string;
  institution: string;
  specialization: string;
  topics: string[];
  lectures: string[];
  events: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Center {
  id: string;
  name: string;
  type: string;
  location: string;
  directions: string[];
  procedures: number;
  contact: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Partner {
  id: string;
  name: string;
  role: string;
  logo: string;
  cases: string[];
  events: string[];
  documents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  type: 'patient' | 'doctor';
  author: string;
  content: string;
  rating: number;
  caseId?: string;
  videoId?: string;
  moderated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Certificate {
  id: string;
  name: string;
  number: string;
  date: string;
  type: string;
  fileUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface News {
  id: string;
  title: string;
  content: string;
  tags: string[];
  date: string;
  media?: {
    photos: string[];
    videos: string[];
    documents: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
