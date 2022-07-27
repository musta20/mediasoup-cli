export const cmdParser = (cmd:string) : string[] => {
    let replacedCmd = cmd.replace(/[^A-Za-z0-9-]+/g, " ");
    return replacedCmd.trim().split(" ");
}

export const cmdParserArgs = (cmd:string) : string => {
    return cmd.substring(cmd.indexOf("="));

}