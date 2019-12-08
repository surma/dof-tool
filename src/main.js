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

async function idbGetWithDefault(key, def) {
  if (!(await idb.keys()).includes(key)) {
    return def;
  }
  return idb.get(key);
}

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

function apertureValue(v) {
  return myRound(Math.sqrt(2 ** (Math.round(v) / 3)) * 10) / 10;
}

export function init() {
  ows
    .combineLatest(
      // Sensor
      ows.just({
        width: 36,
        height: 24,
        coc: 0.0291
      }),
      // Aperture slider
      ows
        .fromAsyncFunction(async () => {
          const { aperture } = await idbGetWithDefault("settings", {});
          const apertureSlider = document.querySelector(
            "#aperture scroll-slider"
          );
          apertureSlider.valueFunction = apertureValue;
          apertureSlider.labelFunction = v => `f/${v.toFixed(1)}`;
          apertureSlider.numItems = 31;
          apertureSlider.value = aperture || 2.8;
          return fromInput(apertureSlider).pipeThrough(ows.distinct());
        })
        .pipeThrough(ows.switchAll()),
      // Focal length slider
      ows
        .fromAsyncFunction(async () => {
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
          distanceSlider.valueFunction = v => 1000 ** (v / 9);
          distanceSlider.labelFunction = v => formatDistance(v, false);
          distanceSlider.numItems = 19;
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
      ows.forEach(async ({ distance, focal, aperture }) => {
        await idb.set("settings", { aperture, distance, focal });
      })
    )
    .pipeTo(ows.discard());

  fromNext(async next => {
    const showDetails = await idbGetWithDefault("showDetails", false);
    next(ows.just(showDetails));
    next(
      ows.fromEvent(memoizedQuerySelector("#details"), "click").pipeThrough(
        ows.scan(v => !v),
        showDetails
      )
    );
  })
    .pipeThrough(concatAll())
    .pipeThrough(
      ows.forEach(
        v => (memoizedQuerySelector("#factsheet").style.opacity = v ? "1" : "0")
      )
    )
    .pipeThrough(ows.debounce(1000))
    .pipeTo(
      ows.discard(async v => {
        await idb.set("showDetails", v);
      })
    );
}

function concatAll(o) {
  const { readable, writable } = new TransformStream();
  return {
    writable: new WritableStream({
      async write(o) {
        await o.pipeTo(writable, { preventClose: true });
      }
    }),
    readable
  };
}

function fromNext(f) {
  const { observable, next } = ows.external();
  f(next);
  return observable;
}
