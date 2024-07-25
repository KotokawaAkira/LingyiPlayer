import { app, BrowserWindow, ipcMain, nativeImage } from "electron";
import path from "path";
//引入remoteMain
import remoteMain from "@electron/remote/main";

import { loadCover, loadMusic } from "../src/request/MusicRequest";
import { loadLyric } from "../src/request/LyricRequest";
import { kmeans } from "ml-kmeans";
import { MusicFileInfo } from "../src/type/Music";

app.commandLine.appendSwitch("js-flags", "--expose-gc");
const lock = app.requestSingleInstanceLock();

//初始化remoteMain
remoteMain.initialize();
//创建窗口
let window: BrowserWindow;

const createWindows = () => {
  // 检查是否是第二个实例
  window = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 900,
    minHeight: 660,
    webPreferences: {
      contextIsolation: false, //是否隔离上下文
      nodeIntegration: true, //进程使用node api
      preload: path.join(__dirname, "./preload"),
    },
    icon: path.join(path.dirname(__dirname), "/src/assets/music-note.png"),
  });
  //如果打包 渲染index.html
  if (process.env.NODE_ENV !== "development") {
    window.loadFile(path.join(path.dirname(__dirname), "/dist/index.html"));
    // window.webContents.openDevTools();
  } else {
    //开发模式加载url
    window.loadURL("http://localhost:4396");
    window.webContents.openDevTools();
  }
  //将window的webContents挂载到remoteMain
  remoteMain.enable(window.webContents);
};

if (!lock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }

    // 当试图运行第二个实例时，这个事件会被触发
    const paths = commandLine.filter(
      (item) =>
        item.endsWith(".flac") || item.endsWith(".wav") || item.endsWith(".mp3")
    );
    const music_list: MusicFileInfo[] = [];
    for (let i = 0; i < paths.length; i++) {
      const name = path.basename(paths[i]);
      const type = path.extname(paths[i]);
      music_list.push({ type, name, originPath: paths[i] });
    }
    window.webContents.send("open-file", music_list);
  });
  //当app就绪 创建窗口
  app.whenReady().then(() => {
    createWindows();
    window.setMenu(null);
  });
}

app.on("activate", () => {
  if (BrowserWindow.getAllWindows.length === 0) createWindows();
});
app.on("open-file", (_event, originPath) => {
  if (
    !originPath.endsWith(".flac") ||
    !originPath.endsWith(".wav") ||
    !originPath.endsWith(".mp3")
  )
    return;
  const name = path.basename(originPath);
  const type = path.extname(originPath);
  window.webContents.send("open-file", { type, name, originPath });
});

//关闭窗口
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
//加载歌词
ipcMain.on("doLoadLyric", async (_event, args: string) => {
  let res: String | undefined = await loadLyric(args);
  window.webContents.send("loadLyric", res);
  res = undefined;
});
//加载音乐
ipcMain.on(
  "doLoadMusic",
  async (_event, args: { originPath: string; index: number }) => {
    let res: Buffer | null = await loadMusic(args.originPath);
    //传递两个数据，第一个为music buffer，第二个为原始路径
    window.webContents.send("loadMusic", {
      buffer: res,
      originPath: args.originPath,
      index: args.index,
    });
    res = null;
  }
);
//加载专辑封面
ipcMain.on("doLoadCover", async (_event, args: string) => {
  let res: string | null = await loadCover(args);
  window.webContents.send("loadCover", { buffer: res });
  res = null;
});
//音乐进度条
ipcMain.on("progressUpdate", (_event, progress: number) => {
  window.setProgressBar(progress);
});
//更改窗口名称
ipcMain.on("titleChange", (_event, args: string) => {
  if (args && args !== "") window.setTitle(args);
  else window.setTitle("Lingyi Player");
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
//计算三种主要颜色
ipcMain.on("doGet3Color", (_event, color) => {
  const colorList = [[0, 0, 0]];
  if (!color) return window.webContents.send("get3Color", colorList);
  const pixels = color;
  const pixelArray: number[][] = [];
  // 将像素数据转换为RGB数组
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // 只保留不透明的像素
    if (pixels[i + 3] > 0) {
      pixelArray.push([r, g, b]);
    }
  }
  // 使用 k-means 聚类算法提取三种主要颜色
  const numberOfClusters = 3;
  const result = kmeans(pixelArray, numberOfClusters, {
    maxIterations: 10,
    tolerance: 1e-6,
  });
  for (let i = result.centroids.length - 1; i >= 0; i--) {
    colorList[i] = result.centroids[i];
  }
  window.webContents.send("get3Color", colorList);
});
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
