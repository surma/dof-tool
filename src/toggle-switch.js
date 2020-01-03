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

export default class ToggleSwitch extends HTMLElement {
  static get observedAttributes() {
    return ["checked"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = html`
      <style>
        :host {
          display: flex;
          position: relative;
        }
        .label {
          flex: 1 0 auto;
        }
        #switch {
          display: block;
          position: relative;
          overflow: hidden;
          height: 1em;
          width: 2em;
          border-radius: 1em;
          background-color: var(--switch-background, red);
          margin: 0 0.3em;
        }
        #switch #lever {
          content: "";
          display: block;
          width: 1em;
          height: 1em;
          border-radius: 1em;
          background-color: var(--switch-button, blue);
          transition: transform 0.1s ease-in-out;
        }
        #switch input {
          width: 1px;
          height: 1px;
          position: absolute;
          top: -50px;
          left: -50px;
        }
        #switch input:checked ~ #lever {
          transform: translateX(1em);
        }
      </style>
      <div class="label left">
        <slot name="left"></slot>
      </div>
      <label id="switch">
        <input type="checkbox" id="checkbox" />
        <span id="lever"></span>
      </label>
      <div class="label right">
        <slot name="right"></slot>
      </div>
    `;

    this._checkbox = this.shadowRoot.querySelector("#checkbox");
    this.shadowRoot
      .querySelector(".label.left")
      .addEventListener("click", () => (this.checked = false));
    this.shadowRoot
      .querySelector(".label.right")
      .addEventListener("click", () => (this.checked = true));
    this._checkbox.addEventListener("change", this._onChange.bind(this));
  }

  attributeChangedCallback(name) {
    if (name === "checked") {
      this.checked = this.hasAttribute("checked");
    }
  }

  get active() {
    return this._checkbox.checked ? "right" : "left";
  }

  set active(val) {
    if (val === "left") {
      this.checked = false;
    }
    if (val === "right") {
      this.checked = true;
    }
  }

  get checked() {
    return this._checkbox.checked;
  }

  set checked(val) {
    this._checkbox.checked = val;
    this._onChange();
  }

  _onChange() {
    this.dispatchEvent(new Event("change"));
  }
}
