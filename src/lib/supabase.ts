import { createClient } from '@supabase/supabase-js';

// Supabase конфигурация
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials are missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file');
}

// Создаем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы для базы данных (будут соответствовать таблицам в Supabase)
export interface Database {
  public: {
    Tables: {
      news: {
        Row: {
          id: string;
          title: string;
          short_description: string;
          full_description: string;
          date: string;
          year: string;
          category: string | null;
          location: string | null;
          author: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          short_description: string;
          full_description: string;
          date: string;
          year: string;
          category?: string | null;
          location?: string | null;
          author?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          short_description?: string;
          full_description?: string;
          date?: string;
          year?: string;
          category?: string | null;
          location?: string | null;
          author?: string | null;
          updated_at?: string;
        };
      };
      news_images: {
        Row: {
          id: string;
          news_id: string;
          image_url: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          news_id: string;
          image_url: string;
          order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          news_id?: string;
          image_url?: string;
          order?: number;
        };
      };
      news_tags: {
        Row: {
          id: string;
          news_id: string;
          tag: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          news_id: string;
          tag: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          news_id?: string;
          tag?: string;
        };
      };
      news_videos: {
        Row: {
          id: string;
          news_id: string;
          video_url: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          news_id: string;
          video_url: string;
          order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          news_id?: string;
          video_url?: string;
          order?: number;
        };
      };
      news_documents: {
        Row: {
          id: string;
          news_id: string;
          document_url: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          news_id: string;
          document_url: string;
          order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          news_id?: string;
          document_url?: string;
          order?: number;
        };
      };
    };
  };
}

