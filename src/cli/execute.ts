import chalk from "chalk";
import { PROTOCOL_VERSION, ServerInfo } from "../shared/protocol";
import { Client } from "./client";
import { helpText, Plan, UsageError, versionText } from "./commands";
import { dim, errorText } from "./format";
import { followEvents, runWatch } from "./watch";
import { runRepl } from "./repl";

export interface ExecuteEnv {
  client: Client;
  mode: "shell" | "argv";
  print?: (text: string) => void;
}

const defaultPrint = (text: string) => process.stdout.write(text + "\n");

export const formatError = (err: unknown): string => {
  if (err instanceof UsageError) {
    return chalk.yellow(err.message) + (err.usage ? `\n${dim(err.usage)}` : "");
  }
  return errorText(err instanceof Error ? err.message : String(err));
};

export const describeServer = (info: ServerInfo): string =>
  `app pid ${info.pid} · mediasoup ${info.mediasoupVersion ?? "?"} · mediasoup-cli ${info.version}`;

export const protocolWarning = (info: ServerInfo): string | undefined =>
  info.protocol === PROTOCOL_VERSION
    ? undefined
    : `the app runs mediasoup-cli ${info.version} (protocol ${info.protocol}) but this CLI speaks protocol ${PROTOCOL_VERSION}; run the CLI installed in your app (npx mediasoup-cli from its directory)`;

export const execute = async (planned: Plan, env: ExecuteEnv): Promise<void> => {
  const print = env.print ?? defaultPrint;
  const { client } = env;

  switch (planned.type) {
    case "noop":
    case "exit":
      return;

    case "help":
      print(helpText(planned.topic, env.mode));
      return;

    case "clear":
      console.clear();
      return;

    case "version": {
      let server: ServerInfo | undefined;
      if (client.connected) server = await client.request<ServerInfo>({ cmd: "hello" }).catch(() => undefined);
      if (planned.json) {
        print(JSON.stringify({ cli: versionText().split(" ")[1], server }, null, 2));
      } else {
        print(versionText() + (server ? dim(`  (connected to ${describeServer(server)})`) : ""));
      }
      return;
    }

    case "run": {
      const output = await planned.command.run({ client }, planned.args);
      print(planned.json ? JSON.stringify(output.data, null, 2) : output.text);
      if (output.failed) throw new Error("one or more workers could not be updated; see the results above");
      return;
    }

    case "repl":
      await runRepl(client);
      return;

    case "watch":
      await runWatch({
        client,
        title: planned.title,
        intervalMs: planned.intervalMs,
        json: planned.json,
        render: () => planned.command.run({ client }, planned.args),
      });
      return;

    case "follow-events":
      await followEvents({ client, json: planned.json, kind: planned.kind });
      return;
  }
};
