const fallbackOrigin = '';

export function toPublicUrl(path: string): string {
  if (!path.startsWith('/')) {
    return path;
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? fallbackOrigin;
  if (!origin) {
    return path;
  }

  return new URL(path, origin).toString();
}
