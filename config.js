import Configstore from "configstore";
import pkg from "./package.json" assert { type: "json" };

export const GITHUB_API = "https://api.github.com";
export const storage = new Configstore(pkg.name, {});

