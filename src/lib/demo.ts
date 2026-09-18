import type { Clip, ClipComment, Friendship, Profile } from "../types";

const now = Date.now();
const isoAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

export const demoProfiles: Profile[] = [
  {
    id: "demo-me",
    username: "nightshift",
    display_name: "夜班选手",
    riot_id: "NightShift#0824",
    bio: "只记录值得复盘的残局。主玩烟位，偶尔拿狙。",
    avatar_url: null,
    favourite_agent: "Omen",
    created_at: isoAgo(90_000),
    updated_at: isoAgo(20)
  },
  {
    id: "demo-1",
    username: "spark",
    display_name: "小闪",
    riot_id: "SparkRush#CN1",
    bio: "闪光开路，快乐收尾。",
    avatar_url: null,
    favourite_agent: "Reyna",
    created_at: isoAgo(80_000),
    updated_at: isoAgo(70)
  },
  {
    id: "demo-2",
    username: "harborline",
    display_name: "港线",
    riot_id: "HarborLine#0707",
    bio: "控图、架枪、等队友。",
    avatar_url: null,
    favourite_agent: "Harbor",
    created_at: isoAgo(70_000),
    updated_at: isoAgo(110)
  },
  {
    id: "demo-3",
    username: "kayo_ping",
    display_name: "K.O. 打得好",
    riot_id: "KAYOPING#GG",
    bio: "机器人也会打出高光。",
    avatar_url: null,
    favourite_agent: "KAY/O",
    created_at: isoAgo(60_000),
    updated_at: isoAgo(300)
  }
];

const author = (id: string) => demoProfiles.find((profile) => profile.id === id)!;

export const demoClips: Clip[] = [
  {
    id: "clip-hero",
    user_id: "demo-1",
    title: "1v3 残局，最后一发没有抖",
    description: "亚海悬城 A 区回防。队友报点后先收一人，再用大招重置对枪。",
    video_path: "demo/hero.webm",
    thumbnail_path: null,
    duration_seconds: 28,
    game_map: "亚海悬城",
    agent: "Reyna",
    tags: ["残局", "三杀", "排位"],
    visibility: "public",
    status: "published",
    like_count: 248,
    comment_count: 18,
    created_at: isoAgo(22),
    updated_at: isoAgo(22),
    author: author("demo-1"),
    demo: true
  },
  {
    id: "clip-2",
    user_id: "demo-2",
    title: "源工重镇穿烟三杀",
    description: "对面封烟转点，靠脚步和提前枪完成三杀。",
    video_path: "demo/bind.webm",
    thumbnail_path: null,
    duration_seconds: 19,
    game_map: "源工重镇",
    agent: "Harbor",
    tags: ["穿烟", "三杀"],
    visibility: "friends",
    status: "published",
    like_count: 96,
    comment_count: 7,
    created_at: isoAgo(87),
    updated_at: isoAgo(87),
    author: author("demo-2"),
    demo: true
  },
  {
    id: "clip-3",
    user_id: "demo-3",
    title: "KAY/O 大招后的 4K",
    description: "压制结束后从 B 二楼切入，完成四人击杀。",
    video_path: "demo/kayo.webm",
    thumbnail_path: null,
    duration_seconds: 34,
    game_map: "隐世修所",
    agent: "KAY/O",
    tags: ["四杀", "压制"],
    visibility: "public",
    status: "published",
    like_count: 371,
    comment_count: 29,
    created_at: isoAgo(240),
    updated_at: isoAgo(240),
    author: author("demo-3"),
    demo: true
  },
  {
    id: "clip-4",
    user_id: "demo-me",
    title: "晚安局：幽影残局 1v2",
    description: "保留这段，提醒自己残局要先把交叉火力拆开。",
    video_path: "demo/omen.webm",
    thumbnail_path: null,
    duration_seconds: 24,
    game_map: "森寒冬港",
    agent: "Omen",
    tags: ["残局", "复盘"],
    visibility: "friends",
    status: "published",
    like_count: 42,
    comment_count: 3,
    created_at: isoAgo(600),
    updated_at: isoAgo(600),
    author: author("demo-me"),
    demo: true
  }
];

export const demoFriendships: Friendship[] = [
  {
    id: "friend-1",
    requester_id: "demo-me",
    addressee_id: "demo-1",
    status: "accepted",
    created_at: isoAgo(20_000),
    updated_at: isoAgo(19_000),
    requester: author("demo-me"),
    addressee: author("demo-1")
  },
  {
    id: "friend-2",
    requester_id: "demo-me",
    addressee_id: "demo-2",
    status: "accepted",
    created_at: isoAgo(15_000),
    updated_at: isoAgo(14_500),
    requester: author("demo-me"),
    addressee: author("demo-2")
  },
  {
    id: "friend-request",
    requester_id: "demo-3",
    addressee_id: "demo-me",
    status: "pending",
    created_at: isoAgo(46),
    updated_at: isoAgo(46),
    requester: author("demo-3"),
    addressee: author("demo-me")
  }
];

export const demoComments: ClipComment[] = [
  {
    id: "comment-1",
    clip_id: "clip-hero",
    user_id: "demo-2",
    content: "最后那发预瞄太稳了。",
    created_at: isoAgo(18),
    author: author("demo-2")
  },
  {
    id: "comment-2",
    clip_id: "clip-hero",
    user_id: "demo-3",
    content: "建议下次直接开大，节目效果更足。",
    created_at: isoAgo(12),
    author: author("demo-3")
  }
];
