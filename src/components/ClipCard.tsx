import { formatDuration, formatRelativeTime } from "../lib/utils";
import type { Clip } from "../types";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

interface ClipCardProps {
  clip: Clip;
  featured?: boolean;
  manage?: boolean;
  onOpen: (clip: Clip) => void;
  onLike: (clip: Clip) => void;
  onDelete?: (clip: Clip) => void;
}

const visibilityLabel = {
  public: "所有人可见",
  friends: "好友可见",
  private: "仅自己"
};

const mapTone: Record<string, string> = {
  亚海悬城: "sunset",
  源工重镇: "desert",
  隐世修所: "forest",
  森寒冬港: "ice",
  霓虹町: "neon"
};

export function ClipCard({
  clip,
  featured = false,
  manage = false,
  onOpen,
  onLike,
  onDelete
}: ClipCardProps) {
  const tone = mapTone[clip.game_map || ""] || "default";

  return (
    <article
      className={`clip-card ${featured ? "clip-card-featured" : ""}`}
      onClick={() => onOpen(clip)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(clip);
      }}
      role="button"
      tabIndex={0}
    >
      <div className={`clip-poster poster-${tone}`}>
        {clip.thumbnail_url ? (
          <img src={clip.thumbnail_url} alt="" loading="lazy" />
        ) : (
          <div className="poster-fallback">
            <span className="poster-radar" />
            <span className="poster-crosshair" />
            <strong>{clip.game_map || "未知战区"}</strong>
            <small>{clip.agent || "自由特工"}</small>
          </div>
        )}
        <div className="clip-shade" />
        <span className="clip-duration">
          <Icon name="clock" size={13} /> {formatDuration(clip.duration_seconds)}
        </span>
        <span className={`visibility-chip visibility-${clip.visibility}`}>
          <Icon
            name={clip.visibility === "public" ? "globe" : clip.visibility === "friends" ? "users" : "lock"}
            size={13}
          />
          {visibilityLabel[clip.visibility]}
        </span>
        <span className="clip-play">
          <Icon name="play" size={18} />
        </span>
      </div>

      <div className="clip-body">
        <div className="clip-author">
          <Avatar profile={clip.author} size="sm" />
          <div>
            <strong>{clip.author?.display_name || "选手"}</strong>
            <span>{clip.author?.riot_id || `@${clip.author?.username || "player"}`}</span>
          </div>
          <time>{formatRelativeTime(clip.created_at)}</time>
        </div>
        <h3>{clip.title}</h3>
        {clip.description && <p>{clip.description}</p>}
        <div className="clip-meta">
          {(clip.tags || []).slice(0, featured ? 3 : 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="clip-actions">
          <button
            className={clip.liked_by_me ? "is-liked" : ""}
            onClick={(event) => {
              event.stopPropagation();
              onLike(clip);
            }}
            aria-label={clip.liked_by_me ? "取消点赞" : "点赞"}
          >
            <Icon name="heart" size={18} />
            {clip.like_count}
          </button>
          <button onClick={() => onOpen(clip)}>
            <Icon name="comment" size={18} />
            {clip.comment_count}
          </button>
          {manage && onDelete && (
            <button
              className="danger-action"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(clip);
              }}
              aria-label="删除集锦"
            >
              <Icon name="trash" size={17} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
