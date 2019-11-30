import "web-streams-polyfill/dist/polyfill.es2018.mjs";
import * as ows from "observables-with-streams";
import ScrollSlider from "./scroll-slider.js";

customElements.define("scroll-slider", ScrollSlider);

function myRound(v) {
  if (v % 1 >= 0.6) {
    return Math.ceil(v);
  }
  return Math.floor(v);
}

const elementsCache = new Map();
function memoizedQuerySelector(selector) {
  if (!elementsCache.has(selector)) {
    elementsCache.set(selector, [...document.querySelectorAll(selector)]);
  }
  return elementsCache.get(selector)[0];
}

function memoizedQuerySelectorAll(selector) {
  if (!elementsCache.has(selector)) {
    elementsCache.set(selector, [...document.querySelectorAll(selector)]);
  }
  return elementsCache.get(selector);
}

export function fromInput(el) {
  const { next, observable } = ows.external();
  el.addEventListener("input", () => next(el.value));
  next(el.value);
  return observable;
}

export function fromChange(el) {
  const { next, observable } = ows.external();
  el.addEventListener("change", () => next(el.value));
  next(el.value);
  return observable;
}

function formatDistance(v) {
  if (v < 0 || !Number.isFinite(v)) {
    return "∞";
  }
  if (v < 10) {
    return `${v.toFixed(0)}mm`;
  }
  if (v < 1000) {
    return `${(v / 10).toFixed(1)}cm`;
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

const focal = document.querySelector("#focalin scroll-slider");
focal.valueFunction = v => 7 + 192 ** (v / 9);
focal.labelFunction = v => `${v.toFixed(0)}mm`;
focal.numItems = 10;
focal.style = "--spacing: 5em";
focal.value = 50;

const distance = document.querySelector("#distance scroll-slider");
distance.valueFunction = v => 1000 ** (v / 9);
distance.labelFunction = v => formatDistance(v);
distance.numItems = 19;
distance.style = "--spacing: 5em";
distance.value = 5;

ows
  .combineLatest(
    ows.just({
      width: 36,
      height: 24,
      coc: 0.0291
    }), // Sensor
    fromInput(aperture)
      .pipeThrough(ows.map(v => apertureValue(v)))
      .pipeThrough(ows.distinct()),
    fromInput(focal)
      .pipeThrough(ows.map(v => Number(v)))
      .pipeThrough(ows.distinct()),
    fromInput(distance).pipeThrough(ows.distinct())
  )
  .pipeThrough(
    ows.map(([sensor, aperture, focal, distance]) => ({
      sensor,
      aperture,
      focal,
      distance
    }))
  )
  .pipeThrough(
    ows.map(data => {
      const { aperture, focal, sensor } = data;
      const hyperfocal = focal ** 2 / (aperture * sensor.coc) + focal;
      const horizontalFoV = 2 * Math.atan(sensor.width / (2 * focal));
      const verticalFoV = 2 * Math.atan(sensor.height / (2 * focal));
      return { ...data, hyperfocal, horizontalFoV, verticalFoV };
    })
  )
  .pipeThrough(
    ows.map(data => {
      const { distance, focal, hyperfocal } = data;
      const nearFocusPlane =
        (distance * (hyperfocal - focal)) / (hyperfocal + distance - 2 * focal);
      const farFocusPlane =
        (distance * (hyperfocal - focal)) / (hyperfocal - distance);
      return { ...data, farFocusPlane, nearFocusPlane };
    })
  )
  .pipeThrough(
    ows.map(data => {
      const { distance, nearFocusPlane, farFocusPlane } = data;
      const dofNear = distance - nearFocusPlane;
      const dofFar = farFocusPlane - distance;
      const totalDof = dofNear + dofFar;
      return { ...data, dofNear, dofFar, totalDof };
    })
  )
  .pipeThrough(
    ows.forEach(({ nearFocusPlane, farFocusPlane, distance }) => {
      memoizedQuerySelector("#nearFocusPlane").setAttribute(
        "x1",
        (nearFocusPlane - distance) / 10
      );
      memoizedQuerySelector("#nearFocusPlane").setAttribute(
        "x2",
        (nearFocusPlane - distance) / 10
      );
      memoizedQuerySelector("#farFocusPlane").setAttribute(
        "x1",
        (farFocusPlane - distance) / 10
      );
      memoizedQuerySelector("#farFocusPlane").setAttribute(
        "x2",
        (farFocusPlane - distance) / 10
      );
    })
  )
  .pipeThrough(
    ows.forEach(({ horizontalFoV }) => {
      const deg = (horizontalFoV * 360) / (2 * Math.PI);
      memoizedQuerySelectorAll(".hfov").forEach(
        el => (el.textContent = `${deg.toFixed(0)}°`)
      );
      const r = 38;
      const x1 = 30 + Math.cos(-horizontalFoV / 2) * r;
      const y1 = Math.sin(-horizontalFoV / 2) * r;
      const x2 = 30 + Math.cos(horizontalFoV / 2) * r;
      const y2 = Math.sin(horizontalFoV / 2) * r;
      document
        .querySelector("#fov-arc")
        .setAttribute("d", `M ${x1},${y1} A ${r},${r},${deg},0,1,${x2},${y2}`);
      memoizedQuerySelector("#fov1").style.transform = `rotate(${(-1 * deg) /
        2}deg)`;
      memoizedQuerySelector("#fov2").style.transform = `rotate(${deg / 2}deg)`;
    })
  )
  .pipeThrough(
    ows.forEach(({ distance }) => {
      memoizedQuerySelector("svg").setAttribute(
        "viewBox",
        `0 -50 ${Math.max((distance * 1.5) / 10, 100)} 100`
      );
      memoizedQuerySelector("#world").setAttribute(
        "transform",
        `translate(${distance / 10}, 0)`
      );
    })
  )
  .pipeThrough(
    ows.forEach(data => {
      memoizedQuerySelectorAll(".focal").forEach(
        el => (el.textContent = `${data.focal.toFixed(0)}mm`)
      );
      memoizedQuerySelectorAll(".hyperfocal").forEach(
        el => (el.textContent = formatDistance(data.hyperfocal))
      );
      memoizedQuerySelectorAll(".distance").forEach(
        el => (el.textContent = formatDistance(data.distance))
      );
      memoizedQuerySelectorAll(".aperture").forEach(
        el => (el.textContent = `f/${data.aperture}`)
      );
      const dofBefore = data.distance - data.nearFocusPlane;
      let dofAfter = data.farFocusPlane - data.distance;
      memoizedQuerySelectorAll(".dof").forEach(
        el =>
          (el.textContent = `${formatDistance(dofBefore)} + ${formatDistance(
            dofAfter
          )} = ${formatDistance(dofBefore + dofAfter)}`)
      );
    })
  )
  .pipeTo(ows.discard());
