#! /usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import clear from "clear";
import figlet from "figlet";
import init from "./commands/init.js";
import readme from "./commands/readme.js";
import checkUpdate from "./lib/checkUpdate.js";

(async () => {
  await checkUpdate();
})();

// Clears the terminal
clear();

// Display app title
console.log(chalk.magentaBright(figlet.textSync("Gitor", {
  horizontalLayout: 'full'
})));

// Show welcome message
console.log("Welcome to the Github automate tool.");

program
  .command('init')
  .description('Auto initializing repos on Github')
  .action(init);

program
  .command('readme')
  .description("Generate nicely readme for profile")
  .action(readme);

program.parse(process.argv);

// Show help if no args is passed
if(!program.args.length) {
  program.help();
}


