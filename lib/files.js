import fs from "fs";
import path from "path";

export default {
  getCurrentDirBase: () => {
    return path.basename(process.cwd());
  },

  dirExists: filePath => {
    return fs.existsSync(filePath);
  }
}
