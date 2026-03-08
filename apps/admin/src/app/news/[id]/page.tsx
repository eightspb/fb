'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { NewsForm } from '@/components/admin/NewsForm';

async function newsFetcher(url: string) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Ошибка загрузки');
  return res.json();
}

export default function EditNewsPage() {
  const { id } = useParams();
  const { data, isLoading: loading } = useSWR(
    id ? `/api/news/${id}?includeAll=true` : null,
    newsFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  if (loading) return <div>Загрузка...</div>;
  if (!data) return <div>Новость не найдена</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--frox-gray-1100)]">Редактировать новость</h1>
      <NewsForm initialData={data} isEditing={true} />
    </div>
  );
}













