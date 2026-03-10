/**
 * Unit тесты для contact-upsert.ts
 * Проверяет upsertContact: поиск по email/phone, soft-update, insert, type casts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertContact, ContactFormData } from '@/lib/contact-upsert';
import { PoolClient } from 'pg';

// Хелпер для создания мок-клиента pg
function createMockClient() {
  const queryFn = vi.fn();
  const client = {
    query: queryFn,
  } as unknown as PoolClient;
  return { client, queryFn };
}

const NEW_CONTACT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const EXISTING_CONTACT_ID = '11111111-2222-3333-4444-555555555555';

describe('upsertContact', () => {
  let client: PoolClient;
  let queryFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ({ client, queryFn } = createMockClient());
  });

  // ── INSERT (новый контакт) ──

  describe('INSERT — новый контакт', () => {
    beforeEach(() => {
      // Все SELECT возвращают пустой результат → контакт не найден
      queryFn.mockImplementation((sql: string) => {
        if (sql.startsWith('SELECT')) return { rows: [] };
        if (sql.startsWith('INSERT')) return { rows: [{ id: NEW_CONTACT_ID }] };
        return { rows: [] };
      });
    });

    it('создаёт контакт со всеми полями', async () => {
      const data: ContactFormData = {
        fullName: 'Иванов Иван',
        email: 'ivan@test.ru',
        phone: '+79001234567',
        city: 'Москва',
        institution: 'Клиника А',
        speciality: 'Хирург',
        tag: 'form-cp',
        sourceUrl: 'https://example.com/form',
      };

      const id = await upsertContact(client, data);

      expect(id).toBe(NEW_CONTACT_ID);

      // Должен был сделать 2 SELECT (email, phone) + 1 INSERT
      const calls = queryFn.mock.calls;
      expect(calls.length).toBe(3);

      // SELECT по email
      expect(calls[0][0]).toContain('SELECT id FROM contacts WHERE email');
      expect(calls[0][1]).toEqual(['ivan@test.ru']);

      // SELECT по phone
      expect(calls[1][0]).toContain('SELECT id FROM contacts WHERE phone');
      expect(calls[1][1]).toEqual(['+79001234567']);

      // INSERT
      const insertSql = calls[2][0] as string;
      expect(insertSql).toContain('INSERT INTO contacts');
      const insertParams = calls[2][1] as unknown[];
      expect(insertParams[0]).toBe('Иванов Иван');
      expect(insertParams[1]).toBe('ivan@test.ru');
      expect(insertParams[2]).toBe('+79001234567');
      expect(insertParams[3]).toBe('Москва');
      expect(insertParams[4]).toBe('Клиника А');
      expect(insertParams[5]).toBe('Хирург');
      expect(insertParams[6]).toEqual(['form-cp']);
      expect(insertParams[7]).toEqual(['https://example.com/form']);
    });

    it('создаёт контакт без опциональных полей', async () => {
      const data: ContactFormData = {
        fullName: 'Test',
        tag: 'newsletter',
      };

      const id = await upsertContact(client, data);
      expect(id).toBe(NEW_CONTACT_ID);

      // Без email и phone — ни одного SELECT
      const calls = queryFn.mock.calls;
      expect(calls.length).toBe(1); // только INSERT

      const insertParams = calls[0][1] as unknown[];
      expect(insertParams[1]).toBeNull(); // email
      expect(insertParams[2]).toBeNull(); // phone
      expect(insertParams[3]).toBeNull(); // city
      expect(insertParams[4]).toBeNull(); // institution
      expect(insertParams[5]).toBeNull(); // speciality
      expect(insertParams[7]).toEqual([]); // source_urls — пустой массив
    });

    it('нормализует email в нижний регистр и trim', async () => {
      const data: ContactFormData = {
        fullName: 'Test',
        email: '  User@MAIL.RU  ',
        tag: 'form-contact',
      };

      await upsertContact(client, data);

      const selectParams = queryFn.mock.calls[0][1] as unknown[];
      expect(selectParams[0]).toBe('user@mail.ru');
    });

    it('тримит phone', async () => {
      const data: ContactFormData = {
        fullName: 'Test',
        phone: '  +79001234567  ',
        tag: 'form-contact',
      };

      await upsertContact(client, data);

      const selectParams = queryFn.mock.calls[0][1] as unknown[];
      expect(selectParams[0]).toBe('+79001234567');
    });
  });

  // ── UPDATE (существующий контакт, найден по email) ──

  describe('UPDATE — найден по email', () => {
    beforeEach(() => {
      queryFn.mockImplementation((sql: string) => {
        if (sql.startsWith('SELECT')) return { rows: [{ id: EXISTING_CONTACT_ID }] };
        if (sql.startsWith('UPDATE')) return { rows: [], rowCount: 1 };
        return { rows: [] };
      });
    });

    it('обновляет существующий контакт', async () => {
      const data: ContactFormData = {
        fullName: 'Иванов Иван',
        email: 'ivan@test.ru',
        phone: '+79001234567',
        city: 'Москва',
        institution: 'Клиника Б',
        tag: 'form-cp',
        sourceUrl: 'https://example.com/cp',
      };

      const id = await upsertContact(client, data);

      expect(id).toBe(EXISTING_CONTACT_ID);

      // 1 SELECT (email нашёл) + 1 UPDATE
      const calls = queryFn.mock.calls;
      expect(calls.length).toBe(2);

      // UPDATE SQL должен содержать type casts
      const updateSql = calls[1][0] as string;
      expect(updateSql).toContain('$7::text');
      expect(updateSql).toContain('$8::text');
      expect(updateSql).toContain('UPDATE contacts SET');

      // Проверяем параметры UPDATE
      const updateParams = calls[1][1] as unknown[];
      expect(updateParams[0]).toBe(EXISTING_CONTACT_ID); // $1 — id
      expect(updateParams[1]).toBe('ivan@test.ru');       // $2 — email
      expect(updateParams[2]).toBe('+79001234567');        // $3 — phone
      expect(updateParams[3]).toBe('Москва');              // $4 — city
      expect(updateParams[4]).toBe('Клиника Б');           // $5 — institution
      expect(updateParams[5]).toBeNull();                  // $6 — speciality
      expect(updateParams[6]).toBe('form-cp');             // $7 — tag
      expect(updateParams[7]).toBe('https://example.com/cp'); // $8 — sourceUrl
    });

    it('передаёт null для sourceUrl когда не указан', async () => {
      const data: ContactFormData = {
        fullName: 'Test',
        email: 'test@test.ru',
        tag: 'form-contact',
      };

      await upsertContact(client, data);

      const updateParams = queryFn.mock.calls[1][1] as unknown[];
      expect(updateParams[7]).toBeNull(); // sourceUrl → null
    });

    it('SQL содержит ::text cast для $7 и $8 (tags и source_urls)', async () => {
      await upsertContact(client, {
        fullName: 'Test',
        email: 'test@test.ru',
        tag: 'form-cp',
        sourceUrl: 'https://example.com',
      });

      const updateSql = queryFn.mock.calls[1][0] as string;

      // $7::text — для array_append и ANY на tags
      expect(updateSql).toMatch(/\$7::text\s*=\s*ANY\(tags\)/);
      expect(updateSql).toMatch(/array_append\(tags,\s*\$7::text\)/);

      // $8::text — для IS NULL, ANY и array_append на source_urls
      expect(updateSql).toMatch(/\$8::text\s+IS\s+NULL/);
      expect(updateSql).toMatch(/\$8::text\s*=\s*ANY\(source_urls\)/);
      expect(updateSql).toMatch(/array_append\(source_urls,\s*\$8::text\)/);
    });
  });

  // ── UPDATE — найден по phone (email не совпал) ──

  describe('UPDATE — найден по phone (fallback)', () => {
    it('ищет по phone если email не найден', async () => {
      let selectCallIndex = 0;
      queryFn.mockImplementation((sql: string) => {
        if (sql.startsWith('SELECT')) {
          selectCallIndex++;
          // Первый SELECT (email) — не найден, второй (phone) — найден
          if (selectCallIndex === 1) return { rows: [] };
          return { rows: [{ id: EXISTING_CONTACT_ID }] };
        }
        if (sql.startsWith('UPDATE')) return { rows: [], rowCount: 1 };
        return { rows: [] };
      });

      const id = await upsertContact(client, {
        fullName: 'Test',
        email: 'new@test.ru',
        phone: '+79001234567',
        tag: 'form-contact',
      });

      expect(id).toBe(EXISTING_CONTACT_ID);

      // 2 SELECT + 1 UPDATE
      expect(queryFn).toHaveBeenCalledTimes(3);

      // Первый SELECT — по email
      expect(queryFn.mock.calls[0][0]).toContain('WHERE email = $1');

      // Второй SELECT — по phone
      expect(queryFn.mock.calls[1][0]).toContain('WHERE phone = $1');
    });
  });

  // ── import_source обновление ──

  describe('import_source', () => {
    beforeEach(() => {
      queryFn.mockImplementation((sql: string) => {
        if (sql.startsWith('SELECT')) return { rows: [{ id: EXISTING_CONTACT_ID }] };
        if (sql.startsWith('UPDATE')) return { rows: [], rowCount: 1 };
        return { rows: [] };
      });
    });

    it('UPDATE SQL меняет tilda на form', async () => {
      await upsertContact(client, {
        fullName: 'Test',
        email: 'test@test.ru',
        tag: 'form-cp',
      });

      const updateSql = queryFn.mock.calls[1][0] as string;
      expect(updateSql).toContain("WHEN import_source = 'tilda' THEN 'form'");
    });

    it('INSERT использует import_source = form', async () => {
      queryFn.mockImplementation((sql: string) => {
        if (sql.startsWith('SELECT')) return { rows: [] };
        if (sql.startsWith('INSERT')) return { rows: [{ id: NEW_CONTACT_ID }] };
        return { rows: [] };
      });

      await upsertContact(client, {
        fullName: 'Test',
        tag: 'form-contact',
      });

      const insertSql = queryFn.mock.calls[0][0] as string;
      expect(insertSql).toContain("'form'");
    });
  });
});
