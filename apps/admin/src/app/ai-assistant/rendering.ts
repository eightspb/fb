export function getTableColumnKey(label: string): string | null {
  const normalized = label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  if (!normalized) return null;
  if (normalized.includes('фио') || normalized.includes('имя') || normalized.includes('full name')) return 'full_name';
  if (normalized.includes('город') || normalized.includes('city')) return 'city';
  if (normalized.includes('учреждение') || normalized.includes('организац') || normalized.includes('institution')) return 'institution';
  if (normalized.includes('специальност') || normalized.includes('speciality') || normalized.includes('специализац')) return 'speciality';
  if (normalized.includes('email') || normalized.includes('почт')) return 'email';
  if (normalized.includes('телефон') || normalized.includes('phone')) return 'phone';
  if (normalized.includes('статус') || normalized.includes('status')) return 'status';
  if (normalized.includes('тег')) return 'tags';

  return null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTableValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  return String(value);
}

function getFallbackCellValue(
  row: Record<string, unknown>,
  label: string,
  markdownRow: string[] | undefined,
  columnIndex: number
): string {
  const directValue = row[label];
  if (directValue !== undefined) {
    return formatTableValue(directValue);
  }

  return markdownRow?.[columnIndex] || '—';
}

export function renderContactResultsTable(
  headers: string[],
  rows: Record<string, unknown>[],
  markdownRows: string[][] = []
): string {
  const mappedHeaders = headers.map((header) => ({
    label: header,
    key: getTableColumnKey(header),
  }));

  const headerHtml = mappedHeaders
    .map(({ label }) => (
      `<th style="background:var(--frox-gray-50,#f9fafb);font-weight:600;padding:6px 10px;border:1px solid var(--frox-gray-200,#e5e7eb);text-align:left">${escapeHtml(label)}</th>`
    ))
    .join('');

  const bodyHtml = rows
    .map((row, rowIndex) => {
      const markdownRow = markdownRows[rowIndex];
      const cells = mappedHeaders
        .map(({ key, label }, columnIndex) => {
          if (key === 'full_name' && typeof row.id === 'string' && typeof row.full_name === 'string') {
            const href = `/contacts/${encodeURIComponent(row.id)}`;
            return `<td style="padding:5px 10px;border:1px solid var(--frox-gray-200,#e5e7eb)"><a href="${href}" style="color:var(--frox-blue);text-decoration:none;font-weight:600;border-bottom:1px solid rgba(59,130,246,0.35)">${escapeHtml(row.full_name)}</a></td>`;
          }

          const value = key
            ? formatTableValue(row[key])
            : getFallbackCellValue(row, label, markdownRow, columnIndex);

          return `<td style="padding:5px 10px;border:1px solid var(--frox-gray-200,#e5e7eb)">${escapeHtml(value)}</td>`;
        })
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table style="border-collapse:collapse;width:100%;font-size:0.85em;margin:8px 0"><tr>${headerHtml}</tr>${bodyHtml}</table>`;
}
