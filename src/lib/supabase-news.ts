import { supabase } from './supabase';
import { NewsItem } from './news-data';

/**
 * Получить все новости из базы данных
 */
export async function getAllNews(): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from('news')
    .select(`
      *,
      news_images(image_url, order),
      news_tags(tag),
      news_videos(video_url, order),
      news_documents(document_url, order)
    `)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching news:', error);
    return [];
  }

  return data.map(transformNewsFromDB);
}

/**
 * Получить новость по ID
 */
export async function getNewsById(id: string): Promise<NewsItem | null> {
  const { data, error } = await supabase
    .from('news')
    .select(`
      *,
      news_images(image_url, order),
      news_tags(tag),
      news_videos(video_url, order),
      news_documents(document_url, order)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching news by id:', error);
    return null;
  }

  return transformNewsFromDB(data);
}

/**
 * Получить новости по году
 */
export async function getNewsByYear(year: string): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from('news')
    .select(`
      *,
      news_images(image_url, order),
      news_tags(tag),
      news_videos(video_url, order),
      news_documents(document_url, order)
    `)
    .eq('year', year)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching news by year:', error);
    return [];
  }

  return data.map(transformNewsFromDB);
}

/**
 * Получить все уникальные годы
 */
export async function getAllYears(): Promise<string[]> {
  const { data, error } = await supabase
    .from('news')
    .select('year')
    .order('year', { ascending: false });

  if (error) {
    console.error('Error fetching years:', error);
    return [];
  }

  const uniqueYears = [...new Set(data.map(item => item.year))];
  return uniqueYears.sort((a, b) => b.localeCompare(a));
}

/**
 * Получить все категории
 */
export async function getAllCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('news')
    .select('category')
    .not('category', 'is', null);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
  return uniqueCategories.sort();
}

/**
 * Получить фильтры для новостей (теперь ТОЛЬКО категории)
 * Ранее возвращались и теги, и категории
 */
export async function getAllTagsAndCategories(): Promise<string[]> {
  // Возвращаем только категории, так как мы упрощаем фильтрацию
  return getAllCategories();
}

/**
 * Получить количество новостей по тегу или категории
 */
export async function getTagOrCategoryCount(item: string): Promise<number> {
  // Проверяем категории
  const { count: categoryCount } = await supabase
    .from('news')
    .select('*', { count: 'exact', head: true })
    .eq('category', item);

  if (categoryCount && categoryCount > 0) {
    return categoryCount;
  }

  // Проверяем теги (case-insensitive) - для обратной совместимости, если кто-то запросит count для тега
  const normalizedItem = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
  const { count: tagCount } = await supabase
    .from('news_tags')
    .select('*', { count: 'exact', head: true })
    .ilike('tag', `%${normalizedItem}%`);

  return tagCount || 0;
}

/**
 * Проверить, соответствует ли новость фильтру (тег или категория)
 */
export async function newsMatchesFilter(newsId: string, filter: string): Promise<boolean> {
  const news = await getNewsById(newsId);
  if (!news) return false;

  // Проверяем категорию
  if (news.category === filter) {
    return true;
  }

  // Проверяем теги (case-insensitive) - для обратной совместимости
  if (news.tags?.some(tag => 
    tag.toLowerCase() === filter.toLowerCase() || 
    tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase() === filter
  )) {
    return true;
  }

  return false;
}

/**
 * Преобразовать данные из базы данных в формат NewsItem
 */
function transformNewsFromDB(data: any): NewsItem {
  return {
    id: data.id,
    title: data.title,
    shortDescription: data.short_description,
    fullDescription: data.full_description,
    date: data.date,
    year: data.year,
    category: data.category || undefined,
    location: data.location || undefined,
    author: data.author || undefined,
    images: data.news_images?.sort((a: any, b: any) => a.order - b.order).map((img: any) => img.image_url),
    videos: data.news_videos?.sort((a: any, b: any) => a.order - b.order).map((vid: any) => vid.video_url),
    documents: data.news_documents?.sort((a: any, b: any) => a.order - b.order).map((doc: any) => doc.document_url),
    tags: data.news_tags?.map((tag: any) => tag.tag),
  };
}
