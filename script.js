import "./node_modules/web-streams-polyfill/dist/polyfill.es2018.mjs";
import * as owp from "./node_modules/owp/dist/index.js";
import ScrollSlider from "./scroll-slider.js";

customElements.define("scroll-slider", ScrollSlider);

function myRound(v) {
  if (v % 1 >= 0.6) {
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

function formatDistance(v) {
  if (v < 0) {
    return "∞";
  }
  return `${(v / 1000).toFixed(2)}m`;
}

function exposureValue(v) {
  return myRound(Math.sqrt(2 ** (Math.round(v) / 3)) * 10) / 10;
}

document.querySelector("#aperture scroll-slider").valueFunction = exposureValue;
document.querySelector("#aperture scroll-slider").labelFunction = v =>
  `f/${v.toFixed(1)}`;
document.querySelector("#aperture scroll-slider").numItems = 31;

document.querySelector("#focal scroll-slider").valueFunction = v =>
  7 + 192 ** (v / 9);
document.querySelector("#focal scroll-slider").labelFunction = v =>
  `${v.toFixed(0)}mm`;
document.querySelector("#focal scroll-slider").numItems = 10;
document.querySelector("#focal scroll-slider").style = "--spacing: 5em";

document.querySelector("#distance scroll-slider").valueFunction = v =>
  100 ** (v / 9);
document.querySelector("#distance scroll-slider").labelFunction = v =>
  `${v.toFixed(0)}m`;
document.querySelector("#distance scroll-slider").numItems = 10;
document.querySelector("#distance scroll-slider").style = "--spacing: 5em";

owp
  .combineLatest(
    owp.just(0.03), // CoC
    fromInput(document.querySelector("#aperture .slider"))
      .pipeThrough(owp.map(v => exposureValue(v)))
      .pipeThrough(owp.distinct()),
    fromInput(document.querySelector("#focal .slider"))
      .pipeThrough(owp.map(v => Number(v)))
      .pipeThrough(owp.distinct()),
    fromInput(document.querySelector("#distance .slider"))
      .pipeThrough(owp.distinct())
      .pipeThrough(owp.map(v => v * 1000))
  )
  .pipeThrough(
    owp.map(([coc, aperture, focal, distance]) => ({
      coc,
      aperture,
      focal,
      distance
    }))
  )
  .pipeThrough(
    owp.map(data => {
      const { aperture, focal, coc } = data;
      const hyperfocal = focal ** 2 / (aperture * coc) + focal;
      return { ...data, hyperfocal };
    })
  )
  .pipeThrough(
    owp.map(data => {
      const { distance, focal, hyperfocal } = data;
      const nearFocusPlane =
        (distance * (hyperfocal - focal)) / (hyperfocal + distance - 2 * focal);
      const farFocusPlane =
        (distance * (hyperfocal - focal)) / (hyperfocal - distance);
      return { ...data, farFocusPlane, nearFocusPlane };
    })
  )
  .pipeThrough(
    owp.map(data => {
      const { distance, nearFocusPlane, farFocusPlane } = data;
      const dofNear = distance - nearFocusPlane;
      const dofFar = farFocusPlane - distance;
      const totalDof = dofNear + dofFar;
      return { ...data, dofNear, dofFar, totalDof };
    })
  )
  .pipeThrough(
    owp.forEach(
      setTextContent(
        document.querySelector("#hyperfocal .output"),
        ({ hyperfocal }) => formatDistance(hyperfocal)
      )
    )
  )
  .pipeThrough(
    owp.forEach(
      setTextContent(
        document.querySelector("#output #totalDof tspan"),
        ({ totalDof }) => formatDistance(totalDof)
      )
    )
  )
  .pipeThrough(
    owp.forEach(
      setTextContent(
        document.querySelector("#output #nearFocusPlane tspan"),
        ({ nearFocusPlane }) => formatDistance(nearFocusPlane)
      )
    )
  )
  .pipeThrough(
    owp.forEach(
      setTextContent(
        document.querySelector("#output #farFocusPlane tspan"),
        ({ farFocusPlane }) => formatDistance(farFocusPlane)
      )
    )
  )
  .pipeThrough(
    owp.forEach(
      setTextContent(
        document.querySelector("#output #dofNear tspan"),
        ({ dofNear }) => formatDistance(dofNear)
      )
    )
  )
  .pipeThrough(
    owp.forEach(
      setTextContent(
        document.querySelector("#output #dofFar tspan"),
        ({ dofFar }) => formatDistance(dofFar)
      )
    )
  )
  .pipeThrough(
    owp.forEach(
      setTextContent(
        document.querySelector("#output #distance tspan"),
        ({ distance }) => formatDistance(distance)
      )
    )
  )
  // .pipeThrough(owp.forEach(v => console.log(new Date().getTime(), v)))
  .pipeTo(owp.discard());
