function colorfulImg(img: HTMLImageElement) {
  let canvas = document.createElement("canvas"),
    context = canvas.getContext && canvas.getContext("2d"),
    height,
    width,
    length,
    data,
    i = -4,
    blockSize = 5,
    count = 0,
    rgb = { r: 0, g: 0, b: 0 };

  height = canvas.height = img.height;
  width = canvas.width = img.width;
  if (!context) return rgb;
  context.drawImage(img, 0, 0);
  data = context.getImageData(0, 0, width, height).data;
  length = data.length;
  while ((i += blockSize * 4) < length) {
    ++count;
    rgb.r += data[i];
    rgb.g += data[i + 1];
    rgb.b += data[i + 2];
  }
  rgb.r = ~~(rgb.r / count);
  rgb.g = ~~(rgb.g / count);
  rgb.b = ~~(rgb.b / count);
  return rgb;
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function colorReverse(oldColor:any){
  oldColor = '0x' + oldColor.replace(/#/g, '');
  let str = '000000' + (0xFFFFFF - oldColor).toString(16);
  return '#'+ str.substring(str.length - 6, str.length);
}
function colorComplement(r: number, g: number, b: number){
  return `rgb(${255-r+10},${255-g+10},${255-b-10})`
}
export { colorfulImg,rgbToHex,colorReverse,colorComplement };
