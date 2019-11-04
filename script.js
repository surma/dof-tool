import * as owp from "https://cdn.jsdelivr.net/npm/owp@0.1.2/dist/index.js";

function myRound(v) {
  if(v%1 >= .6) {
    return Math.ceil(v);
  }
  return Math.floor(v);
}

function setTextContent(el, f = x => x) {
  return v => {
    el.textContent = f(v);
  };
}

function setValue(el, f = x => x) {
  return v => {
    el.value = f(v);
  };
}

export function fromInput(el) {
  const { next, observable } = owp.external();
  el.addEventListener("input", () => next(el.value));
  next(el.value);
  return observable;
}

export function fromChange(el) {
  const { next, observable } = owp.external();
  el.addEventListener("change", () => next(el.value));
  next(el.value);
  return observable;
}


owp.combineLatest(
  owp.merge(
    fromInput(document.querySelector("#aperture input.slider"))
      .pipeThrough(owp.map(v => myRound(Math.sqrt(2 ** (v/3)) * 10)/10)),
    fromChange(document.querySelector("#aperture input.field"))
      .pipeThrough(owp.map(v => myRound(Math.sqrt(2**(Math.round(Math.log2(v**2)*3)/3))*10)/10))
  )
    .pipeThrough(owp.forEach(setValue(document.querySelector("#aperture input.field")))),
  owp.merge(
    fromInput(document.querySelector("#focal input.slider")),
    fromChange(document.querySelector("#focal input.field"))
  )
    .pipeThrough(owp.map(v => Number(v)))
    .pipeThrough(owp.forEach(setValue(document.querySelector("#focal input.field")))),
  fromInput(document.querySelector("#distance input"))
    .pipeThrough(owp.forEach(setTextContent(document.querySelector("#distance .output"))))
    .pipeThrough(owp.map(v => v * 1000))

)
  .pipeThrough(owp.map(([aperture, focal, distance]) => ({aperture, focal, distance})))
  .pipeThrough(owp.map(data => {
    const {aperture, focal} = data;
    const hyperfocal = (focal * focal / (aperture * 0.03) + focal)/1000;
    return {...data, hyperfocal};
  }))
  .pipeThrough(owp.map(data => {
    const {distance, focal, aperture} = data;
    const dof = 2 * distance * distance * aperture * 0.03 / (focal * focal) / 1000;
    return {...data, dof};
  }))
  .pipeThrough(owp.forEach(setTextContent(document.querySelector("#hyperfocal .output"), ({hyperfocal}) => hyperfocal.toFixed(1))))
  // .pipeThrough(owp.forEach(setTextContent(document.querySelector("#aperture .output"), ({aperture}) => aperture.toFixed(1))))
  // .pipeThrough(owp.forEach(setTextContent(document.querySelector("#focal .output"), ({focal}) => focal.toFixed(0))))
  .pipeThrough(owp.forEach(setTextContent(document.querySelector("#dof .output"), ({dof}) => dof.toFixed(2))))
  .pipeTo(owp.discard());

