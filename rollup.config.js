/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
