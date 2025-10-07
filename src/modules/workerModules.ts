import { store } from "../bin/MediaSoupStore";

export const getWorkers = (): number[] => {
  return store.getWorkerIds();
};
