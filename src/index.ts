#! /usr/bin/env node
import "reflect-metadata";
import startCmd from "./cli/cmd";
import { connectSdk, disconnectSdk } from "./utils/serverConnection";

// Graceful shutdown handler
const shutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  disconnectSdk();
  process.exit(0);
};

// Handle termination signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const main = async() => {
  try {
    connectSdk();
    await startCmd();
  } catch (error) {
    console.error("Fatal error:", error instanceof Error ? error.message : error);
    disconnectSdk();
    process.exit(1);
  }
};

main().catch(e=>{
  console.error("Unhandled error:", e);
  disconnectSdk();
  process.exit(1);
});
