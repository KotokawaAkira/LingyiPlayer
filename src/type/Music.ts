type MusicBuffer = {
  buffer: Buffer;
  originPath: string;
};
type MusicFileInfo = {
  type: string;
  name: string;
  originPath:string;
  active?:boolean;
  time?:number;
};
export type { MusicBuffer,MusicFileInfo };
