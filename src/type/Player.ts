import { ProgressBarOptions } from "electron";

type PlayMode = {
  type: number;
  label: string;
};
type PlayerProgress = {
  progress: number;
  options?: ProgressBarOptions;
};
export type { PlayMode, PlayerProgress };
