import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useAppData } from "../context/DataContext";
import type { Visibility } from "../types";
import { Icon } from "../components/Icon";

const maps = ["亚海悬城", "源工重镇", "隐世修所", "森寒冬港", "霓虹町", "莲华古城", "裂变峡谷", "深海明珠"];
const agents = ["Jett", "Reyna", "Omen", "Sova", "Killjoy", "Raze", "Viper", "Fade", "Harbor", "KAY/O", "Neon", "Clove"];
const visibilityOptions: Array<{ value: Visibility; label: string; description: string; icon: "globe" | "users" | "lock" }> = [
  { value: "public", label: "所有人", description: "所有登录用户都可查看", icon: "globe" },
  { value: "friends", label: "仅好友", description: "你的好友可见，推荐默认", icon: "users" },
  { value: "private", label: "仅自己", description: "只进入个人空间", icon: "lock" }
];

export function StudioPage() {
  const { uploadClip } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gameMap, setGameMap] = useState("");
  const [agent, setAgent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("friends");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    setError("");
    setMessage("");
    if (!nextFile.type.startsWith("video/")) {
      setError("请选择视频文件");
      return;
    }
    if (nextFile.size > 1024 * 1024 * 1024) {
      setError("单个视频不能超过 1 GB");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    if (!title) setTitle(nextFile.name.replace(/\.[^.]+$/, ""));
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragActive(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  function addTag() {
    const clean = tagInput.trim().replace(/^#/, "").slice(0, 12);
    if (clean && !tags.includes(clean) && tags.length < 6) {
      setTags((current) => [...current, clean]);
    }
    setTagInput("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("先选择一段本地视频");
      return;
    }
    if (!title.trim()) {
      setError("给这条集锦写一个标题");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await uploadClip({
        file,
        fileName: file.name,
        title,
        description,
        gameMap,
        agent,
        tags,
        visibility
      });
      setMessage("集锦已经发布，好友现在可以看到它了。");
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setTitle("");
      setDescription("");
      setGameMap("");
      setAgent("");
      setTags([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="studio-layout" onSubmit={submit}>
      <div className="studio-main">
        <section className="panel panel-cut">
          <div className="panel-heading">
            <span className="step-number">01</span>
            <div>
              <h2>选择集锦视频</h2>
              <p>支持 MP4、WebM、MOV、MKV，单个文件最大 1 GB。</p>
            </div>
          </div>

          <div
            className={`drop-zone ${dragActive ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv"
              onChange={(event) => chooseFile(event.target.files?.[0])}
              hidden
            />
            {file ? (
              <>
                <div className="video-preview">
                  <video src={previewUrl} muted playsInline />
                  <span><Icon name="play" size={22} /></span>
                </div>
                <div className="drop-file-copy">
                  <strong>{file.name}</strong>
                  <span>{(file.size / 1024 / 1024).toFixed(1)} MB · 点击更换视频</span>
                </div>
                <Icon name="refresh" />
              </>
            ) : (
              <>
                <span className="drop-icon"><Icon name="upload" size={30} /></span>
                <strong>把录像拖到这里</strong>
                <p>或者点击选择本地文件</p>
                <span className="button button-ghost">选择视频</span>
              </>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <span className="step-number">02</span>
            <div>
              <h2>补全集锦信息</h2>
              <p>标题和标签会帮助好友更快找到这段高光。</p>
            </div>
          </div>

          <div className="form-stack">
            <label>
              集锦标题
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：隐世修所 1v3 残局"
                maxLength={80}
                required
              />
              <small>{title.length}/80</small>
            </label>

            <label>
              复盘备注
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="记录这波操作的关键判断、失误或值得复用的细节…"
                maxLength={500}
                rows={4}
              />
            </label>

            <div className="field-row">
              <label>
                地图
                <select value={gameMap} onChange={(event) => setGameMap(event.target.value)}>
                  <option value="">选择地图</option>
                  {maps.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                特工
                <select value={agent} onChange={(event) => setAgent(event.target.value)}>
                  <option value="">选择特工</option>
                  {agents.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <label>
              标签
              <div className="tag-input-row">
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="输入标签后按回车，例如 残局"
                  maxLength={12}
                />
                <button type="button" className="button button-ghost" onClick={addTag} disabled={tags.length >= 6}>
                  添加
                </button>
              </div>
            </label>
            {tags.length > 0 && (
              <div className="tag-list">
                {tags.map((tag) => (
                  <button type="button" key={tag} onClick={() => setTags((current) => current.filter((item) => item !== tag))}>
                    #{tag} <Icon name="close" size={13} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <aside className="studio-side">
        <section className="panel publish-panel">
          <div className="panel-heading compact-heading">
            <span className="step-number">03</span>
            <div>
              <h2>发布范围</h2>
              <p>随时可以修改。</p>
            </div>
          </div>

          <div className="visibility-options">
            {visibilityOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={visibility === option.value ? "active" : ""}
                onClick={() => setVisibility(option.value)}
              >
                <Icon name={option.icon} />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <i>{visibility === option.value && <Icon name="check" size={14} />}</i>
              </button>
            ))}
          </div>

          {error && <div className="form-message form-error">{error}</div>}
          {message && <div className="form-message form-success">{message}</div>}

          <button className="button button-primary publish-button" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" /> 正在上传与生成封面…
              </>
            ) : (
              <>
                <Icon name="upload" size={18} /> 发布集锦
              </>
            )}
          </button>
          <p className="publish-note"><Icon name="shield" size={14} /> 视频存放在私有存储桶，仅按你选择的范围授权。</p>
        </section>

        <section className="tips-panel">
          <Icon name="spark" />
          <h3>录得清楚，比录得久更重要</h3>
          <p>建议截取击杀前 3 秒到战斗结束后 2 秒，文件更小，好友也更容易看完。</p>
        </section>
      </aside>
    </form>
  );
}
