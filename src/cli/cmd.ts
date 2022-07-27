import chalk from "chalk";
import mainResolver from "./CliResolvers/mainResolver";
import readline from "readline";

let userInput: string | unknown;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


const typeCmd = () =>
  new Promise((resolve) => {
    rl.question(chalk.yellow("mediaSoup-Cli: "), resolve);
  });

const startCmd = async () => {
  while (userInput !== "exit") {
    userInput = await typeCmd();

  await  mainResolver(userInput);
  }

  rl.close();
};

export default startCmd;
