export interface Audiobook {
  id: string;
  user_id: string;
  title: string;
  author: string;
  file_name: string;
  file_path: string;
  cover_url: string | null;
  duration: number;
  current_position: number;
  chapters: Chapter[];
  bookmarks: Bookmark[];
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  title: string;
  start_time: number;
  end_time: number;
}

export interface Bookmark {
  id: string;
  label: string;
  position: number;
  created_at: string;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  currentChapter: Chapter | null;
}
