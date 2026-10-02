import chalk from "chalk";
import { ENV, packageVersion, parsePort, readConfigFile } from "../shared/config";
import { DEFAULT_HOST, DEFAULT_PORT, ServerInfo } from "../shared/protocol";
import { parseArgs, ParsedArgs } from "./args";
import { Client, Target } from "./client";
import { helpText, plan, Plan, versionText } from "./commands";
import { execute, formatError, protocolWarning } from "./execute";
import { warnText } from "./format";
import { startShell } from "./shell";

const stringFlag = (args: ParsedArgs, name: string): string | undefined => {
  const value = args.flags[name];
  return typeof value === "string" && value !== "" ? value : undefined;
};

/** Flags > environment > config.env written by the observer > defaults. */
export const resolveTarget = (args: ParsedArgs, env = process.env): Target => {
  const file = readConfigFile();
  const host = stringFlag(args, "host") ?? env[ENV.HOST] ?? file[ENV.HOST] ?? DEFAULT_HOST;
  const rawPort = stringFlag(args, "port") ?? env[ENV.PORT] ?? file[ENV.PORT] ?? String(DEFAULT_PORT);
  const port = parsePort(rawPort);
  if (!port) throw new Error(`invalid port "${rawPort}"`);
  const token = stringFlag(args, "token") ?? env[ENV.TOKEN] ?? undefined;
  return { host, port, token };
};

/** Runs the CLI and returns the process exit code. */
export const main = async (argv: string[]): Promise<number> => {
  const args = parseArgs(argv);
  if (args.flags.noColor === true || process.env.NO_COLOR) chalk.level = 0;

  let planned: Plan;
  let target: Target;
  try {
    planned = plan(argv);
    target = resolveTarget(args);
  } catch (err) {
    process.stderr.write(formatError(err) + "\n");
    return 2;
  }

  // Things that do not need the app.
  if (planned.type === "help") {
    process.stdout.write(helpText(planned.topic, "argv") + "\n");
    return 0;
  }
  if (planned.type === "version") {
    process.stdout.write((planned.json ? JSON.stringify({ cli: packageVersion() }) : versionText()) + "\n");
    return 0;
  }

  const client = new Client(target);

  if (planned.type === "noop") {
    await startShell(client);
    return 0;
  }

  try {
    await client.waitForConnection(3000);
    const warning = protocolWarning(await client.request<ServerInfo>({ cmd: "hello" }, 3000));
    if (warning) process.stderr.write(warnText(warning) + "\n");

    await execute(planned, { client, mode: "argv" });
    return 0;
  } catch (err) {
    process.stderr.write(formatError(err) + "\n");
    return 1;
  } finally {
    client.close();
  }
};
