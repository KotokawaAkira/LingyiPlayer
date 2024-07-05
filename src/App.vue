<template>
  <main>
    <div class="info-section">
      <div class="meta-container">
        <div class="meta-container-main">
          <img
            ref="pictrue"
            v-if="musicMeta && musicMeta.common.picture"
            :src="`data:${
              musicMeta.common.picture[0].format
            };base64,${musicMeta.common.picture[0].data.toString('base64')}`"
          />
        </div>
        <div class="meta-container-title">
          <span v-if="musicMeta">
            {{ musicMeta.common.artist }} - {{ musicMeta.common.title }}
          </span>
          <span v-else>
            {{ musicFileName }}
          </span>
        </div>
      </div>
      <div class="lyrics-main">
        <div class="terminal">
          <audio v-show="false" ref="player" controls :src="musicSrcURL" />
        </div>
        <Lyrics :lyrics :player />
      </div>
      <div class="music-list">
        <button @click="openSelector">选择</button>
        <ul class="music-list-container">
          <li
            :class="`music-list-container-item ${
              now === index ? 'music-list-container-item-active' : null
            }`"
            v-for="(item, index) in musicList"
            @click="changeMusic(item, index)"
          >
            {{ item.name }}
          </li>
        </ul>
      </div>
    </div>
    <div>
      <MusicController
        :player
        :totle="musicDuration"
        :musicList
        :changeMusic
        :now
      />
    </div>
  </main>
</template>
<script setup lang="ts">
import Lyrics from "./components/Lyrics.vue";
import { ref, watch } from "vue";
import Lyric from "./type/Lyric";

import { dialog } from "@electron/remote";
import { ipcRenderer } from "electron";
import { MusicBuffer, MusicFileInfo } from "./type/Music";
import { getFilesAndFoldersInDir, parseMeta } from "./request/MusicRequest";
import { IAudioMetadata } from "../node_modules/music-metadata/lib/type";
import MusicController from "./components/MusicController.vue";
import colorfulImg from "./tools/ThemeColor";
import { nextTick } from "process";

const lyrics = ref<Lyric[]>();
const player = ref<HTMLAudioElement>();
const musicFileName = ref<string>("");
const musicSrcURL = ref<string | undefined>();
const musicList = ref<MusicFileInfo[]>();
const musicMeta = ref<IAudioMetadata>();
const pictrue = ref<HTMLImageElement>();
const musicDuration = ref(0);
const now = ref(0);

//监听音乐列表的变化
watch(musicList, (val) => {
  if (!val || val.length === 0) return;
  ipcRenderer.send("doLoadMusic", val[0].originPath);
  musicFileName.value = val[0].name;
});

//监听主进程加载音乐
ipcRenderer.on("loadMusic", async (_event, args: MusicBuffer) => {
  musicSrcURL.value = URL.createObjectURL(new Blob([args.buffer]));
  getLyric(args.originPath);
  const meta = await parseMeta(args.buffer);
  musicMeta.value = meta;
  if (meta.format.duration) musicDuration.value = meta.format.duration;
  console.log(meta);
  //设置背景主题色
  nextTick(() => {
    if (pictrue.value) {
      const rgb = colorfulImg(pictrue.value);
      document.body.style.setProperty(
        "--bg",
        `rgb(${rgb.r},${rgb.g},${rgb.b})`
      );
    }
  });
});
////监听主进程加载歌词
ipcRenderer.on("loadLyric", (_event, args: string) => {
  lyrics.value = executeLyrics(args);
});

//处理歌词
function executeLyrics(lyricBody: string) {
  if (!lyricBody) return [];
  const lines = lyricBody.trim().split("\n");
  const executedLyric = lines.map((item) => {
    const line: Lyric = { words: "" };
    const splits = item.split("]");

    //分割翻譯歌詞
    if (splits[1] && splits[1].trim().length > 0) {
      const wordsSplit = splits[1].split("/");
      line.words = wordsSplit[0];
      if (wordsSplit[1]) line.translation = wordsSplit[1];
    }

    //處理時間
    const temp = splits[0].split("[");
    if (!temp[1]) return line;

    const timeSplit = temp[1].split(":");
    if (isNaN(Number(timeSplit[0]))) return line; //處理開頭標籤
    const minutes = Number(timeSplit[0]);
    const time = minutes * 60 + Number(timeSplit[1]);
    line.time = Number(time.toFixed(2));

    return line;
  });

  return executedLyric;
}
//打开文件夹
function openSelector() {
  dialog
    .showOpenDialog({
      title: "选择文件",
      // filters: [{ name: "Music", extensions: ["mp3", "wav", "flac"] }],
      properties: ["openDirectory"],
    })
    .then((res) => {
      const result = getFilesAndFoldersInDir(res.filePaths[0], []);
      musicList.value = result;
    });
}

//根据musicPath获取同目录下的lyricPath
function getLyric(musicPath: string) {
  const lastPoint = musicPath.lastIndexOf("\.");
  const lyrciPath = musicPath.slice(0, lastPoint + 1) + "lrc";
  ipcRenderer.send("doLoadLyric", lyrciPath);
}
//更改音乐
function changeMusic(item: MusicFileInfo, index: number) {
  now.value = index;
  musicFileName.value = item.name;
  ipcRenderer.send("doLoadMusic", item.originPath);
  player.value!.oncanplay = () => player.value?.play();
}
</script>

<style lang="scss" scoped>
main {
  width: 100%;
  height: 100%;
  display: flex;
  gap: 2%;
  justify-content: space-around;
  align-items: center;
  flex-direction: column;
  .info-section {
    display: flex;
    gap: 5%;
    align-items: center;
    justify-content: center;
    width: 80%;
  }
}
.meta-container {
  display: flex;
  flex-direction: column;
  gap: 3vh;
  &-main {
    aspect-ratio: 1;
    width: 30vw;
    max-width: 500px;
    min-width: 400px;
    img {
      width: 100%;
      height: 100%;
    }
  }
  &-title {
    text-align: center;
    font-size: 1.5rem;
  }
}
.lyrics-main {
  width: 50%;
  .terminal {
    display: flex;
    flex-direction: row;
  }
}

.music-list {
  position: absolute;
  right: 3vw;
  top: 45vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  &-container {
    &-item {
      list-style-type: none;
      transition: all 0.3s ease;
      font-size: 1.2rem;
      user-select: none;
      cursor: pointer;
      transform: scale(0.95);
      transform-origin: 0 0;
      &:hover {
        transform: scale(1);
      }
      &-active {
        color: #9ac8e2;
        transform: scale(1);
      }
    }
  }
}
</style>
