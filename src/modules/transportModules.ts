import { routers, routersOvject, TransporObject, transports } from "../bin/store";

export const getTransportByRouterId= (id:string)=>{

    const routerIndex = routers.findIndex(
        (w) => w.id === id
      );
      
      if(routerIndex < 0) return [];
      

     return   routersOvject[routerIndex]?.transport?.map((r) => {
          return r.id;
        })
      
  
}

export const getTransport =()=>{
  return  transports.map((r) => {
        return r.id;
      })
}

export const getAllTransport = (id : string)=>{

  const transportObjectIndex = TransporObject.findIndex(t=>t.transport.id==id)
  
  const consumersOfTransport = TransporObject[transportObjectIndex]?.consumer ?.map(c=>{
    return c.id
  })

  const producersOfTransport = TransporObject[transportObjectIndex]?.producer?.map(p=>{
    return p.id
  })



  const dataproducersOfTransport = TransporObject[transportObjectIndex]?.dataProducer?.map(p=>{
    return p.id
  })


  const dataconsumersOfTransport = TransporObject[transportObjectIndex]?.dataConsumer?.map(p=>{
    return p.id
  })

  return {
    
      consumers:consumersOfTransport,
      producers:producersOfTransport,
      dataConsumer:dataconsumersOfTransport,
      dataProducer:dataproducersOfTransport
    
  }
}