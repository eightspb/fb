import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const adminRoot = path.join(repoRoot, 'apps/admin/src');
const exemptPrefixes = [
  '/api/admin/auth',
  '/api/admin/banner',
  '/api/admin/email-templates',
  '/api/admin/direct',
];
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      return [];
    }
    if (fullPath.endsWith('admin-csrf-fetch.ts') || fullPath.endsWith('csrf-client.ts')) {
      return [];
    }
    return [fullPath];
  }));

  return files.flat();
}

function inferMethod(windowText) {
  const literalMethod = windowText.match(/method\s*:\s*['"`](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)['"`]/i);
  if (literalMethod) {
    return literalMethod[1].toUpperCase();
  }
  if (/method\s*:/.test(windowText)) {
    return 'DYNAMIC';
  }
  return 'GET';
}

function inferUrl(windowText) {
  const urlMatch = windowText.match(/\/api\/admin\/[A-Za-z0-9\-_/[\].:?${}]+/);
  return urlMatch?.[0] ?? null;
}

function isExempt(url) {
  return exemptPrefixes.some((prefix) => url.startsWith(prefix));
}

const files = await walk(adminRoot);
const findings = [];
let coveredMutations = 0;

for (const file of files) {
  const contents = await readFile(file, 'utf8');
  const lines = contents.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes('/api/admin/')) {
      continue;
    }

    const start = Math.max(0, index - 3);
    const end = Math.min(lines.length, index + 9);
    const windowLines = lines.slice(start, end);
    const windowText = windowLines.join('\n');
    const url = inferUrl(windowText);

    if (!url || (!windowText.includes('fetch(') && !windowText.includes('adminCsrfFetch('))) {
      continue;
    }

    const method = inferMethod(windowText);
    const usesAdminCsrfFetch = windowText.includes('adminCsrfFetch(');

    if (safeMethods.has(method)) {
      continue;
    }

    if (usesAdminCsrfFetch) {
      coveredMutations += 1;
      continue;
    }

    if (isExempt(url)) {
      continue;
    }

    findings.push({
      file: path.relative(repoRoot, file),
      line: index + 1,
      method,
      url,
    });
  }
}

if (findings.length > 0) {
  console.error('[CSRF AUDIT] Raw admin mutations without adminCsrfFetch detected:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.method} ${finding.url}`);
  }
  process.exit(1);
}

console.log('[CSRF AUDIT] pass');
console.log(`covered_mutations=${coveredMutations}`);
console.log('raw_findings=0');
