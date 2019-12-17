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
    height: 24
  },
  "APS-H (Canon)": {
    width: 28.7,
    height: 19.0
  },
  "APS-C (Nikon/Pentax/Sony)": {
    width: 23.6,
    height: 15.7
  },
  "APS-C (Canon)": {
    width: 22.2,
    height: 14.8
  },
  "APS-C": {
    width: 22.5,
    height: 15
  },
  '4/3"': {
    width: 18,
    height: 13.5
  },
  '1"': {
    width: 13.2,
    height: 8.8
  }
};

// 1, 2, 5, 10, 20, 50, 100, 200, 500, ...
function bankNoteSequence(v) {
  return [1, 2, 5][v % 3] * 10 ** Math.floor(v / 3);
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

export function fromCheckbox(el) {
  const { next, observable } = ows.external();
  el.addEventListener("change", () => next(el.checked));
  next(el.checked);
  return observable;
}

export function fromChange(el) {
  const { next, observable } = ows.external();
  el.addEventListener("change", () => next(el.value));
  next(el.value);
  return observable;
}

export function tee(f) {
  const { readable, writable } = new TransformStream();
  const [rs1, rs2] = readable.tee();
  f(rs2);
  return {
    writable,
    readable: rs1
  };
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

function idbInput(el, key, def) {
  return ows
    .fromAsyncFunction(async () => {
      const v = await idbGetWithDefault(key, def);
      el.value = v;
      return fromInput(el);
    })
    .pipeThrough(ows.switchAll())
    .pipeThrough(
      tee(o => {
        o.pipeThrough(ows.debounce(1000)).pipeTo(
          ows.discard(v => idb.set(key, v))
        );
      })
    );
}

function idbCheckbox(el, key, def) {
  return ows
    .fromAsyncFunction(async () => {
      const v = await idbGetWithDefault(key, def);
      el.checked = v;
      return fromCheckbox(el);
    })
    .pipeThrough(ows.switchAll())
    .pipeThrough(
      tee(o => {
        o.pipeThrough(ows.debounce(1000)).pipeTo(
          ows.discard(v => idb.set(key, v))
        );
      })
    );
}

export function init() {
  ows
    .combineLatest(
      // Sensor
      ows
        .fromAsyncFunction(async () => {
          const sensor = await idbGetWithDefault("sensor", {});
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
            coc: Math.sqrt(sensor.width ** 2 + sensor.height ** 2) / 1500,
            cropFactor:
              Math.sqrt(36 ** 2 + 24 ** 2) /
              Math.sqrt(sensor.width ** 2 + sensor.height ** 2)
          }))
        )
        .pipeThrough(
          ows.combineLatestWith(
            fromInput(memoizedQuerySelector("#megapixel")),
            fromCheckbox(memoizedQuerySelector("#advcoc"))
          )
        )
        .pipeThrough(
          ows.map(([sensor, megapixel, shouldMerge]) => {
            if (!shouldMerge) {
              return sensor;
            }
            const numPixelsPerRow = Math.sqrt((3 / 2) * megapixel * 1000000);
            const pixelSize = 36 / numPixelsPerRow;
            return {
              ...sensor,
              coc: pixelSize
            };
          })
        ),
      // Aperture slider
      ows
        .fromAsyncFunction(async () => {
          const slider = memoizedQuerySelector("#aperture scroll-slider");
          slider.valueFunction = v => {
            const left = apertures[Math.floor(v)];
            const right = apertures[Math.ceil(v)];
            return left + (right - left) * (v % 1);
          };
          slider.labelFunction = v => `f/${v.toFixed(1)}`;
          slider.numItems = apertures.length;
          return idbInput(slider, "aperture", 2.8).pipeThrough(ows.distinct());
        })
        .pipeThrough(ows.switchAll()),
      // Focal length slider
      ows
        .fromAsyncFunction(async () => {
          const slider = document.querySelector("#focalin scroll-slider");
          slider.valueFunction = v => {
            const left = focals[Math.floor(v)];
            const right = focals[Math.ceil(v)];
            return left + (right - left) * (v % 1);
          };
          slider.labelFunction = v => `${v.toFixed(0)}mm`;
          slider.numItems = focals.length;
          slider.style = "--spacing: 5em";

          return idbInput(slider, "focal", 50).pipeThrough(ows.distinct());
        })
        .pipeThrough(ows.switchAll()),
      // Distance slider
      ows
        .fromAsyncFunction(async () => {
          const slider = document.querySelector("#distance scroll-slider");
          slider.valueFunction = v => {
            const left = bankNoteSequence(Math.floor(v));
            const right = bankNoteSequence(Math.ceil(v));
            return left + (right - left) * (v % 1);
          };
          slider.labelFunction = v => formatDistance(v, false);
          slider.numItems = 16;
          slider.style = "--spacing: 5em";

          return idbInput(slider, "distance", 1000).pipeThrough(ows.distinct());
        })
        .pipeThrough(ows.switchAll())
    )
    .pipeThrough(
      ows.map(([sensor, aperture, focal, distance]) => {
        const hyperfocal = focal ** 2 / (aperture * sensor.coc) + focal;
        const horizontalFoV = 2 * Math.atan(sensor.width / (2 * focal));
        const verticalFoV = 2 * Math.atan(sensor.height / (2 * focal));
        const nearFocusPlane =
          (distance * (hyperfocal - focal)) /
          (hyperfocal + distance - 2 * focal);
        const farFocusPlane =
          (distance * (hyperfocal - focal)) / (hyperfocal - distance);
        const dofNear = distance - nearFocusPlane;
        const dofFar = farFocusPlane - distance;
        const totalDof = dofNear + dofFar;
        return {
          sensor,
          aperture,
          focal,
          distance,
          hyperfocal,
          horizontalFoV,
          verticalFoV,
          nearFocusPlane,
          farFocusPlane,
          dofNear,
          dofFar,
          totalDof
        };
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
              .pipeThrough(ows.filter(ev => ev.key === "D"))
              .pipeThrough(ows.forEach(ev => ev.preventDefault()))
          )
          .pipeThrough(ows.scan(v => !v, showDetails))
      );
    })
    .pipeThrough(ows.concatAll())
    .pipeThrough(
      ows.forEach(showDetails =>
        memoizedQuerySelector("#factsheet").classList.toggle(
          "hidden",
          !showDetails
        )
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
    .pipeThrough(ows.forEach(ev => ev.preventDefault()))
    .pipeThrough(ows.scan(v => !v, false))
    .pipeTo(
      ows.discard(async v =>
        memoizedQuerySelector("#help").classList.toggle("hidden", v)
      )
    );

  idbCheckbox(memoizedQuerySelector("#advcoc"), "advcoc", false).pipeTo(
    ows.discard(showAdvancedCoC => {
      memoizedQuerySelectorAll(".advcoc").forEach(el =>
        el.classList.toggle("disabled", !showAdvancedCoC)
      );
    })
  );
}
