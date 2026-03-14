export const CRM_COMPOSE_TEMPLATE_FORM_TYPE = 'crm_compose';
export const CRM_COMPOSE_TEMPLATE_EMAIL_TYPE = 'admin';

type ComposeTemplateVariables = {
  name?: string;
  email?: string;
};

const HTML_ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => HTML_ENTITY_MAP[entity] ?? entity);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeTextLines(value: string): string {
  return value
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function replaceAnchorWithText(match: string, href: string, text: string): string {
  const normalizedText = decodeHtmlEntities(text.replace(/<[^>]+>/g, '').trim());
  const normalizedHref = href.trim();

  if (!normalizedText) {
    return normalizedHref;
  }

  if (normalizedText.includes(normalizedHref)) {
    return normalizedText;
  }

  return `${normalizedText} (${normalizedHref})`;
}

export function renderComposeTemplate(template: string, variables: ComposeTemplateVariables): string {
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, value?.trim() ? value : '');
  }

  return rendered.replace(/\{\{[\w]+\}\}/g, '');
}

export function renderComposeTemplateHtml(template: string, variables: ComposeTemplateVariables): string {
  return renderComposeTemplate(template, variables).trim();
}

export function htmlTemplateToPlainText(template: string): string {
  return normalizeTextLines(
    decodeHtmlEntities(
      template
      .replace(/\r\n/g, '\n')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, replaceAnchorWithText)
      .replace(/\s*<br\s*\/?>\s*/gi, '<br>')
      .replace(/<br>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/(div|p|li|ul|ol|section|article|blockquote|h[1-6]|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
    )
  );
}

export function buildComposeBody(
  template: string,
  variables: ComposeTemplateVariables,
  quote = ''
): string {
  const renderedTemplate = htmlTemplateToPlainText(renderComposeTemplate(template, variables));
  const normalizedQuote = quote.trimStart();

  if (renderedTemplate && normalizedQuote) {
    return `${renderedTemplate}\n\n${normalizedQuote}`;
  }

  if (renderedTemplate) {
    return renderedTemplate;
  }

  return normalizedQuote;
}

export function buildComposeHtml(
  template: string,
  variables: ComposeTemplateVariables,
  quoteHtml = ''
): string {
  const renderedTemplate = renderComposeTemplateHtml(template, variables);
  const normalizedQuote = quoteHtml.trim();

  if (renderedTemplate && normalizedQuote) {
    return `${renderedTemplate}\n${normalizedQuote}`;
  }

  if (renderedTemplate) {
    return renderedTemplate;
  }

  return normalizedQuote;
}

export function plainTextToEmailHtml(text: string): string {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const renderedParagraphs = paragraphs.map((paragraph) => {
    const escapedParagraph = escapeHtml(paragraph)
      .replace(
        /([^()\n]+?)\s+\(((?:https?:\/\/|www\.)[^)\s]+)\)/gi,
        (_, label: string, rawUrl: string) => {
          const href = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl;
          return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label.trim()}</a>`;
        }
      )
      .replace(
        /(^|[\s>])((https?:\/\/|www\.)[^\s<]+)/gi,
        (_, prefix: string, rawUrl: string) => {
          const href = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl;
          return `${prefix}<a href="${href}" target="_blank" rel="noopener noreferrer">${rawUrl}</a>`;
        }
      );

    return `<p style="margin: 0 0 12px 0;">${escapedParagraph.replace(/\n/g, '<br>')}</p>`;
  });

  return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">
${renderedParagraphs.join('\n')}
</div>`;
}
