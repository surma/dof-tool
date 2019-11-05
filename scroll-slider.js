export default class ScrollSlider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
        }
        #container {
          width: 100%;
          height: 100%;
          overflow: auto;
          display: grid;
          grid-template-columns: 50% max-content 50%;
        }
        #crosshair {
          position: absolute;
          left: 50%;
          height: 100%;
          border-left: 1px solid red;
        }
      </style>
      <div id="crosshair"></div>
      <div id="container">
        <div class="padding"></div>
        <div id="slider">
        </div>
        <div class="padding"></div>
      </div>
    `;
    
    this._labelFunction = x => x;
    this._slider = this.shadowRoot.querySelector("#slider");
    for(let i = 0; i < 10; i++) {
      const span = document.createElement("span")
      span.textContent = `${i}`;
      this._slider.append(span);
    }
  }  
  
  
}