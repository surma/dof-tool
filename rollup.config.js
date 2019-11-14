import nodeResolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import { promises as fsp } from "fs";
import { join } from "path";

const dir = ".public";
export default {
  input: "src/script.js",
  output: {
    format: "iife",
    dir
  },
  plugins: [
    nodeResolve(),
    terser(),
    {
      async writeBundle() {
        await fsp.copyFile("src/index.html", join(dir, "index.html"));
      }
    }
  ]
};
