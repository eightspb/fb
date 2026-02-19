import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { checkApiAuth } from '@/lib/auth';
import { verifyCsrfToken } from '@/lib/csrf';
import type { SiteBanner, BannerSettings } from '@/lib/types/banner';

export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

/**
 * GET /api/admin/banner
 * Получить текущие настройки баннера (требует авторизации)
 */
export async function GET(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Не авторизован' },
      { status: 401 }
    );
  }

  try {
    const client = await pool.connect();
    try {
      // Проверяем существование таблицы
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'site_banner'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        return NextResponse.json(
          { 
            error: 'Таблица site_banner не найдена. Примените миграцию 007_add_site_banner.sql',
            banner: null
          },
          { status: 500 }
        );
      }

      const result = await client.query<SiteBanner>(
        'SELECT * FROM site_banner LIMIT 1'
      );

      if (result.rows.length === 0) {
        // Создаем запись по умолчанию если её нет
        const insertResult = await client.query<SiteBanner>(
          `INSERT INTO site_banner (
            enabled, message, style, bg_color, text_color, 
            font_size, font_weight, dismissible
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            false,
            'Добро пожаловать на наш сайт!',
            'static',
            '#3b82f6',
            '#ffffff',
            '14px',
            'normal',
            true
          ]
        );
        
        return NextResponse.json({ banner: insertResult.rows[0] });
      }

      return NextResponse.json({ banner: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Admin Banner API] Ошибка получения баннера:', error);
    
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Таблица site_banner не найдена. Примените миграцию 007_add_site_banner.sql',
          banner: null,
          details: error?.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ошибка получения баннера', details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/banner
 * Обновить настройки баннера (требует авторизации + CSRF)
 */
export async function PUT(request: NextRequest) {
  const { isAuthenticated } = await checkApiAuth(request);
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Не авторизован' },
      { status: 401 }
    );
  }

  // Проверка CSRF токена
  const csrfValid = await verifyCsrfToken(request);
  if (!csrfValid) {
    return NextResponse.json(
      { error: 'Недействительный CSRF токен' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json() as BannerSettings;

    // Валидация входных данных
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Поле enabled должно быть boolean' },
        { status: 400 }
      );
    }

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Поле message обязательно и должно быть строкой' },
        { status: 400 }
      );
    }

    if (!['static', 'marquee'].includes(body.style)) {
      return NextResponse.json(
        { error: 'Поле style должно быть "static" или "marquee"' },
        { status: 400 }
      );
    }

    if (!['normal', 'medium', 'bold'].includes(body.font_weight)) {
      return NextResponse.json(
        { error: 'Поле font_weight должно быть "normal", "medium" или "bold"' },
        { status: 400 }
      );
    }

    // Валидация цветов (hex формат)
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(body.bg_color)) {
      return NextResponse.json(
        { error: 'Поле bg_color должно быть в формате #rrggbb' },
        { status: 400 }
      );
    }

    if (!hexColorRegex.test(body.text_color)) {
      return NextResponse.json(
        { error: 'Поле text_color должно быть в формате #rrggbb' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Проверяем существование таблицы
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'site_banner'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        return NextResponse.json(
          { 
            error: 'Таблица site_banner не найдена. Примените миграцию 007_add_site_banner.sql'
          },
          { status: 500 }
        );
      }

      // Получаем ID первой записи (singleton)
      const existingResult = await client.query<{ id: string }>(
        'SELECT id FROM site_banner LIMIT 1'
      );

      let result;
      
      if (existingResult.rows.length === 0) {
        // Создаем новую запись
        result = await client.query<SiteBanner>(
          `INSERT INTO site_banner (
            enabled, message, style, bg_color, text_color, 
            font_size, font_weight, dismissible
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            body.enabled,
            body.message,
            body.style,
            body.bg_color,
            body.text_color,
            body.font_size,
            body.font_weight,
            body.dismissible
          ]
        );
      } else {
        // Обновляем существующую запись
        result = await client.query<SiteBanner>(
          `UPDATE site_banner 
          SET 
            enabled = $1,
            message = $2,
            style = $3,
            bg_color = $4,
            text_color = $5,
            font_size = $6,
            font_weight = $7,
            dismissible = $8,
            updated_at = NOW()
          WHERE id = $9
          RETURNING *`,
          [
            body.enabled,
            body.message,
            body.style,
            body.bg_color,
            body.text_color,
            body.font_size,
            body.font_weight,
            body.dismissible,
            existingResult.rows[0].id
          ]
        );
      }

      return NextResponse.json({ 
        success: true,
        banner: result.rows[0] 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Admin Banner API] Ошибка обновления баннера:', error);
    
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Таблица site_banner не найдена. Примените миграцию 007_add_site_banner.sql',
          details: error?.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ошибка обновления баннера', details: error?.message },
      { status: 500 }
    );
  }
}
