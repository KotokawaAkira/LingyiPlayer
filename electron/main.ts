import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { loadLyric } from "../src/request/LyricRequest";
//引入remoteMain
import remoteMain from "@electron/remote/main";
//初始化remoteMain
remoteMain.initialize();
//创建窗口
let window: BrowserWindow;
const createWindows = () => {
  const window = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      contextIsolation: false, //是否隔离上下文
      nodeIntegration: true, //进程使用node api
      preload: path.join(__dirname, "./preload"),
    },
  });
  //如果打包 渲染index.html
  if (process.env.NODE_ENV !== "development") {
    window.loadFile(path.join(__dirname, "index.html"));
    window.webContents.openDevTools();
  } else {
    //开发模式加载url
    window.loadURL("http://localhost:4396");
    window.webContents.openDevTools();
  }
  //将window的webContents挂载到remoteMain
  remoteMain.enable(window.webContents);
  return window;
};

//当app就绪 创建窗口
app.whenReady().then(() => {
  window = createWindows();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows.length === 0) window = createWindows();
  });
});
//关闭窗口
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
//加载歌词
ipcMain.on("doLoadLyric", async (_event, args: string) => {
  const res = await loadLyric(args);
  window.webContents.send("loadLyric",res);
});
