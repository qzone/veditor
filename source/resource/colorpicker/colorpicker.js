/**
 * ColorPicker
 * 颜色选择器
 * 由QZFL版本移植到VEditor版本
 * @author 大师
 * @update 201207291707 sasumi
 **/
window.ColorPicker = (function (ve) {
    var pre = '<strong style="background-color:#',
        suf = ';"><span></span></strong>';
    var htmlGen = [pre, 'ffffff,000000,eeece1,1f497d,4f81bd,c0504d,9bbb59,8064a2,4bacc6,f79646'.split(',').join(suf + pre), suf].join('');
    var htmlList = [pre, 'f2f2f2,7f7f7f,ddd9c3,c6d9f0,dbe5f1,f2dcdb,ebf1dd,e5e0ec,dbeef3,fdeada,d8d8d8,595959,c4bd97,8db3e2,b8cce4,e5b9b7,d7e3bc,ccc1d9,b7dde8,fbd5b5,bfbfbf,3f3f3f,938953,548dd4,95b3d7,d99694,c3d69b,b2a2c7,92cddc,fac08f,a5a5a5,262626,494429,17365d,366092,953734,76923c,5f497a,31859b,e36c09,7f7f7f,0c0c0c,1d1b10,0f243e,244061,632423,4f6128,3f3151,205867,974806'.split(',').join(suf + pre), suf].join('');
    var htmlStandard = [pre, 'c00000,ff0000,ffc000,ffff00,92d050,00b050,00b0f0,0070c0,002060,7030a0'.split(',').join(suf + pre), suf].join('');
    var htmlGeneralPanel = ['<div class="qzfl_color_general" style="display:none"><div class="color_general">', htmlGen, '</div><div class="color_list">', htmlList, '</div><div class="color_standard">', htmlStandard, '</div><div class="set_general"><a href="javascript:;" title="点击打开高级颜色选择面板">高级颜色</a></div></div>'].join('');
    var htmlSeniorPanel = '<div class="qzfl_color_senior" style="display:none"><div class="color_panel"><span></span></div><div class="lightness_panel"><strong></strong>' + new Array(63).join('<span></span>') + '</div><div class="set_senior"><a href="javascript:;" title="点击打开常规颜色选择面板"></a></div><div class="color_value"><span class="current_color"></span>#<input type="text" value="" maxlength="6"/><button title="确认"><span>确认</span></button></div></div>';
    var rColor = /^#?(?=(?:[a-f\d]{3}|[a-f\d]{6})$)([a-f\d]{1,2})([a-f\d]{1,2})([a-f\d]{1,2})$/i,
        rSharp = /^#/,
        rFloatTag = /^(?:a|span|button|input)$/i;

	var selectorBindEvent = function(selector, eventType, handler){
		if(!selector.length){
			selector = [selector];
		}
		var domList = ve.dom.selector.apply(null, selector);
		ve.lang.each(domList, function(dom){
			ve.dom.event.add(dom, eventType, handler);
		});
	};

    var picker = function (elem, callback, opts) {
        this.options = ve.lang.extend({
            defaultTab: 0,
            needFloat: false,
            realtime: false,
            cssText: ''
        }, opts);
        this.ownerElem = elem;
        this.onColorChange = callback || function(){};
        this.isFloat = rFloatTag.test(elem.nodeName) || this.options.needFloat;
        this.init(elem);
    };

    picker.prototype.init = function (elem) {
        this.container = ve.dom.create('div', {'class': 'qzfl_color'}, htmlGeneralPanel + htmlSeniorPanel, this.isFloat ? document.body : elem);
        this.container.style.cssText = this.options.cssText + (this.isFloat ? ';display:none;position:absolute;' : '');
        this.generalPanel = this.container.firstChild;
        this.seniorPanel = this.container.lastChild;
        var me = this,
            pos, h, s, l, clrTimer, lightTimer, colorX, colorY, lightY;

        var divClrPanel = ve.dom.selector('.color_panel', this.seniorPanel)[0],
            spCursor = ve.dom.selector('.color_panel span', this.seniorPanel)[0];

        var divLightPanel = ve.dom.selector('.lightness_panel', this.seniorPanel)[0],
            spLights = ve.dom.selector('span', divLightPanel),
            stLightCursor = ve.dom.selector('.lightness_panel strong', this.seniorPanel)[0];

        var spColorDemo = ve.dom.selector('.color_value span', this.seniorPanel)[0];

		selectorBindEvent(['.qzfl_color_general', this.container], 'click', function (evt) {
            var target = evt.target || evt.srcElement;
            if (target.nodeName == 'STRONG' || (target.nodeName == 'SPAN' && (target = target.parentNode))) {
                me.color = uniform(target.style.backgroundColor);
                me.onColorChange(me.color);
                me.hide();
            }
        });

		function pickColor(evt) {
			var x = ve.dom.event.mouseX(evt) - pos[0],
			y = ve.dom.event.mouseY(evt) - pos[1];
			if (x != colorX || y != colorY) {
				colorX = x, colorY = y;
				x = Math.max(Math.min(x, 142), 0), y = Math.max(Math.min(y, 123), 0);
				ve.dom.setStyles(spCursor, {
					left: x - 4,
					top: y - 4
				});
				h = x / 142, s = 1 - y / 123;
				clearTimeout(clrTimer);
				clrTimer = setTimeout(function () {
					me.refreshSeniorPanel(hslToRgb(h, s, l = 0.5), 6);
				});
			}
		}

		function pickLight(evt) {
			var y = ve.dom.event.mouseY(evt) - pos[1];
			if (y != colorY) {
				colorY = y;
				y = Math.max(Math.min(y, 123), 0);
				ve.dom.setStyles(stLightCursor, {
					top: y - 3
				});
				l = 1 - y / 123;
				clearTimeout(lightTimer);
				lightTimer = setTimeout(function () {
					me.refreshSeniorPanel(hslToRgb(h, s, l), 4);
				});
			}
		}

		selectorBindEvent(['.qzfl_color_general strong', this.container], 'mouseenter', function (evt) {
            ve.dom.addClass(this, 'selector');
        });

		selectorBindEvent(['.qzfl_color_general strong', this.container], 'mouseleave', function (evt) {
            ve.dom.removeClass(this, 'selector');
        });

        selectorBindEvent(['.set_general a', this.container], 'click', function () {
            show(me.seniorPanel);
			hide(me.generalPanel);
            me.refreshSeniorPanel(me.color);
            ve.dom.event.preventDefault();
        });

        selectorBindEvent(['.set_senior a', this.container], 'click', function () {
            show(me.generalPanel);
			hide(me.seniorPanel);
            ve.dom.event.preventDefault();
        });

		selectorBindEvent(['.color_value button', this.seniorPanel], 'click', function () {
            me.color = me.currColor;
            me.onColorChange(me.color);
            me.hide();
        });

		ve.dom.event.add(divClrPanel, 'mousedown', function (evt) {
            pos = ve.dom.getXY(divClrPanel);
            pickColor(evt);
            capture(this);

			var mouseUp = function(){
				release(this);
				ve.dom.event.remove(this, 'mousemove');
				ve.dom.event.remove(this, 'mouseup');
			};
			var el = document;
			ve.dom.event.add(el, 'mousemove', pickColor);
			ve.dom.event.add(el, 'mouseup', mouseUp);
        });

        ve.dom.event.add(divLightPanel, 'mousedown', function (evt) {
            pos = ve.dom.getXY(divLightPanel);
            pickLight(evt);
            capture(this);

			var mouseUp = function(){
				release(this);
				ve.dom.event.remove(this, 'mousemove');
				ve.dom.event.remove(this, 'mouseup');
			};

			var el = document;
			ve.dom.event.add(el, 'mousemove', pickLight);
			ve.dom.event.add(el, 'mouseup', mouseUp);
        });

		selectorBindEvent(['.color_value input', this.seniorPanel], 'keyup', function (evt) {
            var code = evt.keyCode || evt.charcode,
                color = this.value;
            if (color.length == 6 || (color.length == 3 && code == 13)) {
                if (me.refreshSeniorPanel(me.currColor = '#' + color.toLowerCase(), 3)) {
                } else {
                    alert('您输入的颜色值不正确。');
                }
            }
        });

        this.refreshSeniorPanel = function (color, except) {
            except = except == undefined ? 7 : except;
            if (rColor.test(color)) {
                me.currColor = color;
                var arHsl = rgbToHsl(color),
                    colors;
                h = arHsl[0], s = arHsl[1], l = arHsl[2];
                if (except & 1) {
					ve.dom.setStyles(spCursor, {
						top: (h * 142 - 4) + 'px',
						left: ((1 - s) * 123 - 4) + 'px'
					});
                }
                if (except & 2) {
                    colors = getLightPanelHtml(color);
                    hide(divLightPanel);
					ve.lang.each(spLights, function (el, i) {
                        el.style.backgroundColor = colors[i];
                    });

					stLightCursor.style.top = (123 * (1 - l) - 3) + 'px';
                    show(divLightPanel);
                }
                if (except & 4) {
					ve.dom.selector('.color_value input', this.seniorPanel)[0].value = color.replace(rSharp, '');
                }
                spColorDemo.style.backgroundColor = color;
                return color;
            }
            return null;
        };
        this.currColor = this.color = '#cccccc';
        this.refreshSeniorPanel(this.color);
        show([this.generalPanel, this.seniorPanel][this.options.defaultTab % this.container.childNodes.length]);
    };

    picker.prototype.show = function (color) {
        if (this.isFloat) {
            var pos = ve.dom.getRegion(this.ownerElem);
            this.container.style.left = pos.left + 'px';
            this.container.style.top = pos.top + pos.height + 'px';
            show(this.container);
            var me = this;

			ve.dom.event.add(document, 'click', function (evt) {
                var target = ve.dom.event.getTarget(evt);
                if (!(ve.dom.contains(me.ownerElem, target) || ve.dom.contains(me.container, target)) && target != me.ownerElem && target != me.container) {
                    me.hide();
					ve.dom.event.remove(document, 'click', arguments.callee);
                }
            });
        }
        var m, color = uniform(color);
        if (m = rColor.exec(color = String(color))) {
            color = (color.length < 6 ? ([m[1], m[1], m[2], m[2], m[3], m[3]]) : m.slice(1)).join('');
            this.refreshSeniorPanel(color);
        }
    };

    picker.prototype.hide = function () {
        if (this.isFloat) {
            hide(this.container);
        }
    };

    function getLightPanelHtml(color) {
        var ar = rgbToHsl(color),
            h = ar[0],
            s = ar[1],
            num, i = num = 62;
        ar.length = 0;
        while (i) {
            ar.push(hslToRgb(h, s, --i / num));
        }
        return ar;
    }

    function uniform(color) {
        if (String(color).slice(0, 3) == 'rgb') {
            var ar = color.slice(4, - 1).split(','),
                r = parseInt(ar[0]),
                g = parseInt(ar[1]),
                b = parseInt(ar[2]);
            return ['#', r < 16 ? '0' : '', r.toString(16), g < 16 ? '0' : '', g.toString(16), b < 16 ? '0' : '', b.toString(16)].join('');
        }
        return color;
    }

    function hslToRgb(h, s, l) {
        var r, g, b;
        if (s == 0) {
            r = g = b = l;
        } else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return uniform(['rgb(', Math.round(r * 255), ', ', Math.round(g * 255), ', ', Math.round(b * 255), ')'].join(''));
    }

    function rgbToHsl(r, g, b) {
        if (typeof(r) == 'string') {
            return arguments.callee.apply(null, ve.dom.convertHexColor(r));
        }
        r /= 255, g /= 255, b /= 255;
        var max = Math.max(r, g, b),
            min = Math.min(r, g, b),
            h = 0,
            s = 0,
            l = (max + min) / 2,
            d, sum = max + min;
        if (d = max - min) {
            s = l > 0.5 ? d / (2 - sum) : d / sum;
            h = (max == r ? ((g - b) / d + (g < b ? 6 : 0)) : max == g ? ((b - r) / d + 2) : ((r - g) / d + 4)) / 6;
        }
        return [h, s, l];
    }

    function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    function capture(elem) {
        elem.setCapture ? elem.setCapture() : window.captureEvents(Event.MOUSEMOVE | Event.MOUSEUP);
    }

    function release(elem) {
        elem.releaseCapture ? elem.releaseCapture() : window.releaseEvents(Event.MOUSEMOVE | Event.MOUSEUP);
    }

    function show(elem) {
        elem.style.display = '';
    }

    function hide(elem) {
        elem.style.display = 'none';
    }

	return picker;
})(VEditor);