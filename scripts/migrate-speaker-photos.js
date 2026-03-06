/**
 * Migration script: converts base64 speaker photos to files on disk.
 *
 * Run inside the site container:
 *   docker exec fb-net-site node /app/scripts/migrate-speaker-photos.js
 *
 * Or on the server directly:
 *   cd /opt/fb-net && node scripts/migrate-speaker-photos.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'public', 'uploads', 'speakers');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const pool = new Pool({ connectionString: DATABASE_URL });

function base64ToFile(base64DataUrl, speakerId) {
  const match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const data = Buffer.from(match[2], 'base64');
  const hash = crypto.createHash('md5').update(data).digest('hex').slice(0, 8);
  const filename = `${speakerId}-${hash}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(filepath, data);
  return `/uploads/speakers/${filename}`;
}

async function migrate() {
  console.log('Starting speaker photo migration...');
  console.log('Upload directory:', UPLOAD_DIR);

  // Create upload directory
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT id, slug, speakers FROM conferences WHERE jsonb_array_length(speakers) > 0"
    );

    console.log(`Found ${rows.length} conference(s) with speakers`);

    for (const row of rows) {
      const speakers = row.speakers;
      let changed = false;

      for (const speaker of speakers) {
        if (speaker.photo && speaker.photo.startsWith('data:')) {
          const oldSize = speaker.photo.length;
          const filePath = base64ToFile(speaker.photo, speaker.id);
          if (filePath) {
            speaker.photo = filePath;
            changed = true;
            console.log(`  [${row.slug || row.id}] ${speaker.name}: ${(oldSize / 1024).toFixed(0)} KB base64 -> ${filePath}`);
          }
        }
      }

      if (changed) {
        await client.query(
          'UPDATE conferences SET speakers = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(speakers), row.id]
        );
        console.log(`  Updated conference: ${row.slug || row.id}`);
      }
    }

    // Also check cover_image for base64
    const { rows: coverRows } = await client.query(
      "SELECT id, slug, cover_image FROM conferences WHERE cover_image LIKE 'data:%'"
    );

    if (coverRows.length > 0) {
      const coverDir = path.join(__dirname, '..', 'public', 'uploads', 'covers');
      fs.mkdirSync(coverDir, { recursive: true });

      for (const row of coverRows) {
        const match = row.cover_image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (match) {
          const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
          const data = Buffer.from(match[2], 'base64');
          const hash = crypto.createHash('md5').update(data).digest('hex').slice(0, 8);
          const filename = `${row.slug || row.id}-${hash}.${ext}`;
          const filepath = path.join(coverDir, filename);
          fs.writeFileSync(filepath, data);
          const urlPath = `/uploads/covers/${filename}`;
          await client.query(
            'UPDATE conferences SET cover_image = $1, updated_at = NOW() WHERE id = $2',
            [urlPath, row.id]
          );
          console.log(`  Cover image: ${row.slug || row.id} -> ${urlPath}`);
        }
      }
    }

    console.log('\nMigration complete!');

    // Verify
    const { rows: verify } = await client.query(
      "SELECT id, slug, length(speakers::text) as size FROM conferences WHERE jsonb_array_length(speakers) > 0"
    );
    for (const v of verify) {
      console.log(`  ${v.slug || v.id}: speakers JSON size = ${(v.size / 1024).toFixed(0)} KB`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
