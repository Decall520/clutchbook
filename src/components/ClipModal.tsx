import { useEffect, useState, type FormEvent } from "react";
import { useAppData } from "../context/DataContext";
import { formatDuration, formatRelativeTime } from "../lib/utils";
import type { Clip, ClipComment } from "../types";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

interface ClipModalProps {
  clip: Clip;
  onClose: () => void;
}

export function ClipModal({ clip, onClose }: ClipModalProps) {
  const { getComments, addComment, toggleLike } = useAppData();
  const [comments, setComments] = useState<ClipComment[]>([]);
  const [message, setMessage] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingComments(true);
    getComments(clip.id)
      .then((data) => {
        if (active) setComments(data);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : "评论加载失败");
      })
      .finally(() => {
        if (active) setLoadingComments(false);
      });
    return () => {
      active = false;
    };
  }, [clip.id, getComments]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await addComment(clip.id, message);
      setComments(await getComments(clip.id));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "评论发送失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <article className="clip-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close icon-button" onClick={onClose} aria-label="关闭">
          <Icon name="close" />
        </button>

        <div className="modal-player">
          {clip.video_url ? (
            <video src={clip.video_url} poster={clip.thumbnail_url} controls autoPlay playsInline />
          ) : (
            <div className="modal-player-empty">
              <span className="poster-radar" />
              <Icon name="play" size={34} />
              <strong>演示集锦暂未附带视频</strong>
              <p>进入演示模式并上传本地视频，即可在这里直接播放。</p>
            </div>
          )}
          <span className="modal-duration">{formatDuration(clip.duration_seconds)}</span>
        </div>

        <div className="modal-content">
          <div className="modal-author-row">
            <Avatar profile={clip.author} size="md" />
            <div>
              <strong>{clip.author?.display_name || "选手"}</strong>
              <span>{clip.author?.riot_id || `@${clip.author?.username || "player"}`}</span>
            </div>
            <time>{formatRelativeTime(clip.created_at)}</time>
          </div>

          <h2>{clip.title}</h2>
          {clip.description && <p className="modal-description">{clip.description}</p>}

          <div className="modal-meta-grid">
            <div>
              <span>地图</span>
              <strong>{clip.game_map || "未填写"}</strong>
            </div>
            <div>
              <span>特工</span>
              <strong>{clip.agent || "未填写"}</strong>
            </div>
            <div>
              <span>时间</span>
              <strong>{formatDuration(clip.duration_seconds)}</strong>
            </div>
            <div>
              <span>可见范围</span>
              <strong>
                {clip.visibility === "public"
                  ? "所有人"
                  : clip.visibility === "friends"
                    ? "好友"
                    : "仅自己"}
              </strong>
            </div>
          </div>

          <div className="modal-engagement">
            <button
              className={clip.liked_by_me ? "is-liked" : ""}
              onClick={() => toggleLike(clip)}
            >
              <Icon name="heart" />
              {clip.liked_by_me ? "已点赞" : "点赞"} · {clip.like_count}
            </button>
            <span>
              <Icon name="comment" /> {comments.length} 条评论
            </span>
          </div>

          <section className="comments-section">
            <h3>评论</h3>
            {loadingComments ? (
              <div className="inline-loading">正在加载评论…</div>
            ) : comments.length ? (
              <div className="comment-list">
                {comments.map((comment) => (
                  <div className="comment" key={comment.id}>
                    <Avatar profile={comment.author} size="sm" />
                    <div>
                      <div className="comment-head">
                        <strong>{comment.author?.display_name || "选手"}</strong>
                        <time>{formatRelativeTime(comment.created_at)}</time>
                      </div>
                      <p>{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-copy">还没有评论，留下第一条复盘意见。</p>
            )}

            <form className="comment-form" onSubmit={submitComment}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="说点什么…"
                maxLength={300}
              />
              <button className="button button-primary" disabled={submitting || !message.trim()}>
                {submitting ? "发送中" : "发送"}
              </button>
            </form>
          </section>
        </div>
      </article>
    </div>
  );
}
