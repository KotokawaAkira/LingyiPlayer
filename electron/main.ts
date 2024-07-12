import { app, BrowserWindow, ipcMain, nativeImage } from "electron";
import path from "path";
//引入remoteMain
import remoteMain from "@electron/remote/main";

import { loadMusic } from "../src/request/MusicRequest";
import { loadLyric } from "../src/request/LyricRequest";
import { MusicFileInfo } from "../src/type/Music";

//初始化remoteMain
remoteMain.initialize();
//创建窗口
let window: BrowserWindow;
const createWindows = () => {
  const window = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 900,
    minHeight: 660,
    webPreferences: {
      contextIsolation: false, //是否隔离上下文
      nodeIntegration: true, //进程使用node api
      preload: path.join(__dirname, "./preload"),
    },
    icon: path.join(path.dirname(__dirname), "/src/assets/musicfolder.png"),
  });
  //如果打包 渲染index.html
  if (process.env.NODE_ENV !== "development") {
    window.loadFile(path.join(path.dirname(__dirname),"/dist/index.html"));
    // window.webContents.openDevTools();
  } else {
    //开发模式加载url
    window.loadURL("http://localhost:4396");
    // window.webContents.openDevTools();
  }
  //将window的webContents挂载到remoteMain
  remoteMain.enable(window.webContents);
  return window;
};
//以此应用打开文件
app.on("open-file", (event, filePath) => {
  event.preventDefault();
  let musicFIle: MusicFileInfo | undefined;
  const type = path.extname(filePath);
  if (type === "mp3" || type === "flac" || type === "wav") {
    musicFIle = {
      name: path.basename(filePath),
      type: path.extname(filePath),
      originPath: filePath,
    };
  }
  window.webContents.send("open-file",[musicFIle]);
});
//当app就绪 创建窗口
app.whenReady().then(() => {
  window = createWindows();
  window.setMenu(null);
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
  window.webContents.send("loadLyric", res);
});
//加载音乐
ipcMain.on("doLoadMusic", async (_event, args: string) => {
  const res = await loadMusic(args);
  //传递两个数据，第一个为music buffer，第二个为原始路径
  window.webContents.send("loadMusic", { buffer: res, originPath: args });
});
//音乐进度条
ipcMain.on("progressUpdate", (_event, progress: number) => {
  window.setProgressBar(progress);
});
//任务栏播放控制
ipcMain.on(
  "doSetTumbarButtons",
  (
    _event,
    args: {
      isPlaying: boolean;
    }
  ) => {
    setTumbarButtons(args);
  }
);

//控制 上一首
function doPre() {
  window.webContents.send("doPre");
}
//控制 播放
function doPlay() {
  window.webContents.send("doPlay");
}
//控制下一首
function doNext() {
  window.webContents.send("doNext");
}
//设置
function setTumbarButtons(args: { isPlaying: boolean }) {
  const buttons = [
    {
      tooltip: "上一首",
      icon: nativeImage.createFromPath(
        path.join(path.dirname(__dirname), "/src/assets/previous.png")
      ),
      click: doPre,
    },
    {
      tooltip: "播放",
      icon: nativeImage.createFromPath(
        path.join(path.dirname(__dirname), "/src/assets/play.png")
      ),
      click: doPlay,
    },
    {
      tooltip: "下一首",
      icon: nativeImage.createFromPath(
        path.join(path.dirname(__dirname), "/src/assets/next.png")
      ),
      click: doNext,
    },
  ];
  if (args.isPlaying) {
    buttons[1].tooltip = "暂停";
    buttons[1].icon = nativeImage.createFromPath(
      path.join(path.dirname(__dirname), "/src/assets/stop.png")
    );
  } else {
    buttons[1].tooltip = "播放";
    buttons[1].icon = nativeImage.createFromPath(
      path.join(path.dirname(__dirname), "/src/assets/play.png")
    );
  }
  window.setThumbarButtons(buttons);
}
