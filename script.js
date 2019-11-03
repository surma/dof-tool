import * as owp from "https://cdn.jsdelivr.net/npm/owp@0.1.2/dist/index.js";

function myRound(v) {
  if(v%1 >= .6) {
    return Math.ceil(v);
  }
  return Math.floor(v);
}

function textContentSink(el) {
  return new WritableStream({
    write(v) {
      el.textContent = v;
    }
  })
}

export function fromInput(el) {
  const { next, observable } = owp.external();
  el.addEventListener("input", () => next(el.value));
  next(el.value);
  return observable;
}

fromInput(document.querySelector("#aperture input"))
  .pipeThrough(owp.map(v => (myRound(Math.sqrt(2 ** (v/3)) * 10)/10).toFixed(1)))
  .pipeTo(textContentSink(document.querySelector("#aperture .output")))

fromInput(document.querySelector("#focal input"))
  .pipeTo(textContentSink(document.querySelector("#focal .output")))