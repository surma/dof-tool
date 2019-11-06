export default class ScrollSlider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
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
          scroll-snap-type: x mandatory;
          display: flex;
          padding-bottom: var(--scrollbar-margin, 20px);
          margin-bottom: calc(-1 * var(--scrollbar-margin, 20px));
        }
        #crosshair {
          position: absolute;
          left: 50%;
          height: calc(100% - 2px);
          transform: translateX(-50%);
          width: calc(2 * var(--spacing, 3em));
          border: 1px solid red;
          pointer-events: none;
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
    this._numItems = 10;
    this._regenerateLabels();
  }
  
  _regenerateLabels() {
    this._container.querySelectorAll('*:not(.padding)').forEach(el => el.remove());
    const lastChild = this._container.querySelector('*:last-of-type');
    for(let i = 0; i < 10; i++) {
      const span = document.createElement("span")
      span.classList.add('label');
      span.textContent = `${i}`;
      this._container.insertBefore(span, lastChild);
    }
  }  
  
  
}