/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * See the License for the specific language governing rights and
 * limitations under the License.
 *
 * The Original Code is Bespin.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Bespin Team (bespin@mozilla.com)
 *
 * ***** END LICENSE BLOCK ***** */

var SC = require('sproutcore');

var NIB_ARROW_PADDING_BEFORE    = 3;
var NIB_ARROW_PADDING_AFTER     = 5;
var NIB_LENGTH                  = 15;
var NIB_PADDING                 = 8;    // 15/2

// The fancy custom Bespin scroll bars.
exports.BespinScrollerView = SC.View.extend({
    classNames: ['bespin-scroller-view'],

    _mouseDownScreenPoint: null,
    _mouseDownValue: null,
    _isMouseOver: false,

    _value: 0,

    _bespinScrollerView_valueDidChange: function() {
        SC.RunLoop.begin();
        this.set('layerNeedsUpdate', true);
        SC.RunLoop.end();
    }.observes('value'),

    _bespinScrollerView_maximumDidChange: function() {
        SC.RunLoop.begin();
        this.set('layerNeedsUpdate', true);
        SC.RunLoop.end();
    }.observes('maximum'),

    // TODO: Make this a real SproutCore theme (i.e. an identifier that gets
    // prepended to CSS properties), perhaps?
    theme: {
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

    /**
     * @property
     * The thickness of this scroll bar. The default is
     * SC.NATURAL_SCROLLER_THICKNESS (16 as of this writing on the desktop).
     */
    scrollerThickness: SC.NATURAL_SCROLLER_THICKNESS,

    /**
     * @property
     * The minimum size of the scroll bar handle/knob.
     */
    minimumHandleSize: 20,

    /**
     * @property
     * The amount to scroll when the nibs/arrows are clicked.
     */
    lineHeight: 15,

    /**
     * @property
     * Specifies the direction of the scroll bar: one of SC.LAYOUT_HORIZONTAL
     * or SC.LAYOUT_VERTICAL.
     *
     * Changes to this value after the view has been created have no effect.
     */
    layoutDirection: SC.LAYOUT_VERTICAL,

    /**
     * @property
     * Specifies whether the scroll bar is enabled. Even if this property is
     * set to YES, the scroll bar will still be disabled if the scroll bar is
     * too large for the maximum value.
     */
    isEnabled: true,

    /**
     * @property{String}
     * The property of the owning view that the scroll bar should modify
     * whenever its value changes. By default the scroll bar updates
     * verticalScrollOffset if its layoutDirection is SC.LAYOUT_VERTICAL or
     * horizontalScrollOffset if its layoutDirection is SC.LAYOUT_HORIZONTAL.
     * Read-only.
     */
    ownerScrollValueKey: function() {
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:    return 'verticalScrollOffset';
        case SC.LAYOUT_HORIZONTAL:  return 'horizontalScrollOffset';
        }
        return null;
    }.property('layoutDirection').cacheable(),

    /**
     * @property{Number}
     * The length of the gutter, equal to gutterFrame.width or
     * gutterFrame.height depending on the scroll bar's layout direction.
     * Read-only.
     */
    gutterLength: function() {
        var gutterFrame = this.get('gutterFrame');
        var gutterLength;
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:  gutterLength = gutterFrame.width;   break;
        case SC.LAYOUT_VERTICAL:    gutterLength = gutterFrame.height;  break;
        }
        return gutterLength;
    }.property('gutterFrame', 'layoutDirection').cacheable(),

    /**
     * @property{Number}
     * The length of the entire scroll bar, equal to frame.width or
     * frame.height depending on the scroll bar's layout direction. Read-only.
     */
    frameLength: function() {
        var frame = this.get('frame');
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:  return frame.width;
        case SC.LAYOUT_VERTICAL:    return frame.height;
        }
    }.property('frame', 'layoutDirection').cacheable(),

    /**
     * @property{Number}
     * The actual maximum value, which will be less than the maximum due to
     * accounting for the frame length. Read-only.
     */
    maximumValue: function() {
        return Math.max(this.get('maximum') - this.get('frameLength'), 0);
    }.property('maximum', 'frameLength').cacheable(),

    /**
     * @property
     * The current position that the scroll bar is scrolled to.
     */
    value: function(key, value) {
        var maximumValue = this.get('maximumValue');
        if (value !== undefined) {
            if (value < 0)
                value = 0;
            else if (value > maximumValue)
                value = maximumValue;

            this._value = value;
        } else {
            return Math.min(this._value || 0, maximumValue);
        }
    }.property('maximumValue').cacheable(),

    /**
     * @property
     * The dimensions of the gutter (the middle area between the buttons, which
     * contains the handle or knob). Read-only.
     */
    gutterFrame: function() {
        var frame = this.get('frame');
        var scrollerThickness = this.get('scrollerThickness');
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
            return {
                x:      0,
                y:      NIB_LENGTH,
                width:  scrollerThickness,
                height: Math.max(0, frame.height - NIB_LENGTH * 2)
            };
        case SC.LAYOUT_HORIZONTAL:
            return {
                x:      NIB_LENGTH,
                y:      0,
                width:  Math.max(0, frame.width - NIB_LENGTH * 2),
                height: scrollerThickness
            };
        }
    }.property('frame', 'scrollerThickness', 'layoutDirection').cacheable(),

    /**
     * @property
     * The dimensions of the handle or knob. Read-only.
     */
    handleFrame: function() {
        var value = this.get('value');
        var maximum = this.get('maximum');
        var frame = this.get('frame');
        var gutterFrame = this.get('gutterFrame');
        var scrollerThickness = this.get('scrollerThickness');

        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
            return {
                x:      0,
                y:      NIB_LENGTH + value * gutterFrame.height / maximum,
                width:  scrollerThickness,
                height: frame.height * gutterFrame.height / maximum
            };
        case SC.LAYOUT_HORIZONTAL:
            return {
                x:      NIB_LENGTH + value * gutterFrame.width / maximum,
                y:      0,
                width:  frame.width * gutterFrame.width / maximum,
                height: scrollerThickness
            };
        }
    }.property('value', 'maximum', 'gutterFrame', 'scrollerThickness',
        'layoutDirection').cacheable(),
 
    /**
     * @property{Number}
     * The maximum value for the scroll bar.
     *
     * TODO: When set to a value less than the width or height of the knob, the
     * scroll bar is disabled.
     *
     */
    maximum: 0,

    _segmentForMouseEvent: function(evt) {
        var point = this.convertFrameFromView({ x: evt.pageX, y: evt.pageY });
        var frame = this.get('frame');

        var layoutDirection = this.get('layoutDirection');
        switch (layoutDirection) {
        case SC.LAYOUT_HORIZONTAL:
            if (point.x < NIB_LENGTH)
                return 'nib-start';
            if (point.x >= frame.width - NIB_LENGTH)
                return 'nib-end';
            break;
        case SC.LAYOUT_VERTICAL:
            if (point.y < NIB_LENGTH)
                return 'nib-start';
            if (point.y >= frame.height - NIB_LENGTH)
                return 'nib-end';
            break;
        }

        var handleFrame = this.get('handleFrame');
        if (point.x >= handleFrame.x && point.y >= handleFrame.y
                && point.x < handleFrame.x + handleFrame.width
                && point.y < handleFrame.y + handleFrame.height)
            return 'handle';

        switch (layoutDirection) {
        case SC.LAYOUT_HORIZONTAL:
            if (point.x < handleFrame.x)
                return 'gutter-before';
            else if (point.x >= handleFrame.x + handleFrame.width)
                return 'gutter-after';
            break;
        case SC.LAYOUT_VERTICAL:
            if (point.y < handleFrame.y)
                return 'gutter-before';
            else if (point.y >= handleFrame.y + handleFrame.height)
                return 'gutter-after';
            break;
        }

        console.assert(false, "_segmentForMouseEvent: point ", point,
            " outside view with handle frame ", handleFrame, " and frame ",
            frame);
    },

    mouseEntered: function(evt) {
        SC.RunLoop.begin();
        this._isMouseOver = true;
        this.set('layerNeedsUpdate', true);
        SC.RunLoop.end();
    },

    mouseExited: function(evt) {
        SC.RunLoop.begin();
        this._isMouseOver = false;
        this.set('layerNeedsUpdate', true);
        SC.RunLoop.end();
    },

    mouseWheel: function(evt) {
        SC.RunLoop.begin();
        var delta;
        switch (this.get('layoutDirection')) {
        case SC.LAYOUT_HORIZONTAL:  delta = evt.wheelDeltaX;    break;
        case SC.LAYOUT_VERTICAL:    delta = evt.wheelDeltaY;    break;
        }
        this.set('value', this.get('value') + 2*delta);
        SC.RunLoop.end();
    },

    mouseDown: function(evt) {
        SC.RunLoop.begin();
        var value = this.get('value');
        var gutterLength = this.get('gutterLength');

        switch (this._segmentForMouseEvent(evt)) {
        case 'nib-start':
            this.set('value', value - this.get('lineHeight'));
            break;
        case 'nib-end':
            this.set('value', value + this.get('lineHeight'));
            break;
        case 'gutter-before':
            this.set('value', value - gutterLength);
            break;
        case 'gutter-after':
            this.set('value', value + gutterLength);
            break;
        case 'handle':
            switch (this.get('layoutDirection')) {
            case SC.LAYOUT_HORIZONTAL:
                this._mouseDownScreenPoint = evt.clientX;
                break;
            case SC.LAYOUT_VERTICAL:
                this._mouseDownScreenPoint = evt.clientY;
                break;
            }
            break;
        }
        SC.RunLoop.end();
    },

    mouseUp: function(evt) {
        this._mouseDownScreenPoint = null;
        this._mouseDownValue = null;
    },

    mouseMoved: function(evt) {
        SC.RunLoop.begin();
        if (this._mouseDownScreenPoint !== null) {
            var eventDistance;
            switch (this.get('layoutDirection')) {
            case SC.LAYOUT_HORIZONTAL:  eventDistance = evt.clientX;    break;
            case SC.LAYOUT_VERTICAL:    eventDistance = evt.clientY;    break;
            }
            var eventDelta = eventDistance - this._mouseDownScreenPoint;

            var maximum = this.get('maximum');
            var gutterLength = this.get('gutterLength');

            this.set('value', this.get('value')
                + eventDelta * maximum / gutterLength);

            this._mouseDownScreenPoint = eventDistance;
        }
        SC.RunLoop.end();
    },

    _paintNib: function(ctx) {
        var theme = this.get('theme');
        var fillStyle, arrowStyle, strokeStyle;
        if (this._isMouseOver) {
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

    _paintNibs: function(ctx) {
        var scrollerThickness = this.get('scrollerThickness');

        // Starting nib
        ctx.save();
        ctx.translate(NIB_PADDING, scrollerThickness / 2);
        ctx.rotate(Math.PI * 1.5);
        ctx.moveTo(0, 0);
        this._paintNib(ctx);
        ctx.restore();

        // Ending nib
        ctx.save();
        ctx.translate(this.get('frameLength') - NIB_PADDING,
            scrollerThickness / 2);
        ctx.rotate(Math.PI * 0.5);
        ctx.moveTo(0, 0);
        this._paintNib(ctx);
        ctx.restore();
    },

    _paint: function() {
        var canvas = this.$('canvas')[0];
        var frame = this.get('frame');
        if (canvas.width !== frame.width)
            canvas.width = frame.width;
        if (canvas.height !== frame.height)
            canvas.height = frame.height;

        var ctx = canvas.getContext('2d');
        
        var alpha = (ctx.globalAlpha) ? ctx.globalAlpha : 1;

        // Clear out the canvas.
        var theme = this.get('theme');
        ctx.fillStyle = theme.backgroundStyle;
        ctx.fillRect(0, 0, frame.width, frame.height);

        if (this.get('isEnabled') === false || gutterLength <= handleLength)
            return; // Don't display the scroll bar.        
    
        ctx.save();

        var handleFrame = this.get('handleFrame');
        var layoutDirection = this.get('layoutDirection');
        var gutterFrame = this.get('gutterFrame');
        var gutterLength = this.get('gutterLength');

        var handleDistance, handleLength;
        switch (layoutDirection) {
        case SC.LAYOUT_VERTICAL:
            handleDistance = handleFrame.y;
            handleLength = handleFrame.height;

            // The rest of the painting code assumes the scroll bar is
            // horizontal. Create that fiction by installing a 90 degree
            // rotation.
            ctx.translate(gutterFrame.width, 0);
            ctx.rotate(Math.PI * 0.5);
            break;

        case SC.LAYOUT_HORIZONTAL:
            handleDistance = handleFrame.x;
            handleLength = handleFrame.width;
            break;
        }

        ctx.save();

        var scrollerThickness = this.get('scrollerThickness');
        var halfThickness = scrollerThickness / 2;

        ctx.beginPath();
        ctx.arc(handleDistance + halfThickness, 0 + halfThickness, halfThickness,
            Math.PI / 2, 3 * (Math.PI / 2), false);
        ctx.arc(handleDistance + handleLength - halfThickness, 0 + halfThickness, halfThickness,
            3 * (Math.PI / 2), Math.PI / 2, false);
        ctx.lineTo(handleDistance + halfThickness, 0 + scrollerThickness);
        ctx.closePath();

        var gradient = ctx.createLinearGradient(handleDistance, 0,
            handleDistance, 0 + scrollerThickness);
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

        ctx.save();
        ctx.clip();

        ctx.fillStyle = theme.scrollBarFillStyle.replace(/%a/, alpha);
        ctx.beginPath();
        ctx.moveTo(handleDistance + (halfThickness * 0.4), 0 + (halfThickness * 0.6));
        ctx.lineTo(handleDistance + (halfThickness * 0.9), 0 + (scrollerThickness * 0.4));
        ctx.lineTo(handleDistance, 0 + (scrollerThickness * 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(handleDistance + handleLength - (halfThickness * 0.4),
            0 + (halfThickness * 0.6));
        ctx.lineTo(handleDistance + handleLength - (halfThickness * 0.9),
            0 + (scrollerThickness * 0.4));
        ctx.lineTo(handleDistance + handleLength, 0 + (scrollerThickness * 0.4));
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        ctx.beginPath();
        ctx.arc(handleDistance + halfThickness, 0 + halfThickness, halfThickness,
            Math.PI / 2, 3 * (Math.PI / 2), false);
        ctx.arc(handleDistance + handleLength - halfThickness, 0 + halfThickness, halfThickness,
            3 * (Math.PI / 2), Math.PI / 2, false);
        ctx.lineTo(handleDistance + halfThickness, 0 + scrollerThickness);
        ctx.closePath();

        ctx.strokeStyle = theme.scrollTrackStrokeStyle;
        ctx.stroke();

        ctx.restore();

        this._paintNibs(ctx);

        ctx.restore();
    },

    didCreateLayer: function() {
        this._paint();
    },

    render: function(context, firstTime) {
        if (!firstTime) {
            this._paint();
            return;
        }

        // FIXME: doesn't work properly if not visible --pcw
        var frame = this.get('frame');
        context.push('<canvas width="%@" height="%@">'.fmt(frame.width,
            frame.height));
    }
});

