declare const require:any;
const html2canvas =require('html2canvas');

interface State {
  isOpen: boolean;
  isDragging: boolean;
  dragged: boolean;
  canDraw: boolean;
  includeScreenshot: boolean;
  highlight: boolean;
  isDrawing: boolean;
  sending: boolean;
}

// interface Position {
//   startX: number;
//   startY: number;
//   currTransform: string;
//   nextTransform: string;
//   limits: {
//     xNeg: number;
//     xPos: number;
//     yNeg: number;
//     yPos: number;
//   };
// }

interface Area {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

interface Helper extends Area {
  highlight: boolean;
  index: number;
}

interface Options {
  borderColor:string,
  zIndex:number,
  parent:HTMLElement,
  html2canvas:Object
}
declare const module:any;
module.exports=class Feedback {

  private _initState: State = {
    isOpen: false,
    isDragging: false,
    dragged: false,
    canDraw: false,
    includeScreenshot: true,
    highlight: true,
    isDrawing: false,
    sending: false
  };

  private _initArea: Area = {
    startX: 0,
    startY: 0,
    width: 0,
    height: 0
  };

  private _state: State = { ...this._initState };
  private _root: HTMLDivElement;
  private _formContainer: HTMLDivElement;
  private _drawOptions: HTMLDivElement;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _area: Area = { ...this._initArea };
  private _highlightedArea: Area;
  private _helpersContainer: HTMLDivElement;
  private _helperElements: HTMLDivElement[] = [];
  private _helpers: Helper[] = [];
  private _helperIdx = 0;
  private _options:Options

  private _drawOptionsPos = {
    startX: 0,
    startY: 0,
    currTransform: null,
    nextTransform: null,
    limits: {
      xNeg: 0,
      xPos: 0,
      yNeg: 0,
      yPos: 0
    }
  };

  constructor(options:Options){
    this._options={
      borderColor:options.borderColor||'#347EF8',
      zIndex:options.zIndex||999,
      parent:options.parent||document.body,
      html2canvas:options.html2canvas||{}
    };
  }

  open() {
    if (!this._state.isOpen) {
      this._state.isOpen = true;
      this._root = this._createModal();
      this._options.parent.appendChild(this._root);
      //document.addEventListener('keydown', this._closeListener);
      this._openDrawer();
    }
  }


  setBlackMode(enable){
    this._state.highlight=!enable;
  }

  close = (isCancel) => {
    document.removeEventListener('mousemove', this._dragDrag);
    document.removeEventListener('mouseup', this._dragStop);
    document.removeEventListener('mouseup', this._drawStop);
    document.removeEventListener('mousemove', this._drawDraw);
    document.removeEventListener('click', this._addHighlightedElement);
    window.removeEventListener('resize', this._resize);
    this._options.parent.removeChild(this._root)
    this._reset();
    if(isCancel)
      return null;
    return new Promise(resolve=>{
      html2canvas(document.body,this._options.html2canvas).then(canvas=>{
        let ctx=canvas.getContext('2d');
        ctx.drawImage(this._canvas,0,0,canvas.width,canvas.height);
        resolve(canvas);
      });
    })
    //return this._canvas;
  }

  private _reset() {
    this._state = { ...this._initState };
    this._helpers = [];
    this._helperElements = [];
    this._helperIdx = 0;
  }

  private _createModal(): HTMLDivElement {
    const root = document.createElement('div');
    root.style.zIndex=this._options.zIndex+'';
    root.style.position='fixed';
    root.style.left='0';
    root.style.top='0';
    root.style.width='100%';
    root.style.height='100%';

    //root.appendChild(this._createForm());
    root.appendChild(this._createHelpersContainer());
    root.appendChild(this._createCanvas());

    return root;
  }

  /*private _closeListener = ($event: KeyboardEvent) => {
    if ($event.key === 'Escape') {
      this.close();
    }
  }*/

  /*打开绘图器*/
  private _openDrawer = () => {
    //设置标识符
    this._state.canDraw = true;
    document.addEventListener('click', this._addHighlightedElement);
  }

  /*关闭绘图器*/
  private _closeDrawer = () => {
    this._state.canDraw = false;
    this._root.removeChild(this._drawOptions);
    this._formContainer.style.display = 'block';
    document.removeEventListener('click', this._addHighlightedElement);
  }

  private _createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.cursor = 'crosshair';
    canvas.width = document.documentElement.scrollWidth;
    canvas.height = document.documentElement.scrollHeight;
    canvas.className = 'draw-area';
    canvas.addEventListener('mousedown', this._drawStart);
    document.addEventListener('mouseup', this._drawStop);
    document.addEventListener('mousemove', this._drawDraw);
    window.addEventListener('resize', this._resize);
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._resetCanvas();
    return canvas;
  }

  private _resize = () => {
    const width = document.documentElement.scrollWidth;
    const height = document.documentElement.scrollHeight;
    this._canvas.width = width;
    this._canvas.height = height;
    this._helpersContainer.style.width = `${width}px`;
    this._helpersContainer.style.height = `${height}px`;
    this._redraw();
  }

  private _createHelpersContainer(): HTMLDivElement {
    const helpersContainer = document.createElement('div');
    helpersContainer.className = 'helpers';
    helpersContainer.style.width = `${document.documentElement.scrollWidth}px`;
    //helpersContainer.style.height = `${document.documentElement.scrollHeight}px`;
    helpersContainer.style.height='0';
    helpersContainer.style.position='absolute';
    //helpersContainer.style.zIndex='-1';
    this._helpersContainer = helpersContainer;
    return helpersContainer;
  }

  private _dragDrag = ($event: MouseEvent) => {
    if (this._state.isDragging) {
      $event.preventDefault();

      let nextX = $event.clientX - this._drawOptionsPos.startX;
      let nextY = $event.clientY - this._drawOptionsPos.startY;

      if (nextX < this._drawOptionsPos.limits.xNeg) {
        nextX = this._drawOptionsPos.limits.xNeg;
      }

      if (nextX > this._drawOptionsPos.limits.xPos) {
        nextX = this._drawOptionsPos.limits.xPos;
      }

      if (nextY < this._drawOptionsPos.limits.yNeg) {
        nextY = this._drawOptionsPos.limits.yNeg;
      }

      if (nextY > this._drawOptionsPos.limits.yPos) {
        nextY = this._drawOptionsPos.limits.yPos;
      }

      nextX = Math.round(nextX);
      nextY = Math.round(nextY);

      this._drawOptionsPos.nextTransform = `translate(${nextX}px, ${nextY}px)`;
      this._drawOptions.style.transform = `${this._drawOptionsPos.currTransform} ${this._drawOptionsPos.nextTransform}`;
      this._state.dragged = true;
    }
  }

  private _dragStop = ($event: MouseEvent) => {
    this._state.isDragging = false;
    if (this._state.dragged) {
      this._drawOptionsPos.currTransform = `${this._drawOptionsPos.currTransform} ${this._drawOptionsPos.nextTransform}`;
      this._state.dragged = false;
    }
  }

  private _drawStart = ($event: MouseEvent) => {
    if (this._state.canDraw) {
      this._state.isDrawing = true;
      this._area = {
        startX: $event.clientX + document.documentElement.scrollLeft,
        startY: $event.clientY + document.documentElement.scrollTop,
        width: 0,
        height: 0
      };
    }
  }

  private _drawStop = ($event: MouseEvent) => {
    if (this._state.canDraw) {
      this._state.isDrawing = false;

      if (Math.abs(this._area.width) < 6 || Math.abs(this._area.height) < 6) {
        return;
      }

      const helper: Helper = { ...this._area, highlight: this._state.highlight, index: this._helperIdx++ };

      if (helper.width < 0) {
        helper.startX += helper.width;
        helper.width *= -1;
      }

      if (helper.height < 0) {
        helper.startY += helper.height;
        helper.height *= -1;
      }

      this._area = { ...this._initArea };
      this._helperElements.push(this._createHelper(helper));
      this._helpers.push(helper);
      this._redraw();
    }
  }

  private _drawDraw = ($event: MouseEvent) => {
    $event.preventDefault();

    if (this._state.isDrawing) {
      this._area.width = $event.clientX - this._area.startX + document.documentElement.scrollLeft;
      this._area.height = $event.clientY - this._area.startY + document.documentElement.scrollTop;

      // TODO: constant '4' should be lineWidth - also should be optional
      if (this._area.startX + this._area.width > document.documentElement.scrollWidth) {
        this._area.width = document.documentElement.scrollWidth - this._area.startX - 4;
      }

      if (this._area.startX + this._area.width < 0) {
        this._area.width = -this._area.startX + 4;
      }

      if (this._area.startY + this._area.height > document.documentElement.scrollHeight) {
        this._area.height = document.documentElement.scrollHeight - this._area.startY - 4;
      }

      if (this._area.startY + this._area.height < 0) {
        this._area.height = -this._area.startY + 4;
      }

      this._resetCanvas();
      this._drawHighlightLines();

      if (this._state.highlight && Math.abs(this._area.width) > 6 && Math.abs(this._area.height) > 6) {
        this._drawLines(this._area.startX, this._area.startY, this._area.width, this._area.height);
        this._ctx.clearRect(this._area.startX, this._area.startY, this._area.width, this._area.height);
      }

      this._paintArea();
      this._paintArea(false);

      if (!this._state.highlight && Math.abs(this._area.width) > 6 && Math.abs(this._area.height) > 6) {
        this._ctx.fillStyle = 'rgba(0,0,0,.5)';
        this._ctx.fillRect(this._area.startX, this._area.startY, this._area.width, this._area.height);
      }
    }
  }

  private _resetCanvas() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.fillStyle = 'rgba(102,102,102,.5)';
    this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
  }

  private _drawHighlightLines() {
    this._helpers.filter(helper => helper.highlight).forEach(
      helper => {
        this._drawLines(helper.startX, helper.startY, helper.width, helper.height);
      }
    );
  }

  private _paintArea(highlight: boolean = true) {
    if (highlight) {
      this._helpers.filter(helper => helper.highlight).forEach(
        helper => {
          this._ctx.clearRect(helper.startX, helper.startY, helper.width, helper.height);
        }
      );
    } else {
      this._helpers.filter(helper => !helper.highlight).forEach(
        helper => {
          this._ctx.fillStyle = 'rgba(0,0,0,1)';
          this._ctx.fillRect(helper.startX, helper.startY, helper.width, helper.height);
        }
      );
    }
  }

  private _redraw(withBorder: boolean = true) {
    this._resetCanvas();
    if (withBorder) {
      this._drawHighlightLines();
    }
    this._paintArea();
    this._paintArea(false);
  }

  private _drawLines(x: number, y: number, width: number, height: number) {
    this._ctx.strokeStyle = this._options.borderColor;
    this._ctx.lineJoin = 'bevel';
    this._ctx.lineWidth = 4;

    this._ctx.strokeRect(x, y, width, height);

    this._ctx.lineWidth = 1;
  }

  private _createHelper(helper: Helper): HTMLDivElement {
    const h = document.createElement('div');
    h.className = helper.highlight ? 'highlight' : 'blackout';
    h.style.position = 'absolute';
    h.style.top = `${helper.startY}px`;
    h.style.left = `${helper.startX}px`;
    h.style.height = `${helper.height}px`;
    h.style.width = `${helper.width}px`;
    h.style.zIndex = '20';
    h.setAttribute('idx', `${helper.index}`);

    const inner = document.createElement('div');
    inner.style.width = `${helper.width - 2}px`;
    inner.style.height = `${helper.height - 2}px`;
    inner.style.margin = '1px';

    const removeButton = document.createElement('img');
    removeButton.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsSAAALEgHS3X78AAAD20lEQVRYw72Xy29bVRDGf+fkJnHjhNhuEA/FgbRpWtJIVFVDebRFInKCQCCxQEIsoNBF2bSbyuV/wLuugAVQoFBKUHdVghftIipVHkgEiaQNi9KUhMqpHZPYTnztc1jc6+A48fV15ebbWWfuzOc5M9+ZEbhEKKKagCPAIaAbeBJoto9XgHngFjABjEbDMu3Gr3AROAi8DwwCO1zyzQAjwPloWM49EIFQRDUAJ4F3gXq3mSqBCXwPfBoNy6xrAqGIagc+wUp1LXAL+HirbGwiEIqofcA5IFCj4AXEgdPRsJwpS8C+7y8Af42DF5AAPizOxDqBUEQ1Al9Su7SXwyxwPBqWawCy6ODkNgQH2GPH+j8DdtENAcY2EADIAW9Hw3KukIHjTsHPDIrgB0fF40+00uDGe8CL8c5hHj0zKIJlTAw7JtJWuEEnh/E05oEOHhnoFf7G+g3Xtgl1EnFsL60vdgn//RSmg+lAKKKaDCx5dVS44SkdV0ro53bhA8HFMR1bM1GldlLAmwcIvNIjdk7PszLyu447uN0BHDGAvkopXUiS/WFMx0BweBc+pWFonFimiESdRLxhB59ZIHXhhr6XTJOv4LrPwKrKilg1URfHdEwjeKFL+PJK68uTLGZMlCERrz1LoL9H7Ly5QOrb6/qfZKZicIA9BtDuhgDAmon6cUzH8gp9tFv4zbxW12ZIHnya5oH9ou2PeZYv3ND3XAYHaDcAr1sCABkTdXmSxWxOq/4e0db1GN5gAM/kbZI/TehFF2kvhldWYbyOdBZ1bYbkX/fJ9HXiS6Qwr07rpaU0uWp9SSBV7UeGRBx8iuaOAJ7peZYDXhoOddLiqdCiWyBlAHcBn9sv6uyCG9gv2iZuk7w6rZf6Omk51i0CjQby0vjWLVoGdw2sx6HXVbrsPu/vsQpuaELHkmnyfy+RbaxHPr8bnxTldWILzBrAOPCWm39e6PPpBVaK+3zNRF0a0zHhoBNlMG4Ao1gzXFk19DdhvLyPVqc+36ATu4VPaa2v/EY8Ub4wV4FRaU+vPzvRHOjF3/+MJa/f/FJeZAo6cf1PnXipS/hDvY6DzUg0LNOFF/Ar4HXKvIjtfuH59Q7/Dk/peKU+z5ioK1PEc0rroF94QG9llgPOw8aJ6DTwHtuDr6NheQ42TkSfYXXEw8Ys8HnhxzoBe0Y7izU4PiwkgLPRsFzdRMAmMQecwhqha404cKp0N9gknfbcfoLaXscscKJ0J4DKq9lHWKvZgw6rOeA7ql3NSoh0YHXHq4DHZeA1YBhrOb3jZFiRQBGR4vV8L9Z63mIfL2Ot5zepcj3/DzZhltDZRVTuAAAAAElFTkSuQmCC';
    //removeButton.innerText = 'remove';
    removeButton.style.position = 'absolute';

    removeButton.style.right = '-15px';
    removeButton.style.top = '-15px';
    removeButton.addEventListener('click', ($event) => {
      removeButton.parentNode.parentNode.removeChild(h);
      this._helpers.splice(this._helpers.findIndex(_helper => _helper.index === helper.index), 1);
      this._helperElements.splice(this._helperElements.findIndex(_helper => +_helper.getAttribute('idx') === helper.index), 1);
      this._redraw();
    });

    h.addEventListener('mouseenter', ($event) => {
      if (this._state.canDraw && !this._state.isDrawing) {
        h.appendChild(inner);
        h.appendChild(removeButton);

        if (!helper.highlight) {
          this._resetCanvas();

          this._drawHighlightLines();
          this._paintArea();

          this._ctx.clearRect(helper.startX, helper.startY, helper.width, helper.height);
          this._ctx.fillStyle = 'rgba(0,0,0,.75)';
          this._ctx.fillRect(helper.startX, helper.startY, helper.width, helper.height);

          this._helpers.filter(_helper => !_helper.highlight && _helper.index !== helper.index).forEach(
            _helper => {
              this._ctx.fillStyle = 'rgba(0,0,0,1)';
              this._ctx.fillRect(_helper.startX, _helper.startY, _helper.width, _helper.height);
            }
          );
        }
      }
    });

    h.addEventListener('mouseleave', ($event) => {
      if (this._state.canDraw && !this._state.isDrawing && h.hasChildNodes()) {
        h.removeChild(inner);
        h.removeChild(removeButton);
        if (!helper.highlight) {
          this._redraw();
        }
      }
    });

    this._helpersContainer.appendChild(h);
    return h;
  }

  private _addHighlightedElement = ($event: MouseEvent) => {
    if (this._highlightedArea) {
      if (Math.abs(this._highlightedArea.width) < 6 || Math.abs(this._highlightedArea.height) < 6) {
        return;
      }

      const helper: Helper = { ...this._highlightedArea, highlight: this._state.highlight, index: this._helperIdx++ };

      if (helper.width < 0) {
        helper.startX += helper.width;
        helper.width *= -1;
      }

      if (helper.height < 0) {
        helper.startY += helper.height;
        helper.height *= -1;
      }

      this._helperElements.push(this._createHelper(helper));
      this._helpers.push(helper);
    }
  }
}
