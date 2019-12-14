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

import * as ows from "observables-with-streams";
import ScrollSlider from "./scroll-slider.js";
import * as idb from "idb-keyval";

customElements.define("scroll-slider", ScrollSlider);

const focals = [
  1,
  4,
  8,
  11,
  15,
  24,
  35,
  50,
  70,
  85,
  100,
  200,
  300,
  400,
  500,
  600
];

const apertures = [
  0.7,
  0.8,
  0.9,
  1.0,
  1.1,
  1.2,
  1.4,
  1.6,
  1.8,
  2,
  2.2,
  2.5,
  2.8,
  3.2,
  3.5,
  4,
  4.5,
  5.0,
  5.6,
  6.3,
  7.1,
  8,
  9,
  10,
  11,
  13,
  14,
  16,
  18,
  20,
  22,
  25,
  29,
  32
];

const sensors = {
  "Full-Frame": {
    width: 36,
    height: 24,
    coc: 0.0291
  },
  "APS-C": {
    width: 22.5,
    height: 15,
    coc: 0.018
  }
};

// 1, 2, 5, 10, 20, 50, 100, 200, 500, ...
function bankNoteSequence(v) {
  return [1, 2, 5][v % 3] * 10 ** Math.floor(v / 3);
}

function transitionEnd(el) {
  return new Promise(resolve =>
    el.addEventListener("transitionend", resolve, { once: true })
  );
}

async function idbGetWithDefault(key, def) {
  if (!(await idb.keys()).includes(key)) {
    return def;
  }
  return idb.get(key);
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

function formatDistance(v, decimals = true) {
  if (v < 0 || !Number.isFinite(v)) {
    return "∞";
  }
  if (v < 10) {
    return `${v.toFixed(0)}mm`;
  }
  if (v < 1000) {
    return `${decimals ? (v / 10).toFixed(1) : (v / 10).toFixed(0)}cm`;
  }
  return `${decimals ? (v / 1000).toFixed(2) : (v / 1000).toFixed(0)}m`;
}

export function init() {
  ows
    .combineLatest(
      // Sensor
      ows
        .fromAsyncFunction(async () => {
          const { sensor } = await idbGetWithDefault("settings", {});
          for (const sensorName of Object.keys(sensors)) {
            const option = document.createElement("option");
            option.value = sensorName;
            option.textContent = sensorName;
            memoizedQuerySelector("#sensor").appendChild(option);
          }
          if (sensor && sensor.name) {
            const sensorIdx = [
              ...memoizedQuerySelector("#sensor").children
            ].findIndex(option => option.value === sensor.name);
            memoizedQuerySelector("#sensor").selectedIndex = sensorIdx;
          }
          return fromInput(memoizedQuerySelector("#sensor")).pipeThrough(
            ows.map(name => ({ name, ...sensors[name] }))
          );
        })
        .pipeThrough(ows.switchAll())
        .pipeThrough(
          ows.map(sensor => ({
            ...sensor,
            cropFactor:
              Math.sqrt(36 ** 2 + 24 ** 2) /
              Math.sqrt(sensor.width ** 2 + sensor.height ** 2)
          }))
        ),
      // Aperture slider
      ows
        .fromAsyncFunction(async () => {
          const { aperture } = await idbGetWithDefault("settings", {});
          const apertureSlider = document.querySelector(
            "#aperture scroll-slider"
          );
          apertureSlider.valueFunction = v => {
            const left = apertures[Math.floor(v)];
            const right = apertures[Math.ceil(v)];
            return left + (right - left) * (v % 1);
          };
          apertureSlider.labelFunction = v => `f/${v.toFixed(1)}`;
          apertureSlider.numItems = apertures.length;
          apertureSlider.value = aperture || 2.8;
          return fromInput(apertureSlider).pipeThrough(ows.distinct());
        })
        .pipeThrough(ows.switchAll()),
      // Focal length slider
      ows
        .fromAsyncFunction(async () => {
          const { focal } = await idbGetWithDefault("settings", {});
          const focalSlider = document.querySelector("#focalin scroll-slider");
          focalSlider.valueFunction = v => {
            const left = focals[Math.floor(v)];
            const right = focals[Math.ceil(v)];
            return left + (right - left) * (v % 1);
          };
          focalSlider.labelFunction = v => `${v.toFixed(0)}mm`;
          focalSlider.numItems = focals.length;
          focalSlider.style = "--spacing: 5em";
          focalSlider.value = focal || 50;

          return fromInput(focalSlider)
            .pipeThrough(ows.map(v => Number(v)))
            .pipeThrough(ows.distinct());
        })
        .pipeThrough(ows.switchAll()),
      // Distance slider
      ows
        .fromAsyncFunction(async () => {
          const { distance } = await idbGetWithDefault("settings", {});
          const distanceSlider = document.querySelector(
            "#distance scroll-slider"
          );
          distanceSlider.valueFunction = v => {
            const left = bankNoteSequence(Math.floor(v));
            const right = bankNoteSequence(Math.ceil(v));
            return left + (right - left) * (v % 1);
          };
          distanceSlider.labelFunction = v => formatDistance(v, false);
          distanceSlider.numItems = 16;
          distanceSlider.style = "--spacing: 5em";
          distanceSlider.value = distance || 1000;

          return fromInput(distanceSlider).pipeThrough(ows.distinct());
        })
        .pipeThrough(ows.switchAll())
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
          (distance * (hyperfocal - focal)) /
          (hyperfocal + distance - 2 * focal);
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
          .setAttribute(
            "d",
            `M ${x1},${y1} A ${r},${r},${deg},0,1,${x2},${y2}`
          );
        memoizedQuerySelector("#fov1").style.transform = `rotate(${(-1 * deg) /
          2}deg)`;
        memoizedQuerySelector("#fov2").style.transform = `rotate(${deg /
          2}deg)`;
      })
    )
    .pipeThrough(
      ows.forEach(({ distance }) => {
        memoizedQuerySelector("svg").setAttribute(
          "viewBox",
          `0 -50 ${Math.max((distance * 1.1 + 300 + 200 + 200) / 10, 100)} 100`
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
        memoizedQuerySelectorAll(".crop").forEach(
          el => (el.textContent = `${data.sensor.cropFactor.toFixed(1)}x`)
        );
        memoizedQuerySelectorAll(".efocal").forEach(
          el =>
            (el.textContent = `${(data.focal * data.sensor.cropFactor).toFixed(
              0
            )}mm`)
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
    .pipeThrough(ows.debounce(500))
    .pipeThrough(
      ows.forEach(async ({ distance, focal, aperture, sensor }) => {
        await idb.set("settings", { aperture, distance, focal, sensor });
      })
    )
    .pipeTo(ows.discard());

  ows
    .fromNext(async next => {
      const showDetails = await idbGetWithDefault("showDetails", false);
      next(ows.just(showDetails));
      next(
        ows
          .merge(
            ows.fromEvent(memoizedQuerySelector("#details"), "click"),
            ows
              .fromEvent(document, "keypress")
              .pipeThrough(ows.filter(ev => ev.key === " "))
          )
          .pipeThrough(ows.scan(v => !v, showDetails))
      );
    })
    .pipeThrough(ows.concatAll())
    .pipeThrough(
      ows.forEach(v =>
        memoizedQuerySelector("#factsheet").classList.toggle("hidden", v)
      )
    )
    .pipeThrough(ows.debounce(1000))
    .pipeTo(
      ows.discard(async v => {
        await idb.set("showDetails", v);
      })
    );

  ows
    .fromEvent(document, "keypress")
    .pipeThrough(ows.filter(ev => ev.key === "?"))
    .pipeThrough(ows.scan(v => !v, false))
    .pipeTo(
      ows.discard(async v =>
        memoizedQuerySelector("#help").classList.toggle("hidden", v)
      )
    );
}
