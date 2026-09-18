import { useMemo, useRef, useState, type FormEvent } from "react";
import { useAppData } from "../context/DataContext";
import type { Clip, Visibility } from "../types";
import { Avatar } from "../components/Avatar";
import { ClipCard } from "../components/ClipCard";
import { ClipModal } from "../components/ClipModal";
import { Icon } from "../components/Icon";
import { formatDuration } from "../lib/utils";

type Filter = "all" | Visibility;

export function ProfilePage() {
  const {
    currentProfile,
    myClips,
    toggleLike,
    updateClip,
    deleteClip,
    updateProfile,
    uploadAvatar
  } = useAppData();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentProfile?.display_name || "");
  const [riotId, setRiotId] = useState(currentProfile?.riot_id || "");
  const [bio, setBio] = useState(currentProfile?.bio || "");
  const [favouriteAgent, setFavouriteAgent] = useState(currentProfile?.favourite_agent || "");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Clip | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const filteredClips = useMemo(
    () => myClips.filter((clip) => filter === "all" || clip.visibility === filter),
    [filter, myClips]
  );
  const totalDuration = myClips.reduce((sum, clip) => sum + Number(clip.duration_seconds), 0);
  const totalLikes = myClips.reduce((sum, clip) => sum + clip.like_count, 0);

  function beginEdit() {
    setDisplayName(currentProfile?.display_name || "");
    setRiotId(currentProfile?.riot_id || "");
    setBio(currentProfile?.bio || "");
    setFavouriteAgent(currentProfile?.favourite_agent || "");
    setEditing(true);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateProfile({
        display_name: displayName.trim(),
        riot_id: riotId.trim() || null,
        bio: bio.trim(),
        favourite_agent: favouriteAgent.trim() || null
      });
      setEditing(false);
      setMessage("个人资料已保存。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function chooseAvatar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("头像请选择图片文件");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await uploadAvatar(file);
      setMessage("头像已更新。");
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : "头像上传失败");
    } finally {
      setBusy(false);
    }
  }

  async function removeClip(clip: Clip) {
    if (!window.confirm(`确定删除“${clip.title}”吗？云端视频也会一并删除。`)) return;
    try {
      await deleteClip(clip);
      setMessage("集锦已删除。");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  }

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-banner">
          <span className="profile-grid" />
          <span className="profile-orbit orbit-one" />
          <span className="profile-orbit orbit-two" />
        </div>
        <div className="profile-main-row">
          <div className="profile-avatar-wrap">
            <Avatar profile={currentProfile} size="xl" />
            <button
              className="avatar-upload"
              onClick={() => avatarInput.current?.click()}
              disabled={busy}
              aria-label="更换头像"
            >
              <Icon name="camera" size={16} />
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => void chooseAvatar(event.target.files?.[0])}
            />
          </div>

          <div className="profile-identity">
            <span className="profile-status"><i /> 已登录</span>
            <h2>{currentProfile?.display_name || "选手"}</h2>
            <p>@{currentProfile?.username || "player"} · {currentProfile?.riot_id || "Riot ID 未填写"}</p>
            {currentProfile?.bio && <blockquote>{currentProfile.bio}</blockquote>}
          </div>

          <button className="button button-ghost profile-edit-button" onClick={beginEdit}>
            <Icon name="settings" size={17} /> 编辑资料
          </button>
        </div>

        <div className="profile-stats">
          <div><span>集锦</span><strong>{myClips.length}</strong></div>
          <div><span>总时长</span><strong>{formatDuration(totalDuration)}</strong></div>
          <div><span>获赞</span><strong>{totalLikes}</strong></div>
          <div><span>常用特工</span><strong>{currentProfile?.favourite_agent || "未填写"}</strong></div>
        </div>
      </section>

      {error && <div className="form-message form-error">{error}</div>}
      {message && <div className="form-message form-success">{message}</div>}

      <section className="section-block">
        <div className="section-heading profile-clips-heading">
          <div>
            <h2>个人集锦空间</h2>
            <p>管理作品与可见范围，好友只会看到你允许分享的内容。</p>
          </div>
          <div className="filter-tabs">
            {([
              ["all", "全部"],
              ["public", "公开"],
              ["friends", "好友"],
              ["private", "仅自己"]
            ] as Array<[Filter, string]>).map(([value, label]) => (
              <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredClips.length ? (
          <div className="clip-grid">
            {filteredClips.map((clip) => (
              <div className="managed-clip" key={clip.id}>
                <ClipCard
                  clip={clip}
                  manage
                  onOpen={setSelected}
                  onLike={(item) => void toggleLike(item)}
                  onDelete={removeClip}
                />
                <label className="clip-visibility-control">
                  <Icon name={clip.visibility === "public" ? "globe" : clip.visibility === "friends" ? "users" : "lock"} size={14} />
                  <select
                    value={clip.visibility}
                    onChange={(event) => void updateClip(clip.id, { visibility: event.target.value as Visibility })}
                  >
                    <option value="public">所有人可见</option>
                    <option value="friends">仅好友</option>
                    <option value="private">仅自己</option>
                  </select>
                </label>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <Icon name="folder" size={28} />
            <strong>这里还没有集锦</strong>
            <p>去上传工作台导入录像，或直接用游戏录屏创建。</p>
          </div>
        )}
      </section>

      {editing && (
        <div className="modal-backdrop" onMouseDown={() => setEditing(false)}>
          <form className="profile-editor" onSubmit={saveProfile} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="icon-button modal-close" onClick={() => setEditing(false)}>
              <Icon name="close" />
            </button>
            <div className="panel-heading">
              <span className="step-number">资料</span>
              <div>
                <h2>编辑个人信息</h2>
                <p>用户名不可修改，其余信息随时可以更新。</p>
              </div>
            </div>
            <div className="form-stack">
              <label>
                显示名称
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required />
              </label>
              <label>
                Riot ID
                <input value={riotId} onChange={(event) => setRiotId(event.target.value)} placeholder="NightShift#0824" maxLength={40} />
              </label>
              <label>
                常用特工
                <input value={favouriteAgent} onChange={(event) => setFavouriteAgent(event.target.value)} placeholder="Omen" maxLength={32} />
              </label>
              <label>
                个人简介
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} maxLength={240} placeholder="简单介绍你的打法与目标…" />
                <small>{bio.length}/240</small>
              </label>
            </div>
            <button className="button button-primary" disabled={busy || !displayName.trim()}>
              {busy ? "保存中…" : "保存资料"}
            </button>
          </form>
        </div>
      )}

      {selected && <ClipModal clip={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
