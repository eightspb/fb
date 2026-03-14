'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Paperclip,
  X,
  Loader2,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';

interface ReplyToEmail {
  id: string;
  message_id: string | null;
  subject: string | null;
  from_address: string;
  from_name: string | null;
  body_text: string | null;
}

interface EmailComposeProps {
  contactEmail: string;
  contactName?: string;
  submissionId?: string;
  replyTo?: ReplyToEmail | null;
  onSent: () => void;
  onCancel: () => void;
}

function buildQuote(email: ReplyToEmail): string {
  const date = ''; // не добавляем дату в цитату для краткости
  const from = email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address;
  const body = email.body_text || '';
  const quoted = body.split('\n').map(line => `> ${line}`).join('\n');
  return `\n\n---\nОт: ${from}\n\n${quoted}`;
}

export function EmailCompose({ contactEmail, contactName, submissionId, replyTo, onSent, onCancel }: EmailComposeProps) {
  const toValue = replyTo
    ? (replyTo.from_name ? `${replyTo.from_name} <${replyTo.from_address}>` : replyTo.from_address)
    : (contactName ? `${contactName} <${contactEmail}>` : contactEmail);

  const [to, setTo] = useState(toValue);
  const [subject, setSubject] = useState(
    replyTo?.subject
      ? (replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`)
      : ''
  );
  const [body, setBody] = useState(replyTo ? buildQuote(replyTo) : '');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Извлечь чистый email-адрес из строки "Имя <email>"
  const extractEmail = (str: string): string => {
    const match = str.match(/<([^>]+)>/);
    return match ? match[1] : str.trim();
  };

  const handleSend = async () => {
    if (!to || !subject || !body.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('to', extractEmail(to));
      formData.append('subject', subject);

      // Оборачиваем plain text в базовый HTML
      const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">
${body.split('\n').map(line => `<p style="margin: 0 0 8px 0;">${line || '&nbsp;'}</p>`).join('\n')}
</div>`;
      formData.append('body_html', htmlBody);
      formData.append('body_text', body);

      if (submissionId) {
        formData.append('submission_id', submissionId);
      }

      if (replyTo?.message_id) {
        formData.append('in_reply_to', replyTo.message_id);
        formData.append('references', replyTo.message_id);
      }

      for (const file of files) {
        formData.append('attachments', file);
      }

      const response = await adminCsrfFetch('/api/admin/emails/send', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка отправки');
      }

      onSent();
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки письма');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {replyTo ? 'Ответ на письмо' : 'Новое письмо'}
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Кому */}
      <div>
        <label className="block text-xs text-[var(--frox-gray-500)] mb-1">Кому</label>
        <Input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Имя или email@example.com"
          className="h-9 text-sm"
        />
      </div>

      {/* Тема */}
      <div>
        <label className="block text-xs text-[var(--frox-gray-500)] mb-1">Тема</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Тема письма"
          className="h-9 text-sm"
        />
      </div>

      {/* Тело */}
      <div>
        <label className="block text-xs text-[var(--frox-gray-500)] mb-1">Сообщение</label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Текст письма..."
          className="min-h-[150px] text-sm resize-y"
          autoFocus
        />
      </div>

      {/* Вложения */}
      {files.length > 0 && (
        <div className="space-y-1">
          <label className="block text-xs text-[var(--frox-gray-500)]">Вложения</label>
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 text-xs bg-[var(--frox-gray-100)] rounded px-2 py-1">
              <Paperclip className="w-3 h-3 text-[var(--frox-gray-400)]" />
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-[var(--frox-gray-400)]">{(file.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => handleRemoveFile(index)} className="text-[var(--frox-gray-400)] hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Действия */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Button onClick={handleSend} disabled={sending} size="sm">
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-1" />
              Отправить
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-4 h-4 mr-1" />
          Прикрепить файл
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleAddFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
