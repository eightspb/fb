'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, Send, Loader2, User, Bot, Plus, Trash2, MessageSquare } from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  actionLog?: string[];
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

function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter(l => !/^\s*\|[\s\-|:]+\|\s*$/.test(l));
      if (rows.length > 0) {
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

export default function AiAssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveActionLog, setLiveActionLog] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

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
              updateSessionMessages(capturedSessionId, [...newMessages, {
                role: 'assistant',
                content: String(parsed.reply || ''),
                sql: parsed.sql ? String(parsed.sql) : undefined,
                actionLog,
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width: 260, flexShrink: 0, borderRight: '1px solid var(--frox-gray-200)',
          display: 'flex', flexDirection: 'column', background: 'var(--frox-gray-50, #f9fafb)',
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: '12px 12px 8px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <button
              onClick={createNewSession}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 10,
                border: '1px solid var(--frox-gray-200)',
                background: 'white', cursor: 'pointer',
                fontSize: '0.85em', fontWeight: 500, color: 'var(--frox-gray-700)',
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', borderBottom: '1px solid var(--frox-gray-200)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              title={sidebarOpen ? 'Скрыть панель' : 'Показать панель'}
              style={{
                padding: 6, border: 'none', background: 'transparent',
                cursor: 'pointer', borderRadius: 6, display: 'flex',
                color: 'var(--frox-gray-500)',
              }}
            >
              <MessageSquare size={18} />
            </button>
            <Sparkles size={18} color="var(--frox-blue)" />
            <h1 style={{ fontSize: '1em', fontWeight: 600, margin: 0 }}>
              {activeSession?.title || 'AI Ассистент'}
            </h1>
          </div>
          <button
            onClick={createNewSession}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, border: '1px solid var(--frox-gray-200)',
              background: 'white', cursor: 'pointer', fontSize: '0.85em', color: 'var(--frox-gray-600)',
            }}
          >
            <Plus size={14} />
            Новый чат
          </button>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', minHeight: 0 }}>
          {messages.length === 0 ? (
            <WelcomeScreen onExample={text => sendMessage(text)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  onQuickReply={loading ? undefined : (text) => sendMessage(text)}
                />
              ))}
              {loading && <LiveActionLog log={liveActionLog} />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{
          padding: '12px 24px 16px',
          borderTop: '1px solid var(--frox-gray-200)',
          flexShrink: 0,
          background: 'white',
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            maxWidth: 800, margin: '0 auto',
            border: '1px solid var(--frox-gray-200)', borderRadius: 16,
            padding: '8px 8px 8px 16px',
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
                fontSize: '0.95em', lineHeight: 1.5, background: 'transparent',
                fontFamily: 'inherit', minHeight: 24, maxHeight: 120,
                color: 'var(--frox-gray-900)',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
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
          <p style={{ textAlign: 'center', fontSize: '0.75em', color: 'var(--frox-gray-400)', marginTop: 8 }}>
            Enter — отправить · Shift+Enter — новая строка
          </p>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
      </div>
    </div>
  );
}

function WelcomeScreen({ onExample }: { onExample: (text: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 24 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'linear-gradient(135deg,#e8f0fe,#c7d7fd)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={32} color="var(--frox-blue)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.3em', fontWeight: 700, margin: '0 0 6px' }}>AI Ассистент</h2>
        <p style={{ color: 'var(--frox-gray-500)', margin: 0, fontSize: '0.95em' }}>
          Задавайте вопросы по базе контактов, заявок, аналитике
        </p>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, width: '100%',
      }}>
        {EXAMPLE_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => onExample(prompt)}
            style={{
              padding: '12px 16px', borderRadius: 12,
              border: '1px solid var(--frox-gray-200)',
              background: 'white', cursor: 'pointer',
              textAlign: 'left', fontSize: '0.875em',
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
  return { text, buttons };
}

function MessageBubble({ message, isLast, onQuickReply }: {
  message: ChatMessage;
  isLast?: boolean;
  onQuickReply?: (text: string) => void;
}) {
  const isUser = message.role === 'user';
  const { text, buttons } = isUser ? { text: message.content, buttons: [] } : extractButtons(message.content);
  const showButtons = isLast && buttons.length > 0 && onQuickReply;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: isUser ? 'var(--frox-blue)' : 'var(--frox-gray-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser
          ? <User size={16} color="white" />
          : <Bot size={16} color="var(--frox-gray-600)" />
        }
      </div>

      <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          padding: '10px 14px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'var(--frox-gray-100)' : 'white',
          border: isUser ? 'none' : '1px solid var(--frox-gray-200)',
          fontSize: '0.9em',
          lineHeight: 1.6,
        }}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
          )}
        </div>

        {/* Quick reply buttons */}
        {showButtons && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {buttons.map((label, i) => (
              <button
                key={i}
                onClick={() => onQuickReply(label)}
                style={{
                  padding: '6px 14px', borderRadius: 18,
                  border: '1px solid var(--frox-blue)',
                  background: 'white', cursor: 'pointer',
                  fontSize: '0.83em', color: 'var(--frox-blue)',
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

        {message.sql && (
          <details style={{
            border: '1px solid var(--frox-gray-200)',
            borderRadius: 10, overflow: 'hidden', fontSize: '0.8em',
          }}>
            <summary style={{
              padding: '6px 12px', cursor: 'pointer',
              background: 'var(--frox-gray-50)', color: 'var(--frox-gray-600)',
              userSelect: 'none', listStyle: 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ▶ SQL запрос
            </summary>
            <pre style={{
              margin: 0, padding: '10px 12px',
              background: '#1e1e2e', color: '#cdd6f4',
              overflowX: 'auto', fontSize: '0.95em',
              fontFamily: 'monospace', lineHeight: 1.5,
            }}>
              {message.sql}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/** Живой лог действий во время обработки */
function LiveActionLog({ log }: { log: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: 'var(--frox-gray-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Bot size={16} color="var(--frox-gray-600)" />
      </div>
      <div style={{
        padding: '10px 14px', borderRadius: '4px 16px 16px 16px',
        background: 'white', border: '1px solid var(--frox-gray-200)',
        minWidth: 200,
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
