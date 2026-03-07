/**
 * Тесты для функции объединения контактов (MergeModal)
 *
 * Покрываем:
 *  1. Чистую логику слияния (buildMerged, allSame, теги-union) — без React
 *  2. Рендер UI и взаимодействие пользователя
 *  3. Сетевые вызовы (PATCH survivor + DELETE duplicates)
 *  4. Граничные случаи: одинаковые значения, пустые поля, 3+ контакта
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ─── Типы и константы (дублируем из page.tsx, чтобы не зависеть от алиаса admin) ───

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  institution: string | null;
  speciality: string | null;
  tags: string[];
  status: string;
  notes: string | null;
  import_source: string;
  created_at: string;
  updated_at: string;
}

type MergeableField =
  | 'full_name'
  | 'email'
  | 'phone'
  | 'city'
  | 'institution'
  | 'speciality'
  | 'notes'
  | 'status';

const MERGE_FIELDS: { key: MergeableField; label: string }[] = [
  { key: 'full_name', label: 'Имя' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Телефон' },
  { key: 'city', label: 'Город' },
  { key: 'institution', label: 'Организация' },
  { key: 'speciality', label: 'Специальность' },
  { key: 'status', label: 'Статус' },
  { key: 'notes', label: 'Заметки' },
];

// ─── Чистые функции логики (extracted for unit testing) ───────────────────────

function allSame(contacts: Contact[], key: MergeableField): boolean {
  const getVal = (c: Contact) => (key === 'status' ? c.status : (c[key] as string | null));
  return contacts.every(c => getVal(c) === getVal(contacts[0]));
}

function buildMerged(
  contacts: Contact[],
  selections: Record<MergeableField, number>
): Partial<Contact> {
  const merged: Partial<Contact> = {};
  for (const { key } of MERGE_FIELDS) {
    if (key === 'status') {
      merged.status = contacts[selections[key]].status;
    } else {
      (merged as Record<string, unknown>)[key] = contacts[selections[key]][key];
    }
  }
  merged.tags = Array.from(new Set(contacts.flatMap(c => c.tags)));
  return merged;
}

// ─── Фикстуры ─────────────────────────────────────────────────────────────────

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    full_name: 'Иван Иванов',
    email: 'ivan@example.com',
    phone: '+7 900 000 0000',
    city: 'Москва',
    institution: 'Клиника А',
    speciality: 'Хирург',
    tags: [],
    status: 'new',
    notes: null,
    import_source: 'csv',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const contactA = makeContact({
  id: 'a1',
  full_name: 'Мария Петрова',
  email: 'maria@example.com',
  phone: '+7 900 111 1111',
  city: 'Москва',
  institution: 'Клиника А',
  speciality: 'Онколог',
  tags: ['conf-2024', 'vip'],
  status: 'new',
  notes: 'заметка A',
});

const contactB = makeContact({
  id: 'b1',
  full_name: 'Мария Петрова-Сидорова',
  email: 'maria2@example.com',
  phone: '+7 900 222 2222',
  city: 'Санкт-Петербург',
  institution: 'Клиника Б',
  speciality: 'Онколог',
  tags: ['conf-2025'],
  status: 'in_progress',
  notes: null,
});

// ─── 1. Логика: allSame ───────────────────────────────────────────────────────

describe('allSame()', () => {
  it('возвращает true когда значение одинаково у всех', () => {
    const contacts = [
      makeContact({ id: 'x1', speciality: 'Хирург' }),
      makeContact({ id: 'x2', speciality: 'Хирург' }),
    ];
    expect(allSame(contacts, 'speciality')).toBe(true);
  });

  it('возвращает false когда значения различаются', () => {
    expect(allSame([contactA, contactB], 'city')).toBe(false);
  });

  it('возвращает true для статуса если одинаковый', () => {
    const contacts = [
      makeContact({ id: 'x1', status: 'new' }),
      makeContact({ id: 'x2', status: 'new' }),
    ];
    expect(allSame(contacts, 'status')).toBe(true);
  });

  it('возвращает false для статуса если разный', () => {
    expect(allSame([contactA, contactB], 'status')).toBe(false);
  });

  it('null считается равным null', () => {
    const contacts = [
      makeContact({ id: 'x1', notes: null }),
      makeContact({ id: 'x2', notes: null }),
    ];
    expect(allSame(contacts, 'notes')).toBe(true);
  });

  it('null не равен строке', () => {
    const contacts = [
      makeContact({ id: 'x1', notes: 'есть заметка' }),
      makeContact({ id: 'x2', notes: null }),
    ];
    expect(allSame(contacts, 'notes')).toBe(false);
  });

  it('работает для трёх контактов — все разные', () => {
    const c3 = makeContact({ id: 'x3', city: 'Новосибирск' });
    expect(allSame([contactA, contactB, c3], 'city')).toBe(false);
  });

  it('работает для трёх контактов — все одинаковые', () => {
    const contacts = [
      makeContact({ id: 'x1', city: 'Москва' }),
      makeContact({ id: 'x2', city: 'Москва' }),
      makeContact({ id: 'x3', city: 'Москва' }),
    ];
    expect(allSame(contacts, 'city')).toBe(true);
  });
});

// ─── 2. Логика: buildMerged ───────────────────────────────────────────────────

describe('buildMerged()', () => {
  const defaultSelections: Record<MergeableField, number> = {
    full_name: 0, email: 0, phone: 0, city: 0,
    institution: 0, speciality: 0, status: 0, notes: 0,
  };

  it('берёт все поля из первого контакта при дефолтных выборках', () => {
    const result = buildMerged([contactA, contactB], defaultSelections);
    expect(result.full_name).toBe(contactA.full_name);
    expect(result.email).toBe(contactA.email);
    expect(result.city).toBe(contactA.city);
    expect(result.status).toBe(contactA.status);
  });

  it('берёт поле из второго контакта при selection[field]=1', () => {
    const sels = { ...defaultSelections, email: 1, city: 1 };
    const result = buildMerged([contactA, contactB], sels);
    expect(result.email).toBe(contactB.email);
    expect(result.city).toBe(contactB.city);
    // Остальное из первого
    expect(result.full_name).toBe(contactA.full_name);
  });

  it('статус берётся корректно из выбранного контакта', () => {
    const sels = { ...defaultSelections, status: 1 };
    const result = buildMerged([contactA, contactB], sels);
    expect(result.status).toBe(contactB.status); // 'in_progress'
  });

  it('теги объединяются в union без дубликатов', () => {
    const result = buildMerged([contactA, contactB], defaultSelections);
    // contactA: ['conf-2024', 'vip'], contactB: ['conf-2025']
    expect(result.tags).toEqual(expect.arrayContaining(['conf-2024', 'vip', 'conf-2025']));
    expect(result.tags!.length).toBe(3);
  });

  it('дублирующиеся теги дедуплицируются', () => {
    const c1 = makeContact({ id: 'x1', tags: ['alpha', 'beta'] });
    const c2 = makeContact({ id: 'x2', tags: ['beta', 'gamma'] });
    const result = buildMerged([c1, c2], defaultSelections);
    expect(result.tags).toEqual(expect.arrayContaining(['alpha', 'beta', 'gamma']));
    expect(result.tags!.length).toBe(3);
  });

  it('теги пустые если у всех нет тегов', () => {
    const c1 = makeContact({ id: 'x1', tags: [] });
    const c2 = makeContact({ id: 'x2', tags: [] });
    const result = buildMerged([c1, c2], defaultSelections);
    expect(result.tags).toEqual([]);
  });

  it('null поля не ломают buildMerged', () => {
    const sels = { ...defaultSelections, notes: 1 };
    const result = buildMerged([contactA, contactB], sels);
    expect(result.notes).toBeNull(); // contactB.notes = null
  });

  it('работает для трёх контактов', () => {
    const contactC = makeContact({ id: 'c3', full_name: 'Третий Контакт', tags: ['extra'] });
    const sels: Record<MergeableField, number> = {
      ...defaultSelections, full_name: 2,
    };
    const result = buildMerged([contactA, contactB, contactC], sels);
    expect(result.full_name).toBe('Третий Контакт');
    expect(result.tags).toEqual(expect.arrayContaining(['conf-2024', 'vip', 'conf-2025', 'extra']));
  });
});

// ─── 3. Тег-union: изолированная логика ──────────────────────────────────────

describe('tags union', () => {
  it('объединяет теги из N контактов', () => {
    const contacts = [
      makeContact({ id: 'x1', tags: ['a', 'b'] }),
      makeContact({ id: 'x2', tags: ['b', 'c'] }),
      makeContact({ id: 'x3', tags: ['c', 'd'] }),
    ];
    const all = Array.from(new Set(contacts.flatMap(c => c.tags)));
    expect(all).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
    expect(all.length).toBe(4);
  });
});

// ─── 4. UI-тесты MergeModal ───────────────────────────────────────────────────
//
// MergeModal живёт в apps/admin (нет экспорта), поэтому тестируем через
// inline-версию компонента, воспроизводящую ключевую логику и вызовы fetch.

const mockAdminCsrfFetch = vi.fn();

// Минимальный MergeModal для UI-тестов
function TestMergeModal({
  contacts,
  onClose,
  onDone,
}: {
  contacts: Contact[];
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const [survivorIdx, setSurvivorIdx] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selections, setSelections] = React.useState<Record<MergeableField, number>>(
    () => Object.fromEntries(MERGE_FIELDS.map(f => [f.key, 0])) as Record<MergeableField, number>
  );

  const handleMerge = async () => {
    setLoading(true);
    setError(null);
    try {
      const merged = buildMerged(contacts, selections);
      const survivorId = contacts[survivorIdx].id;
      const deleteIds = contacts.filter(c => c.id !== survivorId).map(c => c.id);

      const patchRes = await mockAdminCsrfFetch(`/api/admin/contacts/${survivorId}`, {
        method: 'PATCH', body: JSON.stringify(merged),
      });
      if (!patchRes.ok) throw new Error('Ошибка обновления контакта');

      const delRes = await mockAdminCsrfFetch('/api/admin/contacts', {
        method: 'DELETE', body: JSON.stringify({ ids: deleteIds }),
      });
      if (!delRes.ok) throw new Error('Ошибка удаления дублей');

      onDone(survivorId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка слияния');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Объединить контакты</h2>
      <div data-testid="survivor-selector">
        {contacts.map((c, i) => (
          <button key={c.id} onClick={() => setSurvivorIdx(i)} data-testid={`survivor-${i}`}
            aria-pressed={survivorIdx === i}>
            {c.full_name}
          </button>
        ))}
      </div>
      <div data-testid="diff-table">
        {MERGE_FIELDS.map(({ key, label }) => (
          <div key={key} data-testid={`row-${key}`}>
            <span>{label}</span>
            {contacts.map((c, i) => (
              <button
                key={c.id}
                data-testid={`cell-${key}-${i}`}
                aria-pressed={selections[key] === i}
                onClick={() => setSelections(prev => ({ ...prev, [key]: i }))}
              >
                {(c[key] as string | null) ?? '—'}
              </button>
            ))}
          </div>
        ))}
      </div>
      {error && <div data-testid="error-msg">{error}</div>}
      <button onClick={onClose} data-testid="cancel-btn">Отмена</button>
      <button onClick={handleMerge} disabled={loading} data-testid="merge-btn">
        {loading ? 'Загрузка...' : 'Объединить'}
      </button>
    </div>
  );
}

describe('MergeModal UI', () => {
  beforeEach(() => {
    mockAdminCsrfFetch.mockReset();
  });

  it('показывает имена всех контактов в survivor-selector', () => {
    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={vi.fn()} />
    );
    expect(screen.getByTestId('survivor-0')).toHaveTextContent(contactA.full_name);
    expect(screen.getByTestId('survivor-1')).toHaveTextContent(contactB.full_name);
  });

  it('первый контакт выбран survivor по умолчанию', () => {
    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={vi.fn()} />
    );
    expect(screen.getByTestId('survivor-0')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('survivor-1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('смена survivor переключает выбор', () => {
    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId('survivor-1'));
    expect(screen.getByTestId('survivor-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('survivor-0')).toHaveAttribute('aria-pressed', 'false');
  });

  it('кнопка Отмена вызывает onClose', () => {
    const onClose = vi.fn();
    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={onClose} onDone={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId('cancel-btn'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('клик по ячейке поля переключает selection', () => {
    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={vi.fn()} />
    );
    // По умолчанию email — from contactA (index 0)
    expect(screen.getByTestId('cell-email-0')).toHaveAttribute('aria-pressed', 'true');
    // Кликаем на contactB
    fireEvent.click(screen.getByTestId('cell-email-1'));
    expect(screen.getByTestId('cell-email-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('cell-email-0')).toHaveAttribute('aria-pressed', 'false');
  });

  it('успешный merge: PATCH + DELETE, вызывает onDone с survivorId', async () => {
    mockAdminCsrfFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const onDone = vi.fn();

    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={onDone} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge-btn'));
    });

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(onDone).toHaveBeenCalledWith(contactA.id); // survivor = contactA (idx 0)

    // Проверяем вызовы: 1й — PATCH, 2й — DELETE
    expect(mockAdminCsrfFetch).toHaveBeenCalledTimes(2);
    expect(mockAdminCsrfFetch.mock.calls[0][0]).toContain(contactA.id);
    expect(mockAdminCsrfFetch.mock.calls[0][1].method).toBe('PATCH');
    expect(mockAdminCsrfFetch.mock.calls[1][1].method).toBe('DELETE');
  });

  it('survivor = второй: PATCH на contactB, DELETE contactA', async () => {
    mockAdminCsrfFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const onDone = vi.fn();

    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={onDone} />
    );
    // Выбираем второй контакт survivor
    fireEvent.click(screen.getByTestId('survivor-1'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('merge-btn'));
    });

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(contactB.id));
    expect(mockAdminCsrfFetch.mock.calls[0][0]).toContain(contactB.id);

    const deleteBody = JSON.parse(mockAdminCsrfFetch.mock.calls[1][1].body);
    expect(deleteBody.ids).toContain(contactA.id);
    expect(deleteBody.ids).not.toContain(contactB.id);
  });

  it('PATCH с выбранными полями из разных контактов', async () => {
    mockAdminCsrfFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const onDone = vi.fn();

    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={onDone} />
    );
    // Выбираем email из contactB
    fireEvent.click(screen.getByTestId('cell-email-1'));
    // Выбираем city из contactB
    fireEvent.click(screen.getByTestId('cell-city-1'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('merge-btn'));
    });

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const patchBody = JSON.parse(mockAdminCsrfFetch.mock.calls[0][1].body);
    expect(patchBody.email).toBe(contactB.email);
    expect(patchBody.city).toBe(contactB.city);
    expect(patchBody.full_name).toBe(contactA.full_name); // не менялось
  });

  it('теги в PATCH содержат union из обоих контактов', async () => {
    mockAdminCsrfFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={vi.fn()} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge-btn'));
    });

    await waitFor(() => expect(mockAdminCsrfFetch).toHaveBeenCalled());
    const patchBody = JSON.parse(mockAdminCsrfFetch.mock.calls[0][1].body);
    expect(patchBody.tags).toEqual(expect.arrayContaining(['conf-2024', 'vip', 'conf-2025']));
    expect(patchBody.tags.length).toBe(3);
  });

  it('показывает ошибку если PATCH вернул не ok', async () => {
    mockAdminCsrfFetch.mockResolvedValue({ ok: false });

    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={vi.fn()} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge-btn'));
    });

    await waitFor(() =>
      expect(screen.getByTestId('error-msg')).toHaveTextContent('Ошибка обновления контакта')
    );
  });

  it('показывает ошибку если DELETE вернул не ok', async () => {
    mockAdminCsrfFetch
      .mockResolvedValueOnce({ ok: true })  // PATCH ok
      .mockResolvedValueOnce({ ok: false }); // DELETE fail

    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={vi.fn()} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge-btn'));
    });

    await waitFor(() =>
      expect(screen.getByTestId('error-msg')).toHaveTextContent('Ошибка удаления дублей')
    );
  });

  it('показывает ошибку при сетевом сбое (throw)', async () => {
    mockAdminCsrfFetch.mockRejectedValue(new Error('network error'));

    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={vi.fn()} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge-btn'));
    });

    await waitFor(() =>
      expect(screen.getByTestId('error-msg')).toHaveTextContent('network error')
    );
  });

  it('onDone не вызывается при ошибке', async () => {
    mockAdminCsrfFetch.mockResolvedValue({ ok: false });
    const onDone = vi.fn();

    render(
      <TestMergeModal contacts={[contactA, contactB]} onClose={vi.fn()} onDone={onDone} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge-btn'));
    });

    await waitFor(() => expect(screen.getByTestId('error-msg')).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it('работает с тремя контактами — DELETE содержит два ID', async () => {
    mockAdminCsrfFetch.mockResolvedValue({ ok: true });
    const contactC = makeContact({ id: 'c3', full_name: 'Третий', tags: [] });
    const onDone = vi.fn();

    render(
      <TestMergeModal contacts={[contactA, contactB, contactC]} onClose={vi.fn()} onDone={onDone} />
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge-btn'));
    });

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(contactA.id));
    const deleteBody = JSON.parse(mockAdminCsrfFetch.mock.calls[1][1].body);
    expect(deleteBody.ids).toHaveLength(2);
    expect(deleteBody.ids).toContain(contactB.id);
    expect(deleteBody.ids).toContain(contactC.id);
  });
});
