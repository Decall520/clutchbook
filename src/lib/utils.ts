export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function initials(name: string) {
  const clean = name.trim().replace(/\s+/g, "");
  if (!clean) return "集";
  return clean.slice(0, 2).toUpperCase();
}

export function formatDuration(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatRelativeTime(dateValue: string) {
  const date = new Date(dateValue);
  const delta = Date.now() - date.getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const fromType = file.type.split("/").pop()?.toLowerCase();
  return fromType === "quicktime" ? "mov" : fromType || "mp4";
}

export function safeFileName(name: string) {
  return name.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 60) || "clip";
}

export interface VideoMetadata {
  duration: number;
  thumbnail: Blob | null;
}

export async function readVideoMetadata(file: File | Blob): Promise<VideoMetadata> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "metadata";
  video.playsInline = true;

  return new Promise((resolve) => {
    const finish = (thumbnail: Blob | null, duration = 0) => {
      URL.revokeObjectURL(url);
      video.remove();
      resolve({ duration, thumbnail });
    };

    video.onloadedmetadata = () => {
      const seekTime = Math.min(Math.max(video.duration * 0.24, 0.1), 3);
      video.currentTime = Number.isFinite(seekTime) ? seekTime : 0;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 960;
        canvas.height = Math.round(960 * (video.videoHeight / video.videoWidth));
        const context = canvas.getContext("2d");
        if (!context || !canvas.height) return finish(null, video.duration);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob, video.duration), "image/jpeg", 0.82);
      } catch {
        finish(null, video.duration);
      }
    };

    video.onerror = () => finish(null, 0);
    video.src = url;
  });
}

export async function compressAvatar(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = objectUrl;
  await image.decode();

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理此图片");

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86)
  );
  URL.revokeObjectURL(objectUrl);
  if (!blob) throw new Error("头像压缩失败");
  return blob;
}
