import { store } from "../bin/MediaSoupStore";

export const getDataProducerById = (id: string): string[] => {
  return store.getDataProducersByTransportId(id);
};

export const getDataProducer = (): string[] => {
  return store.getDataProducerIds();
};