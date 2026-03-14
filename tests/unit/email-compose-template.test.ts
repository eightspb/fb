import { describe, expect, it } from 'vitest';
import {
  buildComposeHtml,
  buildComposeBody,
  htmlTemplateToPlainText,
  plainTextToEmailHtml,
  renderComposeTemplateHtml,
  renderComposeTemplate,
} from '../../apps/admin/src/lib/email-compose-template';

describe('email compose template helpers', () => {
  it('renders known variables and removes unknown placeholders', () => {
    expect(renderComposeTemplate('Здравствуйте, {{name}} ({{email}}) {{missing}}', {
      name: 'Анна',
      email: 'anna@example.com',
    })).toBe('Здравствуйте, Анна (anna@example.com) ');
  });

  it('converts html template to plain text with readable line breaks', () => {
    expect(htmlTemplateToPlainText('<p>Здравствуйте, {{name}}!</p><p>Спасибо<br />за письмо.</p>')).toBe(
      'Здравствуйте, {{name}}!\n\nСпасибо\nза письмо.'
    );
  });

  it('preserves link url when converting html template to text', () => {
    expect(htmlTemplateToPlainText('<p><a href="https://fibroadenoma.net">FIBROADENOMA.NET</a></p>')).toBe(
      'FIBROADENOMA.NET (https://fibroadenoma.net)'
    );
  });

  it('removes indentation-driven blank lines from html blocks', () => {
    expect(htmlTemplateToPlainText(`<p>
      С уважением,<br>
      Юлия Борисенкова<br>
      Генеральный директор
    </p>`)).toBe('С уважением,\nЮлия Борисенкова\nГенеральный директор');
  });

  it('prepends template before quoted reply', () => {
    expect(buildComposeBody('<p>Здравствуйте, {{name}}!</p>', { name: 'Анна' }, '\n\n---\n> Цитата')).toBe(
      'Здравствуйте, Анна!\n\n---\n> Цитата'
    );
  });

  it('keeps html template markup when rendering compose body', () => {
    expect(renderComposeTemplateHtml('<p>Здравствуйте, <a href="https://fibroadenoma.net">{{name}}</a>!</p>', { name: 'Анна' })).toBe(
      '<p>Здравствуйте, <a href="https://fibroadenoma.net">Анна</a>!</p>'
    );
    expect(buildComposeHtml('<p>Здравствуйте, {{name}}!</p>', { name: 'Анна' }, '<blockquote>Цитата</blockquote>')).toBe(
      '<p>Здравствуйте, Анна!</p>\n<blockquote>Цитата</blockquote>'
    );
  });

  it('renders single line breaks as br and only keeps paragraph spacing for empty lines', () => {
    expect(plainTextToEmailHtml('С уважением,\nЮлия\n\nhttps://fibroadenoma.net')).toContain(
      '<p style="margin: 0 0 12px 0;">С уважением,<br>Юлия</p>'
    );
    expect(plainTextToEmailHtml('С уважением,\nЮлия\n\nhttps://fibroadenoma.net')).toContain(
      '<a href="https://fibroadenoma.net" target="_blank" rel="noopener noreferrer">https://fibroadenoma.net</a>'
    );
  });

  it('restores labeled links from plain text back to anchors', () => {
    expect(plainTextToEmailHtml('FIBROADENOMA.NET (https://fibroadenoma.net)')).toContain(
      '<a href="https://fibroadenoma.net" target="_blank" rel="noopener noreferrer">FIBROADENOMA.NET</a>'
    );
  });
});
