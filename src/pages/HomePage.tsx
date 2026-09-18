import { useMemo, useState } from "react";
import { useAppData } from "../context/DataContext";
import type { Clip } from "../types";
import { ClipCard } from "../components/ClipCard";
import { ClipModal } from "../components/ClipModal";
import { Icon } from "../components/Icon";

export function HomePage() {
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

  async function like(clip: Clip) {
    try {
      await toggleLike(clip);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : "点赞失败");
    }
  }

  return (
    <div className="page-stack home-page">
      {error && <div className="form-message form-error">{error}</div>}

      <section className="home-hero">
        <div className="hero-copy">
          <span className="hero-tag"><span /> 今日集锦频道</span>
          <h2>{currentProfile?.display_name || "选手"}，今晚哪一发值得记住？</h2>
          <p>从残局、穿烟到五杀，把属于你的比赛瞬间整理成真正可回看的个人档案。</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#latest">
              <Icon name="play" size={17} /> 浏览好友集锦
            </a>
            <span><Icon name="shield" size={17} /> 私密视频桶保护</span>
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
          <div><span>待处理申请</span><strong>—</strong></div>
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
            <ClipCard
              clip={featured}
              featured
              onOpen={setSelected}
              onLike={(clip) => void like(clip)}
            />
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
              <ClipCard
                key={clip.id}
                clip={clip}
                onOpen={setSelected}
                onLike={(item) => void like(item)}
              />
            ))}
          </div>
        </section>
      )}

      {selected && <ClipModal clip={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
