import * as owp from "https://cdn.jsdelivr.net/npm/owp@0.1.2/dist/index.js";

owp.fromEvent(document.querySelector("#aperture input"), "input")
  .pipeThrough(owp.map()