import { store } from "../bin/MediaSoupStore";

export const getProducerById = (id: string): string[] => {
  return store.getProducersByTransportId(id);
};

export const getProducer = (): string[] => {
  return store.getProducerIds();
};