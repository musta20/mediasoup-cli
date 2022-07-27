interface Config {
    MEDIA_SOUP_CLI_PORT: number | undefined;
}
declare const getSanitzedConfig: () => Config;
export default getSanitzedConfig;
