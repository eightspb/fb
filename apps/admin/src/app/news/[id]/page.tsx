'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { NewsForm } from '@/components/admin/NewsForm';

export default function EditNewsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // includeAll=true - получить новость даже если она черновик (только для админов)
        const response = await fetch(`/api/news/${id}?includeAll=true`, {
          credentials: 'include'
        });
        if (response.ok) {
          const newsData = await response.json();
          setData(newsData);
        }
      } catch (error) {
        console.error('Error loading news:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) return <div>Загрузка...</div>;
  if (!data) return <div>Новость не найдена</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Редактировать новость</h1>
      <NewsForm initialData={data} isEditing={true} />
    </div>
  );
}













