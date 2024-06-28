<template>
  <div>
    <audio
      ref="player"
      :src="`https://kotokawa-akira-mywife.site/netDisk/downLoadForMusic?path=music/${musicName}.mp3`"
      controls
    />
    <Lyrics :lyrics :player />
  </div>
</template>
<script setup lang="ts">
import Lyrics from "./components/Lyrics.vue";
import { findLyric } from "./request/LyricRequest";
import { ref } from "vue";
import Lyric from "./type/Lyric";
const lyrics = ref<Lyric[]>();
const player = ref<HTMLAudioElement>();
const musicName = ref<string>("高橋李依 - 小さな恋のうた")

executeLyrics().then((res) => {
  lyrics.value = res;
});

async function executeLyrics() {
  const lyricBody = await findLyric(musicName.value);
  const lines = lyricBody.trim().split("\n");
  const executedLyric = lines.map((item) => {
    const line: Lyric = { words: "" };
    const splits = item.split("]");

    //分割翻譯歌詞
    if (splits[1].trim().length > 0) {
      const wordsSplit = splits[1].split(";");
      line.words = wordsSplit[0];
      if (wordsSplit[1]) line.translation = wordsSplit[1];
    }


    //處理時間
    const temp = splits[0].split("[");
    const timeSplit = temp[1].split(":");
    if(isNaN(Number(timeSplit[0])))
      return line; //處理開頭標籤
    const minutes = Number(timeSplit[0]);
    const time = minutes * 60 + Number(timeSplit[1]);
    line.time = Number(time.toFixed(2));

    return line;
  });

  return executedLyric;
}
</script>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
