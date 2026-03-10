'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Microscope,
  Filter,
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BulkResearchJob {
  id: string;
  status: 'running' | 'done' | 'error';
  total: number;
  done: number;
  skipped: number;
  succeeded: number;
  failed: number;
  errors: string[];
  startedAt: string;
  finishedAt?: string;
}

interface Props {
  /** Pre-selected contact IDs (from manual selection in the list) */
  selectedIds?: Set<string>;
  onClose: () => void;
  /** Called when job finishes so the contacts list can refresh */
  onDone?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusConfig = [
  { value: 'new',         label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'processed',  label: 'Обработаны' },
  { value: 'archived',   label: 'В архиве' },
];

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--frox-gray-500)]">
        <span>{value} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--frox-gray-200)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--frox-brand)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function BulkResearchModal({ selectedIds, onClose, onDone }: Props) {
  // Step: 'configure' | 'preview' | 'running' | 'done'
  const [step, setStep] = useState<'configure' | 'preview' | 'running' | 'done'>('configure');

  // Mode: manual (use selectedIds) or filters
  const [mode, setMode] = useState<'manual' | 'filters'>(
    selectedIds && selectedIds.size > 0 ? 'manual' : 'filters'
  );

  // Filter fields
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag]       = useState('');
  const [filterCity, setFilterCity]     = useState('');
  const [noNotes, setNoNotes]           = useState(true);

  // Preview data
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Job
  const [job, setJob] = useState<BulkResearchJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Preview ────────────────────────────────────────────────────────────────

  async function loadPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const body =
        mode === 'manual' && selectedIds && selectedIds.size > 0
          ? { ids: Array.from(selectedIds) }
          : {
              filters: {
                ...(filterStatus ? { status: filterStatus } : {}),
                ...(filterTag    ? { tag: filterTag }       : {}),
                ...(filterCity   ? { city: filterCity }     : {}),
                no_notes: noNotes,
              },
            };

      // Use a lightweight preview endpoint (dry_run) — we'll re-use the same
      // POST but with dry_run=true flag
      const res = await adminCsrfFetch('/api/admin/contacts/bulk-research', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, dry_run: true }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Ошибка предпросмотра');
      }

      const data = await res.json();
      setPreviewCount(data.total);
      setStep('preview');
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setPreviewLoading(false);
    }
  }

  // ── Start job ──────────────────────────────────────────────────────────────

  async function startResearch() {
    setStep('running');
    try {
      const body =
        mode === 'manual' && selectedIds && selectedIds.size > 0
          ? { ids: Array.from(selectedIds) }
          : {
              filters: {
                ...(filterStatus ? { status: filterStatus } : {}),
                ...(filterTag    ? { tag: filterTag }       : {}),
                ...(filterCity   ? { city: filterCity }     : {}),
                no_notes: noNotes,
              },
            };

      const res = await adminCsrfFetch('/api/admin/contacts/bulk-research', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Ошибка запуска');
      }

      const { jobId } = await res.json();
      pollProgress(jobId);
    } catch (e) {
      setJob(prev => prev
        ? { ...prev, status: 'error', errors: [e instanceof Error ? e.message : 'Ошибка'] }
        : null
      );
      setStep('done');
    }
  }

  function pollProgress(jobId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/contacts/bulk-research?jobId=${jobId}`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data: BulkResearchJob = await res.json();
        setJob(data);
        if (data.status !== 'running') {
          clearInterval(pollRef.current!);
          setStep('done');
          onDone?.();
        }
      } catch { /* ignore transient errors */ }
    }, 1500);
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const canPreview =
    mode === 'manual'
      ? (selectedIds?.size ?? 0) > 0
      : filterStatus || filterTag || filterCity || noNotes;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={step === 'running' ? undefined : onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--frox-gray-200)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Microscope className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--frox-gray-1100)]">Массовое исследование</h2>
              <p className="text-xs text-[var(--frox-gray-400)]">AI-исследование группы контактов</p>
            </div>
          </div>
          {step !== 'running' && (
            <button
              onClick={onClose}
              className="text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] p-1 rounded-lg hover:bg-[var(--frox-gray-200)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* ── Configure step ── */}
          {(step === 'configure' || step === 'preview') && (
            <>
              {/* Mode tabs */}
              <div className="flex rounded-xl border border-[var(--frox-neutral-border)] overflow-hidden text-sm">
                <button
                  className={`flex-1 px-4 py-2.5 font-medium transition-colors flex items-center justify-center gap-2 ${
                    mode === 'manual'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-[var(--frox-gray-600)] hover:bg-[var(--frox-gray-100)]'
                  }`}
                  onClick={() => { setMode('manual'); setStep('configure'); setPreviewCount(null); }}
                >
                  <Users className="w-3.5 h-3.5" />
                  Вручную ({selectedIds?.size ?? 0})
                </button>
                <button
                  className={`flex-1 px-4 py-2.5 font-medium transition-colors flex items-center justify-center gap-2 ${
                    mode === 'filters'
                      ? 'bg-violet-600 text-white'
                      : 'bg-white text-[var(--frox-gray-600)] hover:bg-[var(--frox-gray-100)]'
                  }`}
                  onClick={() => { setMode('filters'); setStep('configure'); setPreviewCount(null); }}
                >
                  <Filter className="w-3.5 h-3.5" />
                  По фильтрам
                </button>
              </div>

              {/* Manual mode info */}
              {mode === 'manual' && (
                <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-violet-700">
                  {(selectedIds?.size ?? 0) > 0
                    ? `Выбрано ${selectedIds!.size} контактов в списке. Для каждого будет запущено AI-исследование.`
                    : 'Нет выбранных контактов. Выберите контакты в списке с помощью чекбоксов, затем откройте это окно.'}
                </div>
              )}

              {/* Filters mode */}
              {mode === 'filters' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5">Статус</label>
                    <select
                      className="frox-select h-9 w-full rounded-xl px-3 text-sm"
                      value={filterStatus}
                      onChange={e => { setFilterStatus(e.target.value); setStep('configure'); setPreviewCount(null); }}
                    >
                      <option value="">Все статусы</option>
                      {statusConfig.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5">Тег</label>
                    <input
                      type="text"
                      placeholder="Например: врач"
                      className="frox-input h-9 w-full rounded-xl px-3 text-sm"
                      value={filterTag}
                      onChange={e => { setFilterTag(e.target.value); setStep('configure'); setPreviewCount(null); }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--frox-gray-500)] mb-1.5">Город</label>
                    <input
                      type="text"
                      placeholder="Например: Москва"
                      className="frox-input h-9 w-full rounded-xl px-3 text-sm"
                      value={filterCity}
                      onChange={e => { setFilterCity(e.target.value); setStep('configure'); setPreviewCount(null); }}
                    />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-violet-600"
                      checked={noNotes}
                      onChange={e => { setNoNotes(e.target.checked); setStep('configure'); setPreviewCount(null); }}
                    />
                    <span className="text-sm text-[var(--frox-gray-700)]">
                      Только контакты <strong>без AI-исследований</strong>
                    </span>
                  </label>
                </div>
              )}

              {/* Preview result */}
              {step === 'preview' && previewCount !== null && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">
                      Найдено {previewCount} контактов
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Каждый запрос займёт ~10–30 сек. Процесс идёт в фоне.
                    </p>
                  </div>
                </div>
              )}

              {previewError && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {previewError}
                </div>
              )}
            </>
          )}

          {/* ── Running step ── */}
          {step === 'running' && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-violet-600 animate-spin shrink-0" />
                <p className="text-sm font-medium text-[var(--frox-gray-800)]">
                  Исследование запущено…
                </p>
              </div>
              {job && <ProgressBar value={job.done} total={job.total} />}
              {job && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 py-2 px-1">
                    <div className="font-bold text-emerald-700 text-base">{job.succeeded}</div>
                    <div className="text-emerald-600">Готово</div>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-100 py-2 px-1">
                    <div className="font-bold text-red-600 text-base">{job.failed}</div>
                    <div className="text-red-500">Ошибки</div>
                  </div>
                  <div className="rounded-lg bg-[var(--frox-gray-100)] border border-[var(--frox-neutral-border)] py-2 px-1">
                    <div className="font-bold text-[var(--frox-gray-700)] text-base">{job.total - job.done}</div>
                    <div className="text-[var(--frox-gray-500)]">Осталось</div>
                  </div>
                </div>
              )}
              <p className="text-xs text-[var(--frox-gray-400)] text-center">
                Не закрывайте вкладку — процесс идёт в фоне на сервере.
              </p>
            </div>
          )}

          {/* ── Done step ── */}
          {step === 'done' && job && (
            <div className="space-y-4 py-2">
              {job.status === 'done' ? (
                <div className="flex items-center gap-3 text-emerald-700">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <p className="font-semibold">Исследование завершено</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-red-600">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                  <p className="font-semibold">Завершено с ошибками</p>
                </div>
              )}

              <ProgressBar value={job.done} total={job.total} />

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 py-2 px-1">
                  <div className="font-bold text-emerald-700 text-base">{job.succeeded}</div>
                  <div className="text-emerald-600">Готово</div>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 py-2 px-1">
                  <div className="font-bold text-red-600 text-base">{job.failed}</div>
                  <div className="text-red-500">Ошибки</div>
                </div>
                <div className="rounded-lg bg-[var(--frox-gray-100)] border border-[var(--frox-neutral-border)] py-2 px-1">
                  <div className="font-bold text-[var(--frox-gray-700)] text-base">{job.skipped}</div>
                  <div className="text-[var(--frox-gray-500)]">Пропущено</div>
                </div>
              </div>

              {job.errors.length > 0 && (
                <details className="text-xs text-red-600">
                  <summary className="cursor-pointer font-medium">
                    Показать ошибки ({job.errors.length})
                  </summary>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto rounded-lg bg-red-50 border border-red-100 p-2">
                    {job.errors.map((e, i) => (
                      <div key={i} className="break-all">{e}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--frox-gray-200)] bg-[var(--frox-gray-100)]/60 flex justify-end gap-3">
          {step === 'configure' && (
            <>
              <Button variant="ghost" onClick={onClose}>Отмена</Button>
              <Button
                onClick={loadPreview}
                disabled={!canPreview || previewLoading}
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {previewLoading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Проверка…</>
                  : <><Filter className="w-4 h-4" /> Показать выборку</>
                }
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={() => setStep('configure')}>Назад</Button>
              <Button
                onClick={startResearch}
                disabled={!previewCount}
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Play className="w-4 h-4" />
                Запустить ({previewCount})
              </Button>
            </>
          )}

          {step === 'running' && (
            <p className="text-xs text-[var(--frox-gray-400)] self-center mr-auto">
              Идёт обработка…
            </p>
          )}

          {step === 'done' && (
            <Button onClick={onClose} className="bg-violet-600 hover:bg-violet-700 text-white">
              Закрыть
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
