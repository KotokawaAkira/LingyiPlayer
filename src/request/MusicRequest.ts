import fs from "fs";
import { parseBuffer } from "music-metadata-browser";
import { MusicFileInfo } from "../type/Music";

//从本地加载音乐
async function loadMusic(path: string) {
  return new Promise<Buffer>((resolve, reject) => {
    fs.readFile(path, (err, data: Buffer) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
//读取文件夹中所有的音乐文件
function getFilesAndFoldersInDir(path: string, list: MusicFileInfo[]) {
  const items = fs.readdirSync(path);
  items.forEach((item) => {
    const itemPath = `${path}/${item}`;
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      getFilesAndFoldersInDir(itemPath, list);
    } else {
      // 文件
      const type = item.slice(item.lastIndexOf(".") + 1);
      if (type === "mp3" || type === "flac" || type === "wav") {
        list.push({
          type,
          name: item,
          originPath: itemPath,
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
export { loadMusic, getFilesAndFoldersInDir, parseMeta };
