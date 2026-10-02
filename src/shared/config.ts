import fs from "fs";
import os from "os";
import path from "path";

/** Root of the installed package (dist/shared -> package root). */
export const packageRoot = path.resolve(__dirname, "..", "..");

/**
 * The observer writes the port it listens on into this file so that
 * `npx mediasoup-cli`, run from the same project, finds it without flags.
 */
const configFile = path.join(packageRoot, "config.env");

export const ENV = {
  PORT: "MEDIA_SOUP_CLI_PORT",
  HOST: "MEDIA_SOUP_CLI_HOST",
  TOKEN: "MEDIA_SOUP_CLI_TOKEN",
} as const;

export const readConfigFile = (): Record<string, string> => {
  try {
    const values: Record<string, string> = {};
    for (const line of fs.readFileSync(configFile, "utf-8").split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (match) values[match[1]] = match[2];
    }
    return values;
  } catch {
    return {};
  }
};

/** Best effort: never throws, returns whether the file was written. */
export const writeConfigFile = (updates: Record<string, string>): boolean => {
  try {
    const values = { ...readConfigFile(), ...updates };
    const content = Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join(os.EOL);
    fs.writeFileSync(configFile, content + os.EOL);
    return true;
  } catch {
    return false;
  }
};

export const parsePort = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const port = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isInteger(port) && port >= 0 && port <= 65535 ? port : undefined;
};

let cachedVersion: string | undefined;

export const packageVersion = (): string => {
  if (cachedVersion) return cachedVersion;
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, "package.json"), "utf-8")
    );
    cachedVersion = String(pkg.version);
  } catch {
    cachedVersion = "unknown";
  }
  return cachedVersion;
};
