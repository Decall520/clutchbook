# 发布与上线清单

## 1. 生产环境准备

### Supabase

- 为正式环境单独创建 Supabase 项目。
- 执行全部 `supabase/migrations/*.sql`。
- 开启 Email Confirm，并配置正式 SMTP 服务。
- 将 Authentication Site URL 设置为产品官网或授权回调域名。
- 根据预期用户量调整 Storage 配额、数据库计划和带宽。
- 检查 Storage 的 `highlights` 桶保持私有，`avatars` 桶保持公开。
- 不要把 `service_role` key 放进桌面端；客户端只能使用 anon public key。
- 定期备份数据库，并为误删视频制定保留策略。

### 域名与法律

- 准备产品官网、隐私政策、用户协议和侵权投诉入口。
- 明确说明本产品并非 Riot Games 官方产品。
- 要求用户仅上传本人有权分享的录像。
- 根据发行地区完成软件备案、隐私合规和消费者条款。

## 2. Windows 构建

```powershell
npm ci
Copy-Item .env.example .env
# 填写生产 Supabase 配置
npm run typecheck
npm run build
```

构建产物位于 `release/`。发布前应在干净的 Windows 10/11 虚拟机上测试：

- 安装、升级、卸载
- 登录注册与邮箱验证
- 本地上传和弱网重试
- 好友可见与仅自己权限
- 屏幕/窗口录屏与麦克风/系统声音
- 多显示器和 125%/150% 缩放
- 杀毒软件误报与 SmartScreen 提示

## 3. 代码签名

未签名安装包会触发 Windows SmartScreen。正式发布建议购买 EV 或 OV Code Signing Certificate，并在构建机设置：

```powershell
$env:CSC_LINK = "C:\secure\clutchbook-signing.pfx"
$env:CSC_KEY_PASSWORD = "your-password"
npm run build
```

证书和密码不要提交到 Git，也不要写进 `.env.example`。

## 4. 版本发布

```powershell
npm version patch
npm run build
```

推荐同时发布：

- NSIS 安装包
- portable 便携版
- 对应版本的 SHA-256 校验文件
- 更新日志
- 已知问题

可以使用 GitHub Releases、对象存储或产品官网分发安装包。若接入自动更新，建议使用 `electron-updater`，并确保更新元数据和安装包存放在 HTTPS 地址。

## 5. 发布验收

- [ ] 生产 Supabase URL 与 anon key 已正确注入
- [ ] RLS 不允许未授权用户读取“仅好友”或“仅自己”视频
- [ ] 注册、登录、重置密码、退出均正常
- [ ] 上传、播放、删除、可见范围修改均正常
- [ ] 好友申请和好友动态可见性符合预期
- [ ] 安装版与便携版均可启动
- [ ] Windows 10 和 Windows 11 完成安装/卸载测试
- [ ] 隐私政策、用户协议和侵权投诉入口可访问
- [ ] 发布包带有版本号、校验值和更新日志

## 6. 后续建议

- 加入 `electron-updater` 自动更新
- 加入 OBS WebSocket，实现更稳定的游戏采集
- 加入本地转码和硬件编码，降低上传体积
- 加入举报、屏蔽、审核与内容下架后台
- 加入通知系统、收藏夹和战队空间
- 对视频上传采用分片直传和断点续传
