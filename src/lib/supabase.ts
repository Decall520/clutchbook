import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

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

export function requireSupabase() {
  if (!supabase) throw new Error("云端服务暂不可用，请稍后再试");
  return supabase;
}
