'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Mail,
  Reply,
  Loader2,
  Inbox,
  Search,
  Square,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { EmailCompose } from './EmailCompose';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';

const PAGE_SIZE = 10; // тредов на страницу
const FETCH_LIMIT = 50; // писем за один запрос к API
const SEARCH_DEBOUNCE_MS = 400; // задержка перед серверным поиском
const PENDING_SENT_RETRY_MS = 30000; // как часто пробуем дозаписать pending-письма в Sent

interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
}

interface CrmEmail {
  id: string;
  message_id: string | null;
  in_reply_to: string | null;
  direction: 'inbound' | 'outbound';
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[] | null;
  subject: string | null;
  // В списке приходит только превью (200 символов), полный body грузится по клику
  body_text_preview: string | null;
  // Полные поля, заполняются после lazy load
  body_html: string | null;
  body_text: string | null;
  has_attachments: boolean;
  contact_email: string;
  sent_at: string;
  attachments: EmailAttachment[];
}

interface EmailThread {
  subject: string;
  emails: CrmEmail[];
  latestAt: string;
}

interface EmailThreadProps {
  contactEmail: string;
  contactName?: string;
  submissionId?: string;
}

// Нормализация темы: убрать Re:, Fwd:, Fw: (любое количество)
function normalizeSubject(subject: string | null): string {
  if (!subject) return '(без темы)';
  return subject.replace(/^(re|fwd?)\s*:\s*/gi, '').trim() || '(без темы)';
}

function groupEmailsIntoThreads(emails: CrmEmail[]): EmailThread[] {
  const map = new Map<string, CrmEmail[]>();

  for (const email of emails) {
    const key = normalizeSubject(email.subject);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(email);
  }

  const threads: EmailThread[] = [];
  for (const [subject, msgs] of map.entries()) {
    // Сортируем письма внутри треда по дате (старые первые)
    msgs.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
    threads.push({
      subject,
      emails: msgs,
      latestAt: msgs[msgs.length - 1].sent_at,
    });
  }
  // Треды — новые сверху
  threads.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  return threads;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<\/?(html|head|body)\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*\S+/gi, '')
    .replace(/javascript:/gi, '');
}

// Одно письмо внутри треда
function EmailItem({
  email,
  replyOpen,
  onReply,
  onCancelReply,
  onSent,
  onDeleted,
  contactEmail,
  contactName,
  submissionId,
  defaultExpanded,
}: {
  email: CrmEmail;
  replyOpen: boolean;
  onReply: (email: CrmEmail) => void;
  onCancelReply: () => void;
  onSent: () => void;
  onDeleted: (emailId: string) => void;
  contactEmail: string;
  contactName?: string;
  submissionId?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [fullEmail, setFullEmail] = useState<CrmEmail | null>(null);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isInbound = email.direction === 'inbound';

  // Загружаем полное тело письма при первом раскрытии
  const handleToggle = async () => {
    if (!expanded && !fullEmail) {
      setBodyLoading(true);
      try {
        const res = await fetch(`/api/admin/emails/${email.id}`, { credentials: 'include' });
        if (res.ok) setFullEmail(await res.json());
      } catch {
        // показываем превью если не загрузилось
      } finally {
        setBodyLoading(false);
      }
    }
    setExpanded(e => !e);
  };

  // При defaultExpanded=true тоже грузим сразу
  useEffect(() => {
    if (defaultExpanded && !fullEmail) {
      fetch(`/api/admin/emails/${email.id}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setFullEmail(data); })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayEmail = fullEmail ?? email;

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    const confirmed = window.confirm('Удалить это письмо из CRM и основного ящика?');
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await adminCsrfFetch(`/api/admin/emails/${email.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        let message = 'Не удалось удалить письмо';
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch {}
        throw new Error(message);
      }

      onDeleted(email.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить письмо';
      window.alert(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`border-l-2 ${isInbound ? 'border-l-blue-300' : 'border-l-green-300'} ml-2`}>
      {/* Заголовок письма */}
      <div
        className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--frox-gray-100)] transition-colors rounded-r"
        onClick={handleToggle}
      >
        <div className={`mt-0.5 p-1 rounded-full shrink-0 ${isInbound ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
          {isInbound ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium truncate">
              {email.from_name || email.from_address}
            </span>
            <span className="text-xs text-[var(--frox-gray-400)] shrink-0">{formatDate(email.sent_at)}</span>
            {email.has_attachments && <Paperclip className="w-3 h-3 text-[var(--frox-gray-400)] shrink-0" />}
          </div>
          {!expanded && (email.body_text_preview || email.body_text) && (
            <div className="text-xs text-[var(--frox-gray-400)] truncate mt-0.5">
              {(email.body_text_preview || email.body_text)!.slice(0, 100)}
            </div>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-[var(--frox-gray-400)] shrink-0 mt-0.5" />}
      </div>

      {/* Развёрнутое тело */}
      {expanded && (
        <div className="mx-3 mb-2 border rounded-lg overflow-hidden">
          {/* Адреса */}
          <div className="px-3 py-1.5 bg-[var(--frox-gray-100)] text-xs text-[var(--frox-gray-500)] space-y-0.5 border-b">
            <div><span className="font-medium">От:</span> {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}</div>
            <div><span className="font-medium">Кому:</span> {email.to_addresses.join(', ')}</div>
            {email.cc_addresses && email.cc_addresses.length > 0 && (
              <div><span className="font-medium">Копия:</span> {email.cc_addresses.join(', ')}</div>
            )}
          </div>

          {/* Тело */}
          <div className="p-3 overflow-x-auto">
            {bodyLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--frox-gray-400)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка...
              </div>
            ) : displayEmail.body_html ? (
              <div
                className="prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-xs [&_table]:block [&_table]:w-max [&_table]:min-w-full"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayEmail.body_html) }}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-sans text-[var(--frox-gray-800)]">
                {displayEmail.body_text || displayEmail.body_text_preview || '(пустое письмо)'}
              </pre>
            )}
          </div>

          {/* Вложения */}
          {displayEmail.attachments && displayEmail.attachments.length > 0 && (
            <div className="px-3 pb-2 border-t pt-2">
              <div className="text-xs font-medium text-[var(--frox-gray-500)] mb-1.5 flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                Вложения ({displayEmail.attachments.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {displayEmail.attachments.map(att => (
                  <a
                    key={att.id}
                    href={`/api/admin/emails/${email.id}/attachments/${att.id}`}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[var(--frox-gray-200)] hover:bg-[var(--frox-gray-300)] rounded text-xs transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                  >
                    <Download className="w-3 h-3" />
                    <span className="truncate max-w-[160px]">{att.filename}</span>
                    {att.size_bytes && <span className="text-[var(--frox-gray-400)]">{formatFileSize(att.size_bytes)}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка ответить */}
          <div className="px-3 pb-2 pt-1 flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); onReply(displayEmail); }}>
              <Reply className="w-3 h-3 mr-1" />
              Ответить
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}
              Удалить
            </Button>
          </div>
        </div>
      )}

      {/* Форма ответа под этим письмом */}
      {replyOpen && (
        <div className="mx-3 mb-2">
          <EmailCompose
            contactEmail={contactEmail}
            contactName={contactName}
            submissionId={submissionId}
            replyTo={displayEmail}
            onSent={onSent}
            onCancel={onCancelReply}
          />
        </div>
      )}
    </div>
  );
}

// Тред (группа писем с одной темой)
function ThreadCard({
  thread,
  replyToId,
  onReply,
  onCancelReply,
  onSent,
  onDeleted,
  contactEmail,
  contactName,
  submissionId,
}: {
  thread: EmailThread;
  replyToId: string | null;
  onReply: (email: CrmEmail) => void;
  onCancelReply: () => void;
  onSent: () => void;
  onDeleted: (emailId: string) => void;
  contactEmail: string;
  contactName?: string;
  submissionId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = thread.emails.length;
  const hasInbound = thread.emails.some(e => e.direction === 'inbound');
  const hasOutbound = thread.emails.some(e => e.direction === 'outbound');
  const lastEmail = thread.emails[thread.emails.length - 1];
  const lastIsInbound = lastEmail.direction === 'inbound';
  const accentClass = hasInbound && hasOutbound
    ? 'border-l-violet-500'
    : hasInbound ? 'border-l-blue-500' : 'border-l-emerald-500';

  // Участники (кроме «Вы»)
  const participants = thread.emails
    .map(e => e.direction === 'inbound' ? (e.from_name || e.from_address) : null)
    .filter((v, i, a): v is string => v !== null && a.indexOf(v) === i);
  const participantLabel = participants.length > 0 ? participants.join(', ') : (lastEmail.to_addresses[0] || '');

  // Превью текста последнего письма (используем body_text_preview из списка)
  const preview = (lastEmail.body_text_preview || lastEmail.body_text)?.slice(0, 120) || '';

  return (
    <div className={`border border-[var(--frox-neutral-border)] border-l-4 ${accentClass} rounded-lg overflow-hidden shadow-sm`}>
      {/* Шапка треда */}
      <div
        className="flex flex-col gap-1 px-4 py-3 cursor-pointer hover:bg-[var(--frox-gray-100)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Строка 1: направление + отправитель + иконки + дата */}
        <div className="flex items-center gap-2">
          <div className={`p-0.5 rounded-full shrink-0 ${lastIsInbound ? 'text-blue-500' : 'text-emerald-500'}`}>
            {lastIsInbound ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
          </div>
          <span className="text-sm font-semibold text-[var(--frox-gray-900)] truncate">{participantLabel}</span>
          {thread.emails.some(e => e.has_attachments) && <Paperclip className="w-3 h-3 shrink-0 text-[var(--frox-gray-400)]" />}
          <span className="ml-auto text-xs text-[var(--frox-gray-400)] shrink-0">{formatDate(thread.latestAt)}</span>
        </div>
        {/* Строка 2: тема */}
        <div className="text-sm text-[var(--frox-gray-700)] truncate pl-6">{thread.subject}</div>
        {/* Строка 3: превью + бейджик */}
        <div className="flex items-center gap-2 pl-6">
          <span className="text-xs text-[var(--frox-gray-400)] truncate flex-1">{preview}</span>
          {count > 1 && (
            <span className="text-xs font-medium shrink-0 bg-[var(--frox-gray-200)] px-1.5 py-0.5 rounded-full text-[var(--frox-gray-600)]">
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Письма треда */}
      {expanded && (
        <div className="border-t border-[var(--frox-neutral-border)] py-2 space-y-1 bg-white">
          {thread.emails.map((email, idx) => (
            <EmailItem
              key={email.id}
              email={email}
              replyOpen={replyToId === email.id}
              onReply={onReply}
              onCancelReply={onCancelReply}
              onSent={onSent}
              onDeleted={onDeleted}
              contactEmail={contactEmail}
              contactName={contactName}
              submissionId={submissionId}
              defaultExpanded={idx === thread.emails.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function EmailThread({ contactEmail, contactName, submissionId }: EmailThreadProps) {
  const [emails, setEmails] = useState<CrmEmail[]>([]);
  const [, setTotalEmails] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showNewCompose, setShowNewCompose] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CrmEmail[] | null>(null); // null = не активен поиск
  const [searchLoading, setSearchLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [filterHasAttachments, setFilterHasAttachments] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const searchAbortRef = useRef<AbortController | null>(null);
  const textSearchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const bgLoadRef = useRef<AbortController | null>(null);
  const searchDoneRef = useRef(false);

  const baseParams = useMemo(
    () => submissionId
      ? `submission_id=${submissionId}`
      : `contact_email=${encodeURIComponent(contactEmail)}`,
    [contactEmail, submissionId]
  );

  // Серверный текстовый поиск с debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      textSearchAbortRef.current?.abort();
      return;
    }

    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      textSearchAbortRef.current?.abort();
      const ctrl = new AbortController();
      textSearchAbortRef.current = ctrl;

      try {
        const res = await fetch(
          `/api/admin/emails?${baseParams}&q=${encodeURIComponent(searchQuery.trim())}`,
          { credentials: 'include', signal: ctrl.signal }
        );
        if (!res.ok || !mountedRef.current) return;
        const data = await res.json();
        if (mountedRef.current) setSearchResults(data.emails || []);
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error('Text search error:', e);
      } finally {
        if (mountedRef.current) setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, baseParams]);

  // Загружает письма из БД
  const fetchEmails = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/emails?${baseParams}&limit=${FETCH_LIMIT}&offset=0`,
        { credentials: 'include' }
      );
      if (!response.ok) return;
      const data = await response.json();
      if (!mountedRef.current) return;

      const firstBatch: CrmEmail[] = data.emails || [];
      const total: number = data.total ?? firstBatch.length;
      setEmails(firstBatch);
      setTotalEmails(total);
      setLastSyncAt(data.lastSyncAt);
      setLoading(false);

      // Догружаем остальные в фоне если нужно
      if (total > FETCH_LIMIT) {
        bgLoadRef.current?.abort();
        const abortCtrl = new AbortController();
        bgLoadRef.current = abortCtrl;
        setLoadingMore(true);

        let offset = FETCH_LIMIT;
        let accumulated = [...firstBatch];

        while (offset < total) {
          if (abortCtrl.signal.aborted || !mountedRef.current) break;
          try {
            const res = await fetch(
              `/api/admin/emails?${baseParams}&limit=${FETCH_LIMIT}&offset=${offset}`,
              { credentials: 'include', signal: abortCtrl.signal }
            );
            if (!res.ok) break;
            const chunk = await res.json();
            const batch: CrmEmail[] = chunk.emails || [];
            if (batch.length === 0) break;
            accumulated = [...accumulated, ...batch];
            if (mountedRef.current) setEmails([...accumulated]);
            offset += FETCH_LIMIT;
          } catch {
            break;
          }
        }

        if (mountedRef.current) setLoadingMore(false);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [baseParams]);

  // IMAP SEARCH для конкретного контакта — ищет и загружает только его письма
  const searchContactEmails = useCallback(async () => {
    if (searching || searchDoneRef.current) return;
    setSearching(true);
    setSearchStatus('Поиск писем...');
    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    try {
      const response = await fetch(
        `/api/admin/emails/search?email=${encodeURIComponent(contactEmail)}`,
        { credentials: 'include', signal: abortController.signal }
      );

      if (!response.ok) {
        console.error('Search failed:', response.status);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let sepIdx: number;
        while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
          const message = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);

          let eventType = '';
          let dataStr = '';
          for (const line of message.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6);
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventType === 'progress') {
              setSearchStatus(`${data.folder}: загружено ${data.syncedSoFar} писем`);
            } else if (eventType === 'done') {
              searchDoneRef.current = true;
              if (data.lastSyncAt) {
                setLastSyncAt(data.lastSyncAt);
              }
              if (data.synced > 0) {
                await fetchEmails();
              }
            } else if (eventType === 'error') {
              console.error('Search error:', data.message);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Error searching emails:', error);
      }
    } finally {
      searchAbortRef.current = null;
      if (mountedRef.current) {
        setSearching(false);
        setSearchStatus(null);
      }
    }
  }, [contactEmail, searching, fetchEmails]);

  // При монтировании: загрузить из БД, затем IMAP SEARCH
  useEffect(() => {
    mountedRef.current = true;
    searchDoneRef.current = false;

    fetchEmails().then(() => {
      if (mountedRef.current) {
        searchContactEmails();
      }
    });

    return () => {
      mountedRef.current = false;
      bgLoadRef.current?.abort();
      searchAbortRef.current?.abort();
      textSearchAbortRef.current?.abort();
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEmails]);

  const retryPendingSentCopies = useCallback(async () => {
    try {
      const response = await adminCsrfFetch('/api/admin/emails/retry-pending', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json() as { appended?: number };
      if ((data.appended || 0) > 0 && mountedRef.current) {
        await fetchEmails();
      }
    } catch {
      // Тихо игнорируем: следующий цикл повторит попытку.
    }
  }, [fetchEmails]);

  useEffect(() => {
    void retryPendingSentCopies();

    const intervalId = window.setInterval(() => {
      void retryPendingSentCopies();
    }, PENDING_SENT_RETRY_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [retryPendingSentCopies]);

  const handleStopSearch = () => {
    searchAbortRef.current?.abort();
  };

  // Ручная кнопка: принудительный поиск + обновление
  const handleRefresh = async () => {
    searchDoneRef.current = false;
    await searchContactEmails();
    await fetchEmails();
  };

  const handleEmailSent = () => {
    setReplyToId(null);
    setShowNewCompose(false);
    fetchEmails();
  };

  const handleEmailDeleted = (emailId: string) => {
    setEmails(prev => prev.filter(email => email.id !== emailId));
    setSearchResults(prev => prev ? prev.filter(email => email.id !== emailId) : prev);
    setTotalEmails(prev => prev === null ? prev : Math.max(0, prev - 1));
    if (replyToId === emailId) {
      setReplyToId(null);
    }
  };

  const hasActiveFilters = filterDirection !== 'all' || filterHasAttachments || filterDateFrom || filterDateTo;

  // Фильтрация писем — текстовый поиск серверный (searchResults), остальные фильтры клиентские
  const filteredEmails = useMemo(() => {
    // Если активен текстовый поиск — используем серверные результаты
    let result = searchResults !== null ? searchResults : emails;

    // Направление
    if (filterDirection !== 'all') {
      result = result.filter(e => e.direction === filterDirection);
    }

    // Вложения
    if (filterHasAttachments) {
      result = result.filter(e => e.has_attachments);
    }

    // Дата от
    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      result = result.filter(e => new Date(e.sent_at) >= from);
    }

    // Дата до
    if (filterDateTo) {
      const to = new Date(filterDateTo + 'T23:59:59');
      result = result.filter(e => new Date(e.sent_at) <= to);
    }

    return result;
  }, [emails, searchResults, filterDirection, filterHasAttachments, filterDateFrom, filterDateTo]);

  const threads = groupEmailsIntoThreads(filteredEmails);
  const totalPages = Math.max(1, Math.ceil(threads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageThreads = threads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Сброс страницы при изменении фильтров
  useEffect(() => { setPage(1); }, [searchQuery, filterDirection, filterHasAttachments, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterDirection('all');
    setFilterHasAttachments(false);
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchQuery('');
    setSearchResults(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--frox-gray-400)]" />
        <span className="ml-2 text-sm text-[var(--frox-gray-500)]">Загрузка переписки...</span>
      </div>
    );
  }

  return (
    <div>
      {/* ── Верхняя часть (внутри карточки) ── */}
      <div className="space-y-3">
        {/* Кнопки */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={searching} className="w-full sm:w-auto">
              {searching ? (
                <>
                  <Search className="w-4 h-4 mr-1 animate-pulse" />
                  Поиск...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Обновить
                </>
              )}
            </Button>
            {searching && (
              <Button variant="outline" size="sm" onClick={handleStopSearch} className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50">
                <Square className="w-3 h-3 mr-1 fill-current" />
                Остановить
              </Button>
            )}
            <Button variant="default" size="sm" className="w-full sm:w-auto" onClick={() => { setShowNewCompose(true); setReplyToId(null); }}>
              <Mail className="w-4 h-4 mr-1" />
              Написать письмо
            </Button>
          </div>
          {lastSyncAt && (
            <span className="text-xs text-[var(--frox-gray-400)] sm:text-right">
              Синхр.: {formatDate(lastSyncAt)}
            </span>
          )}
        </div>

        {/* Строка поиска + иконка фильтра */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--frox-gray-400)]" />
            <input
              type="text"
              placeholder="Поиск по теме, тексту, адресу..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--frox-neutral-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--frox-primary)]/20 focus:border-[var(--frox-primary)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-[var(--frox-primary)] bg-[var(--frox-primary)]/5 text-[var(--frox-primary)]'
                : 'border-[var(--frox-neutral-border)] text-[var(--frox-gray-400)] hover:text-[var(--frox-gray-600)] hover:border-[var(--frox-gray-300)]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Панель фильтров */}
        {showFilters && (
          <div className="border border-[var(--frox-neutral-border)] rounded-lg p-3 bg-[var(--frox-gray-50)] space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Направление */}
              <div className="flex-1">
                <label className="text-xs font-medium text-[var(--frox-gray-500)] mb-1 block">Направление</label>
                <select
                  value={filterDirection}
                  onChange={e => setFilterDirection(e.target.value as 'all' | 'inbound' | 'outbound')}
                  className="w-full text-sm border border-[var(--frox-neutral-border)] rounded-md px-2 py-1.5 bg-white"
                >
                  <option value="all">Все</option>
                  <option value="inbound">Входящие</option>
                  <option value="outbound">Исходящие</option>
                </select>
              </div>

              {/* Дата от */}
              <div className="flex-1">
                <label className="text-xs font-medium text-[var(--frox-gray-500)] mb-1 block">Дата от</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full text-sm border border-[var(--frox-neutral-border)] rounded-md px-2 py-1.5 bg-white"
                />
              </div>

              {/* Дата до */}
              <div className="flex-1">
                <label className="text-xs font-medium text-[var(--frox-gray-500)] mb-1 block">Дата до</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full text-sm border border-[var(--frox-neutral-border)] rounded-md px-2 py-1.5 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[var(--frox-gray-600)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterHasAttachments}
                  onChange={e => setFilterHasAttachments(e.target.checked)}
                  className="rounded border-[var(--frox-neutral-border)]"
                />
                <Paperclip className="w-3.5 h-3.5" />
                С вложениями
              </label>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[var(--frox-primary)] hover:underline"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          </div>
        )}

        {/* Статус поиска IMAP */}
        {searching && searchStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{searchStatus}</span>
          </div>
        )}

        {/* Форма нового письма */}
        {showNewCompose && (
          <EmailCompose
            contactEmail={contactEmail}
            contactName={contactName}
            submissionId={submissionId}
            replyTo={null}
            onSent={handleEmailSent}
            onCancel={() => setShowNewCompose(false)}
          />
        )}
      </div>

      {/* ── Список тредов (за пределами карточки, на всю ширину) ── */}
      <div className="-mx-4 sm:-mx-6 mt-4">
        {emails.length === 0 && !searching ? (
          <div className="text-center py-12 text-[var(--frox-gray-400)]">
            <Inbox className="w-12 h-12 mx-auto mb-3 stroke-1" />
            <p className="text-sm">Переписка с {contactEmail} не найдена</p>
            <p className="text-xs mt-1">Нажмите «Обновить» для поиска писем на сервере</p>
          </div>
        ) : (
          <>
            {/* Счётчик и пагинация */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--frox-gray-500)] px-4 sm:px-6 mb-3">
              <span className="flex items-center gap-1.5">
                Тредов: {threads.length} · Писем: {filteredEmails.length}
                {searchResults === null && filteredEmails.length !== emails.length && (
                  <span className="text-[var(--frox-gray-400)]">из {emails.length}</span>
                )}
                {(loadingMore || searchLoading) && <Loader2 className="w-3 h-3 animate-spin text-[var(--frox-gray-400)]" />}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span>{currentPage} / {totalPages}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 px-2 sm:px-3">
              {pageThreads.map(thread => (
                <ThreadCard
                  key={thread.subject}
                  thread={thread}
                  replyToId={replyToId}
                  onReply={email => { setShowNewCompose(false); setReplyToId(email.id); }}
                  onCancelReply={() => setReplyToId(null)}
                  onSent={handleEmailSent}
                  onDeleted={handleEmailDeleted}
                  contactEmail={contactEmail}
                  contactName={contactName}
                  submissionId={submissionId}
                />
              ))}
            </div>

            {/* Пагинация снизу */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-4 px-4 sm:px-6 pb-2">
                <Button variant="outline" size="sm" className="w-full sm:w-auto"
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Назад
                </Button>
                <span className="text-sm text-[var(--frox-gray-500)]">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" className="w-full sm:w-auto"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Далее<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
