export declare const getTransportByRouterId: (id: string) => string[];
export declare const getTransport: () => string[];
export declare const getAllTransport: (id: string) => {
    consumers: string[];
    producers: string[];
    dataConsumer: string[];
    dataProducer: string[];
};
