import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return new NextResponse('Image ID required', { status: 400 });
  }

  const client = await pool.connect();
  try {
    const query = 'SELECT image_data, mime_type FROM news_images WHERE id = $1';
    const result = await client.query(query, [id]);

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const { image_data, mime_type } = result.rows[0];

    // Return the image data with correct headers
    // image_data is a Buffer from pg
    return new NextResponse(image_data, {
      headers: {
        'Content-Type': mime_type || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    client.release();
  }
}

