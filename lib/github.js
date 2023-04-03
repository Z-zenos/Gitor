import inquirer from "inquirer";
import {Octokit} from "@octokit/rest";
import CLI from "clui";

import {storage} from "../config.js";

const Spinner = CLI.Spinner;

export default {
  authenticate: async () => {
    // 1. Try getting a stored token
    let token = storage.get('github_token');
    let status = new Spinner("Authenticating...");
    status.start();

    // 2. If it exists, authenticate with it
    if(token) {
      console.log("Token is found in storage. Skipping prompt.");
      try {
        return new Octokit({
          auth: token,
        });
      } catch (err) {
        throw err;
      } finally {
        status.stop();
      }

    } else {
      // 3. Create question
      const question = [{
        name: 'token',
        type: 'password',
        message: 'Enter your GitHub personal access token:',
        validate: function(value) {
          if(value.length === 40) {
            return true;
          } else return 'Please enter a valid token';
        }
      }];

      // 4. Prompt question
      const answer = await inquirer.prompt(question, {});

      // 5. Authenticating with user's answer
      try {
        const octokit = new Octokit({
          auth: answer.token
        });

        // 6. Store the token for next time
        storage.set('github_token', answer.token);

        return octokit;
      } catch (err) {
        console.log(err);
      } finally {
        status.stop();
      }
    }
  }
}
