//时间转换
const time_to_sec = function (time:string) {
    if(time===undefined) return ;
    let s = 0;

    //let hour = time.split(':')[0];
    const min = time.split(':')[0];
    const sec = time.split(':')[1];

    s = /*Number(hour * 3600)*/ +Number(min) * 60 + Number.parseFloat(sec);

    return s;
};
function formatSeconds(value:number) {
    let result = "";
    //let h = Math.floor(result / 3600) < 10 ? '0' + Math.floor(result / 3600) : Math.floor(result / 3600)
    let m = Math.floor((value / 60 % 60)) < 10 ? /*'0'*/ + Math.floor((value / 60 % 60)) : Math.floor((value / 60 % 60))
    let s = Math.floor((value % 60)) < 10 ? '0' + Math.floor((value % 60)) : Math.floor((value % 60))
    result = `${m}:${s}`
    return result
}
export {time_to_sec,formatSeconds};