const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("clutchbook", {
  capture: {
    listSources: () => ipcRenderer.invoke("capture:list-sources"),
    selectSource: (sourceId) => ipcRenderer.invoke("capture:select-source", sourceId)
  },
  recording: {
    save: (bytes, extension) =>
      ipcRenderer.invoke("recording:save", { bytes, extension })
  },
  system: {
    info: () => ipcRenderer.invoke("system:info"),
    openPath: (targetPath) => ipcRenderer.invoke("system:open-path", targetPath)
  }
});
