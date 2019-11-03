import * as owp from "https://cdn.jsdelivr.net/npm/owp@0.1.2/dist/index.js";

function myRound(v) {
  if(v%1 >= .6) {
    return Math.ceil(v);
  }
  return Math.floor(v);
}

function setTextContent(el) {
  return v => {
    el.textContent = v;
  };
}

export function fromInput(el) {
  const { next, observable } = owp.external();
  el.addEventListener("input", () => next(el.value));
  next(el.value);
  return observable;
}

owp.combineLatest(
  fromInput(document.querySelector("#aperture input"))
    .pipeThrough(owp.map(v => (myRound(Math.sqrt(2 ** (v/3)) * 10)/10).toFixed(1)))
    .pipeThrough(owp.forEach(setTextContent(document.querySelector("#aperture .output")))),

  fromInput(document.querySelector("#focal input"))
    .pipeThrough(owp.forEach(setTextContent(document.querySelector("#focal .output"))))
)
  .pipeThrough(owp.map(([aperture, focal]) => (focal * focal / (aperture * 0.03) + focal)/1000))
  .pipeThrough(owp.forEach(setTextContent(document.querySelector("#hyperfocal .output"))))
  .pipeTo(owp.discard());