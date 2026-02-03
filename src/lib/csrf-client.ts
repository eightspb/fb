export async function getCsrfToken(): Promise<string> {
  const response = await fetch('/api/csrf', { method: 'GET', credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }
  const data = await response.json();
  if (!data?.csrfToken) {
    throw new Error('Invalid CSRF token response');
  }
  return data.csrfToken as string;
}
