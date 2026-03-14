'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Send, Loader2, User, Bot, Plus, Trash2, MessageSquare, Download, BarChart2, Star, X } from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import { MiniChart, extractChart, detectChartable } from './MiniChart';
import { getTableColumnKey, renderContactResultsTable } from './rendering';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  sqlResult?: Record<string, unknown>[];
  actionLog?: string[];
  contactIds?: string[];   // контакты, упомянутые в этом сообщении
  contacts?: Array<{ id: string; full_name: string }>;
  question?: string;       // вопрос пользователя, к которому относится ответ
}

type DigestPeriod = 'today' | 'week' | 'month';

interface SavedQuery {
  id: string;
  text: string;
  label: string;
  createdAt: string;
  usageCount: number;
  lastUsedAt: string;
}

const SAVED_QUERIES_KEY = 'ai-assistant-saved-queries';

function useSavedQueries() {
  const [queries, setQueries] = useState<SavedQuery[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_QUERIES_KEY) || '[]'); }
    catch { return []; }
  });

  function save(text: string) {
    if (queries.some(q => q.text === text)) return;
    const newQuery: SavedQuery = {
      id: crypto.randomUUID(), text,
      label: text.slice(0, 50),
      createdAt: new Date().toISOString(),
      usageCount: 0, lastUsedAt: new Date().toISOString(),
    };
    const updated = [newQuery, ...queries].slice(0, 20);
    setQueries(updated);
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(updated));
  }

  function remove(id: string) {
    const updated = queries.filter(q => q.id !== id);
    setQueries(updated);
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(updated));
  }

  function recordUsage(id: string) {
    const updated = queries.map(q =>
      q.id === id ? { ...q, usageCount: q.usageCount + 1, lastUsedAt: new Date().toISOString() } : q
    );
    setQueries(updated);
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(updated));
  }

  const isSaved = (text: string) => queries.some(q => q.text === text);

  return { queries, save, remove, recordUsage, isSaved };
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  const bom = '\uFEFF';
  const csv = bom + toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'ai-assistant-sessions';
const ACTIVE_SESSION_KEY = 'ai-assistant-active-session';
const EMPTY_MESSAGES: ChatMessage[] = [];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadSessions(): ChatSession[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch { /* ignore */ }
}

function loadActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch { /* ignore */ }
  return null;
}

function saveActiveSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_SESSION_KEY, id);
    else localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch { /* ignore */ }
}

/** Derive session title from first user message */
function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'Новый чат';
  const text = first.content.trim();
  return text.length > 50 ? text.slice(0, 47) + '...' : text;
}

const EXAMPLE_PROMPTS = [
  'Сколько всего контактов в базе?',
  'Топ-10 городов по количеству контактов',
  'Контакты без email и телефона',
  'Статистика по тегам',
  'Кто добавлен за последнюю неделю?',
  'Сколько заявок за этот месяц?',
];

const DIGEST_PERIOD_LABELS: Record<DigestPeriod, string> = {
  today: 'сегодня',
  week: 'за неделю',
  month: 'за месяц',
};

function renderMarkdown(text: string, options?: { sqlResult?: Record<string, unknown>[] }): string {
  const lines = text.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Fenced code blocks (```lang ... ```)
    if (/^```/.test(line.trim())) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const escaped = codeLines.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const label = lang ? `<span style="font-size:0.8em;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em">${lang}</span>` : '';
      output.push(`<div style="margin:8px 0;border-radius:8px;overflow:hidden;border:1px solid var(--frox-gray-200)">${label ? `<div style="padding:4px 12px;background:var(--frox-gray-100)">${label}</div>` : ''}<pre style="margin:0;padding:10px 12px;background:#1e1e2e;color:#cdd6f4;overflow-x:auto;font-size:0.88em;font-family:monospace;line-height:1.5">${escaped}</pre></div>`);
      continue;
    }
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter(l => !/^\s*\|[\s\-|:]+\|\s*$/.test(l));
      if (rows.length > 0) {
        const headerCells = rows[0].split('|').slice(1, -1).map(c => c.trim());
        const sqlRows = options?.sqlResult ?? [];
        const canRenderContactsTable = sqlRows.length > 0
          && sqlRows.every(row => typeof row.id === 'string' && typeof row.full_name === 'string')
          && headerCells.some(cell => getTableColumnKey(cell) === 'full_name');

        if (canRenderContactsTable) {
          const markdownRows = rows.slice(1).map(row => row.split('|').slice(1, -1).map(cell => cell.trim()));
          output.push(renderContactResultsTable(headerCells, sqlRows, markdownRows));
        } else {
          let tableHtml = '<table style="border-collapse:collapse;width:100%;font-size:0.85em;margin:8px 0">';
          rows.forEach((row, idx) => {
            const cells = row.split('|').slice(1, -1).map(c => c.trim());
            const tag = idx === 0 ? 'th' : 'td';
            const style = idx === 0
              ? 'style="background:var(--frox-gray-50,#f9fafb);font-weight:600;padding:6px 10px;border:1px solid var(--frox-gray-200,#e5e7eb);text-align:left"'
              : 'style="padding:5px 10px;border:1px solid var(--frox-gray-200,#e5e7eb)"';
            tableHtml += `<tr>${cells.map(c => `<${tag} ${style}>${c}</${tag}>`).join('')}</tr>`;
          });
          tableHtml += '</table>';
          output.push(tableHtml);
        }
      }
      continue;
    }
    if (/^### (.+)$/.test(line)) {
      output.push(`<h3 style="font-size:1em;font-weight:600;margin:10px 0 4px">${line.replace(/^### /, '')}</h3>`);
    } else if (/^## (.+)$/.test(line)) {
      output.push(`<h2 style="font-size:1.1em;font-weight:600;margin:12px 0 4px">${line.replace(/^## /, '')}</h2>`);
    } else if (/^# (.+)$/.test(line)) {
      output.push(`<h1 style="font-size:1.2em;font-weight:700;margin:12px 0 4px">${line.replace(/^# /, '')}</h1>`);
    } else if (/^[-*] (.+)$/.test(line)) {
      const items: string[] = [line.replace(/^[-*] /, '')];
      i++;
      while (i < lines.length && /^[-*] (.+)$/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ''));
        i++;
      }
      output.push(`<ul style="margin:4px 0;padding-left:20px">${items.map(it => `<li style="margin:2px 0">${inlineFormat(it)}</li>`).join('')}</ul>`);
      continue;
    } else if (/^\d+\. (.+)$/.test(line)) {
      const items: string[] = [line.replace(/^\d+\. /, '')];
      i++;
      while (i < lines.length && /^\d+\. (.+)$/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      output.push(`<ol style="margin:4px 0;padding-left:20px">${items.map(it => `<li style="margin:2px 0">${inlineFormat(it)}</li>`).join('')}</ol>`);
      continue;
    } else if (line.trim() === '') {
      output.push('<br>');
    } else {
      output.push(`<p style="margin:4px 0">${inlineFormat(line)}</p>`);
    }
    i++;
  }

  return output.join('');
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:var(--frox-gray-100,#f3f4f6);padding:1px 4px;border-radius:3px;font-size:0.9em">$1</code>');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLinkableContactsFromRows(rows?: Record<string, unknown>[]): Array<{ id: string; full_name: string }> {
  if (!rows?.length) return [];

  const normalized = rows.map(row => ({
    id: typeof row.id === 'string' ? row.id : '',
    full_name: typeof row.full_name === 'string' ? row.full_name.trim() : '',
  }));

  if (normalized.some(contact => !contact.id || !contact.full_name)) {
    return [];
  }

  return normalized
    .filter((contact, index, arr) => arr.findIndex(item => item.id === contact.id) === index)
    .sort((a, b) => b.full_name.length - a.full_name.length);
}

function linkifyContactNames(text: string, contacts: Array<{ id: string; full_name: string }>): string {
  if (!contacts.length) return text;

  let output = text;

  for (const contact of contacts) {
    const escapedName = escapeRegExp(contact.full_name);
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}_>/"'=])(${escapedName})(?=$|[^\\p{L}\\p{N}_<])`, 'gu');

    output = output.replace(
      regex,
      (_, prefix: string, match: string) =>
        `${prefix}<a href="/contacts/${contact.id}" style="color:var(--frox-blue);text-decoration:none;font-weight:600;border-bottom:1px solid rgba(59,130,246,0.35)">${match}</a>`
    );
  }

  return output;
}

export default function AiAssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveActionLog, setLiveActionLog] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [digestPeriod, setDigestPeriod] = useState<DigestPeriod>('today');
  const [showSaved, setShowSaved] = useState(false);
  const savedDropdownRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);
  const { queries: savedQueries, save: saveQuery, remove: removeQuery, recordUsage, isSaved } = useSavedQueries();

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession?.messages ?? EMPTY_MESSAGES;

  // Load on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const saved = loadSessions();
      setSessions(saved);
      const savedActiveId = loadActiveSessionId();
      if (savedActiveId && saved.some(s => s.id === savedActiveId)) {
        setActiveSessionId(savedActiveId);
      }
      // Migrate old single-chat history
      try {
        const oldHistory = localStorage.getItem('ai-assistant-chat-history');
        if (oldHistory) {
          const oldMessages = JSON.parse(oldHistory) as ChatMessage[];
          if (oldMessages.length > 0) {
            const migrated: ChatSession = {
              id: generateId(),
              title: deriveTitle(oldMessages),
              messages: oldMessages,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            const updated = [migrated, ...saved];
            setSessions(updated);
            setActiveSessionId(migrated.id);
            saveSessions(updated);
            saveActiveSessionId(migrated.id);
          }
          localStorage.removeItem('ai-assistant-chat-history');
        }
      } catch { /* ignore */ }
    }
  }, []);

  // Persist sessions
  useEffect(() => {
    if (initializedRef.current) saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (initializedRef.current) saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!showSaved) return;
    function handleClick(e: MouseEvent) {
      if (savedDropdownRef.current && !savedDropdownRef.current.contains(e.target as Node)) {
        setShowSaved(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSaved]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const syncViewport = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  const updateSessionMessages = useCallback((sessionId: string, newMessages: ChatMessage[]) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, messages: newMessages, title: deriveTitle(newMessages), updatedAt: Date.now() }
        : s
    ));
  }, []);

  function createNewSession() {
    const session: ChatSession = {
      id: generateId(),
      title: 'Новый чат',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    setInput('');
    if (isMobile) setSidebarOpen(false);
  }

  function deleteSession(id: string) {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
    setDeletingId(null);
  }

  function switchSession(id: string) {
    setActiveSessionId(id);
    setInput('');
    if (isMobile) setSidebarOpen(false);
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    let sessionId = activeSessionId;

    // Auto-create session if none active
    if (!sessionId) {
      const session: ChatSession = {
        id: generateId(),
        title: 'Новый чат',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions(prev => [session, ...prev]);
      sessionId = session.id;
      setActiveSessionId(session.id);
    }

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    updateSessionMessages(sessionId, newMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);
    setLiveActionLog([]);

    const capturedSessionId = sessionId;

    try {
      const response = await adminCsrfFetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json() as { error?: string };
        updateSessionMessages(capturedSessionId, [...newMessages, {
          role: 'assistant',
          content: `❌ Ошибка: ${data.error || 'Что-то пошло не так'}`,
        }]);
        return;
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          let eventName = '';
          let eventData = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            if (line.startsWith('data: ')) eventData = line.slice(6).trim();
          }
          if (!eventName || !eventData) continue;

          try {
            const parsed = JSON.parse(eventData) as Record<string, unknown>;

            if (eventName === 'action') {
              setLiveActionLog(prev => [...prev, String(parsed.text || '')]);
            } else if (eventName === 'reply') {
              const actionLog = (parsed.actionsPerformed as string[] | undefined) ?? [];
              const contactIds = (parsed.contactIds as string[] | undefined) ?? [];
              const contacts = (
                parsed.contacts as Array<{ id?: string; full_name?: string }> | undefined
              )?.filter(contact => contact.id && contact.full_name)
                .map(contact => ({
                  id: String(contact.id),
                  full_name: String(contact.full_name),
                })) ?? [];
              const sqlResult = (parsed.sqlResult as Record<string, unknown>[] | undefined) ?? undefined;
              const lastUserContent = newMessages.findLast(m => m.role === 'user')?.content ?? '';
              updateSessionMessages(capturedSessionId, [...newMessages, {
                role: 'assistant',
                content: String(parsed.reply || ''),
                sql: parsed.sql ? String(parsed.sql) : undefined,
                sqlResult: sqlResult && sqlResult.length > 0 ? sqlResult : undefined,
                actionLog,
                contactIds: contactIds.length > 0 ? contactIds : undefined,
                contacts: contacts.length > 0 ? contacts : undefined,
                question: contactIds.length > 0 ? lastUserContent : undefined,
              }]);
              setLiveActionLog([]);
            } else if (eventName === 'error') {
              updateSessionMessages(capturedSessionId, [...newMessages, {
                role: 'assistant',
                content: `❌ Ошибка: ${String(parsed.error || 'Что-то пошло не так')}`,
              }]);
              setLiveActionLog([]);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      updateSessionMessages(capturedSessionId, [...newMessages, {
        role: 'assistant',
        content: '❌ Ошибка сети. Попробуйте снова.',
      }]);
      setLiveActionLog([]);
    } finally {
      setLoading(false);
      setLiveActionLog([]);
    }
  }

  async function runDigest(period: DigestPeriod) {
    if (loading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      const session: ChatSession = {
        id: generateId(),
        title: 'Новый чат',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions(prev => [session, ...prev]);
      sessionId = session.id;
      setActiveSessionId(session.id);
    }

    const periodLabel = DIGEST_PERIOD_LABELS[period];
    const userMsg: ChatMessage = { role: 'user', content: `📊 Аналитический дайджест ${periodLabel}` };
    const newMessages: ChatMessage[] = [userMsg];
    updateSessionMessages(sessionId, newMessages);
    setLoading(true);
    setLiveActionLog(['📊 Собираю данные из базы...']);

    const capturedSessionId = sessionId;

    try {
      const response = await adminCsrfFetch('/api/admin/ai-assistant/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const data = await response.json() as { reply?: string; error?: string };
      updateSessionMessages(capturedSessionId, [...newMessages, {
        role: 'assistant',
        content: data.reply || `❌ Ошибка: ${data.error || 'Что-то пошло не так'}`,
      }]);
    } catch {
      updateSessionMessages(capturedSessionId, [...newMessages, {
        role: 'assistant',
        content: '❌ Ошибка сети. Попробуйте снова.',
      }]);
    } finally {
      setLoading(false);
      setLiveActionLog([]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const showSidebar = sidebarOpen;

  return (
    <div className="ai-assistant-root" style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {isMobile && showSidebar && (
        <button
          type="button"
          aria-label="Закрыть список чатов"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            border: 'none',
            background: 'rgba(15, 23, 42, 0.42)',
            zIndex: 39,
          }}
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div
          className="ai-sidebar"
          style={{
            width: isMobile ? 'min(84vw, 320px)' : 260,
            flexShrink: 0,
            borderRight: '1px solid var(--frox-gray-200)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--frox-gray-50, #f9fafb)',
            ...(isMobile
              ? {
                  position: 'fixed',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  zIndex: 40,
                  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
                }
              : {}),
          }}
        >
          {/* Sidebar header */}
          <div style={{
            padding: isMobile ? '16px 14px 10px' : '12px 12px 8px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                title="Закрыть"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid var(--frox-gray-200)',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            )}
            <button
              onClick={createNewSession}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: isMobile ? '12px 14px' : '8px 12px', borderRadius: 14,
                border: '1px solid var(--frox-gray-200)',
                background: 'white', cursor: 'pointer',
                fontSize: isMobile ? '0.92em' : '0.85em', fontWeight: 600, color: 'var(--frox-gray-700)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--frox-blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--frox-gray-200)'; }}
            >
              <Plus size={14} />
              Новый чат
            </button>
          </div>

          {/* Session list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
            {sortedSessions.length === 0 && (
              <p style={{ textAlign: 'center', fontSize: '0.8em', color: 'var(--frox-gray-400)', padding: '20px 0' }}>
                Нет сохранённых чатов
              </p>
            )}
            {sortedSessions.map(session => (
              <div
                key={session.id}
                onClick={() => switchSession(session.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  marginBottom: 2,
                  background: session.id === activeSessionId ? 'white' : 'transparent',
                  border: session.id === activeSessionId ? '1px solid var(--frox-gray-200)' : '1px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  if (session.id !== activeSessionId) e.currentTarget.style.background = 'rgba(255,255,255,0.6)';
                }}
                onMouseLeave={e => {
                  if (session.id !== activeSessionId) e.currentTarget.style.background = 'transparent';
                }}
              >
                <MessageSquare size={14} color="var(--frox-gray-400)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.83em', fontWeight: session.id === activeSessionId ? 600 : 400,
                    color: 'var(--frox-gray-800)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {session.title}
                  </div>
                  <div style={{ fontSize: '0.7em', color: 'var(--frox-gray-400)', marginTop: 1 }}>
                    {session.messages.length} сообщ. · {new Date(session.updatedAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                {/* Delete button */}
                {deletingId === session.id ? (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => deleteSession(session.id)}
                      style={{
                        padding: '2px 8px', fontSize: '0.75em', borderRadius: 4,
                        border: '1px solid #ef4444', background: '#fef2f2', color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      Да
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      style={{
                        padding: '2px 8px', fontSize: '0.75em', borderRadius: 4,
                        border: '1px solid var(--frox-gray-200)', background: 'white',
                        color: 'var(--frox-gray-600)', cursor: 'pointer',
                      }}
                    >
                      Нет
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setDeletingId(session.id); }}
                    style={{
                      padding: 4, border: 'none', background: 'transparent',
                      cursor: 'pointer', borderRadius: 4, flexShrink: 0,
                      opacity: 0.4, transition: 'opacity 0.15s',
                      display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
                  >
                    <Trash2 size={13} color="var(--frox-gray-500)" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

        {/* Main chat area */}
      <div className="ai-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
        {/* Header */}
        <div className="ai-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '12px 14px' : '12px 24px', borderBottom: '1px solid var(--frox-gray-200)',
          flexShrink: 0,
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              title={sidebarOpen ? 'Скрыть панель' : 'Показать панель'}
              style={{
                width: isMobile ? 40 : 'auto', height: isMobile ? 40 : 'auto',
                padding: isMobile ? 0 : 6, border: 'none', background: isMobile ? 'var(--frox-gray-100)' : 'transparent',
                cursor: 'pointer', borderRadius: 10, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--frox-gray-500)',
                flexShrink: 0,
              }}
            >
              <MessageSquare size={18} />
            </button>
            {!isMobile && <Sparkles size={18} color="var(--frox-blue)" />}
            <h1 style={{
              fontSize: isMobile ? '0.95em' : '1em',
              fontWeight: 600,
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {activeSession?.title || 'AI Ассистент'}
            </h1>
          </div>
          <div className="ai-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Saved queries dropdown */}
            <div ref={savedDropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSaved(v => !v)}
                title="Сохранённые запросы"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 10px', borderRadius: 8,
                  border: '1px solid var(--frox-gray-200)',
                  background: showSaved ? 'var(--frox-gray-50)' : 'white',
                  cursor: 'pointer', fontSize: '0.85em', color: 'var(--frox-gray-600)',
                }}
              >
                <Star size={14} fill={savedQueries.length > 0 ? '#f59e0b' : 'none'} color={savedQueries.length > 0 ? '#f59e0b' : 'currentColor'} />
                {savedQueries.length > 0 && <span style={{ fontSize: '0.85em', fontWeight: 600 }}>{savedQueries.length}</span>}
              </button>
              {showSaved && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50,
                  background: 'white', border: '1px solid var(--frox-gray-200)',
                  borderRadius: 12, width: isMobile ? 'min(320px, calc(100vw - 32px))' : 320, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  maxHeight: 400, overflowY: 'auto',
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--frox-gray-100)', fontSize: '0.8em', color: 'var(--frox-gray-500)' }}>
                    Сохранённые запросы
                  </div>
                  {savedQueries.length === 0 ? (
                    <p style={{ padding: '16px 14px', color: 'var(--frox-gray-400)', fontSize: '0.875em', margin: 0 }}>
                      Нет сохранённых запросов
                    </p>
                  ) : (
                    [...savedQueries]
                      .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
                      .map(q => (
                        <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--frox-gray-50)' }}>
                          <button
                            onClick={() => { sendMessage(q.text); recordUsage(q.id); setShowSaved(false); }}
                            style={{ flex: 1, textAlign: 'left', fontSize: '0.875em', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--frox-gray-800)', padding: 0 }}
                          >
                            {q.label}
                          </button>
                          {q.usageCount > 0 && (
                            <span style={{ fontSize: '0.75em', color: 'var(--frox-gray-400)', flexShrink: 0 }}>{q.usageCount}×</span>
                          )}
                          <button
                            onClick={() => removeQuery(q.id)}
                            style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', color: 'var(--frox-gray-400)', flexShrink: 0 }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
            <div className="ai-digest-control" style={{ display: 'flex', border: '1px solid var(--frox-gray-200)', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
              <button
                onClick={() => runDigest(digestPeriod)}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: isMobile ? '10px 12px' : '6px 12px', border: 'none', borderRight: '1px solid var(--frox-gray-200)',
                  background: 'white', cursor: loading ? 'default' : 'pointer',
                  fontSize: '0.85em', color: loading ? 'var(--frox-gray-400)' : 'var(--frox-gray-600)',
                }}
              >
                <BarChart2 size={14} />
                {!isMobile && 'Дайджест'}
              </button>
              <select
                value={digestPeriod}
                onChange={e => setDigestPeriod(e.target.value as DigestPeriod)}
                disabled={loading}
                style={{
                  padding: isMobile ? '10px 10px' : '6px 8px', border: 'none', background: 'white',
                  fontSize: '0.85em', color: 'var(--frox-gray-600)', cursor: 'pointer',
                  outline: 'none',
                  minWidth: isMobile ? 0 : undefined,
                }}
              >
                <option value="today">Сегодня</option>
                <option value="week">За неделю</option>
                <option value="month">За месяц</option>
              </select>
            </div>
            <button
              onClick={createNewSession}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: isMobile ? '10px 12px' : '6px 12px', borderRadius: 12, border: '1px solid var(--frox-gray-200)',
                background: 'white', cursor: 'pointer', fontSize: '0.85em', color: 'var(--frox-gray-600)',
              }}
            >
              <Plus size={14} />
              {!isMobile && 'Новый чат'}
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="ai-messages" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 12px' : '16px 24px', minHeight: 0, minWidth: 0 }}>
          {messages.length === 0 ? (
            <WelcomeScreen onExample={text => sendMessage(text)} isMobile={isMobile} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16, maxWidth: 800, margin: '0 auto', width: '100%' }}>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  onQuickReply={loading ? undefined : (text) => sendMessage(text)}
                  onSaveQuery={saveQuery}
                  isSaved={isSaved}
                  isMobile={isMobile}
                />
              ))}
              {loading && <LiveActionLog log={liveActionLog} isMobile={isMobile} />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="ai-composer-shell" style={{
          padding: isMobile ? '10px 12px calc(12px + env(safe-area-inset-bottom))' : '12px 24px 16px',
          borderTop: '1px solid var(--frox-gray-200)',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(14px)',
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            maxWidth: 800, margin: '0 auto',
            border: '1px solid var(--frox-gray-200)', borderRadius: isMobile ? 18 : 16,
            padding: isMobile ? '10px' : '8px 8px 8px 16px',
            background: 'white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder="Задайте вопрос по базе данных..."
              disabled={loading}
              rows={1}
              style={{
                flex: 1, border: 'none', outline: 'none', resize: 'none',
                fontSize: isMobile ? '16px' : '0.95em', lineHeight: 1.5, background: 'transparent',
                fontFamily: 'inherit', minHeight: 24, maxHeight: 120,
                color: 'var(--frox-gray-900)',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: isMobile ? 44 : 36, height: isMobile ? 44 : 36, borderRadius: 12, border: 'none',
                background: input.trim() && !loading ? 'var(--frox-blue)' : 'var(--frox-gray-200)',
                color: input.trim() && !loading ? 'white' : 'var(--frox-gray-400)',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: isMobile ? '0.7em' : '0.75em', color: 'var(--frox-gray-400)', marginTop: 8 }}>
            Enter — отправить · Shift+Enter — новая строка
          </p>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }

          .ai-assistant-root {
            overflow: hidden;
            position: relative;
          }

          @media (max-width: 900px) {
            .ai-header {
              align-items: flex-start;
              flex-direction: column;
            }

            .ai-toolbar {
              width: 100%;
              justify-content: space-between !important;
            }

            .ai-digest-control {
              flex: 1 1 auto;
              min-width: 0;
            }
          }

          @media (max-width: 640px) {
            .ai-toolbar {
              gap: 8px !important;
            }

            .ai-messages {
              scroll-padding-bottom: 120px;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function WelcomeScreen({ onExample, isMobile = false }: { onExample: (text: string) => void; isMobile?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: isMobile ? 10 : 40, gap: isMobile ? 18 : 24, width: '100%' }}>
      <div style={{
        width: isMobile ? 56 : 64, height: isMobile ? 56 : 64, borderRadius: 20,
        background: 'linear-gradient(135deg,#e8f0fe,#c7d7fd)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={isMobile ? 28 : 32} color="var(--frox-blue)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: isMobile ? '1.15em' : '1.3em', fontWeight: 700, margin: '0 0 6px' }}>AI Ассистент</h2>
        <p style={{ color: 'var(--frox-gray-500)', margin: 0, fontSize: isMobile ? '0.9em' : '0.95em', maxWidth: 480 }}>
          Задавайте вопросы по базе контактов, заявок, аналитике
        </p>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, maxWidth: 560, width: '100%',
      }}>
        {EXAMPLE_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => onExample(prompt)}
            style={{
              padding: isMobile ? '14px 16px' : '12px 16px', borderRadius: 14,
              border: '1px solid var(--frox-gray-200)',
              background: 'white', cursor: 'pointer',
              textAlign: 'left', fontSize: isMobile ? '0.92em' : '0.875em',
              color: 'var(--frox-gray-700)',
              lineHeight: 1.4,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--frox-blue)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--frox-gray-50)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--frox-gray-200)';
              (e.currentTarget as HTMLButtonElement).style.background = 'white';
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Extract [[btn:...]] buttons from message content */
function extractButtons(content: string): { text: string; buttons: string[] } {
  const buttons: string[] = [];
  const text = content.replace(/\[\[btn:(.+?)\]\]/g, (_, label) => {
    buttons.push(label.trim());
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return {
    text,
    buttons: buttons.filter(label => !label.startsWith('Показать карточку ')),
  };
}

function MessageBubble({ message, isLast, onQuickReply, onSaveQuery, isSaved, isMobile = false }: {
  message: ChatMessage;
  isLast?: boolean;
  onQuickReply?: (text: string) => void;
  onSaveQuery?: (text: string) => void;
  isSaved?: (text: string) => boolean;
  isMobile?: boolean;
}) {
  const isUser = message.role === 'user';
  const { text, buttons } = isUser ? { text: message.content, buttons: [] } : extractButtons(message.content);
  const { text: cleanText, chart } = isUser ? { text, chart: null } : extractChart(text);
  const autoChart = (!chart && message.sqlResult) ? detectChartable(message.sqlResult) : null;
  const showButtons = isLast && buttons.length > 0 && onQuickReply;
  const [noteSaved, setNoteSaved] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const saved = isUser && isSaved ? isSaved(message.content) : false;
  const linkableContacts = getLinkableContactsFromRows(message.sqlResult);
  const renderedAssistantHtml = isUser ? '' : renderMarkdown(linkifyContactNames(cleanText, linkableContacts), {
    sqlResult: linkableContacts.length > 0 ? message.sqlResult : undefined,
  });

  const handleSaveNote = async () => {
    if (!message.contactIds?.length) return;
    setNoteSaved('saving');
    try {
      const res = await adminCsrfFetch('/api/admin/ai-assistant/save-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contactIds: message.contactIds,
          question: message.question ?? '',
          reply: message.content,
        }),
      });
      setNoteSaved(res.ok ? 'done' : 'error');
    } catch {
      setNoteSaved('error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: isMobile ? 8 : 10, alignItems: 'flex-start',
      width: '100%',
    }}>
      <div style={{
        width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 10, flexShrink: 0,
        background: isUser ? 'var(--frox-blue)' : 'var(--frox-gray-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser
          ? <User size={isMobile ? 14 : 16} color="white" />
          : <Bot size={isMobile ? 14 : 16} color="var(--frox-gray-600)" />
        }
      </div>

      <div style={{ maxWidth: isMobile ? 'calc(100% - 36px)' : '85%', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        {/* Action log (автоматически выполненные действия) */}
        {!isUser && message.actionLog && message.actionLog.length > 0 && (
          <div style={{
            padding: '8px 12px', borderRadius: 10,
            background: 'var(--frox-gray-50)',
            border: '1px solid var(--frox-gray-200)',
            fontSize: '0.78em', color: 'var(--frox-gray-500)',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {message.actionLog.map((action, i) => (
              <div key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(action) }} />
            ))}
          </div>
        )}

        <div style={{
          padding: isMobile ? '10px 12px' : '10px 14px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'var(--frox-gray-100)' : 'white',
          border: isUser ? 'none' : '1px solid var(--frox-gray-200)',
          fontSize: isMobile ? '0.92em' : '0.9em',
          lineHeight: 1.6,
          overflowX: 'auto',
        }}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderedAssistantHtml }} />
          )}
        </div>

        {/* Chart (from AI chart block or auto-detected from sqlResult) */}
        {!isUser && (chart || autoChart) && (
          <div style={{
            padding: '10px 14px', borderRadius: '4px 16px 16px 16px',
            background: 'white', border: '1px solid var(--frox-gray-200)',
            fontSize: '0.9em',
          }}>
            <MiniChart data={(chart || autoChart)!} />
          </div>
        )}

        {/* Star button for user messages */}
        {isUser && onSaveQuery && (
          <button
            onClick={() => onSaveQuery(message.content)}
            title={saved ? 'Уже в избранном' : 'Сохранить запрос'}
            disabled={saved}
            style={{
              alignSelf: 'flex-end',
              padding: '3px 8px', borderRadius: 6, fontSize: '0.75em',
              border: '1px solid var(--frox-gray-200)',
              background: 'white', cursor: saved ? 'default' : 'pointer',
              color: saved ? '#f59e0b' : 'var(--frox-gray-400)',
              display: 'flex', alignItems: 'center', gap: 4,
              opacity: saved ? 1 : 0.6,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!saved) e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { if (!saved) e.currentTarget.style.opacity = '0.6'; }}
          >
            <Star size={11} fill={saved ? '#f59e0b' : 'none'} color={saved ? '#f59e0b' : 'currentColor'} />
            {saved ? 'В избранном' : 'Сохранить'}
          </button>
        )}

        {/* Quick reply buttons */}
        {showButtons && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {buttons.map((label, i) => (
              <button
                key={i}
                onClick={() => onQuickReply(label)}
                style={{
                  padding: isMobile ? '9px 14px' : '6px 14px', borderRadius: 18,
                  border: '1px solid var(--frox-blue)',
                  background: 'white', cursor: 'pointer',
                  fontSize: isMobile ? '0.86em' : '0.83em', color: 'var(--frox-blue)',
                  fontWeight: 500, lineHeight: 1.3,
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--frox-blue)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = 'var(--frox-blue)';
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {message.sqlResult && message.sqlResult.length > 0 && (
          <button
            onClick={() => downloadCSV(
              message.sqlResult!,
              `export-${new Date().toISOString().slice(0, 10)}.csv`
            )}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8, fontSize: '0.8em',
              border: '1px solid var(--frox-gray-200)',
              background: 'white', cursor: 'pointer',
              color: 'var(--frox-gray-600)',
              width: 'fit-content',
            }}
          >
            <Download size={13} />
            Скачать CSV ({message.sqlResult.length} строк)
          </button>
        )}

        {!isUser && message.contactIds && message.contactIds.length > 0 && (
          <button
            onClick={handleSaveNote}
            disabled={noteSaved === 'saving' || noteSaved === 'done'}
            style={{
              alignSelf: 'flex-start',
              padding: '5px 12px', borderRadius: 8, fontSize: '0.78em',
              border: '1px solid',
              borderColor: noteSaved === 'done' ? '#22c55e' : noteSaved === 'error' ? '#ef4444' : 'var(--frox-gray-300)',
              background: noteSaved === 'done' ? '#f0fdf4' : noteSaved === 'error' ? '#fef2f2' : 'white',
              color: noteSaved === 'done' ? '#16a34a' : noteSaved === 'error' ? '#dc2626' : 'var(--frox-gray-500)',
              cursor: noteSaved === 'saving' || noteSaved === 'done' ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            {noteSaved === 'saving' && '⏳ Сохраняю...'}
            {noteSaved === 'done' && '✅ Сохранено в заметки'}
            {noteSaved === 'error' && '❌ Ошибка сохранения'}
            {noteSaved === 'idle' && '📝 Сохранить как заметку'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Живой лог действий во время обработки */
function LiveActionLog({ log, isMobile = false }: { log: string[]; isMobile?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: isMobile ? 8 : 10, alignItems: 'flex-start', width: '100%' }}>
      <div style={{
        width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 10, flexShrink: 0,
        background: 'var(--frox-gray-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bot size={isMobile ? 14 : 16} color="var(--frox-gray-600)" />
      </div>
      <div style={{
        padding: isMobile ? '10px 12px' : '10px 14px', borderRadius: '4px 16px 16px 16px',
        background: 'white', border: '1px solid var(--frox-gray-200)',
        minWidth: 200,
        width: isMobile ? 'calc(100% - 36px)' : 'auto',
      }}>
        {log.length === 0 ? (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--frox-gray-400)',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {log.map((line, i) => (
              <div key={i} style={{
                fontSize: '0.82em', color: i === log.length - 1 ? 'var(--frox-gray-700)' : 'var(--frox-gray-400)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {i === log.length - 1 && (
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--frox-blue)', flexShrink: 0, animation: 'pulse 1s ease-in-out infinite' }} />
                )}
                <span dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
