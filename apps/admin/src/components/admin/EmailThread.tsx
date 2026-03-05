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
  Mail,
  Reply,
  Loader2,
  Inbox
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import { EmailCompose } from './EmailCompose';

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

interface EmailThreadProps {
  contactEmail: string;
  submissionId?: string;
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

  if (isToday) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function sanitizeHtml(html: string): string {
  // Базовая санитизация: убираем script, style, iframe, event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*\S+/gi, '')
    .replace(/javascript:/gi, '');
}

function EmailCard({ email, onReply }: { email: CrmEmail; onReply: (email: CrmEmail) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isInbound = email.direction === 'inbound';

  return (
    <div className={`border rounded-lg overflow-hidden ${isInbound ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-green-400'}`}>
      {/* Заголовок письма */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`mt-1 p-1.5 rounded-full ${isInbound ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
          {isInbound ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate">
              {email.from_name || email.from_address}
            </span>
            <span className="text-xs text-slate-400">{formatDate(email.sent_at)}</span>
            {email.has_attachments && <Paperclip className="w-3 h-3 text-slate-400" />}
          </div>
          <div className="text-sm text-slate-600 truncate">
            {email.subject || '(без темы)'}
          </div>
          {!expanded && email.body_text && (
            <div className="text-xs text-slate-400 mt-1 truncate">
              {email.body_text.slice(0, 120)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Развёрнутое тело письма */}
      {expanded && (
        <div className="border-t">
          {/* Адреса */}
          <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 space-y-1">
            <div><span className="font-medium">От:</span> {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}</div>
            <div><span className="font-medium">Кому:</span> {email.to_addresses.join(', ')}</div>
            {email.cc_addresses && email.cc_addresses.length > 0 && (
              <div><span className="font-medium">Копия:</span> {email.cc_addresses.join(', ')}</div>
            )}
          </div>

          {/* Тело письма */}
          <div className="p-4">
            {email.body_html ? (
              <div
                className="prose prose-sm max-w-none text-sm [&_img]:max-w-full [&_table]:text-xs"
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
            <div className="px-4 pb-3 border-t pt-3">
              <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                Вложения ({email.attachments.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map(att => (
                  <a
                    key={att.id}
                    href={`/api/admin/emails/${email.id}/attachments/${att.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{att.filename}</span>
                    {att.size_bytes && (
                      <span className="text-slate-400">{formatFileSize(att.size_bytes)}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка ответить */}
          <div className="px-4 pb-3">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onReply(email); }}>
              <Reply className="w-4 h-4 mr-1" />
              Ответить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EmailThread({ contactEmail, submissionId }: EmailThreadProps) {
  const [emails, setEmails] = useState<CrmEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<CrmEmail | null>(null);
  const [showCompose, setShowCompose] = useState(false);

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

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

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
        // Перезагружаем письма после синхронизации
        await fetchEmails();
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleReply = (email: CrmEmail) => {
    setReplyTo(email);
    setShowCompose(true);
  };

  const handleNewEmail = () => {
    setReplyTo(null);
    setShowCompose(true);
  };

  const handleEmailSent = () => {
    setShowCompose(false);
    setReplyTo(null);
    fetchEmails();
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Синхронизация...' : 'Синхронизировать почту'}
          </Button>
          <Button variant="default" size="sm" onClick={handleNewEmail}>
            <Mail className="w-4 h-4 mr-1" />
            Написать письмо
          </Button>
        </div>
        {lastSyncAt && (
          <span className="text-xs text-slate-400">
            Последняя синхронизация: {formatDate(lastSyncAt)}
          </span>
        )}
      </div>

      {/* Форма отправки */}
      {showCompose && (
        <EmailCompose
          contactEmail={contactEmail}
          submissionId={submissionId}
          replyTo={replyTo}
          onSent={handleEmailSent}
          onCancel={() => { setShowCompose(false); setReplyTo(null); }}
        />
      )}

      {/* Список писем */}
      {emails.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Inbox className="w-12 h-12 mx-auto mb-3 stroke-1" />
          <p className="text-sm">Переписка с {contactEmail} не найдена</p>
          <p className="text-xs mt-1">Нажмите &laquo;Синхронизировать почту&raquo; для загрузки писем</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map(email => (
            <EmailCard key={email.id} email={email} onReply={handleReply} />
          ))}
        </div>
      )}
    </div>
  );
}
