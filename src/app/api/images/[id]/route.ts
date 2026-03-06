import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import sharp from 'sharp';

// Явно указываем Node.js runtime для работы с PostgreSQL
export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

// In-memory cache: imageId -> ArrayBuffer
const webpCache = new Map<string, ArrayBuffer>();

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return new NextResponse('Image ID required', { status: 400 });
  }

  const acceptsWebP = request.headers.get('accept')?.includes('image/webp');

  // Serve from cache if available
  if (acceptsWebP && webpCache.has(id)) {
    return new NextResponse(webpCache.get(id)!, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept',
      },
    });
  }

  const client = await pool.connect();
  try {
    const query = 'SELECT image_data, mime_type FROM news_images WHERE id = $1';
    const result = await client.query(query, [id]);

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const { image_data, mime_type } = result.rows[0];

    if (acceptsWebP) {
      const webpBuffer = await sharp(image_data)
        .rotate()
        .resize(1400, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const arrayBuffer = toArrayBuffer(webpBuffer);
      webpCache.set(id, arrayBuffer);

      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Vary': 'Accept',
        },
      });
    }

    // Fallback: return original image for clients that don't support WebP
    return new NextResponse(toArrayBuffer(image_data), {
      headers: {
        'Content-Type': mime_type || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept',
      },
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    client.release();
  }
}
