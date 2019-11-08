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

function apertureValue(v) {
  return myRound(Math.sqrt(2 ** (Math.round(v) / 3)) * 10) / 10;
}

const aperture = document.querySelector("#aperture scroll-slider");
aperture.valueFunction = apertureValue;
aperture.labelFunction = v => `f/${v.toFixed(1)}`;
aperture.numItems = 31;
aperture.value = 2.8;

const focal = document.querySelector("#focal scroll-slider");
focal.valueFunction = v => 7 + 192 ** (v / 9);
focal.labelFunction = v => `${v.toFixed(0)}mm`;
focal.numItems = 10;
focal.style = "--spacing: 5em";
focal.value = 50;

const distance = document.querySelector("#distance scroll-slider");
distance.valueFunction = v => 100 ** (v / 9);
distance.labelFunction = v => `${v.toFixed(0)}m`;
distance.numItems = 10;
distance.style = "--spacing: 5em";
distance.value = 5;

owp
  .combineLatest(
    owp.just(0.03), // CoC
    fromInput(aperture)
      .pipeThrough(owp.map(v => apertureValue(v)))
      .pipeThrough(owp.distinct()),
    fromInput(focal)
      .pipeThrough(owp.map(v => Number(v)))
      .pipeThrough(owp.distinct())
      .pipeThrough(
        owp.forEach(
          setTextContent(
            document.querySelector("#focalout .output"),
            v => `${v.toFixed(0)}mm`
          )
        )
      ),
    fromInput(distance)
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
