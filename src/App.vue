<template>
  <main>
    <transition name="fade">
      <div class="loading-cover" v-if="isLoading">
        <img :src="icon" alt="" />
      </div>
    </transition>
    <div class="info-section">
      <div class="meta-container">
        <div class="meta-container-main">
          <transition name="fade_title" mode="in-out">
            <img
              v-if="musicCoverUrl"
              :key="musicFileName"
              ref="pictrue"
              :src="musicCoverUrl"
              crossorigin="anonymous"
            />
          </transition>
        </div>
        <div
          class="meta-container-title"
          :title="
            musicMeta?.common !== undefined
              ? musicMeta.common.artist + ' - ' + musicMeta.common.title
              : musicFileName
          "
        >
          <span v-if="musicMeta?.common.artists && musicMeta?.common.title">
            <span v-for="(item, i) in musicMeta?.common.artists"
              >{{ item }}
              <span v-if="i !== musicMeta?.common.artists.length - 1"
                >&nbsp;</span
              ></span
            >
            -
            <span>{{ musicMeta?.common.title }}</span>
          </span>
          <span v-else>
            {{ musicFileName }}
          </span>
        </div>
        <div
          class="info-placeholder"
          :hidden="musicList && musicList.length > 0"
        >
          请拖入音乐文件、文件夹，或点击右边箭头打开播放列表添加音乐
        </div>
      </div>
      <transition name="out">
        <div class="lyrics-main" v-show="lyrics">
          <div class="terminal">
            <audio v-show="false" ref="player" controls :src="musicSrcURL" />
          </div>
          <Lyrics :lyrics :player :showTranslation />
        </div>
      </transition>
      <div
        :class="`side-window ${showSideWindow ? 'side-window-active' : 'null'}`"
      >
        <div
          :title="showSideWindow ? '隐藏播放列表' : '显示播放列表'"
          class="show-button"
          @click="showSideWindow = !showSideWindow"
        >
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
          <div class="music-list-overlay"></div>
          <div class="music-list-options">
            <div class="music-list-options-start">
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
            </div>
            <div class="music-list-options-end">
              <div
                v-if="showEdit && musicList && musicList.length > 0"
                title="全选"
                @click="selectAll()"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="music-list-options-icon"
                >
                  <path
                    d="M20.4962 5.62668C21.3721 5.93448 22 6.76891 22 7.75V17.75C22 20.0972 20.0972 22 17.75 22H7.75C6.76891 22 5.93448 21.3721 5.62668 20.4962L7.72396 20.4996L17.75 20.5C19.2688 20.5 20.5 19.2688 20.5 17.75V7.75L20.496 7.69902L20.4962 5.62668ZM17.2468 2C18.4895 2 19.4968 3.00736 19.4968 4.25V17.2468C19.4968 18.4895 18.4895 19.4968 17.2468 19.4968H4.25C3.00736 19.4968 2 18.4895 2 17.2468V4.25C2 3.00736 3.00736 2 4.25 2H17.2468ZM17.2468 3.5H4.25C3.83579 3.5 3.5 3.83579 3.5 4.25V17.2468C3.5 17.661 3.83579 17.9968 4.25 17.9968H17.2468C17.661 17.9968 17.9968 17.661 17.9968 17.2468V4.25C17.9968 3.83579 17.661 3.5 17.2468 3.5ZM9.58115 11.3582L13.4697 7.46967C13.7626 7.17678 14.2374 7.17678 14.5303 7.46967C14.7966 7.73594 14.8208 8.1526 14.6029 8.44621L14.5303 8.53033L10.0303 13.0303C9.73449 13.3262 9.26134 13.3189 8.9736 13.0344L8.9 12.95L7.4 10.95C7.15147 10.6186 7.21863 10.1485 7.55 9.9C7.85125 9.67407 8.26715 9.70903 8.527 9.96622L8.6 10.05L9.58115 11.3582L13.4697 7.46967L9.58115 11.3582Z"
                  />
                </svg>
              </div>
              <div
                title="删除"
                v-if="showEdit && musicList && musicList.length > 0"
                @click="removeButtonClick"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="music-list-options-icon music-list-options-icon-dangerous"
                >
                  <path
                    d="M4.251,9.031c-0,0 0.194,4.655 0.34,8.167c0.106,2.544 2.199,4.552 4.746,4.552c1.68,0 3.646,0 5.326,0c2.547,0 4.64,-2.008 4.746,-4.552c0.146,-3.512 0.34,-8.167 0.34,-8.167c0.018,-0.413 -0.304,-0.763 -0.718,-0.78c-0.413,-0.018 -0.763,0.304 -0.78,0.718c-0,-0 -0.194,4.655 -0.341,8.166c-0.072,1.741 -1.505,3.115 -3.247,3.115c-1.68,0 -3.646,0 -5.326,-0c-1.742,0 -3.175,-1.374 -3.247,-3.115c-0.147,-3.511 -0.341,-8.166 -0.341,-8.166c-0.017,-0.414 -0.367,-0.736 -0.78,-0.718c-0.414,0.017 -0.736,0.367 -0.718,0.78Z"
                  />
                  <path
                    d="M7.459,5.25l0.374,-1.12c0.374,-1.123 1.425,-1.88 2.609,-1.88c0.944,0 2.172,0 3.116,0c1.184,-0 2.235,0.757 2.609,1.88l0.374,1.12l3.459,0c0.414,-0 0.75,0.336 0.75,0.75c0,0.414 -0.336,0.75 -0.75,0.75l-16,0c-0.414,-0 -0.75,-0.336 -0.75,-0.75c0,-0.414 0.336,-0.75 0.75,-0.75l3.459,0Zm7.5,0l-0.215,-0.645c-0.17,-0.511 -0.647,-0.855 -1.186,-0.855c-0.944,-0 -2.172,-0 -3.116,0c-0.539,-0 -1.016,0.344 -1.186,0.855l-0.215,0.645l5.918,0Z"
                  />
                </svg>
              </div>
              <div
                title="编辑"
                @click="showEdit = !showEdit"
                v-if="musicList && musicList.length > 0"
              >
                <svg
                  class="music-list-options-icon"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8,23H6a5,5,0,0,1-5-5V6A5,5,0,0,1,6,1h8a5,5,0,0,1,5,5V8a1,1,0,0,1-2,0V6a3,3,0,0,0-3-3H6A3,3,0,0,0,3,6V18a3,3,0,0,0,3,3H8a1,1,0,0,1,0,2Z"
                  />
                  <path d="M12,13H6a1,1,0,0,1,0-2h6a1,1,0,0,1,0,2Z" />
                  <path d="M8,17H6a1,1,0,0,1,0-2H8a1,1,0,0,1,0,2Z" />
                  <path d="M14,9H6A1,1,0,0,1,6,7h8a1,1,0,0,1,0,2Z" />
                  <path
                    d="M12,23a1,1,0,0,1-1-1.13l.33-2.56a2.93,2.93,0,0,1,.85-1.74l5.69-5.69a3.08,3.08,0,0,1,4.24,0,3,3,0,0,1,0,4.24l-5.69,5.69a2.93,2.93,0,0,1-1.74.85L12.13,23Zm8-10a1,1,0,0,0-.71.29L13.61,19a1,1,0,0,0-.29.58l-.16,1.28,1.28-.16A1.06,1.06,0,0,0,15,20.4l5.69-5.69a1,1,0,0,0,0-1.42A1,1,0,0,0,20,13Z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <ul ref="music_list_container" class="music-list-container">
            <li
              class="music-list-container-item"
              v-for="(item, index) in musicList"
              :key="item.originPath"
              @mouseup="showFilePath($event, item.originPath)"
            >
              <input
                type="checkbox"
                v-model="checkList[index]"
                v-if="showEdit"
              />
              <div
                class="music-list-container-item-div"
                @click="showEdit ? null : changeMusic(item, index)"
              >
                <span
                  :title="item.name"
                  :class="`music-list-container-item-div-span ${
                    now === index ? 'music-list-container-item-active' : null
                  } ${
                    showEdit ? null : 'music-list-container-item-div-span-hover'
                  }`"
                  >{{ item.name }}</span
                >
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div
      :class="`controller-container ${
        musicList === undefined || musicList.length === 0 || isHideController
          ? 'controller-container-hide'
          : null
      }`"
    >
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
        :playListScroll
        :showInfo
      />
    </div>
    <section style="position: fixed">
      <transition name="fade">
        <div v-show="showDialog" class="mask" @click="showDialog = false"></div>
      </transition>
      <transition name="show">
        <div class="dialog" v-if="showDialog">
          <div class="show-detail">
            <div class="s-title">歌曲信息</div>
            <div class="show-main">
              <div class="show-main-img-container">
                <img v-if="musicCoverUrl" :src="musicCoverUrl" />
              </div>
              <div class="show-main-detail">
                <div>
                  文件：<span
                    title="在文件管理器中显示"
                    v-if="musicList && now !== -1"
                    class="file-path"
                    @click="showInFolder(musicList[now].originPath)"
                  >
                    {{
                      musicList?.length > 0 ? musicList[now].originPath : null
                    }}
                  </span>
                </div>
                <div>
                  大小：{{
                    musicSize > 1048576
                      ? (musicSize / 1024 / 1024).toFixed(1) + " Mb"
                      : (musicSize / 1024).toFixed(1) + " Kb"
                  }}
                </div>
                <div>
                  码率：{{
                    musicMeta?.format.bitrate
                      ? (musicMeta?.format.bitrate / 1000).toFixed(0) + " kbps"
                      : null
                  }}
                </div>
                <div>
                  采样率：{{
                    musicMeta?.format.sampleRate
                      ? musicMeta?.format.sampleRate / 1000 + " kHZ"
                      : null
                  }}
                </div>
                <div v-if="musicMeta?.format.bitsPerSample">
                  位深度：{{ musicMeta?.format.bitsPerSample + " bit" }}
                </div>
                <div>
                  格式：{{
                    musicMeta?.format.codec ? musicMeta?.format.codec : null
                  }}
                </div>
                <div v-if="musicMeta?.format.lossless !== undefined">
                  无损：{{ musicMeta?.format.lossless ? "是" : "否" }}
                </div>
                <div>歌曲名称：{{ musicMeta?.common.title }}</div>
                <div>
                  创作者：
                  <span v-if="musicMeta?.common.artists">
                    <span v-for="(item, i) in musicMeta?.common.artists"
                      >{{ item }}
                      <span v-if="i !== musicMeta?.common.artists.length - 1"
                        >&nbsp;</span
                      ></span
                    >
                  </span>
                </div>
                <div>专辑：{{ musicMeta?.common.album }}</div>
                <div v-if="musicMeta?.common.year">
                  年代：{{ musicMeta?.common.year }}
                </div>
                <div v-if="musicMeta?.common.genre">
                  类型：<span v-if="musicMeta?.common.genre">
                    <span v-for="(item, i) in musicMeta?.common.genre"
                      >{{ item }}
                      <span v-if="i !== musicMeta?.common.genre.length - 1"
                        >&nbsp;</span
                      ></span
                    ></span
                  >
                </div>
              </div>
            </div>
            <div class="confirm-option">
              <button @click="showDialog = false">确定</button>
            </div>
          </div>
        </div>
      </transition>
    </section>
  </main>
</template>
<script setup lang="ts">
import Lyrics from "./components/Lyrics.vue";
import { ref, watch, nextTick } from "vue";
import Lyric from "./type/Lyric";
import { dialog } from "@electron/remote";
import { ipcRenderer } from "electron";
import { MusicBuffer, MusicFileInfo } from "./type/Music";
import { getFilesAndFoldersInDir, parseMeta } from "./request/MusicRequest";
import { IAudioMetadata } from "music-metadata-browser";
import MusicController from "./components/MusicController.vue";
import { colorComplement, colorfulImg, get3Colors } from "./tools/ThemeColor";
import Sortable from "sortablejs";
import path from "path";

import icon from "./assets/music-note.png";

const lyrics = ref<Lyric[]>();
const player = ref<HTMLAudioElement>();
const musicFileName = ref<string>();
const musicSrcURL = ref<string | undefined>();
const musicList = ref<MusicFileInfo[]>();
const musicMeta = ref<IAudioMetadata>();
const pictrue = ref<HTMLImageElement>();
const musicDuration = ref(0);
const now = ref(-1);
const showSideWindow = ref(false);
const showTranslation = ref(true);
const checkList = ref<boolean[]>([]);
const showEdit = ref(false);
const music_list_container = ref<HTMLUListElement>();
const sort_obj = ref<Sortable>();
const isLoading = ref(true);
const musicCoverUrl = ref<string>();
const lastMusic = ref<string>();
const showDialog = ref(false);
const musicSize = ref(0);
const isHideController = ref(true);

let controllerTimer: null | NodeJS.Timeout = null;

//监听音乐列表的变化
watch(
  musicList,
  (val, oldVal) => {
    if (!val) return;
    if (val.length === 0) clearAll();
    playerCoverinitiate();
    saveMusicListInStorage(val);
    //添加多选框
    checkList.value = [];
    for (let i = 0; i < val.length; i++) {
      checkList.value.push(false);
    }
    if (!oldVal && val.length > 0)
      //设置播放列表滚动到正在播放
      playListScroll(now.value);
  },
  { deep: true }
);

watch(showSideWindow, (val) => {
  if (!val) showEdit.value = false; //侧边栏收起关闭编辑状态
  saveShowMusicListToStorage();
});

watch(showEdit, (val) => {
  if (sort_obj.value) sort_obj.value.options.sort = val;
});

watch(musicFileName, (val) => {
  lastMusic.value = val;
});

//监听url变化 手动释放内存
watch(musicSrcURL, (_newVal, oldVal) => {
  if (oldVal) URL.revokeObjectURL(oldVal);
});
//监听meta变化 设置图片src
watch(musicMeta, (val, oldVal) => {
  //设置窗口名称
  changeTitle();
  if (
    !val ||
    (val.common.title === oldVal?.common.title &&
      val.format.codec === oldVal?.format.codec &&
      val.common.artist === oldVal?.common.artist)
  )
    return;

  if (!musicList.value || musicList.value.length === 0) return;
  if (val.common.picture)
    musicCoverUrl.value = `data:${
      val.common.picture[0].format
    };base64,${val.common.picture[0].data.toString("base64")}`;
  else {
    ipcRenderer.send("doLoadCover", musicList.value[now.value].originPath);
  }
});
//监听图片src变化
watch(
  musicCoverUrl,
  (val) => {
    if (val) executeBackground();
  },
  { immediate: true }
);

initialize();

//监听主进程加载音乐
ipcRenderer.on("loadMusic", (_event, args: MusicBuffer) => {
  if (args.buffer === null) {
    dialog.showMessageBox({
      title: "提示",
      message: `"${musicList.value![args.index].name}" 该文件已丢失！`,
    });
    return;
  }
  musicSrcURL.value = URL.createObjectURL(new Blob([args.buffer]));
  getLyric(args.originPath);
  parseMeta(args.buffer).then((meta) => {
    musicMeta.value = meta;
    if (meta.format.duration) musicDuration.value = meta.format.duration;
    musicSize.value = args.size;
  });
  //设置当前正在播放状态 用于保存上次播放记录
  for (let i = 0; i < musicList.value!.length; i++) {
    if (i === args.index) {
      musicList.value![i].active = true;
      now.value = i;
      musicFileName.value = musicList.value![i].name;
    } else musicList.value![i].active = false;
  }
  saveMusicListInStorage(musicList.value!);
});
//监听主进程加载歌词
ipcRenderer.on("loadLyric", (_event, args: string | undefined) => {
  if (args) lyrics.value = executeLyrics(args);
  else lyrics.value = undefined;
});
//监听主进程通过该应用打开文件
ipcRenderer.on("open-file", (_event, args: MusicFileInfo[]) => {
  if (args.length === 0) return;
  loadFile(args);
});
//监听主进程加载专辑封面
ipcRenderer.on("loadCover", (_event, args: { buffer: string | null }) => {
  if (args.buffer === null) {
    musicCoverUrl.value = icon;
    return;
  }
  musicCoverUrl.value = `data:image/png;base64,${args.buffer}`;
});
//监听主进程发送的三种主要颜色
ipcRenderer.on("get3Color", (_event, color_list: number[][]) => {
  document.body.style.setProperty(
    "--bg_gradient0",
    `rgba(${color_list[0][0]},${color_list[0][1]},${color_list[0][2]},0.7)`
  );
  document.body.style.setProperty(
    "--bg_gradient1",
    `rgba(${color_list[1][0]},${color_list[1][1]},${color_list[1][2]},0.7)`
  );
  document.body.style.setProperty(
    "--bg_gradient2",
    `rgba(${color_list[2][0]},${color_list[2][1]},${color_list[2][2]},0.7)`
  );
});
function initialize() {
  showSideWindow.value = getShowMusicListFromStorage();
  musicList.value = getMusicListFromStorage();

  doSort();
  //拖入文件
  window.ondragover = (e) => e.preventDefault();
  window.ondrop = dropFile;

  setTimeout(() => {
    isLoading.value = false;
    //以该应用打开文件
    ipcRenderer.send("open-on-app");
    setTimeout(() => playListScroll(now.value), 500);
  }, 1000);

  //鼠标进入[离]界面显示[隐藏]控制栏
  document.documentElement.addEventListener("mouseenter", showController);
  document.documentElement.addEventListener("mouseleave", hideController);
}
//初始化播放界面
function playerCoverinitiate() {
  if (!musicList.value) return;

  if (musicList.value.length > 0) {
    let index = 0;
    for (let i = 0; i < musicList.value.length; i++) {
      if (musicList.value[i].active) {
        index = i;
        break;
      }
    }
    if (!showEdit.value && lastMusic.value !== musicList.value[index].name) {
      changeMusic(musicList.value[index], index);
      musicFileName.value = musicList.value[index].name;
    }
    now.value = index;
  }
}
//改变背景颜色
function executeBackground() {
  //设置背景主题色
  nextTick(() => {
    if (pictrue.value) {
      pictrue.value.onload = () => {
        const rgb = colorfulImg(pictrue.value!);
        if (rgb.b === 0 && rgb.g === 0 && rgb.r === 0) return;
        const color_complement = colorComplement(rgb.r, rgb.g, rgb.b);
        document.body.style.setProperty("--lyrics_color", color_complement);
        document.body.style.setProperty(
          "--bg_static",
          `rgb(${rgb.r},${rgb.g},${rgb.b})`
        );
        const color_list = get3Colors(pictrue.value!);
        ipcRenderer.send("doGet3Color", color_list);
      };
    }
  });
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
      title: "选择文件夹",
      properties: ["openDirectory"],
    })
    .then((res) => {
      if (!(res.filePaths.length > 0)) return;
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
        const fileName = path.basename(res.filePaths[i]);
        const type = path.extname(res.filePaths[i]);
        if (type === ".mp3" || type === ".flac" || type === ".wav") {
          list.push({
            type,
            name: fileName,
            originPath: res.filePaths[i],
          });
        }
      }
      addToPlayList(list);
    });
}
//添加到播放列表
function addToPlayList(list: MusicFileInfo[]) {
  showEdit.value = false;
  list.forEach((item) => {
    if (!musicList.value) musicList.value = list;
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
function changeMusic(item: MusicFileInfo | null, index: number) {
  if (!musicList.value || musicList.value.length === 0) return;
  if (lastMusic.value === musicList.value[index].name || index === -1) return;
  if (player.value) player.value.currentTime = 0;
  //传递空值
  if (!item) {
    musicMeta.value = undefined;
    player.value!.currentTime = 0;
    player.value!.src = "null";
    return;
  }
  ipcRenderer.send("doLoadMusic", { originPath: item.originPath, index });
  if (player.value) player.value.oncanplay = () => player.value?.play();
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
//清空所有数据
function clearAll() {
  changeMusic(null, 0);
  now.value = -1;
  musicDuration.value = 0;
  musicFileName.value = "";
  musicMeta.value = undefined;
  lyrics.value = undefined;
  document.body.style.removeProperty("--bg_gradient0");
  document.body.style.removeProperty("--bg_gradient1");
  document.body.style.removeProperty("--bg_gradient2");
  musicSrcURL.value = undefined;
  musicCoverUrl.value = undefined;
  if (player.value) player.value.currentTime = 0;
}
//全选
function selectAll(val?: boolean) {
  if (val !== undefined) {
    checkList.value = checkList.value.map(() => val);
    return;
  }
  if (!checkList.value.includes(false)) {
    //若全被选中
    checkList.value = checkList.value.map(() => false); //全不选
    return;
  }
  //默认全选
  checkList.value = checkList.value.map(() => true); //全选中
}
//从播放列表删除
function removeFromMusicList() {
  if (!musicList.value || !(musicList.value.length > 0)) return;
  let isPlaying = false;
  let selected = [];
  //从选择列表选出true
  for (let i = 0; i < checkList.value.length; i++) {
    if (checkList.value[i]) selected.push(i);
  }
  if (!(selected.length > 0)) return;
  isPlaying = selected.includes(now.value); //判断要删除的音乐是否是正在播放
  const music_list_filter = musicList.value.filter(
    (_el, index) => !selected.includes(index)
  );
  musicList.value = music_list_filter;
  if (music_list_filter.length === 0) {
    clearAll();
    return;
  }
  if (isPlaying) changeMusic(musicList.value[0], 0);
}
//保存播放列表状态
function saveShowMusicListToStorage() {
  localStorage.setItem("show-music-list", String(showSideWindow.value));
}
//读取播放列表状态
function getShowMusicListFromStorage() {
  const isShow = localStorage.getItem("show-music-list");
  if (!isShow) return false;
  const show = JSON.parse(isShow) as boolean;
  if (!show) return false;
  return show;
}
//播放列表拖动排序
function doSort() {
  nextTick(() => {
    if (music_list_container.value) {
      sort_obj.value = new Sortable(music_list_container.value, {
        animation: 150,
        sort: false,
        onEnd: (event) => {
          if (
            event.oldIndex !== undefined &&
            event.newIndex !== undefined &&
            event.oldIndex !== event.newIndex
          ) {
            const temp = resetIndex(event.oldIndex, event.newIndex);
            musicList.value = temp;
          }
        },
      });
    }
  });
}
//编号重新排序
function resetIndex(oldIndex: number, newIndex: number) {
  if (!musicList.value || !(musicList.value.length > 0)) return;
  let temp: MusicFileInfo[] = [];
  temp = temp.concat(musicList.value);
  temp.splice(newIndex, 0, temp.splice(oldIndex, 1)[0]);
  return temp;
}
//点击删除
function removeButtonClick() {
  const hasTrue = checkList.value.some((item) => item === true);
  if (hasTrue)
    dialog
      .showMessageBox({
        title: "提示",
        message: "确定删除吗？",
        type: "warning",
        buttons: ["确定", "取消"],
        cancelId: 1,
        defaultId: 1,
      })
      .then((res) => {
        if (res.response === 0) removeFromMusicList();
      });
}
//拖入文件
function dropFile(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer === null || e.dataTransfer.files.length === 0) return;
  const files = e.dataTransfer.files;
  //将文件格式更改为MusicFileInfo[];
  let newList: MusicFileInfo[] = [];
  for (let i = 0; i < files.length; i++) {
    const type = files[i].name.slice(files[i].name.lastIndexOf(".") + 1);
    if (type === "mp3" || type === "flac" || type === "wav") {
      newList.push({
        name: files[i].name,
        originPath: files[i].path,
        type: files[i].type,
      });
    } else {
      const result = getFilesAndFoldersInDir(files[i].path, []);
      newList = result;
    }
  }
  loadFile(newList);
}
function loadFile(list: MusicFileInfo[]) {
  if (!musicList.value) {
    musicList.value = list;
  }
  //添加进播放列表
  addToPlayList(list);
  //若拖入一个文件则自动播放
  if (list.length === 1) {
    const list_offset = musicList.value.findIndex((el) => {
      return el.originPath === list[0].originPath;
    });

    if (list_offset !== -1)
      changeMusic(musicList.value[list_offset], list_offset);

    setTimeout(() => playListScroll(now.value), 500);
  }
}
//更改窗口名称
function changeTitle() {
  let title = musicFileName.value;
  if (
    musicMeta.value &&
    musicMeta.value.common.artists &&
    musicMeta.value.common.artists.length > 0 &&
    musicMeta.value.common.title
  ) {
    title = "";
    for (let i = 0; i < musicMeta.value.common.artists.length; i++) {
      title += musicMeta.value.common.artists[i];
      if (i !== musicMeta.value.common.artists.length - 1) title += " ";
    }
    title += ` - ${musicMeta.value.common.title}  [Lingyi Player]`;
  } else title = undefined;
  ipcRenderer.send("titleChange", title);
}
//刷新播放列表scroll高度
function playListScroll(index: number) {
  nextTick(() => {
    let top = 0;
    const list_container = document.querySelector(
      ".music-list-container"
    ) as HTMLUListElement;
    const list = list_container.children;
    if (!list || list.length === 0) return;
    const active_item = list[index] as HTMLLIElement;
    top = active_item.offsetTop - active_item.clientHeight;
    if (index === 0) top = 0;
    list_container.scrollTo({
      left: 0,
      top,
    });
  });
}
//显示歌曲信息
function showInfo() {
  showDialog.value = true;
}
//右键显示文件路径
function showFilePath(e: MouseEvent, filePath: string) {
  if (e.button === 2)
    dialog.showMessageBox({ title: "文件路径", message: filePath });
}
//在文件夹中显示
function showInFolder(filePath: string) {
  ipcRenderer.send("open-path", filePath);
}
//延迟隐藏控制栏
function hideController() {
  if (controllerTimer) clearTimeout(controllerTimer);
  controllerTimer = setTimeout(() => {
    isHideController.value = true;
    showSideWindow.value = false;
    controllerTimer = null;
  }, 5000);
}
//显示控制栏
function showController() {
  if (controllerTimer) {
    clearTimeout(controllerTimer);
    controllerTimer = null;
  }
  isHideController.value = false;
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
  overflow: hidden;
  .info-section {
    display: flex;
    gap: 5%;
    align-items: center;
    justify-content: center;
    width: 80%;
    height: 95%;
    .info-placeholder {
      color: var(--font_color);
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 1.5rem;
      max-width: 60%;
    }
  }
}
.loading-cover {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100%;
  background-color: var(--bg);
  z-index: 99;
  display: flex;
  justify-content: center;
  align-items: center;
  img {
    min-width: 2rem;
    width: 30vw;
    aspect-ratio: 1;
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
    position: relative;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      user-select: none;
      position: absolute;
    }
  }
  &-title {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    text-align: center;
    font-size: 1.5rem;
    max-width: 500px;
    width: 30vw;
    min-height: 4.5rem;
    color: var(--lyrics_color);
  }
}
.lyrics-main {
  width: 50%;
  .terminal {
    position: fixed;
  }
}

.side-window {
  position: fixed;
  top: 50vh;
  right: 0;
  display: flex;
  align-items: center;
  transition: transform 0.5s ease;
  transform: translate(calc(100% - 2rem), -50%);
  &-active {
    transform: translate(0%, -50%);
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
    position: relative;
    padding: 1rem 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    border-top-left-radius: 0.5rem;
    border-bottom-left-radius: 0.5rem;
    max-width: 22rem;
    overflow-y: auto;
    overflow-x: hidden;
    gap: 1rem;
    &:hover .music-list-overlay {
      opacity: 1;
    }
    &-overlay {
      position: absolute;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      top: 0;
      z-index: -1;
      background-color: var(--side_window_bg);
      transition: background-color 0.3s ease, opacity 0.3s ease,
        filter 0.3s ease;
      opacity: 0.5;
    }
    &-options {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      &-icon {
        height: 2rem;
        width: 2rem;
        transition: all 0.3s ease;
        cursor: pointer;
        fill: var(--font_color);
        &:active {
          transform: scale(0.85);
        }
        &-dangerous {
          &:hover {
            fill: #fa5353;
            filter: drop-shadow(0px 0px 5px #fa5353);
          }
        }
      }
      &-start {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      &-end {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
    }
    &-container {
      max-height: 40vh;
      width: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;

      &::-webkit-scrollbar {
        width: 0.5rem;
      }
      &::-webkit-scrollbar-thumb {
        background-color: var(--bg_progress_active);
        border-radius: 0.25rem;
      }
      &-item {
        min-width: 100%;
        list-style-type: none;
        font-size: 1.3rem;
        user-select: none;
        cursor: pointer;
        transform-origin: 0 0;
        box-sizing: border-box;
        padding: 0.3rem 0.5rem 0.3rem 0.3rem;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        border-radius: 0.5rem;
        transition: background-color 0.5s ease, color 0.1s ease;
        &-active {
          color: var(--lyrics_color);
          animation: circulateTranslate 15s linear infinite;
        }
        &:hover {
          background-color: var(--side_window_item_hover);
        }
        input[type="checkbox"] {
          cursor: pointer;
          margin: 0;
          height: 100%;
          appearance: none;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          &::after {
            content: "";
            position: absolute;
            background-color: #ffffffb2;
            color: #000;
            width: 1rem;
            height: 1rem;
            left: 0;
            display: inline-block;
            border-radius: 0.3rem;
            visibility: visible;
            transition: background-color 0.3s ease;
          }

          &:checked::after {
            content: "";
            background-color: #232323;
          }
        }
        &-div {
          width: fit-content;
          min-width: 100%;
          display: inline-block;
          overflow: hidden;
          &-span {
            width: 100%;
            transition: all 0.3s ease;
            display: inline-block;
            transition: color 0.3s ease;
          }
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
  transition: all 0.5s ease;
  position: fixed;
  bottom: 0.2rem;
  &-hide {
    transform: translate(0, 100%);
    opacity: 0;
  }
}
.mask {
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  background-color: rgba($color: #232323, $alpha: 0.6);
}
.dialog {
  position: fixed;
  height: 100%;
  width: 100%;
  left: 0;
  .show-detail {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60vw;
    background-color: var(--bg);
    color: var(--font_color);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 25px;
    box-sizing: border-box;
    padding: 10px 3rem;
    border-radius: 10px;
    box-shadow: 0px 0px 12px rgba(0, 0, 0, 0.72);

    .s-title {
      font-size: 24px;
    }

    .show-main {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 3rem;

      &-img-container {
        min-width: 200px;
        max-width: 350px;
        width: 40%;
        img {
          width: 100%;
          object-fit: contain;
        }
      }
      &-detail {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        font-size: 1.1rem;
        width: 50%;
      }
    }

    .confirm-option {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      padding: 0 20px;
      box-sizing: border-box;
      button {
        font-weight: 600;
      }
    }
  }
}
.file-path {
  cursor: pointer;
  &:hover {
    text-decoration: underline;
    color: #4dafef;
  }
}
@keyframes circulateTranslate {
  0% {
    transform: translate(0);
  }
  25% {
    transform: translate(100%);
  }
  50% {
    transform: translate(0);
  }
  75% {
    transform: translate(-100%);
  }
  100% {
    transform: translate(0);
  }
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade_title-enter-from,
.fade_title-leave-to {
  opacity: 0;
}
.fade_title-enter-to,
.fade_title-leave-from {
  opacity: 1;
}
.fade_title-enter-active,
.fade_title-leave-active {
  transition: opacity 0.3s ease;
}
.show-enter-from,
.show-leave-to {
  opacity: 0;
  transform: scale(0.3);
}

.show-enter-to,
.show-leave-from {
  opacity: 1;
  transform: scale(1);
}

.show-enter-active,
.show-leave-active {
  transition: all 0.3s ease-in-out;
}
.out-enter-from,
.out-leave-to {
  opacity: 0;
  width: 0;
}

.out-enter-to,
.out-leave-from {
  opacity: 1;
  width: 50%;
}

.out-enter-active,
.out-leave-active {
  transition: all 0.3s ease;
}
</style>
