import { useEffect, useRef, useState } from "react";
import { useAppData } from "../context/DataContext";
import { formatDuration } from "../lib/utils";
import type { ClipSource, Visibility } from "../types";
import { Icon } from "../components/Icon";

const preferredTypes = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm"
];

export function RecorderPage() {
  const { uploadClip } = useAppData();
  const previewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [sources, setSources] = useState<ClipSource[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [webMode, setWebMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [title, setTitle] = useState("");
  const [gameMap, setGameMap] = useState("");
  const [agent, setAgent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("friends");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSources();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function loadSources() {
    if (!window.clutchbook?.capture) {
      setWebMode(true);
      setSelectedSource("browser");
      setError("");
      return;
    }
    setWebMode(false);
    try {
      const list = await window.clutchbook.capture.listSources();
      setSources(list);
      if (list[0]) {
        setSelectedSource(list[0].id);
        await window.clutchbook.capture.selectSource(list[0].id);
      }
    } catch (sourceError) {
      setError(sourceError instanceof Error ? sourceError.message : "无法读取录屏来源");
    }
  }

  async function chooseSource(source: ClipSource) {
    setSelectedSource(source.id);
    await window.clutchbook?.capture.selectSource(source.id);
  }

  async function startRecording() {
    if (!window.clutchbook?.capture && !navigator.mediaDevices?.getDisplayMedia) {
      setError("当前浏览器不支持屏幕录制，请使用最新版 Chrome、Edge 或桌面客户端。");
      return;
    }
    if (window.clutchbook?.capture && !selectedSource) {
      setError("先选择一个屏幕或游戏窗口。");
      return;
    }

    setError("");
    setMessage("");
    setElapsed(0);
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl("");

    try {
      if (window.clutchbook?.capture) {
        await window.clutchbook.capture.selectSource(selectedSource);
      }
      const nextStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });
      streamRef.current = nextStream;
      setStream(nextStream);

      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(nextStream, {
        mimeType,
        videoBitsPerSecond: 9_000_000,
        audioBitsPerSecond: 192_000
      });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setTitle((current) => current || `赛点回放 ${new Date().toLocaleDateString("zh-CN")}`);
        nextStream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
      };
      nextStream.getVideoTracks()[0]?.addEventListener("ended", () => stopRecording());
      recorder.start(1000);
      setRecording(true);
      timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "录屏启动失败，请重新选择来源");
      streamRef.current?.getTracks().forEach((track) => track.stop());
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  async function saveLocal() {
    if (!recordedBlob) return;
    if (!window.clutchbook?.recording) {
      const link = document.createElement("a");
      link.href = recordedUrl;
      link.download = "集火-集锦.webm";
      link.click();
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await recordedBlob.arrayBuffer());
      const result = await window.clutchbook.recording.save(bytes, "webm");
      if (!result.canceled && result.path) setMessage(`已保存到 ${result.path}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function publishRecording() {
    if (!recordedBlob || !title.trim()) {
      setError("录制完成后填写标题再上传。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const file = new File([recordedBlob], `clutch-${Date.now()}.webm`, { type: "video/webm" });
      await uploadClip({
        file,
        fileName: file.name,
        title,
        description: "通过集火桌面录屏发布。",
        gameMap,
        agent,
        tags: ["录屏"],
        visibility
      });
      setMessage("录制内容已经上传并发布。");
      setRecordedBlob(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl("");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (previewRef.current && stream) previewRef.current.srcObject = stream;
  }, [stream]);

  const selected = sources.find((source) => source.id === selectedSource);
  const canStart = webMode || Boolean(selectedSource);

  return (
    <div className="recorder-page">
      <section className="recorder-stage panel">
        <div className="recorder-toolbar">
          <div>
            <span className={`live-dot ${recording ? "is-live" : ""}`} />
            <strong>{recording ? "正在录制" : recordedBlob ? "录制完成" : "准备录制"}</strong>
            <small>{webMode ? "浏览器屏幕共享" : selected?.name || "尚未选择来源"}</small>
          </div>
          <div className="recorder-clock">{formatDuration(elapsed)}</div>
        </div>

        <div className="record-preview">
          {stream ? (
            <video ref={previewRef} autoPlay muted playsInline />
          ) : recordedUrl ? (
            <video src={recordedUrl} controls playsInline />
          ) : (
            <div className="record-placeholder">
              <span className="record-reticle"><span /></span>
              <Icon name="monitor" size={38} />
              <strong>选择录制来源</strong>
              <p>游戏建议选择全屏显示器；只录游戏时选择对应窗口。</p>
            </div>
          )}
        </div>

        <div className="recorder-controls">
          {!recording ? (
            <button className="record-button" onClick={() => void startRecording()} disabled={!canStart || Boolean(recordedBlob)}>
              <span /><strong>{recordedBlob ? "已停止" : "开始录制"}</strong>
            </button>
          ) : (
            <button className="record-button is-recording" onClick={stopRecording}>
              <span><Icon name="stop" size={15} /></span><strong>停止录制</strong>
            </button>
          )}
          <p>{webMode ? "点击开始后，浏览器会询问要共享的屏幕、窗口或标签页。录制结束后可下载或直接发布。" : "Windows 客户端可同时捕获系统声音。录制结束后可保存本地或直接发布。"}</p>
        </div>
      </section>

      <aside className="recorder-side">
        {!recordedBlob ? (
          <section className="source-panel panel">
            <div className="panel-heading compact-heading">
              <div>
                <h2>录制来源</h2>
                <p>{webMode ? "由浏览器安全地询问共享目标。" : "选择屏幕或正在运行的游戏窗口。"}</p>
              </div>
              {!webMode && (
                <button className="icon-button" onClick={() => void loadSources()} aria-label="刷新来源">
                  <Icon name="refresh" />
                </button>
              )}
            </div>
            {webMode && (
              <div className="browser-capture-note">
                <Icon name="monitor" size={26} />
                <strong>浏览器屏幕共享</strong>
                <p>点击“开始录制”后，请选择整个屏幕、游戏窗口或浏览器标签页。录制权限完全由你控制。</p>
              </div>
            )}
            <div className="source-list">
              {sources.map((source) => (
                <button
                  key={source.id}
                  className={selectedSource === source.id ? "active" : ""}
                  onClick={() => void chooseSource(source)}
                  disabled={recording}
                >
                  <img src={source.thumbnail} alt="" />
                  <span>
                    <strong>{source.name}</strong>
                    <small>{source.id.startsWith("screen:") ? "显示器" : "应用窗口"}</small>
                  </span>
                  {selectedSource === source.id && <Icon name="check" size={17} />}
                </button>
              ))}
              {!sources.length && !webMode && <p className="empty-copy">没有找到可录制来源。</p>}
            </div>
          </section>
        ) : (
          <section className="panel publish-panel">
            <div className="panel-heading compact-heading">
              <div>
                <h2>发布这段集锦</h2>
                <p>{formatDuration(elapsed)} · 已生成 WebM 文件</p>
              </div>
            </div>
            <div className="form-stack">
              <label>
                标题
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} />
              </label>
              <div className="field-row">
                <label>
                  地图
                  <input value={gameMap} onChange={(event) => setGameMap(event.target.value)} placeholder="可选" />
                </label>
                <label>
                  特工
                  <input value={agent} onChange={(event) => setAgent(event.target.value)} placeholder="可选" />
                </label>
              </div>
              <label>
                可见范围
                <select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)}>
                  <option value="friends">仅好友</option>
                  <option value="public">所有人</option>
                  <option value="private">仅自己</option>
                </select>
              </label>
            </div>
            <div className="recorder-actions">
              <button className="button button-ghost" onClick={() => void saveLocal()} disabled={busy}>
                <Icon name="download" size={17} /> 保存本地
              </button>
              <button className="button button-primary" onClick={() => void publishRecording()} disabled={busy}>
                {busy ? <span className="spinner" /> : <Icon name="upload" size={17} />} 上传发布
              </button>
            </div>
          </section>
        )}

        <section className="tips-panel">
          <Icon name="camera" />
          <h3>建议使用无边框窗口模式</h3>
          <p>部分独占全屏游戏在切换窗口时可能黑屏。选择窗口录制通常更稳定，也可避免录到桌面通知。</p>
        </section>

        {error && <div className="form-message form-error">{error}</div>}
        {message && <div className="form-message form-success">{message}</div>}
      </aside>
    </div>
  );
}
