import Table from "cli-table3"
import { TransportAll } from "./types";

export default (title: string,items: string[]) =>  {
  
    let table = new Table({
        head: [title],
      });

      items?.forEach((element: string) => {
        table.push([element as string]);
      });

      console.log("\n");

      console.log(table.toString());
    };

        
  
    export const multepleTable = (data:TransportAll) =>  {
  console.log(data)
      let table = new Table({
          head: ['consumers','producers'],
        });
  
        data.consumers?.forEach((element: string) => {
          table.push([element as string]);
        });
        data.producers?.forEach((element: string) => {
          table.push([element as string]);
        });
        console.log("\n");
  
        console.log(table.toString());
      };
  
          