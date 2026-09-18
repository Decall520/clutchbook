import { createClient } from "@supabase/supabase-js";

const runtimeStorageKey = "clutchbook.supabase.runtime";

interface RuntimeSupabaseConfig {
  url: string;
  key: string;
}

function readRuntimeConfig(): RuntimeSupabaseConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(runtimeStorageKey) || "null");
    if (typeof parsed?.url === "string" && typeof parsed?.key === "string") {
      return { url: parsed.url.trim(), key: parsed.key.trim() };
    }
  } catch {
    return null;
  }
  return null;
}

const runtimeConfig = readRuntimeConfig();
const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const rawUrl = runtimeConfig?.url || envUrl;
const rawKey = runtimeConfig?.key || envKey;

export const isSupabaseConfigured = Boolean(
  rawUrl &&
    rawKey &&
    rawUrl.startsWith("https://") &&
    !rawUrl.includes("YOUR_PROJECT") &&
    !rawKey.includes("YOUR_ANON_KEY")
);

export const supabase = isSupabaseConfigured
  ? createClient(rawUrl!, rawKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function saveRuntimeSupabaseConfig(url: string, key: string) {
  const cleanUrl = url.trim().replace(/\/+$/, "");
  const cleanKey = key.trim();
  if (!cleanUrl.startsWith("https://")) {
    throw new Error("Supabase URL 必须以 https:// 开头");
  }
  if (cleanKey.length < 40) {
    throw new Error("anon public key 格式不正确");
  }
  localStorage.setItem(
    runtimeStorageKey,
    JSON.stringify({ url: cleanUrl, key: cleanKey } satisfies RuntimeSupabaseConfig)
  );
}

export function requireSupabase() {
  if (!supabase) throw new Error("尚未配置 Supabase 环境变量");
  return supabase;
}
