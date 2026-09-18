import { useMemo, useState } from "react";
import effectHero from "../assets/game-effect.webp";
import effectRail from "../assets/game-effect-rail.webp";
import { ClipCard } from "../components/ClipCard";
import { ClipModal } from "../components/ClipModal";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { useAppData } from "../context/DataContext";
import type { Clip, PageKey } from "../types";

interface HomePageProps {
  onNavigate: (page: PageKey) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { currentProfile, clips, friendClips, acceptedFriends, toggleLike } = useAppData();
  const [selected, setSelected] = useState<Clip | null>(null);
  const [error, setError] = useState("");

  const feed = useMemo(
    () => friendClips.filter((clip) => clip.visibility !== "private"),
    [friendClips]
  );
  const featured = feed[0] || clips[0];
  const rest = feed.filter((clip) => clip.id !== featured?.id);
  const totalLikes = clips.reduce((sum, clip) => sum + clip.like_count, 0);
  const trendingTags = useMemo(() => {
    const counts = new Map<string, number>();
    clips.forEach((clip) => {
      (clip.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [clips]);

  async function like(clip: Clip) {
    try {
      await toggleLike(clip);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : "点赞失败");
    }
  }

  return (
    <div className="desktop-home-grid">
      <div className="desktop-home-main page-stack home-page">
        {error && <div className="form-message form-error">{error}</div>}

        <section className="home-hero">
          <img className="hero-effect-image" src={effectHero} alt="" aria-hidden />
          <span className="hero-effect-grade" aria-hidden />
          <span className="hero-energy-line energy-line-a" aria-hidden />
          <span className="hero-energy-line energy-line-b" aria-hidden />

          <div className="hero-copy">
            <span className="hero-tag"><span /> 今日集锦频道</span>
            <h2>{currentProfile?.display_name || "选手"}，今晚哪一发值得记住？</h2>
            <p>从残局、穿烟到五杀，把属于你的比赛瞬间整理成真正可回看的个人档案。</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#latest">
                <Icon name="play" size={17} /> 浏览好友集锦
              </a>
              <button className="hero-text-action" onClick={() => onNavigate("recorder")}>
                <Icon name="camera" size={17} /> 启动游戏录屏
              </button>
            </div>
          </div>

          <div className="hero-radar" aria-hidden>
            <span className="hero-radar-ring ring-a" />
            <span className="hero-radar-ring ring-b" />
            <span className="hero-radar-ring ring-c" />
            <span className="hero-radar-line line-a" />
            <span className="hero-radar-line line-b" />
            <span className="hero-target-dot dot-a" />
            <span className="hero-target-dot dot-b" />
            <div className="hero-score">
              <small>个人集锦库</small>
              <strong>{clips.length.toString().padStart(2, "0")}</strong>
              <span>条记录</span>
            </div>
          </div>

          <div className="hero-stats">
            <div><span>累计获赞</span><strong>{totalLikes}</strong></div>
            <div><span>并肩好友</span><strong>{acceptedFriends.length}</strong></div>
            <div><span>待处理申请</span><strong>{friendClips.length}</strong></div>
          </div>
        </section>

        <section className="section-block" id="latest">
          <div className="section-heading">
            <div>
              <h2>好友与公开动态</h2>
              <p>好友可见作品只对你和作者的好友开放。</p>
            </div>
            <span className="section-count">{feed.length} 条新动态</span>
          </div>

          {featured ? (
            <div className="featured-grid">
              <ClipCard clip={featured} featured onOpen={setSelected} onLike={(clip) => void like(clip)} />
              <div className="feed-side">
                {rest.slice(0, 3).map((clip) => (
                  <button className="feed-row" key={clip.id} onClick={() => setSelected(clip)}>
                    <span className={`feed-thumb poster-${clip.game_map === "源工重镇" ? "desert" : "default"}`}>
                      {clip.thumbnail_url ? <img src={clip.thumbnail_url} alt="" /> : <Icon name="play" />}
                    </span>
                    <span>
                      <strong>{clip.title}</strong>
                      <small>{clip.author?.display_name} · {clip.game_map || "未知地图"}</small>
                    </span>
                    <time>{clip.duration_seconds.toFixed(0)}s</time>
                  </button>
                ))}
                {!rest.length && (
                  <div className="empty-panel compact">
                    <Icon name="users" />
                    <strong>好友还没有新集锦</strong>
                    <p>邀请好友或先上传第一条作品。</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-panel">
              <Icon name="video" size={28} />
              <strong>广场还是空的</strong>
              <p>上传第一条集锦，占据这个位置。</p>
            </div>
          )}
        </section>

        {rest.length > 3 && (
          <section className="section-block">
            <div className="section-heading">
              <div>
                <h2>继续翻看</h2>
                <p>按发布时间排列的最新集锦。</p>
              </div>
            </div>
            <div className="clip-grid">
              {rest.slice(3).map((clip) => (
                <ClipCard key={clip.id} clip={clip} onOpen={setSelected} onLike={(item) => void like(item)} />
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="desktop-dashboard-rail">
        <section className="rail-profile-card">
          <div className="rail-profile-head">
            <Avatar profile={currentProfile} size="lg" />
            <div>
              <span>当前账号</span>
              <strong>{currentProfile?.display_name || "选手"}</strong>
              <small>@{currentProfile?.username || "player"}</small>
            </div>
          </div>
          <div className="rail-profile-stats">
            <div><strong>{clips.length}</strong><span>集锦</span></div>
            <div><strong>{totalLikes}</strong><span>获赞</span></div>
            <div><strong>{acceptedFriends.length}</strong><span>好友</span></div>
          </div>
        </section>

        <section className="rail-block">
          <div className="rail-block-head">
            <div>
              <h3>在线好友</h3>
              <span>{acceptedFriends.length} 位队友</span>
            </div>
            <button onClick={() => onNavigate("friends")}>查看全部</button>
          </div>
          <div className="rail-friend-list">
            {acceptedFriends.slice(0, 5).map((friend) => (
              <button key={friend.id} onClick={() => onNavigate("friends")}>
                <Avatar profile={friend} size="sm" />
                <span>
                  <strong>{friend.display_name}</strong>
                  <small>{friend.riot_id || `@${friend.username}`}</small>
                </span>
                <i />
              </button>
            ))}
            {!acceptedFriends.length && <p className="rail-empty">还没有好友，先去搜索队友。</p>}
          </div>
        </section>

        <section className="rail-block">
          <div className="rail-block-head">
            <div>
              <h3>热门标签</h3>
              <span>来自你的集锦库</span>
            </div>
          </div>
          <div className="rail-tags">
            {trendingTags.length ? trendingTags.map(([tag, count]) => (
              <button key={tag}>#{tag}<span>{count}</span></button>
            )) : (
              <>
                <button>#残局<span>0</span></button>
                <button>#三杀<span>0</span></button>
                <button>#穿烟<span>0</span></button>
                <button>#复盘<span>0</span></button>
              </>
            )}
          </div>
        </section>

        <section className="rail-block">
          <div className="rail-block-head">
            <div>
              <h3>快捷操作</h3>
              <span>常用桌面入口</span>
            </div>
          </div>
          <div className="rail-actions">
            <button onClick={() => onNavigate("studio")}><Icon name="upload" />上传集锦</button>
            <button onClick={() => onNavigate("recorder")}><Icon name="camera" />游戏录屏</button>
            <button onClick={() => onNavigate("friends")}><Icon name="users" />添加好友</button>
          </div>
        </section>

        <section className="rail-effect-card">
          <img src={effectRail} alt="" aria-hidden />
          <span className="rail-effect-shade" />
          <div>
            <span>今日高光灵感</span>
            <strong>让残局也有电影感</strong>
            <button onClick={() => onNavigate("studio")}>开始整理</button>
          </div>
        </section>
      </aside>

      {selected && <ClipModal clip={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
