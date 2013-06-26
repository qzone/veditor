(function(window, document, undefined) {
	if(window.VEditor){
		throw "VEDITOR NAMESPACE CONFLICT";
	}

	/**
	 * window console方法容错
	 * @deprecate 由于编辑器在开发过程中可能使用了console.log等此类的
	 * debugger语句，因此这里为了不报错，做简单的浏览器版本兼容，
	 * 不做实际的功能兼容
	 **/
	if(!window.console){
		window.console = {log: function(){},error: function(){},info: function(){}};
	}

	/**
	 * 编辑器基础URL前缀作为veditor的相对路径，
	 * 如调用主脚本的路径为：http://a.com/b/ve.js，则该相对路径为http://a.com/b/
	 **/
	var BASE_PATH = window.VE_BASE_PATH || (function(){
		var isIE = !!window.attachEvent;

		/**
		 * 获取host前面部分
		 * @param  {String} loc 非://word.com/格式不处理
		 * @return {String}
		 */
		var getPreHost = function(loc){
			loc = loc + '/';
			if(!/(^\w+:\/\/[^\/]+\/)/.test(loc)){
				return loc;
			} else {
				var tmp = /(^\w+:\/\/[^\/]+\/)/.exec(loc);
				return tmp[1];
			}
		};

		/**
		 * 获取地址的path部分
		 * 处理：http://a.com/b/c/d.html 返回 b/c
		 * @param  {String} loc
		 * @return {String}
		 */
		var getPrePath = function(loc){
			return loc.replace(/^\w+:\/\/[^\/]+\//, '').replace(/[^\/]*$/, '').replace(/\/$/,'').replace(/^\//,'');
		};

		/**
		 * 是否为绝对地址
		 * @param  {String} loc
		 * @return {Boolean}
		 */
		var isAbsLoc = function(loc){
			return loc.substring(0, 1) == '/';
		};

		/**
		 * 编辑器主脚本路径
		 * @deprecate 改方法仅判断页面上 script节点里面src包含ve.[*.]js的脚本路径
		 * 因此如果页面上存在类似命名的脚本，将导致调用该变量的功能失效
		 **/
		var SCRIPT_PATH = (function(){
			var scriptList = document.getElementsByTagName('script');
			for (var i=0; i<scriptList.length; i++) {
				var src = scriptList[i].src;
				if (src && /\/ve\.(\w|\.)*js/.test(src)) {
					return src.replace(/[^\/]*$/, '');
				}
			}
			return null;
		})();

		//页面指定了base路径
		//返回 http://a.com 或 http://a.com/b/c 格式
		var BASE_LOC = (function(){
			var tmp = document.getElementsByTagName('BASE');
			if(tmp && tmp.length && tmp[0].href){
				var href = tmp[0].href;
				href = href.indexOf('://') < 0 ? 'http://'+href : href;
				return href.replace(/\/$/, '');
			}
			return '';
		})();

		//绝对路径形式调用，如：http://a.com/b/ve.js
		//非IE会自动补全script的src，如 /a.js 补全为 http://a.com/a.js
		if(!isIE || /:\/\//.test(SCRIPT_PATH)){
			return SCRIPT_PATH;
		}

		//绝对路径
		if(isAbsLoc(SCRIPT_PATH)){
			return getPreHost(BASE_LOC||location.href).replace(/\/$/,'') + SCRIPT_PATH;
		}
		//相对路径
		else {
			return BASE_LOC ? BASE_LOC+'/'+SCRIPT_PATH : getPreHost(location.href)+getPrePath(location.href)+'./'+SCRIPT_PATH;
		}
	})();

	//编辑器对象集合
	var EDITOR_COLLECTIONS = {};

	/**
	 * VEditor 编辑器初始化对象
	 * VEditor 主要是提供给 VEditor.init方法调用，用于多个编辑器实例对象初始化管理
	 * 后期可以在这里扩展。
	 * @type {Object}
	 */
	var VEditor = {
		getAbsPath: function(u){
			return BASE_PATH + (u||'');
		},

		plugin: {},
		version: '2.03',
		blankChar: '\uFEFF',
		fillCharReg: new RegExp('\uFEFF', 'g'),
		caretChar: '\u2009',
		ui: {},
		dom: {},


		/**
		 * 添加编辑器实例
		 * @param {Object} editor
		 */
		add: function (editor) {
			EDITOR_COLLECTIONS[editor.id] = editor;
		},

		/**
		 * 获取编辑器实例
		 * @param {String} id
		 * @return {Object}
		 */
		get: function (id) {
			return EDITOR_COLLECTIONS[id];
		},

		/**
		 * 检测节点是否为辅助节点
		 **/
		isHelperNode: function(node){
			return node && node.nodeType == 3 &&
				(new RegExp('^'+this.blankChar+'$').test(node.nodeValue) ||
					new RegExp('^'+this.caretChar+'$').test(node.nodeValue));
		},

		/**
		 * 创建编辑器实例对象
		 * @param {Object} conf 参数格式请参考editor.js
		 * @return {VEditor.Editor}
		 **/
		create: function(conf){
			var editor = new VEditor.Editor(conf);
			this.add(editor);

			setTimeout(function(){
			editor.init();
			}, 100);

			return editor;
		}
	};

	//占用命名空间
	//@deprecate 这里由于旧版的使用的命名空间为veEditor，所以暂时适配
	window.veEditor = window.VEditor = VEditor;
}) (window, document);
(function(window, document, ve, undefined) {
	//原型继承需要处理的字段
	var PROTOTYPE_FIELDS = [
		'constructor',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'toLocaleString',
		'toString',
		'prototype',
		'valueOf'
	];

	var lang = {
		/**
		 * 哈希迭代器
		 * @param {Object}   o  哈希对象|数组
		 * @param {Function} cb 回调方法
		 * @param {[type]}   s  [description]
		 * @return {[type]}
		 */
		each : function(o, cb, s) {
			var n, l;

			if (!o){
				return 0;
			}

			s = s || o;

			if(typeof(o.length) != 'undefined') {
				for (n=0, l = o.length; n<l; n++) {	// Indexed arrays, needed for Safari
					if (cb.call(s, o[n], n, o) === false){
						return 0;
					}
				}
			} else {
				for(n in o) {	// Hashtables
					if (o.hasOwnProperty && o.hasOwnProperty(n) && cb.call(s, o[n], n, o) === false) {
						return 0;
					}
				}
			}
			return 1;
		},

		arrayIndex: function(arr, item, start) {
            for(var i=start||0,len = arr.length; i<len; i++){
               if(arr[i] === item){
                   return i;
               }
            }
            return -1;
		},

		coll2Arr: function(collection){
			var list = [];
			for(var i=0; i<collection.length; i++){
				list.push(collection[i]);
			}
			return list;
		},

		/**
		 * arguemnts转换到数组
		 * @param {Arguments} args
		 * @param {Number} startPos	开始位置
		 * @return {Array}
		 **/
		arg2Arr: function(args, startPos){
			startPos = startPos || 0;
			return Array.prototype.slice.call(args, startPos);
		},

		/**
		 * 检测输入是否为数组
		 * @param  {mix}  value
		 * @return {boolean}
		 */
		isArray: function(value){
			return this.getType(value) == 'array';
		},

		/**
		 * 判断一个对象是否为一个DOM 或者 BOM
		 * @param {Mix} value
		 * @return {Boolean}
		 **/
		isBomOrDom: function(value){
			if(this.isScalar(value)){
				return false;
			}
			if(ve.ua.ie){
				//Node, Event, Window
				return value['nodeType'] || value['srcElement'] || (value['top'] && value['top'] == window.top);
			} else {
				return this.getType(value) != 'object' && this.getType(value) != 'function';
			}
		},

		/**
		 * get type
		 * @param  {mix} obj
		 * @return {string}
		 */
		getType: function(obj){
			return obj === null ? 'null' : (obj === undefined ? 'undefined' : Object.prototype.toString.call(obj).slice(8, -1).toLowerCase());
		},

		/**
		 * 闭包过滤对象
		 * @param  {array} arr
		 * @param  {function} callback 处理函数
		 * @return {array}
		 */
		grep : function(arr, callback) {
			var o = [];
			this.each(arr, function(v) {
				if (callback(v)){
					o.push(v);
				}
			});
			return o;
		},

		/**
		 * 判断对象是否为一个标量
		 * @param {Mix} value
		 * @return {Boolean}
		 **/
		isScalar: function(value){
			var type = ve.lang.getType(value);
			return type == 'number' || type == 'boolean' || type == 'string' || type == 'null' || type == 'undefined';
		},


		/**
		 * 扩展object
		 * 不支持BOM || DOM || Event等浏览器对象，遇到此情况返回前一个
		 * 如果第一个参数为boolean，true用于表示为deepCopy，剩下参数做剩余的extend
		 * undefined,null 不可覆盖其他类型，类型覆盖以后面的数据类型为高优先级
		 * 标量直接覆盖，不做extend
		 * @return {Mix}
		 **/
		extend: function(/*true || obj, obj1[,obj2[,obj3]]**/){
			if(arguments.length < 2){
				throw('params error');
			}

			var args = ve.lang.arg2Arr(arguments),
				result,
				deepCopy = false;

			if(ve.lang.getType(args[0]) == 'boolean'){
				deepCopy = args[0];
				args = args.slice(1);
			}

			result = args.pop();
			for(var i=args.length-1; i>=0; i--){
				var current = args[i];
				var _tagType = ve.lang.getType(result);

				//修正 object, null 情况
				if(_tagType == 'null' || _tagType == 'undefined'){
					result = current;
					continue;
				}

				//标量 || DOM || BOM 不做复制
				if(ve.lang.isScalar(result) || ve.lang.isBomOrDom(result) ||
					ve.lang.isScalar(current) || ve.lang.isBomOrDom(current)){
					continue;
				}

				//正常object、array, function复制
				for(var key in result){
					var item = result[key];
					if(deepCopy && typeof(item) == 'object'){
						current[key] = ve.lang.extend(false, item);	//这里仅处理当前仅支持两层处理
					} else {
						current[key] = item;
					}
				}

				//原型链复制
				for(var j=0; j<PROTOTYPE_FIELDS.length; j++){
					key = PROTOTYPE_FIELDS[j];
					if(Object.prototype.hasOwnProperty.call(result, key)){
						current[key] = result[key];
					}
				}
				result = current;
			}
			return result;
		},

		/**
		 * 对象绑定函数
		 * @param {object} obj
		 * @param {function} fn
		 * @return {function}
		 */
		bind: function(obj, fn) {
			var slice = Array.prototype.slice,
				args = slice.call(arguments, 2);

			return function(){
				obj = obj || this;
				fn = typeof fn == 'string' ? obj[fn] : fn;
				fn = typeof fn == 'function' ? fn : function(){};
				return fn.apply(obj, args.concat(slice.call(arguments, 0)));
			};
		},

		/**
		 * Class构造器
		 * @param {String} s 构造规则
		 * @param {Object} p 对象实体
		 **/
		Class: function(s, p) {
			var t = this, sp, ns, cn, scn, c, de = 0;

			//解析规则: <prefix> <class>:<super class>
			s = /^((static) )?([\w.]+)(\s*:\s*([\w.]+))?/.exec(s);
			cn = s[3].match(/(^|\.)(\w+)$/i)[2]; // Class name

			//创建命名空间
			ns = t.createNS(s[3].replace(/\.\w+$/, ''));

			//类存在
			if (ns[cn]){
				return;
			}

			//生成静态类
			if (s[2] == 'static') {
				ns[cn] = p;
				if (this.onCreate){
					this.onCreate(s[2], s[3], ns[cn]);
				}
				return;
			}

			//创建缺省构造原型类
			if (!p[cn]) {
				p[cn] = function(){};
				de = 1;
			}

			// Add constructor and methods
			ns[cn] = p[cn];
			t.extend(ns[cn].prototype, p);

			//扩展
			if (s[5]) {
				if(!t.resolve(s[5])){
					throw('ve.Class namespace parser error');
				}
				sp = t.resolve(s[5]).prototype;
				scn = s[5].match(/\.(\w+)$/i)[1]; // Class name

				// Extend constructor
				c = ns[cn];
				if (de) {
					// Add passthrough constructor
					ns[cn] = function() {
						return sp[scn].apply(this, arguments);
					};
				} else {
					// Add inherit constructor
					ns[cn] = function() {
						this.base = sp[scn];
						return c.apply(this, arguments);
					};
				}
				ns[cn].prototype[cn] = ns[cn];

				// Add super methods
				t.each(sp, function(f, n) {
					ns[cn].prototype[n] = sp[n];
				});

				// Add overridden methods
				t.each(p, function(f, n) {
					// Extend methods if needed
					if (sp[n] && typeof(sp[n]) == 'function') {
						ns[cn].prototype[n] = function() {
							this.base = sp[n];
							return f.apply(this, arguments);
						};
					} else {
						if (n != cn){
							ns[cn].prototype[n] = f;
						}
					}
				});
			}

			// Add static methods
			t.each(p['static'], function(f, n) {
				ns[cn][n] = f;
			});
			if (this.onCreate){
				this.onCreate(s[2], s[3], ns[cn].prototype);
			}
		},

		/**
		 * 创建namespace
		 * @param {String} n name
		 * @param {Object} o scope
		 * @return {Object}
		 **/
		createNS : function(n, o) {
			var i, v;
			o = o || window;
			n = n.split('.');
			for (i=0; i<n.length; i++) {
				v = n[i];
				if (!o[v]){
					o[v] = {};
				}
				o = o[v];
			}
			return o;
		},

		/**
		 * 解析字符串对应到对象属性
		 * @param {String} n
		 * @param {Object} o
		 * @return {Mix}
		 **/
		resolve : function(n, o) {
			var i, l;
			o = o || window;
			n = n.split('.');

			for (i=0, l = n.length; i<l; i++) {
				o = o[n[i]];
				if (!o){
					break;
				}
			}
			return o;
		}
	};
	ve.lang = lang;
})(window, document, VEditor);
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
(function(ve, dom){
	/**
	 * DOM选择器
	 **/
	var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
		done = 0,
		toString = Object.prototype.toString,
		hasDuplicate = false,
		baseHasDuplicate = true,
		rBackslash = /\\/g,
		rNonWord = /\W/,
		tmpVar, rSpeedUp = /^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)|^(\w+)\.([\w\-]+$)/;
	[0, 0].sort(function () {
		baseHasDuplicate = false;
		return 0;
	});

	var Sizzle = function (selector, context, results, seed) {
			results = results || [];
			context = context || document;
			var origContext = context;
			if (context.nodeType !== 1 && context.nodeType !== 9) {
				return [];
			}
			if (!selector || typeof selector !== "string") {
				return results;
			}
			var m, set, checkSet, extra, ret, cur, pop, i, prune = true,
				contextXML = Sizzle.isXML(context),
				parts = [],
				soFar = selector,
				speedUpMatch;
			if (!contextXML) {
				speedUpMatch = rSpeedUp.exec(selector);
				if (speedUpMatch) {
					if (context.nodeType === 1 || context.nodeType === 9) {
						if (speedUpMatch[1]) {
							return makeArray(context.getElementsByTagName(selector), results);
						} else if (speedUpMatch[2] || (speedUpMatch[4] && speedUpMatch[5])) {
							if (context.getElementsByClassName && speedUpMatch[2]) {
								return makeArray(context.getElementsByClassName(speedUpMatch[2]), results);
							} else {
								var suElems = context.getElementsByTagName(speedUpMatch[4] || '*'),
									suResBuff = [],
									suIt, suCN = ' ' + (speedUpMatch[2] || speedUpMatch[5]) + ' ';
								for (var sui = 0, sulen = suElems.length; sui < sulen; ++sui) {
									suIt = suElems[sui];
									((' ' + suIt.className + ' ').indexOf(suCN) > -1) && suResBuff.push(suIt);
								}
								return makeArray(suResBuff, results);
							}
						}
					}
					if (context.nodeType === 9) {
						if ((selector === "body" || selector.toLowerCase() === "body") && context.body) {
							return makeArray([context.body], results);
						} else if (speedUpMatch[3]) {
							return (tmpVar = context.getElementById(speedUpMatch[3])) ? makeArray([tmpVar], results) : makeArray([], results);
						}
					}
				}
			}
			do {
				chunker.exec("");
				m = chunker.exec(soFar);
				if (m) {
					soFar = m[3];
					parts.push(m[1]);
					if (m[2]) {
						extra = m[3];
						break;
					}
				}
			} while (m);
			if (parts.length > 1 && origPOS.exec(selector)) {
				if (parts.length === 2 && Expr.relative[parts[0]]) {
					set = posProcess(parts[0] + parts[1], context);
				} else {
					set = Expr.relative[parts[0]] ? [context] : Sizzle(parts.shift(), context);
					while (parts.length) {
						selector = parts.shift();
						if (Expr.relative[selector]) {
							selector += parts.shift();
						}
						set = posProcess(selector, set);
					}
				}
			} else {
				if (!seed && parts.length > 1 && context.nodeType === 9 && !contextXML && Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1])) {
					ret = Sizzle.find(parts.shift(), context, contextXML);
					context = ret.expr ? Sizzle.filter(ret.expr, ret.set)[0] : ret.set[0];
				}
				if (context) {
					ret = seed ? {
						expr: parts.pop(),
						set: makeArray(seed)
					} : Sizzle.find(parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML);
					set = ret.expr ? Sizzle.filter(ret.expr, ret.set) : ret.set;
					if (parts.length > 0) {
						checkSet = makeArray(set);
					} else {
						prune = false;
					}
					while (parts.length) {
						cur = parts.pop();
						pop = cur;
						if (!Expr.relative[cur]) {
							cur = "";
						} else {
							pop = parts.pop();
						}
						if (pop == null) {
							pop = context;
						}
						Expr.relative[cur](checkSet, pop, contextXML);
					}
				} else {
					checkSet = parts = [];
				}
			}
			if (!checkSet) {
				checkSet = set;
			}
			if (!checkSet) {
				Sizzle.error(cur || selector);
			}
			if (toString.call(checkSet) === "[object Array]") {
				if (!prune) {
					results.push.apply(results, checkSet);
				} else if (context && context.nodeType === 1) {
					for (i = 0; checkSet[i] != null; i++) {
						if (checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && Sizzle.contains(context, checkSet[i]))) {
							results.push(set[i]);
						}
					}
				} else {
					for (i = 0; checkSet[i] != null; i++) {
						if (checkSet[i] && checkSet[i].nodeType === 1) {
							results.push(set[i]);
						}
					}
				}
			} else {
				makeArray(checkSet, results);
			}
			if (extra) {
				Sizzle(extra, origContext, results, seed);
				Sizzle.uniqueSort(results);
			}
			return results;
		};
	Sizzle.uniqueSort = function (results) {
		if (sortOrder) {
			hasDuplicate = baseHasDuplicate;
			results.sort(sortOrder);
			if (hasDuplicate) {
				for (var i = 1; i < results.length; i++) {
					if (results[i] === results[i - 1]) {
						results.splice(i--, 1);
					}
				}
			}
		}
		return results;
	};
	Sizzle.matches = function (expr, set) {
		return Sizzle(expr, null, null, set);
	};
	Sizzle.matchesSelector = function (node, expr) {
		return Sizzle(expr, null, null, [node]).length > 0;
	};
	Sizzle.find = function (expr, context, isXML) {
		var set;
		if (!expr) {
			return [];
		}
		for (var i = 0, l = Expr.order.length; i < l; i++) {
			var match, type = Expr.order[i];
			if ((match = Expr.leftMatch[type].exec(expr))) {
				var left = match[1];
				match.splice(1, 1);
				if (left.substr(left.length - 1) !== "\\") {
					match[1] = (match[1] || "").replace(rBackslash, "");
					set = Expr.find[type](match, context, isXML);
					if (set != null) {
						expr = expr.replace(Expr.match[type], "");
						break;
					}
				}
			}
		}
		if (!set) {
			set = typeof context.getElementsByTagName !== "undefined" ? context.getElementsByTagName("*") : [];
		}
		return {
			set: set,
			expr: expr
		};
	};
	Sizzle.filter = function (expr, set, inplace, not) {
		var match, anyFound, old = expr,
			result = [],
			curLoop = set,
			isXMLFilter = set && set[0] && Sizzle.isXML(set[0]);
		while (expr && set.length) {
			for (var type in Expr.filter) {
				if ((match = Expr.leftMatch[type].exec(expr)) != null && match[2]) {
					var found, item, filter = Expr.filter[type],
						left = match[1];
					anyFound = false;
					match.splice(1, 1);
					if (left.substr(left.length - 1) === "\\") {
						continue;
					}
					if (curLoop === result) {
						result = [];
					}
					if (Expr.preFilter[type]) {
						match = Expr.preFilter[type](match, curLoop, inplace, result, not, isXMLFilter);
						if (!match) {
							anyFound = found = true;
						} else if (match === true) {
							continue;
						}
					}
					if (match) {
						for (var i = 0;
						(item = curLoop[i]) != null; i++) {
							if (item) {
								found = filter(item, match, i, curLoop);
								var pass = not ^ !! found;
								if (inplace && found != null) {
									if (pass) {
										anyFound = true;
									} else {
										curLoop[i] = false;
									}
								} else if (pass) {
									result.push(item);
									anyFound = true;
								}
							}
						}
					}
					if (found !== undefined) {
						if (!inplace) {
							curLoop = result;
						}
						expr = expr.replace(Expr.match[type], "");
						if (!anyFound) {
							return [];
						}
						break;
					}
				}
			}
			if (expr === old) {
				if (anyFound == null) {
					Sizzle.error(expr);
				} else {
					break;
				}
			}
			old = expr;
		}
		return curLoop;
	};
	Sizzle.error = function (msg) {
		throw "Syntax error, unrecognized expression: " + msg;
	};
	var Expr = Sizzle.selectors = {
		order: ["ID", "NAME", "TAG"],
		match: {
			ID: /#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
			CLASS: /\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
			NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,
			ATTR: /\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,
			TAG: /^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,
			CHILD: /:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,
			POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,
			PSEUDO: /:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/
		},
		leftMatch: {},
		attrMap: {
			"class": "className",
			"for": "htmlFor"
		},
		attrHandle: {
			href: function (elem) {
				return elem.getAttribute("href");
			},
			type: function (elem) {
				return elem.getAttribute("type");
			}
		},
		relative: {
			"+": function (checkSet, part) {
				var isPartStr = typeof part === "string",
					isTag = isPartStr && !rNonWord.test(part),
					isPartStrNotTag = isPartStr && !isTag;
				if (isTag) {
					part = part.toLowerCase();
				}
				for (var i = 0, l = checkSet.length, elem; i < l; i++) {
					if ((elem = checkSet[i])) {
						while ((elem = elem.previousSibling) && elem.nodeType !== 1) {}
						checkSet[i] = isPartStrNotTag || elem && elem.nodeName.toLowerCase() === part ? elem || false : elem === part;
					}
				}
				if (isPartStrNotTag) {
					Sizzle.filter(part, checkSet, true);
				}
			},
			">": function (checkSet, part) {
				var elem, isPartStr = typeof part === "string",
					i = 0,
					l = checkSet.length;
				if (isPartStr && !rNonWord.test(part)) {
					part = part.toLowerCase();
					for (; i < l; i++) {
						elem = checkSet[i];
						if (elem) {
							var parent = elem.parentNode;
							checkSet[i] = parent.nodeName.toLowerCase() === part ? parent : false;
						}
					}
				} else {
					for (; i < l; i++) {
						elem = checkSet[i];
						if (elem) {
							checkSet[i] = isPartStr ? elem.parentNode : elem.parentNode === part;
						}
					}
					if (isPartStr) {
						Sizzle.filter(part, checkSet, true);
					}
				}
			},
			"": function (checkSet, part, isXML) {
				var nodeCheck, doneName = done++,
					checkFn = dirCheck;
				if (typeof part === "string" && !rNonWord.test(part)) {
					part = part.toLowerCase();
					nodeCheck = part;
					checkFn = dirNodeCheck;
				}
				checkFn("parentNode", part, doneName, checkSet, nodeCheck, isXML);
			},
			"~": function (checkSet, part, isXML) {
				var nodeCheck, doneName = done++,
					checkFn = dirCheck;
				if (typeof part === "string" && !rNonWord.test(part)) {
					part = part.toLowerCase();
					nodeCheck = part;
					checkFn = dirNodeCheck;
				}
				checkFn("previousSibling", part, doneName, checkSet, nodeCheck, isXML);
			}
		},
		find: {
			ID: function (match, context, isXML) {
				if (typeof context.getElementById !== "undefined" && !isXML) {
					var m = context.getElementById(match[1]);
					return m && m.parentNode ? [m] : [];
				}
			},
			NAME: function (match, context) {
				if (typeof context.getElementsByName !== "undefined") {
					var ret = [],
						results = context.getElementsByName(match[1]);
					for (var i = 0, l = results.length; i < l; i++) {
						if (results[i].getAttribute("name") === match[1]) {
							ret.push(results[i]);
						}
					}
					return ret.length === 0 ? null : ret;
				}
			},
			TAG: function (match, context) {
				if (typeof context.getElementsByTagName !== "undefined") {
					return context.getElementsByTagName(match[1]);
				}
			}
		},
		preFilter: {
			CLASS: function (match, curLoop, inplace, result, not, isXML) {
				match = " " + match[1].replace(rBackslash, "") + " ";
				if (isXML) {
					return match;
				}
				for (var i = 0, elem;
				(elem = curLoop[i]) != null; i++) {
					if (elem) {
						if (not ^ (elem.className && (" " + elem.className + " ").replace(/[\t\n\r]/g, " ").indexOf(match) >= 0)) {
							if (!inplace) {
								result.push(elem);
							}
						} else if (inplace) {
							curLoop[i] = false;
						}
					}
				}
				return false;
			},
			ID: function (match) {
				return match[1].replace(rBackslash, "");
			},
			TAG: function (match, curLoop) {
				return match[1].replace(rBackslash, "").toLowerCase();
			},
			CHILD: function (match) {
				if (match[1] === "nth") {
					if (!match[2]) {
						Sizzle.error(match[0]);
					}
					match[2] = match[2].replace(/^\+|\s*/g, '');
					var test = /(-?)(\d*)(?:n([+\-]?\d*))?/.exec(match[2] === "even" && "2n" || match[2] === "odd" && "2n+1" || !/\D/.test(match[2]) && "0n+" + match[2] || match[2]);
					match[2] = (test[1] + (test[2] || 1)) - 0;
					match[3] = test[3] - 0;
				} else if (match[2]) {
					Sizzle.error(match[0]);
				}
				match[0] = done++;
				return match;
			},
			ATTR: function (match, curLoop, inplace, result, not, isXML) {
				var name = match[1] = match[1].replace(rBackslash, "");
				if (!isXML && Expr.attrMap[name]) {
					match[1] = Expr.attrMap[name];
				}
				match[4] = (match[4] || match[5] || "").replace(rBackslash, "");
				if (match[2] === "~=") {
					match[4] = " " + match[4] + " ";
				}
				return match;
			},
			PSEUDO: function (match, curLoop, inplace, result, not) {
				if (match[1] === "not") {
					if ((chunker.exec(match[3]) || "").length > 1 || /^\w/.test(match[3])) {
						match[3] = Sizzle(match[3], null, null, curLoop);
					} else {
						var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);
						if (!inplace) {
							result.push.apply(result, ret);
						}
						return false;
					}
				} else if (Expr.match.POS.test(match[0]) || Expr.match.CHILD.test(match[0])) {
					return true;
				}
				return match;
			},
			POS: function (match) {
				match.unshift(true);
				return match;
			}
		},
		filters: {
			enabled: function (elem) {
				return elem.disabled === false && elem.type !== "hidden";
			},
			disabled: function (elem) {
				return elem.disabled === true;
			},
			checked: function (elem) {
				return elem.checked === true;
			},
			selected: function (elem) {
				if (elem.parentNode) {
					elem.parentNode.selectedIndex;
				}
				return elem.selected === true;
			},
			parent: function (elem) {
				return !!elem.firstChild;
			},
			empty: function (elem) {
				return !elem.firstChild;
			},
			has: function (elem, i, match) {
				return !!Sizzle(match[3], elem).length;
			},
			header: function (elem) {
				return (/h\d/i).test(elem.nodeName);
			},
			text: function (elem) {
				return "text" === elem.getAttribute('type');
			},
			radio: function (elem) {
				return "radio" === elem.type;
			},
			checkbox: function (elem) {
				return "checkbox" === elem.type;
			},
			file: function (elem) {
				return "file" === elem.type;
			},
			password: function (elem) {
				return "password" === elem.type;
			},
			submit: function (elem) {
				return "submit" === elem.type;
			},
			image: function (elem) {
				return "image" === elem.type;
			},
			reset: function (elem) {
				return "reset" === elem.type;
			},
			button: function (elem) {
				return "button" === elem.type || elem.nodeName.toLowerCase() === "button";
			},
			input: function (elem) {
				return (/input|select|textarea|button/i).test(elem.nodeName);
			}
		},
		setFilters: {
			first: function (elem, i) {
				return i === 0;
			},
			last: function (elem, i, match, array) {
				return i === array.length - 1;
			},
			even: function (elem, i) {
				return i % 2 === 0;
			},
			odd: function (elem, i) {
				return i % 2 === 1;
			},
			lt: function (elem, i, match) {
				return i < match[3] - 0;
			},
			gt: function (elem, i, match) {
				return i > match[3] - 0;
			},
			nth: function (elem, i, match) {
				return match[3] - 0 === i;
			},
			eq: function (elem, i, match) {
				return match[3] - 0 === i;
			}
		},
		filter: {
			PSEUDO: function (elem, match, i, array) {
				var name = match[1],
					filter = Expr.filters[name];
				if (filter) {
					return filter(elem, i, match, array);
				} else if (name === "contains") {
					return (elem.textContent || elem.innerText || Sizzle.getText([elem]) || "").indexOf(match[3]) >= 0;
				} else if (name === "not") {
					var not = match[3];
					for (var j = 0, l = not.length; j < l; j++) {
						if (not[j] === elem) {
							return false;
						}
					}
					return true;
				} else {
					Sizzle.error(name);
				}
			},
			CHILD: function (elem, match) {
				var type = match[1],
					node = elem;
				switch (type) {
				case "only":
				case "first":
					while ((node = node.previousSibling)) {
						if (node.nodeType === 1) {
							return false;
						}
					}
					if (type === "first") {
						return true;
					}
					node = elem;
				case "last":
					while ((node = node.nextSibling)) {
						if (node.nodeType === 1) {
							return false;
						}
					}
					return true;
				case "nth":
					var first = match[2],
						last = match[3];
					if (first === 1 && last === 0) {
						return true;
					}
					var doneName = match[0],
						parent = elem.parentNode;
					if (parent && (parent.sizcache !== doneName || !elem.nodeIndex)) {
						var count = 0;
						for (node = parent.firstChild; node; node = node.nextSibling) {
							if (node.nodeType === 1) {
								node.nodeIndex = ++count;
							}
						}
						parent.sizcache = doneName;
					}
					var diff = elem.nodeIndex - last;
					if (first === 0) {
						return diff === 0;
					} else {
						return (diff % first === 0 && diff / first >= 0);
					}
				}
			},
			ID: function (elem, match) {
				return elem.nodeType === 1 && elem.getAttribute("id") === match;
			},
			TAG: function (elem, match) {
				return (match === "*" && elem.nodeType === 1) || elem.nodeName.toLowerCase() === match;
			},
			CLASS: function (elem, match) {
				return (" " + (elem.className || elem.getAttribute("class")) + " ").indexOf(match) > -1;
			},
			ATTR: function (elem, match) {
				var name = match[1],
					result = Expr.attrHandle[name] ? Expr.attrHandle[name](elem) : elem[name] != null ? elem[name] : elem.getAttribute(name),
					value = result + "",
					type = match[2],
					check = match[4];
				return result == null ? type === "!=" : type === "=" ? value === check : type === "*=" ? value.indexOf(check) >= 0 : type === "~=" ? (" " + value + " ").indexOf(check) >= 0 : !check ? value && result !== false : type === "!=" ? value !== check : type === "^=" ? value.indexOf(check) === 0 : type === "$=" ? value.substr(value.length - check.length) === check : type === "|=" ? value === check || value.substr(0, check.length + 1) === check + "-" : false;
			},
			POS: function (elem, match, i, array) {
				var name = match[2],
					filter = Expr.setFilters[name];
				if (filter) {
					return filter(elem, i, match, array);
				}
			}
		}
	};
	var origPOS = Expr.match.POS,
		fescape = function (all, num) {
			return "\\" + (num - 0 + 1);
		};
	for (var type in Expr.match) {
		Expr.match[type] = new RegExp(Expr.match[type].source + (/(?![^\[]*\])(?![^\(]*\))/.source));
		Expr.leftMatch[type] = new RegExp(/(^(?:.|\r|\n)*?)/.source + Expr.match[type].source.replace(/\\(\d+)/g, fescape));
	}
	var makeArray = function (array, results) {
			array = ve.lang.arg2Arr(array, 0);
			if (results) {
				results.push.apply(results, array);
				return results;
			}
			return array;
		};
	try {
		Array.prototype.slice.call(document.documentElement.childNodes, 0)[0].nodeType;
	} catch (e) {
		makeArray = function (array, results) {
			var i = 0,
				ret = results || [];
			if (toString.call(array) === "[object Array]") {
				Array.prototype.push.apply(ret, array);
			} else {
				if (typeof array.length === "number") {
					for (var l = array.length; i < l; i++) {
						ret.push(array[i]);
					}
				} else {
					for (; array[i]; i++) {
						ret.push(array[i]);
					}
				}
			}
			return ret;
		};
	}
	var sortOrder, siblingCheck;
	if (document.documentElement.compareDocumentPosition) {
		sortOrder = function (a, b) {
			if (a === b) {
				hasDuplicate = true;
				return 0;
			}
			if (!a.compareDocumentPosition || !b.compareDocumentPosition) {
				return a.compareDocumentPosition ? -1 : 1;
			}
			return a.compareDocumentPosition(b) & 4 ? -1 : 1;
		};
	} else {
		sortOrder = function (a, b) {
			var al, bl, ap = [],
				bp = [],
				aup = a.parentNode,
				bup = b.parentNode,
				cur = aup;
			if (a === b) {
				hasDuplicate = true;
				return 0;
			} else if (aup === bup) {
				return siblingCheck(a, b);
			} else if (!aup) {
				return -1;
			} else if (!bup) {
				return 1;
			}
			while (cur) {
				ap.unshift(cur);
				cur = cur.parentNode;
			}
			cur = bup;
			while (cur) {
				bp.unshift(cur);
				cur = cur.parentNode;
			}
			al = ap.length;
			bl = bp.length;
			for (var i = 0; i < al && i < bl; i++) {
				if (ap[i] !== bp[i]) {
					return siblingCheck(ap[i], bp[i]);
				}
			}
			return i === al ? siblingCheck(a, bp[i], -1) : siblingCheck(ap[i], b, 1);
		};
		siblingCheck = function (a, b, ret) {
			if (a === b) {
				return ret;
			}
			var cur = a.nextSibling;
			while (cur) {
				if (cur === b) {
					return -1;
				}
				cur = cur.nextSibling;
			}
			return 1;
		};
	}
	Sizzle.getText = function (elems) {
		var ret = "",
			elem;
		for (var i = 0; elems[i]; i++) {
			elem = elems[i];
			if (elem.nodeType === 3 || elem.nodeType === 4) {
				ret += elem.nodeValue;
			} else if (elem.nodeType !== 8) {
				ret += Sizzle.getText(elem.childNodes);
			}
		}
		return ret;
	};
	(function () {
		var form = document.createElement("div"),
			id = "script" + (new Date()).getTime(),
			root = document.documentElement;
		form.innerHTML = "<a name='" + id + "'/>";
		root.insertBefore(form, root.firstChild);
		if (document.getElementById(id)) {
			Expr.find.ID = function (match, context, isXML) {
				if (typeof context.getElementById !== "undefined" && !isXML) {
					var m = context.getElementById(match[1]);
					return m ? m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ? [m] : undefined : [];
				}
			};
			Expr.filter.ID = function (elem, match) {
				var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
				return elem.nodeType === 1 && node && node.nodeValue === match;
			};
		}
		root.removeChild(form);
		root = form = null;
	})();
	(function () {
		var div = document.createElement("div");
		div.appendChild(document.createComment(""));
		if (div.getElementsByTagName("*").length > 0) {
			Expr.find.TAG = function (match, context) {
				var results = context.getElementsByTagName(match[1]);
				if (match[1] === "*") {
					var tmp = [];
					for (var i = 0; results[i]; i++) {
						if (results[i].nodeType === 1) {
							tmp.push(results[i]);
						}
					}
					results = tmp;
				}
				return results;
			};
		}
		div.innerHTML = "<a href='#'></a>";
		if (div.firstChild && typeof div.firstChild.getAttribute !== "undefined" && div.firstChild.getAttribute("href") !== "#") {
			Expr.attrHandle.href = function (elem) {
				return elem.getAttribute("href", 2);
			};
		}
		div = null;
	})();
	if (document.querySelectorAll) {
		(function () {
			var oldSizzle = Sizzle,
				id = "__sizzle__";
			Sizzle = function (query, context, extra, seed) {
				context = context || document;
				if (!seed && !Sizzle.isXML(context)) {
					var match = rSpeedUp.exec(query);
					if (match && (context.nodeType === 1 || context.nodeType === 9)) {
						if (match[1]) {
							return makeArray(context.getElementsByTagName(query), extra);
						} else if (match[2] && Expr.find.CLASS && context.getElementsByClassName) {
							return makeArray(context.getElementsByClassName(match[2]), extra);
						}
					}
					if (context.nodeType === 9) {
						if (query === "body" && context.body) {
							return makeArray([context.body], extra);
						} else if (match && match[3]) {
							var elem = context.getElementById(match[3]);
							if (elem && elem.parentNode) {
								if (elem.id === match[3]) {
									return makeArray([elem], extra);
								}
							} else {
								return makeArray([], extra);
							}
						}
						try {
							return makeArray(context.querySelectorAll(query), extra);
						} catch (qsaError) {}
					} else if (context.nodeType === 1 && context.nodeName.toLowerCase() !== "object") {
						var oldContext = context,
							old = context.getAttribute("id"),
							nid = old || id,
							hasParent = context.parentNode,
							relativeHierarchySelector = /^\s*[+~]/.test(query);
						if (!old) {
							context.setAttribute("id", nid);
						} else {
							nid = nid.replace(/'/g, "\\$&");
						}
						if (relativeHierarchySelector && hasParent) {
							context = context.parentNode;
						}
						try {
							if (!relativeHierarchySelector || hasParent) {
								return makeArray(context.querySelectorAll("[id='" + nid + "'] " + query), extra);
							}
						} catch (pseudoError) {} finally {
							if (!old) {
								oldContext.removeAttribute("id");
							}
						}
					}
				}
				return oldSizzle(query, context, extra, seed);
			};
			for (var prop in oldSizzle) {
				Sizzle[prop] = oldSizzle[prop];
			}
		})();
	}
	(function () {
		var html = document.documentElement,
			matches = html.matchesSelector || html.mozMatchesSelector || html.webkitMatchesSelector || html.msMatchesSelector,
			pseudoWorks = false;
		try {
			matches.call(document.documentElement, "[test!='']:sizzle");
		} catch (pseudoError) {
			pseudoWorks = true;
		}
		if (matches) {
			Sizzle.matchesSelector = function (node, expr) {
				expr = expr.replace(/\=\s*([^'"\]]*)\s*\]/g, "='$1']");
				if (!Sizzle.isXML(node)) {
					try {
						if (pseudoWorks || !Expr.match.PSEUDO.test(expr) && !/!=/.test(expr)) {
							return matches.call(node, expr);
						}
					} catch (e) {}
				}
				return Sizzle(expr, null, null, [node]).length > 0;
			};
		}
	})();
	Expr.order.splice(1, 0, "CLASS");
	Expr.find.CLASS = function (match, context, isXML) {
		if (typeof context.getElementsByClassName !== "undefined" && !isXML) {
			return context.getElementsByClassName(match[1]);
		}
	};

	function dirNodeCheck(dir, cur, doneName, checkSet, nodeCheck, isXML) {
		for (var i = 0, l = checkSet.length; i < l; i++) {
			var elem = checkSet[i];
			if (elem) {
				var match = false;
				elem = elem[dir];
				while (elem) {
					if (elem.sizcache === doneName) {
						match = checkSet[elem.sizset];
						break;
					}
					if (elem.nodeType === 1 && !isXML) {
						elem.sizcache = doneName;
						elem.sizset = i;
					}
					if (elem.nodeName.toLowerCase() === cur) {
						match = elem;
						break;
					}
					elem = elem[dir];
				}
				checkSet[i] = match;
			}
		}
	}

	function dirCheck(dir, cur, doneName, checkSet, nodeCheck, isXML) {
		for (var i = 0, l = checkSet.length; i < l; i++) {
			var elem = checkSet[i];
			if (elem) {
				var match = false;
				elem = elem[dir];
				while (elem) {
					if (elem.sizcache === doneName) {
						match = checkSet[elem.sizset];
						break;
					}
					if (elem.nodeType === 1) {
						if (!isXML) {
							elem.sizcache = doneName;
							elem.sizset = i;
						}
						if (typeof cur !== "string") {
							if (elem === cur) {
								match = true;
								break;
							}
						} else if (Sizzle.filter(cur, [elem]).length > 0) {
							match = elem;
							break;
						}
					}
					elem = elem[dir];
				}
				checkSet[i] = match;
			}
		}
	}
	if (document.documentElement.compareDocumentPosition) {
		Sizzle.contains = function (a, b) {
			return !!(a.compareDocumentPosition(b) & 16);
		};
	} else if (document.documentElement.contains) {
		Sizzle.contains = function (a, b) {
			if (a !== b && a.contains && b.contains) {
				return a.contains(b);
			} else if (!b || b.nodeType == 9) {
				return false;
			} else if (b === a) {
				return true;
			} else {
				return Sizzle.contains(a, b.parentNode);
			}
		};
	} else {
		Sizzle.contains = function () {
			return false;
		};
	}
	Sizzle.isXML = function (elem) {
		var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;
		return documentElement ? documentElement.nodeName !== "HTML" : false;
	};
	var posProcess = function (selector, context) {
		var match, tmpSet = [],
			later = "",
			root = context.nodeType ? [context] : context;
		while ((match = Expr.match.PSEUDO.exec(selector))) {
			later += match[0];
			selector = selector.replace(Expr.match.PSEUDO, "");
		}
		selector = Expr.relative[selector] ? selector + "*" : selector;
		for (var i = 0, l = root.length; i < l; i++) {
			Sizzle(selector, root[i], tmpSet);
		}
		return Sizzle.filter(later, tmpSet);
	};
	dom.selector = dom.find = Sizzle;
	dom.one = function(){
		var result = dom.find.apply(dom.find, arguments);
		if(result && result.length){
			return result[0];
		}
		return null;
	};
})(VEditor, VEditor.dom);
(function(ve){
	/**
	 * 浏览器ua判断
	 **/
	var uas = navigator.userAgent;

	var ua = {
		opera: window.opera && opera.buildNumber,
		webkit: /WebKit/.test(uas),
		ie: Boolean(window.ActiveXObject),
		ie9Mode: false,					//是否为IE9软件
		docMode: document.documentMode,	//文档模式
		gecko: /WebKit/.test(uas) && /Gecko/.test(uas),
		firefox: (document.getBoxObjectFor || typeof(window.mozInnerScreenX) != 'undefined') ? parseFloat((/(?:Firefox|GranParadiso|Iceweasel|Minefield).(\d+\.\d+)/i.exec(uas) || r.exec('Firefox/3.3'))[1], 10) : null,
		mac: uas.indexOf('Mac') != -1,
		chrome: false,
		air: /adobeair/i.test(uas),
		safari: false,
		isiPod: uas.indexOf('iPod') > -1,
		isiPhone: uas.indexOf('iPhone') > -1,
		isiPad: uas.indexOf('iPad') > -1
	};

	if(typeof(navigator.taintEnabled) == 'undefined') {
	    m = /AppleWebKit.(\d+\.\d+)/i.exec(uas);
	    ua.webkit = m ? parseFloat(m[1], 10) : (document.evaluate ? (document.querySelector ? 525 : 420) : 419);
	    if ((m = /Chrome.(\d+\.\d+)/i.exec(uas)) || window.chrome) {
	        ua.chrome = m ? parseFloat(m[1], 10) : '2.0';
	    } else if ((m = /Version.(\d+\.\d+)/i.exec(uas)) || window.safariHandler) {
	        ua.safari = m ? parseFloat(m[1], 10) : '3.3';
	    }
	}

	if(ua.ie){
		ua.ie = 6;

		(window.XMLHttpRequest || (uas.indexOf('MSIE 7.0') > -1)) && (ua.ie = 7);
		(window.XDomainRequest || (uas.indexOf('Trident/4.0') > -1)) && (ua.ie = 8);
		(uas.indexOf('Trident/5.0') > -1) && (ua.ie = 9);
		(uas.indexOf('Trident/6.0') > -1) && (ua.ie = 10);
		ua.ie9Mode = (9 - ((uas.indexOf('Trident/5.0') > -1) ? 0 : 1) - (window.XDomainRequest ? 0 : 1) - (window.XMLHttpRequest ? 0 : 1)) == 9;
		if(ua.ie == 9){
			ua.ie = document.addEventListener ? 9 : 8;	//防止虚假IE9（指的是文档模型为8）
		}
	}

	ve.ua = ua;
})(VEditor);

(function(ve){
	/**
	 * 内部自定义事件处理
	 * 事件部署规则：
	 * 1、所有需要终止事件，终止后续处理方法处理的都放在first里面，(如：Range更新逻辑、某个操作需要终止用户事件默认行为，就可以考虑放入这里)
	 * 2、普通事件放在mid，
	 * 3、对于无主业务影响、需要容错、对结构可能产生辅助性变化的放在Last （如：history添加、字符串检测逻辑）
	 * 4、注意区分回收事件：如KeyUp，这种不一定对应这个逻辑
	 * @example:
	 * var ev = new VEditor.EventManager();
	 * ev.addFirst('hello', function(){});
	 * ev.fire('hello', 'param');
	 **/
	ve.lang.Class('VEditor.EventManager', {
		EventManager: function(){
			this._prevList = [];
			this._midList = [];
			this._lastList = [];
		},

		/**
		 * 添加事件
		 * @param {Function} fn
		 * @param {Boolean} usePipe 是否使用管道（变量引用传递）
		 * @param {Number} pos 添加位置 -1, 1, *
		 **/
		add: function(fn, usePipe, pos){
			var item = {
				fn: fn,
				rec: usePipe
			};

			switch(pos){
				case -1:
					this._prevList.unshift(item);
					break;
				case 1:
					this._lastList.push(item);
					break;
				default:
					this._midList.push(item);
			}
		},

		/**
		 * 添加在开始
		 * @param {Function} fn
		 * @param {Boolean} usePipe 是否使用管道（变量引用传递）
		 **/
		addFirst: function(fn, usePipe){
			return this.add(fn, usePipe, -1);
		},

		/**
		 * 添加在尾部
		 * @param {Function} fn
		 * @param {Boolean} usePipe 是否使用管道（变量引用传递）
		**/
		addLast: function(fn, usePipe){
			return this.add(fn, usePipe, 1);
		},

		/**
		 * 移除指定事件
		 * @return {Boolean}
		 **/
		remove: function(fn){
			var _this = this;
			var found;

			ve.lang.each(this._prevList, function(item, i) {
				if(item.fn == fn){
					_this._prevList.splice(i, 1);
					found = true;
					return false;
				}
			});

			ve.lang.each(this._midList, function(item, i) {
				if(item.fn == fn){
					_this._midList.splice(i, 1);
					found = true;
					return false;
				}
			});

			ve.lang.each(this._lastList, function(item, i) {
				if(item.fn == fn){
					_this._lastList.splice(i, 1);
					found = true;
					return false;
				}
			});
			return found;
		},

		/**
		 * 获取实际顺序的事件数组
		 * @return {Array}
		 **/
		_getList: function(){
			return this._prevList.concat(this._midList).concat(this._lastList);
		},

		/**
		 * 触发事件
		 * 传入参数如果 > 2个，返回值为array，否则返回的为 1个，
		 * 如果事件列表里面函数返回值为false，将中断后续事件触发！！
		 * 如果事件列表里面有usePipe方法，函数必须根据fire的个数来返回相应的格式，如如果fire > 2个，返回array
		 * 否则返回1个，不依照这个规则返回，将可能扰乱整个Event后续方法的正确执行
		 * 整体fire返回最后一个函数处理结果
		 * @param {Arg0} scope
		 * @param {Arg1+} params
		 * @return {Mix}
		 **/
		fire: function(){
			var scope = arguments[0] || this,
				evList = this._getList(),
				arg,
				ret,
				fnRet,
				retIsArray;

			if(arguments.length > 2){
				retIsArray = true;
				arg = ve.lang.arg2Arr(arguments, 1);
			} else {
				arg = arguments[1];
			}

			ret = arg;
			ve.lang.each(evList, function (item) {
				if(retIsArray){
					fnRet = item.fn.apply(scope, ve.lang.extend(true, ret));	//去除参数引用，这里不需要检测ret格式，因为下面throw里面检测了
				} else {
					var _p = !ve.lang.isBomOrDom(ret) && typeof(ret) == 'object' ? ve.lang.extend(true, ret) : ret;
					fnRet = item.fn.call(scope, _p);
				}

				if(item.rec){
					if((retIsArray && ve.lang.isArray(fnRet)) || (!retIsArray && fnRet !== undefined)){
						ret = fnRet;
					} else {
						throw('FUNCTION RETURN FORMAT NOT AVERIBLE');
					}
				}
				if(fnRet === false){
					//console.log('当前操作取消后续事件触发', item);
				}
				return fnRet;
			});
			return fnRet;
		}
	});
})(VEditor);
(function(ve){
	ve.net = ve.net || {};

	var LOADING = false;
	var FILES_QUEUE = [];
	var FILES_LOAD_MAP = {};

	/**
	 * 检测批量文件是否全部加载完成
	 * @param  {Array} fileInfoList
	 * @return {Boolean}
	 */
	var checkLoaded = function(fileInfoList){
		var loaded = true;
		ve.lang.each(fileInfoList, function(fileInfo){
			if(!FILES_LOAD_MAP[fileInfo.src] ||  FILES_LOAD_MAP[fileInfo.src].status != 3){
				loaded = false;
				return false;
			}
		});
		return loaded;
	};

	/**
	 * 批量加载脚本
	 * @param  {Array} fileInfoList 文件列表信息
	 * @param  {Function} allDoneCb  全部文件加载完成回调
	 */
	var batchLoadScript = function(fileInfoList, allDoneCb){
		if(checkLoaded(fileInfoList)){
			allDoneCb();
			return;
		}

		updateListToQueue(fileInfoList, function(){
			if(checkLoaded(fileInfoList)){
				allDoneCb();
			}
		});

		if(!LOADING){
			loadQueue();
		}
	};

	/**
	 * 更新当前要加载的文件到加载队列中
	 * @param  {Array} fileInfoList
	 * @param {Function} 断续回调
	 */
	var updateListToQueue = function(fileInfoList, tickerCb){
		ve.lang.each(fileInfoList, function(fileInfo){
			if(FILES_LOAD_MAP[fileInfo.src]){
				if(FILES_LOAD_MAP[fileInfo.src].status == 1 || FILES_LOAD_MAP[fileInfo.src].status == 2){
					FILES_LOAD_MAP[fileInfo.src].callbacks.push(tickerCb);
				} else if(FILES_LOAD_MAP[fileInfo.src].status == 3){
					tickerCb();
				} else if(FILES_LOAD_MAP[fileInfo.src].status == 4){
					tickerCb(-1);
				}
			} else {
				FILES_QUEUE.push(fileInfo);
				FILES_LOAD_MAP[fileInfo.src] = {
					status: 1,
					callbacks: [tickerCb]
				};
			}
		});
	};

	/**
	 * 加载队列中的脚本
	 */
	var loadQueue = function(){
		if(FILES_QUEUE.length){
			LOADING = true;
			var fileInfo = FILES_QUEUE.shift();
			FILES_LOAD_MAP[fileInfo.src].status = 2;
			forceLoadScript(fileInfo, function(){
				FILES_LOAD_MAP[fileInfo.src].status = 3;
				ve.lang.each(FILES_LOAD_MAP[fileInfo.src].callbacks, function(cb){
					cb();
				});

				//[fix] 防止ie下面的readyState多执行一次导致这里的callback多次执行
				FILES_LOAD_MAP[fileInfo.src].callbacks = [];
				loadQueue();
			});
		} else {
			LOADING = false;
		}
	};

	/**
	 * 强制加载脚本
	 * @param  {Object|String} fileInfo 文件信息，详细配置参考函数内实现
	 * @param  {Function} sucCb
	 * @return {Boolean}
	 */
	var forceLoadScript = function(fileInfo, sucCb){
		var option = ve.lang.extend(true, {
			src: null,			//文件src
			charset: 'utf-8',	//文件编码
			'window': window
		}, fileInfo);

		if(!option.src){
			return false;
		}

		var doc = option.window.document;
		var docMode = doc.documentMode;
		var s = doc.createElement('script');
		s.setAttribute('charset', option.charset);

		ve.dom.event.add(s, ve.ua.ie && ve.ua.ie < 10 ? 'readystatechange': 'load', function(){
			if(ve.ua.ie && s.readyState != 'loaded' && s.readyState != 'complete'){
				return;
			}
			setTimeout(function(){
				sucCb();
			}, 0);

			/**
			if(!s || ve.ua.ie && ve.ua.ie < 10 && ((typeof docMode == 'undefined' || docMode < 10) ? (s.readyState != 'loaded') : (s.readyState != 'complete'))){
				return;
			}
			sucCb();
			**/
		});
		s.src = option.src;
		(doc.getElementsByTagName('head')[0] || doc.body).appendChild(s);
	};

	/**
	 * 加载脚本
	 * @param  {Mix}   arg1     文件信息，支持格式：str || {src:str} || [str1,str2] || [{src: str1}, {src: str2}]
	 * @param  {Function} callback
	 */
	var loadScript = function(arg1, callback){
		var list = [];
		if(typeof(arg1) == 'string'){
			list.push({src:arg1});
		} else if(arg1.length){
			ve.lang.each(arg1, function(item){
				if(typeof(item) == 'string'){
					list.push({src: item});
				} else {
					list.push(item);
				}
			});
		} else {
			list.push(arg1);
		}
		batchLoadScript(list, callback);
	};


	/**
	 * 加载样式
	 * @param  {Mix}   arg1
	 * @param {Function} callback 暂不支持callback
	 */
	var loadCss = function(arg1 /**,callback**/){
		var option = {
			rel: 'stylesheet',
			rev: 'stylesheet',
			media: 'screen',
			href: null,
			win: window
		};
		if(typeof(arg1) == 'string'){
			option.href = arg1;
		} else {
			option = ve.lang.extend(true, option, arg1);
		}
		var doc = option.win.document;
		var css = doc.createElement('link');
		option.win = null;
		for(var i in option){
			if(option[i]){
				css.setAttribute(i, option[i]);
			}
		}
		(doc.getElementsByTagName('head')[0] || doc.body).appendChild(css);
	};

	ve.net.loadScript = loadScript;
	ve.net.loadCss = loadCss;
})(VEditor);
/**
 * String操作方法类
 */
(function (ve) {
	var enre = /(&|"|'|<|>)/g,
		trimre = /^\s+|\s+$/g,
		dere = /(&amp;|&lt;|&gt;|&quot;|&#39;)/g,
		enmap = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;'
		},
		demap = {
			'&amp;': '&',
			'&lt;': '<',
			'&gt;': '>',
			'&quot;': '"',
			'&#39;': "'",
			'&apos;': "'"
		};

	ve.string = {
		htmlencode: function (str) {
			return str.replace(enre, function(_0, _1) {
				return enmap[_1] || _0;
			});
		},
		htmldecode: function (str) {
			return str.replace(dere, function(_0, _1) {
				return demap[_1] || _0;
			});
		},

		/**
		 * 获取html中文本
		 * @param string str
		 * @return string
		 **/
		getTextFromHtml: function(str){
			str = str.replace(/<\w[\s\S]*?>|<\/\w+>/g, '').replace(/\&nbsp;/ig, ' ');
			str = this.htmldecode(str);
			return str;
		},

		trim: function(str){
			if(!str){
				return str;
			}
			return str.replace(trimre, '').replace(ve.fillCharReg, '');
		}
	};
})(VEditor);
(function(window, document, ve) {
	var EXT_FILES_LOADED = false;
	var EDITOR_GUID = 0;

	/**
	 * 编辑器Class类
	 * var ed = new VEditor.Editor(conf);
	 * ed.init();
	 **/
	ve.lang.Class('VEditor.Editor', {
		Editor: function (conf) {
			var t = this;
			t.id = conf.id || ('veditor'+(++EDITOR_GUID));

			//快捷键map
			t._shortcuts = [];

			//IO 接口
			t._ios = {};

			//配置
			t.conf = ve.lang.extend({
				plugins: '',					//插件列表（格式参考具体代码）

				container: '',					//容器，该配置项与下方三个容器互斥，如果container为一个form元素的话， 下方的3个容器为container父元素

				toolbarContainer: '',			//工具条容器!
				iframeContainer: '',			//iframe容器!
				statusbarContainer: '',			//状态条容器

				placeholder: '',				//placeholder，仅检测文字命中部分，不对其他元素进行校验，
												//也就是说，如果placeholder = '<div><b>text</b></div>'；那仅校验 text

				language: 'cn',					//语言包!该功能暂未启用
				adapter: '',					//适配器
				viewer: 'def',					//视图
				editorCss: '',					//编辑器区域样式
				tab4space: 4,					//tab转换空白符个数
				newlineTag: 'div',				//换行符(*)
				autoAdjust: false,				//是否自动适应高度（如果提供该功能，父容器一定不能有固定高度存在）
				useShortcut: 1,					//是否启用常用快捷键(如ctrl+b加粗···)

				styleWithCSS: true,				//是否启用css内联样式
				pluginsyntax: /^([\s\S]+?(?:(\w+)\.js|\(|,|$))\(?([^\)]*)\)?$/,	//插件路径语法规则
				domain: ve.domain || null		//域名
			}, conf);

			ve.lang.each(['toolbarContainer','statusbarContainer', 'iframeContainer', 'container'], function(n) {
				if(t.conf[n]){
					t.conf[n] = ve.dom.get(t.conf[n]);
				}
			});

			//支持表单形式
			t._useForm = false;
			if(t.conf.container){
				if(t.conf.container.tagName == 'INPUT' || t.conf.container.tagName == 'TEXTAREA'){
					t.conf.container.style.display = 'none';
					t._useForm = true;
					t.conf.placeholder = t.conf.placeholder || t.conf.container.getAttribute('placeholder');
				}
				t.conf.toolbarContainer = t.conf.iframeContainer = t.conf.statusbarContainer = t._useForm ? t.conf.container.parentNode : t.conf.container;
			}

			//触发事件
			ve.lang.each(['onInit',
				'onSelect',
				'onKeyPress',
				'onKeyDown',
				'onKeyUp',
				'onMouseOver',
				'onMouseDown',
				'onMouseUp',
				'onClick',
				'onBeforeExecCommand',
				'onAfterExecCommand',
				'onInitComplete',
				'onSelectContent',
				'onUIRendered',
				'onBlur',
				'onFocus',
				'onBeforeOpenListBox',
				'onBeforeGetContent',
				'onGetContent',
				'onBeforeSetContent',
				'onSetContent',
				'onAfterSetContent',
				'onAfterClearContent',
				'onPaste',
				'onAfterPaste',
				'onResize',
				'onPluginsInited',
				'onIframeLoaded',
				'onAfterUpdateVERange',
				'onAfterUpdateVERangeLazy',		//懒惰触发事件
				'onNodeRemoved'], function(n) {
				t[n] = new ve.EventManager(t);
			});

			if(!this.conf.toolbarContainer || !this.conf.iframeContainer){
				throw('NEED CONTAINER SPECIFIED');
			}
			this.conf.statusbarContainer = this.conf.statusbarContainer || this.conf.iframeContainer;
		},

		/**
		 * 加载额外的文件，包括适配器、视图、插件
		 * @param {function} callback
		 **/
		loadExtFiles: function(callback) {
			var _this = this,
				fileList = [];

			//adapter
			if(this.conf.adapter && !ve.adapter){
				var adapter = /^https?\:\/\//.test(this.conf.adapter) && this.conf.adapter || ('adapter/' + this.conf.adapter + '.adapter.js');
				fileList.push(ve.getAbsPath(adapter));
			}

			//view
			var viewsr = /^https?\:\/\//.test(this.conf.viewer) && this.conf.viewer || ('view/' + this.conf.viewer + '/view.js');
			if (!ve.viewManager.get(this.conf.viewer)) {
				this.conf.viewerurl = this.conf.viewer;
				this.conf.viewer = this.conf.viewer.split('/').pop().replace(/\.js/, '');
				fileList.push(ve.getAbsPath(viewsr));
			}

			var pls = this.conf.plugins, re = this.conf.pluginsyntax;
			if(pls){
				ve.lang.each(pls.split(','), function (n) {
					var ma = n.match(re) || [];
					var di= ma[1].replace(/\(/, '');
					if(!ve.plugin.get(di)){
						fileList.push(ve.plugin.parsePluginPath(di, di));
					}
				});
			}

			if(fileList.length){
				ve.net.loadScript(fileList, callback);
			} else {
				callback();
			}
		},

		/**
		 * 启动插件
		 **/
		_launchPlugins: function(){
			var url = {}, ppc = [], matches, t = this,
				pls = this.conf['plugins'],
				plUrlPre = ve.getAbsPath('plugins/'),
				plm = ve.plugin;

			if (pls) {
				ve.lang.each(pls.split(','), function (n) {
					matches = n.match(t.conf.pluginsyntax);
					if (/^https?/.test(matches[1]) && matches[2] != 'plugin') matches[3] = matches[2];
					if (matches[3]) {
						ppc = ppc.concat(matches[3].split('+'));
						url[matches[1].replace(/\(/g, '') || matches[3]] = matches[3] || matches[1];
					}
					else {
						ppc.push(n);
						url[n] = n;
				}
				});
			}
			ve.lang.each(url, function (n, i) {
				ve.lang.each(n.split('+'), function (m) {
					url[m] = i;
				});
			});

			ve.lang.each(ppc, function (n, i) {
				var c = plm.get(n), o;
				if (c) {
					try {
						o = new c();
						if (o.init) {
							o.init(t, /^https?/.test(url[n]) ? url[n] : (plUrlPre+url[n]+'/'));
						}
					} catch(ex){
						console.log('编辑器插件报错:',n, ex);
					}
				}
			});

			// 所有插件init调用完毕后触发onPluginsInited事件
			t.onPluginsInited.fire(t);
		},

		/**
		 * 编辑器初始化，包括可编辑区域初始化
		 * @deprecate 这里必须在上面createLayout之后执行
		 **/
		init: function() {
			var t = this;

			//预加载文件
			if(!EXT_FILES_LOADED){
				t.loadExtFiles(function(){
					EXT_FILES_LOADED = true;
					t.init();
				});
				return;
			}

			//初始化视图管理器
			var view = ve.viewManager.get(this.conf.viewer);
			if (!view){
				throw('NO VIEWER FOUND');
			}
			this.viewControl = new view();
			this.viewControl.init(this, this.conf.viewerurl || this.conf.viewer);
			this.editorcommands = new ve.EditorCommands(this);

			//创建iframe
			this.createIframe();

			//渲染布局
			this.viewControl.renderBaseLayout();

			if (!ve.ua.ie || !this.conf.domain){
				t.initIframe();
			}

			this._launchPlugins();

			//渲染toolbar
			this.viewControl.renderToolbar();
			this.onUIRendered.fire();

			if(t._iframeInited){
				//console.log('主脚本检测到t._iframeInited, 执行t._fireInitComplete');
				t._fireInitComplete();
			} else {
				//console.log('主脚本检测到iframe还没有加载完');
				t._needFireInitCompleteInInitIframe = true;
			}
			return t;
		},

		/**
		 * 创建编辑器iframe
		 * @deprecate 这里区分了domain情况和对ie等浏览器兼容处理
		 **/
		createIframe: function(){
			var _this = this;
			this.iframeHTML = (ve.ua.ie && ve.ua.ie < 9 ? '': '<!DOCTYPE html>');
			this.iframeHTML += '<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';

			//设置了domain
			var frameUrl = 'javascript:;';
			if (this.conf.domain) {
				if (ve.ua.ie){
					frameUrl = 'javascript:(function(){document.open();document.domain="' + this.conf.domain + '";var ed = window.parent.VEditor.get("' + this.id + '");document.write(ed.iframeHTML);document.close();ed.initIframe();})()';
				}
				this.iframeHTML += '<script type="text/javascript">document.domain = "' + this.conf.domain + '";</script>';
			}
			this.iframeHTML += '</head><body></body></html>';

			//创建<iframe>
			this.iframeElement = ve.dom.create('iframe', {
				id: this.id + '_Iframe',
				src: frameUrl,
				frameBorder: '0',
				allowTransparency: 'true',
				style: {
					width : '100%',
					height : this.conf.height ? this.conf.height+'px' : 'auto'
				}
			});
			ve.dom.event.add(this.iframeElement, 'load', function(){	//加载事件必须优先于append操作
				_this.onIframeLoaded.fire(_this.iframeElement);
			});
			this.iframeContainer = ve.dom.create('div', {'class': 'veIframeContainer editor_iframe_container_' + this.id, 'style': {width: this.conf.width}});
			this.iframeContainer.appendChild(this.iframeElement);
		},

		_initCompleteFired: false,
		_fireInitComplete: function(){
			var t = this;
			if(t._initCompleteFired){
				//console.log('_initCompleteFired已经fired过了');
				return;
			} else {
				//这个延时主要是之前的跑时钟检测的方法可能在非ie浏览器里面变成了同步，因此一些脚本可能因此而受影响（不一定需要100ms）
				//还有一个原因是，这个可以给插件的执行放出空闲的时间（不一定需要100）
				//或者可以考虑这个t.onInitComplete.add可以用triggle代替
				//console.log('命中fire逻辑，延时100ms后fire');
				t._initCompleteFired = true;
				setTimeout(function(){
					t.onInitComplete.fire(t, t);
				}, 100);
			}
		},

		//是否需要在initIframe里面执行initComplete事件
		_needFireInitCompleteInInitIframe: false,
		_iframeInited: false,
		initIframe: function () {
			if(this._iframeInited){
				return;
			}

			var t = this, d;
			try {
				d = this.getDoc();
			} catch(ex){
				throw('IE IFRAME访问没有权限');
			}

			// if(!d.body){
			// 	console.log('d.body 不命中', d.body);
			// 	window.setTimeout(function(){t.initIframe();}, 1000);
			// 	return;
			// }

			//chrome在这里有bug，关闭该选项会导致app页面有时候不触发window.unload事件
			//估计旧版的chrome不会有这个问题
			d.open();
			d.write(t.iframeHTML);
			d.close();

			if(ve.ua.ie){
                d.body.disabled = true;
                d.body.contentEditable = true;
                d.body.disabled = false;
			} else {
				d.body.contentEditable = true;
                d.body.spellcheck = false;
			}

			if(this.conf.height){
				d.body.style.height = t.conf.height + 'px';
			}

			d.body.innerHTML = this.getEmptyHelperHtml();
			t.bindEditorDomEvent();
			t.onInit.fire();

			if (t.conf.styleWithCSS) {
				try {
					d.execCommand("styleWithCSS", 0, true);
				} catch (e) {
					try {
						d.execCommand("useCSS", 0, true);
					} catch (e) {}
				}
			}

			if(t.conf.editorCss){
				ve.dom.insertStyleSheet(null, t.conf.editorCss, d);
			}

			t._iframeInited = true;

			if(t._needFireInitCompleteInInitIframe){
				t._fireInitComplete();
			}
		},

		/**
		 * 显示状态条
		 * @param {string} html
		 * @param {integer} timeout 超时隐藏秒数
		 * @param {bool} showCloseBtn 是否显示关闭按钮（缺省为true）
		 */
		showStatusbar: function(html, timeout, showCloseBtn) {
			var _this = this;
			ve.dom.setStyle(this.statusbarContainer, 'display', 'block');
			if(showCloseBtn === undefined || showCloseBtn){
				html = '<a href="javascript:;" id="ve_editor_status_bar_close_btn" style="text-decoration:none">X</a>' + html;
			}
			this.statusbarContainer.innerHTML = '<div class="veStatusbarContainer_wrap">'+html+'</div>';
			ve.dom.event.add(ve.dom.get('ve_editor_status_bar_close_btn'), 'click', function(e){
				_this.hideStatusbar();
				ve.dom.event.preventDefault(e);
				return false;
			});
			if(timeout){
				window.setTimeout(function(){
					_this.hideStatusbar();
				}, timeout*1000);
			}
		},

		/**
		 * 隐藏状态条
		 */
		hideStatusbar: function() {
			var t = this;
			ve.dom.setStyle(t.statusbarContainer, 'display', 'none');
		},

		/**
		 * 聚焦
		 */
		focus: function () {
			this.getWin().focus();
			var rng = this.getVERange();
			rng.select(true);
			this.onFocus.fire(this);
		},

		/**
		 * 检测编辑器是否在聚焦状态
		 * @return {Boolean}
		 **/
		isFocused: function(){
			var nativeRange = ve.Range.getNativeRange(this.getWin(), this.getDoc());
			if(ve.ua.ie){
				return !!nativeRange;
			} else {
				return nativeRange && nativeRange.rangeCount;
			}
		},

		/**
		 * 获取编辑区域window
		 * @return {DOM}
		 */
		_win: null,
		getWin: function () {
			if(!this._win){
				this._win = ve.dom.get(this.id+'_Iframe').contentWindow;
			}
			return this._win;
		},

		/**
		 * 获取编辑区域document
		 * @return {DOM}
		 **/
		_doc: null,
		getDoc: function () {
			if(!this._doc){
				var w = this.getWin();
				this._doc = w.contentDocument || w.document;
			}
			return this._doc;
		},

		/**
		 * 获取编辑区域body
		 * @return {DOM}
		 **/
		getBody: function () {
			return this.getDoc().body;
		},

		/**
		 * 添加快捷键
		 * @param {string} p 快捷键，如 ctrl+b
		 * @param {mix} cmd 处理函数，支持command内函数
		 */
		addShortcut: function (p, cmd) {
			if(!this.conf.useShortcut){
				return;
			}

			var _this = this, fn;

			if(typeof(cmd) == 'function'){
				fn = cmd;
			} else if(this.editorcommands.hasCommand(cmd)){
				fn = function(){
					_this.editorcommands.execCommand(cmd, false);
					return false;
				}
			} else {
				throw('NO SHORTCUT HANDLER FOUND');
			}

			p = p.toLowerCase();
			var k = p.split('+'),
				o = {fn:fn, alt:false,ctrl:false,shift:false, meta:false};
			ve.lang.each(k, function (v) {
				switch (v) {
					case 'alt':
					case 'ctrl':
					case 'shift':
					case 'meta':
						o[v] = true;
						break;
					case 'enter':
						o.keyCode = 13;
						break;
					default:
						o.charCode = v.charCodeAt(0);
						o.keyCode = v.toUpperCase().charCodeAt(0);
						break;
				}
			});
			_this._shortcuts.push(o);
		},

		/**
		 * 移除多余的div
		 * @param {string}
		 * @return {string}
		 **/
		_removeExtDiv: function(str){
			str = ve.string.trim(str);
			var div = document.createElement('div');
			div.innerHTML = str;
			if(/^<div>[\s\S]*<\/div>$/i.test(div.innerHTML) && div.childNodes.length == 1){
				str = str.replace(/\r\n/g, '').replace(/^<div>/i, '').replace(/<\/div>$/i, '');
				if(!ve.ua.ie && /<br\s*>$/i.test(str)){
					str = str.replace(/<br\s*>$/i, '');
				}
			}
			return str;
		},

		/**
		 * 设置编辑器内容
		 * @param {Object} params 该参数跟insertHtml对接 默认聚焦开始、添加历史
		 **/
		setContent: function(params){
			this.onBeforeSetContent.fire(this, params);
			var _this = this;
			params = ve.lang.extend(true, {forcusFirst: true}, params);

			if(!this.isFocused()){
				this.focus();
			}

			var body = this.getDoc().body;
			body.innerHTML = this.getEmptyHelperHtml();
			var rng = this.getVERange();
			rng.setStart(body.firstChild || body, 0);
			rng.collapse(true);

			//去除多余的外部div
			//这样后面getContent就可以直接用上emptyhelperhtml了
			params.content = this._removeExtDiv(params.content);

			//修正ie结构错乱情况
			if(ve.ua.ie){
				params.content = '<div class="veditor_content_fix">' + params.content + '</div>';
			}

			this.insertHtml(params);

			//修正ie结构错乱情况
			if(ve.ua.ie){
				var _ns = this.getDoc().body.getElementsByTagName('div');
				if(_ns){
					for(var i=_ns.length-1; i>=0; i--){
						if(_ns[i].className == 'veditor_content_fix'){
							ve.dom.remove(_ns[i], true);
						}
					}
				}
			}

			//聚焦点到开始
			if(params.forcusFirst){
				var first = this.getBody().firstChild;
				if(!first){
					first = this.getDoc().createElement('DIV');
					this.getBody().appendChild(first);
				}
				if(ve.dtd.$empty[first.tagName]){
					rng.setStartBefore(first);
				} else if(first.firstChild){
					rng.setStartBefore(first.firstChild);
				} else {
					rng.selectNodeContents(first);
				}
			}

			rng.collapse(true);
			rng.select(true);
			this.updateLastVERange();
			this.onAfterSetContent.fire(this, params);
		},

		/**
		 * 获取VEditor.Range对象
		 * 这个对于IE失焦问题尤为关键
		 * ie6 ，如果在iframe外面操作，可能导致range的parentElement丢失变成 iframe.contentWindow.parentNode
		 * @deprecate 考虑到onAfterUpdateVERange需要正确触发，这里不再自身new 一个 range, 而是走updateLoatVERange()
		 * @return {Range}
		 */
		_lastVERange: null,
		getVERange: function(){
			return this._lastVERange || this.updateLastVERange();
		},

		/**
		 * 更新最后操作range缓存
		 * @param {Range} rng
		 * @return {Range}
		 **/
		_updateRangeTimer: null,
		updateLastVERange: function(rng){
			clearTimeout(this._updateRangeTimer);
			var _this = this;

			if(!rng){
				rng = new ve.Range(this.getWin(), this.getDoc());
				rng.convertBrowserRange();
			}

			this._lastVERange = rng;
			this.onAfterUpdateVERange.fire(this._lastVERange);

			this._updateRangeTimer = setTimeout(function(){
				_this.onAfterUpdateVERangeLazy.fire(_this._lastVERange);
			}, 50);
			return this._lastVERange;
		},

		/**
		 * 查询选中区域样式
		 * @deprecate 这里只能返回首个命中的元素样式这里不能太快触发，否则会有性能问题
		 * @return {string}
		 **/
		querySelectionStyle: function(styleKey){
			var rng = this.getVERange();
			var el;
			if(rng.collapsed || rng.startContainer.nodeType == 3){
				el  = rng.startContainer;
			} else {
				el = rng.startContainer.childNodes[rng.startOffset];
			}

			if(!el){
				return null;
			}
			if(el && el.nodeType != 1){
				try {
					if(!el.ownerDocument || !el.parentNode){
						return null;
					}
					el = el.parentNode;
				} catch(ex){}
			}
			var styleVal;
			try {
				var styleVal = ve.dom.getStyle(el, styleKey);
			} catch(ex){}
			return styleVal;
		},

		/**
		 * 插入html到当前选区，并将焦点移动到插入完的html区段之后
		 * @param {Object} params 参数意义请看方法内详细注释
		 **/
		insertHtml: function(params){
			var _this = this;
			params = ve.lang.extend(true, {
				content: null,			//插入内容
				useParser: false		//是否使用过滤器对内容进行过滤
			}, params);

			//内容空
			if(!ve.string.trim(params.content)){
				return;
			}

			//过滤器
			if(params.useParser){
				_html = this.onSetContent.fire(this, params.content);
				params.content = _html === undefined ? params.content : _html;
			}

			//执行命令
			this.editorcommands.execCommand('insertHtml', params.content);
		},

		/**
		 * add IO property to current editor object
		 * @param {string} exp
		 * @param {Mix} mix
		 */
		addIO: function(exp, mix){
			if(this._ios[exp]){
				throw "IO ALREADY EXISTS, "+exp;
			}
			this._ios[exp] = mix;
		},

		/**
		 * try to use specified IO
		 * @todo 这里需要考虑是否统一以异步方式执行fn
		 * @param {string|array} exp
		 * @param {function} succCb
		 * @param {function} errCb
		 */
		tryIO: function(exp, succCb, errCb){
			errCb = errCb || function(){};
			var _this = this;

			var fn = function(){
				var params = [];
				var exps = ve.lang.isArray(exp) && exp.length ? exp : [exp];
				ve.lang.each(exps, function(p){
					if(_this._ios[p]){
						params.push(_this._ios[p]);
					}
				});
				if(params.length){
					succCb.apply(_this, params);
				} else {
					errCb.apply(_this, params);
				}
			};
			this._initCompleteFired ? fn() : this.onInitComplete.addFirst(fn);
		},

		/**
		 * 获取html内容
		 * @return {string}
		 */
		getContent: function () {
			this.onBeforeGetContent.fire(this);
			var html = this.getBody().innerHTML || '';
			if(html){
				html = this.onGetContent.fire(this, html);
				html = html.replace(ve.fillCharReg, '');
			}
			return html;
		},

		/**
		 * 获取选择区域的html内容
		 * @return {string}
		 **/
		getSelectionContent: function(){
		},

		/**
		 * 获取文本内容
		 * @return {string}
		 */
		getTextContent: function(){
			return ve.string.getTextFromHtml(this.getContent());
		},

		/**
		 * 获取光标位置
		 * @deprecate 这里光标的位置可能会因为line-height和非等宽字符的影响
		 * @return {Mix}
		 **/
		getStartCaretRegion: function(){
			var rng = this.getVERange(),
				s = rng.startContainer,
				doc = this.getDoc();

			if(s.nodeType == 1){
				var _psNode;
				_psNode = doc.createElement('span');
				_psNode.style.cssText = 'display:inline-block; height:1px;width:1px;';

				if(rng.startContainer.childNodes.length == 0){
					return ve.dom.getRegion(rng.startContainer).top;
				}

				var offset = rng.startOffset;
				if(!rng.startContainer.childNodes[offset] && offset>0){
					offset--;
				}
				ve.dom.insertBefore(_psNode, rng.startContainer.childNodes[offset]);
				var region = ve.dom.getRegion(_psNode);
				ve.dom.remove(_psNode);
				retVal = region.top + region.height;
			} else if(s.nodeType == 3){
				var _psNode = doc.createElement('span');
					ve.dom.insertBefore(_psNode, s);
					_psNode.style.cssText = 'display:inline-block; height:1px;width:1px;';

				var _nsNode = doc.createElement('span');
					ve.dom.insertAfter(_nsNode, s);
					_nsNode.style.cssText = 'display:inline-block; height:1px;width:1px;';

				var _sRegion = ve.dom.getRegion(_psNode),
					_nRegion = ve.dom.getRegion(_nsNode),
					_cmY = (_sRegion.top + _sRegion.height + _nRegion.top + _nRegion.height) / 2,
					_psTextOffset = rng.startOffset || 1,
					_nsTextOffset = s.nodeValue.length - rng.startOffset || 1;

				ve.dom.remove(_psNode);
				ve.dom.remove(_nsNode);

				if(_nsTextOffset == 0 && _psTextOffset == 0){
					retVal = _nRegion.top;
				} else {
					if(_psTextOffset == 0){
						retVal = _sRegion.top + _sRegion.height;
					} else if(_nsTextOffset == 0){
						retVal = _nRegion.top;
					} else {
						var _tmpTop = _sRegion.top + _sRegion.height;
						retVal = _tmpTop +  (_nRegion.top - _tmpTop) * _psTextOffset / (_nsTextOffset + _psTextOffset);
					}
				}
			}
			return retVal === null ? null : parseInt(retVal, 10);
		},

		/**
		 * 清除内容
		 * @deprecate 该步骤会记录undo
		 */
		clearContent: function() {
			var body = this.getBody();
			body.innerHTML = this.getEmptyHelperHtml();
			this.updateLastVERange();
			this.focus();
			var rng = this.updateLastVERange();
			if(body.firstChild){
				rng.setStart(body.firstChild);
				rng.collapse(true);
			}
			this.onAfterClearContent.fire();
		},

		/**
		 * 获取空内容默认填充html
		 * @return {string}
		 **/
		getEmptyHelperHtml: function(){
			return '<div>'+ (ve.ua.ie ? '' : '<br/>') + '</div>';
		},

		/**
		 * 检测内容是否为空
		 * 指的是：不包含文本且不包含img、flash等实例对象
		 * 这里的空值判断有误差，因为一些元素可能存在样式认为因素
		 * 所以这里后期产品会依赖一些策略辅助
		 * @return {Boolean}
		 **/
		isEmpty: function(){
			var textContent = this.getTextContent();
				textContent = ve.string.trim(textContent);
			if(textContent){
				return false;
			} else {
				var empty = true;
				var nodes = this.getBody().getElementsByTagName('*');
				ve.lang.each(nodes, function(node){
					if(!ve.dtd.$removeEmpty[node.tagName] &&
						!ve.dtd.$removeEmptyBlock[node.tagName] &&
						node.tagName != 'BR' &&
						node.nodeType == 1){
						empty = false;
						return true;
					}
				});
				return empty;
			}
		},

		/**
		 * 编辑器resize刷新高度
		 * 折腾的自动增高
		 */
		resize: function(){
			if(!this.conf.autoAdjust){
				return;
			}
			var t = this, b = t.getBody();

			t.iframeContainer.style.height = 'auto';	//这个已经没有作用。 高度完全有iframe自身决定
			b.style.overflow = 'hidden';

			var h = this.getContentHeight();
			t.setHeight(h);
		},

		/**
		 * 获取实际编辑区域高度
		 * @return {Number}
		 */
		getContentHeight: function(){
			var t = this, d = t.getDoc(), b = t.getBody(), tmpNode, h;
			tmpNode = d.createElement('span');
			tmpNode.style.cssText = 'display:block;width:0;margin:0;padding:0;border:0;clear:both;';
			b.appendChild(tmpNode);
			h = ve.dom.getXY(tmpNode)[1] + tmpNode.offsetHeight;
			ve.dom.remove(tmpNode);
			return h;
		},

		/**
		 * 设置高度
		 * @deprecated 设置的高度不能小于默认提供的参数高度
		 * @param {Number} h
		 */
		_lastHeight: 0,
		setHeight: function(h){
			h = Math.max(this.conf.height, h);
			if(h != this._lastHeight){
				if (h !== parseInt(this.iframeElement.style.height)){
					//this.iframeContainer.style.height = h  +  'px';
	                this.iframeElement.style.height = h  +  'px';
	            }
	            //ie9下body 高度100%失效，改为手动设置
	            if(ve.ua.ie == 9){
	                this.getBody().style.height = (h-20)+'px';
	            } else {
	            	this.getDoc().getElementsByTagName('HTML')[0].style.height = '100%';
	            	this.getBody().style.height = '100%';
	            }
	            this._lastHeight = h;
			}
		},

		/**
		 * 绑定编辑器相关的事件
		 */
		bindEditorDomEvent: function () {
			var t = this, w = t.getWin(), d = t.getDoc(), b = t.getBody();

			//批量添加鼠标、键盘事件
			ve.lang.each(['Click', 'KeyPress', 'KeyDown', 'KeyUp', 'MouseDown', 'MouseUp', 'Select', 'Paste'], function(_ev){
				ve.dom.event.add(d.body, _ev.toLowerCase(), function(e){
					t['on'+_ev].fire(t,e);
					//粘贴后
					if(_ev == 'Paste'){
						setTimeout(function(){
							t.onAfterPaste.fire(t);
						}, 0);
					}
				});
			});

			//自动调整高度功能
			if (t.conf.autoAdjust) {
				t.onAfterUpdateVERangeLazy.add(function(){
					t.resize();
				});
			}

			//使用表单提交数据
			if(t._useForm){
				t.onAfterUpdateVERangeLazy.add(function(){
					t.conf.container.value = t.getContent();
				});
			}

			//绑定快捷键
			t.bindShortCutEvent();

			//[fix] ctrl+a全选问题
			t.addShortcut('ctrl+a', function(){
				t.selectAll();
			});

			if(ve.ua.ie){
				var isMailLink = function(n){
					return n && n.nodeType == 1 && n.tagName == 'A' && n.href && n.href.toLowerCase().indexOf('mailto') == 0;
				};
				t.onKeyDown.add(function(e) {
					var cc = e.keyCode || e.charcode;

					//[fix]IE下面backspace对control range的处理
					//ie下这个操作会导致整个body被删除reset会没有编辑态的body
					if (8 == cc) {
						var rng = t.getVERange();
						if(!rng.collapsed){
							rng.deleteContents();
							ve.dom.event.preventDefault(e);
						}

						//[fix] ie对mailto:a 处理问题
						//修正ie删除 <a mailto>text</a>|  会删除整个a，而不是删除text，由于mailto很
						//可能是ie678自身补全机制产生的链接，因此需要做控制
						else if(rng.collapsed && ve.ua.ie){
							var sc = rng.startContainer;
							var so = rng.startOffset;
							if(isMailLink(sc)){
								if(!so){
									rng.setStartBefore(rng.startContainer);
									rng.collapse(true);
									rng.select(true);
									ve.dom.event.preventDefault(e);
								} else if(so == sc.childNodes.length){
									var bookmark = rng.createBookmark();
									var sb = bookmark.start.previousSibling;
									if(sb && sb.nodeType == 3 && sb.nodeValue.length){
										if(sb.nodeValue.length == 1){
											ve.dom.remove(sb);
										} else {
											sb.nodeValue = sb.nodeValue.substring(0,sb.nodeValue.length-1);
										}
									}
									ve.dom.remove(rng.startContainer, true);
									rng.moveToBookmark(bookmark);
									rng.collapse(true);
									rng.select(true);
									ve.dom.event.preventDefault(e);
								}
							} else if(so && sc.nodeType == 1 && sc.childNodes[so-1]){
								var cur = sc.childNodes[so-1];
								if(cur.nodeType == 3 && !ve.string.trim(cur.nodeValue)){
									cur = cur.previousSibling;
								}
								if(isMailLink(cur) && cur.lastChild.nodeType == 3){
									var bookmark = rng.createBookmark();
									var sb = cur.lastChild;
									if(sb.nodeValue.length == 1){
										ve.dom.remove(sb);
									} else {
										sb.nodeValue = sb.nodeValue.substring(0,sb.nodeValue.length-1);
									}
									ve.dom.remove(cur, true);
									rng.moveToBookmark(bookmark);
									rng.collapse(true);
									rng.select(true);
									ve.dom.event.preventDefault(e);
								}
							}

							/**fix IE下删除列表除第一个LI外其他LI，跳出列表的问题
							 * <ol>
							 *	<li>aaaa</li>
							 *	<li>|bbbb</li>
							 * </ol>
							 * bbbb会跳出ol的问题
							 */
							if(isStartInParent(rng)){ //选区开始在某列表内且前面没有显示的兄弟元素
								if (rng.startContainer.parentNode.tagName == 'UL' || rng.startContainer.parentNode.tagName == 'OL' || rng.startContainer.parentNode.tagName == 'LI') { //当前选取在列表内
									try{
										currentLI = ve.dom.getParent(rng.startContainer, function(node){return node.tagName == 'LI';});
									}catch (ev){
										currentLI = '';
									}
									//console.log(currentLI.innerHTML);
									if(currentLI && currentLI.previousSibling && currentLI.previousSibling.tagName == 'LI'){ //非列表内第一个li
										rng.startContainer = currentLI.previousSibling;
										rng.startOffset = currentLI.previousSibling.childNodes.length;
										rng.collapse(true);
										rng.select();
										while(currentLI.firstChild){
											currentLI.previousSibling.appendChild(currentLI.firstChild);
										}
										ve.dom.remove(currentLI);
										ve.dom.event.preventDefault(e);
									}
								}
							}
						}
					}

					//[fix]ie delete 删除空容器出错
					else if(ve.dom.event.DELETE == cc){
						var rng = t.getVERange();
						var start = rng.startContainer;
						var end = rng.endContainer;

						//[fix]ie删除最后一个helper div，阻止删除最后一个div
						if(end.nodeType == 1 && end.tagName == 'DIV' && !ve.string.trim(end.style.cssText)){
							if(rng.doc.body.firstChild == rng.doc.body.lastChild && rng.doc.body.firstChild == end && rng.endOffset == end.childNodes.length){
								if(!ve.string.trim(end.innerHTML) || rng.collapsed){
									ve.dom.event.preventDefault(e);
									return;
								} else if(!rng.collapsed){
									rng.deleteContents();
									rng.collapse(true);
									rng.select();
									ve.dom.event.preventDefault(e);
									return;
								}
							}
						}

						//[fix] ie删除contenteditabled = false 的节点出错
						if(!rng.collapsed){
							rng.deleteContents();
							rng.collapse(true);
							rng.select();
							ve.dom.event.preventDefault(e);
							return;
						}

						if(rng.collapsed && start.nodeType == 1 && start.tagName != 'BODY' && !start.innerHTML.replace(ve.fillCharReg, '')){
							if(start.tagName == 'DIV'){		//删除空div，需要插入br来弥补（空div ie下引发hasLayout，独占一行）
								var br = rng.doc.createElement('br');
								ve.dom.insertBefore(br, start);
								ve.dom.remove(start);
								rng.setStartAfter(br);
							} else {
								rng.setStartBefore(start);
								ve.dom.remove(start);
							}
							rng.collapse(true);
							rng.select();
							ve.dom.event.preventDefault(e);
						}
					}
				});
			}

			//其他浏览器的删除
			else {
				t.onKeyDown.add(function(e){
					if(e.keyCode == ve.dom.event.DELETE){
						var rng = t.getVERange();
						if(!rng.collapsed){
							rng.deleteContents();
							rng.collapse(true);
							rng.select();
							ve.dom.event.preventDefault(e);
						}
					}
					/**
					 * fix chrome,firefox等浏览器无法删除列表第一个元素的情况
					 * <ol>
					 * 	  <li>|ddd</li>
					 * </ol>
					 * 广标后面有ddd等其他内容即使是个空格，无法删除该LI的情况
					 */
					else if(e.keyCode == 8){ //其他浏览器中列表首个删除fix
						var rng = t.getVERange();
						var currentLI,tempParent;
						if(!rng.collapsed){ //选中某段文字的情况，暂用浏览器默认方法
							return;
						}else{ //鼠标在列表内未选择任何文字的情况
							if(isStartInParent(rng)){ //鼠标在父节点内且前面没有显示的兄弟元素
								if (rng.startContainer.parentNode && (rng.startContainer.parentNode.tagName == 'UL' || rng.startContainer.parentNode.tagName == 'OL' || rng.startContainer.parentNode.tagName == 'LI')) { //当前选取在列表内
									try{
										currentLI = ve.dom.getParent(rng.startContainer, function(node){return node.tagName == 'LI';});
									}catch (ev){
										currentLI = '';
									}
									if(currentLI && currentLI.parentNode && currentLI.parentNode.parentNode && currentLI.parentNode.firstChild == currentLI){ //当前为列表的第一个li
										while(currentLI.firstChild){
											currentLI.parentNode.parentNode.insertBefore(ve.dom.remove(currentLI.firstChild), currentLI.parentNode);
										}
										rng.select(true);
										if(currentLI && (tempParent = currentLI.parentNode)){
											ve.dom.remove(currentLI);
											if(!tempParent.firstChild){
												ve.dom.remove(tempParent);
											}
										}
									}
									else if(currentLI && currentLI.previousSibling.tagName == 'LI'){ //非列表内第一个li
										rng.startContainer = currentLI.previousSibling;
										rng.startOffset = currentLI.previousSibling.childNodes.length;
										rng.collapse(true);
										rng.select();
										while(currentLI.firstChild){
											currentLI.previousSibling.appendChild(currentLI.firstChild);
										}
										ve.dom.remove(currentLI);
										ve.dom.event.preventDefault(e);
									}
								}
							}
						}
					}
				});
			}

			if (ve.ua.chrome) {
				//[fix]chrome下无法选中图片
				t.onMouseDown.add(function(e) {
					var rng = t.getVERange();
					var node = ve.dom.event.getTarget(e);
					if(node.tagName == 'IMG'){
						rng.selectNode(node);
						rng.select();
					}
				});

				//[fix] chrome下 div>img.float 情况delete无法删除后面img情况
				t.onKeyDown.add(function(e){
					var rng = t.getVERange();
					if(rng.collapsed && e.keyCode == ve.dom.event.DELETE){
						var bookmark = rng.createBookmark();
						var end = bookmark.end;
						var nextNode = ve.dom.getNextDomNode(bookmark.start);
						if(nextNode && nextNode.nodeType == 1 && nextNode.tagName == 'IMG'){
							ve.dom.remove(nextNode);
						}
						rng.moveToBookmark(bookmark);
					}
				});
			};

			//更新VERange
			//[fix]webkit或者firefox下，鼠标拖选如果出了二级页区域，将不触发mouseup事件
			if(ve.ua.webkit || ve.ua.firefox){
				var _mouse_up_fired = true;
				t.onBeforeExecCommand.addFirst(function(){
					if(!_mouse_up_fired){
						t.updateLastVERange();
					}
				});
				t.onMouseDown.add(function(){
					if(!_mouse_up_fired){
						t.updateLastVERange();
					}
					_mouse_up_fired = false;
				});
				t.onMouseUp.add(function(){
					_mouse_up_fired = true;
				});
			}

			//[fix] ie 右键全选没有更新range
			if(ve.ua.ie){
				var inContextMode = false;
				t.onMouseDown.addLast(function(){
					inContextMode = false;
				});
				t.onMouseUp.addLast(function(ev){
					if(ve.dom.event.getButton(ev) == 1){
						inContextMode = true;
					}
				});
				t.onKeyDown.add(function(){
					inContextMode = false;
				});
				t.onSelect.add(function(){
					if(inContextMode){
						t.updateLastVERange();	//非IE浏览器
						inContextMode = false;
					}
				});
			}

			//更新VERange
			//[fix] ie678,webkit下，选中文字，点击文字中间之后没有能够获取到正确selection
			//...400ms可以获取到正确
			t.onMouseUp.add(function(e){
				var lastRange = t.getVERange();
				if(lastRange.collapsed){
					t.updateLastVERange();
					return;
				}

				var mouseX = ve.dom.event.mouseX(e);
				var mouseY = ve.dom.event.mouseY(e);

				setTimeout(function(){
					try {
						var sel = ve.Range.getNativeSelection(w, d), rng;
						if(sel.type == 'None'){
							rng = ve.Range.getNativeRange(w, d);
							rng.moveToPoint(mouseX,mouseY);
						}
						if(rng){
							var cusRange = new ve.Range(w, d);
							cusRange.convertBrowserRange(rng);
							t.updateLastVERange(cusRange);
							return;
						}
					}catch(ex){};
					t.updateLastVERange();	//非IE浏览器
				}, 50);
			});

			//更新VERange
			t.onKeyUp.addFirst(function(e){
				if(e.keyCode != 16 && e.shiftKey){
					//按着shift松开其他按键[方向键]这种情况不能更新range，否则会出现用户选择不全的情况
				}
				//去除 ctrl+v，中文输入法冲突
				else if(!e.ctrlKey && e.keyCode != 17 && e.keyCode != 229){
					t.updateLastVERange();
				}
			});

			//更新VERange
			//粘贴后
			t.onAfterPaste.addFirst(function(){
				t.updateLastVERange();
			});

			//更新VERange
			t.onAfterExecCommand.addFirst(function(){t.updateLastVERange();});

			//placeholder 功能
			if(t.conf.placeholder){
				var _comp = function(html){
					var txt = ve.string.getTextFromHtml(html);
					return ve.string.trim(txt) == ve.string.trim(ve.string.getTextFromHtml(t.conf.placeholder));
				}

				var _getting = false;
				var updatePh = function(){
					_getting = true;
					if(_comp(t.getContent())){
						t.setContent({content:'',addHistory:false});
					}
					_getting = false;
				};

				t.onGetContent.add(function(str){
					return !_getting && _comp(str) ? '' : str;
				}, true);

				t.onClick.add(function(){updatePh();});
				t.onBeforeExecCommand.add(function(cmd){
					if(cmd == 'insertHtml'){
						updatePh();
					}
				});
				t.onKeyDown.addLast(function(){updatePh();});
				t.onInitComplete.add(function(obj){
					t.setContent({content:t.conf.placeholder, addHistory:false});
				});
			}
		},

		/**
		 * 全选
		 */
		selectAll: function(){
			var rng = this.getVERange();
			var isDiv = function(n){
				return n && n.nodeType == 1 && n.tagName == 'DIV' && !n.style.cssText;
			}

			var body = rng.doc.body;
			var fs = body.firstChild;
			if(body.childNodes.length == 1 && isDiv(fs)){
				rng.setStart(fs, 0);
				if(ve.dom.isBr(fs.lastChild) && !ve.ua.ie){
					rng.setEndBefore(fs.lastChild);
				} else {
					rng.setEnd(fs, fs.childNodes.length);
				}
			} else {
				rng.setStart(body, 0);
				rng.setEnd(body, body.childNodes.length);
			}
			rng.select(true);
		},

		/**
		 * 绑定快捷键触发事件
		 * @description 当前快捷键不支持多次绑定，且快捷键必须有ctrl,alt,shift,或者meta
		 **/
		bindShortCutEvent: function(){
			var t = this;
			var find = function(e) {
				var metaKey = false;
				if(e && (e.keyCode == 91 || e.metaKey)){	//fix win不能触发
					metaKey = true;
				}
				if (!e || (!e.altKey && !e.ctrlKey && !metaKey && !e.shiftKey)){
					return;
				}

				var v = null;
				var ps = function(o){
					if(v){
						console.log('快捷键冲突：', o, ' 当前存在：', v);
					} else {
						v = o;
					}
				};

				ve.lang.each(t._shortcuts, function(o) {
					if (o.alt != e.altKey || o.shift != e.shiftKey || o.ctrl != e.ctrlKey || o.meta != metaKey){			//功能键检测
						return;
					}
					if(!o.keyCode && !o.charCode && (e.keyCode == 16 || e.keyCode == 17 || e.keyCode == 18 || metaKey)){	//单绑功能键的情况
						ps(o);
					}
					if(e.keyCode == o.keyCode || (e.charCode && e.charCode == o.charCode)){									//功能键+普通key
						ps(o);
					}
				});
				return v;
			};

			t.onKeyUp.add(function(e) {
				var o = find(e);
				if (o){
					ve.dom.event.preventDefault(e);
				}
			});

			t.onKeyPress.add(function(e) {
				var o = find(e);
				if (o){
					ve.dom.event.preventDefault(e);
				}
			});

			t.onKeyDown.add(function(e) {
				var o = find(e);
				if (o) {
					o.fn.call(t, e);
					ve.dom.event.preventDefault(e);
				}
			});
		}
	});

	/**
	 * 判断选区是否在父级元素的开始或选区开始本身为LI的开始（ie下startContainer会为li），包括以下几种情况
	 * 1,前面没有兄弟元素
	 * 2,前面的兄弟元素为不显示元素或空文本
	 * @param {Range} range
	 * @return {Boolean}
	 */
	var isStartInParent = function(range){
		var start = range.startContainer,
			tmp;
		if(range.startOffset == 0){
			if(!range.startContainer.previousSibling ||range.startContainer.tagName == "LI"){
				return true;
			}else{
				tmp = range.startContainer.previousSibling;
				while(tmp){
					if(!tmp.firstChild || ve.dom.getChildCount(tmp) == 0){
						tmp = tmp.previousSibling;
					}else{
						return false;
					}
				}
				return true;
			}
		}else{
			return false;
		}
	};
})(window, document, VEditor);
/**
 * 编辑器核心命令集合
 * 这里包含了各种例如加粗、字体排版等基本命令
 * @deprecate 这个方法应该在后面逐步放出，采用实际的各个插件来实现对应的功能
 **/
(function(ve){
	var IS_BROWSER_COMMANDS = /^(Bold|Italic|Underline|Justifycenter|Justifyleft|Justifyright|Justifyfull|FontSize|removeformat|FontName|InsertOrderedList|InsertUnorderedList|indent|outdent)$/i;

	ve.lang.Class('VEditor.EditorCommands', {
		EditorCommands: function (editor) {
			var _this = this;
			this.editor = editor;
			this.commands = {};

			//扩展editorcommands方法到editor
			ve.lang.each(['addCommand'], function(method){
				editor[method] = function(){
					return _this[method].apply(_this, ve.lang.arg2Arr(arguments));
				};
			});

			//insertHtml命令
			this.addCommand('insertHtml', function(html){
				var rng = editor.getVERange();
				rng.insertHtml(html);
				rng.collapse();
			});
		},

		/**
		 * 执行命令
		 * @param {Mix} cmd
		 * @param {...}
		 * @deprecate 此方法执行过程会将原型链置回this.editor， 原有的方法还提供了 editor,btn两个默认参数，
		 * 现在不干这档子事，因为一些command根本没有btn
		 * 如果调用browserCommand的话，参数2、参数3将为ui和value
		 **/
		execCommand: function(cmd, arg1, arg2){
			var _this = this,
				doc = this.editor.getDoc(),
				args = ve.lang.arg2Arr(arguments, 1),
				fireParams = [this.editor, cmd].concat(args);

			//fire before execute
			this.editor.onBeforeExecCommand.fire.apply(this.editor.onBeforeExecCommand, fireParams);

			//直接执行函数
			if(typeof(cmd) == 'function'){
				cmd.apply(this.editor, args);
			}

			//用户添加命令
			else if(this.commands[cmd]){
				this.commands[cmd].apply(this.editor, args);
			}

			//浏览器原生方法
			else if(typeof(cmd) == 'string' && IS_BROWSER_COMMANDS.test(cmd)){
				doc.execCommand(cmd, arg1 || false, arg2);
			}

			//没有找到方法
			else {
				throw('NO COMMAND FOUND');
			}

			//额外使用.fire.apply来触发事件
			this.editor.onAfterExecCommand.fire.apply(this.editor.onAfterExecCommand, fireParams);
		},

		/**
		 * 添加一个命令
		 * @param {String} name 命令名称
		 * @param {Function} fn 处理函数（如果是浏览器命令，此处可以为空）
		 **/
		addCommand: function(name, fn){
			if(this.commands[name] || !fn){
				throw('ADD COMMAND PARAM ERROR');
			}
			this.commands[name] = fn;
		},

		/**
		 * 移除一个命令
		 * 这里只能移除用户添加的command，移除不了浏览器原生的command
		 * @param {String} name
		 **/
		removeCommand: function(name){
			if(this.commands[name]){
				this.commands[name] = null;
			}
		},

		/**
		 * 判定是否拥有一个命令
		 * @param {String} name
		 * @return {Boolean}
		 **/
		hasCommand: function(name){
			return !!this.commands[name] || IS_BROWSER_COMMANDS.test(name);;
		}
	});
})(VEditor);
(function(ve){
	var EXTRACT = 0,
		CLONE = 1,
		DELETE = 2;

	var FILL_TMP_NODE;

	//bookmark常量
	var BOOKMARK_START_ID = 'veditor_bookmark_start',
		BOOKMARK_END_ID = 'veditor_bookmark_end',
		BOOKMARK_TAG = 'span',
		BOOKMARK_GUID = 0;

	/**
	 * Range对象
	 * 这里抽象w3c range模型和ie range模型，集中采用dom对象进行统一操作，提供统一方法
	 * 其中涉及到浏览器差异主要集中在“获取选区”和“设置选区”上
	 * 其他的方法比较少涉及到浏览器差异
	 **/
	ve.lang.Class('VEditor.Range', {
		win: null,
		doc: null,
		startContainer : null,
		startOffset : 0,
		endContainer : null,
		endOffset : 0,
		collapsed : true,

		/**
		 * 初始化
		 * @param {BOM} win
		 * @param {DOM} doc
		 **/
		Range: function(win, doc){
			this.win = win;
			this.doc = doc;

			this.startContainer = null;
			this.endContainer = null;
			this.startOffset = null;
			this.endOffset = null;
		},

		/**
		 * 转换浏览器range到当前Range对象
		 * @param {Range} nativeRange 浏览器range
		 */
		convertBrowserRange: function(nativeRange){
			var rng = nativeRange || (ve.ua.ie && ve.ua.ie<9 ? _getIERange(this.win, this.doc) : _getW3CRange(this.win, this.doc));
			this._convertBrowserRange(rng);
			//console.log('更新Range:', this.startContainer.nodeType, this.startContainer.tagName, '||', this.startOffset, '||', this.endOffset);
			this._adjustNeighborNode();
			//console.log('更新Range:', this.startContainer.nodeType, this.startContainer.tagName, '||', this.startOffset, '||', this.endOffset);
		},

		/**
		 * 转换浏览器range对象到当前range对象
		 * 此函数主要针对ie选区做转换
		 * @param {Range} browserRange 浏览器原生range对象
		 */
		_convertBrowserRange: function(browserRange){
			if(ve.ua.ie && ve.ua.ie<9){
				if(browserRange.item){
					this.selectNode(browserRange.item(0));
				} else {
					var bi = this._convertIERange(browserRange, true);
					this.setStart(bi.container, bi.offset);
					if(browserRange.compareEndPoints('StartToEnd',browserRange)!= 0){
						bi = this._convertIERange(browserRange, false);
						this.setEnd(bi.container, bi.offset);
					}
				}
			} else {
				var sel = _getW3CSelection(this.win, this.doc);
				if(sel && sel.rangeCount){
					var firstRange = sel.getRangeAt(0);
					var lastRange = sel.getRangeAt(sel.rangeCount - 1);

					this.setStart(firstRange.startContainer, firstRange.startOffset);
					this.setEnd(lastRange.endContainer, lastRange.endOffset);
					this.collapsed = this._isCollapsed();
				} else {
					this.setStart(this.doc.body.firstChild || this.doc.body, 0);
					this.collapse(true);
				}
			}
		},

		/**
		 * 获取ie浏览器range边界信息
		 * @param {Range} range 浏览器range对象
		 * @param {Boolean} isStart 是否为开始节点
		 * @return {Object}
		 **/
		_convertIERange: function(range, isStart){
			range = range.duplicate();
			range.collapse(isStart);

			//这里如果发现parentElement不在doc里面的话，
			//就表明当前编辑器失焦了。一般出现在ie
			var parent = range.parentElement();

			//这里对失焦进行一个“容错”
			if(!parent || parent.document != this.doc){
				console.log('[失焦!]:_convertIERange');
				return {container:this.doc.body, offset:0};
			}

			//如果节点里没有子节点，直接退出
			if(!parent.hasChildNodes()){
				return  {container:parent,offset:0};
			}

			//这里不能使用parent.childNodes，因为里面的textnode不能在moveToElementText使用
			var siblings = parent.children,
				child,
				testRange = range.duplicate(),
				startIndex = 0,endIndex = siblings.length - 1,index = -1,
				distance;

			while(startIndex <= endIndex){
				index = Math.floor((startIndex + endIndex) / 2);
				child = siblings[index];

				//fix ie comment take event
				if(child.nodeType == 8){
					child = child.nextSibling || child.previousSibling;
				}
				testRange.moveToElementText(child);
				var position = testRange.compareEndPoints('StartToStart', range);

				//[fix] ie 8,9 <block>text|<block>....
				//return {block, 1}
				var ps = child.previousSibling;
				var ns = child.nextSibling;
				if(position > 0 && ps && ps.nodeType == 3 && !ns){
					var tmpRange = testRange.duplicate();
					tmpRange.moveStart('character', -1);
					if(tmpRange.compareEndPoints('StartToStart', range) == 0){
						return {container:ps, offset:ps.nodeValue.length};
					}
				}

				if(position > 0){
					endIndex = index - 1;
				} else if(position < 0){
					startIndex = index + 1;
				} else {
					return  {container:parent,offset:ve.dom.nodeIndex(child)};
				}
			}

			if(index == -1){
				testRange.moveToElementText(parent);
				testRange.setEndPoint('StartToStart', range);
				distance = testRange.text.replace(/(\r\n|\r)/g, '\n').length;
				siblings = parent.childNodes;
				if(!distance){
					child = siblings[siblings.length - 1];
					return  {container:child,offset:child.nodeValue.length};
				}

				var i = siblings.length;
				while(distance > 0)
				distance -= siblings[ --i ].nodeValue.length;

				return {container:siblings[i],offset:-distance}
			}

			testRange.collapse(position > 0);
			testRange.setEndPoint(position > 0 ? 'StartToStart' : 'EndToStart', range);
			distance = testRange.text.replace(/(\r\n|\r)/g, (ve.ua.ie == 9 ? '' : '\n')).length;	//ie9 文本长度计算bug
			if(!distance){
				return  (ve.dtd.$empty[child.tagName] || ve.dtd.$nonChild[child.tagName])?
					{container: parent, offset:ve.dom.nodeIndex(child)+ (position > 0 ? 0 : 1)} :
					{container: child, offset:position > 0 ? 0 : child.childNodes.length}
			}

			while(distance > 0){
				try{
					var pre = child;
					child = child[position > 0 ? 'previousSibling' : 'nextSibling'];
					distance -= child.nodeValue.length;
				}catch(e){
					return {container:parent,offset:ve.dom.nodeIndex(pre)};
				}

			}
			return  {container:child, offset: (position>0 ? -distance : child.nodeValue.length + distance)}
		},

		/**
		 * 移动文本节点里面的光标到附近的内联标签中
		 * 不fix: abc|<inline>123</inline> => abc<inline>|123</inline>
		 * fix: abc|<inline></inline> => abc<inline>|</inline>
		 * fix: <inline>123</inline>|abc => <inline>123|</inline>abc
		 * fix: <inline>123</inline>|<tag>abc</tag> => <inline>123|</inline><tag>abc</tag>
		 * @return {Object}
		**/
		_moveTextToSiblingInline: function(){
			if(!this.collapsed){
				return;
			}

			var sc = this.startContainer, so = this.startOffset;
			var _isInlineNode = function(n){
				return n && n.nodeType == 1 && ve.dtd.$inline[n.tagName] && !ve.dtd.$empty[n.tagName] && !ve.dtd.$displayBlock[n.style.display]
			};

			var pre, ps = sc.previousSibling, ns = sc.nextSibling;
			if(sc.nodeType == 3 && so == sc.nodeValue && _isInlineNode(ns) && !ve.string.trim(ns.innerHTML)){
				this.startContainer = ns;
				this.startOffset = 0;
			}
			else if(sc.nodeType == 3 && !so && ps && ps.nodeType == 1 && _isInlineNode(ps)){
				this.startContainer = ps;
				this.startOffset = ps.childNodes.length;
			}
			else if(sc.nodeType == 1 && so && (so < sc.childNodes.length)){
				var p = sc.childNodes[so-1];
				if(_isInlineNode(p)){
					this.startContainer = p;
					this.startOffset = p.childNodes.length;
				}
			}
		},

		/**
		 * 移动光标到标签内部
		 * fix: <tag1>|<tag2> => <tag1><tag2>|
		 * fix: </tag1>|</tag2> => |<tag1></tag2>
		 * @return {Object}
		**/
		_moveCaretToMid: function(){
			if(!this.collapsed){
				return;
			}
			var sc = this.startContainer,
				so = this.startOffset;

			//[fix] ie6 <a><a>text</a></a> 作为startContainer的话,startContainer.childNodes[so-1].tagName 变成 /A
			var fixType = function(n){
				if(n && n.nodeType == 1){
					return n.tagName.indexOf('/') !== 0;
				}
				return true;
			};

			if(sc.nodeType == 1){
				if(!so && sc.childNodes.length && sc.childNodes[0].nodeType == 1 && !ve.dtd.$empty[sc.childNodes[0].tagName]){
					this.startContainer = sc.childNodes[0];
					this.startOffset = 0;
					this._moveCaretToMid();
				} else if(so && so == sc.childNodes.length && sc.childNodes[so-1].nodeType == 1 && !ve.dtd.$empty[sc.childNodes[so-1].tagName] && sc.childNodes[so-1]){
					if(fixType(sc.childNodes[so-1].lastChild)){
						if(sc.childNodes[so-1].childNodes.length == 1 && sc.childNodes[so-1].firstChild != sc.childNodes[so-1].lastChild){
							//[fix] <a mailto>asdfasdf<a>text</a> 这个bug
						} else {
							this.startContainer = sc.childNodes[so-1];
							this.startOffset = sc.childNodes[so-1].childNodes.length;
							this._moveCaretToMid();
						}
					}
				}
			}
		},

		/**
		 * 修正光标点击漂移
		 **/
		_adjustNeighborNode: function(){
			var sc = this.startContainer;
			var so = this.startOffset;
			var ec = this.endContainer;
			var eo = this.endOffset;

			if(this.collapsed){

				//fix ie9 没有办法定位在行尾<br/>之前
				//问题描述：文本使用br换将，光标点击在行尾，其实聚焦的地方是br之后，因此需要识别调整，
				//后尾为BR情况
				//fix: [!]</br>\r\n<inline> => |</br>\r\n|<inline>
				/**
				if(ve.ua.ie == 9 && so > 0){
					var start = sc.nodeType == 1 ? sc.childNodes[so-1] : null;
					if(ve.dom.isBr(start)){
						var evt = this.win.event;
						if(evt){
							var mouseX = evt.pageX || (evt.clientX + (this.doc.documentElement.scrollLeft || this.doc.body.scrollLeft));
							startRegion = ve.dom.gestRegion(start, this.doc);
							if(mouseX > startRegion.left){
								this.setStartAfter(start);
								this.collapse(true);
								this.select(true);
								return;
							}
						}
					}
				}
				**/

				//[fix] <block><img><block>&nbsp;</block>[!]</block>test => <block><img><block>&nbsp;</block>[!]</block>|test
				//[fix] <block><img><block>&nbsp;</block>[!]</block><span>test</span> => <block><img><block>&nbsp;</block>[!]</block><span>|test</span>
				if(ve.ua.ie == 8 && so == sc.childNodes.length){
					var ns = sc.nextSibling;
					if(ve.dom.isDisplayBlock(sc[so-1]) && ns){
						var evt = this.win.event;
						if(evt){
							var mouseY = evt.pageY || (evt.clientY + (this.doc.documentElement.scrollTop || this.doc.body.scrollTop));
							var startRegion = ve.dom.getRegion(sc, this.doc);
							if(mouseY > startRegion.top){
								if(ns.nodeType == 1 && !ve.dtd.$empty[ns.tagName]){
									this.setStart(ns, 0);
								} else {
									this.setStartBefore(ns);
								}
								this.collapse(true);
								this.select(true);
								return;
							}
						}
					}
				}

				this._moveCaretToMid();
				this._moveTextToSiblingInline();
				this.collapse(true);

				if(sc !== this.startContainer || so != this.startOffset){
					this.select();
				}
			} else {
				//[fix] <a>[text]</a> 情况 到 [<a></a>]
				//[fix] <a>[text</a>tet] 情况 到 [<a>text</a>tet]
				var chk = false;
				if(!so){
					chk = adjustBoundaryLink(this, (sc.nodeType == 3 ? sc : sc.parentNode.firstChild), true) || chk;
				}
				if(eo && ((ec.nodeType == 3 && eo == ec.nodeValue.length) || (ec.nodeType == 1 && ec.childNodes.length == eo))){
					chk = adjustBoundaryLink(this, (ec.nodeType == 3 ? ec : ec.parentNode)) || chk;
				}

				//[fix] [text<span>text<br/>] => [text<span>text]<br/>
				if(ec.childNodes[eo] && ve.dom.isBr(ec.childNodes[eo].previousSibling)){
					this.setEndBefore(ec.childNodes[eo].previousSibling);
					chk = true;
				}
				if(chk){
					this.select();
				}
			}
		},

		/**
		 * 创建文档块
		 **/
		createDocumentFragment: function(){
			return this.doc.createDocumentFragment();
		},

		/**
		 * 设置开始节点
		 * @param {DOM} node
		 * @param {Number} offset
		 **/
		setStart: function(node, offset){
			this.setNodePoint(true, node, offset);
		},

		/**
		 * 设置结束节点
		 * @param {DOM} node
		 * @param {Number} offset
		 **/
		setEnd: function(node, offset){
			this.setNodePoint(false, node, offset);
		},

		/**
		 * 设置开始在···节点之前
		 * @param {DOM} node
		 **/
		setStartBefore: function(node){
			this.setStart(node.parentNode, ve.dom.nodeIndex(node));
		},

		/**
		 * 设置开始在···节点之后
		 * @param {DOM} node
		 **/
		setStartAfter: function(node){
			this.setStart(node.parentNode, ve.dom.nodeIndex(node) + 1);
		},

		/**
		 * 设置结束在···节点之前
		 * @param {DOM} node
		 **/
		setEndBefore: function(node){
			this.setEnd(node.parentNode, ve.dom.nodeIndex(node));
		},

		/**
		 * 设置结束在···节点之后
		 * @param {DOM} node
		 **/
		setEndAfter: function(node){
			this.setEnd(node.parentNode, ve.dom.nodeIndex(node) + 1);
		},

		/**
		 * 折叠为光标
		 * @param {Boolean} toStart 折叠到开始节点
		 **/
		collapse: function(toStart){
			if(toStart){
				this.endContainer = this.startContainer;
				this.endOffset = this.startOffset;
			} else {
				this.startContainer = this.endContainer;
				this.startOffset = this.endOffset;
			}
			this.collapsed = true;
		},

		/**
		 * 设置选区内容样式
		 * @param {string} tagName	  标签
		 * @param {[type]} attrs
		 * @param {[type]} list
		 */
		setInlineAttr: function(tagName, attrs, list){
			var _this = this;
			if(this.collapsed){
				return this;
			}

			this.adjustRange();
			this.maxiumRange(false, function(node){
				return ve.dom.isDisplayBlock(node);
			});
			this.adjustRangeBoundary();

			var bookmark = this.createBookmark();
			var end = bookmark.end;

			//如果tagName是block，需要移除两边多余的br
			if(ve.dtd.$block[tagName.toUpperCase()] || (attrs.style && ve.dtd.$displayBlock[attrs.style.display])){
				_clearBr(this, bookmark.start, 'previousSibling');
				_clearBr(this, end, 'nextSibling');
			}

			//DTD 调整
			/**
			var _getLastAdjustParent = function(rng, node, bStart){
				var p = node.parentNode;
				while(!ve.dtd[p.tagName.toLowerCase()][tagName.toUpperCase()] && p.parentNode && p.tagName != 'BODY'){
					p = p.parentNode;
				}

				if(p != node.parentNode){
					var _rng = rng.cloneRange();
					if(bStart){
						_rng.setStart(p, 0);
						_rng.setEndBefore(node);
					} else {
						_rng.setStartAfter(node);
						_rng.setEndBefore(p, p.childNodes.length);
					}
					var frag = _rng.extractContents();
					var _tmpNode = _rng.doc.createElement(tagName);
					_tmpNode.appendChild(frag);
					_rng.insertNode(_tmpNode);
					return true;
				}
			};
			if(_getLastAdjustParent(this, bookmark.start, true)){
				this.setStartBefore(bookmark.start);
			};
			if(_getLastAdjustParent(this, end)){
				this.setEndAfter(end);
			}
			 **/

			/**
			 * stop function
			 * @param  {DOM} node
			 * @return {Boolean}      true > stop
			 */
			var filterFn = function(node){
				return node.nodeType == 1 ? node.tagName.toLowerCase() != 'br' : !ve.isHelperNode(node);
			};
			var current = ve.dom.getNextDomNode(bookmark.start, false, filterFn);

			//这里需要对选中的range扩展，
			//如果ie下面选中的是 img control的话，cloneRange报错
			var node, pre, range = this.cloneRange();

			while (current && (ve.dom.getNodeRelexPosition(current, end) & 4)){
				if(current.nodeType == 3 || ve.dtd[tagName][current.tagName]){
					range.setStartBefore(current);
					node = current;
					while (node && (node.nodeType == 3 || ve.dtd[tagName][node.tagName]) && node !== end){
						pre = node;
						node = ve.dom.getNextDomNode(node, node.nodeType == 1, null, function(n){
							return n.nodeType == 1 ? ve.dtd[tagName][n.tagName] : true;
						})
					}

					//由于getNextDomNode非线性，这里fix最后一个匹配命中的情况
					if(node == end && !ve.dom.contains(pre, node)){
						range.setEndBefore(end);
					} else {
						//fix 跑进去bookmark里面了
						if(pre.nodeType == 3 && range.isBookmarkNode(pre.parentNode)){
							pre = pre.parentNode;
						}

						//[fix]选区就差那么一点
						if(pre.parentNode.lastChild == pre && pre.parentNode == current){
							pre = current;
						}
						range.setEndAfter(pre);
					}

					var frag = range.extractContents(),el;
					if(list && list.length > 0){
						var level,top;
						top = level = list[0].cloneNode(false);
						for(var i=1,ci;ci=list[i++];){
							level.appendChild(ci.cloneNode(false));
							level = level.firstChild;
						}
						el = level;
					} else {
						el = range.doc.createElement(tagName)
					}

					if(attrs){
						ve.dom.setAttrs(el, attrs)
					}

					el.appendChild(frag);
					range.insertNode(list ?  top : el);

					//处理下滑线在a上的情况
					var aNode;
					if(tagName == 'span' && attrs.style && attrs.style.textDecoration && (aNode = findParent(el, 'A'))){
						ve.dom.setAttrs(aNode,attrs);
						ve.dom.remove(el, true);
						el = aNode;
					}

					 //去除子节点相同的
					//this._mergChild(el, tagName,attrs);
					current = ve.dom.getNextDomNode(el, false, filterFn);
					if(el.childNodes.length == 1){
						ve.dom.mergerStyleToParent(el.firstChild);
					}
					ve.dom.mergerStyleToParent(el);
					//ve.dom.fixNodeDupParent(el);

					if(node === end){
						break;
					}
				} else {
					current = ve.dom.getNextDomNode(current, true, filterFn)
				}
			}
			return this.moveToBookmark(bookmark);
		},

		/**
		 * 检测元素是否为空白节点（包括bookmark节点）
		 * @param {DOM} node
		 * @return {Boolean}
		 **/
		_isEmptyNode: function(node){
			var _this = this;
			if(!node || !node.firstChild){
				return true;
			}

			var isEmpty = true;
			ve.lang.each(node.childNodes, function(node){
				if(node.tagName != 'BR' && !_this.isBookmarkNode(node) && !ve.isHelperNode(node)){
					isEmpty = false;
					return true;
				}
			});
			return isEmpty;
		},

		/**
		 * 插入html
		 * @param {String} html
		 **/
		insertHtml: function(html){
			var _this = this;
            var block = this.doc.createElement('div');
				block.style.display = 'inline';
				block.innerHTML = ve.string.trim(html);

            if(!this.collapsed) {
                this.deleteContents();
                if(this.startContainer.nodeType == 1){
                    var child = this.startContainer.childNodes[this.startOffset],pre;
                    if(child && ve.dom.isDisplayBlock(child) && (pre = child.previousSibling) && ve.dom.isDisplayBlock(pre)){
                        this.setEnd(pre,pre.childNodes.length);
						this.collapse();
                        while(child.firstChild){
                            pre.appendChild(child.firstChild);
                        }
                        ve.dom.remove(child);
                    }
                }

            }

            var child,parent,pre,tmp,hadBreak = 0;
            while(child = block.firstChild) {
                this.insertNode(child);
                if(!hadBreak && child.nodeType == 1 && ve.dom.isDisplayBlock(child)){
                    parent = ve.dom.getParent(child,function(node){
						return ve.dom.isDisplayBlock(node) && node != child;
					});
                    if(parent && parent.tagName != 'BODY' && !(ve.dtd[parent.tagName.toLowerCase()][child.nodeName] && child.parentNode === parent)){
                        if(!ve.dtd[parent.tagName.toLowerCase()][child.nodeName]){
                            pre = parent;
						}else{
                            tmp = child.parentNode;
                            while (tmp !== parent){
                                pre = tmp;
                                tmp = tmp.parentNode;
                            }
                        }
                        this.breakParent(child, pre || tmp);
                        var pre = child.previousSibling;
                        //domUtils.trimWhiteTextNode(pre);
                        if(pre && !pre.childNodes.length){
                            ve.dom.remove(pre);
                        }
                        hadBreak = 1;
                    }
                }
                var next = child.nextSibling;
                if(!block.firstChild && next && ve.dom.isDisplayBlock(next)){
                    this.setStart(next,0);
					this.collapse(true);
                    break;
                }
                this.setEndAfter(child);
				this.collapse();
            }

            child = this.startContainer;

            //用chrome可能有空白展位符
            if(ve.dom.isDisplayBlock(child) && this._isEmptyNode(child)){
                child.innerHTML = ve.ua.ie ? '' : '<br/>'
            }

            //加上true因为在删除表情等时会删两次，第一次是删的FILL_TMP_NODE
            this.select(true);
		},

		breakParent : function(node, parent) {
            var tmpNode, parentClone = node, clone = node, leftNodes, rightNodes;
            do {
				if(!parentClone.parentNode){
					break;
				}
				parentClone = parentClone.parentNode;
                if (leftNodes) {
                    tmpNode = parentClone.cloneNode(false);
					if(!tmpNode){
						break;
					}
                    tmpNode.appendChild(leftNodes);
                    leftNodes = tmpNode;

                    tmpNode = parentClone.cloneNode(false);
                    tmpNode.appendChild(rightNodes);
                    rightNodes = tmpNode;

                } else {
                    leftNodes = parentClone.cloneNode(false);
                    rightNodes = leftNodes.cloneNode(false);
                }

                while (tmpNode = clone.previousSibling) {
                    leftNodes.insertBefore(tmpNode, leftNodes.firstChild);
                }

                while (tmpNode = clone.nextSibling) {
                    rightNodes.appendChild(tmpNode);
                }

                clone = parentClone;
            } while (parent !== parentClone && (parentClone.parentNode && parentClone.parentNode.tagName != 'BODY'));

            tmpNode = parent.parentNode;
            tmpNode.insertBefore(leftNodes, parent);
            tmpNode.insertBefore(rightNodes, parent);
            tmpNode.insertBefore(node, rightNodes);
            ve.dom.remove(parent);
            return node;
        },

		/**
		 * 移除内联样式
		 * @param  {Array} tagList tag标签数组
		 */
		removeInlineStyle: function(tagList){
			if(this.collapsed){
				return this;
			}

			this.minifyRange();
			this.adjustRangeBoundary();

			var start = this.startContainer,
				end = this.endContainer;

			while(1){
				if(start.nodeType == 1){
					if(ve.lang.arrayIndex(tagList, start.tagName.toLowerCase())> -1){
						break;
					}
					if(start.tagName == 'BODY'){
						start = null;
						break;
					}
				}
				start = start.parentNode;
			}

			while(1){
				if(end.nodeType == 1){
					if(ve.lang.arrayIndex(tagList, end.tagName.toLowerCase())> -1){
						break;
					}
					if(end.tagName == 'BODY'){
						end = null;
						break;
					}
				}
				end = end.parentNode;
			}

			var bookmark = this.createBookmark(),
				frag,
				tmpRange;
			if(start){
				tmpRange = this.cloneRange();
				tmpRange.setEndBefore(bookmark.start);
				tmpRange.setStartBefore(start);
				frag = tmpRange.extractContents();
				tmpRange.insertNode(frag);
				this._clearEmptySibling(start, true);
				start.parentNode.insertBefore(bookmark.start, start);
			}

			if(end){
				tmpRange = this.cloneRange();
				tmpRange.setStartAfter(bookmark.end);
				tmpRange.setEndAfter(end);
				frag = tmpRange.extractContents();
				tmpRange.insertNode(frag);
				this._clearEmptySibling(end, false, true);
				end.parentNode.insertBefore(bookmark.end, end.nextSibling);
			}

			var current = ve.dom.getNextDomNode(bookmark.start, false, function(node){
				return node.nodeType == 1
			}),next;

			while(current && current !== bookmark.end){
				next = ve.dom.getNextDomNode(current, true, function(node){
					return node.nodeType == 1
				});
				if(ve.lang.arrayIndex(tagList, current.tagName.toLowerCase())> -1){
					ve.dom.remove(current, true);
				}
				current = next;
			}
			return this.moveToBookmark(bookmark);
		},

		/**
		 * 移除bookmark
		 **/
		removeBookmark: function(){
			var _this = this;
			var nodeList = this.doc.getElementsByTagName(BOOKMARK_TAG);
			ve.lang.each(nodeList, function(node){
				if(_this.isBookmarkNode(node)){
					ve.dom.remove(node);
				}
			});
		},

		/**
		 * 创建bookmark
		 * @param {Boolean} bSerialize 是否返回id，而非DOM
		 * @param {Boolean} useStaticBookmarkId 是否使用静态id
		 * @return {Object}
		 */
		createBookmark: function(bSerialize, useStaticBookmarkId){
			var endNode,
				startNode = this.doc.createElement(BOOKMARK_TAG);
				startNode.style.cssText = 'display:none';
				startNode.appendChild(this.doc.createTextNode(ve.blankChar));
				startNode.id = BOOKMARK_START_ID + (useStaticBookmarkId ? '' : ++BOOKMARK_GUID);
				collapsed = this.collapsed;

			if(!collapsed){
				endNode = startNode.cloneNode(true);
				endNode.id = BOOKMARK_END_ID + (useStaticBookmarkId ? '' : BOOKMARK_GUID);
			}
			this.insertNode(startNode);

			if(endNode){
				this.collapse(false);
				this.insertNode(endNode);
				this.setEndBefore(endNode)
			}
			this.setStartAfter(startNode);

			if(collapsed){
				this.collapse(true);
			}

			return {
				start : bSerialize ? startNode.id : startNode,
				end : endNode ? bSerialize ? endNode.id : endNode : null,
				id : bSerialize
			}
		},

		/**
		 * 移动到bookmark
		 * @param {Object} bookmark
		 */
		moveToBookmark: function(bookmark){
			if(!bookmark){
				bookmark = {
					id: true,
					start: BOOKMARK_START_ID,
					end: BOOKMARK_END_ID
				};
			}

			var start = bookmark.id ? this.doc.getElementById(bookmark.start) : bookmark.start,
				end = bookmark.end && bookmark.id ? this.doc.getElementById(bookmark.end) : bookmark.end;
			if(start){
				this.setStartBefore(start);
				ve.dom.remove(start);
			}
			if(end){
				this.setEndBefore(end);
				ve.dom.remove(end);
			} else {
				this.collapse(true);
			}
			return this;
		},

		/**
		 * 判断一个节点是否为bookmark对象
		 * @param {DOM} node
		 * @return {Boolean}
		 **/
		isBookmarkNode: function(node){
			return node && node.id && (node.id.indexOf(BOOKMARK_START_ID) === 0 || node.id.indexOf(BOOKMARK_END_ID) === 0);
		},

		/**
		 * 调整选区边界到合理范围区域
		 */
		adjustRange: function(ignoreEnd){
			this.adjustTextRange();
			var start = this.startContainer,
				offset = this.startOffset,
				collapsed = this.collapsed,
				end = this.endContainer;
			if(start.nodeType == 3){
				if(offset == 0){
					this.setStartBefore(start);
				} else {
					if(offset >= start.nodeValue.length){
						this.setStartAfter(start);
					} else {
						var textNode = _splitTextNode(start, offset);
						if(start === end){
							this.setEnd(textNode, this.endOffset - offset);
						} else if(start.parentNode === end){
							this.endOffset += 1;
						}
						this.setStartBefore(textNode);
					}
				}
				if(collapsed){
					return this.collapse(true);
				}
			}
			if(!ignoreEnd){
				offset = this.endOffset;
				end = this.endContainer;
				if(end.nodeType == 3){
					if(offset == 0){
						this.setEndBefore(end);
					} else {
						if(offset >= end.nodeValue.length){
							this.setEndAfter(end);
						} else {
							_splitTextNode(end, offset);
							this.setEndAfter(end);
						}
					}

				}
			}
			return this;
		},

		/**
		 * 调整range边界container
		 * @example
		 * <b>xx[</b>xxxxx] ==> <b>xx</b>[xxxxx]
		 * <b>[xx</b><i>]xxx</i> ==> <b>[xx]</b><i>xxx</i>
		 */
		adjustRangeBoundary: function(){
			if(!this.collapsed){
				if(!this.startContainer.nodeType != 1){
					return this;
				}
				while(this.startContainer.tagName.toLowerCase() != 'body' && this.startOffset == this.startContainer[this.startContainer.nodeType == 3 ? 'nodeValue' : 'childNodes'].length){
					this.setStartAfter(this.startContainer);
				}
				while(this.endContainer.tagName.toLowerCase() != 'body' && !this.endOffset){
					this.setEndBefore(this.endContainer);
				}
			}
			return this;
		},

		/**
		 * 调整文本边界，避免空置offset，
		 * 或者container没有包含情况
		 **/
		adjustTextRange: function(){
			if(this.collapsed){
				return;
			}
			if(this.startContainer.nodeType == 3){
				if(!this.startOffset){
					this.setStartBefore(this.startContainer);
				} else if(this.startOffset >= this.startContainer.nodeValue.length){
					this.setStartAfter(this.startContainer);
				}
			}
			if(this.endContainer.nodeType == 3){
				if(!this.endOffset){
					this.setEndBefore(this.endContainer);
				} else if(this.endOffset >= this.endContainer.nodeValue.length){
					this.setEndAfter(this.endContainer);
				}
			}
		},

		/**
		 * 缩小边界
		 * @param {Boolean} ignoreEnd
		 */
		minifyRange: function(ignoreEnd){
			var child;
			while(this.startContainer.nodeType == 1
				&& (child = this.startContainer.childNodes[this.startOffset])
				&& child.nodeType == 1 && child.tagName != 'A'  && !this.isBookmarkNode(child)	//去除A的minifiy，A需要外围操作
				&& !ve.dtd.$empty[child.tagName] && !ve.dtd.$nonChild[child.tagName]){
				this.setStart(child, 0);
			}
			if(this.collapsed){
				return this.collapse(true);
			}
			if(!ignoreEnd){
				while(this.endContainer.nodeType == 1
					&& this.endOffset > 0
					&& (child = this.endContainer.childNodes[this.endOffset - 1])
					&& child.nodeType == 1 && child.tagName != 'A' && !this.isBookmarkNode(child)
					&& !ve.dtd.$empty[child.tagName] && !ve.dtd.$nonChild[child.tagName]){
					this.setEnd(child, child.childNodes.length);
				}
			}
		},

		/**
		 * 放大边界
		 * @param {Boolean} toBlock
		 * @param {Function} stopFn
		 */
		maxiumRange: function(toBlock, stopFn){
			var pre,node,
				tmp = this.doc.createTextNode('');
			if(toBlock){
				node = this.startContainer;
				if(node.nodeType == 1){
					if(node.childNodes[this.startOffset]){
						pre = node = node.childNodes[this.startOffset]
					} else {
						node.appendChild(tmp);
						pre = node = tmp;
					}
				} else {
					pre = node;
				}

				while(1){
					if(ve.dom.isDisplayBlock(node)){
						node = pre;
						while((pre = node.previousSibling) && !ve.dom.isDisplayBlock(pre)){
							node = pre;
						}
						this.setStartBefore(node);

						break;
					}
					pre = node;
					node = node.parentNode;
				}
				node = this.endContainer;
				if(node.nodeType == 1){
					if(pre = node.childNodes[this.endOffset]){
						node.insertBefore(tmp, pre);
						}else{
						node.appendChild(tmp)
					}
					pre = node = tmp;
				} else {
					pre = node;
				}

				while(1){
					if(ve.dom.isDisplayBlock(node)){
						node = pre;
						while((pre = node.nextSibling) && !ve.dom.isDisplayBlock(pre)){
							node = pre;
						}
						this.setEndAfter(node);
						break;
					}
					pre = node;
					node = node.parentNode;
				}
				if(tmp.parentNode === this.endContainer){
					this.endOffset--;
				}
				ve.dom.remove(tmp);
			}

			// 扩展边界到最大
			if(!this.collapsed){
				while(this.startOffset == 0){
					if(stopFn && stopFn(this.startContainer)){
						break;
					}
					if(this.startContainer.tagName == 'BODY'){
						break;
					}
					this.setStartBefore(this.startContainer);
				}
				while(this.endOffset == (this.endContainer.nodeType == 1 ? this.endContainer.childNodes.length : this.endContainer.nodeValue.length)){
					if(stopFn && stopFn(this.endContainer)){
						break;
					}
					if(this.endContainer.tagName == 'BODY'){
						break;
					}
					this.setEndAfter(this.endContainer)
				}
			}
			return this;
		},

		/**
		 * 判断节点是否为空的内联元素节点
		 * @param   {DOM}  node
		 * @return  {Boolean}
		 * @private
		 */
		_isEmptyInlineElement: function(node){
			if(node.nodeType != 1 || !ve.dtd.$removeEmpty[ node.tagName ])
				return 0;

			node = node.firstChild;
			while (node){
				if(this.isBookmarkNode(node)){
					return 0;
				}
				if(node.nodeType == 1 && !_isEmptyInlineElement(node) ||
					node.nodeType == 3 && !_isWhitespace(node)){
					return 0;
				}
				node = node.nextSibling;
			}
			return 1;
		},

		_clearEmptySibling: function(node, ingoreNext, ingorePre){
			var _this = this;
			function clear(next, dir){
				var tmpNode;
				while(next && !_this.isBookmarkNode(next) && (_isEmptyInlineElement(next) || _isWhitespace(next))){
					tmpNode = next[dir];
					ve.dom.remove(next);
					next = tmpNode;
				}
			}
			!ingoreNext && clear(node.nextSibling, 'nextSibling');
			!ingorePre && clear(node.previousSibling, 'previousSibling');
		},

		/**
		 * 选中range操作结果
		 * @param {Boolean} notInsertFillData 不插入占位符
		 **/
		select: function(notInsertFillData){
			if(ve.ua.ie && ve.ua.ie < 10){
				var ieRng;
				if (!this.collapsed){
					this.minifyRange();
				}

				//选中control情况
				var node = this.getClosedNode();
				if (node) {
					try {
						ieRng = this.doc.body.createControlRange();
						ieRng.addElement(node);
						ieRng.select();
					} catch(e) {}
					return;
				}

				var bookmark = this.createBookmark(), start = bookmark.start, end;

				ieRng = this.doc.body.createTextRange();
				try {ieRng.moveToElementText(start);} catch(ex){};
				ieRng.moveStart('character', 1);

				if(!this.collapsed){
					var ieRngEnd = this.doc.body.createTextRange();
					end = bookmark.end;
					ieRngEnd.moveToElementText(end);
					ieRng.setEndPoint('EndToEnd', ieRngEnd);
				}

				else if(!notInsertFillData && this.startContainer.nodeType != 3){
					//使用<span>|x<span>固定住光标
					var tmpText = this.doc.createTextNode(ve.blankChar),
                    tmp = this.doc.createElement('span');

					tmp.appendChild(this.doc.createTextNode(ve.blankChar));
					start.parentNode.insertBefore(tmp, start);
					start.parentNode.insertBefore(tmpText, start);

					//当点b,i,u时，不能清除i上边的b
					_removeFillData(tmpText);
					FILL_TMP_NODE = tmpText;

					_mergSibling(tmp,'previousSibling');
					_mergSibling(start,'nextSibling');
					ieRng.moveStart('character', -1);
					ieRng.collapse(true);
				}

				this.moveToBookmark(bookmark);
				tmp && ve.dom.remove(tmp);
				ieRng.select();
			}

			//W3C select方法
			else {
                var sel = _getW3CSelection(this.win, this.doc);
				ve.ua.firefox ? this.doc.body.focus() : this.win.focus();
				if (sel) {
					sel.removeAllRanges();
					var w3cRng = this.doc.createRange();
					w3cRng.setStart(this.startContainer, this.startOffset);
					w3cRng.collapse(this.collapsed);
					w3cRng.setEnd(this.endContainer, this.endOffset);
					sel.addRange(w3cRng);
				}
			}
		},

		/**
         * 得到一个自闭合的节点
		 * @deprecate 这个方法会干扰现有的startContainer的引用，慎用
		 * @return {DOM}
         */
        getClosedNode: function() {
            var node;
            if(!this.collapsed) {
                var range = this.cloneRange();
				range.adjustRange();
				range.minifyRange();
                if(range.startContainer.nodeType == 1 && range.startContainer === range.endContainer && range.endOffset - range.startOffset == 1) {
                    var child = range.startContainer.childNodes[range.startOffset];
                    if(child && child.nodeType == 1 && (ve.dtd.$empty[child.tagName] || ve.dtd.$nonChild[child.tagName])) {
                        node = child;
                    }
                }
            }
            return node;
        },

        /**
         * 选择节点
         * @param  {DOM} node
         */
		selectNode: function(node){
			this.setStartBefore(node);
			this.setEndAfter(node);
		},

		/**
		 * 选择节点内容
		 * @param  {DOM} node
		 */
		selectNodeContents: function(node){
			this.setStart(node, 0);
			this.setEnd(node, node.nodeType === 1 ? node.childNodes.length : node.nodeValue.length);
		},

		compareBoundaryPoints: function(h, r){
			var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset,
			rsc = r.startContainer, rso = r.startOffset, rec = r.endContainer, reo = r.endOffset;

			// Check START_TO_START
			if(h === 0)
				return this._compareBoundaryPoints(sc, so, rsc, rso);

			// Check START_TO_END
			if(h === 1)
				return this._compareBoundaryPoints(ec, eo, rsc, rso);

			// Check END_TO_END
			if(h === 2)
				return this._compareBoundaryPoints(ec, eo, rec, reo);

			// Check END_TO_START
			if(h === 3)
				return this._compareBoundaryPoints(sc, so, rec, reo);
		},

		/**
		 * 删除内容
		 */
		deleteContents: function(){
			this._traverse(DELETE);
		},

		/**
		 * 截取内容
		 * @deprecated 原内容结构将被破坏
		 */
		extractContents: function(){
			return this._traverse(EXTRACT);
		},

		/**
		 * 克隆内容
		 */
		cloneContents: function(){
			return this._traverse(CLONE);
		},

		/**
		 * 插入节点到当前焦点
		 * 同时更新当前offset
		 * @param {DOM} node
		 **/
		insertNode: function(node){
			var first = node,
				length = 1;

			//对documentFragment兼容
            if(node.nodeType == 11) {
                first = node.firstChild;
                length = node.childNodes.length;
            }

            this.adjustRange(true);

            var nextNode = this.startContainer.childNodes[this.startOffset];
			try {
				if(nextNode) {
					//TODO 这里没有进行DTD校验，在ie下面会报错
					this.startContainer.insertBefore(node, nextNode);
				} else {
					this.startContainer.appendChild(node);
				}
			} catch(ex){};
            if(first.parentNode === this.endContainer) {
                this.endOffset = this.endOffset + length;
            }
            this.setStartBefore(first);
		},

		surroundContents: function(n){
			var f = this.extractContents();
			this.insertNode(n);
			n.appendChild(f);
			this.selectNode(n);
		},

		/**
		 * 克隆当前range对象
		 * @deprecate 注意：此方法可能修改startContainer、endContainer等相关引用变量
		 * @return {Range}
		 */
		cloneRange: function(){
			var newRange = new ve.Range(this.win, this.doc);
				newRange.setStart(this.startContainer, this.startOffset);
				newRange.setEnd(this.endContainer, this.endOffset);
			return newRange;
		},

		/**
		 * 获取光标所在位置后面的节点，如果后面没有节点，则返回容器
		 * @param {DOM} container
		 * @param {Number} offset
		 * @return {DOM}
		 **/
		_getSelectedNode: function(container, offset){
			var child;

			if(container.nodeType == 3 /* TEXT_NODE */){
				return container;
			}
			if(offset < 0){
				return container;
			}

			child = container.firstChild;
			while (child && offset > 0){
				--offset;
				child = child.nextSibling;
			}

			if(child){
				return child;
			}
			return container;
		},

		/**
		 * 检测当前Range对象是否为折叠状态
		 * @return  {Boolean}
		 * @private
		 */
		_isCollapsed: function(){
			return this.startContainer && this.endContainer &&
				this.startContainer == this.endContainer &&
				this.startOffset == this.endOffset;
		},

		/**
		 * 比对边界节点位置
		 * @param   {DOM} containerA 容器1
		 * @param   {Number} offsetA 容器1偏离量
		 * @param   {DOM} containerB 容器2
		 * @param   {Number} offsetB 容器2偏离量
		 * @return  {Number}
		 * @private
		 */
		_compareBoundaryPoints: function(containerA, offsetA, containerB, offsetB){
			var c, offsetC, n, cmnRoot, childA, childB;

			if(containerA == containerB){
				if(offsetA == offsetB){
					return 0;
				}
				if(offsetA < offsetB){
					return -1;
				}
				return 1;
			}

			c = containerB;
			while (c && c.parentNode != containerA)
				c = c.parentNode;

			if(c){
				offsetC = 0;
				n = containerA.firstChild;

				while (n != c && offsetC < offsetA && n.nextSibling){
					offsetC++;
					n = n.nextSibling;
				}
				if(offsetA <= offsetC){
					return -1;
				}
				return 1;
			}

			c = containerA;
			while (c && c.parentNode != containerB){
				c = c.parentNode;
			}

			if(c){
				offsetC = 0;
				n = containerB.firstChild;

				while (n != c && offsetC < offsetB && n.nextSibling){
					offsetC++;
					n = n.nextSibling;
				}

				if(offsetC < offsetB){
					return -1; // before
				}
				return 1; // after
			}

			childA = containerA;
			while (childA && childA.parentNode != cmnRoot){
				childA = childA.parentNode;
			}
			if(!childA){
				childA = cmnRoot;
			}
			childB = containerB;
			while (childB && childB.parentNode != cmnRoot)
				childB = childB.parentNode;

			if(!childB){
				childB = cmnRoot;
			}
			if(childA == childB){
				return 0; // equal
			}
			n = cmnRoot.firstChild;
			while (n){
				if(n == childA){
					return -1;
				}
				if(n == childB){
					return 1;
				}
				n = n.nextSibling;
			}
		},

		/**
		 * 设置节点边界信息
		 * @param {Boolean} bStart
		 * @param {DOM} node
		 * @param {Number} offset
		 */
		setNodePoint: function(bStart, node, offset){
			if (node.nodeType == 1 && (ve.dtd.$empty[node.tagName] || ve.dtd.$nonChild[node.tagName])) {
				offset = ve.dom.nodeIndex(node) + (bStart ? 0 : 1);
				node = node.parentNode;
			}
			if (bStart) {
				this.startContainer = node;
				this.startOffset = offset;
				if (!this.endContainer) {
					this.collapse(true);
				}
			} else {
				this.endContainer = node;
				this.endOffset = offset;
				if (!this.startContainer) {
					this.collapse(false);
				}
			}
			this.collapsed = this._isCollapsed();
		},

		/**
		 * 当前Range遍历
		 * @param   {Number} how 遍历方式
		 * @return  {Mix}
		 * @private
		 */
		_traverse: function(how){
			var c, endContainerDepth = 0, startContainerDepth = 0, p, depthDiff, startNode, endNode, sp, ep;

			if(this.startContainer == this.endContainer){
				return this._traverseSameContainer(how);
			}

			for (c = this.endContainer, p = c.parentNode; p; c = p, p = p.parentNode){
				if(p == this.startContainer){
					return this._traverseCommonStartContainer(c, how);
				}
				++endContainerDepth;
			}

			for(c = this.startContainer, p = c.parentNode; p; c = p, p = p.parentNode){
				if(p == this.endContainer){
					return this._traverseCommonEndContainer(c, how);
				}
				++startContainerDepth;
			}

			depthDiff = startContainerDepth - endContainerDepth;

			startNode = this.startContainer;
			while (depthDiff > 0){
				startNode = startNode.parentNode;
				depthDiff--;
			}

			endNode = this.endContainer;
			while (depthDiff < 0){
				endNode = endNode.parentNode;
				depthDiff++;
			}

			// ascend the ancestor hierarchy until we have a common parent.
			for (sp = startNode.parentNode, ep = endNode.parentNode; sp != ep; sp = sp.parentNode, ep = ep.parentNode){
				startNode = sp;
				endNode = ep;
			}

			return this._traverseCommonAncestors(startNode, endNode, how);
		},

		 _traverseSameContainer: function(how){
			var frag, s, sub, n, cnt, sibling, xferNode, start, len;

			if(how != DELETE)
				frag = this.createDocumentFragment();

			// If selection is empty, just return the fragment
			if(this.startOffset == this.endOffset)
				return frag;

			// Text node needs special case handling
			if(this.startContainer.nodeType == 3 /* TEXT_NODE */){
				// get the substring
				s = this.startContainer.nodeValue;
				sub = s.substring(this.startOffset, this.endOffset);

				// set the original text node to its new value
				if(how != CLONE){
					n = this.startContainer;
					start = this.startOffset;
					len = this.endOffset - this.startOffset;

					if(start === 0 && len >= n.nodeValue.length - 1){
						ve.dom.remove(n);
					} else {
						n.deleteData(start, len);
					}

					// Nothing is partially selected, so collapse to start point
					this.collapse(true);
				}

				if(how == DELETE){
					return;
				}
				if(sub.length > 0){
					frag.appendChild(this.doc.createTextNode(sub));
				}
				return frag;
			}

			// Copy nodes between the start/end offsets.
			n = this._getSelectedNode(this.startContainer, this.startOffset);
			cnt = this.endOffset - this.startOffset;

			while (n && cnt > 0){
				sibling = n.nextSibling;
				xferNode = this._traverseFullySelected(n, how);
				if(frag){
					frag.appendChild(xferNode);
				}
				--cnt;
				n = sibling;
			}

			// Nothing is partially selected, so collapse to start point
			if(how != CLONE){
				this.collapse(true);
			}
			return frag;
		},

		_traverseCommonStartContainer: function(endAncestor, how){
			var frag, n, endIdx, cnt, sibling, xferNode;

			if(how != DELETE){
				frag = this.createDocumentFragment();
			}

			n = this._traverseRightBoundary(endAncestor, how);

			//todo
			if(frag){
				frag.appendChild(n);
			}

			endIdx = ve.dom.nodeIndex(endAncestor);
			cnt = endIdx - this.startOffset;
			if(cnt <= 0){
				if(how != CLONE){
					this.setEndBefore(endAncestor);
					this.collapse(false);
				}
				return frag;
			}

			n = endAncestor.previousSibling;
			while (cnt > 0){
				sibling = n.previousSibling;
				xferNode = this._traverseFullySelected(n, how);

				if(frag)
					frag.insertBefore(xferNode, frag.firstChild);

				--cnt;
				n = sibling;
			}

			// Collapse to just before the endAncestor, which
			// is partially selected.
			if(how != CLONE){
				this.setEndBefore(endAncestor);
				this.collapse(false);
			}

			return frag;
		},

		_traverseCommonEndContainer: function(startAncestor, how){
			var frag, startIdx, n, cnt, sibling, xferNode;

			if(how != DELETE)
				frag = this.createDocumentFragment();

			n = this._traverseLeftBoundary(startAncestor, how);
			if(frag)
				frag.appendChild(n);

			startIdx = ve.dom.nodeIndex(startAncestor);
			++startIdx; // Because we already traversed it

			cnt = this.endOffset - startIdx;
			n = startAncestor.nextSibling;
			while (n && cnt > 0){
				sibling = n.nextSibling;
				xferNode = this._traverseFullySelected(n, how);

				if(frag)
					frag.appendChild(xferNode);

				--cnt;
				n = sibling;
			}

			if(how != CLONE){
				this.setStartAfter(startAncestor);
				this.collapse(true);
			}

			return frag;
		},

		_traverseCommonAncestors: function(startAncestor, endAncestor, how){
			var n, frag, commonParent, startOffset, endOffset, cnt, sibling, nextSibling;

			if(how != DELETE)
				frag = this.createDocumentFragment();

			n = this._traverseLeftBoundary(startAncestor, how);
			if(frag)
				frag.appendChild(n);

			commonParent = startAncestor.parentNode;
			startOffset = ve.dom.nodeIndex(startAncestor);
			endOffset = ve.dom.nodeIndex(endAncestor);
			++startOffset;

			cnt = endOffset - startOffset;
			sibling = startAncestor.nextSibling;

			while (cnt > 0){
				nextSibling = sibling.nextSibling;
				n = this._traverseFullySelected(sibling, how);

				if(frag)
					frag.appendChild(n);

				sibling = nextSibling;
				--cnt;
			}

			n = this._traverseRightBoundary(endAncestor, how);

			if(frag)
				frag.appendChild(n);

			if(how != CLONE){
				this.setStartAfter(startAncestor);
				this.collapse(true);
			}

			return frag;
		},

		_traverseRightBoundary: function(root, how){
			var next = this._getSelectedNode(this.endContainer, this.endOffset - 1),
				parent, clonedParent, prevSibling, clonedChild, clonedGrandParent,
				isFullySelected = next != this.endContainer;

			if(next == root){
				return this._traverseNode(next, isFullySelected, false, how);
			}

			parent = next.parentNode;
			clonedParent = this._traverseNode(parent, false, false, how);

			while (parent){
				while (next){
					prevSibling = next.previousSibling;
					clonedChild = this._traverseNode(next, isFullySelected, false, how);

					if(how != DELETE){
						if(clonedParent.firstChild){
							clonedParent.insertBefore(clonedChild, clonedParent.firstChild);
						} else {
							clonedParent.appendChild(clonedChild);
						}
					}

					isFullySelected = true;
					next = prevSibling;
				}

				if(parent == root){
					return clonedParent;
				}

				next = parent.previousSibling;
				parent = parent.parentNode;

				clonedGrandParent = this._traverseNode(parent, false, false, how);

				if(how != DELETE){
					clonedGrandParent.appendChild(clonedParent);
				}
				clonedParent = clonedGrandParent;
			}
		},

		_traverseLeftBoundary: function(root, how){
			var next = this._getSelectedNode(this.startContainer, this.startOffset), isFullySelected = next != this.startContainer, parent, clonedParent, nextSibling, clonedChild, clonedGrandParent;

			if(next == root)
				return this._traverseNode(next, isFullySelected, true, how);

			parent = next.parentNode;
			clonedParent = this._traverseNode(parent, false, true, how);

			while (parent){
				while (next){
					nextSibling = next.nextSibling;
					clonedChild = this._traverseNode(next, isFullySelected, true, how);

					if(how != DELETE)
						clonedParent.appendChild(clonedChild);

					isFullySelected = true;
					next = nextSibling;
				}

				if(parent == root)
					return clonedParent;

				next = parent.nextSibling;
				parent = parent.parentNode;

				clonedGrandParent = this._traverseNode(parent, false, true, how);

				if(how != DELETE)
					clonedGrandParent.appendChild(clonedParent);

				clonedParent = clonedGrandParent;
			}
		},

		/**
         * 找到startContainer和endContainer的公共祖先节点
         * @param {Boolean} includeSelf
         * @param {DOM} ignoreTextNode
         * @return {DOM}
         */
        getCommonAncestor : function(includeSelf, ignoreTextNode) {
            var start = this.startContainer,
                end = this.endContainer;
            if (start === end) {
                if (includeSelf && start.nodeType == 1 && this.startOffset == this.endOffset - 1) {
                    return start.childNodes[this.startOffset];
                }
                return ignoreTextNode && start.nodeType == 3 ? start.parentNode : start;
            }
            return _getCommonAncestor(start, end);
        },

		/**
		 * 节点遍历
		 * @param  {DOM}  n			   dom节点
		 * @param  {Boolean} isFullySelected 是否为全选
		 * @param  {Boolean} isLeft		  [description]
		 * @param  {[type]}  how			 [description]
		 * @return {[type]}				  [description]
		 */
		_traverseNode: function(n, isFullySelected, isLeft, how){
			var txtValue, newNodeValue, oldNodeValue, offset, newNode;

			if(isFullySelected){
				return this._traverseFullySelected(n, how);
			}

			/* TEXT_NODE */
			if(n.nodeType == 3){
				txtValue = n.nodeValue;

				if(isLeft){
					offset = this.startOffset;
					newNodeValue = txtValue.substring(offset);
					oldNodeValue = txtValue.substring(0, offset);
				} else {
					offset = this.endOffset;
					newNodeValue = txtValue.substring(0, offset);
					oldNodeValue = txtValue.substring(offset);
				}

				if(how != CLONE){
					n.nodeValue = oldNodeValue;
				}
				if(how == DELETE){
					return;
				}

				newNode = ve.dom.clone(n, false, this.doc);
				newNode.nodeValue = newNodeValue;
				return newNode;
			}
			if(how == DELETE){
				return;
			}
			return ve.dom.clone(n, false, this.doc);
		},

		_traverseFullySelected: function(n, how){
			if(how != DELETE){
				return how == CLONE ? ve.dom.clone(n, true, this.doc) : n;
			}
			ve.dom.remove(n);
		}
	});

	/**
	 * 查找父级节点
	 * @param  {DOM} node
	 * @param  {String} tagName
	 * @return {DOM}
	 */
	var findParent = function(node, tagName){
		if(node.tagName == tagName){
			return node;
		}
		while((node = node.parentNode) && node.tagName != 'BODY'){
			if(node && node.tagName == tagName){
				return node;
			}
		}
	};

	/**
	 * 判定该节点是否换行
	 * @param {DOM} n
	 * @return {Boolean}
	**/
	var _isNewLineNode = function(n){
		if(n && n.nodeType == 1){
			return ve.dom.isBr(n) ||
				(ve.dtd.$block[n.tagName] && !n.style.display) ||
				ve.dtd.$displayBlock[n.style.display];
		}
		return false;
	};

	/**
	 * 分割文本节点
	 * 返回切割后半部分的节点
	 * @param {DOM} textNode 节点
	 * @param {integer} offset 分割offset
	 * @return {DOM}
	 */
	var _splitTextNode = function(textNode, offset){
		var doc = textNode.ownerDocument;
		if(ve.ua.ie && offset == textNode.nodeValue.length){
			var next = doc.createTextNode('');
			return ve.dom.insertAfter(textNode, next);
		}

		if(ve.ua.ie > 6){
			var node = textNode.cloneNode(false);
			node.deleteData(0, offset)
			textNode.deleteData(offset, textNode.length - offset);
			if(textNode.nextSibling){
				textNode.parentNode.insertBefore(node, textNode.nextSibling);
			} else {
				textNode.parentNode.appendChild(node);
			}
			return node;
		} else {
			return textNode.splitText(offset);
		}
	};

	/**
	 * 移除多余br
	 * [fix] ie8 text<br/>情况，去除br之后，text尾部不能聚焦
	 * @param   {Range} rng
	 * @param   {DOM} node
	 * @param   {String} ltr
	 */
	var _clearBr = function(rng, node, ltr){
		var tmp = node;
		while(tmp = tmp[ltr]){
			var nx = tmp[ltr];
			if(ve.dom.isBr(tmp)){
				if(!ve.dom.isBr(nx)){
					if(nx && nx.nodeType == 3 && ve.string.trim(nx.nodeValue)){
						var span = rng.doc.createElement('span');
						ve.dom.insertBefore(span, nx);
						span.appendChild(nx);
					}
				} else if(ve.dom.isDisplayBlock(nx)){
					//<br/><br/><block>  -> <div>&nbsp;</div><block>
					//这里会给用户产生多一次delete或者backspace才能删除该行
					var div = rng.doc.createElement('div');
					div.innerHTML = '&nbsp;';
					ve.dom.insertBefore(div, tmp);
					ve.dom.remove(nx);
				} else {
					//<inline>text<br/><block>  -> <inline>text<br/><span>&nbsp;</span><block>
					var br = rng.doc.createElement('BR');
					var span = rng.doc.createElement('span');
					span.innerHTML = '&nbsp;';
					ve.dom.insertBefore(span, tmp);
					ve.dom[ltr == 'previousSibling' ? 'insertBefore' : 'insertAfter'](br, span);
					ve.dom.remove(nx);
				}
				ve.dom.remove(tmp);
				break;
			} else if(!rng.isBookmarkNode(tmp)){
				break;
			}
		}
	};

	/**
	 * 从dom node中获取document
	 * @param  {DOM} node
	 * @return {Document}
	 */
	var _getDocFromDom = function(node){
		return ve.ua.ie ? node['document'] : node['ownerDocument'];
	};

	/**
	 * 移除填充节点
	 * @param {DOM} excludeNode 例外节点
	**/
	var _removeFillData = function(excludeNode){
		try{
			if (FILL_TMP_NODE && _getDocFromDom(FILL_TMP_NODE) == this.doc) {
				if(!FILL_TMP_NODE.nodeValue.replace(ve.fillCharReg, '').length){
					var tmpNode = FILL_TMP_NODE.parentNode;
					ve.dom.remove(FILL_TMP_NODE);
					while(tmpNode && _isEmptyInlineElement(tmpNode) && !tmpNode.contains(excludeNode)){
						FILL_TMP_NODE = tmpNode.parentNode;
						ve.dom.remove(tmpNode);
						tmpNode = FILL_TMP_NODE
					}

				}else
				FILL_TMP_NODE.nodeValue = FILL_TMP_NODE.nodeValue.replace(ve.fillCharReg, '')
			}
		}catch(e){}
	};

	/**
	 * 判断节点是否为空的内联节点
	 * @param   {DOM}  node
	 * @return  {Boolean}
	 */
	var _isEmptyInlineElement = function(node){
        if (node.nodeType != 1 || !ve.dtd.$removeEmpty[ node.tagName ]){
			return 0;
		}
        node = node.firstChild;
        while (node) {
            if (this.isBookmarkNode(node)){
				return 0;
			}
            if (node.nodeType == 1 && !_isEmptyInlineElement(node) || node.nodeType == 3 && !_isWhitespace(node)){
                return 0;
            }
            node = node.nextSibling;
        }
        return 1;
	};

	/**
	 * 是否为空白节点
	 * @param   {DOM}  node
	 * @return  {Boolean}
	 */
	var _isWhitespace = function(node){
		return !new RegExp('[^ \t\n\r' + ve.blankChar + ']').test(node.nodeValue);
	};


	/**
	 * 合并兄弟节点
	 * @param   {DOM} node
	 * @param   {String} dir  方向nextSibling|previousSibling
	 */
	var _mergSibling = function(node,dir){
		var tmpNode;
		node = node[dir];
		while(node && node.nodeType == 3 && !node.nodeValue.replace(new RegExp(ve.fillCharReg),'').length){
			tmpNode = node[dir];
			ve.dom.remove(node);
			node = tmpNode;
		}
	};


	/**
	 * 返回n的parent n级链接
	 * 这里会检测n必须为靠A最左或者最右
	 * @param {DOM} n
	 * @param {Boolean} left
	 * @return {DOM|null}
	 */
	var checkBoundaryLink = function(n, left){
		while(n.parentNode){
			if(n.parentNode[left ? 'firstChild' : 'lastChild'] == n){
				n = n.parentNode;
				if(n.tagName == 'A'){
					return n;
				}
			} else {
				return;
			}
		}
		return;
	}

	/**
	 * 调整链接边界
	 * 如 <a><b>[text</b>]</a> -> [<a><b>text</b></a>]
	 * @param  {Range} rng
	 * @param  {DOM} start
	 * @param  {Boolean} left
	 * @return {Boolean} 是否命中
	 */
	var adjustBoundaryLink = function(rng, start, left){
		var n = checkBoundaryLink(start, left);
		if(n){
			rng[left ? 'setStartBefore': 'setEndAfter'](n);
			return true;
		}
		return;
	};

	 /**
	 * 得到公共的祖先节点
	 * @param   {Node}     nodeA      节点A
	 * @param   {Node}     nodeB      节点B
	 * @return {Node} nodeA和nodeB的公共节点
	 */
	var _getCommonAncestor = function(nodeA, nodeB) {
		if (nodeA === nodeB){
			return nodeA;
		}
		var parentsA = [nodeA],
			parentsB = [nodeB],
			parent = nodeA,
			i = -1;
		while (parent = parent.parentNode) {
			if (parent === nodeB){
				return parent;
			}
			parentsA.push(parent)
		}
		parent = nodeB;
		while (parent = parent.parentNode) {
			if (parent === nodeA){
				return parent;
			}
			parentsB.push(parent)
		}
		parentsA.reverse();
		parentsB.reverse();
		while (i++,parentsA[i] === parentsB[i]);
		return i == 0 ? null : parentsA[i - 1];
	};

	/**
	 * 获取ie selection
	 * @return {Selection}
	 **/
	var _getIESelection = function(win, doc){
		return doc.selection;
	};

	/**
	 * 获取w3c selection
	 * @return {Selection}
	 **/
	var _getW3CSelection = function(win, doc){
		return win.getSelection();
	};

	/**
	 * 获取IE Range
	 * @param {DOM} win
	 * @param {DOM} Doc
	 * @return {Range}
	**/
	var _getIERange = function(win, doc){
		var rng, sel = _getIESelection(win, doc);
		try {
			rng = sel.createRange();
		}catch (ex) {};
		if (!rng){
			rng = doc.body.createTextRange();
		}
		return rng;
	};

	/**
	 * 获取W3C Range
	 * @param {DOM} win
	 * @param {DOM} Doc
	 * @return {Range}
	**/
	var _getW3CRange = function(win, doc){
		var rng, sel = _getW3CSelection(win, doc);
		try {
			if(sel){
				rng = sel.rangeCount > 0 ? sel.getRangeAt(0) : doc.createRange();
			}
		} catch(ex){};
		return rng;
	};

	/**
	 * 获取浏览器选区
	 * @param  {BOM} win
	 * @param  {DOM} doc
	 * @return {Selection}
	 */
	VEditor.Range.getNativeSelection = function(win, doc){
		return ve.ua.ie ? _getIESelection(win, doc) : _getW3CSelection(win, doc);
	};

	/**
	 * 获取浏览器范围
	 * @param  {BOM} win
	 * @param  {DOM} doc
	 * @return {Range}
	 */
	VEditor.Range.getNativeRange = function(win, doc){
		return ve.ua.ie ? _getIERange(win, doc) : _getW3CRange(win, doc);
	};
})(VEditor);
(function(ve){
	var _PLUGINS = {};

	/**
	 * 插件管理器
	 * 主要包含插件的加载功能能
	 */
	ve.lang.Class('VEditor.PluginManager', {
		PluginManager: function(){},

		/**
		 * 加载插件
		 * @param {string} name 插件名称(插件文件夹)
		 * @param {string} folder 插件路径
		 * @param {function} callback
		 */
		add: function (name, folder, callback) {
			if(this.get(name)){
				callback();
			}
			var url = this.parsePluginPath(name, folder);
			ve.net.loadScript(url, callback);
		},

		/**
		 * 解析插件路径
		 * @param  {String} name
		 * @param  {String} folder
		 * @return {String}
		 */
		parsePluginPath: function(name, folder){
			var path = name;
			if (!/^https?\:\/\//.test(name)) {
				path = 'plugins/' + (folder || name) + '/plugin.js';
			}
			return ve.getAbsPath(path);
		},

		/**
		 * 获取插件类
		 * @param  {String} name
		 * @return {Function}
		 */
		get: function(name){
			return _PLUGINS[name];
		},

		/**
		 * 注册插件
		 * @param  {String} n 插件名称
		 * @param  {Function} t 插件类
		 */
		register: function (n, t) {
			t = typeof t == 'string' ? ve.lang.resolve(t): t;
			_PLUGINS[n] = t;
		},

		/**
		 * 取消注册
		 * @param  {String} n
		 */
		unRegister: function(n){
			delete _PLUGINS[n];
		}
	});
	ve.plugin = new VEditor.PluginManager();
})(VEditor);

(function(ve){
	/**
	 * 属性扩展方法
	 * @param {Mix} arg1
	 * @param {Mix} arg2
	 * @return {Mix}
	 **/
	var X = function(t/**,arg1,arg2**/) {
		var a = arguments;
		for ( var i=1; i<a.length; i++ ) {
			var x = a[i];
			for ( var k in x ) {
				if (!t.hasOwnProperty(k)) {
					t[k] = x[k];
				}
			}
		}
		return t;
	};

	/**
	 * 去除object里面的key的大小写区分
	 * @param {Object} obj
	 * @return {Object}
	 **/
	var _t = function(obj){
		var tmp = {};
		for(var key in obj){
			var item = obj[key];
			if(typeof(item) == 'object'){
				tmp[key.toUpperCase()] = transToUpperCase(item);
			} else {
				tmp[key.toUpperCase()] = item;
			}
		}
		return tmp;
	};

	/**
	 * DTD对象
	 * @deprecated 对象中以$符号开始的，表示为额外的判定方法，传入的参数不一定是tagName
	 * 例如 ve.dtd.$displayBlock[node.style.display]
	 * @return {Boolean}
	 */
	ve.dtd = (function(){
		//交叉规则
		var A = _t({isindex:1,fieldset:1}),
	        B = _t({input:1,button:1,select:1,textarea:1,label:1}),
	        C = X( _t({a:1}), B ),
	        D = X( {iframe:1}, C ),
	        E = _t({hr:1,ul:1,menu:1,div:1,blockquote:1,noscript:1,table:1,center:1,address:1,dir:1,pre:1,h5:1,dl:1,h4:1,noframes:1,h6:1,ol:1,h1:1,h3:1,h2:1}),
	        F = _t({ins:1,del:1,script:1,style:1}),
	        G = X( _t({b:1,acronym:1,bdo:1,'var':1,'#':1,abbr:1,code:1,br:1,i:1,cite:1,kbd:1,u:1,strike:1,s:1,tt:1,strong:1,q:1,samp:1,em:1,dfn:1,span:1}), F ),
	        H = X( _t({sub:1,img:1,embed:1,object:1,sup:1,basefont:1,map:1,applet:1,font:1,big:1,small:1}), G ),
	        I = X( _t({p:1}), H ),
	        J = X( _t({iframe:1}), H, B ),
	        K = _t({img:1,embed:1,noscript:1,br:1,kbd:1,center:1,button:1,basefont:1,h5:1,h4:1,samp:1,h6:1,ol:1,h1:1,h3:1,h2:1,form:1,font:1,'#':1,select:1,menu:1,ins:1,abbr:1,label:1,code:1,table:1,script:1,cite:1,input:1,iframe:1,strong:1,textarea:1,noframes:1,big:1,small:1,span:1,hr:1,sub:1,bdo:1,'var':1,div:1,object:1,sup:1,strike:1,dir:1,map:1,dl:1,applet:1,del:1,isindex:1,fieldset:1,ul:1,b:1,acronym:1,a:1,blockquote:1,i:1,u:1,s:1,tt:1,address:1,q:1,pre:1,p:1,em:1,dfn:1}),

	        L = X( _t({a:0}), J ),
	        M = _t({tr:1}),
	        N = _t({'#':1}),
	        O = X( _t({param:1}), K ),
	        P = X( _t({form:1}), A, D, E, I ),
	        Q = _t({li:1}),
	        R = _t({style:1,script:1}),
	        S = _t({base:1,link:1,meta:1,title:1}),
	        T = X( S, R ),
	        U = _t({head:1,body:1}),
	        V = _t({html:1});

	    //特殊规则
		var block = _t({address:1,blockquote:1,center:1,dir:1,div:1,section:1,header:1,footer:1,nav:1,article:1,aside:1,figure:1,dialog:1,hgroup:1,time:1,meter:1,menu:1,command:1,keygen:1,output:1,progress:1,audio:1,video:1,details:1,datagrid:1,datalist:1,dl:1,fieldset:1,form:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,hr:1,isindex:1,noframes:1,ol:1,p:1,pre:1,table:1,ul:1}),
			empty =  _t({area:1,base:1,br:1,col:1,hr:1,img:1,input:1,link:1,meta:1,param:1,embed:1,wbr:1});

		return {
			/**
			 * 判断节点display是否为块模型
			 * @param {String} DOM.style.display
			 * @return {Boolean}
			 */
			$displayBlock: {
				'-webkit-box':1,'-moz-box':1,'block':1 ,'list-item':1,'table':1 ,'table-row-group':1,
				'table-header-group':1,'table-footer-group':1,'table-row':1,'table-column-group':1,
				'table-column':1, 'table-cell':1 ,'table-caption':1
			},

			/**
			 * 判定方法
			 * @param {String} DOM.tagName
			 * @return {Boolean}
			 */
			$nonBodyContent: X( V, U, S ),
			$block : block,
			$inline : L,
			$body : X( _t({script:1,style:1}), block ),
			$cdata : _t({script:1,style:1}),
			$empty : empty,
			$nonChild : _t({iframe:1}),
			$listItem : _t({dd:1,dt:1,li:1}),
			$list: _t({ul:1,ol:1,dl:1}),
			$isNotEmpty : _t({table:1,ul:1,ol:1,dl:1,iframe:1,area:1,base:1,col:1,hr:1,img:1,embed:1,input:1,link:1,meta:1,param:1}),
			$removeEmpty : _t({a:1,abbr:1,acronym:1,address:1,b:1,bdo:1,big:1,cite:1,code:1,del:1,dfn:1,em:1,font:1,i:1,ins:1,label:1,kbd:1,q:1,s:1,samp:1,small:1,span:1,strike:1,strong:1,sub:1,sup:1,tt:1,u:1,'var':1}),
			$removeEmptyBlock : _t({'p':1,'div':1}),
			$tableContent : _t({caption:1,col:1,colgroup:1,tbody:1,td:1,tfoot:1,th:1,thead:1,tr:1,table:1}),
			$notTransContent : _t({pre:1,script:1,style:1,textarea:1}),

			/**
			 * 普通判定
			 * @param {String} DOM.tagName
			 * @return {Boolean}
			 */
			html: U,
			head: T,
			style: N,
			script: N,
			body: P,
			base: {},
			link: {},
			meta: {},
			title: N,
			col : {},
			tr : _t({td:1,th:1}),
			img : {},
			embed: {},
			colgroup : _t({thead:1,col:1,tbody:1,tr:1,tfoot:1}),
			noscript : P,
			td : P,
			br : {},
			th : P,
			center : P,
			kbd : L,
			button : X( I, E ),
			basefont : {},
			h5 : L,
			h4 : L,
			samp : L,
			h6 : L,
			ol : Q,
			h1 : L,
			h3 : L,
			option : N,
			h2 : L,
			form : X( A, D, E, I ),
			select : _t({optgroup:1,option:1}),
			font : L,
			ins : L,
			menu : Q,
			abbr : L,
			label : L,
			table : _t({thead:1,col:1,tbody:1,tr:1,colgroup:1,caption:1,tfoot:1}),
			code : L,
			tfoot : M,
			cite : L,
			li : P,
			input : {},
			iframe : P,
			strong : L,
			textarea : N,
			noframes : P,
			big : L,
			small : L,
			span :_t({'#':1,br:1}),
			hr : L,
			dt : L,
			sub : L,
			optgroup : _t({option:1}),
			param : {},
			bdo : L,
			'var' : L,
			div : P,
			object : O,
			sup : L,
			dd : P,
			strike : L,
			area : {},
			dir : Q,
			map : X( _t({area:1,form:1,p:1}), A, F, E ),
			applet : O,
			dl : _t({dt:1,dd:1}),
			del : L,
			isindex : {},
			fieldset : X( _t({legend:1}), K ),
			thead : M,
			ul : Q,
			acronym : L,
			b : L,
			a : X( _t({a:1}), J ),
			blockquote :X(_t({td:1,tr:1,tbody:1,li:1}),P),
			caption : L,
			i : L,
			u : L,
			tbody : M,
			s : L,
			address : X( D, I ),
			tt : L,
			legend : L,
			q : L,
			pre : X( G, C ),
			p : X(_t({'a':1}),L),
			em :L,
			dfn : L
		};
	})();
})(VEditor);
(function(ve) {
	/**
	 * 视图管理
	 * 包含对编辑器各大视图组件的布局
	 **/
	ve.lang.Class('VEditor.ViewManager', {
		_lookup: {},
		urls: {},

		/**
		 * 注册一个视图管理器
		 * @param {String} name
		 * @param {Mix} t
		 **/
		register: function (name, t) {
			t = typeof t == 'string' ? ve.lang.resolve(t): t;
			this._lookup[name] = t;
		},

		/**
		 * 取的一个视图管理器
		 * @param {String} name
		 * @return {Object}
		 **/
		get: function(name){
			return this._lookup[name];
		}
	});

	/**
	 * 视图控制器
	 **/
	ve.lang.Class('VEditor.ViewControler', {
		ViewControler: function(){},
		renderUI: function(){}
	});

	ve.viewManager = new VEditor.ViewManager();
})(VEditor);
(function(ve) {
	/**
	 * UIControl 控件基类
	 * @deprecated 按钮、工具条等都有此类派生而来
	 */
	ve.lang.Class('VEditor.ui.UIControl', {
		/**
		 * 构造方法
		 * @param {String} id 控件ID
		 * @param {Object} s  配置项
		 */
		UIControl : function(id, s) {
			var _this = this;
			this.id = id;		//控件ID
			this.dom = null;	//控件DOM
			this.active = 0;	//当前状态
			this.conf = s || {
				toggle: false	//是否可切换状态
			};

			this.disabled = !!this.conf.disabled;
			this.rendered = false;

			//状态类名
			this.normalClass = '';
			this.overClass = 'veControlOver';
			this.enabledClass = 'veControlEnabled';
			this.disabledClass = 'veControlDisabled';
			this.activeClass = 'veControlActive';

			ve.lang.each('onClick,onMouseDown,onKeyDown,onKeyUp,onKeyPress,onMouseOver,onMouseOut,onMouseUp'.split(','), function (n) {
				_this[n] = new ve.EventManager();
			})
		},

		/**
		 * 隐藏
		 */
		hide: function(){
			if (this.dom) {
				ve.dom.setStyle(this.dom, 'display', 'none');
			}
		},

		/**
		 * 显示
		 */
		show: function(){
			if (this.dom) {
				ve.dom.setStyle(this.dom, 'display', 'block');
			}
		},

		/**
		 * 获取DOM
		 * @return {DOM}
		 */
		getDom: function(){
			return this.dom;
		},

		/**
		 * 设置组件disable
		**/
		setDisable: function(){
			if(this.dom){
				ve.dom.removeClass(this.dom, this.enabledClass);
				ve.dom.removeClass(this.dom, this.activeClass);
				ve.dom.addClass(this.dom, this.disabledClass);
				this.disabled = true;
			}
		},

		/**
		 * 设置组件enable
		 **/
		setEnabled: function(){
			if(this.dom){
				ve.dom.addClass(this.dom, this.enabledClass);
				ve.dom.removeClass(this.dom, this.activeClass);
				ve.dom.removeClass(this.dom, this.disabledClass);
				this.disabled = false;
			}
		},

		bindHandler: function(){},
		renderHTML: function(){},
		renderDOM: function(){},

		/**
		 * 渲染控件并绑定处理事件
		 * @param {DOM} n 需要渲染到的容器
		 * @param {String} where 位置
		 * @param {DOM} rela 关联dom
		 **/
		renderTo: function(n, where, rela) {
			if (!n || !n.nodeType ){
				return;
			}

			var html = this.renderHTML(),  node;

			if (!html) {
				node = this.renderDOM();
				this.dom = node;
				if (!node){
					return;
				}
				if (node.nodeType == 1) {
					if (rela && rela.nodeType == 1) {
						switch(where) {
							case 'before':
							case 0:
								n.insertBefore(node, rela);
								break;
							case 'after':
							case 1:
								if (rela.nextSibling) {
									n.insertBefore(node, rela.nextSibling);
								}
								else {
									n.appendChild(node);
								}
								break;
							default:
								break;
						}
					} else {
						n.appendChild(node);
					}
				}
			}

			else {
				var tmpContainer = document.createElement('div'), f;
					tmpContainer.innerHTML = html;

				for (var i = 0; i < tmpContainer.childNodes.length; i++) {
					if (tmpContainer.childNodes[i].nodeType == 3) {
						tn = document.createTextNode(tmpContainer.childNodes[i]);
					} else {
						tn = tmpContainer.childNodes[i];
					}

					if (rela && rela.nodeType == 1) {
						switch(where) {
							case 'before':
							case 0:
								n.insertBefore(tn, rela);
								break;
							case 'after':
							case 1:
								if (rela.nextSibling) {
									n.insertBefore(tn, rela.nextSibling);
								}
								else {
									n.appendChild(tn);
								}
								break;
							default:
								break;
						}
					} else {
						n.appendChild(tn);
					}
					this.dom = tn;
				}
			}
			if(this.conf.onInit){
				this.conf.onInit.apply(this);
			}
			this.bindHandler();
		},

		/**
		 * 删除当前控件
		 * @deprecate 该方法当前未被使用
		 **/
		remove : function() {
			ve.dom.remove(this.dom);
			//this.destroy();
		},

		/**
		 * 切换active状态
		 **/
		toggleActive: function(){
			if(!this.conf.toggle && !this.disabled){
				return;
			}
			this[this.active ? 'setUnActive' : 'setActive']();
			return this.active;
		},

		/**
		 * 设置为active状态
		 **/
		setActive: function(){
			if(!this.conf.toggle && !this.disabled){
				return;
			}
			this.active = 1;
			ve.dom.addClass(this.dom, this.activeClass);
		},

		/**
		 * 设置为unActive状态
		 **/
		setUnActive: function(){
			if(!this.conf.toggle && !this.disabled){
				return;
			}
			this.active = 0;
			ve.dom.removeClass(this.dom, this.activeClass);
		}
	});
})(VEditor);
(function(ve) {
	/**
	 * UI控件基类
	 */
	ve.lang.Class('VEditor.ui.Base', {
		/**
		 * 构造方法
		 * @param {Object} ed 编辑器实例对象
		 * @param {Object} s  配置
		 */
		Base: function(ed, s) {
			var t = this;
			ve.lang.each(['onLoad'], function (n) {
				t[n] = new ve.EventManager(t);
			});
		}
	})
})(VEditor);

(function(ve) {

	ve.lang.Class('VEditor.ui.Container:VEditor.ui.UIControl', {
		Container: function(id, s) {
			this.base(id, s);
			this.id = id;
			this.conf = s;
			this.uiControls = [];
			this._lookup = {};
		},

		add: function(c) {
			if(!c || !c.id || this._lookup[c.id]){
				//console.log('UI CONTROL ALREADY EXISTS');
				return;
			}
			this._lookup[c.id] = c;
			this.uiControls.push(c);
			return c;
		},

		setConfig: function(config){
			this.conf = config;
		},

		getConfig: function(){
			return this.conf;
		},

		get: function(n) {
			return this._lookup[n];
		},

		renderHTML: function () {
			return '<div id="' + this.id + '" class="veCommContainer ' + (this.conf['class'] || '') + '"></div>'
		}
	});
})(VEditor);
(function(ve) {
	/**
	 * 工具条管理类
	 * @deprecated 负责工具条创建、管理
	 */
	ve.lang.Class('VEditor.ui.ToolbarManager', {
		/**
		 * 构造方法
		 * @param {Object} ed   当前编辑器实例对象
		 * @param {Object} conf 配置项
		 */
		ToolbarManager: function(ed, conf) {
			var _this = this;
			this.editor = ed;
			this.conf = ve.lang.extend(true, {}, conf);
			this._lookupToolbars = [];
			this._uiControlCollection = {};

			//扩展toolbarManager的方法到editor
			ve.lang.each(['createToolbar','getToolbar','createButton','getButton','addUIControl','getUIControl'], function(method){
				_this.editor[method] = function(){
					return _this[method].apply(_this, ve.lang.arg2Arr(arguments));
				};
			});
		},

		/**
		 * 创建toolbar容器
		 * @param {Object} opt
		 **/
		createContainer: function(opt) {
			opt = opt || {};
			var div = ve.dom.create('div', {
				'class': (opt['class'] || '')+ ' '  + (this.conf['class'] || ''),
				'style': ve.lang.extend(opt['style'] || {}, {'overflow':'hidden'})
			});
			if(this.conf.width){
				ve.dom.setStyle(div, 'width', this.conf.width);
			}
			return div;
		},

		/**
		 * 获取工具条
		 * @param {String} id
		 **/
		getToolbar: function(id) {
			var foundTb;
			id = this.generateId(id);
			ve.lang.each(this._lookupToolbars, function(tb){
				if(tb.id == id){
					foundTb = tb;
					return false;
				}
			});
			return foundTb;
		},

		/**
		 * 查询control, 这里查到的是正在toolbar里面使用的control，
		 * 如果需要查询所有的，请使用getUIControlFromCollection
		 * @param {String} id
		 * @return {UIControl}
		**/
		getUIControl: function(id) {
			var id = this.generateId(id);
			var foundControl;
			ve.lang.each(this._lookupToolbars, function(tb){
				ve.lang.each(tb.uiControls, function(control){
					if(control.id == id){
						foundControl = control;
						return false;
					}
				});
				if(foundControl){
					return false;
				}
			});
			return foundControl;
		},

		/**
		 * alias for getUIControl
		 **/
		get: function(id){
			return this.getUIControl(id);
		},

		/**
		 * 查询所有的UI Control
		 * @deprecate 这里查询到的包含了在当前toolbar sets里面使用的和没有使用的
		 * @param {String} id
		 * @return {Object}
		 **/
		getUIControlFromCollection: function(id){
			return this._uiControlCollection[this.generateId(id)];
		},

		/**
		 * 添加按钮到toolbar
		 * @param {Object} btn 按钮
		 * @param {String} toolbarId
		 **/
		addButton: function(btn, toolbarId) {
			return this.addUIControl(btn, toolbarId);
		},

		/**
		 * 产生控件的别名id
		 * @param {String} id
		 * @return {String}
		**/
		generateId: function(id){
			return this.editor.id + '_' + id;
		},

		/**
		 * 创建Button，同时添加到ui collection集合中
		 * 如果按钮指定了to toolbar的话， 则也加入到相应的toolbar集合中
		 * @param {String} id
		 * @param {Object} option
		 * @return {VEditor.ui.Button}
		**/
		createButton: function(id, option) {
			option = ve.lang.extend(true, {editor: this.editor}, option || {});

			if (this.getUIControlFromCollection(id)){
				throw('BUTTON CONTROL ALREADY EXISTS');
			}

			var btn = new ve.ui.Button(this.generateId(id), option);
			if(option.onClick){
				btn.onClick.add(option.onClick);
			}

			if(option.to){
				this.addUIControl(btn, option.to);
			}
			this._addUIControlToCollection(btn);
			return btn;
		},

		/**
		 * 添加到uicontrolcollection库中
		 * @param {Object} control
		 **/
		_addUIControlToCollection: function(control){
			this._uiControlCollection[control.id] = control;
		},

		/**
		 * 创建toolbar，同时添加到toolbar集合中
		 * @param {String} id
		 * @param {Object} config
		 * @return {ve.UI.Toolbar}
		 **/
		createToolbar: function(id, config){
			var tb = this.getToolbar(id);
			config = config || {};
			if(!tb){
				tb = new ve.ui.Toolbar(this.generateId(id), config);
				this._lookupToolbars.push(tb);
			} else {
				tb.setConfig(config);
			}
			return tb;
		},

		/**
		 * 查询button控件
		 * @param {String} id
		 * @return {UIControl}
		 **/
		getButton: function (id) {
			return this.getUIControl(id);
		},

		/**
		 * 添加一个UIControl实例到指定 toolbar
		 * @param {Object} control
		 * @param {String} to
		 **/
		addUIControl: function(control, toolbarId) {
			var tb = this.getToolbar(toolbarId);
			if (!tb) {
				tb = this.createToolbar(toolbarId);
			}
			return tb.add(control);
		},

		/**
		 * 创建一个listbox，同时添加到ui collection中
		 * 如果按钮指定了to toolbar的话， 则也加入到相应的toolbar集合中
		 * @param {String} name
		 * @param {Object} conf
		 * @return {VEditor.ui.ListBox}
		**/
		createListBox: function(name, conf) {
			if(this.getUIControl(name)){
				return null;
			}

			conf = ve.lang.extend({
				editor: this.editor
			}, conf || {});

			var id = this.generateId(name);

			var list = new ve.ui.ListBox(id, conf);
			if(conf.onChange){
				list.onChange.add(conf.onChange);
			}
			if(conf.to){
				this.addUIControl(list, conf.to);
			}
			this._addUIControlToCollection(list);
			return list;
		},

		/**
		 * 获取所有工具条的uicontrol
		 **/
		getAllToolbarUIControls: function(){
			var arr = [];
			ve.lang.each(this._lookupToolbars, function (tb) {
				ve.lang.each(tb.uiControls, function(control){
					arr.push(control);
				});
			});
			return arr;
		},

		/**
		 * 初始化
		 * @param {Function} grep 过滤函数
		**/
		render: function(grep) {
			var t = this;
			grep = grep || function() {return true;};

			//按照group1, group2这种排序
			this._lookupToolbars.sort(function(a, b){
				var id1 = parseInt(a.id.replace(t.editor.id + '_group', ''), 10);
				var id2 = parseInt(b.id.replace(t.editor.id + '_group', ''), 10);
				if(id1 == id2){
					return 0;
				}
				return id1 > id2 ? 1 : -1;
			});

			ve.lang.each(t._lookupToolbars, function (tb) {
				tb.renderTo(t.editor.toolbarContainer);
				tb.uiControls.sort(function(a, b){		//按照at:0, at:1 这种排序
					var at1 = a.conf.at || 0;
					var at2 = b.conf.at || 0;
					if(at1 == at2){
						return 0;
					}
					return at1 > at2 ? 1 : -1;
				});

				ve.lang.each(tb.uiControls, function (control) {
					var b = grep(control);
					if (b === false){
						return;
					}
					control.renderTo(tb.dom);
				});
			});
		}
	});

	/**
	 * 工具条类
	 */
	ve.lang.Class('VEditor.ui.Toolbar:VEditor.ui.Container', {
		/**
		 * 构造方法
		 * @param {String} id
		 * @param {Object} s 配置项
		 */
		Toolbar: function (id, s) {
			this.base(id, s);
		},

		/**
		 * 渲染工具条结构
		 * @return {String}
		 */
		renderHTML: function () {
			var s = this.conf;
			var h = '<div id="' + this.id + '" class="veToolbar '+ (s['class']||'') + '">'
			return h + '</div>';
		}
	});
})(VEditor);
(function(ve) {
	ve.lang.Class('VEditor.ui.Button:VEditor.ui.UIControl', {
		/**
		 * 按钮基类构造函数
		 * @param {String} id
		 * @param {Object} conf
		 */
		Button: function (id, conf) {
			var t = this;
			conf = ve.lang.extend({toggle: 1}, conf);
			this.base(id, conf)
			this.type = 'button';
			this.dom = document.createElement('span');	//预填充，防止没有render的按钮被执行了getDom的相关初始化操作
			this.classPrefix = 'veButton_';
			this.normalClass = 'veButton';
			this.overClass = 'veButton_over';
			this.enabledClass = 'veButton_enabled';
			this.disabledClass = 'veButton_disabled';
			this.activeClass = 'veButton_active';
			this.onClick = new ve.EventManager();
		},

		/**
		 * 渲染按钮
		 * @return {String}
		 */
		renderHTML: function () {
			var s = this.conf;
			var html = ([
				'<span tabindex="0" id="',this.id,'" class="',this.normalClass,' ',(s.disabled?this.disabledClass:this.enabledClass),' ',this.classPrefix+s['class'],'" title="', (s.title),'">',
					'<span class="veIcon ',s['class'],'">',(s.text||''),'</span>',
				'</span>'
			]).join('');
			return html;
		},

		/**
		 * 设置title
		 * @param {String} str
		 */
		setTitle: function(str){
			this.dom.title = str;
		},

		/**
		 * 绑定处理事件
		 **/
		bindHandler: function () {
			var _this = this;
			var t = this, s = t.conf;
			ve.dom.event.add(this.dom, 'click', function (e) {
				ve.dom.event.preventDefault(e);		//统一所有control出来的button采用preventDefault处理
				if (s.disabled || t.disabled){		//配置禁用，或者后期禁用
					return;
				}
				if(typeof(t.conf.cmd) == 'function'){
					t.conf.cmd.apply(_this);
				} else if(t.conf.cmd){
					t.conf.editor.editorcommands.execCommand(t.conf.cmd);
				}
				_this.onClick.fire(_this);
			});

			ve.dom.event.add(this.dom, 'mousedown', function(e) {
				t.onMouseDown.fire(t, e, s);
			});

			ve.dom.event.add(this.dom, 'mouseup', function(e) {
				t.onMouseUp.fire(t, e);
			});

			//初始态disabled
			if(s.disabled){
				return;
			}

			ve.dom.event.add(this.dom, 'mouseover', function (e) {
				if(!_this.disabled){
					ve.dom.addClass(_this.dom, _this.overClass);
					t.onMouseOver.fire();
				}
			});

			ve.dom.event.add(this.dom, 'mouseout', function (e) {
				if(!_this.disabled){
					ve.dom.removeClass(_this.dom, _this.overClass);
					t.onMouseOut.fire();
				}
			});
		}
	});
})(VEditor);
(function(ve) {
	var dom = ve.dom;

	/**
	 * 一个listbox类
	 * items格式为一个二维数组[[1,'1', 'style', cmdfn]]
	 * 表示索引，显示text，显示样式，执行的自定义命令
	 */
	ve.lang.Class('VEditor.ui.ListBox:VEditor.ui.UIControl', {
		ListBox: function (id, conf) {
			conf = ve.lang.extend(true, {
				cmd: function(){},		//list命令
				ui: false,				//ui项
				items: [],				//菜单子项
				editor: null,			//所属编辑器对象
				onInit: null
			}, conf);

			//菜单面板id
			this.listboxid = id + '_panel';
			this.base(id, conf);

			this.dom = null;			//当前默认态的DOM
			this.panel = null;			//list面板
			this.classPrefix = 'veList';

			this.onChange = new ve.EventManager();
			this._createListPanel();
		},

		/**
		 * 渲染出列表默认态html数据
		 * @return {string}
		 */
		renderHTML: function(){
			var html = ([
				'<div class="',this.classPrefix,' ',this.classPrefix,this.conf['class'],'" id="',this.id,'">',
					'<div class="',this.classPrefix,'_current">',
						'<a href="javascript:;">',this.conf['title'],'</a>',
					'</div>',
					'<div class="',this.classPrefix,'_downicon">',
						'<a href="javascript:;"></a>',
					'</div>',
				'</div>']).join('');
			return html;
		},

		/**
		 * 获取菜单项HTML
		 * @param {array} item 数据[value, name, extAttributeStr, extClassName]
		 * @return {string}
		 */
		getListItemHtml: function(item, pos) {
			var name = item[1] || item[0],
				val = item[0],
				attr = item[2] || '',
				extClass = item[3] || '';
				iconStyle = item[4] || '';

			var html = ([
				'<div class="',this.classPrefix,'_item_con ',extClass,'" seq="',pos,'" value="',val,'">',
					'<a href="javascript:;" class="',this.classPrefix,'Item">',
						'<span class="sel_icon sel_icon_hidden" style="',iconStyle,'"><b>','\u221a','</b></span>',
						'<span class="item_cont" ',attr,'>',name,'</span>',
						'<span class="icon_suffix"></span>',
					'</a>',
				'</div>']).join('');
			return html;
		},

		/**
		 * 添加item
		 * @param {object} params {item:[], pos:'last'} pos支持：last, first, 和数字
		 */
		addItem: function(params) {
			var params = ve.lang.extend(true, {pos:'last'}, params);
			if (!params.item){
				return
			};
			if (params.pos == 'last'){
				params.pos = this.conf.items.length
			};
			if (params.pos == 'first'){
				params.pos = 0;
			};
			params.pos = Math.min(params.pos, this.conf.items.length);
			params.pos = Math.max(params.pos, 0);

			//追加数据到配置数组
			this.conf.items.splice(params.pos, 0, params.item);

			var list = ve.dom.selector('#' + this.listboxid)[0];
			if (list){
				var relItem = ve.dom.selector('>div', list),
					html = this.getListItemHtml(params.item, params.pos),
					item;
				if (!relItem[params.pos]) {
					item = ve.dom.insertHTML(relItem[params.pos - 1], 'afterend', html);
				} else {
					item = ve.dom.insertHTML(relItem[params.pos], 'beforebegin', html);
				}

				if(item){
					this.bindListItemEvent(item);
				}
			}
		},

		/**
		 * 设置caption
		 * @param {String} val
		 **/
		setCaption: function(val){
			var _this = this;
			var name = this.getNameByValue(val);

			//默认
			if(!name){
				name = this.conf.title;
				val = -1;
			}

			//设置菜单标题
			var listCaption = ve.dom.selector('.' + _this.classPrefix + '_current', _this.dom)[0];
			ve.dom.setHTML(listCaption, '<a value="' + val + '" href="javascript:;">' + name + '</a>');
		},

		/**
		 * 获取name
		 * @param {String} val
		 * @return {String}
		 **/
		getNameByValue: function(val){
			if(!val){
				return null;
			}
			var found, name;
			ve.lang.each(this.conf.items, function(item){
				if(item[0] == val){
					found = true;
					name = item[1] || item[0];
					return true;
				}
			});
			return found ? name : null;
		},

		/**
		 * 绑定菜单项事件
		 * 包括菜单项的点击、hover效果
		 * @param {object} listItem 菜单项DOM
		 */
		bindListItemEvent: function(listItem){
			var _this = this;

			ve.dom.event.add(listItem, 'click', function (e) {
				ve.dom.event.preventDefault(e);
				var seq = this.getAttribute('seq');
				var val = this.getAttribute('value');

				if(!seq || !val){
					return '';
				}

				//触发onChange事件
				_this.onChange.fire(_this, val);

				//执行菜单项绑定的处理函数
				if (typeof _this.conf.items[+seq][3] == 'function') {
					_this.conf.items[+seq][3].call(_this, _this.conf, this);
				}

				_this.setCaption(val);

				//标注当前选中菜单项class
				//标注当前菜单sel图标
				ve.dom.addClass(this, 'current');

				//移除当前菜单caption active状态
				ve.dom.removeClass(_this.dom,  _this.classPrefix + '_active');

				//隐藏当前整个菜单
				_this.hidePanel();
			});

			//over效果
			var _lastOverItem;
			var hoverClassName = this.classPrefix + '_item_over';
			ve.dom.event.add(listItem, 'mouseover', function(){
				if (_lastOverItem){
					ve.dom.removeClass(_lastOverItem,hoverClassName);
				}
				ve.dom.addClass(this, hoverClassName);
				_lastOverItem = this;
			});

			//over效果
			ve.dom.event.add(listItem, 'mouseout', function(){
				ve.dom.removeClass(this, hoverClassName);
			});
		},

		/**
		 * 隐藏菜单列表
		 **/
		hidePanel: function(){
			this.panel.style.display = 'none';
		},

		/**
		 * 显示菜单列表
		 **/
		showPanel: function(){
			this.panel.style.display = '';
		},

		/**
		 * 显示、隐藏列表+caption
		 * @param {Mix} show 缺省show，生效toggle功能
		 **/
		toggleList: function(show){
			if(this.disabled){
				return;
			}

			show = show === undefined ? this.panel.style.display == 'none' : !!show;

			if(show){
				var pos = ve.dom.getXY(this.dom);
				var size = ve.dom.getSize(this.dom);
				ve.dom.setStyles(this.panel, {
					display:'',
					top: (pos[1]+size[1]) + 'px',
					left: (pos[0]-1) + 'px'
				});
			} else {
				this.panel.style.display = 'none';
			}

			//菜单caption状态
			ve.dom[show ? 'addClass' : 'removeClass'](this.dom, this.classPrefix+'_active');

			//这个方法将在后续版本不再提供支持
			//没有意义哦哦哦哦哦
			if(show){
				this.conf.editor.onBeforeOpenListBox.fire();
			}
			return show;
		},

		/**
		 * 创建菜单列表面板
		 * 同时绑定菜单项的事件
		 **/
		_createListPanel: function(){
			var _this = this;
			var _class = this.classPrefix + ' ' + this.classPrefix+'_list ' + this.classPrefix+'_'+this.conf['class']+'_list';
			var html = '<div style="position:absolute; display:none" class="'+ _class + '" id="' + this.listboxid + '">';

			//title
			if(this.conf.title){
				html += '<div value="-1" class="veList_item_con"><a href="javascript:;" value="-1" class="' + this.classPrefix + 'Title">' + this.conf.title + '</a></div>';
			}

			//item
			ve.lang.each(this.conf.items, function (item, index) {
				html += _this.getListItemHtml(item, index);
			});
			html += '</div>';

			this.panel = ve.dom.insertHTML(document.body, 'beforeend', html);

			//bind item event
			var al = ve.dom.selector('.'+this.classPrefix+'_item_con', this.panel);
			ve.lang.each(al, function (item) {
				_this.bindListItemEvent(item);
			});
		},

		/**
		 * 更新当前菜单选中项、caption显示值
		 * @param {String} val
		 **/
		updateCurrentState: function(val){
			//更新caption
			this.setCaption(val);

			//更新panel
			var al = ve.dom.selector('.'+this.classPrefix+'_item_con', this.panel);
			ve.lang.each(al, function (item) {
				if(item.getAttribute('value') == val){
					ve.dom.addClass(item, 'current');
				} else {
					ve.dom.removeClass(item, 'current');
				}
			});
		},

		/**
		 * 绑定整个菜单的显示、隐藏关联事件
		 */
		bindHandler: function(){
			var t = this,
				_this = this,
				s = t.conf,
				cp = t.classPrefix,
				ed = s.editor,
				uid = this.listboxid,
				isFirstOpen = false;

			var icon = ve.dom.selector('.' + cp + '_downicon', this.dom),
				curr = ve.dom.selector('.' + cp + '_current', this.dom),
				d = ve.dom.get(uid),
				list = ve.dom.selector('.' + cp + '_list', this.dom);

			//caption hover效果
			ve.dom.event.add(this.dom, 'mouseover', function (e) {
				if(!t.disabled){
					ve.dom.addClass(this, cp + '_' + (s['overSuffix'] || 'over'));
					t.onMouseOver.fire();
				}
			});

			//caption hover效果
			ve.dom.event.add(this.dom, 'mouseout', function (e) {
				if(!t.disabled){
					ve.dom.removeClass(this, cp + '_' + (s['overSuffix'] || 'over'), '');
					t.onMouseOut.fire();
				}
			});

			//绑定caption点击显示、点击隐藏菜单事件
			ve.dom.event.add(this.dom, 'click', function(){
				_this.toggleList();
				ve.dom.event.preventDefault();
				return false;
			});

			//点击其他区域，隐藏菜单
			ve.dom.event.add(document, 'click', function(e){
				var tag = ve.dom.event.getTarget(e);
				if(!ve.dom.contains(_this.panel, tag) && !ve.dom.contains(_this.dom, tag)){
					_this.toggleList(false);
				}
			});

			//点击编辑区域，隐藏菜单
			this.conf.editor.onClick.add(function(){
				_this.toggleList(false);
			});
		}
	});
})(VEditor);
(function(ve){
	//遮罩层DOM
	var MASKER_DOM;

	//默认遮罩层样式配置
	var DEF_STYLE_CONFIG = {
		position: 'absolute',
		top: 0,
		left:0,
		width: '100%',
		backgroundColor: 'black',
		zIndex: 8999,
		opacity: 0.5
	};

	/**
	 * 遮罩层
	 * 该对象仅提供单例模式
	 */
	var masklayer = {
		/**
		 * show masklayer
		 * @param {Object} styleConfig 样式配置，支持覆盖所有key
		 */
		show: function(styleConfig){
			if(!MASKER_DOM){
				MASKER_DOM = document.createElement('div');
				document.body.appendChild(MASKER_DOM);
				styleConfig = ve.lang.extend(true, DEF_STYLE_CONFIG, styleConfig || {});
				ve.dom.setStyle(MASKER_DOM, styleConfig);
			}

			var winRegion = ve.dom.getWindowRegion();
			ve.dom.setStyle(MASKER_DOM, 'height',winRegion.documentHeight);
			MASKER_DOM.style.display = '';
		},

		/**
		 * hide masklayer
		 */
		hide: function(){
			if(MASKER_DOM){
				MASKER_DOM.style.display = 'none';
			}
		}
	};
	ve.ui.masklayer = masklayer;
})(VEditor);
(function(ve){
	var POP_STYLECSS = [
		'.PopupDialog {position:absolute; top:20px; left:20px; width:350px; border:1px solid #999; background-color:white; box-shadow:0 0 10px #535658}',
		'.PopupDialog-hd {height:28px; background-color:#f3f3f3; border-bottom:1px solid #E5E5E5; cursor:move; position:relative;}',
		'.PopupDialog-hd h3 {font-size:12px; font-weight:bolder; color:gray; padding-left:10px; line-height:28px;}',
		'.PopupDialog-close {display:block; overflow:hidden; width:28px; height:28px; position:absolute; right:0; top:0; text-align:center; cursor:pointer; font-size:17px; font-family:Verdana; text-decoration:none; color:gray;}',
		'.PopupDialog-close:hover {color:blue}',
		'.PopupDialog-ft {background-color:#f3f3f3; white-space:nowrap; border-top:1px solid #e0e0e0; padding:5px 5px 5px 0; text-align:right;}',
		'.PopupDialog-bd {padding:20px;}',
		'.PopupDialog-bd-frm {border:none; width:100%}',
		'.PopupDialog-btn {display:inline-block; cursor:pointer; box-shadow:1px 1px #fff; text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.7); background:-moz-linear-gradient(19% 75% 90deg, #E0E0E0, #FAFAFA); background:-webkit-gradient(linear, left top, left bottom, from(#FAFAFA), to(#E0E0E0)); color:#4A4A4A; background-color:white; text-decoration:none; padding:0 15px; height:20px; line-height:20px; text-align:center; border:1px solid #ccd4dc; white-space:nowrap; border-radius:2px}',
		'.PopupDialog-btn:hover {background-color:#eee}',
		'.PopupDialog-btnDefault {}'].join('');

	var POP_STYLECSS_INSERTED;
	var GUID = 0;
	var POPUP_COLLECTION = [];
	var ESC_BINDED = false;
	var emptyFn = function(){};

	/**
	 * Popup class
	 * @constructor Popup
	 * @description popup dialog class
	 * @example new ve.ui.Popup(config);
	 * @param {Object} config
	 */
	var Popup = function(cfg){
		this.container = null;
		this.status = 0;
		this.moving = false;
		this._constructReady = emptyFn;
		this._constructed = false;
		this.onShow = emptyFn;
		this.onClose = emptyFn;
		this.guid = 'VEDITOR_POPUP_'+ (++GUID);

		this.config = ve.lang.extend(true, {
			ID_PRE: 'popup-dialog-id-pre',
			title: '对话框',				//标题
			content: '测试',				//content.src content.id
			zIndex: 9000,					//高度
			width: 400,						//宽度
			moveEnable: true,				//框体可移动
			isModal: false,					//模态对话框
			topCloseBtn: true,				//是否显示顶部关闭按钮,如果显示顶部关闭按钮，则支持ESC关闭窗口行为
			showMask: true,
			keepWhileHide: false,			//是否在隐藏的时候保留对象
			cssClass: {
				dialog: 'PopupDialog',
				head: 'PopupDialog-hd',
				body: 'PopupDialog-bd',
				iframe: 'PopupDialog-bd-frm',
				container: 'PopupDialog-dom-ctn',
				foot: 'PopupDialog-ft'
			},
			buttons: [/*
				{name:'确定', handler:null},
				{name:'关闭', handler:null, setDefault:true}*/
			],
			sender: emptyFn,	//data sender interface
			reciver: emptyFn	//data reciver interface
		}, cfg);

		this.constructStruct();

		//ADD TO MONITER COLLECTION
		POPUP_COLLECTION.push(this);
	};

	/**
	 * contruct popup structure
	 */
	Popup.prototype.constructStruct = function(){
		var _this = this;

		//DOM Clone Mode
		if(!this.container){
			this.container = document.createElement('div');
			document.body.appendChild(this.container);
			ve.dom.addClass(this.container, this.config.cssClass.dialog);
			ve.dom.setStyle(this.container, 'left', '-9999px');

		}
		this.container.id = this.config.ID_PRE + Math.random();

		//构建内容容器
		var content = '';
		if(typeof(this.config.content) == 'string'){
			content = '<div class="'+this.config.cssClass.body+'"'+(this.config.height ? ' style="height:'+this.config.height+'px"':'')+'>'+this.config.content+'</div>';
		} else if(this.config.content.src){
			content = '<iframe allowtransparency="true" guid="'+this.guid+'" src="'+this.config.content.src+'" class="'+this.config.cssClass.iframe+'" frameborder=0'+(this.config.height ? ' style="height:'+this.config.height+'px"':'')+'></iframe>';
		} else {
			content = '<div class="' + this.config.cssClass.container + '"'+(this.config.height ? ' style="height:'+this.config.height+'px"':'')+'></div>';
		}

		//构建按钮
		var btn_html = '';
		if(this.config.buttons.length > 0){
			var btn_html = '<div class="'+this.config.cssClass.foot+'">';
			for(var i=0; i<this.config.buttons.length; i++){
				btn_html += '&nbsp;<a href="javascript:;" class="PopupDialog-btn'+(this.config.buttons[i].setDefault?' PopupDialog-btnDefault':'')+'">'+this.config.buttons[i].name+'</a>';
			}
			btn_html += '</div>';
		}

		//构建对话框框架
		var html = ([
				'<div class="PopupDialog-wrap">',
					'<div class="PopupDialog-Modal-Mask" style="position:absolute; height:0px; overflow:hidden; z-index:2; background-color:#ccc; width:100%"></div>',
					'<div class="',this.config.cssClass.head+'">',
						'<h3>',this.config.title,'</h3>',
						(this.config.topCloseBtn ? '<a class="PopupDialog-close" href="javascript:;" title="关闭窗口">x</a>' : ''),
					'</div>',content,btn_html,
				'</div>'
			]).join('');
		this.container.innerHTML = html;

		if(this.config.content.src){
			var iframe = this.container.getElementsByTagName('iframe')[0];
			ve.dom.event.add(iframe, 'load', function(){
				try {
					var ifr = this;
					var w = ifr.contentWindow;
					var d = w.document;
					var b = w.document.body;
					w.focus();
				} catch(ex){
					console.log(ex);
				}

				//Iframe+无指定固定宽高时 需要重新刷新size
				if(!_this.config.height && b){
					b.style.overflow = 'hidden';

					var info = {};
					if(w.innerWidth){
						//info.visibleWidth = w.innerWidth;
						info.visibleHeight = w.innerHeight;
					} else {
						var tag = (d.documentElement && d.documentElement.clientWidth) ?
							d.documentElement : d.body;
						//info.visibleWidth = tag.clientWidth;
						info.visibleHeight = tag.clientHeight;
					}
					var tag = (d.documentElement && d.documentElement.scrollWidth) ?
							d.documentElement : d.body;
					//info.documentWidth = Math.max(tag.scrollWidth, info.visibleWidth);
					info.documentHeight = Math.max(tag.scrollHeight, info.visibleHeight);

					//this.parentNode.parentNode.style.width = info.documentWidth + 'px';
					//w.frameElement.style.width = info.documentWidth + 'px';
					ifr.style.height = info.documentHeight + 'px';
					ve.dom.setStyle(_this.container, 'height', 'auto');
				}
				_this._constructed = true;
				_this._constructReady();
			});
		} else {
			//移动ID绑定模式的DOM对象【注意：这里移动之后，原来的元素就被删除了，为了做唯一性，这里只能这么干】
			if(this.config.content.id){
				ve.dom.get('#'+this.config.content.id).style.display = '';
				ve.dom.selector('div.'+this.config.cssClass.container)[0].appendChild(Y.dom.get('#'+this.config.content.id));
			}
			_this._constructed = true;
			this._constructReady();
		}
	};

	/**
	 * get dom
	 * @return {DOM}
	 */
	Popup.prototype.getDom = function() {
		return this.container;
	};

	/**
	 * show popup
	 */
	Popup.prototype.show = function(){
		var _this = this;

		if(!POP_STYLECSS_INSERTED){
			POP_STYLECSS_INSERTED = true;
			ve.dom.insertStyleSheet('VEDITOR_POPUP_CSS', POP_STYLECSS);
		}

		if(!this._constructed){
			this._constructReady = function(){
				_this.show();
			};
			return;
		}

		//CREATE MASK
		if(this.config.showMask){
			ve.ui.masklayer.show();
		}

		this.container.style.display = '';

		//CACULATE REGION INFO
		var region = ve.lang.extend(true, ve.dom.getRegion(this.container), this.config);
			region.minHeight = region.minHeight || 78;

		var scrollLeft = ve.dom.getScrollLeft(),
			scrollTop = ve.dom.getScrollTop(),
			winRegion = ve.dom.getWindowRegion(),
			top = left = 0;

		if(winRegion.visibleHeight > region.height){
			top = scrollTop + (winRegion.visibleHeight - region.height)/4;
		} else if(winRegion.documentHeight > region.height){
			top = scrollTop;
		}

		if(winRegion.visibleWidth > region.width){
			left = winRegion.visibleWidth/2 - region.width/2 - scrollLeft;
		} else if(winRegion.documentWidth > region.width){
			left = scrollLeft;
		}
		var calStyle = ve.lang.extend(true, region,{left:left,top:top,zIndex:this.config.zIndex});
		ve.dom.setStyles(this.container, calStyle);

		this.onShow();
		this.status = 1;
		this.bindEvent();
		this.bindMoveEvent();
		this.bindEscCloseEvent();

		var hasOtherModalPanel = false;
		var _this = this;

		ve.lang.each(POPUP_COLLECTION, function(dialog){
			//有其他的模态对话框
			//调低当前对话框的z-index
			if(dialog != _this && dialog.status && dialog.config.isModal){
				_this.config.zIndex = dialog.config.zIndex - 1;
				hasOtherModalPanel = true;
				return false;
			} else if(_this != dialog && dialog.status && !dialog.config.isModal){
				if(dialog.config.zIndex > _this.config.zIndex){
					_this.config.zIndex = dialog.config.zIndex + 1;
				} else if(dialog.config.zIndex == _this.config.zIndex){
					_this.config.zIndex += 1;
				}
			}
		});

		ve.dom.setStyle(this.container, 'zIndex', this.config.zIndex);
		if(hasOtherModalPanel){
			this.setDisable();
		} else if(_this.config.isModal){
			//设置除了当前模态对话框的其他对话框所有都为disable
			ve.lang.each(POPUP_COLLECTION, function(dialog){
				if(dialog != _this && dialog.status){
					dialog.setDisable();
				}
			});
		}
	};

	/**
	 * set dialog operate enable
	 **/
	Popup.prototype.setEnable = function() {
		var mask = ve.dom.selector('.PopupDialog-Modal-Mask', this.container)[0];
		if(mask){
			mask.style.display = 'none';
		}
	};

	/**
	 * set dialog operate disable
	 **/
	Popup.prototype.setDisable = function() {
		var size = ve.dom.getSize(this.container);
		var mask = ve.dom.selector('.PopupDialog-Modal-Mask', this.container)[0];
		ve.dom.setStyles(mask, {height:size[1], opacity:0.4});
	};

	/**
	 * bind popup event
	 */
	Popup.prototype.bindEvent = function(){
		var _this = this;
		var topCloseBtn = ve.dom.selector('a.PopupDialog-close', this.container)[0];
		if(topCloseBtn){
			topCloseBtn.onclick = function(){
				_this.close();
			};
		}

		ve.lang.each(ve.dom.selector('a.PopupDialog-btn'), function(btn, i){
			ve.dom.event.add(btn, 'click,', function(){
				if(_this.config.buttons[i].handler){
					_this.config.buttons[i].handler.apply(this, arguments);
				} else {
					_this.close();
				}
			})
		});

		var defBtn = ve.dom.selector('a.PopupDialog-btnDefault')[0];
		if(defBtn){
			defBtn.focus();
		}

		var _this = this;
		ve.dom.event.add(this.container, 'mousedown', function(){_this.updateZindex();});
	}

	/**
	 * update dialog panel z-index property
	 **/
	Popup.prototype.updateZindex = function() {
		var _this = this;
		var hasModalPanel = false;
		ve.lang.each(POPUP_COLLECTION, function(dialog){
			if(dialog != _this && dialog.status && dialog.config.isModal){
				hasModalPanel = true;
				return false;
			} else if(dialog != _this && dialog.status){
				if(dialog.config.zIndex >= _this.config.zIndex){
					_this.config.zIndex = dialog.config.zIndex + 1;
				}
			}
		});
		if(hasModalPanel){
			return;
		}
		ve.dom.setStyle(this.container, 'zIndex', this.config.zIndex);
	}

	/**
	 * bind ESC close event
	 */
	Popup.prototype.bindEscCloseEvent = function(){
		if(ESC_BINDED){
			return;
		}
		ESC_BINDED = true;

		var _this = this;
		ve.dom.event.add(document, 'keyup', function(e){
			if(e.keyCode == ve.dom.event.KEYS.ESC){
				var lastDialog = null;
				ve.lang.each(POPUP_COLLECTION, function(dialog){
					if(dialog.config.isModal && dialog.status && dialog.config.topCloseBtn){
						lastDialog = dialog;
						return false;
					} else if(dialog.status && dialog.config.topCloseBtn){
						if(!lastDialog || lastDialog.config.zIndex <= dialog.config.zIndex){
							lastDialog = dialog;
						}
					}
				});
				if(lastDialog){
					lastDialog.close();
				}
			}
		});
	}

	/**
	 * bind popup moving event
	 */
	Popup.prototype.bindMoveEvent = function(){
		if(!this.config.moveEnable){
			return;
		}
		var _this = this;
		var head = ve.dom.selector('.'+this.config.cssClass.head, this.container)[0];

		ve.dom.event.add(document, 'mousedown', function(e){
			var tag = ve.dom.event.getTarget();
			if(!head || !(tag == head || ve.dom.contains(head, tag))){
				return;
			}

			_this.moving = false;

			if((ve.ua.ie && (e.button == 1 || e.button == 0)) || e.button == 0){
				_this.moving = true;
			}

			if(_this.moving && (e.button == 1 || e.button == 0)){
				var conRegion = ve.dom.getRegion(_this.container);
				px = parseInt(e.clientX - conRegion.left);
				py = parseInt(e.clientY - conRegion.top);

				ve.dom.event.add(document, 'mousemove', function(e2){
					if(!_this.moving || ve.dom.event.getButton(e2) !== 0){
						return false;
					}
					e2 = e2 || window.event;
					var newLeft = e2.clientX - px,
						newTop = e2.clientY - py;
					newTop = newTop >= 0 ? newTop : 0;	//限制对话框不能被拖出窗口
					ve.dom.setStyles(_this.container, {top:newTop,left:newLeft});
				});
			}
			ve.dom.event.preventDefault();
			return false;
		});
		ve.dom.event.add(document, 'mouseup', function(){
			_this.moving = false;
		});
	}

	/**
	 * close current popup
	 */
	Popup.prototype.close = function(){
		if(this.onClose() === false || !this.container){
			return;
		}
		this.container.style.display = 'none';
		this.status = 0;

		var _this = this,
			hasDialogLeft = false,
			hasModalPanelLeft = false;

		ve.lang.each(POPUP_COLLECTION, function(dialog){
			if(dialog.status){
				hasDialogLeft = true;
			}
			if(dialog.status && dialog.config.isModal){
				hasModalPanelLeft = true;
				dialog.setEnable();
				return false;
			}
		});

		//没有显示的对话框
		if(!hasDialogLeft){
			ve.ui.masklayer.hide();
		}

		//剩下的都是普通对话框
		if(!hasModalPanelLeft){
			ve.lang.each(POPUP_COLLECTION, function(dialog){
				dialog.setEnable();
			});
		}

		if(!this.config.keepWhileHide){
			var tmp = [];
			ve.lang.each(POPUP_COLLECTION, function(dialog){
				if(dialog != _this){
					tmp.push(dialog);
				}
			});

			POPUP_COLLECTION = tmp;
			_this.container.parentNode.removeChild(_this.container);
			_this.container = null;
			_this = null;
		}
	};

	/**
	 * 关闭其他窗口
	 **/
	Popup.prototype.closeOther = function(){
		try {
			var _this = this;
			ve.lang.each(POPUP_COLLECTION, function(pop){
				if(pop != _this){
					pop.close();
				}
			});
		}catch(e){}
	};

	/**
	 * close all popup
	 * @see Popup#close
	 */
	Popup.closeAll = function(){
		ve.lang.each(POPUP_COLLECTION, function(pop){
			pop.close();
		});
	};

	/**
	 * resize current popup
	 * @deprecated only take effect in iframe mode
	 */
	Popup.resizeCurrentPopup = function(){
		if(!window.frameElement){
			return;
		}

		ve.dom.event.add(window, 'load', function(){
			var wr = ve.dom.getWindowRegion();
			document.body.style.overflow = 'hidden';
			window.frameElement.style.height = wr.documentHeight +'px';
		});
	};

	/**
	 * search popup by guid
	 * @param  {String} guid
	 * @return {Popup}
	 */
	Popup.getPopupByGuid = function(guid){
		var result;
		ve.lang.each(POPUP_COLLECTION, function(pop){
			if(pop.guid == guid){
				result = pop;
				return false;
			}
		});
		return result;
	};

	ve.ui.Popup = Popup;

	/**
	 * 显示popup
	 * @param  {String} title  标题
	 * @param  {Mix} source 来源
	 * @param  {Number} width  宽度
	 * @param  {Number} height 高度
	 * @return {Object}
	 */
	ve.ui.showPopup = function(title, source, width, height){
		var pop = new ve.ui.Popup({
			title:title,
			content: source,
			width: width,
			height: height
		});
		pop.show();
		return pop;
	};

	/**
	 * 关闭Popup
	 * @param  {Number} guid
	 */
	ve.ui.closePopup = function(guid){
		if(guid){
			var pop = Popup.getPopupByGuid(guid);
			pop.close();
		} else {
			Popup.closeAll();
		}
		if(top.popupCallback){
			top.popupCallback();
		}
	};

	/**
	 * 兼容QZFL··将就
	 * @param  {Function} fn
	 */
	ve.ui.appendPopupFn = function(fn){
		top.popupCallback = fn;
	}
})(VEditor);
(function(ve) {
	var GUID = 1;
	ve.lang.Class('VEditor.ui.SimplePopup', {
		SimplePopup: function (ed, el, s) {
			var t = this;
			this.editor = ed;
			this.el = el;
			this.conf = ve.lang.extend({
				src: '',
				content: '',
				width: '300px',
				canClose: true,
				height: '200px'
			}, s || {});
			this.d = this._renderDOM();
		},

		/**
		 *  显示popup
		 * @param {Object} s 样式配置
		 */
		show: function(s) {
			if(s){
				ve.dom.setStyles(this.d, s);
			}
			this.d.style.display = 'block';
		},

		/**
		 * 隐藏popup
		 */
		hide: function () {
			this.d.style.display = 'none';
		},

		/**
		 * 获取当前popup DOM
		 */
		getDom: function(){
			return this.d;
		},

		/**
		 * 渲染DOM结构
		 */
		_renderDOM: function () {
			var t = this, str, attrs,
				id = 'qzonesimplepopup_' + (GUID++), html;
			var top = 0; left = 0;
			if(t.el){
				elpos = ve.dom.getXY(t.el);
				elsize = ve.dom.getSize(t.el);
				top = elpos[1] + elsize[1];
				left = elpos[0];
			}

			attrs = {
				'class': 'simplepopupcon',
				'id': id,
				style: {position: 'absolute', left:left, top:top, width:t.conf.width, height:t.conf.height, display:'none'}
			};
			if (t.conf.canClose) {
				html = '<div class="close_con"><a href="#" class="close_icon">x</a></div>';
			}
			if (t.conf.src) {
				html += '<div class="iframe_con"><iframe src="' + t.conf.src + '" width="' + t.conf.width + '" height="' + t.conf.height + '" frameborder="0"></iframe></div>';
			}
			else if (t.conf.content){
				html += '<div class="content_con">' + t.conf.content + '</div>';
			}
			var popup = ve.dom.create('div', attrs, html);
			ve.dom.event.add(popup, 'click', function(e) {
				ve.dom.event.preventDefault(e);
				return false;
			});
			document.body.appendChild(popup);
			var icons = ve.dom.find('#' + id + ' a.close_icon');
			ve.lang.each(icons, function(icon){
				ve.dom.event.add(icon, 'click', function(e){
					t.hide();
					ve.dom.event.preventDefault(e);
					return false;
				});
			});
			ve.dom.event.add(document.body,'keydown', function(e){
				var e = e || window.event;
				if(e.keyCode == 0x1B){
					t.hide();
					ve.dom.event.preventDefault(e);
				}
			});
			return popup;
		}
	});

	ve.ui.showSimplePopup = function(ed, el, conf) {
		return new VEditor.ui.SimplePopup(ed, el, conf);
	}
})(VEditor);
