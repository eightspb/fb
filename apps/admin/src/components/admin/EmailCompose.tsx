'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Link2,
  Eraser,
  X,
  Loader2,
} from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import {
  buildComposeHtml,
  CRM_COMPOSE_TEMPLATE_EMAIL_TYPE,
  CRM_COMPOSE_TEMPLATE_FORM_TYPE,
  htmlTemplateToPlainText,
} from '@/lib/email-compose-template';

interface ReplyToEmail {
  id: string;
  message_id: string | null;
  subject: string | null;
  from_address: string;
  from_name: string | null;
  body_html?: string | null;
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

const FONT_SIZE_OPTIONS = [
  { label: 'S', value: '13px' },
  { label: 'M', value: '16px' },
  { label: 'L', value: '18px' },
  { label: 'XL', value: '22px' },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildQuoteHtml(email: ReplyToEmail): string {
  const from = email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address;
  const bodyText = email.body_text || '';
  const quotedBody = bodyText
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br>');

  return `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #d9dbe3; color: #5f6472;">
  <div style="margin-bottom: 8px; font-size: 13px;"><strong>От:</strong> ${escapeHtml(from)}</div>
  <blockquote style="margin: 0; padding-left: 12px; border-left: 3px solid #d9dbe3;">${quotedBody || '&nbsp;'}</blockquote>
</div>`;
}

function applyEditorDisplayOverrides(editor: HTMLDivElement) {
  const elements = editor.querySelectorAll<HTMLElement>('[style]');
  for (const element of elements) {
    if (element.style.maxWidth) {
      element.style.setProperty('max-width', 'none', 'important');
    }
    if (element.style.margin === '0 auto') {
      element.style.setProperty('margin', '0', 'important');
    }
    if (element.style.marginLeft === 'auto') {
      element.style.setProperty('margin-left', '0', 'important');
    }
    if (element.style.marginRight === 'auto') {
      element.style.setProperty('margin-right', '0', 'important');
    }
  }
}

export function EmailCompose({ contactEmail, contactName, submissionId, replyTo, onSent, onCancel }: EmailComposeProps) {
  const toValue = replyTo
    ? (replyTo.from_name ? `${replyTo.from_name} <${replyTo.from_address}>` : replyTo.from_address)
    : (contactName ? `${contactName} <${contactEmail}>` : contactEmail);
  const quoteHtml = replyTo ? buildQuoteHtml(replyTo) : '';

  const [to, setTo] = useState(toValue);
  const [subject, setSubject] = useState(
    replyTo?.subject
      ? (replyTo.subject.startsWith('Re:') ? replyTo.subject : `Re: ${replyTo.subject}`)
      : ''
  );
  const [bodyHtml, setBodyHtml] = useState(quoteHtml);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState('16px');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const pristineBodyRef = useRef(quoteHtml);

  useEffect(() => {
    setTo(toValue);
    pristineBodyRef.current = quoteHtml;
    setBodyHtml(quoteHtml);
  }, [quoteHtml, toValue]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== bodyHtml) {
      editorRef.current.innerHTML = bodyHtml;
    }
    applyEditorDisplayOverrides(editorRef.current);
  }, [bodyHtml]);

  useEffect(() => {
    let cancelled = false;

    const loadComposeTemplate = async () => {
      try {
        const params = new URLSearchParams({
          form_type: CRM_COMPOSE_TEMPLATE_FORM_TYPE,
          email_type: CRM_COMPOSE_TEMPLATE_EMAIL_TYPE,
        });

        const response = await fetch(`/api/admin/email-templates?${params.toString()}`, {
          credentials: 'include',
        });

        if (!response.ok) return;

        const data = await response.json();
        const template = Array.isArray(data.templates) ? data.templates[0] : null;
        if (cancelled || !template?.html_body) return;

        const nextBody = buildComposeHtml(template.html_body, {
          name: contactName,
          email: contactEmail,
        }, quoteHtml);

        if (!nextBody) return;

        setBodyHtml((prev) => (prev === pristineBodyRef.current ? nextBody : prev));
        pristineBodyRef.current = nextBody;
      } catch {
        // если шаблон не загрузился, оставляем пустое тело/цитату
      }
    };

    void loadComposeTemplate();

    return () => {
      cancelled = true;
    };
  }, [contactEmail, contactName, quoteHtml]);

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

  const syncEditorHtml = () => {
    if (!editorRef.current) return;
    applyEditorDisplayOverrides(editorRef.current);
    setBodyHtml(editorRef.current.innerHTML);
  };

  const handleEditorInput = (event: FormEvent<HTMLDivElement>) => {
    applyEditorDisplayOverrides(event.currentTarget);
    setBodyHtml(event.currentTarget.innerHTML);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const applyCommand = (command: 'bold' | 'italic' | 'underline' | 'removeFormat' | 'unlink', value?: string) => {
    focusEditor();
    document.execCommand(command, false, value);
    syncEditorHtml();
  };

  const handleInsertLink = () => {
    focusEditor();
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? '';
    const initial = selectedText.startsWith('http') ? selectedText : 'https://';
    const href = window.prompt('Введите ссылку', initial);
    if (!href) return;
    document.execCommand('createLink', false, href.trim());
    syncEditorHtml();
  };

  const handleFontSizeChange = (nextSize: string) => {
    setFontSize(nextSize);
    focusEditor();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement('span');
    span.style.fontSize = nextSize;

    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      selection.removeAllRanges();
      const nextRange = document.createRange();
      nextRange.selectNodeContents(span);
      selection.addRange(nextRange);
      syncEditorHtml();
    } catch {
      // если выделение сложное, просто пропускаем без падения редактора
    }
  };

  const handleSend = async () => {
    const bodyText = htmlTemplateToPlainText(bodyHtml);

    if (!to || !subject || !bodyText.trim()) {
      setError('Заполните все обязательные поля');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('to', extractEmail(to));
      formData.append('subject', subject);
      formData.append('body_html', bodyHtml);
      formData.append('body_text', bodyText);

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
        <div className="mb-2 flex flex-wrap items-center gap-1 rounded-xl border border-[var(--frox-neutral-border)] bg-[var(--frox-gray-50)] p-1.5">
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => applyCommand('bold')}>
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => applyCommand('italic')}>
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => applyCommand('underline')}>
            <Underline className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={handleInsertLink}>
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <select
            value={fontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="h-8 rounded-lg border border-[var(--frox-neutral-border)] bg-white px-2 text-xs text-[var(--frox-gray-700)]"
          >
            {FONT_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => applyCommand('removeFormat')}>
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => applyCommand('unlink')}>
            Без ссылки
          </Button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
          className="min-h-[180px] rounded-xl border border-[var(--frox-neutral-border)] bg-white px-3 py-2 text-left text-sm text-[var(--frox-gray-800)] focus:outline-none focus:ring-2 focus:ring-[var(--frox-brand)]/40 [&_a]:text-[var(--frox-brand)] [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--frox-neutral-border)] [&_blockquote]:pl-3 [&_p]:my-0"
          style={{ lineHeight: 1.6 }}
        />
        <p className="mt-1 text-xs text-[var(--frox-gray-500)]">
          HTML-редактор: ссылки, размеры и переносы сохраняются как в письме.
        </p>
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
