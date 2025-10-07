import { store } from "../bin/MediaSoupStore";

export const getWebRtcServerByWorkerId = (id: number): string[] => {
  return store.getWebRtcServersByWorkerId(id);
};

export const getWebrtcServer = (): string[] => {
  return store.getWebRtcServerIds();
};