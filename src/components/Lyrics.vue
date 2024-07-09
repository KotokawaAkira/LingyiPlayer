<template>
  <div class="lyrics-body">
    <div class="lyric-container">
      <div v-if="props.lyrics" class="lyrics-placeholder-top"></div>
      <div
        v-if="props.lyrics"
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
      <div v-if="props.lyrics" class="lyrics-placeholder-btm"></div>
      <div v-else class="no-lyrics">没有歌词 / No lyrics</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import Lyric from "../type/Lyric";

const props = defineProps<{
  lyrics?: Lyric[];
  player?: HTMLAudioElement;
  showTranslation: boolean;
}>();
const index = ref<number>(0);
let lyricsDom: NodeListOf<HTMLDivElement>;
let lyricContainerDom: HTMLDivElement | null;
let unLocked = true;

watch(() => props.player, setPlayer);
watch(() => props.lyrics, getLyricDom);
watch(index, indexChange);

function setPlayer() {
  if (props.player) {
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
    if (
      lyricsDom[i].offsetTop > lyricContainerDom.clientHeight / 4.3 &&
      unLocked
    )
      lyricContainerDom.scrollTo({
        left: 0,
        top: lyricsDom[i].offsetTop - lyricContainerDom.clientHeight / 4.3,
        behavior: "smooth",
      });
    else if (unLocked)
      lyricContainerDom.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }
}
</script>
<style lang="scss">
.lyrics-body {
  height: calc(70vh + 4rem);
  .lyric-container {
    margin: 0 auto;
    position: relative;
    height: 70vh;
    width: 100%;
    overflow: scroll;
    -webkit-mask-image: linear-gradient(
      180deg,
      hsla(0, 0%, 100%, 0),
      hsla(0, 0%, 100%, 0.6) 15%,
      #fff 25%,
      #fff 75%,
      hsla(0, 0%, 100%, 0.6) 85%,
      hsla(0, 0%, 100%, 0)
    );
    &::-webkit-scrollbar {
      display: none;
    }
    .no-lyrics {
      font-size: 2rem;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .lyrics {
      margin: 15px 5px;
      color: var(--lyrics_color);
      transition: all 0.3s ease;
      cursor: pointer;
      transform-origin: 0 50%;
      transform: scale(0.85);
      font-size: 1.5rem;
      padding: 0 6px;
      border-radius: 6px;
      &:hover {
        background-color: var(--bg_lyrics_hover);
      }
      &-active {
        color: var(--lyrics_color_active);
        transform: scale(1);
      }
      &-translation {
        font-size: 1rem;
      }
      &-placeholder {
        width: 100%;
        &-top {
          height: 15%;
        }
        &-btm {
          height: 72%;
        }
      }
    }
    &-translate {
      margin-top: 1rem;
      height: 3rem;
      &-active {
        color: var(--color_tjx);
      }
    }
  }
  .hide {
    display: none;
  }
}
</style>
