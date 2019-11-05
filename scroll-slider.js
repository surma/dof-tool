export default class ScrollSlider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.innerHTML = `
      <style>
        #container {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        #slider {
          margin: 0 50%;
        }
      </style>
      <div id="container">
        <div id="slider">
        </div>
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