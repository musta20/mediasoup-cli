import { store } from "../bin/MediaSoupStore";
import { TransportAll } from "../utils/types";

export const getTransportByRouterId = (id: string): string[] => {
  return store.getTransportsByRouterId(id);
};

export const getTransport = (): string[] => {
  return store.getTransportIds();
};

export const getAllTransport = (id: string): TransportAll => {
  return store.getAllTransportContent(id);
};