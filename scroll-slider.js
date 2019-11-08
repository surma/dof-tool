export default class ScrollSlider extends HTMLElement {
  static get observedAttributes() {
    return ["snap", "num-items"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
          overflow: hidden;
        }
        #container {
          width: 100%;
          height: 100%;
          overflow: auto;
          display: flex;
          /* padding-bottom: var(--scrollbar-margin, 20px); */
          /* margin-bottom: calc(-1 * var(--scrollbar-margin, 20px));*/
        }
        .snap {
          scroll-snap-type: x mandatory;
        }
        #crosshair {
          position: absolute;
          left: 50%;
          height: calc(100% - 2px);
          //transform: translateX(-50%);
          //width: var(--spacing, 3em);
          border-left: 1px solid red;
          pointer-events: none;
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
          //transform: translateX(-50%);
        } 
        .label:first-of-type {
          margin-left: calc(-.5 * var(--spacing, 3em));
        }
        .label:last-of-type {
          margin-right: calc(-.5 * var(--spacing, 3em));
        }
      </style>
      <div id="crosshair"></div>
      <div id="container">
        <div class="padding"></div>
        <div class="padding"></div>
      </div>
    `;

    this._valueFunction = x => x;
    this._container = this.shadowRoot.querySelector("#container");
    this._regenerateLabels();
    this._processNumItemsAttribute();

    this._container.addEventListener("scroll", this._onScroll.bind(this));
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
    this._onScroll();
  }

  set valueFunction(f) {
    this._valueFunction = f;
    this._regenerateLabels();
  }

  _processSnapAttribute() {
    this._container.classList.toggle("snap", this.snap);
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
      span.textContent = `${this._valueFunction(i)}`;
      this._container.insertBefore(span, lastChild);
    }
  }

  _onScroll() {
    const offset =
      (this._container.scrollLeft /
        (this._container.scrollWidth - this._container.clientWidth)) *
      (this._numItems - 1);
    const value = this._valueFunction(offset);
    console.log(value);
  }
}
