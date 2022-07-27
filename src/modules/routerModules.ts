
import { routers, workers } from "../bin/store";

export const getRouterByWorkerId = (id:number)=>{


    const workerIndex = workers.findIndex(
        (w) => w.worker.pid == id as number
      );
      
   

      if(workerIndex < 0) return [];
      

     return   workers[workerIndex]?.routers?.map((r) => {
          return r.id;
        })
      
  
}

export const getRouters =()=>{
  return  routers.map((r) => {
        return r.id;
      })
}



