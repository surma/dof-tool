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

const html = String.raw;

export default class ScrollSlider extends HTMLElement {
  static get observedAttributes() {
    return ["snap", "num-items"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = html`
      <style>
        :host {
          display: block;
          position: relative;
          overflow: hidden;
          width: auto;
          height: 3em;
          user-select: none;
        }
        #wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }
        #scroller {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: calc(-1 * var(--scrollbar-margin, 20px));
          overflow: auto;
        }
        #container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: var(--scrollbar-margin, 20px);
          display: flex;
        }
        .snap {
          scroll-snap-type: x mandatory;
        }
        #crosshair {
          position: absolute;
          left: 50%;
          height: calc(100% - 2px);
          width: 0.5rem;
          transform: translateX(-50%);
          pointer-events: none;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        #crosshair svg {
          fill: var(--crosshair-color);
          stroke: none;
          width: 100%;
        }
        #crosshair svg:nth-of-type(2) {
          transform: scaleY(-1);
        }
        .padding {
          display: inline-block;
          width: 50%;
          flex-shrink: 0;
        }
        .label {
          scroll-snap-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          width: var(--spacing, 3em);
          flex-shrink: 0;
          opacity: 0.5;
          transform: scale(0.5);
          transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
        }
        .label:first-of-type {
          margin-left: calc(-0.5 * var(--spacing, 3em));
        }
        .label:last-of-type {
          margin-right: calc(-0.5 * var(--spacing, 3em));
        }
      </style>
      <div id="crosshair">
        <svg
          viewBox="0 0 1 1"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
        >
          <polygon points="0,0 1,0 .5,1" />
        </svg>
        <svg
          viewBox="0 0 1 1"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
        >
          <polygon points="0,0 1,0 .5,1" />
        </svg>
      </div>
      <div id="scroller">
        <div id="container">
          <div class="padding"></div>
          <div class="padding"></div>
        </div>
      </div>
    `;

    this._valueFunction = x => x;
    this._labelFunction = x => x;
    this._container = this.shadowRoot.querySelector("#container");
    this._scroller = this.shadowRoot.querySelector("#scroller");
    this._regenerateLabels();
    this._processNumItemsAttribute();

    this._scroller.addEventListener("scroll", this._onScroll.bind(this));
    this._container.addEventListener("click", this._onClick.bind(this));
  }

  attributeChangedCallback() {
    this._processSnapAttribute();
    this._processNumItemsAttribute();
  }

  get snap() {
    return this.hasAttribute("snap");
  }

  set snap(value) {
    if (Boolean(value)) {
      this.setAttribute("snap", "");
    } else {
      this.removeAttribute("snap");
    }
  }

  get numItems() {
    return this._numItems;
  }

  set numItems(value) {
    this._numItems = value;
    this._regenerateLabels();
    this._dispatchInputEvent();
  }

  set valueFunction(f) {
    this._valueFunction = f;
    this._regenerateLabels();
  }

  set labelFunction(f) {
    this._labelFunction = f;
    this._regenerateLabels();
  }

  _offsetForScrollPos(pos = this._scroller.scrollLeft) {
    return (
      (pos / (this._scroller.scrollWidth - this._scroller.clientWidth)) *
      (this._numItems - 1)
    );
  }

  _valueForScrollPos(pos = this._scroller.scrollLeft) {
    const offset = this._offsetForScrollPos(pos);
    return this._valueFunction(offset);
  }

  get value() {
    return this._valueForScrollPos();
  }

  set value(target) {
    const left = this._scrollPositionForValue(target);
    this._scroller.scrollTo({ left });
  }

  _scrollPositionForValue(target) {
    // Binary search to find the scroll position that is equivalent
    // to the value provided.
    const max = this._scroller.scrollWidth - this._scroller.clientWidth;
    let current = max / 2;
    let delta = max / 4;
    while (delta > 1) {
      if (this._valueForScrollPos(current) > target) {
        current -= delta;
      } else {
        current += delta;
      }
      delta = Math.floor(delta / 2);
    }
    return current;
  }

  animateToValue(target) {
    const left = this._scrollPositionForValue(target);
    this._scroller.scrollTo({ left, behavior: "smooth" });
  }

  _processSnapAttribute() {
    this._scroller.classList.toggle("snap", this.snap);
  }

  _processNumItemsAttribute() {
    const attrValue = parseInt(this.getAttribute("num-items") || "10", 10);
    if (attrValue !== this.numItems) {
      this.numItems = attrValue;
      this._regenerateLabels();
    }
  }

  _regenerateLabels() {
    this._container
      .querySelectorAll("*:not(.padding)")
      .forEach(el => el.remove());
    const lastChild = this._container.querySelector("*:last-of-type");
    for (let i = 0; i < this.numItems; i++) {
      const span = document.createElement("span");
      span.classList.add("label");
      span.textContent = `${this._labelFunction(this._valueFunction(i))}`;
      this._container.insertBefore(span, lastChild);
    }
  }

  _labels() {
    return [...this._container.querySelectorAll(".label")];
  }

  _onScroll() {
    this._dispatchInputEvent();
    this._adjustLabelSize();
  }

  _adjustLabelSize() {
    const offset = this._offsetForScrollPos();
    const labels = this._labels();
    labels.forEach(label => {
      label.style.opacity = "0.5";
      label.style.transform = "scale(0.7)";
    });
    const left = Math.floor(offset);
    const right = Math.ceil(offset);
    const leftFactor = distanceMap(Math.abs(left - offset));
    const rightFactor = distanceMap(Math.abs(right - offset));
    labels[left].style.opacity = leftFactor * 0.5 + 0.5;
    labels[left].style.transform = `scale(${leftFactor * 0.3 + 0.7})`;
    labels[right].style.opacity = rightFactor * 0.5 + 0.5;
    labels[right].style.transform = `scale(${rightFactor * 0.3 + 0.7})`;
  }

  _dispatchInputEvent() {
    this.dispatchEvent(new InputEvent("input"));
  }

  _onClick(ev) {
    if (!ev.target.classList.contains("label")) {
      return;
    }
    const idx = this._labels().indexOf(ev.target);
    const value = this._valueFunction(idx);
    this.animateToValue(value);
  }
}

function distanceMap(v) {
  // Gamma correction formula as an easing curve
  return Math.pow(1 - v, 0.8);
}
