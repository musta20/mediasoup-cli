import { consumers, TransporObject } from "../bin/store";

export const getConsumerById = (id:string)=>{

    const transportIndex = TransporObject.findIndex(
        (w) => w.transport.id === id
      );
      
      if(transportIndex < 0) return [];
      

     return   TransporObject[transportIndex]?.consumer?.map((r) => {
          return r.id;
        })
      
  
}

export const getConsumer =()=>{
  return  consumers.map((r) => {
        return r.id;
      })
}