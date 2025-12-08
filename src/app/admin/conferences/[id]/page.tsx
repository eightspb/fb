'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ConferenceForm } from '@/components/admin/ConferenceForm';
import { supabase } from '@/lib/supabase';

export default function EditConferencePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`/api/conferences/${id}`, {
          headers: {
             'Authorization': `Bearer ${session?.access_token || ''}`
          }
        });
        if (response.ok) {
          const confData = await response.json();
          setData(confData);
        }
      } catch (error) {
        console.error('Error loading conference:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) return <div>Загрузка...</div>;
  if (!data) return <div>Мероприятие не найдено</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Редактировать мероприятие</h1>
      <ConferenceForm initialData={data} isEditing={true} />
    </div>
  );
}



