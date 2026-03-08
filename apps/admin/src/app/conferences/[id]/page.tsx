'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ConferenceForm } from '@/components/admin/ConferenceForm';

async function conferenceFetcher(url: string) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Ошибка загрузки');
  return res.json();
}

export default function EditConferencePage() {
  const { id } = useParams();
  const { data, isLoading: loading } = useSWR(
    id ? `/api/conferences/${id}` : null,
    conferenceFetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  if (loading) return <div>Загрузка...</div>;
  if (!data) return <div>Мероприятие не найдено</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--frox-gray-1100)]">Редактировать мероприятие</h1>
      <ConferenceForm initialData={data} isEditing={true} />
    </div>
  );
}













