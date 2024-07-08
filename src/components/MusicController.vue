<template>
  <div class="controls-layout">
    <div class="player-progress">
      <div class="time">
        <div ref="current_time" class="current-time">
          {{ musicCurrentTime }}
        </div>
        <div class="divide">/</div>
        <div ref="total_time" class="total-time">
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
        <div class="play-controls-button" @click="preMusic(props.now)">
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
        <div class="play-controls-button" @click="playClick">
          <svg
            :class="['play-pause', 'play-controls-icon']"
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
        <div class="play-controls-button" @click="nextMusic(props.now)">
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
      <div class="controls-volume">
        <div style="height: 2rem" @click="mute">
          <svg
            class="play-controls-icon"
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
          <svg
            v-else
            class="play-controls-icon"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.45,4.11a1,1,0,0,0-1,.09L10.67,10H3a1,1,0,0,0-1,1V21a1,1,0,0,0,1,1h7.67l7.73,5.8A1,1,0,0,0,20,27V5A1,1,0,0,0,19.45,4.11Z"
            />
            <path
              d="M23,12a1,1,0,0,0-1,1v6a1,1,0,0,0,2,0V13A1,1,0,0,0,23,12Z"
            />
            <path
              d="M26,10a1,1,0,0,0-1,1V21a1,1,0,0,0,2,0V11A1,1,0,0,0,26,10Z"
            />
            <path d="M29,8a1,1,0,0,0-1,1V23a1,1,0,0,0,2,0V9A1,1,0,0,0,29,8Z" />
          </svg>
        </div>
        <div
          ref="volume_progress_out"
          class="volume-progress"
          @click="volumeClick"
          @mousedown="volumeDown"
        >
          <div ref="volume_progress" class="volume-progress-inner"></div>
        </div>
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
}>();
import { ref, watch } from "vue";
import { formatSeconds } from "../tools/TimeTransform";
import { MusicFileInfo } from "../type/Music";
const current_time = ref<HTMLDivElement>();
const time_progress = ref<HTMLDivElement>();
const progress_out = ref<HTMLDivElement>();
const progress = ref<HTMLDivElement>();
const volume_progress_out = ref<HTMLDivElement>();
const volume_progress = ref<HTMLDivElement>();
const musicCurrentTime = ref<string>("0:00");
const isPlaying = ref(false);
const volume = ref(0);

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

//静音事件
function mute() {
  if (!props.player) return;
  if (props.player.volume === 0) props.player.volume = 0.3;
  else {
    props.player.volume = 0.0;
  }
  // volumeChange();
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
  // if (!props.player) return;
  // musicCurrentTime.value = formatSeconds(props.player.currentTime);
  // timeUpdate();
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
  if (now === 0)
    props.changeMusic(
      props.musicList[props.musicList.length - 1],
      props.musicList.length - 1
    );
  else props.changeMusic(props.musicList[now - 1], now - 1);
}
//下一首
function nextMusic(now: number) {
  if (!props.musicList) return;
  if (now === props.musicList.length - 1)
    props.changeMusic(props.musicList[0], 0);
  else props.changeMusic(props.musicList[now + 1], now + 1);
}
/**音量进度条**/
//点击音量轴
function volumeClick(e: MouseEvent) {
  if (!props.player || !volume_progress_out.value || !volume_progress.value)
    return;
  const percent =
    (e.clientX - volume_progress_out.value.offsetLeft) /
    volume_progress_out.value.offsetWidth;
  props.player.volume = percent;
  // volumeChange();
}
//音量轴鼠标移动
function volumeMove(e: MouseEvent) {
  if (!props.player || !volume_progress_out.value || !volume_progress.value)
    return;
  let percent =
    (e.clientX - volume_progress_out.value.offsetLeft) /
    volume_progress_out.value.offsetWidth;
  if (percent < 0) percent = 0;
  if (percent > 1) percent = 1;
  props.player.volume = percent;
  // volumeChange();
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
//音量改变事件
function volumeChange() {
  if (!props.player || !volume_progress.value || !volume_progress_out.value)
    return;
  volume_progress.value.style.width = props.player.volume * 100 + "%";
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
</script>

<style lang="scss">
.controls-layout {
  display: flex;
  flex-direction: column;
  width: 70vh;
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
      }
      &-in {
        height: 100%;
        width: 0;
        pointer-events: none;
        background-color: var(--bg_progress_active);
        border-radius: 10px;
      }
    }
    .time {
      font-size: 1.2rem;
      display: flex;
      padding: 0 15px 0 15px;
      box-sizing: border-box;
      .divide {
        margin: 0 5px 0 5px;
      }
    }
  }

  .controls {
    display: flex;
    justify-content: space-between;
    padding: 10px;

    .play-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 200px;
      gap: 1.5rem;
      &-button {
        cursor: pointer;
      }
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
      .play-pause {
        height: 2.5rem;
        width: 2.5rem;
      }
    }
    .controls-volume {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      .volume-progress {
        width: 100px;
        height: 6px;
        background-color: var(--bg_progress);
        border-radius: 8px;
        overflow: hidden;
        transition: height 0.3s ease;
        cursor: pointer;
        margin-right: 10px;
      }
      &:hover .volume-progress {
        height: 10px;
      }
      .volume-progress-inner {
        height: 100%;
        background-color: var(--bg_progress_active);
      }
    }
  }
}
</style>
