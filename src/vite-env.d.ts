/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  clutchbook?: {
    capture: {
      listSources: () => Promise<Array<{
        id: string;
        name: string;
        displayId: string;
        thumbnail: string;
        appIcon: string | null;
      }>>;
      selectSource: (sourceId: string) => Promise<boolean>;
    };
    recording: {
      save: (
        bytes: Uint8Array,
        extension: "webm" | "mp4"
      ) => Promise<{ canceled: boolean; path?: string }>;
    };
    system: {
      info: () => Promise<{ platform: string; version: string; videosPath: string }>;
      openPath: (targetPath: string) => Promise<boolean>;
    };
  };
}
