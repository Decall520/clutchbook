import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { supabase } from "../lib/supabase";
import type { AuthUser } from "../types";

interface RegisterInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
  requestPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function translateAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "邮箱或密码不正确";
  if (/email not confirmed/i.test(message)) return "请先到邮箱完成验证";
  if (/user already registered/i.test(message)) return "该邮箱已经注册";
  if (/password should be/i.test(message)) return "密码至少需要 8 位";
  if (/rate limit/i.test(message)) return "操作太频繁，请稍后再试";
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user;
      setUser(sessionUser ? { id: sessionUser.id, email: sessionUser.email } : null);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isDemo,
      async signIn(email, password) {
        if (!supabase) throw new Error("尚未配置 Supabase，请先使用界面预览");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(translateAuthError(error.message));
        setIsDemo(false);
      },
      async signUp({ email, password, username, displayName }) {
        if (!supabase) throw new Error("尚未配置 Supabase，请先使用界面预览");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim().toLowerCase(),
              display_name: displayName.trim()
            }
          }
        });
        if (error) throw new Error(translateAuthError(error.message));
        setIsDemo(false);
        return { needsConfirmation: !data.session };
      },
      async signOut() {
        if (supabase && !isDemo) await supabase.auth.signOut();
        setUser(null);
        setIsDemo(false);
      },
      enterDemo() {
        setIsDemo(true);
        setUser({ id: "demo-me", email: "preview@clutchbook.local" });
      },
      async requestPasswordReset(email) {
        if (!supabase) throw new Error("尚未配置 Supabase");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/?mode=reset-password`
        });
        if (error) throw new Error(translateAuthError(error.message));
      }
    }),
    [isDemo, loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return context;
}
