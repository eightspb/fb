import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

// Load environment variables if needed, though usually they are set in the shell
// For local execution via tsx, we might need dotenv, but let's assume env vars are present or default works
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const getMimeType = (filePath: string) => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
    case '.JPG':
    case '.JPEG':
      return 'image/jpeg';
    case '.png':
    case '.PNG':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.mov':
    case '.MOV':
    case '.mp4':
    case '.MP4':
       // Although this is news_images, sometimes videos get mixed up or we might want to support them? 
       // But the field is image_data. For now let's treat them as files but they might be too big for simple bytea row?
       // Postgres bytea can handle up to 1GB but performance might suffer. 
       // Given the user asked for images, I'll stick to images.
       // But I see .MOV and .mp4 in the file list I ls'd earlier.
       // Let's check if they are in news_images table.
       return 'video/mp4'; 
    default:
      return 'application/octet-stream';
  }
};

async function migrateImages() {
  console.log('Starting image migration to database...');
  const client = await pool.connect();
  
  try {
    // Select all images where we haven't imported data yet
    const res = await client.query('SELECT id, image_url FROM news_images WHERE image_data IS NULL');
    const images = res.rows;
    console.log(`Found ${images.length} images to process.`);

    let successCount = 0;
    let failCount = 0;

    for (const img of images) {
      // image_url is like /images/trainings/2025.11.06/image.jpg
      const relativePath = decodeURIComponent(img.image_url);
      const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
      const fullPath = path.join(process.cwd(), 'public', cleanPath);

      if (fs.existsSync(fullPath)) {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size > 50 * 1024 * 1024) { // Skip files larger than 50MB just to be safe for now
             console.warn(`⚠️ File too large (>50MB): ${cleanPath} (${(stats.size/1024/1024).toFixed(2)} MB). Skipping.`);
             failCount++;
             continue;
          }

          const buffer = fs.readFileSync(fullPath);
          const mimeType = getMimeType(fullPath);
          
          await client.query(
            'UPDATE news_images SET image_data = $1, mime_type = $2 WHERE id = $3',
            [buffer, mimeType, img.id]
          );
          console.log(`✅ Imported: ${cleanPath}`);
          successCount++;
        } catch (e) {
            console.error(`❌ Error reading/updating ${cleanPath}:`, e);
            failCount++;
        }
      } else {
        console.warn(`⚠️ File not found: ${cleanPath} (ID: ${img.id})`);
        failCount++;
      }
    }
    
    console.log('Migration completed.');
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateImages();

