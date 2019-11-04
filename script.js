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

const canvas = document.querySelector("#out");
const ctx = canvas.getContext("2d");

owp.combineLatest(
  owp.just(0.03), // CoC
  owp.merge(
    fromInput(document.querySelector("#aperture input.slider"))
      .pipeThrough(owp.map(v => myRound(Math.sqrt(2 ** (v/3)) * 10)/10)),
    fromChange(document.querySelector("#aperture input.field"))
      .pipeThrough(owp.map(v => myRound(Math.sqrt(2**(Math.round(Math.log2(v**2)*3)/3))*10)/10))
  )
    .pipeThrough(owp.distinct())
    .pipeThrough(owp.forEach(setValue(document.querySelector("#aperture input.slider"))))
    .pipeThrough(owp.forEach(setValue(document.querySelector("#aperture input.field")))),
  owp.merge(
    fromInput(document.querySelector("#focal input.slider")),
    fromChange(document.querySelector("#focal input.field"))
  )
    .pipeThrough(owp.map(v => Number(v)))
    .pipeThrough(owp.distinct())
    .pipeThrough(owp.forEach(setValue(document.querySelector("#focal input.slider"))))
    .pipeThrough(owp.forEach(setValue(document.querySelector("#focal input.field")))),
  owp.merge(
    fromInput(document.querySelector("#distance input.slider")),
    fromChange(document.querySelector("#distance input.field"))
  )
    .pipeThrough(owp.distinct())
    .pipeThrough(owp.forEach(setValue(document.querySelector("#distance input.slider"))))
    .pipeThrough(owp.forEach(setValue(document.querySelector("#distance input.field"))))
    .pipeThrough(owp.map(v => v * 1000))
)
  .pipeThrough(owp.map(([coc, aperture, focal, distance]) => ({coc, aperture, focal, distance})))
  .pipeThrough(owp.map(data => {
    const {aperture, focal, coc} = data;
    const hyperfocal = (focal**2 / (aperture * coc) + focal);
    return {...data, hyperfocal};
  }))
  .pipeThrough(owp.map(data => {
    const {distance, focal, hyperfocal} = data;
    const nearFocusPlane = distance * (hyperfocal - focal) / (hyperfocal + distance - 2*focal);
    const farFocusPlane = distance * (hyperfocal - focal) / (hyperfocal - focal);
    return {...data, farFocusPlane, nearFocusPlane};
  }))
  .pipeThrough(owp.map(data => {
    const {distance, nearFocusPlane, farFocusPlane } = data;
    const dofNear = distance - nearFocusPlane;
    const dofFar = farFocusPlane - distance;
    const totalDof = dofNear + dofFar;
    return {...data, dofNear, dofFar, totalDof};
  }))
  // .pipeThrough(owp.forEach(setTextContent(document.querySelector("#hyperfocal .output"), ({hyperfocal}) => hyperfocal.toFixed(1))))
  // .pipeThrough(owp.forEach(data => {
  //   ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  //   console.log(data);
  // }))
  .pipeThrough(owp.forEach(v => console.log(new Date().getTime(), v)))
  .pipeTo(owp.discard());

