interface ChartData {
  type: 'bar' | 'horizontal-bar';
  title: string;
  labels: string[];
  values: number[];
  unit?: string;
}

export function MiniChart({ data }: { data: ChartData }) {
  const max = Math.max(...data.values, 1);

  if (data.type === 'horizontal-bar') {
    return (
      <div style={{ margin: '8px 0', fontFamily: 'inherit' }}>
        {data.title && (
          <p style={{ fontSize: '0.8em', fontWeight: 600, color: 'var(--frox-gray-600)', marginBottom: 6, margin: '0 0 6px' }}>
            {data.title}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.labels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82em' }}>
              <span style={{
                width: 100, flexShrink: 0, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: 'var(--frox-gray-700)', textAlign: 'right',
              }}>{label}</span>
              <div style={{ flex: 1, background: 'var(--frox-gray-100)', borderRadius: 4, height: 18 }}>
                <div style={{
                  width: `${(data.values[i] / max) * 100}%`,
                  background: 'var(--frox-blue)',
                  height: '100%', borderRadius: 4,
                  minWidth: 4,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ width: 48, flexShrink: 0, color: 'var(--frox-gray-500)', fontSize: '0.95em' }}>
                {data.values[i]}{data.unit ? ` ${data.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.type === 'bar') {
    const BAR_W = 32, GAP = 8, HEIGHT = 100;
    const totalWidth = data.labels.length * (BAR_W + GAP);
    return (
      <div style={{ margin: '8px 0', overflowX: 'auto' }}>
        {data.title && <p style={{ fontSize: '0.8em', fontWeight: 600, marginBottom: 4, margin: '0 0 4px' }}>{data.title}</p>}
        <svg width={totalWidth} height={HEIGHT + 30} style={{ overflow: 'visible', display: 'block' }}>
          {data.values.map((val, i) => {
            const barH = max > 0 ? (val / max) * HEIGHT : 0;
            const x = i * (BAR_W + GAP);
            return (
              <g key={i}>
                <rect
                  x={x} y={HEIGHT - barH}
                  width={BAR_W} height={barH}
                  rx={4} fill="var(--frox-blue)" opacity={0.85}
                />
                <text x={x + BAR_W / 2} y={HEIGHT - barH - 4}
                  textAnchor="middle" fontSize={10} fill="var(--frox-gray-600)">
                  {val}
                </text>
                <text x={x + BAR_W / 2} y={HEIGHT + 14}
                  textAnchor="middle" fontSize={9} fill="var(--frox-gray-500)">
                  {data.labels[i].slice(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return null;
}

export function extractChart(text: string): { text: string; chart: ChartData | null } {
  const match = text.match(/```chart\s*([\s\S]*?)\s*```/);
  if (!match) return { text, chart: null };
  try {
    const chart = JSON.parse(match[1]) as ChartData;
    return { text: text.replace(match[0], '').trim(), chart };
  } catch {
    return { text, chart: null };
  }
}

export function detectChartable(rows: Record<string, unknown>[]): ChartData | null {
  if (!rows || rows.length < 2 || rows.length > 30) return null;
  const keys = Object.keys(rows[0]);
  if (keys.length !== 2) return null;
  const [labelKey, valueKey] = keys;
  const val = rows[0][valueKey];
  if (typeof val !== 'number' && !(typeof val === 'string' && !isNaN(Number(val)))) return null;
  return {
    type: 'horizontal-bar',
    title: '',
    labels: rows.map(r => String(r[labelKey])),
    values: rows.map(r => Number(r[valueKey])),
  };
}
