import { notFound, permanentRedirect } from 'next/navigation';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

async function getConferenceBySlug(slug: string): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT 1 FROM conferences WHERE slug = $1 LIMIT 1',
        [slug]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
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
