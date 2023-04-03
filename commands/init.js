import chalk from "chalk";
import inquirer from "inquirer";

import github from "../lib/github.js";
import repo from "../lib/repo.js";
import files from "../lib/files.js";

export default async function() {
  if(files.dirExists('.git')) {
    console.log(chalk.redBright.bold('Already a Git repo.'));
    process.exit();
  }

  try {
    const question = [{
      name: 'proceed',
      type: 'input',
      message: 'Proceed to push this project to a Github remote repo?',
      choices: ['Yes', 'No'],
      default: 'Yes'
    }];

    const answer = await inquirer.prompt(question, {});

    if(['Yes', 'yes', 'y'].includes(answer.proceed)) {
      // Proceed with GitHub authentication, creating the repo, etc.
      const octokit = await github.authenticate();

      const url = await repo.createRepo(octokit);

      console.log(chalk.green("Remote repo created. Choose files to ignore."));

      await repo.ignoreFiles();
      await repo.initialCommit(url);
    } else {
      //show exit message
      console.log(chalk.gray("Okay, bye."));
    }
  } catch (err) {
    switch (err.status) {
      case 401:
        console.log(chalk.redBright('Couldn\'t log you in. Please provide correct credentials/token.'));
        break;
      case 422:
        console.log(chalk.redBright('There is already a remote repository or token with the same name'));
        break;
      default:
        console.log(chalk.redBright(err));
    }
  }
}
