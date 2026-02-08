import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

export interface EmailTemplate {
  id: string;
  form_type: string;
  email_type: 'admin' | 'user';
  subject: string;
  html_body: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariables {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  city?: string;
  institution?: string;
  conference?: string;
  certificate?: boolean | string;
  date?: string;
  siteUrl?: string;
  siteHostname?: string;
}

/**
 * Получает шаблон письма из БД
 */
export async function getEmailTemplate(
  formType: string,
  emailType: 'admin' | 'user'
): Promise<EmailTemplate | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM email_templates WHERE form_type = $1 AND email_type = $2',
      [formType, emailType]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } finally {
    client.release();
  }
}

/**
 * Рендерит шаблон с подстановкой переменных
 * Поддерживает простые переменные {{variable}} и условные блоки {{#if variable}}...{{/if}}
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let rendered = template;

  // Подстановка простых переменных {{variable}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    if (value !== undefined && value !== null) {
      // Обработка булевых значений
      if (typeof value === 'boolean') {
        rendered = rendered.replace(regex, value ? 'Да' : 'Нет');
      } else {
        rendered = rendered.replace(regex, String(value));
      }
    } else {
      // Если переменная не определена, заменяем на пустую строку
      rendered = rendered.replace(regex, '');
    }
  });

  // Обработка условных блоков {{#if variable}}...{{/if}}
  const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  rendered = rendered.replace(ifRegex, (match, varName, content) => {
    const value = variables[varName as keyof TemplateVariables];
    if (value && value !== 'false' && value !== '') {
      return content;
    }
    return '';
  });

  // Удаляем оставшиеся необработанные переменные
  rendered = rendered.replace(/\{\{[\w]+\}\}/g, '');

  return rendered;
}

/**
 * Получает и рендерит шаблон письма
 */
export async function getRenderedEmailTemplate(
  formType: string,
  emailType: 'admin' | 'user',
  variables: TemplateVariables
): Promise<{ subject: string; html: string } | null> {
  const template = await getEmailTemplate(formType, emailType);
  
  if (!template) {
    return null;
  }

  return {
    subject: renderTemplate(template.subject, variables),
    html: renderTemplate(template.html_body, variables),
  };
}
