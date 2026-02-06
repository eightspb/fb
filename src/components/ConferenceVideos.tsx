import { VideoPlayer } from '@/components/VideoPlayer';
import type { ConferenceVideo } from '@/lib/types/conference';

interface ConferenceVideosProps {
  videos: ConferenceVideo[];
  title?: string;
}

/**
 * ConferenceVideos component - displays videos from previous events
 * Uses the existing VideoPlayer component for consistent styling
 * Videos are stored as files on the server
 */
export function ConferenceVideos({ 
  videos, 
  title = "Видео с предыдущих мероприятий" 
}: ConferenceVideosProps) {
  if (!videos || videos.length === 0) {
    return null;
  }

  // Sort videos by order
  const sortedVideos = [...videos].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">
        {title}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedVideos.map((video) => (
          <div key={video.id} className="space-y-2">
            <VideoPlayer
              src={video.video_url}
              title={video.title}
              duration={video.duration}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
