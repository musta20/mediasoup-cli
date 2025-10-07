import { store } from "../bin/MediaSoupStore";

export const getRouterByWorkerId = (id: number): string[] => {
  return store.getRoutersByWorkerId(id);
};

export const getRouters = (): string[] => {
  return store.getRouterIds();
};



