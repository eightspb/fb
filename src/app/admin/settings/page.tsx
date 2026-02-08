'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2, Mail } from 'lucide-react';

interface EmailTemplate {
  id: string;
  form_type: string;
  email_type: 'admin' | 'user';
  subject: string;
  html_body: string;
  created_at: string;
  updated_at: string;
}

const formTypes = [
  { value: 'contact', label: 'Контактная форма' },
  { value: 'cp', label: 'Запрос КП' },
  { value: 'training', label: 'Заявка на обучение' },
  { value: 'conference_registration', label: 'Регистрация на конференцию' },
];

const emailTypeLabels = {
  admin: 'Администратору',
  user: 'Пользователю',
};

const templateVariables = {
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
};

export default function SettingsPage() {
  const [templates, setTemplates] = useState<Record<string, Record<string, EmailTemplate>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeFormType, setActiveFormType] = useState<string>('contact');
  const [activeEmailType, setActiveEmailType] = useState<'admin' | 'user'>('admin');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email-templates', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки шаблонов');
      }

      const data = await response.json();
      const templatesMap: Record<string, Record<string, EmailTemplate>> = {};

      data.templates.forEach((template: EmailTemplate) => {
        if (!templatesMap[template.form_type]) {
          templatesMap[template.form_type] = {};
        }
        templatesMap[template.form_type][template.email_type] = template;
      });

      setTemplates(templatesMap);
    } catch (error: any) {
      console.error('Ошибка загрузки шаблонов:', error);
      alert('Ошибка загрузки шаблонов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (formType: string, emailType: 'admin' | 'user') => {
    const template = templates[formType]?.[emailType];
    if (!template) return;

    setSaving(`${formType}-${emailType}`);
    try {
      const response = await fetch('/api/admin/email-templates', {
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
        throw new Error('Ошибка сохранения шаблона');
      }

      alert('Шаблон успешно сохранен');
    } catch (error: any) {
      console.error('Ошибка сохранения шаблона:', error);
      alert('Ошибка сохранения шаблона: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setSaving(null);
    }
  };

  const updateTemplate = (formType: string, emailType: 'admin' | 'user', field: 'subject' | 'html_body', value: string) => {
    setTemplates((prev) => {
      const newTemplates = { ...prev };
      if (!newTemplates[formType]) {
        newTemplates[formType] = {};
      }
      if (!newTemplates[formType][emailType]) {
        newTemplates[formType][emailType] = {
          id: '',
          form_type: formType,
          email_type: emailType,
          subject: '',
          html_body: '',
          created_at: '',
          updated_at: '',
        };
      }
      newTemplates[formType][emailType] = {
        ...newTemplates[formType][emailType],
        [field]: value,
      };
      return newTemplates;
    });
  };

  const getCurrentTemplate = (): EmailTemplate | null => {
    return templates[activeFormType]?.[activeEmailType] || null;
  };

  const getAvailableVariables = (): string[] => {
    return templateVariables[activeFormType as keyof typeof templateVariables]?.[activeEmailType] || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const currentTemplate = getCurrentTemplate();
  const availableVars = getAvailableVariables();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Настройки</h1>
        <p className="text-slate-600 mt-2">Управление шаблонами писем для форм</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Шаблоны писем</CardTitle>
          <CardDescription>
            Редактируйте шаблоны писем, которые отправляются при заполнении форм.
            Используйте переменные в формате {'{{variable}}'} для подстановки данных.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeFormType} onValueChange={setActiveFormType} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {formTypes.map((form) => (
                <TabsTrigger key={form.value} value={form.value}>
                  {form.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {formTypes.map((form) => (
              <TabsContent key={form.value} value={form.value} className="space-y-4 mt-4">
                <Tabs value={activeEmailType} onValueChange={(v) => setActiveEmailType(v as 'admin' | 'user')}>
                  <TabsList>
                    <TabsTrigger value="admin">Администратору</TabsTrigger>
                    <TabsTrigger value="user">Пользователю</TabsTrigger>
                  </TabsList>

                  <TabsContent value="admin" className="space-y-4 mt-4">
                    <TemplateEditor
                      template={templates[form.value]?.admin}
                      formType={form.value}
                      emailType="admin"
                      availableVars={templateVariables[form.value as keyof typeof templateVariables]?.admin || []}
                      onUpdate={(field, value) => updateTemplate(form.value, 'admin', field, value)}
                      onSave={() => saveTemplate(form.value, 'admin')}
                      saving={saving === `${form.value}-admin`}
                    />
                  </TabsContent>

                  <TabsContent value="user" className="space-y-4 mt-4">
                    <TemplateEditor
                      template={templates[form.value]?.user}
                      formType={form.value}
                      emailType="user"
                      availableVars={templateVariables[form.value as keyof typeof templateVariables]?.user || []}
                      onUpdate={(field, value) => updateTemplate(form.value, 'user', field, value)}
                      onSave={() => saveTemplate(form.value, 'user')}
                      saving={saving === `${form.value}-user`}
                    />
                  </TabsContent>
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
  template: EmailTemplate | undefined;
  formType: string;
  emailType: 'admin' | 'user';
  availableVars: string[];
  onUpdate: (field: 'subject' | 'html_body', value: string) => void;
  onSave: () => void;
  saving: boolean;
}

function TemplateEditor({
  template,
  availableVars,
  onUpdate,
  onSave,
  saving,
}: TemplateEditorProps) {
  if (!template) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Шаблон не найден. Создайте его, заполнив поля ниже.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-lg">
        <p className="text-sm font-medium mb-2">Доступные переменные:</p>
        <div className="flex flex-wrap gap-2">
          {availableVars.map((varName) => (
            <code
              key={varName}
              className="px-2 py-1 bg-white border rounded text-sm cursor-pointer hover:bg-slate-100"
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
        <p className="text-xs text-slate-500 mt-2">
          Нажмите на переменную, чтобы вставить её в шаблон
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Тема письма</Label>
        <Input
          id="subject"
          value={template.subject}
          onChange={(e) => onUpdate('subject', e.target.value)}
          placeholder="Например: Новое сообщение от {{name}}"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="html-body">HTML содержимое</Label>
        <Textarea
          id="html-body"
          value={template.html_body}
          onChange={(e) => onUpdate('html_body', e.target.value)}
          placeholder="HTML код письма..."
          className="font-mono text-sm min-h-[300px]"
        />
        <p className="text-xs text-slate-500">
          Используйте HTML разметку. Переменные вставляются в формате {'{{variable}}'}
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
