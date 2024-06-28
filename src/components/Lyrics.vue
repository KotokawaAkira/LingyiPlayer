<template>
  <div>
    <div class="lyric-container">
      <div v-if="!props.lyrics">沒有歌詞</div>
      <div
        v-else
        :class="`lyrics ${index === i + 1 ? 'lyrics-active' : null}`"
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
const zeroHeightDomCount = ref(0);
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
        if (props.lyrics[index.value].time === undefined) index.value += 1;
        if (props.player!.currentTime > props.lyrics[index.value].time!) {
          index.value += 1;
        }
      }
    };
  }
}
function onLyricClicked(i: number) {
  index.value = i + 1;
  if (props.player && props.lyrics) {
    props.player.currentTime = props.lyrics[i].time!;
    props.player.play();
  }
  //暂时解锁滚动
  unLocked = true;
}
function getLyricDom() {
  //获取歌词区域的dom
  nextTick(() => {
    lyricsDom = document.querySelectorAll(".lyrics");
    lyricsDom.forEach((item) => {
      if (item.clientHeight === 0) zeroHeightDomCount.value += 1;
    });
    lyricContainerDom = document.querySelector(".lyric-container");
    //设置滚动锁定
    lyricContainerDom!.onmouseenter = () => (unLocked = false);
    lyricContainerDom!.onmouseleave = () => {
      unLocked = true;
      lyricScroll(index.value);
    };
  });
}
function indexChange(val: number) {
  lyricScroll(val);
}
function lyricScroll(i: number) {
  //滚动歌词
  if (props.lyrics && props.lyrics[index.value] && lyricContainerDom) {
    if (
      lyricsDom[i].offsetTop > lyricContainerDom.clientHeight / 3.2 &&
      unLocked
    )
      lyricContainerDom.scrollTo(
        0,
        lyricsDom[i].offsetTop - lyricContainerDom.clientHeight / 3.2
      );
  }
}
function changeShowTranslate(){
  showTranslation.value = !showTranslation.value;
}
</script>
<style lang="scss">
.lyric-container {
  position: relative;
  height: 600px;
  width: 400px;
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
    &-active {
      color: #e3b4f4;
      transform: scale(1.2);
    }
    &-translation {
      font-size: 12px;
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
