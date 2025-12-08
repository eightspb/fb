import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { FileText, Calendar } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Обзор</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/admin/news" className="block">
          <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Новости</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Управление новостями</div>
              <p className="text-xs text-muted-foreground">
                Создание, редактирование и публикация новостей
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/conferences" className="block">
          <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Мероприятия</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Управление мероприятиями</div>
              <p className="text-xs text-muted-foreground">
                Редактирование списка конференций и мастер-классов
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

