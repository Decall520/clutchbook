export type Visibility = "public" | "friends" | "private";
export type ClipStatus = "draft" | "published" | "archived";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  riot_id: string | null;
  bio: string;
  avatar_url: string | null;
  favourite_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Clip {
  id: string;
  user_id: string;
  title: string;
  description: string;
  video_path: string;
  thumbnail_path: string | null;
  duration_seconds: number;
  game_map: string | null;
  agent: string | null;
  tags: string[];
  visibility: Visibility;
  status: ClipStatus;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  video_url?: string;
  thumbnail_url?: string;
  liked_by_me?: boolean;
  demo?: boolean;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface ClipComment {
  id: string;
  clip_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

export interface ClipSource {
  id: string;
  name: string;
  displayId: string;
  thumbnail: string;
  appIcon: string | null;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export type PageKey = "feed" | "studio" | "recorder" | "friends" | "profile";
