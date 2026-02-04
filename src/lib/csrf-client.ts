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
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Проверяем, что cookie действительно установилась
  const verifyToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];
  
  // Если cookie не установилась (например, из-за secure флага), используем токен из ответа
  if (!verifyToken) {
    console.warn('[CSRF] Cookie not set, using token from response directly');
  }
  
  return data.csrfToken as string;
}

// Принудительно обновить CSRF токен (полезно после ошибок)
export async function refreshCsrfToken(): Promise<string> {
  // Удаляем старую cookie
  document.cookie = 'csrf-token=; path=/; max-age=0';
  
  // Запрашиваем новый токен
  const response = await fetch('/api/csrf', { method: 'GET', credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }
  const data = await response.json();
  if (!data?.csrfToken) {
    throw new Error('Invalid CSRF token response');
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return data.csrfToken as string;
}
