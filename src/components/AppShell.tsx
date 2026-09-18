import type { ReactNode } from "react";
import { useAppData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import type { PageKey } from "../types";
import { Avatar } from "./Avatar";
import { Icon, type IconName } from "./Icon";

interface AppShellProps {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

const navigation: Array<{ key: PageKey; label: string; icon: IconName }> = [
  { key: "feed", label: "集锦广场", icon: "home" },
  { key: "studio", label: "上传工作台", icon: "upload" },
  { key: "recorder", label: "游戏录屏", icon: "camera" },
  { key: "friends", label: "好友", icon: "users" },
  { key: "profile", label: "我的空间", icon: "user" }
];

const pageCopy: Record<PageKey, { title: string; subtitle: string }> = {
  feed: { title: "集锦广场", subtitle: "看看今天谁打出了赛点回放" },
  studio: { title: "上传工作台", subtitle: "导入、标记并发布你的高光" },
  recorder: { title: "游戏录屏", subtitle: "选择屏幕或窗口，录制后直接发布" },
  friends: { title: "好友", subtitle: "好友动态与申请都在这里" },
  profile: { title: "我的空间", subtitle: "管理个人资料与所有集锦" }
};

export function AppShell({ page, onNavigate, children }: AppShellProps) {
  const { currentProfile, incomingRequests } = useAppData();
  const { isDemo, signOut } = useAuth();
  const copy = pageCopy[page];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand brand-button" onClick={() => onNavigate("feed")}>
          <span className="brand-mark"><span /></span>
          <span>
            <strong>集火</strong>
            <small>CLUTCHBOOK</small>
          </span>
        </button>

        <nav className="main-nav" aria-label="主导航">
          {navigation.map((item) => (
            <button
              key={item.key}
              className={page === item.key ? "active" : ""}
              onClick={() => onNavigate(item.key)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.key === "friends" && incomingRequests.length > 0 && (
                <b>{incomingRequests.length}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <Icon name="spark" />
          <strong>快速录屏</strong>
          <p>开赛前先选好窗口，结束后直接上传。</p>
          <button onClick={() => onNavigate("recorder")}>开始录制</button>
        </div>

        <button className="sidebar-profile" onClick={() => onNavigate("profile")}>
          <Avatar profile={currentProfile} size="md" />
          <span>
            <strong>{currentProfile?.display_name || "选手"}</strong>
            <small>{isDemo ? "界面预览" : `@${currentProfile?.username || "player"}`}</small>
          </span>
          <Icon name="chevron" size={16} />
        </button>

        <button className="sidebar-logout" onClick={() => void signOut()}>
          <Icon name="logout" size={17} />
          退出账号
        </button>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <div className="topbar-actions">
            {isDemo && <span className="demo-pill">演示模式</span>}
            <button className="icon-button" onClick={() => onNavigate("friends")} aria-label="好友通知">
              <Icon name="bell" />
              {incomingRequests.length > 0 && <i />}
            </button>
            <button className="button button-ghost top-upload" onClick={() => onNavigate("studio")}>
              <Icon name="plus" size={17} /> 上传集锦
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>

        <nav className="mobile-nav" aria-label="移动导航">
          {navigation.map((item) => (
            <button
              key={item.key}
              className={page === item.key ? "active" : ""}
              onClick={() => onNavigate(item.key)}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label.slice(0, 4)}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
