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
          <span v-if="musicMeta?.common.artist && musicMeta?.common.title">
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
      <div
        :class="`side-window ${showSideWindow ? 'side-window-active' : 'null'}`"
      >
        <div class="show-button" @click="showSideWindow = !showSideWindow">
          <svg
            :class="`show-button-icon ${
              showSideWindow ? 'show-button-icon-active' : 'null'
            }`"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 292.359 292.359"
            style="enable-background: new 0 0 292.359 292.359"
            xml:space="preserve"
          >
            <path
              d="M222.979,5.424C219.364,1.807,215.08,0,210.132,0c-4.949,0-9.233,1.807-12.848,5.424L69.378,133.331
		c-3.615,3.617-5.424,7.898-5.424,12.847c0,4.949,1.809,9.233,5.424,12.847l127.906,127.907c3.614,3.617,7.898,5.428,12.848,5.428
		c4.948,0,9.232-1.811,12.847-5.428c3.617-3.614,5.427-7.898,5.427-12.847V18.271C228.405,13.322,226.596,9.042,222.979,5.424z"
            />
          </svg>
        </div>
        <div class="music-list">
          <button @click="openSelector">选择</button>
          <ul class="music-list-container">
            <li
              :class="`music-list-container-item ${
                now === index ? 'music-list-container-item-active' : null
              }`"
              :title="item.name"
              v-for="(item, index) in musicList"
              @click="changeMusic(item, index)"
            >
              {{ item.name }}
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="controller-container">
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
const showSideWindow = ref(false);

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
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
  .info-section {
    display: flex;
    gap: 5%;
    align-items: center;
    justify-content: center;
    width: 80%;
    height: 85%;
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

.side-window {
  position: fixed;
  top: 25vh;
  right: 0;
  display: flex;
  align-items: center;
  transition: all 0.5s ease;
  transform: translate(calc(100% - 2rem));
  &-active {
    transform: translate(0%);
  }
  .show-button {
    height: 2rem;
    width: 2rem;
    cursor: pointer;
    &-icon {
      height: 100%;
      width: 100%;
      fill: var(--font_color);
      transition: all 0.5 ease;
      &-active {
        transform: rotate(180deg);
      }
    }
  }
  .music-list {
    padding: 1rem 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    border-top-left-radius: 0.5rem;
    border-bottom-left-radius: 0.5rem;
    background-color: var(--side_window_bg);
    max-width: 22rem;
    overflow: hidden;
    &-container {
      max-height: 40vh;
      overflow: auto;

      &::-webkit-scrollbar {
        width: 0.5rem;
      }
      &::-webkit-scrollbar-track {
        background-color: var(--bg_progress);
        opacity: 0.6;
        border-radius: 0.25rem;
      }
      &::-webkit-scrollbar-thumb {
        background-color: var(--bg_progress_active);
        border-radius: 0.25rem;
      }
      &-item {
        list-style-type: none;
        transition: all 0.3s ease;
        font-size: 1.2rem;
        user-select: none;
        cursor: pointer;
        transform-origin: 0 0;
        box-sizing: border-box;
        padding: 0.3rem 0;
        white-space: nowrap;
        &:hover {
          color: var(--lyrics_color);
        }
        &-active {
          color: var(--lyrics_color);
        }
      }
    }
  }
}

.controller-container {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 1rem 0;
  box-sizing: border-box;
}
</style>
