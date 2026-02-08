import { notFound, permanentRedirect } from 'next/navigation';

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

async function getConferenceBySlug(slug: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT 1 FROM conferences WHERE slug = $1 LIMIT 1',
          [slug]
        );
        
        return result.rows.length > 0;
      } finally {
        client.release();
        await pool.end();
      }
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/conferences/${slug}`, {
        cache: 'no-store'
      });
      
      return response.ok;
    }
  } catch (error) {
    console.error('Error checking conference:', error);
  }
  return false;
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params;
  const conference = await getConferenceBySlug(slug);

  // Если найдена конференция - делаем постоянный редирект (301) на правильный URL
  if (conference) {
    permanentRedirect(`/conferences/${slug}`);
  }

  // Если конференция не найдена - показываем 404
  notFound();
}

export async function generateMetadata(): Promise<import('next').Metadata> {
  // Метаданные не нужны, так как происходит редирект
  return {
    title: 'Перенаправление...',
  };
}
