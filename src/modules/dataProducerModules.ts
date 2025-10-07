import {   dataProducers, TransporObject } from "../bin/store";

export const getDataProducerById = (id:string)=>{

    const transportIndex = TransporObject.findIndex(
        (w) => w.transport.id === id
      );
      
      if(transportIndex < 0) return [];
      

     return   TransporObject[transportIndex]?.dataProducer?.map((r) => {
          return r.id;
        })
      
  
}

export const getDataProducer =()=>{
  return  dataProducers.map((r) => {
        return r.id;
      })
}