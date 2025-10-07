import { store } from "../bin/MediaSoupStore";

export const getDataConsumerById = (id: string): string[] => {
  return store.getDataConsumersByTransportId(id);
};

export const getDataConsumer = (): string[] => {
  return store.getDataConsumerIds();
};