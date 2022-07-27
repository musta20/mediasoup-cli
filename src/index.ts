#! /usr/bin/env node
import "reflect-metadata";
import startCmd from "./cli/cmd";
import { connectSdk } from "./utils/serverConnection";

const main = async() => {
  
  connectSdk();

  startCmd();

};

main().catch(e=>{
  console.log(e)
});
