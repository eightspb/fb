'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, RotateCcw, Loader2, User, Bot } from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
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
  // Tables
  const lines = text.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Detect table: line with | that is not a code block
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // Filter out separator rows (---|---)
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

    // Headings
    if (/^### (.+)$/.test(line)) {
      output.push(`<h3 style="font-size:1em;font-weight:600;margin:10px 0 4px">${line.replace(/^### /, '')}</h3>`);
    } else if (/^## (.+)$/.test(line)) {
      output.push(`<h2 style="font-size:1.1em;font-weight:600;margin:12px 0 4px">${line.replace(/^## /, '')}</h2>`);
    } else if (/^# (.+)$/.test(line)) {
      output.push(`<h1 style="font-size:1.2em;font-weight:700;margin:12px 0 4px">${line.replace(/^# /, '')}</h1>`);
    }
    // Lists
    else if (/^[-*] (.+)$/.test(line)) {
      // Collect consecutive list items
      const items: string[] = [line.replace(/^[-*] /, '')];
      i++;
      while (i < lines.length && /^[-*] (.+)$/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ''));
        i++;
      }
      output.push(`<ul style="margin:4px 0;padding-left:20px">${items.map(it => `<li style="margin:2px 0">${inlineFormat(it)}</li>`).join('')}</ul>`);
      continue;
    }
    // Numbered lists
    else if (/^\d+\. (.+)$/.test(line)) {
      const items: string[] = [line.replace(/^\d+\. /, '')];
      i++;
      while (i < lines.length && /^\d+\. (.+)$/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      output.push(`<ol style="margin:4px 0;padding-left:20px">${items.map(it => `<li style="margin:2px 0">${inlineFormat(it)}</li>`).join('')}</ol>`);
      continue;
    }
    // Empty line
    else if (line.trim() === '') {
      output.push('<br>');
    }
    // Normal paragraph
    else {
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const response = await adminCsrfFetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json() as { reply?: string; sql?: string; error?: string };

      if (!response.ok || data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Ошибка: ${data.error || 'Что-то пошло не так'}`,
        }]);
        return;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || '',
        sql: data.sql,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Ошибка сети. Попробуйте снова.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid var(--frox-gray-200)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={20} color="var(--frox-blue)" />
          <h1 style={{ fontSize: '1.1em', fontWeight: 600, margin: 0 }}>AI Ассистент</h1>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, border: '1px solid var(--frox-gray-200)',
              background: 'white', cursor: 'pointer', fontSize: '0.85em', color: 'var(--frox-gray-600)',
            }}
          >
            <RotateCcw size={14} />
            Новый чат
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', minHeight: 0 }}>
        {messages.length === 0 ? (
          <WelcomeScreen onExample={text => sendMessage(text)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
            {loading && <TypingIndicator />}
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10, alignItems: 'flex-start',
    }}>
      {/* Avatar */}
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
        {/* Bubble */}
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'var(--frox-gray-100)' : 'white',
          border: isUser ? 'none' : '1px solid var(--frox-gray-200)',
          fontSize: '0.9em',
          lineHeight: 1.6,
        }}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
          )}
        </div>

        {/* SQL block */}
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

function TypingIndicator() {
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
        padding: '12px 16px', borderRadius: '4px 16px 16px 16px',
        background: 'white', border: '1px solid var(--frox-gray-200)',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--frox-gray-400)',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}
