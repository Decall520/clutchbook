import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, saveRuntimeSupabaseConfig } from "../lib/supabase";
import { Icon } from "../components/Icon";

type Mode = "login" | "register";

export function AuthPage() {
  const { signIn, signUp, enterDemo, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
          throw new Error("用户名需为 3–24 位字母、数字或下划线");
        }
        const result = await signUp({
          email: email.trim(),
          password,
          username,
          displayName
        });
        if (result.needsConfirmation) setNotice("注册成功，请到邮箱完成验证后登录。");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError("先填写注册邮箱");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await requestPasswordReset(email.trim());
      setNotice("重置邮件已发送，请检查收件箱。");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "发送失败");
    } finally {
      setBusy(false);
    }
  }

  function storeBackendConfig() {
    setError("");
    try {
      saveRuntimeSupabaseConfig(supabaseUrl, supabaseKey);
      setNotice("后端配置已保存，正在重新载入…");
      window.setTimeout(() => window.location.reload(), 500);
    } catch (configError) {
      setError(configError instanceof Error ? configError.message : "配置保存失败");
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-grid" aria-hidden />
      <section className="auth-showcase">
        <div className="auth-brand">
          <span className="brand-mark brand-mark-large"><span /></span>
          <span>
            <strong>集火</strong>
            <small>CLUTCHBOOK</small>
          </span>
        </div>

        <div className="auth-copy">
          <span className="auth-kicker">你的高光，不该停在录像文件夹里</span>
          <h1>把每一次<br /><em>赛点回放</em>留住。</h1>
          <p>录制、整理、标记和分享无畏契约集锦。好友能看到你的好友可见作品，公开集锦则进入所有人的广场。</p>
        </div>

        <div className="auth-visual">
          <div className="radar-stage">
            <span className="radar-ring radar-ring-1" />
            <span className="radar-ring radar-ring-2" />
            <span className="radar-ring radar-ring-3" />
            <span className="radar-sweep" />
            <span className="radar-dot radar-dot-1" />
            <span className="radar-dot radar-dot-2" />
            <div className="radar-core">
              <Icon name="target" size={34} />
              <strong>CLUTCH</strong>
              <small>赛点已锁定</small>
            </div>
          </div>
          <div className="auth-stat auth-stat-a">
            <span>本局进度</span>
            <strong>13 : 11</strong>
            <small>下一分就是赛点</small>
          </div>
          <div className="auth-stat auth-stat-b">
            <span>高光标签</span>
            <strong>1v3</strong>
            <small>残局 · 四杀 · 穿烟</small>
          </div>
        </div>

        <p className="auth-footnote">非 Riot Games 官方产品。游戏名称与相关商标归其权利人所有。</p>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-head">
            <span>{mode === "login" ? "欢迎回来，选手" : "建立你的集锦空间"}</span>
            <h2>{mode === "login" ? "登录集火" : "注册账号"}</h2>
          </div>

          <div className="auth-tabs" role="tablist">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              登录
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              注册
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && (
              <div className="field-row">
                <label>
                  显示名称
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="别人看到的名字"
                    maxLength={40}
                    required
                  />
                </label>
                <label>
                  用户名
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value.replace(/\s/g, ""))}
                    placeholder="nightshift"
                    maxLength={24}
                    required
                  />
                </label>
              </div>
            )}

            <label>
              邮箱
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="player@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              密码
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "register" ? "至少 8 位" : "输入密码"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                required
              />
            </label>

            {mode === "login" && (
              <button type="button" className="text-button" onClick={resetPassword} disabled={busy}>
                忘记密码？
              </button>
            )}

            {error && <div className="form-message form-error">{error}</div>}
            {notice && <div className="form-message form-success">{notice}</div>}

            <button className="button button-primary auth-submit" disabled={busy || !isSupabaseConfigured}>
              {busy ? "处理中…" : mode === "login" ? "进入集火" : "创建账号"}
              {!busy && <Icon name="chevron" size={18} />}
            </button>
          </form>

          {!isSupabaseConfigured && (
            <div className="runtime-config">
              <div className="setup-notice">
                <Icon name="settings" size={18} />
                <div>
                  <strong>先连接你的 Supabase 项目</strong>
                  <p>可直接在这里填写，也可以开发时写入 <code>.env</code>。anon key 是公开客户端密钥，数据权限仍由数据库 RLS 控制。</p>
                </div>
              </div>
              <button className="text-button runtime-config-toggle" onClick={() => setShowSetup((value) => !value)}>
                {showSetup ? "收起配置" : "填写后端配置"}
              </button>
              {showSetup && (
                <div className="runtime-config-form">
                  <label>
                    Project URL
                    <input
                      value={supabaseUrl}
                      onChange={(event) => setSupabaseUrl(event.target.value)}
                      placeholder="https://your-project.supabase.co"
                    />
                  </label>
                  <label>
                    anon public key
                    <input
                      type="password"
                      value={supabaseKey}
                      onChange={(event) => setSupabaseKey(event.target.value)}
                      placeholder="eyJhbGciOi…"
                    />
                  </label>
                  <button type="button" className="button button-primary" onClick={storeBackendConfig} disabled={!supabaseUrl.trim() || !supabaseKey.trim()}>
                    保存并启用云端
                  </button>
                </div>
              )}
            </div>
          )}

          <button className="button button-demo" onClick={enterDemo}>
            <Icon name="play" size={17} />
            进入界面预览
          </button>
          <p className="auth-legal">登录即表示你同意仅上传本人有权分享的游戏录像。</p>
        </div>
      </section>
    </main>
  );
}
