const { app, BrowserWindow, desktopCapturer, dialog, ipcMain, session, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

let mainWindow;
let selectedSourceId = null;

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const isSmokeTest = process.env.CLUTCHBOOK_SMOKE_TEST === "1";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    backgroundColor: "#0b1320",
    title: "集火",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0b1320",
      symbolColor: "#e9f0f4",
      height: 42
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    if (!isSmokeTest) mainWindow.show();
  });
  mainWindow.webContents.once("did-finish-load", () => {
    if (isSmokeTest) setTimeout(() => app.quit(), 500);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function registerDisplayCapture() {
  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ["screen", "window"],
          thumbnailSize: { width: 320, height: 180 },
          fetchWindowIcons: true
        });
        const selected =
          sources.find((source) => source.id === selectedSourceId) || sources[0];
        if (!selected) return callback({});
        callback({
          video: selected,
          audio: process.platform === "win32" ? "loopback" : undefined
        });
      } catch {
        callback({});
      }
    }
  );
}

ipcMain.handle("capture:list-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 360, height: 202 },
    fetchWindowIcons: true
  });
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    displayId: source.display_id,
    thumbnail: source.thumbnail.toDataURL(),
    appIcon: source.appIcon?.toDataURL() || null
  }));
});

ipcMain.handle("capture:select-source", (_event, sourceId) => {
  selectedSourceId = typeof sourceId === "string" ? sourceId : null;
  return true;
});

ipcMain.handle("recording:save", async (_event, payload) => {
  const extension = payload?.extension === "mp4" ? "mp4" : "webm";
  const targetDir = path.join(app.getPath("videos"), "集火");
  await fs.mkdir(targetDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const defaultPath = path.join(targetDir, `集锦-${stamp}.${extension}`);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "保存本地集锦",
    defaultPath,
    filters: [
      { name: "视频", extensions: [extension] },
      { name: "所有文件", extensions: ["*"] }
    ]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, Buffer.from(payload.bytes));
  return { canceled: false, path: result.filePath };
});

ipcMain.handle("system:open-path", async (_event, targetPath) => {
  if (typeof targetPath !== "string" || !targetPath) return false;
  const error = await shell.openPath(targetPath);
  return !error;
});

ipcMain.handle("system:info", () => ({
  platform: process.platform,
  version: app.getVersion(),
  videosPath: app.getPath("videos")
}));

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    registerDisplayCapture();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
