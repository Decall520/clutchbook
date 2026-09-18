import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  demoClips,
  demoComments,
  demoFriendships,
  demoProfiles
} from "../lib/demo";
import { requireSupabase, supabase } from "../lib/supabase";
import {
  getFileExtension,
  readVideoMetadata,
  safeFileName,
  compressAvatar
} from "../lib/utils";
import type {
  Clip,
  ClipComment,
  Friendship,
  Profile,
  Visibility
} from "../types";
import { useAuth } from "./AuthContext";

interface UploadClipInput {
  file: File | Blob;
  fileName: string;
  title: string;
  description: string;
  gameMap: string;
  agent: string;
  tags: string[];
  visibility: Visibility;
}

interface UpdateClipInput {
  title?: string;
  description?: string;
  game_map?: string | null;
  agent?: string | null;
  tags?: string[];
  visibility?: Visibility;
  status?: Clip["status"];
}

interface DataContextValue {
  loading: boolean;
  currentProfile: Profile | null;
  allProfiles: Profile[];
  clips: Clip[];
  myClips: Clip[];
  friendClips: Clip[];
  acceptedFriends: Profile[];
  acceptedFriendRecords: Friendship[];
  incomingRequests: Friendship[];
  outgoingRequests: Friendship[];
  refresh: () => Promise<void>;
  uploadClip: (input: UploadClipInput) => Promise<Clip>;
  updateClip: (clipId: string, input: UpdateClipInput) => Promise<void>;
  deleteClip: (clip: Clip) => Promise<void>;
  toggleLike: (clip: Clip) => Promise<void>;
  getComments: (clipId: string) => Promise<ClipComment[]>;
  addComment: (clipId: string, content: string) => Promise<void>;
  searchProfiles: (term: string) => Promise<Profile[]>;
  sendFriendRequest: (profileId: string) => Promise<void>;
  answerFriendRequest: (friendship: Friendship, accept: boolean) => Promise<void>;
  removeFriend: (friendship: Friendship) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, isDemo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [comments, setComments] = useState<ClipComment[]>([]);

  const resetData = useCallback(() => {
    setCurrentProfile(null);
    setAllProfiles([]);
    setClips([]);
    setFriendships([]);
    setComments([]);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      resetData();
      setLoading(false);
      return;
    }

    if (isDemo) {
      setCurrentProfile(demoProfiles.find((profile) => profile.id === user.id) || demoProfiles[0]);
      setAllProfiles(demoProfiles);
      setClips(demoClips);
      setFriendships(demoFriendships);
      setComments(demoComments);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const db = requireSupabase();
      const [profileResult, clipResult, friendshipResult, likeResult] = await Promise.all([
        db.from("profiles").select("*").eq("id", user.id).single(),
        db
          .from("clips")
          .select("*, author:profiles!clips_user_id_fkey(*)")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(80),
        db
          .from("friendships")
          .select(
            "*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)"
          )
          .order("updated_at", { ascending: false }),
        db.from("clip_likes").select("clip_id").eq("user_id", user.id)
      ]);

      const firstError =
        profileResult.error || clipResult.error || friendshipResult.error || likeResult.error;
      if (firstError) throw firstError;

      const clipRows = (clipResult.data || []) as unknown as Clip[];
      const mediaPaths = Array.from(
        new Set(
          clipRows.flatMap((clip) =>
            [clip.video_path, clip.thumbnail_path].filter(Boolean) as string[]
          )
        )
      );

      let signedMap = new Map<string, string>();
      if (mediaPaths.length) {
        const { data: signed } = await db.storage
          .from("highlights")
          .createSignedUrls(mediaPaths, 60 * 60 * 4);
        signedMap = new Map(
          (signed || [])
            .map((item) => [item.path || "", item.signedUrl || ""] as [string, string])
            .filter(([, signedUrl]) => Boolean(signedUrl))
        );
      }

      const likedIds = new Set((likeResult.data || []).map((item) => item.clip_id));
      setCurrentProfile(profileResult.data as Profile);
      setClips(
        clipRows.map((clip) => ({
          ...clip,
          video_url: signedMap.get(clip.video_path),
          thumbnail_url: clip.thumbnail_path
            ? signedMap.get(clip.thumbnail_path)
            : undefined,
          liked_by_me: likedIds.has(clip.id)
        }))
      );
      setFriendships((friendshipResult.data || []) as unknown as Friendship[]);
      setAllProfiles(
        [
          profileResult.data as Profile,
          ...clipRows.map((clip) => clip.author).filter(Boolean),
          ...((friendshipResult.data || []) as unknown as Friendship[]).flatMap((friendship) =>
            [friendship.requester, friendship.addressee].filter(Boolean)
          )
        ].filter(
          (profile, index, values) =>
            profile && values.findIndex((item) => item?.id === profile.id) === index
        ) as Profile[]
      );
    } finally {
      setLoading(false);
    }
  }, [isDemo, resetData, user]);

  useEffect(() => {
    refresh().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [refresh]);

  const uploadClip = useCallback(
    async (input: UploadClipInput) => {
      if (!user) throw new Error("请先登录");
      const metadata = await readVideoMetadata(input.file);
      const extension = getFileExtension(
        new File([input.file], input.fileName, { type: input.file.type || "video/mp4" })
      );
      const clipId = makeId();
      const baseClip: Clip = {
        id: clipId,
        user_id: user.id,
        title: input.title.trim(),
        description: input.description.trim(),
        video_path: `${user.id}/${clipId}.${extension}`,
        thumbnail_path: metadata.thumbnail ? `${user.id}/thumbs/${clipId}.jpg` : null,
        duration_seconds: metadata.duration,
        game_map: input.gameMap || null,
        agent: input.agent || null,
        tags: input.tags,
        visibility: input.visibility,
        status: "published",
        like_count: 0,
        comment_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: currentProfile || undefined,
        demo: isDemo
      };

      if (isDemo) {
        const demoClip: Clip = {
          ...baseClip,
          video_url: URL.createObjectURL(input.file),
          thumbnail_url: metadata.thumbnail ? URL.createObjectURL(metadata.thumbnail) : undefined
        };
        setClips((current) => [demoClip, ...current]);
        return demoClip;
      }

      const db = requireSupabase();
      const file = new File([input.file], input.fileName, {
        type: input.file.type || "video/mp4",
        lastModified: Date.now()
      });
      const { error: uploadError } = await db.storage
        .from("highlights")
        .upload(baseClip.video_path, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false
        });
      if (uploadError) throw uploadError;

      if (metadata.thumbnail) {
        const { error: thumbnailError } = await db.storage
          .from("highlights")
          .upload(baseClip.thumbnail_path!, metadata.thumbnail, {
            contentType: "image/jpeg",
            upsert: false
          });
        if (thumbnailError) console.warn("封面生成已跳过", thumbnailError);
      }

      const { data, error } = await db
        .from("clips")
        .insert({
          id: baseClip.id,
          user_id: baseClip.user_id,
          title: baseClip.title,
          description: baseClip.description,
          video_path: baseClip.video_path,
          thumbnail_path: metadata.thumbnail ? baseClip.thumbnail_path : null,
          duration_seconds: baseClip.duration_seconds,
          game_map: baseClip.game_map,
          agent: baseClip.agent,
          tags: baseClip.tags,
          visibility: baseClip.visibility,
          status: baseClip.status
        })
        .select("*, author:profiles!clips_user_id_fkey(*)")
        .single();

      if (error) {
        await db.storage.from("highlights").remove([baseClip.video_path]);
        throw error;
      }

      const [videoSigned, thumbSigned] = await Promise.all([
        db.storage.from("highlights").createSignedUrl(baseClip.video_path, 60 * 60 * 4),
        baseClip.thumbnail_path
          ? db.storage.from("highlights").createSignedUrl(baseClip.thumbnail_path, 60 * 60 * 4)
          : Promise.resolve({ data: null })
      ]);
      const created: Clip = {
        ...(data as unknown as Clip),
        video_url: videoSigned.data?.signedUrl,
        thumbnail_url: thumbSigned.data?.signedUrl
      };
      setClips((current) => [created, ...current]);
      return created;
    },
    [currentProfile, isDemo, user]
  );

  const updateClip = useCallback(
    async (clipId: string, input: UpdateClipInput) => {
      if (isDemo) {
        setClips((current) =>
          current.map((clip) =>
            clip.id === clipId ? { ...clip, ...input, updated_at: new Date().toISOString() } : clip
          )
        );
        return;
      }
      const db = requireSupabase();
      const { error } = await db.from("clips").update(input).eq("id", clipId);
      if (error) throw error;
      setClips((current) =>
        current.map((clip) =>
          clip.id === clipId ? { ...clip, ...input, updated_at: new Date().toISOString() } : clip
        )
      );
    },
    [isDemo]
  );

  const deleteClip = useCallback(
    async (clip: Clip) => {
      if (isDemo) {
        setClips((current) => current.filter((item) => item.id !== clip.id));
        return;
      }
      const db = requireSupabase();
      const paths = [clip.video_path, clip.thumbnail_path].filter(Boolean) as string[];
      const { error } = await db.from("clips").delete().eq("id", clip.id);
      if (error) throw error;
      if (paths.length) await db.storage.from("highlights").remove(paths);
      setClips((current) => current.filter((item) => item.id !== clip.id));
    },
    [isDemo]
  );

  const toggleLike = useCallback(
    async (clip: Clip) => {
      if (!user) throw new Error("请先登录");
      const isLiked = Boolean(clip.liked_by_me);
      if (isDemo) {
        setClips((current) =>
          current.map((item) =>
            item.id === clip.id
              ? {
                  ...item,
                  liked_by_me: !isLiked,
                  like_count: Math.max(0, item.like_count + (isLiked ? -1 : 1))
                }
              : item
          )
        );
        return;
      }
      const db = requireSupabase();
      const { error } = isLiked
        ? await db.from("clip_likes").delete().eq("clip_id", clip.id).eq("user_id", user.id)
        : await db.from("clip_likes").insert({ clip_id: clip.id, user_id: user.id });
      if (error) throw error;
      setClips((current) =>
        current.map((item) =>
          item.id === clip.id
            ? {
                ...item,
                liked_by_me: !isLiked,
                like_count: Math.max(0, item.like_count + (isLiked ? -1 : 1))
              }
            : item
        )
      );
    },
    [isDemo, user]
  );

  const getComments = useCallback(
    async (clipId: string) => {
      if (isDemo) return comments.filter((comment) => comment.clip_id === clipId);
      const db = requireSupabase();
      const { data, error } = await db
        .from("clip_comments")
        .select("*, author:profiles!clip_comments_user_id_fkey(*)")
        .eq("clip_id", clipId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ClipComment[];
    },
    [comments, isDemo]
  );

  const addComment = useCallback(
    async (clipId: string, content: string) => {
      if (!user) throw new Error("请先登录");
      const clean = content.trim();
      if (!clean) return;

      if (isDemo) {
        const created: ClipComment = {
          id: makeId(),
          clip_id: clipId,
          user_id: user.id,
          content: clean,
          created_at: new Date().toISOString(),
          author: currentProfile || undefined
        };
        setComments((current) => [...current, created]);
        setClips((current) =>
          current.map((clip) =>
            clip.id === clipId ? { ...clip, comment_count: clip.comment_count + 1 } : clip
          )
        );
        return;
      }

      const db = requireSupabase();
      const { data, error } = await db
        .from("clip_comments")
        .insert({ clip_id: clipId, user_id: user.id, content: clean })
        .select("*, author:profiles!clip_comments_user_id_fkey(*)")
        .single();
      if (error) throw error;
      setClips((current) =>
        current.map((clip) =>
          clip.id === clipId ? { ...clip, comment_count: clip.comment_count + 1 } : clip
        )
      );
      setComments((current) => [...current, data as unknown as ClipComment]);
    },
    [currentProfile, isDemo, user]
  );

  const searchProfiles = useCallback(
    async (term: string) => {
      if (!user) return [];
      const clean = term.trim().replace(/[%(),]/g, "");
      if (!clean) return [];

      if (isDemo) {
        const normalized = clean.toLowerCase();
        return demoProfiles.filter(
          (profile) =>
            profile.id !== user.id &&
            [profile.username, profile.display_name, profile.riot_id || ""].some((value) =>
              value.toLowerCase().includes(normalized)
            )
        );
      }

      const db = requireSupabase();
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%,riot_id.ilike.%${clean}%`)
        .neq("id", user.id)
        .limit(12);
      if (error) throw error;
      return (data || []) as Profile[];
    },
    [isDemo, user]
  );

  const sendFriendRequest = useCallback(
    async (profileId: string) => {
      if (!user) throw new Error("请先登录");
      const existing = friendships.find(
        (item) =>
          (item.requester_id === user.id && item.addressee_id === profileId) ||
          (item.addressee_id === user.id && item.requester_id === profileId)
      );
      if (existing) throw new Error(existing.status === "accepted" ? "你们已经是好友" : "已有待处理申请");

      if (isDemo) {
        const target = demoProfiles.find((profile) => profile.id === profileId);
        const created: Friendship = {
          id: makeId(),
          requester_id: user.id,
          addressee_id: profileId,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          requester: currentProfile || undefined,
          addressee: target
        };
        setFriendships((current) => [created, ...current]);
        return;
      }

      const db = requireSupabase();
      const { error } = await db.from("friendships").insert({
        requester_id: user.id,
        addressee_id: profileId,
        status: "pending"
      });
      if (error) throw error;
      await refresh();
    },
    [currentProfile, friendships, isDemo, refresh, user]
  );

  const answerFriendRequest = useCallback(
    async (friendship: Friendship, accept: boolean) => {
      if (isDemo) {
        if (accept) {
          setFriendships((current) =>
            current.map((item) =>
              item.id === friendship.id ? { ...item, status: "accepted" } : item
            )
          );
        } else {
          setFriendships((current) => current.filter((item) => item.id !== friendship.id));
        }
        return;
      }
      const db = requireSupabase();
      const result = accept
        ? await db.from("friendships").update({ status: "accepted" }).eq("id", friendship.id)
        : await db.from("friendships").delete().eq("id", friendship.id);
      if (result.error) throw result.error;
      await refresh();
    },
    [isDemo, refresh]
  );

  const removeFriend = useCallback(
    async (friendship: Friendship) => {
      if (isDemo) {
        setFriendships((current) => current.filter((item) => item.id !== friendship.id));
        return;
      }
      const db = requireSupabase();
      const { error } = await db.from("friendships").delete().eq("id", friendship.id);
      if (error) throw error;
      await refresh();
    },
    [isDemo, refresh]
  );

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) throw new Error("请先登录");
      if (isDemo) {
        setCurrentProfile((current) => (current ? { ...current, ...patch } : current));
        return;
      }
      const db = requireSupabase();
      const { data, error } = await db
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      setCurrentProfile(data as Profile);
    },
    [isDemo, user]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) throw new Error("请先登录");
      const blob = await compressAvatar(file);
      if (isDemo) {
        const url = URL.createObjectURL(blob);
        setCurrentProfile((current) => (current ? { ...current, avatar_url: url } : current));
        return;
      }
      const db = requireSupabase();
      const path = `${user.id}/avatar-${Date.now()}.webp`;
      const { error: uploadError } = await db.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/webp", upsert: true });
      if (uploadError) throw uploadError;
      const { data } = db.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
      await updateProfile({ avatar_url: avatarUrl });
    },
    [isDemo, updateProfile, user]
  );

  const acceptedFriendships = friendships.filter((item) => item.status === "accepted");
  const acceptedFriends = acceptedFriendships
    .map((item) => (item.requester_id === user?.id ? item.addressee : item.requester))
    .filter(Boolean) as Profile[];
  const incomingRequests = friendships.filter(
    (item) => item.status === "pending" && item.addressee_id === user?.id
  );
  const outgoingRequests = friendships.filter(
    (item) => item.status === "pending" && item.requester_id === user?.id
  );

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      currentProfile,
      allProfiles,
      clips,
      myClips: clips.filter((clip) => clip.user_id === user?.id),
      friendClips: clips.filter((clip) => clip.user_id !== user?.id),
      acceptedFriends,
      acceptedFriendRecords: acceptedFriendships,
      incomingRequests,
      outgoingRequests,
      refresh,
      uploadClip,
      updateClip,
      deleteClip,
      toggleLike,
      getComments,
      addComment,
      searchProfiles,
      sendFriendRequest,
      answerFriendRequest,
      removeFriend,
      updateProfile,
      uploadAvatar
    }),
    [
      acceptedFriends,
      acceptedFriendships,
      addComment,
      allProfiles,
      answerFriendRequest,
      clips,
      currentProfile,
      deleteClip,
      getComments,
      incomingRequests,
      loading,
      outgoingRequests,
      refresh,
      removeFriend,
      searchProfiles,
      sendFriendRequest,
      toggleLike,
      updateClip,
      updateProfile,
      uploadAvatar,
      uploadClip,
      user?.id
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useAppData 必须在 AppDataProvider 内使用");
  return context;
}

