(function(window, document, ve, undefined) {
	var each = ve.lang.each;

	/**
	 * 编辑器dom操作类库
	 * 包含常见dom操作方法、event绑定
	 **/
	ve.dom = {
		pixelStyles : /^(top|left|bottom|right|width|height|borderWidth)$/,
		counter: 0,
		event: {
	        _eventListDictionary: {},
	        _fnSeqUID: 0,
	        _objSeqUID: 0,
	        KEYS : {
				/**
				 * 退格键
				 */
				BACKSPACE : 8,
				/**
				 * tab
				 */
				TAB : 9,
				RETURN : 13,
				ESC : 27,
				SPACE : 32,
				LEFT : 37,
				UP : 38,
				RIGHT : 39,
				DOWN : 40,
				DELETE : 46
			},
	        add: function (obj, eventType, fn, argArray) {
	            var cfn, res = false,
	                l, handlers;
	            if (!obj) {
	                return res;
	            }
	            if (!obj.eventsListUID) {
	                obj.eventsListUID = "e" + (++ve.dom.event._objSeqUID);
	            }
	            if (!(l = ve.dom.event._eventListDictionary[obj.eventsListUID])) {
	                l = ve.dom.event._eventListDictionary[obj.eventsListUID] = {};
	            }
	            if (!fn.__elUID) {
	                fn.__elUID = "e" + (++ve.dom.event._fnSeqUID) + obj.eventsListUID;
	            }
	            if (!l[eventType]) {
	                l[eventType] = {};
	            }
	            if (!l[eventType].handlers) {
	                l[eventType].handlers = {};
	            }
	            handlers = l[eventType].handlers;
	            if (typeof (handlers[fn.__elUID]) == 'function') {
	                return false;
	            }
	            cfn = function (evt) {
	                return fn.apply(obj, !argArray ? [ve.dom.event.getEvent(evt)] : ([ve.dom.event.getEvent(evt)]).concat(argArray));
	            };
	            if (obj.addEventListener) {
	                obj.addEventListener(eventType, cfn, false);
	                res = true;
	            } else if (obj.attachEvent) {
	                res = obj.attachEvent("on" + eventType, cfn);
	            } else {
	                res = false;
	            }
	            if (res) {
	                handlers[fn.__elUID] = cfn;
	            }
	            return res;
	        },

	        remove: function (obj, eventType, fn) {
	            var cfn = fn,
	                res = false,
	                l = ve.dom.event._eventListDictionary,
	                r;
	            if (!obj) {
	                return res;
	            }
	            if (!fn) {
	                return ve.dom.event.purgeEvent(obj, eventType);
	            }
	            if (obj.eventsListUID && l[obj.eventsListUID] && l[obj.eventsListUID][eventType]) {
	                l = l[obj.eventsListUID][eventType].handlers;
	                if (l && l[fn.__elUID]) {
	                    cfn = l[fn.__elUID];
	                    r = l;
	                }
	            }
	            if (obj.removeEventListener) {
	                obj.removeEventListener(eventType, cfn, false);
	                res = true;
	            } else if (obj.detachEvent) {
	                obj.detachEvent("on" + eventType, cfn);
	                res = true;
	            } else {
	                return false;
	            }
	            if (res && r && r[fn.__elUID]) {
	                delete r[fn.__elUID];
	            }
	            return res;
	        },

	        purgeEvent: function (obj, type) {
	            var l, h;
	            if (obj.eventsListUID && (l = ve.dom.event._eventListDictionary[obj.eventsListUID]) && l[type] && (h = l[type].handlers)) {
	                for (var k in h) {
	                    if (obj.removeEventListener) {
	                        obj.removeEventListener(type, h[k], false);
	                    } else if (obj.detachEvent) {
	                        obj.detachEvent('on' + type, h[k]);
	                    }
	                }
	            }
	            if (obj['on' + type]) {
	                obj['on' + type] = null;
	            }
	            if (h) {
	                l[type].handlers = null;
	                delete l[type].handlers;
	            }
	            return true;
	        },
	        getEvent: function (evt) {
	            var evt = window.event || evt || null,
	                c, _s = ve.dom.event.getEvent,
	                ct = 0;
	            if (!evt) {
	                c = arguments.callee;
	                while (c && ct < _s.MAX_LEVEL) {
	                    if ((evt = c.arguments[0]) && (typeof (evt.button) != "undefined" && typeof (evt.ctrlKey) != "undefined")) {
	                        break;
	                    }++ct;
	                    c = c.caller;
	                }
	            }
	            return evt;
	        },
	        getButton: function (evt) {
	            var e = ve.dom.event.getEvent(evt);
	            if (!e) {
	                return -1
	            }
	            if (ve.ua.ie) {
	                return e.button - Math.ceil(e.button / 2);
	            } else {
	                return e.button;
	            }
	        },
	        getTarget: function (evt) {
	            var e = ve.dom.event.getEvent(evt);
	            if (e) {
	                return e.srcElement || e.target;
	            } else {
	                return null;
	            }
	        },
	        getCurrentTarget: function (evt) {
	            var e = ve.dom.event.getEvent(evt);
	            if (e) {
	                return e.currentTarget || document.activeElement;
	            } else {
	                return null;
	            }
	        },
	        cancelBubble: function (evt) {
	            evt = ve.dom.event.getEvent(evt);
	            if (!evt) {
	                return false
	            }
	            if (evt.stopPropagation) {
	                evt.stopPropagation();
	            } else {
	                if (!evt.cancelBubble) {
	                    evt.cancelBubble = true;
	                }
	            }
	        },
	        preventDefault: function (evt) {
	            evt = ve.dom.event.getEvent(evt);
	            if (!evt) {
	                return false
	            }
	            if (evt.preventDefault) {
	                evt.preventDefault();
	            } else {
	                evt.returnValue = false;
	            }
	        },
	        cancel: function(evt){
	        	this.cancelBubble(evt);
	        	this.preventDefault(evt);
	        },

	        mouseX: function (evt) {
	            evt = ve.dom.event.getEvent(evt);
	            return evt.pageX || (evt.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft));
	        },
	        mouseY: function (evt) {
	            evt = ve.dom.event.getEvent(evt);
	            return evt.pageY || (evt.clientY + (document.documentElement.scrollTop || document.body.scrollTop));
	        },
	        getRelatedTarget: function (ev) {
	            ev = ve.dom.event.getEvent(ev);
	            var t = ev.relatedTarget;
	            if (!t) {
	                if (ev.type == "mouseout") {
	                    t = ev.toElement;
	                } else if (ev.type == "mouseover") {
	                    t = ev.fromElement;
	                } else {}
	            }
	            return t;
	        },
	        onDomReady: function (fn) {
	            var _s = ve.dom.event.onDomReady;
	            if (document.addEventListener) {
	                _s._fn = function () {
	                    fn();
	                    _s._fn = null;
	                }
	                document.addEventListener("DOMContentLoaded", _s._fn, true);
	            } else {
	                _s.pool = _s.pool || [];
	                _s._fn = function () {
	                    _s.pool.shift()();
	                    _s.pool.length == 0 && (_s._fn = null);
	                };
	                _s.pool.push(fn);
	                var src = window.location.protocol == 'https:' ? '//:' : 'javascript:void(0)';
	                document.write('<script onreadystatechange="if(this.readyState==\'complete\'){this.parentNode.removeChild(this);VEditor.dom.event.onDomReady._fn();}" defer="defer" src="' + src + '"><\/script>');
	            }
	        }
		},

		doc: document,

		get: function (id, context) {
			return id.nodeType && id || (context || document).getElementById(String(id));
		},

		insertHTML : function (element, where, html) {
			if (element.insertAdjacentHTML) {
				element.insertAdjacentHTML(where, html);
			}
			else if (typeof HTMLElement != "undefined" && !window.opera) {
				var range = element.ownerDocument.createRange();
				range.setStartBefore(element);
				var fragment = range.createContextualFragment(html);
				switch(where.toLowerCase()){
					case "beforebegin" :
						element.parentNode.insertBefore(fragment, element);
						break;
					case "afterbegin" :
						element.insertBefore(fragment, element.firstChild);
						break;
					case "beforeend" :
						element.appendChild(fragment);
						break;
					case "afterend" :
						if (!element.nextSibling) {
							element.parentNode.appendChild(fragment);
						} else {
							element.parentNode.insertBefore(fragment, element.nextSibling);
						}
						break;
				}
			}
			return {
				beforebegin: element.previousSibling,
				afterbegin: element.firstChild,
				beforeend: element.lastChild,
				afterend: element.nextSibling
			}[where];
		},

		getStyle : function(n, na, c) {
			var isIE = ve.ua.ie;
			n = this.get(n);

			if (!n)
				return false;

			// Gecko
			if (this.doc.defaultView && c) {
				// Remove camelcase
				na = na.replace(/[A-Z]/g, function(a){
					return '-' + a;
				});

				try {
					return this.doc.defaultView.getComputedStyle(n, null).getPropertyValue(na);
				} catch (ex) {
					// Old safari might fail
					return null;
				}
			}

			// Camelcase it, if needed
			na = na.replace(/-(\D)/g, function(a, b){
				return b.toUpperCase();
			});

			if (na == 'float')
				na = isIE ? 'styleFloat' : 'cssFloat';

			// IE & Opera
			if (n.currentStyle && c)
				return n.currentStyle[na];

			return n.style[na];
		},

		setStyle : function(n, na, v) {
			var t = this, e = n, isIE = ve.ua.ie;
			s = e.style;

			// Camelcase it, if needed
			na = na.replace(/-(\D)/g, function(a, b){
				return b.toUpperCase();
			});
			// Default px suffix on these
			if (t.pixelStyles.test(na) && (typeof v == 'number' || /^[\-0-9\.]+$/.test(v)))
				v += 'px';

			switch (na) {
				case 'opacity':
					// IE specific opacity
					if (isIE) {
						s.filter = v === '' ? '' : "alpha(opacity=" + (v * 100) + ")";

						if (!n.currentStyle || !n.currentStyle.hasLayout)
							s.display = 'inline-block';
					}

					// Fix for older browsers
					s[na] = s['-moz-opacity'] = s['-khtml-opacity'] = v || '';
					break;

				case 'float':
					isIE ? s.styleFloat = v : s.cssFloat = v;
					break;

				default:
					try {
						s[na] = v || '';
					} catch(e){
						//console.log('setstyle',e, s, na);
					}
			}
		},

		/**
		 * 样式字串比较
		 * @param {String} styleStr1
		 * @param {String} styleStr2
		 * @return {Boolean}
		 **/
		styleCompare: function(styleStr1, styleStr2){
			if(styleStr1 == styleStr2){
				return true;
			}

			if(!styleStr1 || !styleStr2){
				return false;
			}

			var _getStyleHash = function(str){
				var p = str.split(';');
				var hash = {};
				ve.lang.each(p, function(c){
					if(c.indexOf(':')>=0){
						var tmp = c.split(':');
						hash[ve.string.trim(tmp[0])] = ve.string.trim(tmp[1]);
					}
				});
				return hash;
			};

			var ex1 = true, ex2 = true,
				hash1 = _getStyleHash(styleStr1),
				hash2 = _getStyleHash(styleStr2);

			for(var k in hash1){
				if(!hash2[k] || hash1[k] != hash2[k]){
					ex1 = false;
					break;
				}
			}
			for(var k in hash2){
				if(!hash1[k] || hash2[k] != hash1[k]){
					ex2 = false;
					break;
				}
			}
			return ex1 && ex2;
		},

		/**
		 * 合并子节点到父节点
		 * @param {DOM} node
		 */
		mergerStyleToParent: function(node){
			var parent = node.parentNode;
            while (parent && ve.dtd.$removeEmpty[parent.tagName]) {
                if (parent.tagName == node.tagName || parent.tagName == 'A') {//针对a标签单独处理
                    //span需要特殊处理  不处理这样的情况 <span stlye="color:#fff">xxx<span style="color:#ccc">xxx</span>xxx</span>
                    if (parent.tagName == 'SPAN' && !ve.dom.styleCompare(parent.style.cssText, node.style.cssText)
					|| (parent.tagName == 'A' && node.tagName == 'SPAN')) {
                        if (ve.dom.getChildCount(parent)>1 || parent !== node.parentNode) {
                            //node.style.cssText = parent.style.cssText + ";" + node.style.cssText;
                            parent = parent.parentNode;
                            continue;
                        } else {
                            parent.style.cssText += ";" + node.style.cssText;
                            node.style.cssText = '';

                            if(node.getAttribute('glowfont')){
                            	parent.setAttribute('glowfont', node.getAttribute('glowfont'));
                            	node.removeAttribute('glowfont');
                            }
                            /**
                            if (parent.tagName == 'A') {
                                parent.style.textDecoration = 'underline';
                            }
                            **/
                        }
                    }
                    if(parent.tagName != 'A' ){
						parent === node.parentNode &&  ve.dom.remove(node, true);
                        break;
                    }
                }
                parent = parent.parentNode;
            }
		},

		/**
		 * 合并单子节点到父节点
		 * @deprecate 两个节点tagName相同才能进行该项操作，这里会忽略掉节点的attr
		 * @param {DOM} node
		 * @return {DOM}
		 */
		fixNodeDupParent: function(node){
			if(node.nodeType != 1 || (node.tagName != node.parentNode.tagName)){
				return node;
			}

			var hasOtherChild, parent = node.parentNode;
			ve.lang.each(parent.childNodes, function(child){
				if(child != node){
					if(child.nodeType == 3 && !ve.string.trim(child.nodeValue)){
						//空节点
					} else {
						hasOtherChild = true;
						return true;
					}
				}
			});

			if(!hasOtherChild){
				ve.dom.remove(node);
				return parent;
			} else {
				return node;
			}
		},

		insertAfter: function(newNode, currentNode){
			var ns = currentNode.nextSibling;
			return currentNode.parentNode[ns ? 'insertBefore' : 'appendChild'](newNode, ns);
		},

		insertBefore: function(newNode, currentNode){
			return currentNode.parentNode.insertBefore(newNode, currentNode);
		},

		isLinkNode: function(node){
			if(!node || node.nodeType != 1 || node.tagName != 'A' || node.getAttribute('uin')){
				return false;
			}
			if(ve.ua.ie){
				if(node.getAttribute('href')){
					return true;
				} else {
					var reg = new RegExp('<a[^>]*?\\shref="', 'i');
					return reg.test(node.outerHTML);
				}
			} else {
				return node.getAttribute('href') !== null;
			}
		},

		/**
		 * 查询当前节点在父节点里面的下标顺序
		 * @param  {DOM} node	   节点
		 * @param  {Boolean} normalized 是否跳过文本节点检测
		 * @return {Number}
		 */
		nodeIndex: function(node, normalized){
			var idx = 0, lastNodeType, lastNode, nodeType;
			if(node){
				for (lastNodeType = node.nodeType, node = node.previousSibling, lastNode = node; node; node = node.previousSibling){
					nodeType = node.nodeType;

					// Normalize text nodes
					if(normalized && nodeType == 3){
						if(nodeType == lastNodeType || !node.nodeValue.length){
							continue;
						}
					}
					idx++;
					lastNodeType = nodeType;
				}
			}
			return idx;
		},

		contains: function(container, child){
			return container.contains ? container != child && container.contains(child) :
				!!(container.compareDocumentPosition(child) & 16);
		},

		/**
		 * 判断指定的节点是否是第二个节点的祖先
		 *
		 * @param {object} a 对象，父节点
		 * @param {object} b 对象，子孙节点
		 * @returns {boolean} true即b是a的子节点，否则为false
		 */
		isAncestor : function(a, b) {
			return a && b && a != b && ve.dom.contains(a, b);
		},

		/**
		 * 找共同的老豆
		 * @param {DOM} a
		 * @param {DOM} b
		 * @return {DOM}
		 **/
		findCommonAncestor: function(a, b){
			var ps = a, pe;
			while (ps) {
				pe = b;
				while (pe && ps != pe){
					pe = pe.parentNode;
				}
				if (ps == pe){
					break;
				}
				ps = ps.parentNode;
			}
			if (!ps && a.ownerDocument){
				return a.ownerDocument.documentElement;
			}
			return ps;
		},

		setStyles: function(el, styles) {
			var t = this;
			each(styles, function(n, i) {
				ve.dom.setStyle(el, i, n);
			});
		},

		create: function (n, a, h, p) {
			var t = this, e = n, k;
			e = typeof n == 'string' ? t.doc.createElement(n) : n;
			t.setAttrs(e, a);
			if (h) {
				if (h.nodeType)
					e.appendChild(h);
				else
					t.setHTML(e, h);
			}

			return p && p.nodeType ? p.appendChild(e) : e;
		},

		/**
		 * 转换颜色
		 * @depreacte 这里忽略了alpha argb的情况
		 * @param {String} color
		 * @return {String}
		 **/
		convertHexColor: function (color) {
            color = String(color || '');
            color.charAt(0) == '#' && (color = color.substring(1));
            color.length == 3 && (color = color.replace(/([0-9a-f])/ig, '$1$1'));
            return color.length == 6 ? [parseInt(color.substr(0, 2), 16), parseInt(color.substr(2, 2), 16), parseInt(color.substr(4, 2), 16)] : [0, 0, 0];
        },

		/**
		 * get window region info
		 * @return {Object}
		 */
		getWindowRegion: function(win, doc){
			var win = win || window;
			var doc = doc || win.document;
			var info = {};

			info.screenLeft = win.screenLeft ? win.screenLeft : win.screenX;
			info.screenTop = win.screenTop ? win.screenTop : win.screenY;

			//no ie
			if(win.innerWidth){
				info.visibleWidth = win.innerWidth;
				info.visibleHeight = win.innerHeight;
				info.horizenScroll = win.pageXOffset;
				info.verticalScroll = win.pageYOffset;
			} else {
				//IE + DOCTYPE defined || IE4, IE5, IE6+no DOCTYPE
				var tag = (doc.documentElement && doc.documentElement.clientWidth) ?
					doc.documentElement : doc.body;
				info.visibleWidth = tag.clientWidth;
				info.visibleHeight = tag.clientHeight;
				info.horizenScroll = tag.scrollLeft;
				info.verticalScroll = tag.scrollTop;
			}

			var tag = (doc.documentElement && doc.documentElement.scrollWidth) ?
					doc.documentElement : doc.body;
			info.documentWidth = Math.max(tag.scrollWidth, info.visibleWidth);
			info.documentHeight = Math.max(tag.scrollHeight, info.visibleHeight);
			return info;
		},

		setAttr: function(e, n, v) {
			var t = this;
			switch (n) {
				case "style":
					if (typeof v != 'string') {
						each(v, function(v, n) {
							t.setStyle(e, n, v);
						});

						return;
					}
					e.style.cssText = v;
					break;

				case "class":
					e.className = v || ''; // Fix IE null bug
					break;
				default:
					e.setAttribute(n, v);
					break;
			}
		},

		setAttrs : function(e, o) {
			var t = this;
			each(o, function(val, n) {
				t.setAttr(e, n, val);
			});
		},

		uniqueId: function () {
			return 'veEditorControl_' + this.counter++;
		},

		setHTML: function (e, h) {
			if (!e) return;
			e.innerHTML = h;
		},

		isHidden: function (e) {
			return !e || e.style.display == 'none' || this.getStyle(e, 'display') == 'none';
		},

		isBlock : function(n) {
			if (!n){
				return false;
			}

			n = n.nodeName || n;
			return /^(BODY|H[1-6]|HR|P|DIV|ADDRESS|PRE|FORM|TABLE|LI|OL|UL|TR|TD|CAPTION|BLOCKQUOTE|CENTER|DL|DT|DD|DIR|FIELDSET|NOSCRIPT|NOFRAMES|MENU|ISINDEX|SAMP)$/i.test(n);
		},

		/**
		 * 检测元素是否为显示的块元素
		 * 这个检测包含display检测
		 * @param {DOM} node
		 * @return {Boolean}
		**/
		isDisplayBlock: function(node){
			return node && node.nodeType == 1 && (ve.dtd.$block[node.tagName]||ve.dtd.$displayBlock[ve.dom.getStyle(node,'display').toLowerCase()])&& !ve.dtd.$nonChild[node.tagName];
		},

		isBr: function(n){
			return n && n.nodeType == 1 && n.tagName == 'BR';
		},

		/**
		 * 插入样式css文件
		 * @param {String} url
		 * @param {Object} opts
		 **/
        insertCSSLink: function (url, opts) {
            var sid, doc, t, cssLink, head;
			if (typeof opts == "string") {
				sid = opts;
			}
            opts = typeof opts == "object" ? opts : {};
            sid = opts.linkID || sid;
            doc = opts.doc || document;
            head = doc.getElementsByTagName("head")[0];
            cssLink = ((t = doc.getElementById(sid)) && (t.nodeName == "LINK")) ? t : null;
            if (!cssLink) {
                cssLink = doc.createElement("link");
                sid && (cssLink.id = sid);
                cssLink.rel = cssLink.rev = "stylesheet";
                cssLink.type = "text/css";
                cssLink.media = opts.media || "screen";
                head.appendChild(cssLink);
            }
            url && (cssLink.href = url);
            return (ve.ua.ie < 9 && cssLink.sheet) || cssLink;
        },

		/**
		 * 插入样式
		 * @param {String} sheetId
		 * @param {String} rules
		 * @param {DOM} doc
		 **/
		insertStyleSheet: function(sheetId, rules, doc){
			doc = doc || document;
			var n = doc.getElementById(sheetId);
			if(!n){
				var n = doc.createElement("style");
				n.type = 'text/css';
				if(sheetId){
					n.id = sheetId;
				}
				doc.getElementsByTagName("head")[0].appendChild(n);
			}
			if(n.styleSheet) {
				n.styleSheet.cssText = rules;
			} else {
				n.appendChild(document.createTextNode(rules));
			}
			return n;
		},

		hasClass: function (n, c) {
			return n && c && new RegExp('\\b' + c + '\\b').test(n.className);
		},

		addClass: function (n, c) {
			if (this.hasClass(n, c)) return;
			n.className += (n.className.length > 0 ? ' ' : '') + c
		},

		removeClass: function (n, c) {
			n.className = n.className.replace(new RegExp('\\s*' + c + '\\s*', 'g'), ' ').replace(/^\s+|\s+$/g, '');
		},

		processHTML: function (html) {
			return '';
		},
 		getScrollLeft: function (doc) {
            var _doc = doc || document;
            return (_doc.defaultView && _doc.defaultView.pageXOffset) || Math.max(_doc.documentElement.scrollLeft, _doc.body.scrollLeft);
        },
        getScrollTop: function (doc) {
            var _doc = doc || document;
            return (_doc.defaultView && _doc.defaultView.pageYOffset) || Math.max(_doc.documentElement.scrollTop, _doc.body.scrollTop);
        },
        getScrollHeight: function (doc) {
            var _doc = doc || document;
            return Math.max(_doc.documentElement.scrollHeight, _doc.body.scrollHeight);
        },
        getScrollWidth: function (doc) {
            var _doc = doc || document;
            return Math.max(_doc.documentElement.scrollWidth, _doc.body.scrollWidth);
        },
        setScrollLeft: function (value, doc) {
            var _doc = doc || document;
            _doc[_doc.compatMode == "CSS1Compat" && !ve.ua.webkit ? "documentElement" : "body"].scrollLeft = value;
        },
        setScrollTop: function (value, doc) {
            var _doc = doc || document;
            _doc[_doc.compatMode == "CSS1Compat" && !ve.ua.webkit ? "documentElement" : "body"].scrollTop = value;
        },

		getNodeIndex : function (node) {
			if (!node.parentNode)
				return;
            var childNodes = node.parentNode.childNodes,
                i = 0;
            while (childNodes[i] !== node) i++;
            return i;
        },
        getRect: function (elem) {
        	var result = {};
            if (elem = this.get(elem)) {
                var box = ve.lang.extend({}, elem.getBoundingClientRect());
                ve.lang.each(['top','left', 'bottom', 'right', 'width', 'height'], function(p){
            		result[p] = box[p];
            	});
                if (typeof result.width == 'undefined') {
                    result.width = result.right - result.left;
                    result.height = result.bottom - result.top;
                }
                return result;
            }
        },
        getPosition: function(elem){
 			var box, s, doc;
            if (box = this.getRect(elem)) {
                if (s = this.getScrollLeft(doc = elem.ownerDocument)) {
                    box.left += s, box.right += s;
                }
                if (s = this.getScrollTop(doc = elem.ownerDocument)) {
                    box.top += s, box.bottom += s;
                }
                return box;
            }
        },

        getSize: function(el){
			var _fix = [0, 0];
	        if (el) {
	            ve.lang.each(["Left", "Right", "Top", "Bottom"], function(v){
	                _fix[v == "Left" || v == "Right" ? 0 : 1] += (parseInt(ve.dom.getStyle(el, "border" + v + "Width"), 10) || 0) + (parseInt(ve.dom.getStyle(el, "padding" + v), 10) || 0);
	            });
	            var _w = el.offsetWidth - _fix[0], _h = el.offsetHeight - _fix[1];
	            return [_w, _h];
	        }
	        return [-1, -1];
        },

		/**
		 * 通过判定规则、方法获取parent节点
		 * @depreacte 注意，当前节点包含在parent中处理，
		 * @return {DOM}
		**/
        getParent: function(el, con){
			var fn = typeof(con) == 'function' ? con : function(node){
				if(con == '*'){
					return node.nodeType == 1;
				} else {
					return node.nodeType == 1 && node.tagName.toLowerCase() == con.toLowerCase();
				}
			};
			while(el && el.parentNode){
				if(fn(el)){
					return el;
				}
				el = el.parentNode;
			}
		},

        getXY: function(elem){
        	var box = this.getPosition(elem) || {
                left: 0,
                top: 0
            };
            return [box.left, box.top];
        },

		getRegion: function(el, doc){
			var xy = this.getXY(el,doc),
				sz = this.getSize(el);
			return {
				top:xy[1],
				left:xy[0],
				width:sz[0],
				height:sz[1]
			}
		},

		remove: function(node, keepChildren){
			var parent = node.parentNode,
			child;
            if (parent) {
                if (keepChildren && node.hasChildNodes()) {
                    while (child = node.firstChild) {
                        parent.insertBefore(child, node);
                    }
                }
                parent.removeChild(node);
            }
            return node;
		},

		/**
		 * 节点克隆
		 * @param {DOM} node 待克隆的节点
		 * @param {Boolean} deep 是否深度拷贝
		 * @param {DOM} doc document环境
		 * @return {DOM}
		 **/
		clone: function(node, deep, doc){
			var _this = this, clone;
				doc = doc || document;
			if (!ve.ua.ie || node.nodeType !== 1 || deep) {
				return node.cloneNode(deep);
			}

			if (!deep) {
				clone = doc.createElement(node.nodeName);
				ve.lang.each(this.getAllAttributes(node), function(attr) {
					_this.setAttr(clone, attr.nodeName, node.getAttribute(attr.nodeName));
				});

				return clone;
			}
			return clone.firstChild;
		},

		/**
		 * 获取所有属性
		 * @param {DOM} n
		 * @return {Array}
		 **/
		getAllAttributes: function(n){
			var o;
			if (!n){
				return [];
			}

			if (ve.ua.ie) {
				o = [];
				if (n.nodeName == 'OBJECT'){
					return n.attributes;
				}
				if (n.nodeName === 'OPTION' && n.getAttribute('selected')){
					o.push({specified : 1, nodeName : 'selected'});
				}
				n.cloneNode(false).outerHTML.replace(/<\/?[\w:\-]+ ?|=[\"][^\"]+\"|=\'[^\']+\'|=[\w\-]+|>/gi, '').replace(/[\w:\-]+/gi, function(a) {
					o.push({specified : 1, nodeName : a});
				});
				return o;
			}
			return n.attributes;
		},

		/**
		 * 获取子节点数量
		 * @deprecated 这里会去除bookmark、空白文本节点
		 * @return {Number}
		 */
		getChildCount: function(node){
			var num = 0;
			ve.lang.each(node.childNodes, function(n){
				if(n.nodeType == 3 && !ve.string.trim(n.nodeValue)){
					//empty text node
				} else if(n.nodeType == 1 && n.style.display == 'none'){
					//bookmark
				} else {
					num ++;
				}
			});
			return num;
		},

		/**
		 * 获取下一个dom
		**/
		getNextDomNode: function(node, startFromChild, filter, guard){
			return ve.dom.getDomNode(node, 'firstChild', 'nextSibling', startFromChild, filter, guard);
		},

		getDomNode: function(node, start, ltr, startFromChild, fn, guard){
			var tmpNode = startFromChild && node[start],
				parent;

			!tmpNode && (tmpNode = node[ltr]);

			while (!tmpNode && (parent = (parent || node).parentNode)){
				if(parent.tagName == 'BODY' || guard && !guard(parent)){
					return null;
				}
				tmpNode = parent[ltr];
			}

			if(tmpNode && fn && !fn(tmpNode)){
				return  ve.dom.getDomNode(tmpNode, start, ltr, false, fn)
			}
			return tmpNode;
		},

		getNodeRelexPosition: function(nodeA, nodeB){
			if (nodeA === nodeB) {
				return 0;
			}
			var node,
			parentsA = [nodeA],
			parentsB = [nodeB];

			node = nodeA;
			while (node && node.parentNode) {
				node = node.parentNode;
				if (node === nodeB) {
					return 10;
				}
				parentsA.push(node);
			}
			node = nodeB;
			while (node && node.parentNode) {
				node = node.parentNode
				if (node === nodeA) {
					return 20;
				}
				parentsB.push(node);
			}
			parentsA.reverse();
			parentsB.reverse();

			if (parentsA[0] !== parentsB[0]){
				return 1;
			}


			var i = -1;
			while (i++,parentsA[i] === parentsB[i]);
			nodeA = parentsA[i];
			nodeB = parentsB[i];

			while (nodeA = nodeA.nextSibling) {
				if (nodeA === nodeB) {
					return 4
				}
			}
			return  2;
		},

        /**
         * dom节点遍历
         * @param {DOM} start_node 开始节点
         * @param {DOM} root_node  根节点
         */
        TreeWalker: function(start_node, root_node) {
			var node = start_node;
			function findSibling(node, start_name, sibling_name, shallow) {
				var sibling, parent;

				if (node) {
					// Walk into nodes if it has a start
					if (!shallow && node[start_name])
						return node[start_name];

					// Return the sibling if it has one
					if (node != root_node) {
						sibling = node[sibling_name];
						if (sibling)
							return sibling;

						// Walk up the parents to look for siblings
						for (parent = node.parentNode; parent && parent != root_node; parent = parent.parentNode) {
							sibling = parent[sibling_name];
							if (sibling)
								return sibling;
						}
					}
				}
			};
			this.current = function() {
				return node;
			};
			this.next = function(shallow) {
				return (node = findSibling(node, 'firstChild', 'nextSibling', shallow));
			};
			this.prev = function(shallow) {
				return (node = findSibling(node, 'lastChild', 'previousSibling', shallow));
			};
		}
	};
}) (window, document, VEditor);