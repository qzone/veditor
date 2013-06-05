(function(window, document, ve, undefined) {
	if(!QZFL){
		throw "NO QZFL FOUND";
	}

	ve.adapter = QZFL;
	ve.ua = QZFL.userAgent;

	ua.ie9Mode = (9 - ((navigator.userAgent.indexOf('Trident/5.0') > -1) ? 0 : 1) - (window.XDomainRequest ? 0 : 1) - (window.XMLHttpRequest ? 0 : 1)) == 9;
	ua.docMode = document.documentMode;

	//dom操作继承
	ve.dom = ve.lang.extend(ve.dom, {
		get: $,
		getXY: QZFL.dom.getXY,
		setXY: QZFL.dom.setXY,

		//QZFL bugfix
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

        isAncestor: QZFL.dom.isAncestor,
        getPosition: QZFL.dom.getPosition,
		getSize: QZFL.dom.getSize,
		setSize: QZFL.dom.setSize,
		getStyle: QZFL.dom.getStyle,
		setStyle: QZFL.dom.setStyle,
		getById: QZFL.dom.getById,
		removeElement: QZFL.dom.removeElement,
		insertCSSLink: QZFL.css.insertCSSLink,

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

		hasClass: QZFL.css.hasClassName,
		addClass: QZFL.css.addClassName,
		removeClass: QZFL.css.removeClassName,
		contains: QZFL.dom.contains,
		convertHexColor: QZFL.css.convertHexColor,
		getScrollLeft: QZFL.dom.getScrollLeft,
		getScrollTop: QZFL.dom.getScrollTop,
		getScrollHeight: QZFL.dom.getScrollHeight,
		getScrollWidth: QZFL.dom.getScrollWidth,

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

		setHTML: function (e, h) {
			if (!e) return;
			e.innerHTML = h;
		},

		setStyles: function(el, styles){
			ve.lang.each(styles, function(n, i) {
				ve.dom.setStyle(el, i, n);
			});
		},

		isHidden: function(e){
			return !e || e.style.display == 'none' || ve.dom.getStyle(e, 'display') == 'none';
		},

		isBlock: function(n) {
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

		insertAfter: function(newNode, currentNode){
			return $e(newNode).insertAfter(currentNode);
		},

		insertBefore: function(newNode, currentNode){
			return $e(newNode).insertBefore(currentNode);
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
		 * @deprecate 两个节点tagName相同才能进行该项操作
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

		insertHTML: function (element, where, html) {
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

		create: function (n, a, h, p) {
			var t = this, e = n, k;
			e = typeof n == 'string' ? document.createElement(n) : n;
			ve.dom.setAttrs(e, a);
			if (h) {
				if (h.nodeType){
					e.appendChild(h);
				} else {
					ve.dom.setHTML(e, h);
				}
			}
			return p && p.nodeType ? p.appendChild(e) : e;
		},

		setAttr: function(e, n, v) {
			var t = this;
			switch (n) {
				case "style":
					if (typeof v != 'string') {
						ve.lang.each(v, function(v, n) {
							ve.dom.setStyle(e, n, v);
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

		setAttrs: function(e, o){
			var t = this;
			ve.lang.each(o, function(v, n) {
				t.setAttr(e, n, v);
			});
		},

		selector: QZFL.selector,
		find: QZFL.selector,

		getViewPort: function (w) {
			var isIE = ve.ua.ie, w = !w ? window : w, d = w.document, b = (!isIE || d.compatMode == "CSS1Compat") && d.documentElement || d.body;
			return {
				x : w.pageXOffset || b.scrollLeft,
				y : w.pageYOffset || b.scrollTop,
				w : w.innerWidth || b.clientWidth,
				h : w.innerHeight || b.clientHeight
			};
		},

		getRegion: function(el, doc){
			var xy = QZFL.dom.getXY(el,doc),
				sz = QZFL.dom.getSize(el);
			return {
				top:xy[1],
				left:xy[0],
				width:sz[0],
				height:sz[1]
			}
		},

		drag: function (dragEl, el) {
			el = el ? $(el) : dragEl.parentNode;
			var startdrag = false, startX, startY, origX, origY, deltaX, deltaY, _this = dragEl, timer;
			if (!dragEl) return;
			QZFL.dom.setStyle(dragEl, 'cursor','move');
			function _mousedown(e) {
				ve.dom.event.cancel(e);
				var s = e.target || e.srcElement;
				if (/a|button/i.test(s.nodeName)) return false;
				startdrag = true;
				startX = e.clientX, startY = e.clientY;
				origX = el.offsetLeft, origY = el.offsetTop;
				deltaX = startX - origX, deltaY = startY - origY;
				timer = setTimeout(function() {
					QZFL.dom.setStyle(el, 'opacity',.6);
				}, 400);
				if (_this.setCapture) _this.setCapture();
				ve.dom.event.add(document, 'mousemove', _mousemove);
				ve.dom.event.add(dragEl, 'mouseup', _mouseup);
			};
			function _mousemove(e) {
				if (!startdrag) return;
				QZFL.dom.setStyle(el, 'left',((e.clientX - deltaX)<0?0:(e.clientX - deltaX)) + 'px');
				QZFL.dom.setStyle(el, 'top',((e.clientY - deltaY)<0?0:(e.clientY - deltaY)) + 'px');
				QZFL.dom.setStyle(el, 'opacity',.6);
			};
			function _mouseup(e) {
				startdrag = false;
				clearTimeout(timer);
				if (_this.releaseCapture) _this.releaseCapture();
				QZFL.dom.setStyle(el, 'opacity',1);
				ve.dom.event.remove(document, 'mousemove', _mousemove);
				ve.dom.event.remove(dragEl, 'mouseup', _mouseup);
			};
			ve.dom.event.add(dragEl, 'mousedown', _mousedown);
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
		}
	});

	//event
	ve.dom.event = QZFL.event;
	ve.dom.event.add = QZFL.event.addEvent;
	ve.dom.event.remove = QZFL.event.removeEvent;
	ve.dom.event.onDOMReady = function(fn) {
		QZFL.event.onDomReady(fn)
	};
	ve.dom.event.cancel = function(e){
		QZFL.event.preventDefault(e);
		QZFL.event.cancelBubble(e);
		return false;
	}
	ve.dom.event.cancelBubble = QZFL.event.cancelBubble;
	ve.dom.event.preventDefault = QZFL.event.preventDefault;
	ve.dom.event.getTarget = QZFL.event.getTarget;

	ve.dom.one = function(){
		var result = ve.dom.find.apply(ve.dom.find, arguments);
		if(result && result.length){
			return result[0];
		}
		return null;
	};

	/**
	 * 显示popup
	 * @param  {String} title
	 * @param  {Mix} source
	 * @param  {Number} width
	 * @param  {Number} height
	 * @return {Object}
	 */
	ve.ui.showPopup = function(title, source, width, height){
		var dlg = QZONE.FP.popupDialog(title,source,width, height);
		return dlg;
	};

	/**
	 * append Popup cb
	 * @param  {Function} cb
	 */
	ve.ui.appendPopupFn = function(cb){
		QZFL.FP.appendPopupFn(cb);
	};

	/**
	 * 关闭Popup
	 * @param  {Number} guid
	 */
	ve.ui.closePopup = function(guid){
		QZONE.FP.closePopup();
	};
})(window, document, VEditor);