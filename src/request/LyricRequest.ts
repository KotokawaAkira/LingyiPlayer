import fs from "fs";
//从互联网加载歌词
async function findLyric(musicName: string) {
  const rawLyric = await fetch(
    `https://kotokawa-akira-mywife.site/netDisk/downLoadForMusic?path=lyric/${musicName}.lrc`
  );
  const lyricBody = await rawLyric.text();
  return lyricBody;
}
//从本地加载歌词
async function loadLyric(path: string) {
  return new Promise<string|undefined>((resolve) => {
    fs.readFile(path, (err, data) => {
      if (err) resolve(undefined);
      else resolve(data.toString());
    });
  });
}
export { findLyric, loadLyric };
