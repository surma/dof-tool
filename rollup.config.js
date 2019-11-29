import nodeResolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import { promises as fsp } from "fs";
import { minify } from "html-minifier";

const minifierConfig = {
  collapseWhitespace: true,
  html5: true,
  minifyCSS: true,
  minifyJS: true,
  removeOptionalTags: true,
  removeRedundantAttributes: true
};

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
        const html = await fsp.readFile("src/index.html", "utf8");
        await fsp.writeFile(".public/index.html", minify(html, minifierConfig));
      }
    }
  ]
};
