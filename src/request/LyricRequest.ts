async function findLyric(musicName:string){
    const rawLyric = await fetch(`https://kotokawa-akira-mywife.site/netDisk/downLoadForMusic?path=lyric/${musicName}.lrc`);
    const lyricBody = await rawLyric.text();
    return lyricBody;
}
export {findLyric};