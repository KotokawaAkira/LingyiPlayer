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
        <div
          class="meta-container-title"
          :title="
            musicMeta?.common !== undefined
              ? musicMeta.common.artist + ' - ' + musicMeta.common.title
              : musicFileName
          "
        >
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
        <Lyrics :lyrics :player :showTranslation />
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
          <div class="music-list-options">
            <div title="添加文件" @click="openFiles">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="music-list-options-icon"
              >
                <path
                  d="M19.74,8.33l-5.44-6A1,1,0,0,0,13.56,2h-7A2.53,2.53,0,0,0,4,4.5v15A2.53,2.53,0,0,0,6.56,22H17.44A2.53,2.53,0,0,0,20,19.5V9A1,1,0,0,0,19.74,8.33ZM14,5l2.74,3h-2A.79.79,0,0,1,14,7.15Zm3.44,15H6.56A.53.53,0,0,1,6,19.5V4.5A.53.53,0,0,1,6.56,4H12V7.15A2.79,2.79,0,0,0,14.71,10H18v9.5A.53.53,0,0,1,17.44,20Z"
                />
                <path
                  d="M14,13H13V12a1,1,0,0,0-2,0v1H10a1,1,0,0,0,0,2h1v1a1,1,0,0,0,2,0V15h1a1,1,0,0,0,0-2Z"
                />
              </svg>
            </div>
            <div title="添加文件夹">
              <svg
                @click="openFolder"
                xmlns="http://www.w3.org/2000/svg"
                class="music-list-options-icon"
              >
                <path
                  d="M14,13H13V12a1,1,0,0,0-2,0v1H10a1,1,0,0,0,0,2h1v1a1,1,0,0,0,2,0V15h1a1,1,0,0,0,0-2Z"
                />
                <path
                  d="M19.5,7.05h-7L9.87,3.87A1,1,0,0,0,9.1,3.5H4.5A2.47,2.47,0,0,0,2,5.93V18.07A2.47,2.47,0,0,0,4.5,20.5h15A2.47,2.47,0,0,0,22,18.07V9.48A2.47,2.47,0,0,0,19.5,7.05Zm.5,11a.46.46,0,0,1-.5.43H4.5a.46.46,0,0,1-.5-.43V5.93a.46.46,0,0,1,.5-.43H8.63l2.6,3.18a1,1,0,0,0,.77.37h7.5a.46.46,0,0,1,.5.43Z"
                />
              </svg>
            </div>
            <div title="删除">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="music-list-options-icon"
              >
                <path
                  d="M4.251,9.031c-0,0 0.194,4.655 0.34,8.167c0.106,2.544 2.199,4.552 4.746,4.552c1.68,0 3.646,0 5.326,0c2.547,0 4.64,-2.008 4.746,-4.552c0.146,-3.512 0.34,-8.167 0.34,-8.167c0.018,-0.413 -0.304,-0.763 -0.718,-0.78c-0.413,-0.018 -0.763,0.304 -0.78,0.718c-0,-0 -0.194,4.655 -0.341,8.166c-0.072,1.741 -1.505,3.115 -3.247,3.115c-1.68,0 -3.646,0 -5.326,-0c-1.742,0 -3.175,-1.374 -3.247,-3.115c-0.147,-3.511 -0.341,-8.166 -0.341,-8.166c-0.017,-0.414 -0.367,-0.736 -0.78,-0.718c-0.414,0.017 -0.736,0.367 -0.718,0.78Z"
                />
                <path
                  d="M7.459,5.25l0.374,-1.12c0.374,-1.123 1.425,-1.88 2.609,-1.88c0.944,0 2.172,0 3.116,0c1.184,-0 2.235,0.757 2.609,1.88l0.374,1.12l3.459,0c0.414,-0 0.75,0.336 0.75,0.75c0,0.414 -0.336,0.75 -0.75,0.75l-16,0c-0.414,-0 -0.75,-0.336 -0.75,-0.75c0,-0.414 0.336,-0.75 0.75,-0.75l3.459,0Zm7.5,0l-0.215,-0.645c-0.17,-0.511 -0.647,-0.855 -1.186,-0.855c-0.944,-0 -2.172,-0 -3.116,0c-0.539,-0 -1.016,0.344 -1.186,0.855l-0.215,0.645l5.918,0Z"
                />
              </svg>
            </div>
          </div>
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
        :changeShowTranslate="{
          isShow: showTranslation,
          changeShow: changeShowTranslate,
        }"
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
const showTranslation = ref(true);

//监听音乐列表的变化
watch(
  musicList,
  (val) => {
    if (!val || val.length === 0) return;
    let index = 0;
    for (let i = 0; i < val.length; i++) {
      if (val[i].active) {
        index = i;
        break;
      }
    }
    ipcRenderer.send("doLoadMusic", val[index].originPath);
    musicFileName.value = val[index].name;
    now.value = index;
    saveMusicListInStorage(val);
  },
  { deep: true }
);

initialize();

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

function initialize() {
  musicList.value = getMusicListFromStorage();
}

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
function openFolder() {
  dialog
    .showOpenDialog({
      title: "选择文件",
      // filters: [{ name: "Music", extensions: ["mp3", "wav", "flac"] }],
      properties: ["openDirectory"],
    })
    .then((res) => {
      const result = getFilesAndFoldersInDir(res.filePaths[0], []);
      addToPlayList(result);
    });
}
//打开文件
function openFiles() {
  dialog
    .showOpenDialog({
      title: "选择文件",
      filters: [{ name: "Music", extensions: ["mp3", "wav", "flac"] }],
      properties: ["openFile", "multiSelections"],
    })
    .then((res) => {
      const list: MusicFileInfo[] = [];
      for (let i = 0; i < res.filePaths.length; i++) {
        const lastPoint = res.filePaths[i].lastIndexOf(".");
        const lastSplit = res.filePaths[i].lastIndexOf("/");
        const type = res.filePaths[i].slice(lastPoint + 1);
        if (type === "mp3" || type === "flac" || type === "wav") {
          list.push({
            type,
            name: res.filePaths[i].slice(lastSplit + 1),
            originPath: res.filePaths[i],
          });
        }
      }
      addToPlayList(list);
    });
}
//添加到播放列表
function addToPlayList(list: MusicFileInfo[]) {
  list.forEach((item) => {
    if (!musicList.value) return;
    if (!musicList.value.find((el) => el.originPath === item.originPath))
      musicList.value.push(item);
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
  //设置当前正在播放状态 用于保存上次播放记录
  for (let i = 0; i < musicList.value!.length; i++) {
    if (i === index) musicList.value![i].active = true;
    else musicList.value![i].active = false;
  }
  saveMusicListInStorage(musicList.value!);
}
//储存当前播放列表
function saveMusicListInStorage(val: MusicFileInfo[]) {
  localStorage.setItem("music-list", JSON.stringify(val));
}
//获取当前储存的播放列表
function getMusicListFromStorage() {
  const music_list = localStorage.getItem("music-list");
  if (!music_list) return;
  return JSON.parse(music_list) as MusicFileInfo[];
}
//是否显示翻译
function changeShowTranslate() {
  return (showTranslation.value = !showTranslation.value);
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
  align-items: center;
  gap: 3vh;
  &-main {
    aspect-ratio: 1;
    width: 30vw;
    max-width: 500px;
    min-width: 300px;
    img {
      width: 100%;
      height: 100%;
    }
  }
  &-title {
    text-align: center;
    font-size: 1.5rem;
    width: 100%;
    white-space: nowrap;
    text-overflow: ellipsis;
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
  transition: transform 0.5s ease;
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
      transition: all 0.3s ease;
      &-active {
        transform: rotate(-180deg);
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
    overflow-y: auto;
    overflow-x: hidden;
    gap: 1rem;
    &-options {
      width: 100%;
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 1rem;
      &-icon {
        height: 2rem;
        width: 2rem;
        transition: all 0.3s ease;
        cursor: pointer;
        &:active {
          transform: scale(0.85);
        }
        fill: var(--font_color);
      }
    }
    &-container {
      max-height: 40vh;
      width: 100%;
      overflow-y: auto;
      overflow-x: hidden;

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
        padding: 0.3rem 0.5rem 0.3rem 0.3rem;
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
