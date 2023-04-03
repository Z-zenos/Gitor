import inquirer from "inquirer";
import glob from "glob";
import axios from "axios";
import { simpleGit } from "simple-git";
import CLI from "clui";
import chalk from "chalk";
import fs from "fs";

import files from "./files.js";
import github from "./github.js";
import {GITHUB_API, storage} from "../config.js";

const Spinner = CLI.Spinner;

export default {
  createRepo: async octokit => {
    const questions = [
      {
        name: 'name',
        type: 'input',
        message: 'Enter new repo name:',
        default: files.getCurrentDirBase(), //set default to basename
        validate: function(value) {
          if(value.length) {
            return true;
          } else {
            return 'Please enter a valid name for repo.';
          }
        }
      },
      {
        name: 'description',
        type: 'input',
        message: 'Enter new repo description (optional):',
        default: null
      },
      {
        name: 'visibility',
        type: 'list',
        message: 'Set repo to public or private?',
        choices: ['public', 'private'],
        default: 'public'
      }
    ];

    // Prompt the questions
    const answers = await inquirer.prompt(questions, {});

    // Create the data argument object from user's answers
    const data = {
      name: answers.name,
      description: answers.description,
      private: answers.visibility === 'private'
    };

    let status = new Spinner("Initializing new remote repo...");
    status.start();

    try {
      // Create the remote repo and return the clone_url
      const response = await octokit.repos.createForAuthenticatedUser(data);
      return response.data.clone_url;
    } catch (err) {
      throw err;
    } finally {
      status.stop();
    }
  },

  ignoreFiles: async () => {
    // Get array of files in the project, ignore node_modules folder by default
    const files = glob.sync("**/*", {
      ignore: '**/node_modules/**'
    });

    // Add any node_modules to gitignore by default
    const filesToIgnore = glob.sync('{*/node_modules/,node_modules/}');
    if(filesToIgnore.length) {
      fs.writeFileSync('.gitignore', filesToIgnore.join('\n') + '\n');
    } else {
      // If no files are chosen to be ignored, create an empty .gitignore file
      fs.closeSync(fs.openSync('.gitignore', 'w'));
    }

    // Creat question and pass files as the choices
    const question = [{
      name: 'ignore',
      type: 'checkbox',
      message: 'Select the file and/or folders you wish to ignore:',
      choices: files,
      // default: ['node_modules']
    }];

    // Prompt question
    const answer = await inquirer.prompt(question, {});

    // If user selects some files/folders, write them into .gitignore
    if(answer.ignore.length) {
      fs.appendFileSync('.gitignore', answer.ignore.join('\n'));
    }
  },

  initialCommit: async url => {
    let status = new Spinner("Committing files to Github at " + chalk.yellow.underline(url));
    status.start();

    const git = simpleGit();

    try {
      const commit = await git
        .init()
        .add('.gitignore')
        .add('./*')
        .commit('Initial commit')
        .checkoutLocalBranch('main')
        .addRemote('origin', url, () => {
          status.stop();
        })
        .push(url, 'main', ['--set-upstream']);

      // If initialCommit returns true, show success message
      if(commit) {
        console.log(chalk.greenBright.bold("✓ Your project has been successfully committed to GitHub."));
      }
    } catch (err) {
      throw err;
    } finally {
      status.stop();
    }
  },

  listRepos: async (username) => {
    let repos = [];
    try {
      const token = storage.get('github_token');
      if(!token) {
        await github.authenticate();
      }

      const resRepo = await axios.get(`${GITHUB_API}/users/${username}/repos`, {
        headers: {
          Authorization: 'Bearer ' + token
        }
      });
      repos = resRepo.data;
    } catch (err) {
      throw err;
    }

    return repos;
  }
}
