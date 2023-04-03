import fsPromises from "fs/promises";

import chalk from "chalk";
import inquirer from "inquirer";
import axios from "axios";
import inquirerPrompt from "inquirer-autocomplete-prompt";
import fuzzy from "fuzzy";
import CLI from "clui";

import repo from "../lib/repo.js";
import github from "../lib/github.js";
import {GITHUB_API, storage} from "../config.js";

const Spinner = CLI.Spinner;

const countries = JSON.parse(await fsPromises.readFile("data/country-flag.json", "utf-8"));
const countriesName = countries.map(c => c.name);
function searchCountries(answers, input = '') {
  return new Promise((resolve) => {
    setTimeout(() => {
      const results = fuzzy.filter(input, countriesName).map((el) => el.original);

      results.splice(5, 0, new inquirer.Separator());
      results.push(new inquirer.Separator());
      resolve(results);
    }, Math.random() * 470 + 30);
  });
}

export default async function () {
  try {
    await github.authenticate();
    const token = storage.get('github_token');

    inquirer.registerPrompt('autocomplete', inquirerPrompt);
    let resUser;
    const questions = [
      {
        name: 'name',
        type: 'input',
        message: "Enter your github's username:",
        validate: async function(value) {
          if(!value.length) {
            return 'Please enter a valid username.';
          }
          let hasError = false;
          let status = new Spinner("Checking user...");
          status.start();
          await axios
            .get(`${GITHUB_API}/users/${value}`, {
              headers: {
                Authorization: 'Bearer ' + token
              }
            })
            .then(res => resUser = res)
            .catch(() => {
              console.log("User doesn't exist.");
              hasError = true;
            });

          status.stop();
          return !hasError;
        }
      },
      {
        name: 'tech',
        type: 'input',
        message: "🛠 What technologies are you studying:",
      },
      {
        name: 'email',
        type: 'input',
        message: "📧 Email:",
      },
      {
        name: 'job',
        type: 'input',
        message: "🎒 What is your job:",
      },
      {
        name: 'country',
        type: 'autocomplete',
        message: "🌎 Country:",
        source: searchCountries
      }
    ];

    const answer = await inquirer.prompt(questions, {});
    let status = new Spinner("Generating readme...");
    status.start();

    const repos = await repo.listRepos(answer.name);
    const languages = [];

    for(let i = 0; i < repos.length; i++) {
      if(!repos[i].languages_url) continue;
      const langData = await axios.get(repos[i].languages_url);

      if(langData.data !== {}) languages.push(...Object.keys(langData.data));
    }

    const langs = {};
    languages.forEach(l => langs[l] = (langs[l] || 0) + 1);

    const user = resUser.data;

    const { name, company, email, location } = user;

    // Creating badges from languages in all your repos
    const badges = JSON.parse(await fsPromises.readFile("data/badges.json", "utf-8"));
    const markdowns = Object.keys(langs)
      .map(l => badges.find(b => b.name === l) && `<img src="${badges.find(b => b.name === l).badge}" alt="${l}" />`);

    // Creating readme by replacing placeholders in template.md file
    const template = await fsPromises.readFile("data/template.md", "utf-8");
    let readme = template.replace(/{%LANGUAGE%}/g, markdowns.join(" "));
    readme = readme.replace(/{%USERNAME%}/g, answer.name);
    readme = readme.replace(/{%NAME%}/g, name);
    readme = readme.replace(/{%LOCATION%}/g, location + `, ${answer.country} ${countries.find(c => c.name === answer.country).flag}`);
    readme = readme.replace(/{%EMAIL%}/g, email || answer.email);
    readme = readme.replace(/{%COMPANY%}/g, company);
    readme = readme.replace(/{%LEARNING%}/g, answer.tech);
    readme = readme.replace(/{%JOB%}/g, answer.job);

    await fsPromises.writeFile("README.md", readme);
    status.stop();
    console.log(chalk.greenBright.bold("\n✓ Readme has been created successfully."));

  } catch (err) {
    switch (err.status) {
      case 403:
        console.log(chalk.redBright('Reached max access api.'));
        break;

      case 404:
        console.log(chalk.redBright('Repo doesn\'t exist.'));
        break;

      default:
        console.log(err);
        break;
    }
  }
}
