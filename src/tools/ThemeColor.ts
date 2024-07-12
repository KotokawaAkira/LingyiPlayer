import { kmeans } from "ml-kmeans";

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
  // const pixels = data;
  // const pixelArray: number[][] = [];

  // // 将像素数据转换为RGB数组
  // for (let i = 0; i < pixels.length; i += 4) {
  //   const r = pixels[i];
  //   const g = pixels[i + 1];
  //   const b = pixels[i + 2];
  //   // 只保留不透明的像素
  //   if (pixels[i + 3] > 0) {
  //     pixelArray.push([r, g, b]);
  //   }
  // }

  // // 使用 k-means 聚类算法提取三种主要颜色
  // const numberOfClusters = 3;
  // const result = kmeans(pixelArray, numberOfClusters, {
  //   maxIterations: 10,
  //   tolerance: 1e-6,
  // });

  // for(let i=result.centroids.length-1;i>=0;i--){
  //   colorList.push(result.centroids[i]);
  // }
  // return colorList;
}
function get3Colors(img: HTMLImageElement) {
  let canvas = document.createElement("canvas"),
    context = canvas.getContext && canvas.getContext("2d"),
    height,
    width,
    data;

  const colorList = [[0, 0, 0]];
  height = canvas.height = img.height;
  width = canvas.width = img.width;
  if (!context) return colorList;
  context.drawImage(img, 0, 0);
  data = context.getImageData(0, 0, width, height).data;

  const pixels = data;
  const pixelArray: number[][] = [];

  // 将像素数据转换为RGB数组
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // 只保留不透明的像素
    if (pixels[i + 3] > 0) {
      pixelArray.push([r, g, b]);
    }
  }
  // 使用 k-means 聚类算法提取三种主要颜色
  const numberOfClusters = 3;
  const result = kmeans(pixelArray, numberOfClusters, {
    maxIterations: 10,
    tolerance: 1e-6,
  });
  for (let i = result.centroids.length - 1; i >= 0; i--) {
    colorList[i] = result.centroids[i];
  }
  return colorList;
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function colorReverse(oldColor: any) {
  oldColor = "0x" + oldColor.replace(/#/g, "");
  let str = "000000" + (0xffffff - oldColor).toString(16);
  return "#" + str.substring(str.length - 6, str.length);
}
function colorComplement(r: number, g: number, b: number) {
  return `rgb(${255 - r},${255 - g},${255 - b})`;
}
export { colorfulImg, rgbToHex, colorReverse, colorComplement, get3Colors };
