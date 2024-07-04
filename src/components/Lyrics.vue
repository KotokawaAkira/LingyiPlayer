<template>
  <div>
    <div class="lyric-container">
      <div v-if="!props.lyrics">沒有歌詞</div>
      <div
        v-else
        :class="`lyrics ${index === i ? 'lyrics-active' : null}`"
        v-for="lyric,i in props.lyrics!"
        :data-time="lyric.time"
        @click="onLyricClicked(i)"
      >
        <div class="lyrics-words">
          {{ lyric.words }}
        </div>
        <div
          v-if="lyric.translation"
          :class="`lyrics-translation ${
            showTranslation === true ? null : 'hide'
          }`"
        >
          {{ lyric.translation }}
        </div>
      </div>
      <div class="lyrics-placeholder"></div>
    </div>
    <button
      v-if="props.lyrics?.some((item) => item.translation)"
      @click="changeShowTranslate"
      :class="`lyric-container-translate ${
        showTranslation === true ? 'lyric-container-translate-active' : null
      }`"
    >
      翻译
    </button>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import Lyric from "../type/Lyric";

const props = defineProps<{ lyrics?: Lyric[]; player?: HTMLAudioElement }>();
const index = ref<number>(0);
let lyricsDom: NodeListOf<HTMLDivElement>;
let lyricContainerDom: HTMLDivElement | null;
const showTranslation = ref(true);
let unLocked = true;

watch(() => props.player, setPlayer);
watch(() => props.lyrics, getLyricDom);
watch(index, indexChange);

function setPlayer() {
  if (props.player) {
    props.player.volume = 0.3;
    props.player.ontimeupdate = () => {
      if (props.lyrics && props.lyrics[index.value]) {
        props.lyrics.forEach((item, i) => {
          if (item.time === undefined) index.value = i;
          if (props.player!.currentTime > item.time! - 0.2) {
            index.value = i;
          }
        });
      }
    };
  }
}
function onLyricClicked(i: number) {
  index.value = i;
  if (props.player && props.lyrics) {
    props.player.currentTime = props.lyrics[i].time!;
    props.player.play();
  }
  //暂时解锁滚动
  unLocked = true;
}
function getLyricDom() {
  //初始化idnex
  index.value = 0;

  //获取歌词区域的dom
  nextTick(() => {
    lyricsDom = document.querySelectorAll(".lyrics");
    lyricContainerDom = document.querySelector(".lyric-container");
    //设置滚动锁定
    lyricContainerDom!.onmouseenter = () => (unLocked = false);
    lyricContainerDom!.onmouseleave = () => {
      unLocked = true;
      lyricScroll(index.value);
    };
    //初始化滚动(回到顶部)
    lyricContainerDom!.scrollTo(0, 0);
  });
}
function indexChange(val: number) {
  lyricScroll(val);
}
function lyricScroll(i: number) {
  //滚动歌词
  if (props.lyrics && props.lyrics[index.value] && lyricContainerDom) {
    if (lyricsDom[i].offsetTop > lyricContainerDom.clientHeight / 4.3 && unLocked)
      lyricContainerDom.scrollTo(
        0,
        lyricsDom[i].offsetTop - lyricContainerDom.clientHeight / 4.3
      );
    else if(unLocked) lyricContainerDom.scrollTo(0, 0);
  }
}
function changeShowTranslate() {
  showTranslation.value = !showTranslation.value;
}
</script>
<style lang="scss">
.lyric-container {
  position: relative;
  height: 600px;
  // width: 400px;
  overflow: scroll;
  scroll-behavior: smooth;
  &::-webkit-scrollbar {
    display: none;
  }
  .lyrics {
    margin: 15px 5px;
    color: #9ac8e2;
    transition: all 0.3s ease;
    cursor: pointer;
    transform-origin: 0 50%;
    transform: scale(0.85);
    font-size: 1.5rem;
    padding: 0 6px;
    border-radius: 6px;
    &:hover {
      background-color: rgba(220, 220, 220, 0.8);
    }
    &-active {
      color: #e3b4f4;
      transform: scale(1);
    }
    &-translation {
      font-size: 1rem;
    }
    &-placeholder {
      height: 72%;
      width: 100%;
    }
  }
  &-translate {
    &-active {
      color: #9ac8e2;
    }
  }
}
.hide {
  display: none;
}
</style>
