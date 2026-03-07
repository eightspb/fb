import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.hoisted(() => vi.fn());
const releaseMock = vi.hoisted(() => vi.fn());
const connectMock = vi.hoisted(() => vi.fn());

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: connectMock,
  })),
}));

async function loadModule() {
  vi.resetModules();
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:54322/postgres';
  return import('@/lib/email-templates');
}

describe('email-templates database helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMock.mockResolvedValue({ rows: [] });
    releaseMock.mockReturnValue(undefined);
    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    });
  });

  it('returns null when a template is absent', async () => {
    const emailTemplates = await loadModule();

    await expect(emailTemplates.getEmailTemplate('contact', 'admin')).resolves.toBeNull();
    expect(queryMock).toHaveBeenCalledWith(
      'SELECT * FROM email_templates WHERE form_type = $1 AND email_type = $2',
      ['contact', 'admin']
    );
    expect(releaseMock).toHaveBeenCalled();
  });

  it('renders a stored template with variables', async () => {
    const emailTemplates = await loadModule();
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'tpl-1',
          form_type: 'contact',
          email_type: 'user',
          subject: 'Здравствуйте, {{name}}',
          html_body: '{{#if message}}<p>{{message}}</p>{{/if}}',
          created_at: '',
          updated_at: '',
        },
      ],
    });

    await expect(emailTemplates.getRenderedEmailTemplate('contact', 'user', {
      name: 'Иван',
      message: 'Спасибо за заявку',
    })).resolves.toEqual({
      subject: 'Здравствуйте, Иван',
      html: '<p>Спасибо за заявку</p>',
    });
  });
});
