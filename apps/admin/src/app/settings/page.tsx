'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2 } from 'lucide-react';
import { adminCsrfFetch } from '@/lib/admin-csrf-fetch';
import {
  CRM_COMPOSE_TEMPLATE_EMAIL_TYPE,
  CRM_COMPOSE_TEMPLATE_FORM_TYPE,
} from '@/lib/email-compose-template';

interface EmailTemplate {
  id: string;
  form_type: string;
  email_type: 'admin' | 'user';
  subject: string;
  html_body: string;
  created_at: string;
  updated_at: string;
}

type TemplateKind = 'admin' | 'user';

type TemplateSection = {
  value: string;
  label: string;
  description: string;
  bodyLabel?: string;
  subjectLabel?: string;
  subjectPlaceholder?: string;
  bodyPlaceholder?: string;
  subjectOptional?: boolean;
  kinds: Array<{ value: TemplateKind; label: string }>;
};

const templateSections: TemplateSection[] = [
  {
    value: 'contact',
    label: 'Контактная форма',
    description: 'Шаблоны писем, которые отправляются при заполнении контактной формы.',
    kinds: [
      { value: 'admin', label: 'Администратору' },
      { value: 'user', label: 'Пользователю' },
    ],
  },
  {
    value: 'cp',
    label: 'Запрос КП',
    description: 'Шаблоны уведомлений по запросу коммерческого предложения.',
    kinds: [
      { value: 'admin', label: 'Администратору' },
      { value: 'user', label: 'Пользователю' },
    ],
  },
  {
    value: 'training',
    label: 'Заявка на обучение',
    description: 'Шаблоны писем для заявок на обучение.',
    kinds: [
      { value: 'admin', label: 'Администратору' },
      { value: 'user', label: 'Пользователю' },
    ],
  },
  {
    value: 'conference_registration',
    label: 'Регистрация на конференцию',
    description: 'Шаблоны подтверждений и уведомлений по регистрации на конференцию.',
    kinds: [
      { value: 'admin', label: 'Администратору' },
      { value: 'user', label: 'Пользователю' },
    ],
  },
  {
    value: CRM_COMPOSE_TEMPLATE_FORM_TYPE,
    label: 'Переписка CRM',
    description: 'Этот шаблон автоматически подставляется в тело нового письма и ответа в переписке.',
    bodyLabel: 'Шаблон текста письма',
    subjectLabel: 'Техническое поле темы',
    subjectPlaceholder: 'Можно оставить пустым',
    bodyPlaceholder: 'Например: Здравствуйте, {{name}}...',
    subjectOptional: true,
    kinds: [
      { value: CRM_COMPOSE_TEMPLATE_EMAIL_TYPE, label: 'Новое письмо' },
    ],
  },
];

const templateVariables: Record<string, Partial<Record<TemplateKind, string[]>>> = {
  contact: {
    admin: ['name', 'email', 'phone', 'message', 'date'],
    user: ['name', 'date'],
  },
  cp: {
    admin: ['name', 'phone', 'email', 'city', 'institution', 'date'],
    user: ['name', 'date'],
  },
  training: {
    admin: ['name', 'phone', 'email', 'city', 'institution', 'date'],
    user: ['name', 'date'],
  },
  conference_registration: {
    admin: ['conference', 'name', 'email', 'phone', 'institution', 'certificate', 'date'],
    user: ['name', 'conference', 'siteUrl', 'siteHostname'],
  },
  [CRM_COMPOSE_TEMPLATE_FORM_TYPE]: {
    admin: ['name', 'email'],
  },
};

function buildEmptyTemplate(formType: string, emailType: TemplateKind): EmailTemplate {
  return {
    id: '',
    form_type: formType,
    email_type: emailType,
    subject: '',
    html_body: '',
    created_at: '',
    updated_at: '',
  };
}

export default function SettingsPage() {
  const [templates, setTemplates] = useState<Record<string, Record<string, EmailTemplate>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeFormType, setActiveFormType] = useState<string>('contact');
  const [activeEmailType, setActiveEmailType] = useState<TemplateKind>('admin');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    const currentSection = templateSections.find((section) => section.value === activeFormType);
    if (!currentSection) return;

    if (!currentSection.kinds.some((kind) => kind.value === activeEmailType)) {
      setActiveEmailType(currentSection.kinds[0].value);
    }
  }, [activeEmailType, activeFormType]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email-templates', {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Ошибка загрузки шаблонов';
        if (errorMessage.includes('не найдена') || errorMessage.includes('миграцию')) {
          alert(`⚠️ ${errorMessage}\n\nПримените миграцию:\nmigrations/005_add_email_templates.sql`);
        } else {
          throw new Error(errorMessage);
        }
        setLoading(false);
        return;
      }

      const templatesMap: Record<string, Record<string, EmailTemplate>> = {};

      if (data.templates && Array.isArray(data.templates)) {
        data.templates.forEach((template: EmailTemplate) => {
          if (!templatesMap[template.form_type]) {
            templatesMap[template.form_type] = {};
          }
          templatesMap[template.form_type][template.email_type] = template;
        });
      }

      setTemplates(templatesMap);
    } catch (error: any) {
      console.error('Ошибка загрузки шаблонов:', error);
      alert('Ошибка загрузки шаблонов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (formType: string, emailType: TemplateKind) => {
    const template = templates[formType]?.[emailType] ?? buildEmptyTemplate(formType, emailType);
    const section = templateSections.find((item) => item.value === formType);
    const subjectRequired = !section?.subjectOptional;

    if ((subjectRequired && !template.subject.trim()) || !template.html_body.trim()) {
      alert(subjectRequired ? 'Тема и содержимое письма обязательны для заполнения' : 'Содержимое письма обязательно для заполнения');
      return;
    }

    setSaving(`${formType}-${emailType}`);
    try {
      const response = await adminCsrfFetch('/api/admin/email-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          form_type: formType,
          email_type: emailType,
          subject: template.subject,
          html_body: template.html_body,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: ${response.statusText}`;

        // Специальная обработка для случая отсутствия таблицы
        if (errorMessage.includes('не найдена') || errorMessage.includes('миграцию')) {
          alert(`⚠️ ${errorMessage}\n\nПримените миграцию:\nmigrations/005_add_email_templates.sql\n\nИли выполните:\ndocker exec -i <container> psql -U postgres -d postgres -f /migrations/005_add_email_templates.sql`);
          return;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      alert('Шаблон успешно сохранен');
      
      // Обновляем шаблон из ответа сервера
      if (result.template) {
        setTemplates((prev) => {
          const newTemplates = { ...prev };
          if (!newTemplates[formType]) {
            newTemplates[formType] = {};
          }
          newTemplates[formType][emailType] = result.template;
          return newTemplates;
        });
      }
    } catch (error: any) {
      console.error('Ошибка сохранения шаблона:', error);
      const errorMessage = error.message || 'Неизвестная ошибка';
      alert(`Ошибка сохранения шаблона: ${errorMessage}\n\nПроверьте консоль браузера для деталей.`);
    } finally {
      setSaving(null);
    }
  };

  const updateTemplate = (formType: string, emailType: TemplateKind, field: 'subject' | 'html_body', value: string) => {
    setTemplates((prev) => {
      const newTemplates = { ...prev };
      if (!newTemplates[formType]) {
        newTemplates[formType] = {};
      }
      if (!newTemplates[formType][emailType]) {
        newTemplates[formType][emailType] = buildEmptyTemplate(formType, emailType);
      }
      newTemplates[formType][emailType] = {
        ...newTemplates[formType][emailType],
        [field]: value,
      };
      return newTemplates;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--frox-gray-500)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--frox-gray-1100)]">Шаблоны</h1>
        <p className="text-[var(--frox-gray-600)] mt-2">Управление шаблонами писем для форм и CRM-переписки</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Шаблоны писем</CardTitle>
          <CardDescription>
            Редактируйте шаблоны писем для форм и автоматическую подстановку в CRM-переписке.
            Используйте переменные в формате {'{{variable}}'} для подстановки данных.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeFormType} onValueChange={setActiveFormType} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {templateSections.map((section) => (
                <TabsTrigger key={section.value} value={section.value}>
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {templateSections.map((section) => (
              <TabsContent key={section.value} value={section.value} className="space-y-4 mt-4">
                <p className="text-sm text-[var(--frox-gray-600)]">{section.description}</p>
                <Tabs value={activeEmailType} onValueChange={(v) => setActiveEmailType(v as TemplateKind)}>
                  <TabsList>
                    {section.kinds.map((kind) => (
                      <TabsTrigger key={kind.value} value={kind.value}>
                        {kind.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {section.kinds.map((kind) => (
                    <TabsContent key={kind.value} value={kind.value} className="space-y-4 mt-4">
                      <TemplateEditor
                        template={templates[section.value]?.[kind.value] ?? buildEmptyTemplate(section.value, kind.value)}
                        formType={section.value}
                        availableVars={templateVariables[section.value as keyof typeof templateVariables]?.[kind.value] || []}
                        onUpdate={(field, value) => updateTemplate(section.value, kind.value, field, value)}
                        onSave={() => saveTemplate(section.value, kind.value)}
                        saving={saving === `${section.value}-${kind.value}`}
                        subjectOptional={section.subjectOptional}
                        subjectLabel={section.subjectLabel}
                        subjectPlaceholder={section.subjectPlaceholder}
                        bodyLabel={section.bodyLabel}
                        bodyPlaceholder={section.bodyPlaceholder}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface TemplateEditorProps {
  template: EmailTemplate;
  formType: string;
  availableVars: string[];
  onUpdate: (field: 'subject' | 'html_body', value: string) => void;
  onSave: () => void;
  saving: boolean;
  subjectOptional?: boolean;
  subjectLabel?: string;
  subjectPlaceholder?: string;
  bodyLabel?: string;
  bodyPlaceholder?: string;
}

function TemplateEditor({
  template,
  formType,
  availableVars,
  onUpdate,
  onSave,
  saving,
  subjectOptional,
  subjectLabel,
  subjectPlaceholder,
  bodyLabel,
  bodyPlaceholder,
}: TemplateEditorProps) {
  return (
    <div className="space-y-4">
      <div className="bg-[var(--frox-gray-100)] p-4 rounded-lg">
        <p className="text-sm font-medium mb-2">Доступные переменные:</p>
        <div className="flex flex-wrap gap-2">
          {availableVars.map((varName) => (
            <code
              key={varName}
              className="px-2 py-1 bg-white border rounded text-sm cursor-pointer hover:bg-[var(--frox-gray-200)]"
              onClick={() => {
                const textarea = document.getElementById('html-body') as HTMLTextAreaElement;
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const text = textarea.value;
                  const before = text.substring(0, start);
                  const after = text.substring(end);
                  const newText = before + `{{${varName}}}` + after;
                  onUpdate('html_body', newText);
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
                  }, 0);
                }
              }}
            >
              {'{{' + varName + '}}'}
            </code>
          ))}
        </div>
        <p className="text-xs text-[var(--frox-gray-500)] mt-2">
          Нажмите на переменную, чтобы вставить её в шаблон
        </p>
        {formType === CRM_COMPOSE_TEMPLATE_FORM_TYPE ? (
          <p className="text-xs text-[var(--frox-gray-500)] mt-2">
            Этот текст будет автоматически подставляться в начало нового письма и ответа в CRM.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">{subjectLabel || 'Тема письма'}</Label>
        <Input
          id="subject"
          value={template.subject}
          onChange={(e) => onUpdate('subject', e.target.value)}
          placeholder={subjectPlaceholder || 'Например: Новое сообщение от {{name}}'}
        />
        {subjectOptional ? (
          <p className="text-xs text-[var(--frox-gray-500)]">
            Для этого шаблона тема не используется, поле можно оставить пустым.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="html-body">{bodyLabel || 'HTML содержимое'}</Label>
        <Textarea
          id="html-body"
          value={template.html_body}
          onChange={(e) => onUpdate('html_body', e.target.value)}
          placeholder={bodyPlaceholder || 'HTML код письма...'}
          className="font-mono text-sm min-h-[300px]"
        />
        <p className="text-xs text-[var(--frox-gray-500)]">
          {formType === CRM_COMPOSE_TEMPLATE_FORM_TYPE
            ? <>Можно использовать обычный текст или HTML. Переменные вставляются в формате {'{{variable}}'}.</>
            : <>Используйте HTML разметку. Переменные вставляются в формате {'{{variable}}'}.</>}
        </p>
      </div>

      <Button onClick={onSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Сохранение...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Сохранить шаблон
          </>
        )}
      </Button>
    </div>
  );
}
