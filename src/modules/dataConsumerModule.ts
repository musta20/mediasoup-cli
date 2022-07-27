import {  dataConsumers, TransporObject } from "../bin/store";

export const getDataConsumerById = (id:string)=>{

    const transportIndex = TransporObject.findIndex(
        (w) => w.transport.id === id
      );
      
      if(transportIndex < 0) return [];
      

     return   TransporObject[transportIndex]?.dataConsumer?.map((r) => {
          return r.id;
        })
      
  
}

export const getDataConsumer =()=>{
  return  dataConsumers.map((r) => {
        return r.id;
      })
}