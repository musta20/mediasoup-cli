#!/usr/bin/env node
import { main } from "./cli/app";

// `mediasoup-cli … | head` closes the pipe early: that is not an error.
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") process.exit(0);
  throw err;
});

// Exit through process.exit so "exit" handlers restore the terminal.
process.on("SIGTERM", () => process.exit(143));
process.on("SIGHUP", () => process.exit(129));

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
    // Let pending stdout writes (e.g. `| jq`) flush, but never hang.
    setTimeout(() => process.exit(code), 1000).unref();
  },
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
