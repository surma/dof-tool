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
          scroll-snap-type: x mandatory;
          display: flex;
        }
        #crosshair {
          position: absolute;
          left: 50%;
          height: 100%;
          transform: translateX(-50%);
          width: calc(2 * var(--spacing, 3em));
          border: 1px solid red;
        }
        .padding {
          display: inline-block;
          width: 50%;
          flex-shrink: 0;
        }
        .label {
          scroll-snap-align: center;
          padding: 0 var(--spacing, 3em);
        } 
      </style>
      <div id="crosshair"></div>
      <div id="container">
        <div class="padding"></div>
        <div class="padding"></div>
      </div>
    `;
    
    this._labelFunction = x => x;
    this._container = this.shadowRoot.querySelector('#container');
    const lastChild = this._container.querySelector('*:last-of-type');
    for(let i = 0; i < 10; i++) {
      const span = document.createElement("span")
      span.classList.add('label');
      span.textContent = `${i}`;
      this._container.insertBefore(span, lastChild);
    }
  }  
  
  
}