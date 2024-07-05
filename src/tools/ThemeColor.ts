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
export default colorfulImg;
