'use client';

import { useState, useEffect, useCallback } from 'react';
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
  MessageSquare,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import { EmailCompose } from './EmailCompose';

const PAGE_SIZE = 10; // тредов на страницу

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
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^>]*>/gi, '')
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
  contactEmail: string;
  contactName?: string;
  submissionId?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const isInbound = email.direction === 'inbound';

  return (
    <div className={`border-l-2 ${isInbound ? 'border-l-blue-300' : 'border-l-green-300'} ml-2`}>
      {/* Заголовок письма */}
      <div
        className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors rounded-r"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`mt-0.5 p-1 rounded-full shrink-0 ${isInbound ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
          {isInbound ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium truncate">
              {email.from_name || email.from_address}
            </span>
            <span className="text-xs text-slate-400 shrink-0">{formatDate(email.sent_at)}</span>
            {email.has_attachments && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
          </div>
          {!expanded && email.body_text && (
            <div className="text-xs text-slate-400 truncate mt-0.5">
              {email.body_text.slice(0, 100)}
            </div>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
      </div>

      {/* Развёрнутое тело */}
      {expanded && (
        <div className="mx-3 mb-2 border rounded-lg overflow-hidden">
          {/* Адреса */}
          <div className="px-3 py-1.5 bg-slate-50 text-xs text-slate-500 space-y-0.5 border-b">
            <div><span className="font-medium">От:</span> {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}</div>
            <div><span className="font-medium">Кому:</span> {email.to_addresses.join(', ')}</div>
            {email.cc_addresses && email.cc_addresses.length > 0 && (
              <div><span className="font-medium">Копия:</span> {email.cc_addresses.join(', ')}</div>
            )}
          </div>

          {/* Тело */}
          <div className="p-3 overflow-x-auto">
            {email.body_html ? (
              <div
                className="prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-xs [&_table]:block [&_table]:w-max [&_table]:min-w-full"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body_html) }}
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-sans text-slate-700">
                {email.body_text || '(пустое письмо)'}
              </pre>
            )}
          </div>

          {/* Вложения */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="px-3 pb-2 border-t pt-2">
              <div className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                Вложения ({email.attachments.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {email.attachments.map(att => (
                  <a
                    key={att.id}
                    href={`/api/admin/emails/${email.id}/attachments/${att.id}`}
                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                  >
                    <Download className="w-3 h-3" />
                    <span className="truncate max-w-[160px]">{att.filename}</span>
                    {att.size_bytes && <span className="text-slate-400">{formatFileSize(att.size_bytes)}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка ответить */}
          <div className="px-3 pb-2 pt-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); onReply(email); }}>
              <Reply className="w-3 h-3 mr-1" />
              Ответить
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
            replyTo={email}
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
  contactEmail,
  contactName,
  submissionId,
}: {
  thread: EmailThread;
  replyToId: string | null;
  onReply: (email: CrmEmail) => void;
  onCancelReply: () => void;
  onSent: () => void;
  contactEmail: string;
  contactName?: string;
  submissionId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = thread.emails.length;
  const hasInbound = thread.emails.some(e => e.direction === 'inbound');
  const hasOutbound = thread.emails.some(e => e.direction === 'outbound');
  // Цвет полосы: смешанный = фиолетовый, только входящие = синий, только исходящие = зелёный
  const accentClass = hasInbound && hasOutbound
    ? 'border-l-violet-500'
    : hasInbound ? 'border-l-blue-500' : 'border-l-emerald-500';
  const headerBg = hasInbound && hasOutbound
    ? 'bg-violet-50'
    : hasInbound ? 'bg-blue-50' : 'bg-emerald-50';
  const iconColor = hasInbound && hasOutbound
    ? 'bg-violet-100 text-violet-600'
    : hasInbound ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600';

  return (
    <div className={`border border-slate-200 border-l-4 ${accentClass} rounded-lg overflow-hidden shadow-sm`}>
      {/* Шапка треда */}
      <div
        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:brightness-95 transition-all ${headerBg}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`p-1.5 rounded-full shrink-0 ${iconColor}`}>
          <MessageSquare className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-slate-800 truncate">{thread.subject}</span>
            <span className="text-xs font-medium shrink-0 bg-white/70 border border-slate-200 px-1.5 py-0.5 rounded-full text-slate-600">
              {count}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">{formatDate(thread.latestAt)}</span>
            <span className="text-slate-300">·</span>
            <span className="truncate">
              {thread.emails.map(e => e.direction === 'inbound' ? (e.from_name || e.from_address) : 'Вы').filter((v, i, a) => a.indexOf(v) === i).join(', ')}
            </span>
            {thread.emails.some(e => e.has_attachments) && <Paperclip className="w-3 h-3 shrink-0 text-slate-400" />}
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>

      {/* Письма треда */}
      {expanded && (
        <div className="border-t border-slate-100 py-2 space-y-1 bg-white">
          {thread.emails.map((email, idx) => (
            <EmailItem
              key={email.id}
              email={email}
              replyOpen={replyToId === email.id}
              onReply={onReply}
              onCancelReply={onCancelReply}
              onSent={onSent}
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
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [showNewCompose, setShowNewCompose] = useState(false);
  const [page, setPage] = useState(1);

  const fetchEmails = useCallback(async () => {
    try {
      const params = submissionId
        ? `submission_id=${submissionId}`
        : `contact_email=${encodeURIComponent(contactEmail)}`;
      const response = await fetch(`/api/admin/emails?${params}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
        setLastSyncAt(data.lastSyncAt);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  }, [contactEmail, submissionId]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await adminCsrfFetch('/api/admin/emails/sync', {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setLastSyncAt(data.lastSyncAt);
        await fetchEmails();
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleEmailSent = () => {
    setReplyToId(null);
    setShowNewCompose(false);
    fetchEmails();
  };

  const threads = groupEmailsIntoThreads(emails);
  const totalPages = Math.max(1, Math.ceil(threads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageThreads = threads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Загрузка переписки...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Тулбар */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Синхронизация...' : 'Синхронизировать'}
          </Button>
          <Button variant="default" size="sm" className="w-full sm:w-auto" onClick={() => { setShowNewCompose(true); setReplyToId(null); }}>
            <Mail className="w-4 h-4 mr-1" />
            Написать письмо
          </Button>
        </div>
        {lastSyncAt && (
          <span className="text-xs text-slate-400 sm:text-right">
            Синхр.: {formatDate(lastSyncAt)}
          </span>
        )}
      </div>

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

      {emails.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Inbox className="w-12 h-12 mx-auto mb-3 stroke-1" />
          <p className="text-sm">Переписка с {contactEmail} не найдена</p>
          <p className="text-xs mt-1">Нажмите «Синхронизировать» для загрузки писем</p>
        </div>
      ) : (
        <>
          {/* Счётчик и пагинация сверху */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
            <span>Тредов: {threads.length} · Писем: {emails.length}</span>
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

          <div className="space-y-3">
            {pageThreads.map(thread => (
              <ThreadCard
                key={thread.subject}
                thread={thread}
                replyToId={replyToId}
                onReply={email => { setShowNewCompose(false); setReplyToId(email.id); }}
                onCancelReply={() => setReplyToId(null)}
                onSent={handleEmailSent}
                contactEmail={contactEmail}
                contactName={contactName}
                submissionId={submissionId}
              />
            ))}
          </div>

          {/* Пагинация снизу */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" className="w-full sm:w-auto"
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" />Назад
              </Button>
              <span className="text-sm text-slate-500">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" className="w-full sm:w-auto"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Далее<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
