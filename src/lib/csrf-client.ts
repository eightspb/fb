export async function getCsrfToken(): Promise<string> {
  // Сначала проверяем, есть ли уже токен в cookie
  const existingToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];

  if (existingToken) {
    return existingToken;
  }

  // Если нет, запрашиваем новый токен
  const response = await fetch('/api/csrf', { method: 'GET', credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }
  const data = await response.json();
  if (!data?.csrfToken) {
    throw new Error('Invalid CSRF token response');
  }
  
  // Небольшая задержка, чтобы cookie успела установиться
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return data.csrfToken as string;
}
