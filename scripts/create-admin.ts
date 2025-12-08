import { createClient } from '@supabase/supabase-js';

// Используем service_role key для обхода RLS и создания пользователей без подтверждения почты
// Этот ключ берется из docker-compose.yml или настроек Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createAdminUser() {
  const email = 'admin@fb.net';
  const password = 'password123';

  console.log(`Создание администратора: ${email}...`);

  try {
    const { data: _data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Автоматически подтверждаем почту
      user_metadata: { role: 'admin' }
    });

    if (error) {
      console.error('Ошибка создания пользователя:', error.message);
      return;
    }

    console.log('✅ Администратор успешно создан!');
    console.log('-----------------------------------');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------------------');
    console.log('Теперь вы можете войти в админку по адресу: /admin/login');
  } catch (err) {
    console.error('Непредвиденная ошибка:', err);
  }
}

createAdminUser();



