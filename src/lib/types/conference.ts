// Conference-related TypeScript interfaces
// Centralized type definitions for the new conference structure

/**
 * Speaker interface - represents a conference speaker or presidium member
 * One speaker can have multiple talks in the program
 */
export interface Speaker {
  id: string;
  name: string;
  photo: string;
  credentials: string;
  institution: string;      // Organization/city (e.g., "МНИОИ им. П.А. Герцена, Москва")
  is_presidium: boolean;    // Flag for presidium members
  order: number;            // Display order
  
  // Legacy fields (for backward compatibility)
  report_title?: string;    // Deprecated: moved to program
  report_time?: string;     // Deprecated: moved to program
}

/**
 * Program item interface - represents a single event in the conference schedule
 * Can be a talk, break, or other event
 */
export interface ProgramItem {
  id: string;
  time_start: string;       // Format: "10:00"
  time_end: string;         // Format: "10:30"
  speaker_id?: string;      // Link to speaker (optional, one speaker can have multiple talks)
  speaker_name?: string;    // Speaker name if not in speakers list
  title: string;            // Talk/event title
  description?: string;     // Optional description
  type: 'talk' | 'break' | 'other';  // Event type
  order: number;            // Display order in schedule
}

/**
 * Conference video interface - represents a video from previous events
 * Videos are stored as files on the server, not external links
 */
export interface ConferenceVideo {
  id: string;
  title: string;            // Video title
  video_url: string;        // Path to video file (e.g., /videos/conferences/sms3_video1.mp4)
  duration?: string;        // Optional duration (e.g., "5:30")
  order: number;            // Display order
}

/**
 * Organizer contacts interface
 */
export interface OrganizerContacts {
  name?: string;
  phone?: string;
  email?: string;
  additional?: string;
}

/**
 * Conference interface - main conference data structure
 */
export interface Conference {
  id: string;
  slug?: string;
  title: string;
  date: string;
  date_end?: string;
  description: string;
  type: string;
  location: string | null;
  speaker: string | null;   // Legacy field
  cme_hours: number | null;
  program: ProgramItem[] | string[];  // New: structured array, or legacy: string array
  materials: string[];
  status: string;
  cover_image?: string;
  speakers?: Speaker[];
  organizer_contacts?: OrganizerContacts;
  additional_info?: string;
  videos?: ConferenceVideo[];  // New: videos from previous events
}

/**
 * Helper function to check if program is in new structured format
 */
export function isStructuredProgram(program: ProgramItem[] | string[]): program is ProgramItem[] {
  return program.length > 0 && typeof program[0] === 'object' && 'time_start' in program[0];
}

/**
 * Helper function to get speakers by type
 */
export function getSpeakersByType(speakers: Speaker[] = [], isPresidium: boolean): Speaker[] {
  return speakers
    .filter(s => s.is_presidium === isPresidium)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Helper function to get speaker by ID
 */
export function getSpeakerById(speakers: Speaker[] = [], speakerId: string): Speaker | undefined {
  return speakers.find(s => s.id === speakerId);
}

/**
 * Helper function to format time range
 */
export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}
