import fs from "fs";
import { parseBuffer } from "music-metadata-browser";
import { MusicFileInfo } from "../type/Music";
import path from "path";

//从本地加载音乐
async function loadMusic(filePath: string) {
  return new Promise<Buffer | null>((resolve) => {
    fs.readFile(filePath, (err, data: Buffer) => {
      if (err) resolve(null);
      else resolve(data);
    });
  });
}
//读取文件夹中所有的音乐文件
function getFilesAndFoldersInDir(filePath: string, list: MusicFileInfo[]) {
  const items = fs.readdirSync(filePath);
  items.forEach((item) => {
    let itemfilePath = `${filePath}/${item}`;
    if (process.platform === "win32") itemfilePath = `${filePath}\\${item}`;
    const stat = fs.statSync(itemfilePath);
    if (stat.isDirectory()) {
      getFilesAndFoldersInDir(itemfilePath, list);
    } else {
      // 文件
      const type = item.slice(item.lastIndexOf(".") + 1);
      if (type === "mp3" || type === "flac" || type === "wav") {
        list.push({
          type,
          name: item,
          originPath: itemfilePath,
        });
      }
    }
  });
  return list;
}
//解析音乐文件原数据
async function parseMeta(buff: Buffer) {
  const meta = await parseBuffer(buff);
  return meta;
}
//读取图片文件
async function loadCover(musicPath: string) {
  // 指定目录和已知文件名
  const directoryPath = path.dirname(musicPath);
  const knownFileName = "cover";
  return new Promise<string | null>((resolve) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        console.error(err);
        resolve(null);
      }
      // 查找与已知文件名匹配的文件
      const matchingFile = files.find((file) => {
        const F = path.parse(file);
        const base = path.basename(musicPath);
        const fileName = base.slice(0, base.lastIndexOf("."));
        return (
          (F.name.toLowerCase() === knownFileName || F.name === fileName) &&
          (F.ext === ".jpg" || F.ext === ".jpeg" || F.ext === ".png")
        );
      });

      if (matchingFile) {
        // 读取文件内容
        const filePath = path.join(directoryPath, matchingFile);
        fs.readFile(filePath, "base64", (err, data) => {
          if (err) {
            console.error(err);
            resolve(null);
          }
          resolve(data);
        });
      } else {
        resolve(null);
      }
    });
  });
}
export { loadMusic, getFilesAndFoldersInDir, parseMeta, loadCover };
