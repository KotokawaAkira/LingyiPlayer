<template>
  <div class="controls-layout">
    <div>
      <div class="player-progress">
        <div class="time">
          <div ref="current_time" class="current-time time-tiem">
            {{ musicCurrentTime }}
          </div>
          <div class="divide">/</div>
          <div ref="total_time" class="total-time time-tiem">
            {{ formatSeconds(props.totle) }}
          </div>
        </div>
        <div ref="time_progress" class="progress">
          <div
            ref="progress_out"
            class="progress-out"
            @mousedown="progressMouseDown"
            @mouseup="progressMouseUp"
            @click="progressClick"
          >
            <div ref="progress" class="progress-in"></div>
          </div>
        </div>
      </div>
      <div class="controls">
        <div class="play-controls">
          <div
            class="play-controls-button"
            @click="preMusic(props.now)"
            title="上一首"
          >
            <svg
              class="play-controls-icon"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12,0A12,12,0,1,0,24,12,12.01,12.01,0,0,0,12,0Zm2.64,16.232a1,1,0,1,1-1.28,1.536l-6-5a1,1,0,0,1,0-1.536l6-5a1,1,0,1,1,1.28,1.536L9.562,12Z"
              />
            </svg>
          </div>
          <div
            class="play-controls-button"
            @click="playClick"
            :title="isPlaying ? '暂停(space)' : '播放(space)'"
          >
            <svg
              :class="`play-pause play-controls-icon ${
                keydownActive ? 'play-controls-icon-active' : null
              }`"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              viewBox="0 0 16 16"
              xml:space="preserve"
            >
              <path
                v-if="isPlaying"
                d="M8,0C3.582,0,0,3.582,0,8s3.582,8,8,8s8-3.582,8-8S12.418,0,8,0z M7,12H5V8V4h2V12z M11,12H9V8V4h2
		V12z"
              />
              <path
                v-else
                d="M8,0C3.582,0,0,3.582,0,8s3.582,8,8,8s8-3.582,8-8S12.418,0,8,0z M5,12V4l7,4L5,12z"
              />
            </svg>
          </div>
          <div
            class="play-controls-button"
            @click="nextMusic(props.now)"
            title="下一首"
          >
            <svg
              class="play-controls-icon"
              viewBox="0 0 24 24"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
            >
              <path
                d="M12,0A12,12,0,1,0,24,12,12.01,12.01,0,0,0,12,0Zm4.641,12.768-6,5a1,1,0,1,1-1.282-1.536L14.437,12,9.359,7.768a1,1,0,1,1,1.282-1.536l6,5a1,1,0,0,1,0,1.536Z"
              />
            </svg>
          </div>
        </div>
        <div class="extension-controls">
          <div
            style="height: 2rem; width: 2rem"
            title="翻译"
            @click="changeShowTranslate.changeShow"
          >
            <svg
              v-if="changeShowTranslate.isShow"
              class="play-controls-icon"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              version="1.1"
            >
              <path
                d="M12.87,15.07L10.33,12.56L10.36,12.53C12.1,10.59 13.34,8.36 14.07,6H17V4H10V2H8V4H1V6H12.17C11.5,7.92 10.44,9.75 9,11.35C8.07,10.32 7.3,9.19 6.69,8H4.69C5.42,9.63 6.42,11.17 7.67,12.56L2.58,17.58L4,19L9,14L12.11,17.11L12.87,15.07M18.5,10H16.5L12,22H14L15.12,19H19.87L21,22H23L18.5,10M15.88,17L17.5,12.67L19.12,17H15.88Z"
              />
            </svg>
            <svg
              v-else
              class="play-controls-icon"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              version="1.1"
            >
              <path
                d="M12.17,5.81C11.87,6.69 11.47,7.55 11,8.39L12.35,9.74C13.11,8.5 13.71,7.18 14.13,5.81H17.16V3.75H9.94V1.69H7.87V3.75H6.37L8.43,5.81H12.17M15.53,12.91L17.03,14.41L17.67,12.69L19.08,16.47L22.39,19.77L18.7,9.94H16.64L15.53,12.91M1.31,1.31L0,2.62L1.13,3.75H0.65V5.81H3.19L5.26,7.88H4.46C5.21,9.56 6.24,11.15 7.53,12.58L2.28,17.76L3.75,19.22L8.91,14.07L12.11,17.27L12.8,15.43L14.1,16.72L12,22.31H14.06L15.22,19.22H16.6L21.38,24L22.69,22.69L1.31,1.31Z"
              />
            </svg>
          </div>
          <div
            style="height: 2rem; width: 2rem"
            :title="playMode.label"
            @click="switchPlayMode"
          >
            <svg
              v-if="playMode.type === 0"
              class="play-controls-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path fill="none" d="M0 0h24v24H0z" />
              <path
                d="M16 7h-5a6 6 0 1 0 0 12h9v2h-9a8 8 0 1 1 0-16h5V1l6 5-6 5V7z"
              />
            </svg>
            <svg
              v-if="playMode.type === 1"
              class="play-controls-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 456.559 456.559"
              style="enable-background: new 0 0 456.559 456.559"
              xml:space="preserve"
            >
              <path
                d="M351.79,151.874c-3.434,0-6.875-1.308-9.498-3.931c-5.238-5.245-5.238-13.75,0-18.995l53.02-53.006l-53.02-53.013
		c-5.238-5.245-5.238-13.75,0-18.995c5.245-5.245,13.75-5.245,18.995,0l62.511,62.511c2.518,2.518,3.931,5.938,3.931,9.498
		c0,3.56-1.413,6.98-3.931,9.498l-62.511,62.504C358.665,150.566,355.224,151.874,351.79,151.874z"
              />
              <path
                d="M42.958,227.428c-7.413,0-13.428-6.015-13.428-13.428v-80.932c0-38.907,31.647-70.554,70.554-70.554h314.218
		c7.413,0,13.428,6.015,13.428,13.428c0,7.413-6.015,13.428-13.428,13.428H100.083c-24.094,0-43.697,19.604-43.697,43.697V214
		C56.386,221.414,50.371,227.428,42.958,227.428z"
              />
              <path
                d="M357.162,394.049H42.258c-7.413,0-13.428-6.015-13.428-13.428s6.015-13.428,13.428-13.428h314.903
		c24.101,0,43.704-19.604,43.704-43.697v-82.534c0-7.413,6.015-13.428,13.428-13.428c7.413,0,13.428,6.015,13.428,13.428v82.534
		C427.722,362.402,396.068,394.049,357.162,394.049z"
              />
              <path
                d="M104.769,456.559c-3.434,0-6.875-1.308-9.498-3.931l-62.511-62.511c-2.518-2.518-3.931-5.938-3.931-9.498
		s1.413-6.98,3.931-9.498l62.511-62.504c5.245-5.245,13.75-5.245,18.995,0c5.238,5.245,5.238,13.75,0,18.995l-53.02,53.006
		l53.02,53.013c5.238,5.245,5.238,13.75,0,18.995C111.644,455.252,108.203,456.559,104.769,456.559z"
              />
            </svg>
            <svg
              v-if="playMode.type === 2"
              class="play-controls-icon"
              role="img"
              focusable="false"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 456.556 456.556"
              style="enable-background: new 0 0 456.556 456.556"
              xml:space="preserve"
            >
              <path
                d="M383.883,184.953c-3.437,0-6.871-1.308-9.494-3.931c-5.245-5.245-5.245-13.75,0-18.995l49.747-49.747l-49.747-49.747
		c-5.245-5.245-5.245-13.75,0-18.995s13.743-5.245,18.988,0l59.245,59.245c5.245,5.245,5.245,13.75,0,18.995l-59.245,59.245
		C390.755,183.645,387.321,184.953,383.883,184.953z"
              />
              <path
                d="M251.658,184.953c-2.588,0-5.2-0.741-7.504-2.301c-6.148-4.147-7.763-12.498-3.612-18.646l40.008-59.245
		c2.497-3.693,6.665-5.91,11.127-5.91h121.829c7.417,0,13.428,6.015,13.428,13.428c0,7.413-6.011,13.428-13.428,13.428H298.811
		l-36.015,53.335C260.201,182.883,255.966,184.953,251.658,184.953z"
              />
              <path
                d="M135.257,357.33H13.428C6.011,357.33,0,351.315,0,343.901c0-7.413,6.011-13.428,13.428-13.428h114.695l39.424-58.377
		c4.154-6.141,12.498-7.77,18.642-3.609c6.148,4.147,7.763,12.498,3.612,18.646l-43.418,64.287
		C143.887,355.112,139.719,357.33,135.257,357.33z"
              />
              <path
                d="M383.883,416.952c-3.437,0-6.871-1.308-9.494-3.931c-5.245-5.245-5.245-13.75,0-18.995l49.747-49.747l-49.747-49.747
		c-5.245-5.245-5.245-13.75,0-18.995c5.245-5.245,13.743-5.245,18.988,0l59.245,59.245c5.245,5.245,5.245,13.75,0,18.995
		l-59.245,59.245C390.755,415.644,387.321,416.952,383.883,416.952z"
              />
              <path
                d="M413.506,357.707H291.677c-4.462,0-8.63-2.217-11.127-5.91L128.123,126.086H13.428C6.011,126.086,0,120.071,0,112.658
		c0-7.413,6.011-13.428,13.428-13.428h121.829c4.462,0,8.63,2.217,11.127,5.91l152.427,225.711h114.695
		c7.417,0,13.428,6.015,13.428,13.428C426.934,351.693,420.923,357.707,413.506,357.707z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="controls-volume" @wheel="volumeMouseWheel" title="音量(↑↓)">
      <div
        ref="volume_progress_out"
        class="volume-progress"
        @click="volumeClick"
        @mousedown="volumeDown"
      >
        <div ref="volume_progress" class="volume-progress-inner"></div>
      </div>
      <div class="controls-volume-icon" @click="mute">
        <svg
          v-if="volume === 0 || volume < 0"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.45,4.11a1,1,0,0,0-1,.09L10.67,10H3a1,1,0,0,0-1,1V21a1,1,0,0,0,1,1h7.67l7.73,5.8A1,1,0,0,0,20,27V5A1,1,0,0,0,19.45,4.11Z"
          />
          <path
            d="M27.41,16l2.29-2.29a1,1,0,0,0-1.41-1.41L26,14.59l-2.29-2.29a1,1,0,0,0-1.41,1.41L24.59,16l-2.29,2.29a1,1,0,1,0,1.41,1.41L26,17.41l2.29,2.29a1,1,0,0,0,1.41-1.41Z"
          />
        </svg>
        <svg v-else viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M19.45,4.11a1,1,0,0,0-1,.09L10.67,10H3a1,1,0,0,0-1,1V21a1,1,0,0,0,1,1h7.67l7.73,5.8A1,1,0,0,0,20,27V5A1,1,0,0,0,19.45,4.11Z"
          />
          <path d="M23,12a1,1,0,0,0-1,1v6a1,1,0,0,0,2,0V13A1,1,0,0,0,23,12Z" />
          <path d="M26,10a1,1,0,0,0-1,1V21a1,1,0,0,0,2,0V11A1,1,0,0,0,26,10Z" />
          <path d="M29,8a1,1,0,0,0-1,1V23a1,1,0,0,0,2,0V9A1,1,0,0,0,29,8Z" />
        </svg>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{
  player?: HTMLAudioElement;
  totle: number;
  musicList?: MusicFileInfo[];
  changeMusic: (item: MusicFileInfo, index: number) => void;
  now: number;
  changeShowTranslate: { isShow: boolean; changeShow: () => void };
  playListScroll: (index: number) => void;
}>();
import { ref, watch } from "vue";
import { formatSeconds } from "../tools/TimeTransform";
import { MusicFileInfo } from "../type/Music";
import { ipcRenderer } from "electron";
import { PlayMode } from "../type/Player";
const current_time = ref<HTMLDivElement>();
const time_progress = ref<HTMLDivElement>();
const progress_out = ref<HTMLDivElement>();
const progress = ref<HTMLDivElement>();
const volume_progress_out = ref<HTMLDivElement>();
const volume_progress = ref<HTMLDivElement>();
const musicCurrentTime = ref<string>("0:00");
const isPlaying = ref(false);
const volume = ref(0);
const playMode = ref<PlayMode>({ type: 0, label: "列表循环" });
const keydownActive = ref(false);

let lastTime = 0;

watch(
  () => props.player,
  (val) => {
    if (!val) return;
    val.addEventListener("timeupdate", timeUpdate);
    val.onended = () => nextMusic(props.now);
    val.onvolumechange = volumeChange;
    const volume_num = getVolume();
    val.volume = volume_num;
    volumeChange();
  }
);
doSetTumbarButton();
watch(isPlaying, () => {
  doSetTumbarButton();
});

initialize();

function initialize() {
  //初始化播放模式
  const mode = getPlayMode();
  if (mode) playMode.value = mode;
  //初始化任务栏按钮
  //接收main进程的 上一首
  ipcRenderer.on("doPre", () => {
    preMusic(props.now);
  });
  //接收main进程的 播放
  ipcRenderer.on("doPlay", () => {
    playClick();
  });
  //接收main进程的 下一首
  ipcRenderer.on("doNext", () => {
    nextMusic(props.now);
  });
  //设置键盘事件
  window.onkeydown = keyboardDown;
  window.onkeyup = keyboardUp;
}
//静音事件
function mute() {
  if (!props.player) return;
  if (props.player.volume === 0) props.player.volume = 0.1;
  else {
    props.player.volume = 0.0;
  }
}
//更新时间
function timeUpdate() {
  if (!props.player) return;
  const p = props.player.currentTime / props.player.duration; //计算当前时间在总时长的占比
  if (current_time.value)
    musicCurrentTime.value = formatSeconds(props.player.currentTime);
  // current_time.value.innerText = formatSeconds(props.player.currentTime); //更新当前时间
  if (progress.value) progress.value.style.width = `${p * 100}%`; //更新进度条进度
  if (props.player.paused) isPlaying.value = false;
  else isPlaying.value = true;
  doProgressUpdate(p); //更新任务栏进度条
}
//进度条拖动
function progressMove(e: MouseEvent) {
  if (
    !time_progress.value ||
    !progress_out.value ||
    !progress.value ||
    !progress.value ||
    !props.player ||
    props.totle === 0
  )
    return;
  let percent =
    (e.clientX - time_progress.value.offsetLeft) /
    progress_out.value.offsetWidth;
  if (percent < 0) percent = 0;
  if (percent > 1) percent = 1;
  progress.value.style.setProperty("width", `${percent * 100}%`, "important");
  musicCurrentTime.value = formatSeconds(props.totle * percent);
  lastTime = props.totle * percent;
}
//进度条鼠标按下
function progressMouseDown(e: MouseEvent) {
  if (!e.target || !props.player) return;
  const progress = e.target as HTMLDivElement;
  progress.onmousemove = progressMove;
  props.player.removeEventListener("timeupdate", timeUpdate);
  window.addEventListener("mouseup", progressMouseLeave);
}
//进度条鼠标点击抬起
function progressMouseUp(e: MouseEvent) {
  if (!e.target || !props.player) return;
  const progress = e.target as HTMLDivElement;
  progress.onmousemove = null;
  props.player.addEventListener("timeupdate", timeUpdate);
  props.player.currentTime = lastTime;
  props.player?.play();
}
//进度条点击
function progressClick(e: MouseEvent) {
  progressMove(e);
  progressMouseUp(e);
}
//鼠标离开进度条
function progressMouseLeave(e: MouseEvent) {
  if (!progress_out.value) return;
  progress_out.value.onmousemove = null;
  progressMouseUp(e);
  window.removeEventListener("mouseup", progressMouseLeave);
}
//点击播放按钮
function playClick() {
  if (!props.player || props.totle === 0) return;
  if (isPlaying.value) {
    props.player.pause();
    isPlaying.value = false;
  } else {
    props.player.play();
    isPlaying.value = true;
  }
}
//上一首
function preMusic(now: number) {
  if (!props.musicList) return;
  let index = now;
  if (now === 0) {
    index = props.musicList.length - 1;
    props.changeMusic(props.musicList[index], index);
  } else {
    index = now - 1;
    props.changeMusic(props.musicList[index], index);
  }
  props.playListScroll(index);
}
//下一首
function nextMusic(now: number) {
  switch (playMode.value.type) {
    case 0:
      listPlay(now);
      break;
    case 1:
      circulatePlay(now);
      break;
    case 2:
      randomPlay(now);
      break;
  }
}
//列表循环
function listPlay(now: number) {
  let index = now;
  if (!props.musicList) return;
  if (now === props.musicList.length - 1) {
    index = 0;
    props.changeMusic(props.musicList[index], index);
  } else {
    index += 1;
    props.changeMusic(props.musicList[index], index);
  }
  props.playListScroll(index);
}
//单曲循环
function circulatePlay(now: number) {
  if (!props.musicList) return;
  props.changeMusic(props.musicList[now], now);
}
//随机
function randomPlay(now: number) {
  if (!props.musicList) return;
  const index = Math.floor(Math.random() * props.musicList.length);
  if (index === now) {
    randomPlay(now);
    return;
  }
  props.changeMusic(props.musicList[index], index);
  props.playListScroll(index);
}
//切换下一首模式
function switchPlayMode() {
  switch (playMode.value.type) {
    case 0:
      playMode.value = { type: 1, label: "单曲循环" };
      break;
    case 1:
      playMode.value = { type: 2, label: "随机" };
      break;
    case 2:
      playMode.value = { type: 0, label: "列表循环" };
      break;
  }
  savePlayMode();
}
/**音量进度条**/
//点击音量轴
function volumeClick(e: MouseEvent) {
  if (!props.player || !volume_progress_out.value || !volume_progress.value)
    return;
  const percent =
    1 -
    (e.clientY - volume_progress_out.value.offsetTop) /
      volume_progress_out.value.offsetHeight;
  props.player.volume = percent;
}
//音量轴鼠标移动
function volumeMove(e: MouseEvent) {
  if (!props.player || !volume_progress_out.value || !volume_progress.value)
    return;
  let percent =
    1 -
    (e.clientY - volume_progress_out.value.offsetTop) /
      volume_progress_out.value.offsetHeight;
  if (percent < 0) percent = 0;
  if (percent > 1) percent = 1;
  props.player.volume = percent;
}

//音量轴鼠标按下
function volumeDown() {
  if (!volume_progress_out.value) return;
  volume_progress_out.value.addEventListener("mousemove", volumeMove);
  window.addEventListener("mouseup", () => {
    if (!volume_progress_out.value) return;
    volume_progress_out.value.removeEventListener("mousemove", volumeMove);
  });
}
//音量轴鼠标滚轮运动
function volumeMouseWheel(e: WheelEvent) {
  if (!props.player) return;
  //向上滚动
  if (e.deltaY < 0) setVolume(0, 0.02);
  else setVolume(1, 0.02);
}
//设置音量 mode: 0加/1减
function setVolume(mode: 0 | 1, step: number) {
  if (!props.player) return;
  const v = props.player.volume;
  switch (mode) {
    case 0:
      if (v + step > 1) props.player.volume = 1;
      else props.player.volume += step;
      break;
    case 1:
      if (v - step < 0) props.player.volume = 0;
      else props.player.volume -= step;
      break;
  }
}
//音量改变事件
function volumeChange() {
  if (!props.player || !volume_progress.value || !volume_progress_out.value)
    return;
  volume_progress.value.style.height = props.player.volume * 100 + "%";
  volume.value = props.player.volume;
  saveVolume();
}
//音量数据写入缓存
function saveVolume() {
  localStorage.setItem("volume", volume.value.toString());
}
//从缓存读取音量数据
function getVolume() {
  const volume_string = localStorage.getItem("volume");
  let volume_num = 0.3;
  if (volume_string) volume_num = Number(volume_string);
  return volume_num;
}
//状态栏进度条更新
function doProgressUpdate(progress: number) {
  ipcRenderer.send("progressUpdate", progress);
}
//向main进程传出 音乐控制函数
function doSetTumbarButton() {
  ipcRenderer.send("doSetTumbarButtons", {
    isPlaying: isPlaying.value,
  });
}
//播放模式写入缓存
function savePlayMode() {
  localStorage.setItem("play-mode", JSON.stringify(playMode.value));
}
//从缓存读取播放模式
function getPlayMode() {
  const play_mode_string = localStorage.getItem("play-mode");
  if (!play_mode_string) return;
  return JSON.parse(play_mode_string) as PlayMode;
}
//键盘按下事件
function keyboardDown(e: KeyboardEvent) {
  e.stopPropagation();
  if (!props.player) return;
  switch (e.key) {
    case "ArrowUp":
      setVolume(0, 0.05);
      break;
    case "ArrowDown":
      setVolume(1, 0.05);
      break;
    case "ArrowRight":
      props.player.currentTime += 5;
      break;
    case "ArrowLeft":
      props.player.currentTime -= 5;
      break;
    case " ":
      keydownActive.value = true;
      break;
  }
}
//键盘抬起
function keyboardUp(e: KeyboardEvent) {
  if (!props.player) return;
  switch (e.key) {
    case " ":
      keydownActive.value = false;
      if (isPlaying.value) props.player.pause();
      else props.player.play();
      break;
  }
}
</script>

<style lang="scss">
.controls-layout {
  display: flex;
  gap: 3rem;

  user-select: none;
  border-radius: 0.5rem;
  .player-progress {
    display: flex;
    align-items: center;
    gap: 20px;
    .progress {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 30px;
      width: 30vw;
      flex: 1;
      position: relative;
      box-sizing: border-box;
      padding-right: 10px;
      &-out {
        width: 100%;
        height: 5px;
        background-color: var(--bg_progress);
        border-radius: 10px;
        cursor: pointer;
        transition: height 0.3s ease;
        &:hover {
          height: 15px;
        }
        overflow: hidden;
      }
      &-in {
        height: 100%;
        width: 0;
        border-top-right-radius: 10px;
        border-bottom-right-radius: 10px;
        pointer-events: none;
        background-color: var(--bg_progress_active);
      }
    }
    .time {
      font-size: 1.2rem;
      display: flex;
      padding: 0 1.2rem;
      box-sizing: border-box;
      color: var(--bg_progress_active);
      .time-tiem {
        width: 3rem;
      }
      .divide {
        margin: 0 10px 0 5px;
      }
    }
  }

  .controls {
    display: flex;
    justify-content: space-between;
    padding: 10px 5px;

    .play-controls {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      width: 200px;
      gap: 0.8rem;
      margin-left: 1rem;
      &-button {
        cursor: pointer;
      }
      &-icon {
        height: 2rem;
        width: 2rem;
        transition: all 0.3s ease;
        cursor: pointer;
        &-active {
          transform: scale(0.85);
        }
        &:active {
          transform: scale(0.85);
        }
        fill: var(--font_color);
      }
      .play-pause {
        height: 2.5rem;
        width: 2.5rem;
      }
    }
    .extension-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-right: 1rem;
    }
  }
  .controls-volume {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    padding: 8px 0 10px 0;
    box-sizing: border-box;
    &-icon {
      height: 2rem;
      width: 2rem;
      svg {
        transition: all 0.3s ease;
        cursor: pointer;
        &-active {
          transform: scale(0.85);
        }
        &:active {
          transform: scale(0.85);
        }
        fill: var(--font_color);
      }
    }
    .volume-progress {
      display: flex;
      justify-content: center;
      width: 6px;
      height: 40px;
      background-color: var(--bg_progress);
      border-radius: 8px;
      overflow: hidden;
      transition: width 0.3s ease;
      cursor: pointer;
      transform: rotate(-180deg);
    }
    &:hover .volume-progress {
      width: 10px;
    }
    .volume-progress-inner {
      width: 100%;
      border-bottom-left-radius: 10px;
      border-bottom-right-radius: 10px;
      background-color: var(--bg_progress_active);
    }
  }
}
</style>
