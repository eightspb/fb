import { describe, expect, it } from 'vitest';
import { getTableColumnKey, renderContactResultsTable } from '../../apps/admin/src/app/ai-assistant/rendering';

describe('AI assistant contact table rendering', () => {
  it('keeps unknown columns from markdown while linkifying the contact name', () => {
    const html = renderContactResultsTable(
      ['ФИО', 'Дата', 'Источник'],
      [{ id: 'contact-1', full_name: 'Иван Иванов' }],
      [['Иван Иванов', '2026-03-01', 'CRM']]
    );

    expect(html).toContain('/contacts/contact-1');
    expect(html).toContain('>Иван Иванов<');
    expect(html).toContain('>2026-03-01<');
    expect(html).toContain('>CRM<');
    expect(html).not.toContain('>—<');
  });

  it('maps known contact headers to CRM fields', () => {
    expect(getTableColumnKey('ФИО')).toBe('full_name');
    expect(getTableColumnKey('Город')).toBe('city');
    expect(getTableColumnKey('Учреждение')).toBe('institution');
  });
});
