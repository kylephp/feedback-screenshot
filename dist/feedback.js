var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var html2canvas = require('@kylephp/html2canvas');
module.exports = (function () {
    function Feedback(options) {
        var _this = this;
        this._initState = {
            isOpen: false,
            isDragging: false,
            dragged: false,
            canDraw: false,
            includeScreenshot: true,
            highlight: true,
            isDrawing: false,
            sending: false
        };
        this._initArea = {
            startX: 0,
            startY: 0,
            width: 0,
            height: 0
        };
        this._state = __assign({}, this._initState);
        this._area = __assign({}, this._initArea);
        this._helperElements = [];
        this._helpers = [];
        this._helperIdx = 0;
        this._drawOptionsPos = {
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
        this.close = function (isCancel) {
            document.removeEventListener('mousemove', _this._dragDrag);
            document.removeEventListener('mouseup', _this._dragStop);
            document.removeEventListener('mouseup', _this._drawStop);
            document.removeEventListener('mousemove', _this._drawDraw);
            document.removeEventListener('click', _this._addHighlightedElement);
            window.removeEventListener('resize', _this._resize);
            _this._options.parent.removeChild(_this._root);
            _this._reset();
            if (isCancel)
                return null;
            return new Promise(function (resolve) {
                html2canvas(document.body, _this._options.html2canvas).then(function (canvas) {
                    var ctx = canvas.getContext('2d');
                    ctx.globalAlpha = 1;
                    ctx.drawImage(_this._canvas, 0, 0, canvas.width, canvas.height);
                    resolve(canvas);
                });
            });
        };
        this._openDrawer = function () {
            _this._state.canDraw = true;
            document.addEventListener('click', _this._addHighlightedElement);
        };
        this._closeDrawer = function () {
            _this._state.canDraw = false;
            _this._root.removeChild(_this._drawOptions);
            _this._formContainer.style.display = 'block';
            document.removeEventListener('click', _this._addHighlightedElement);
        };
        this._resize = function () {
            var width = document.documentElement.scrollWidth;
            var height = document.documentElement.scrollHeight;
            _this._canvas.width = width;
            _this._canvas.height = height;
            _this._helpersContainer.style.width = width + "px";
            _this._helpersContainer.style.height = height + "px";
            _this._redraw();
        };
        this._dragDrag = function ($event) {
            if (_this._state.isDragging) {
                $event.preventDefault();
                var nextX = $event.clientX - _this._drawOptionsPos.startX;
                var nextY = $event.clientY - _this._drawOptionsPos.startY;
                if (nextX < _this._drawOptionsPos.limits.xNeg) {
                    nextX = _this._drawOptionsPos.limits.xNeg;
                }
                if (nextX > _this._drawOptionsPos.limits.xPos) {
                    nextX = _this._drawOptionsPos.limits.xPos;
                }
                if (nextY < _this._drawOptionsPos.limits.yNeg) {
                    nextY = _this._drawOptionsPos.limits.yNeg;
                }
                if (nextY > _this._drawOptionsPos.limits.yPos) {
                    nextY = _this._drawOptionsPos.limits.yPos;
                }
                nextX = Math.round(nextX);
                nextY = Math.round(nextY);
                _this._drawOptionsPos.nextTransform = "translate(" + nextX + "px, " + nextY + "px)";
                _this._drawOptions.style.transform = _this._drawOptionsPos.currTransform + " " + _this._drawOptionsPos.nextTransform;
                _this._state.dragged = true;
            }
        };
        this._dragStop = function ($event) {
            _this._state.isDragging = false;
            if (_this._state.dragged) {
                _this._drawOptionsPos.currTransform = _this._drawOptionsPos.currTransform + " " + _this._drawOptionsPos.nextTransform;
                _this._state.dragged = false;
            }
        };
        this._drawStart = function ($event) {
            if (_this._state.canDraw) {
                _this._state.isDrawing = true;
                _this._area = {
                    startX: $event.clientX + document.documentElement.scrollLeft,
                    startY: $event.clientY + document.documentElement.scrollTop,
                    width: 0,
                    height: 0
                };
            }
        };
        this._drawStop = function ($event) {
            if (_this._state.canDraw) {
                _this._state.isDrawing = false;
                if (Math.abs(_this._area.width) < 6 || Math.abs(_this._area.height) < 6) {
                    return;
                }
                var helper = __assign({}, _this._area, { highlight: _this._state.highlight, index: _this._helperIdx++ });
                if (helper.width < 0) {
                    helper.startX += helper.width;
                    helper.width *= -1;
                }
                if (helper.height < 0) {
                    helper.startY += helper.height;
                    helper.height *= -1;
                }
                _this._area = __assign({}, _this._initArea);
                _this._helperElements.push(_this._createHelper(helper));
                _this._helpers.push(helper);
                _this._redraw();
            }
        };
        this._drawDraw = function ($event) {
            $event.preventDefault();
            if (_this._state.isDrawing) {
                _this._area.width = $event.clientX - _this._area.startX + document.documentElement.scrollLeft;
                _this._area.height = $event.clientY - _this._area.startY + document.documentElement.scrollTop;
                if (_this._area.startX + _this._area.width > document.documentElement.scrollWidth) {
                    _this._area.width = document.documentElement.scrollWidth - _this._area.startX - 4;
                }
                if (_this._area.startX + _this._area.width < 0) {
                    _this._area.width = -_this._area.startX + 4;
                }
                if (_this._area.startY + _this._area.height > document.documentElement.scrollHeight) {
                    _this._area.height = document.documentElement.scrollHeight - _this._area.startY - 4;
                }
                if (_this._area.startY + _this._area.height < 0) {
                    _this._area.height = -_this._area.startY + 4;
                }
                _this._resetCanvas();
                _this._drawHighlightLines();
                if (_this._state.highlight && Math.abs(_this._area.width) > 6 && Math.abs(_this._area.height) > 6) {
                    _this._drawLines(_this._area.startX, _this._area.startY, _this._area.width, _this._area.height);
                    _this._ctx.clearRect(_this._area.startX, _this._area.startY, _this._area.width, _this._area.height);
                }
                _this._paintArea();
                _this._paintArea(false);
                if (!_this._state.highlight && Math.abs(_this._area.width) > 6 && Math.abs(_this._area.height) > 6) {
                    _this._ctx.fillStyle = 'rgba(0,0,0,.5)';
                    _this._ctx.fillRect(_this._area.startX, _this._area.startY, _this._area.width, _this._area.height);
                }
            }
        };
        this._addHighlightedElement = function ($event) {
            if (_this._highlightedArea) {
                if (Math.abs(_this._highlightedArea.width) < 6 || Math.abs(_this._highlightedArea.height) < 6) {
                    return;
                }
                var helper = __assign({}, _this._highlightedArea, { highlight: _this._state.highlight, index: _this._helperIdx++ });
                if (helper.width < 0) {
                    helper.startX += helper.width;
                    helper.width *= -1;
                }
                if (helper.height < 0) {
                    helper.startY += helper.height;
                    helper.height *= -1;
                }
                _this._helperElements.push(_this._createHelper(helper));
                _this._helpers.push(helper);
            }
        };
        this._options = {
            borderColor: options.borderColor || '#347EF8',
            zIndex: options.zIndex || 999,
            parent: options.parent || document.body,
            html2canvas: options.html2canvas || {}
        };
    }
    Feedback.prototype.open = function () {
        if (!this._state.isOpen) {
            this._state.isOpen = true;
            this._root = this._createModal();
            this._options.parent.appendChild(this._root);
            this._openDrawer();
        }
    };
    Feedback.prototype.setBlackMode = function (enable) {
        this._state.highlight = !enable;
    };
    Feedback.prototype._reset = function () {
        this._state = __assign({}, this._initState);
        this._helpers = [];
        this._helperElements = [];
        this._helperIdx = 0;
    };
    Feedback.prototype._createModal = function () {
        var root = document.createElement('div');
        root.style.zIndex = this._options.zIndex + '';
        root.style.position = 'fixed';
        root.style.left = '0';
        root.style.top = '0';
        root.style.width = '100%';
        root.style.height = '100%';
        root.appendChild(this._createHelpersContainer());
        root.appendChild(this._createCanvas());
        return root;
    };
    Feedback.prototype._createCanvas = function () {
        var canvas = document.createElement('canvas');
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
    };
    Feedback.prototype._createHelpersContainer = function () {
        var helpersContainer = document.createElement('div');
        helpersContainer.className = 'helpers';
        helpersContainer.style.width = document.documentElement.scrollWidth + "px";
        helpersContainer.style.height = '0';
        helpersContainer.style.position = 'absolute';
        this._helpersContainer = helpersContainer;
        return helpersContainer;
    };
    Feedback.prototype._resetCanvas = function () {
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._ctx.fillStyle = 'rgba(102,102,102,.5)';
        this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
    };
    Feedback.prototype._drawHighlightLines = function () {
        var _this = this;
        this._helpers.filter(function (helper) { return helper.highlight; }).forEach(function (helper) {
            _this._drawLines(helper.startX, helper.startY, helper.width, helper.height);
        });
    };
    Feedback.prototype._paintArea = function (highlight) {
        var _this = this;
        if (highlight === void 0) { highlight = true; }
        if (highlight) {
            this._helpers.filter(function (helper) { return helper.highlight; }).forEach(function (helper) {
                _this._ctx.clearRect(helper.startX, helper.startY, helper.width, helper.height);
            });
        }
        else {
            this._helpers.filter(function (helper) { return !helper.highlight; }).forEach(function (helper) {
                _this._ctx.fillStyle = 'rgba(0,0,0,1)';
                _this._ctx.fillRect(helper.startX, helper.startY, helper.width, helper.height);
            });
        }
    };
    Feedback.prototype._redraw = function (withBorder) {
        if (withBorder === void 0) { withBorder = true; }
        this._resetCanvas();
        if (withBorder) {
            this._drawHighlightLines();
        }
        this._paintArea();
        this._paintArea(false);
    };
    Feedback.prototype._drawLines = function (x, y, width, height) {
        this._ctx.strokeStyle = this._options.borderColor;
        this._ctx.lineJoin = 'bevel';
        this._ctx.lineWidth = 4;
        this._ctx.strokeRect(x, y, width, height);
        this._ctx.lineWidth = 1;
    };
    Feedback.prototype._createHelper = function (helper) {
        var _this = this;
        var h = document.createElement('div');
        h.className = helper.highlight ? 'highlight' : 'blackout';
        h.style.position = 'absolute';
        h.style.top = helper.startY + "px";
        h.style.left = helper.startX + "px";
        h.style.height = helper.height + "px";
        h.style.width = helper.width + "px";
        h.style.zIndex = '20';
        h.setAttribute('idx', "" + helper.index);
        var inner = document.createElement('div');
        inner.style.width = helper.width - 2 + "px";
        inner.style.height = helper.height - 2 + "px";
        inner.style.margin = '1px';
        var removeButton = document.createElement('img');
        removeButton.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsSAAALEgHS3X78AAAD20lEQVRYw72Xy29bVRDGf+fkJnHjhNhuEA/FgbRpWtJIVFVDebRFInKCQCCxQEIsoNBF2bSbyuV/wLuugAVQoFBKUHdVghftIipVHkgEiaQNi9KUhMqpHZPYTnztc1jc6+A48fV15ebbWWfuzOc5M9+ZEbhEKKKagCPAIaAbeBJoto9XgHngFjABjEbDMu3Gr3AROAi8DwwCO1zyzQAjwPloWM49EIFQRDUAJ4F3gXq3mSqBCXwPfBoNy6xrAqGIagc+wUp1LXAL+HirbGwiEIqofcA5IFCj4AXEgdPRsJwpS8C+7y8Af42DF5AAPizOxDqBUEQ1Al9Su7SXwyxwPBqWawCy6ODkNgQH2GPH+j8DdtENAcY2EADIAW9Hw3KukIHjTsHPDIrgB0fF40+00uDGe8CL8c5hHj0zKIJlTAw7JtJWuEEnh/E05oEOHhnoFf7G+g3Xtgl1EnFsL60vdgn//RSmg+lAKKKaDCx5dVS44SkdV0ro53bhA8HFMR1bM1GldlLAmwcIvNIjdk7PszLyu447uN0BHDGAvkopXUiS/WFMx0BweBc+pWFonFimiESdRLxhB59ZIHXhhr6XTJOv4LrPwKrKilg1URfHdEwjeKFL+PJK68uTLGZMlCERrz1LoL9H7Ly5QOrb6/qfZKZicIA9BtDuhgDAmon6cUzH8gp9tFv4zbxW12ZIHnya5oH9ou2PeZYv3ND3XAYHaDcAr1sCABkTdXmSxWxOq/4e0db1GN5gAM/kbZI/TehFF2kvhldWYbyOdBZ1bYbkX/fJ9HXiS6Qwr07rpaU0uWp9SSBV7UeGRBx8iuaOAJ7peZYDXhoOddLiqdCiWyBlAHcBn9sv6uyCG9gv2iZuk7w6rZf6Omk51i0CjQby0vjWLVoGdw2sx6HXVbrsPu/vsQpuaELHkmnyfy+RbaxHPr8bnxTldWILzBrAOPCWm39e6PPpBVaK+3zNRF0a0zHhoBNlMG4Ao1gzXFk19DdhvLyPVqc+36ATu4VPaa2v/EY8Ub4wV4FRaU+vPzvRHOjF3/+MJa/f/FJeZAo6cf1PnXipS/hDvY6DzUg0LNOFF/Ar4HXKvIjtfuH59Q7/Dk/peKU+z5ioK1PEc0rroF94QG9llgPOw8aJ6DTwHtuDr6NheQ42TkSfYXXEw8Ys8HnhxzoBe0Y7izU4PiwkgLPRsFzdRMAmMQecwhqha404cKp0N9gknfbcfoLaXscscKJ0J4DKq9lHWKvZgw6rOeA7ql3NSoh0YHXHq4DHZeA1YBhrOb3jZFiRQBGR4vV8L9Z63mIfL2Ot5zepcj3/DzZhltDZRVTuAAAAAElFTkSuQmCC';
        removeButton.style.position = 'absolute';
        removeButton.style.right = '-15px';
        removeButton.style.top = '-15px';
        removeButton.addEventListener('click', function ($event) {
            removeButton.parentNode.parentNode.removeChild(h);
            _this._helpers.splice(_this._helpers.findIndex(function (_helper) { return _helper.index === helper.index; }), 1);
            _this._helperElements.splice(_this._helperElements.findIndex(function (_helper) { return +_helper.getAttribute('idx') === helper.index; }), 1);
            _this._redraw();
        });
        h.addEventListener('mouseenter', function ($event) {
            if (_this._state.canDraw && !_this._state.isDrawing) {
                h.appendChild(inner);
                h.appendChild(removeButton);
                if (!helper.highlight) {
                    _this._resetCanvas();
                    _this._drawHighlightLines();
                    _this._paintArea();
                    _this._ctx.clearRect(helper.startX, helper.startY, helper.width, helper.height);
                    _this._ctx.fillStyle = 'rgba(0,0,0,.75)';
                    _this._ctx.fillRect(helper.startX, helper.startY, helper.width, helper.height);
                    _this._helpers.filter(function (_helper) { return !_helper.highlight && _helper.index !== helper.index; }).forEach(function (_helper) {
                        _this._ctx.fillStyle = 'rgba(0,0,0,1)';
                        _this._ctx.fillRect(_helper.startX, _helper.startY, _helper.width, _helper.height);
                    });
                }
            }
        });
        h.addEventListener('mouseleave', function ($event) {
            if (_this._state.canDraw && !_this._state.isDrawing && h.hasChildNodes()) {
                h.removeChild(inner);
                h.removeChild(removeButton);
                if (!helper.highlight) {
                    _this._redraw();
                }
            }
        });
        this._helpersContainer.appendChild(h);
        return h;
    };
    return Feedback;
}());
