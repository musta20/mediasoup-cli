import { store } from "../bin/MediaSoupStore";

export const getConsumerById = (id: string): string[] => {
  return store.getConsumersByTransportId(id);
};

export const getConsumer = (): string[] => {
  return store.getConsumerIds();
};