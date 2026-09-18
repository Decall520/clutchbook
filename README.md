# 集火 Clutchbook

面向 Windows 的无畏契约集锦桌面端，支持本地导入、客户端录屏、云端上传、个人空间、好友关系和可见范围控制。

## 已实现

- 邮箱注册、登录、退出和密码重置
- 个人资料编辑、头像上传、Riot ID 与常用特工
- MP4、WebM、MOV、MKV 等本地视频导入
- Windows 屏幕/窗口录制，支持系统声音回环
- Supabase Storage 私有视频桶与临时签名播放地址
- 公开、仅好友、仅自己三种可见范围
- 好友搜索、申请、接受、拒绝和删除
- 个人集锦空间、可见范围管理、点赞与评论
- Electron Builder 生成 NSIS 安装包和便携版

> 集火是非 Riot Games 官方产品。名称、图片和录像的上传责任由用户承担。

## 技术结构

```text
electron/                  Electron 主进程与安全 preload
src/components/            通用 UI、集锦卡片和播放弹窗
src/context/               登录状态与 Supabase 数据状态
src/pages/                 登录、广场、上传、录屏、好友、个人空间
src/lib/                   Supabase、工具函数和演示数据
supabase/migrations/       数据库、RLS 与 Storage 策略
build/                     Windows 应用图标
release/                   打包产物
```

技术栈：Electron 35、React 19、TypeScript、Vite 6、Supabase Auth/Postgres/Storage。

## 本地运行

要求 Node.js 20+、npm 10+。

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

开发环境复制 `.env.example` 为 `.env` 并填写 Supabase 配置。未配置时，登录页会显示服务准备状态。

## 配置 Supabase

1. 在 [Supabase](https://supabase.com/) 创建项目。
2. 打开 SQL Editor，完整执行 `supabase/migrations/001_initial_schema.sql`。
3. 在 Project Settings > API 复制 Project URL 和 anon public key。
4. 开发环境可写入项目根目录的 `.env`，安装版用户也可在登录页直接填写并保存同一组公开配置：

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

5. 在 Authentication > Providers 中启用 Email。
6. 开发阶段可在 Authentication > Settings 中关闭 Confirm email；正式发布建议开启并配置自定义 SMTP。
7. 在 Authentication > URL Configuration 设置允许的回调地址。桌面端固定发布域名后，将其填入 Site URL。

数据库迁移会创建：

- `profiles`、`friendships`、`clips`、`clip_likes`、`clip_comments`
- 注册后自动创建 profile 的触发器
- 好友关系判断函数
- 点赞和评论计数触发器
- `highlights` 私有视频桶
- `avatars` 公共头像桶
- 针对账号、好友和可见范围的 RLS 策略

## 构建与运行

```powershell
npm run typecheck
npm run build:web
npm run build
```

`npm run build` 生成：

- `release/Clutchbook-Setup-<version>.exe`：带安装向导的 NSIS 安装版
- `release/Clutchbook-Setup-<version>-x64.exe`：免安装便携版
- `release/win-unpacked/`：未压缩运行目录，用于本地排错

## 上线说明

正式分发、代码签名、Supabase 生产配置和版本升级流程见 [docs/PUBLISHING.md](docs/PUBLISHING.md)。

## 当前边界

- 录屏需要用户手动开始和停止，不会自动识别游戏内击杀。
- 是否可录到游戏画面受独占全屏、显卡、驱动和系统权限影响；窗口录制通常比独占全屏稳定。
- 上传格式最终以 Chromium 的媒体解码能力和 Supabase Storage MIME 白名单为准。
- 安装包未配置商业代码签名证书时，Windows SmartScreen 可能显示未知发布者。
- 当前版本未接入自动更新服务；建议下一版加入 `electron-updater` 与 GitHub Releases 或自有更新源。
