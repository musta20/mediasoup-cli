import {  producers, TransporObject } from "../bin/store";

export const getProducerById = (id:string)=>{

    const transportIndex = TransporObject.findIndex(
        (w) => w.transport.id === id
      );
      
      if(transportIndex < 0) return [];
      

     return   TransporObject[transportIndex]?.producer?.map((r) => {
          return r.id;
        })
      
  
}

export const getProducer =()=>{
  return  producers.map((r) => {
        return r.id;
      })
}