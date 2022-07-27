import { webRtcServers, workers } from "../bin/store";

export const getWebRtcServerByWorkerId = (id:number)=>{

    const workerIndex = workers.findIndex(
        (w) => w.worker.pid === id
      );
      
      if(workerIndex < 0) return [];
      

     return   workers[workerIndex]?.webRtcServer?.map((r) => {
          return r.id;
        })
      
  
}

export const getWebrtcServer =()=>{
  return  webRtcServers.map((r) => {
        return r.id;
      })
}