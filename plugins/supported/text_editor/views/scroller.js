/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var util = require('bespin:util/util');
var console = require('bespin:console').console;

var CanvasView = require('views/canvas').CanvasView;

var LINE_HEIGHT                 = 15;
var MINIMUM_HANDLE_SIZE         = 20;
var NIB_ARROW_PADDING_BEFORE    = 3;
var NIB_ARROW_PADDING_AFTER     = 5;
var NIB_LENGTH                  = 15;
var NIB_PADDING                 = 8;    // 15/2

var LAYOUT_HORIZONTAL = exports.LAYOUT_HORIZONTAL = 0;
var LAYOUT_VERTICAL = exports.LAYOUT_VERTICAL = 1;

exports.ScrollerCanvasView = function(editor, layoutDirection) {
    CanvasView.call(this, editor.container);
    this.editor = editor;
    this.layoutDirection = layoutDirection;
};

exports.ScrollerCanvasView.prototype = new CanvasView();

util.mixin(exports.ScrollerCanvasView.prototype, {
    lineHeight: 20,

    proportion: 0,

    /**
     * @property
     * Specifies the direction of the scroll bar: one of SC.LAYOUT_HORIZONTAL
     * or SC.LAYOUT_VERTICAL.
     *
     * Changes to this value after the view has been created have no effect.
     */
    layoutDirection: LAYOUT_VERTICAL,

    _isVisible: false,

    set isVisible(isVisible) {
        if (this._isVisible === isVisible) {
            return;
        }

        this._isVisible = isVisible;
        this.domNode.style.display = isVisible ? 'block' : 'none';
        if (isVisible) {
            this.setNeedsDisplay();
        }
    },

    _maximum: 0,

    set maximum(maximum) {
        if (this._value > this._maximum) {
            this._value = this._maximum;
        }

        if (maximum === this._maximum) {
            return;
        }

        this._maximum = maximum;
        this.setNeedsDisplay();
    },

    _value: 0,

    set value(value) {
        if (value < 0) {
            value = 0;
        } else if (value > this._maximum) {
            value = this._maximum;
        }

        if (value === this._value) {
            return;
        }

        this._value = value;
        this.setNeedsDisplay();
    },

    /**
     * @property
     * The dimensions of transparent space inside the frame, given as an object
     * with 'left', 'bottom', 'top', and 'right' properties.
     *
     * Note that the scrollerThickness property includes the padding on the
     * sides of the bar.
     */
    padding: { left: 0, bottom: 0, top: 0, right: 0 },

    _mouseDownScreenPoint: null,
    _mouseDownValue: null,
    _isMouseOver: false,
    _scrollTimer: null,
    _mouseEventPosition: null,
    _mouseOverHandle: false,

    // TODO: Make this a real SproutCore theme (i.e. an identifier that gets
    // prepended to CSS properties), perhaps?
    theme: {
        scrollerThickness: 17,

        backgroundStyle: "#2A211C",
        partialNibStyle: "rgba(100, 100, 100, 0.3)",
        partialNibArrowStyle: "rgba(255, 255, 255, 0.3)",
        partialNibStrokeStyle: "rgba(150, 150, 150, 0.3)",
        fullNibStyle: "rgb(100, 100, 100)",
        fullNibArrowStyle: "rgb(255, 255, 255)",
        fullNibStrokeStyle: "rgb(150, 150, 150)",
        scrollTrackFillStyle: "rgba(50, 50, 50, 0.8)",
        scrollTrackStrokeStyle: "rgb(150, 150, 150)",
        scrollBarFillStyle: "rgba(0, 0, 0, %a)",
        scrollBarFillGradientTopStart: "rgba(90, 90, 90, %a)",
        scrollBarFillGradientTopStop: "rgba(40, 40, 40, %a)",
        scrollBarFillGradientBottomStart: "rgba(22, 22, 22, %a)",
        scrollBarFillGradientBottomStop: "rgba(44, 44, 44, %a)"
    },

    _drawNib: function(ctx) {
        var theme = this.theme;
        var fillStyle, arrowStyle, strokeStyle;
        if (this._isHighlighted()) {
            fillStyle   = theme.fullNibStyle;
            arrowStyle  = theme.fullNibArrowStyle;
            strokeStyle = theme.fullNibStrokeStyle;
        } else {
            fillStyle   = theme.partialNibStyle;
            arrowStyle  = theme.partialNibArrowStyle;
            strokeStyle = theme.partialNibStrokeStyle;
        }

        var midpoint = Math.floor(NIB_LENGTH / 2);

        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(0, 0, Math.floor(NIB_LENGTH / 2), 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();

        ctx.fillStyle = arrowStyle;
        ctx.beginPath();
        ctx.moveTo(0, -midpoint + NIB_ARROW_PADDING_BEFORE);
        ctx.lineTo(-midpoint + NIB_ARROW_PADDING_BEFORE,
            midpoint - NIB_ARROW_PADDING_AFTER);
        ctx.lineTo(midpoint - NIB_ARROW_PADDING_BEFORE,
            midpoint - NIB_ARROW_PADDING_AFTER);
        ctx.closePath();
        ctx.fill();
    },

    _drawNibs: function(ctx) {
        var thickness = this._getClientThickness();
        var parentView = this.parentView;
        var value = this.value;
        var maximum = this._maximum;
        var highlighted = this._isHighlighted();

        // Starting nib
        if (highlighted || value !== 0) {
            ctx.save();
            ctx.translate(NIB_PADDING, thickness / 2);
            ctx.rotate(Math.PI * 1.5);
            ctx.moveTo(0, 0);
            this._drawNib(ctx);
            ctx.restore();
        }

        // Ending nib
        if (highlighted || value !== maximum) {
            ctx.save();
            ctx.translate(this._getClientLength() - NIB_PADDING,
                thickness / 2);
            ctx.rotate(Math.PI * 0.5);
            ctx.moveTo(0, 0);
            this._drawNib(ctx);
            ctx.restore();
        }
    },

    // Returns the frame of the scroll bar, not counting any padding.
    _getClientFrame: function() {
        var frame = this.frame;
        var padding = this.padding;
        return {
            x:      padding.left,
            y:      padding.top,
            width:  frame.width - (padding.left + padding.right),
            height: frame.height - (padding.top + padding.bottom)
        };
    },

    // Returns the length of the scroll bar, not counting any padding. Equal to
    // the width or height of the client frame, depending on the layout
    // direction.
    _getClientLength: function() {
        var clientFrame = this._getClientFrame();
        switch (this.layoutDirection) {
        case LAYOUT_HORIZONTAL:
            return clientFrame.width;
        case LAYOUT_VERTICAL:
            return clientFrame.height;
        default:
            console.error("unknown layout direction");
            return null;
        }
    },

    // Returns the thickness of the scroll bar, not counting any padding.
    _getClientThickness: function() {
        var padding = this.padding;
        var scrollerThickness = this.theme.scrollerThickness;

        switch (this.layoutDirection) {
        case LAYOUT_VERTICAL:
            return scrollerThickness - (padding.left + padding.right);
        case LAYOUT_HORIZONTAL:
            return scrollerThickness - (padding.top + padding.bottom);
        default:
            console.error("unknown layout direction");
            return null;
        }
    },

    // The length of the scroll bar, counting the padding. Equal to frame.width
    // or frame.height, depending on the layout direction of the bar.
    // Read-only.
    _getFrameLength: function() {
        switch (this.layoutDirection) {
        case LAYOUT_HORIZONTAL:
            return this.frame.width;
        case LAYOUT_VERTICAL:
            return this.frame.height;
        default:
            console.error("unknown layout direction");
            return null;
        }
    },

    // The dimensions of the gutter (the middle area between the buttons, which
    // contains the handle or knob).
    _getGutterFrame: function() {
        var clientFrame = this._getClientFrame();
        var thickness = this._getClientThickness();
        switch (this.layoutDirection) {
        case LAYOUT_VERTICAL:
            return {
                x:      clientFrame.x,
                y:      clientFrame.y + NIB_LENGTH,
                width:  thickness,
                height: Math.max(0, clientFrame.height - 2*NIB_LENGTH)
            };
        case LAYOUT_HORIZONTAL:
            return {
                x:      clientFrame.x + NIB_LENGTH,
                y:      clientFrame.y,
                width:  Math.max(0, clientFrame.width - 2*NIB_LENGTH),
                height: thickness
            };
        default:
            console.error("unknown layout direction");
            return null;
        }
    },

    // The length of the gutter, equal to gutterFrame.width or
    // gutterFrame.height depending on the scroll bar's layout direction.
    _getGutterLength: function() {
        var gutterFrame = this._getGutterFrame();
        var gutterLength;
        switch (this.layoutDirection) {
        case LAYOUT_HORIZONTAL:
            gutterLength = gutterFrame.width;
            break;
        case LAYOUT_VERTICAL:
            gutterLength = gutterFrame.height;
            break;
        default:
            console.error("unknown layout direction");
            break;
        }
        return gutterLength;
    },

    // Returns the dimensions of the handle or knob.
    _getHandleFrame: function() {
        var gutterFrame = this._getGutterFrame();
        var handleOffset = this._getHandleOffset();
        var handleLength = this._getHandleLength();
        switch (this.layoutDirection) {
        case LAYOUT_VERTICAL:
            return {
                x:      gutterFrame.x,
                y:      gutterFrame.y + handleOffset,
                width:  gutterFrame.width,
                height: handleLength
            };
        case LAYOUT_HORIZONTAL:
            return {
                x:      gutterFrame.x + handleOffset,
                y:      gutterFrame.y,
                width:  handleLength,
                height: gutterFrame.height
            };
        }
    },

    // Returns the length of the handle or knob.
    _getHandleLength: function() {
        var gutterLength = this._getGutterLength();
        return Math.max(gutterLength * this.proportion, MINIMUM_HANDLE_SIZE);
    },

    // Returns the starting offset of the handle or knob.
    _getHandleOffset: function() {
        var maximum = this._maximum;
        if (maximum === 0) {
            return 0;
        }

        var gutterLength = this._getGutterLength();
        var handleLength = this._getHandleLength();
        var emptyGutterLength = gutterLength - handleLength;

        return emptyGutterLength * this._value / maximum;
    },

    // Determines whether the scroll bar is highlighted.
    _isHighlighted: function() {
        return this._isMouseOver === true ||
            this._mouseDownScreenPoint !== null;
    },

    _segmentForMouseEvent: function(evt) {
        var point = this.convertFrameFromView({ x: evt.pageX, y: evt.pageY });
        var clientFrame = this._getClientFrame();
        var padding = this.padding;

        if (!SC.pointInRect(point, clientFrame)) {
            return null;
        }

        var layoutDirection = this.layoutDirection;
        switch (layoutDirection) {
        case LAYOUT_HORIZONTAL:
            if ((point.x - padding.left) < NIB_LENGTH) {
                return 'nib-start';
            } else if (point.x >= clientFrame.width - NIB_LENGTH) {
                return 'nib-end';
            }
            break;
        case LAYOUT_VERTICAL:
            if ((point.y - padding.top) < NIB_LENGTH) {
                return 'nib-start';
            } else if (point.y >= clientFrame.height - NIB_LENGTH) {
                return 'nib-end';
            }
            break;
        default:
            console.error("unknown layout direction");
            break;
        }

        var handleFrame = this._getHandleFrame();
        if (SC.pointInRect(point, handleFrame)) {
            return 'handle';
        }

        switch (layoutDirection) {
        case LAYOUT_HORIZONTAL:
            if (point.x < handleFrame.x) {
                return 'gutter-before';
            } else if (point.x >= handleFrame.x + handleFrame.width) {
                return 'gutter-after';
            }
            break;
        case LAYOUT_VERTICAL:
            if (point.y < handleFrame.y) {
                return 'gutter-before';
            } else if (point.y >= handleFrame.y + handleFrame.height) {
                return 'gutter-after';
            }
            break;
        default:
            console.error("unknown layout direction");
            break;
        }

        console.error("_segmentForMouseEvent: point ", point,
            " outside view with handle frame ", handleFrame,
            " and client frame ", clientFrame);
        return null;
    },

    /**
     * Adjusts the canvas view's frame to match the parent container's frame.
     */
    adjustFrame: function() {
        var parentFrame = this.frame;
        this.set('layout', {
            left:   0,
            top:    0,
            width:  parentFrame.width,
            height: parentFrame.height
        });
    },

    drawRect: function(rect, ctx) {
        // Only draw when visible.
        if (!this._isVisible) {
            return;
        }

        var alpha = (ctx.globalAlpha) ? ctx.globalAlpha : 1;
        var theme = this.theme;
        var highlighted = this._isHighlighted();

        var frame = this.frame;
        ctx.clearRect(0, 0, frame.width, frame.height);

        // Begin master drawing context
        ctx.save();

        // Translate so that we're only drawing in the padding.
        var padding = this.padding;
        ctx.translate(padding.left, padding.top);

        var handleFrame = this._getHandleFrame();
        var gutterLength = this._getGutterLength();
        var thickness = this._getClientThickness();
        var halfThickness = thickness / 2;

        var layoutDirection = this.layoutDirection;
        var handleOffset = this._getHandleOffset() + NIB_LENGTH;
        var handleLength = this._getHandleLength();

        if (layoutDirection === LAYOUT_VERTICAL) {
            // The rest of the drawing code assumes the scroll bar is
            // horizontal. Create that fiction by installing a 90 degree
            // rotation.
            ctx.translate(thickness + 1, 0);
            ctx.rotate(Math.PI * 0.5);
        }

        if (gutterLength <= handleLength) {
            return; // Don't display the scroll bar.
        }

        if (!highlighted) {
            ctx.globalAlpha = 0.3;
        } else {
            // Draw the scroll track rectangle.
            var clientLength = this._getClientLength();
            ctx.fillStyle = theme.scrollTrackFillStyle;
            ctx.fillRect(NIB_PADDING + 0.5, 0.5,
                clientLength - 2*NIB_PADDING, thickness - 1);
            ctx.strokeStyle = theme.scrollTrackStrokeStyle;
            ctx.strokeRect(NIB_PADDING + 0.5, 0.5,
                clientLength - 2*NIB_PADDING, thickness - 1);
        }

        var buildHandlePath = function() {
            ctx.beginPath();
            ctx.arc(handleOffset + halfThickness + 0.5,                 // x
                halfThickness,                                          // y
                halfThickness - 0.5, Math.PI / 2, 3 * Math.PI / 2, false);
            ctx.arc(handleOffset + handleLength - halfThickness - 0.5,  // x
                halfThickness,                                          // y
                halfThickness - 0.5, 3 * Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(handleOffset + halfThickness + 0.5, thickness - 0.5);
            ctx.closePath();
        };
        buildHandlePath();

        // Paint the interior of the handle path.
        var gradient = ctx.createLinearGradient(handleOffset, 0, handleOffset,
            thickness);
        gradient.addColorStop(0,
            theme.scrollBarFillGradientTopStart.replace(/%a/, alpha));
        gradient.addColorStop(0.4,
            theme.scrollBarFillGradientTopStop.replace(/%a/, alpha));
        gradient.addColorStop(0.41,
            theme.scrollBarFillStyle.replace(/%a/, alpha));
        gradient.addColorStop(0.8,
            theme.scrollBarFillGradientBottomStart.replace(/%a/, alpha));
        gradient.addColorStop(1,
            theme.scrollBarFillGradientBottomStop.replace(/%a/, alpha));
        ctx.fillStyle = gradient;
        ctx.fill();

        // Begin handle shine edge context
        ctx.save();
        ctx.clip();

        // Draw the little shines in the handle.
        ctx.fillStyle = theme.scrollBarFillStyle.replace(/%a/, alpha);
        ctx.beginPath();
        ctx.moveTo(handleOffset + halfThickness * 0.4, halfThickness * 0.6);
        ctx.lineTo(handleOffset + halfThickness * 0.9, thickness * 0.4);
        ctx.lineTo(handleOffset, thickness * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(handleOffset + handleLength - (halfThickness * 0.4),
            0 + (halfThickness * 0.6));
        ctx.lineTo(handleOffset + handleLength - (halfThickness * 0.9),
            0 + (thickness * 0.4));
        ctx.lineTo(handleOffset + handleLength, 0 + (thickness * 0.4));
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        // End handle border context

        // Begin handle outline context
        ctx.save();
        buildHandlePath();
        ctx.strokeStyle = theme.scrollTrackStrokeStyle;
        ctx.stroke();
        ctx.restore();
        // End handle outline context

        if (!highlighted) {
            ctx.globalAlpha = 1.0;
        }

        this._drawNibs(ctx);

        ctx.restore();
        // End master drawing context
    },

    _repeatAction: function(method, interval) {
        var repeat = method();
        if (repeat !== false) {
            this._scrollTimer = SC.Timer.schedule({
                target: this,
                action: function() { this._repeatAction(method, 100); },
                interval: interval
            });
        }
    },

    _scrollByDelta: function(delta) {
        this._value = value + delta;
    },

    _scrollUpOneLine: function() {
        this._scrollByDelta(-this.lineHeight);
        return true;
    },

    _scrollDownOneLine: function() {
        this._scrollByDelta(this.lineHeight);
        return true;
    },

    /**
     * Scrolls the page depending on the last mouse position. Scrolling is only
     * performed if the mouse is on the segment gutter-before or -after.
     */
    _scrollPage: function() {
        switch (this._segmentForMouseEvent(this._mouseEventPosition)) {
            case 'gutter-before':
                this._scrollByDelta(this._getGutterLength() * -1);
            break;
            case 'gutter-after':
                this._scrollByDelta(this._getGutterLength());
            break;
            case null:
                // The mouse is outside of the scroller. Just wait, until it
                // comes back in.
            break;
            default:
                // Do not continue repeating this function.
                return false;
            break;
        }

        return true;
    },

    mouseDown: function(evt) {
        this._mouseEventPosition = evt;
        this._mouseOverHandle = false;

        var parentView = this.parentView;
        var value = this._value;
        var gutterLength = this._getGutterLength();

        switch (this._segmentForMouseEvent(evt)) {
        case 'nib-start':
            this._repeatAction(this._scrollUpOneLine.bind(this), 500);
            break;
        case 'nib-end':
            this._repeatAction(this._scrollDownOneLine.bind(this), 500);
            break;
        case 'gutter-before':
            this._repeatAction(this._scrollPage.bind(this), 500);
            break;
        case 'gutter-after':
            this._repeatAction(this._scrollPage.bind(this), 500);
            break;
        case 'handle':
            break;
        default:
            console.error("_segmentForMouseEvent returned an unknown value");
            break;
        }

        // The _mouseDownScreenPoint value might be needed although the segment
        // was not the handle at the moment.
        switch (parentView.get('layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:
            this._mouseDownScreenPoint = evt.pageX;
            break;
        case SC.LAYOUT_VERTICAL:
            this._mouseDownScreenPoint = evt.pageY;
            break;
        default:
            console.error("unknown layout direction");
            break;
        }
    },

    mouseDragged: function(evt) {
        var parentView = this.get('parentView');

        // Handle the segments. If the current segment is the handle or
        // nothing, then drag the handle around (as null = mouse outside of
        // scrollbar)
        var segment = this._segmentForMouseEvent(evt);
        if (segment == 'handle' || this._mouseOverHandle === true) {
            this._mouseOverHandle = true;
            if (this._scrollTimer !== null) {
                this._scrollTimer.invalidate();
                this._scrollTimer = null;
            }

            var eventDistance;
            switch (parentView.get('layoutDirection')) {
                case SC.LAYOUT_HORIZONTAL:
                    eventDistance = evt.pageX;
                    break;
                case SC.LAYOUT_VERTICAL:
                    eventDistance = evt.pageY;
                    break;
                default:
                    console.error("unknown layout direction");
                    break;
            }

            var eventDelta = eventDistance - this._mouseDownScreenPoint;

            var maximum = parentView.get('maximum');
            var oldValue = parentView.get('value');
            var gutterLength = this._getGutterLength();
            var handleLength = this._getHandleLength();
            var emptyGutterLength = gutterLength - handleLength;
            var valueDelta = maximum * eventDelta / emptyGutterLength;
            parentView.set('value', oldValue + valueDelta);

            this._mouseDownScreenPoint = eventDistance;
        }

        this._mouseEventPosition = evt;
    },

    mouseEntered: function(evt) {
        this._isMouseOver = true;
        this.setNeedsDisplay();
    },

    mouseExited: function(evt) {
        this._isMouseOver = false;
        this.setNeedsDisplay();
    },

    mouseUp: function(evt) {
        this._mouseDownScreenPoint = null;
        this._mouseDownValue = null;
        if (this._scrollTimer) {
            this._scrollTimer.invalidate();
            this._scrollTimer = null;
        }
        this.setNeedsDisplay();
    },

    mouseWheel: function(evt) {
        var parentView = this.get('parentView');

        var delta;
        switch (parentView.get('layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:
            delta = evt.wheelDeltaX;
            break;
        case SC.LAYOUT_VERTICAL:
            delta = evt.wheelDeltaY;
            break;
        default:
            console.error("unknown layout direction");
            return;
        }

        parentView.set('value', parentView.get('value') + 2*delta);
    }
});
