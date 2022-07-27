import dotenv from "dotenv";
import path from "path";
dotenv.config({path:path.join(path.resolve(__dirname, ".."), "config.env")});
interface ENV {

  MEDIA_SOUP_CLI_PORT: number | undefined;

}
//MEDIA_SOUP_CLI_PORT=5462
interface Config {
  MEDIA_SOUP_CLI_PORT: number | undefined;
}

// Loading process.env as ENV interface

const getConfig = (): ENV => {
  console.log( process.env.MEDIA_SOUP_CLI_PORT)
  return {
    MEDIA_SOUP_CLI_PORT: process.env.MEDIA_SOUP_CLI_PORT ? Number(process.env.MEDIA_SOUP_CLI_PORT) : undefined,
   
  };
};

// Throwing an Error if any field was undefined we don't
// want our app to run if it can't connect to DB and ensure
// that these fields are accessible. If all is good return
// it as Config which just removes the undefined from our type
// definition.

const getSanitzedConfig = (): Config => {
  const config = getConfig();

  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      throw new Error(`Missing key ${key} in config.env`);
    }
  }
  return config as Config;
};


//const sanitizedConfig = getSanitzedConfig(config);

export default getSanitzedConfig;
