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

		ERROR: {
			CRASH: 999,
			NET_RESOURCE: 999
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

			//这里通过timeout来强制某些浏览器初始化核心的时候采用了同步方式初始化，
			//导致外部逻辑代码（形如：var ed = VE.create(); ed.onInitComplete.add()）事件绑定失效
			//正规做法应该是 var ed = new VE(); ed.init(); 当前create方法两步都做了，因此这里需要强制异步
			setTimeout(function(){
				try {
					console.log('VE init start');
					editor.init();
				} catch(ex){
					editor.exception(ex.toString(), (ex['code'] || VEditor.ERROR.CRASH), ex['data'], true);
				}
			},0);

			return editor;
		}
	};

	//占用命名空间
	//@deprecate 这里由于旧版的使用的命名空间为veEditor，所以暂时适配
	window.veEditor = window.VEditor = VEditor;

	//统计，不需要的开发同学可以注释掉
	setTimeout(function(){
		var img = new Image();
		var h = location.hostname.replace(/\./g, '_');
		img.src = 'http://pinghot.qq.com/pingd?dm=blog.qzone.qq.com.hot&url=/BlogEditer&tt=-&hottag=BlogEditer.veditorpv.'+h+'&hotx=9999&hoty=9999&adtag=-&rand='+Math.random()
	}, 5000);
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

		/**
		 * 等比缩放
		 * @param  {Number} width     当前宽度
		 * @param  {Number} height    当前高度
		 * @param  {Number} maxWidth  最大宽度
		 * @param  {Number} maxHeight 最大高度
		 * @return {Array}           [宽度，高度]
		 */
		resize: function(width, height, maxWidth, maxHeight){
			var w,h;
			if(!maxWidth){
				h = Math.min(height, maxHeight);
				w = (h/height)*width;
			}
			else if(!maxHeight){
				w = Math.min(width, maxWidth);
				h = (w/width)*height;
			}
			else {
				var r1 = height/width, r2 = maxHeight/maxWidth;
				if(r1 > r2){
					h = Math.min(height, maxHeight);
					w = width*h/height;
				} else {
					w = Math.min(width, maxWidth);
					h = height*w/width;
				}
			}
			w = parseInt(w, 10);
			h = parseInt(h, 10);
			return [w,h];
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
		contains: function(container, child){
			if(container.nodeType == 3){return false;}
			return container.contains ? container != child && container.contains(child) :
				!!(container.compareDocumentPosition(child) & 16);
		},
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
		 * 加载图片队列
		 * @param {Array} imgSrcList
		 * @param {Function} doneCb	完成回调（包括失败）
		 **/
		loadImageQueue: function(imgSrcList, doneCb){
			var len = imgSrcList.length;
			var count = 0;
			var infoList = {};

			var allDone = function(){
				var result = [];
				ve.lang.each(imgSrcList, function(item, index){
					result.push(infoList[item]);
				});
				doneCb(result);
			};

			ve.lang.each(imgSrcList, function(src){
				infoList[src] = {width:null, height:null, src:src};
				var img = new Image();
				img.onload = function(){
					infoList[this.src] = {width: this.width, height: this.height, src:this.src};
					if(++count == len){
						allDone();
					}
				};
				img.onerror = function(){
					if(++count == len){
						allDone();
					}
				};
				img.src = src;
			});
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
			if(ve.ua.ie && s.readyState != 'loaded' && s.readyState != 'complete' && ve.ua.ie != 11){
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
		(doc.getElementsByTagName('head')[0] || doc.body).appendChild(s);
		s.src = option.src;
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

	var getParameter = function(name, str){
		var r = new RegExp("(\\?|#|&)" + name + "=([^&#]*)(&|#|$)");
		var m = (str || location.href).match(r);
		return (!m?"":m[2]);
	};

	ve.net.getParameter = getParameter;
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
(function(ve) {
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

			//启动事件
			t.__startup_time__ = (new Date()).getTime();

			//快捷键map
			t._shortcuts = [];

			//IO 接口
			t._ios = {};

			//正在使用输入法（非英文）状态
			t.usingIM = false;

			//配置
			t.conf = ve.lang.extend({
				plugins: '',					//插件列表（格式参考具体代码）

				container: '',					//容器，该配置项与下方三个容器互斥，如果container为一个textarea元素的话， 下方的3个容器为container父元素

				toolbarContainer: '',			//工具条容器!
				iframeContainer: '',			//iframe容器!	如果设置iframe为textarea，则iframeContainer取该textarea父容器，并关联该textarea
				statusbarContainer: '',			//状态条容器

				relateContainer: '',			//关联容器（支持textarea或可编辑div等），这里只是单向关联，编辑器数据变化会更新该容器，反之，该容器变化不会更新到编辑器

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

			ve.lang.each(['toolbarContainer','statusbarContainer', 'relateContainer', 'iframeContainer', 'container'], function(n) {
				if(t.conf[n]){
					t.conf[n] = ve.dom.get(t.conf[n]);
				}
			});

			//支持 单个表单形式
			if(t.conf.container){
				if(t.conf.container.tagName == 'TEXTAREA'){
					t.conf.relateContainer = t.conf.container;
					t.conf.container = t.conf.container.parentNode;
				}
				t.conf.toolbarContainer = t.conf.iframeContainer = t.conf.statusbarContainer = t.conf.container;
			}

			//支持指定表单作为内容区域形式
			if(t.conf.iframeContainer.tagName == 'TEXTAREA'){
				t.conf.relateContainer = t.conf.iframeContainer;
				t.conf.iframeContainer = t.conf.iframeContainer.parentNode;
			}

			//指定状态条
			t.conf.statusbarContainer = t.conf.statusbarContainer || t.conf.iframeContainer;

			if(!t.conf.toolbarContainer || !t.conf.iframeContainer){
				throw('NEED CONTAINER SPECIFIED');
			}

			//关联textarea
			if(t.conf.relateContainer){
				t.conf.placeholder = t.conf.placeholder || t.conf.relateContainer.getAttribute('placeholder');
			}

			//copy容器到editor下
			ve.lang.each(['toolbarContainer','statusbarContainer', 'relateContainer', 'iframeContainer', 'container'], function(n){
				t[n] = t.conf[n];
			});

			//触发事件
			ve.lang.each([
				'onSelect',					//选区选择
				'onKeyPress',				//按键按下
				'onKeyDown',				//按键按下
				'onKeyUp',					//按键松开
				'onMouseOver',				//鼠标over
				'onMouseDown',				//鼠标按下
				'onMouseUp',				//鼠标松开
				'onClick',					//点击
				'onPaste',					//粘贴事件（支持中断）
				'onAfterPaste',				//粘贴之后

				'onSelectContent',			//选择内容
				'onBlur',					//失焦
				'onFocus',					//聚焦
				'onBeforeOpenListBox',		//菜单打开
				'onResize',					//调整大小

				'onBeforeGetContent',		//获取内容之前
				'onGetContent',				//获取内容（支持中断）
				'onBeforeSetContent',		//设置内容之前
				'onSetContent',				//设置内容（支持中断）
				'onAfterSetContent',		//设置内容之后
				'onAfterClearContent',		//清除内容之后

				'onPluginsInited',			//插件初始化完成
				'onIframeInited',			//iframe初始化完成
				'onInitComplete',			//初始化完成

				'onBeforeExecCommand',		//执行命令之前
				'onAfterExecCommand',		//执行命令之后
				'onAfterUpdateVERange',		//更新Range之后
				'onAfterUpdateVERangeLazy',	//更新Range懒惰触发事件

				'onError'],					//报错
				function(n) {
				t[n] = new ve.EventManager(t);
			});
		},

		/**
		 * 加载额外的文件，包括适配器、视图、插件
		 * @param {function} callback
		 **/
		_loadExtFiles: function(callback) {
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

			console.log('VE _loadExtFiles:', fileList);
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
					} else {
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
				console.log('VE init --> no ext files loaded');
				t._loadExtFiles(function(){
					EXT_FILES_LOADED = true;
					console.log('VE init --> ext files loaded');
					t.init();
				});
				return;
			}

			console.log('VE view get');
			//初始化视图管理器
			var view = ve.viewManager.get(this.conf.viewer);
			if (!view){
				throw('NO VIEWER FOUND');
			}
			this.viewControl = new view();
			this.viewControl.init(this, this.conf.viewerurl || this.conf.viewer);
			this.editorcommands = new ve.EditorCommands(this);


			//渲染toolbar放入核心加载成功之后，
			//避免核心初始化失败，还存在工具条的情况
			var _crashed, _loading = true;
			this.onError.add(function(msg, code){
				console.log('VE onError', msg, code);
				if(code == VEditor.ERROR.CRASH){
					_crashed = true;
				}
			});

			//使用表单提交数据
			//这里只能处理换行情况，其他的处理不了，因为如果处理，就意味着html标记信息将被丢失
			if(t.conf.relateContainer){
				console.log('VE relateContainer setted');
				var _isTextarea = t.conf.relateContainer.tagName == 'TEXTAREA';
				var _set = function(html){
					if(_isTextarea){
						t.conf.relateContainer.value = _toStr(html);
					} else {
						t.conf.relateContainer.innerHTML = html;
					}
				};
				var _get = function(){
					if(_isTextarea){
						return _toHtml(t.conf.relateContainer.value);
					} else {
						return t.conf.relateContainer.innerHTML;
					}
				};
				var _toStr = function(html){
					return html.replace(/<br[^>]*>/g, "\r\n");
				};
				var _toHtml = function(str){
					return str.replace(/\r\n/g, "\n").replace(/\n/g, '<br/>');
				};

				this.onInitComplete.addFirst(function(){
					_loading = false;
					var s = _get();
					if(s){
						t.setContent({content:s});
					}
				});
				this.onAfterUpdateVERangeLazy.add(function(){_set(t.getContent());});
				this.onSetContent.add(function(html){_set(html);});
				this.onGetContent.addLast(function(html){
					if(_crashed || _loading){
						html = _get();
					}
					return html;
				}, true);
			}

			console.log('VE base layout render');
			//渲染布局
			this.viewControl.renderBaseLayout();

			//未崩溃情况下，才进行插件初始化、工具条渲染等操作
			this.onIframeInited.add(function(){
				if(!_crashed){
					t._bindEditorDomEvent();

					//启动插件，这样插件里面的初始化方法可以提供按钮
					t._launchPlugins();

					//渲染工具条（按钮）
					t.viewControl.renderToolbar();
				}
			});

			//创建iframe
			this._createIframe();

			if (!ve.ua.ie || !this.conf.domain){
				this._initIframe();
			}

			if(this._iframeInited){
				//console.log('主脚本检测到t._iframeInited, 执行t._fireInitComplete');
				this._fireInitComplete();
			} else {
				//console.log('主脚本检测到iframe还没有加载完');
				this._needFireInitCompleteInInitIframe = true;
			}
			return this;
		},

		/**
		 * 读取编辑器配置
		 * @param  {String} key
		 * @param  {String} scope 上下文，可以用插件名称来规避冲突
		 * @return {Mix}
		 */
		getConfig: function(key, scope){
			if(scope){
				if(!this.conf[scope]){
					return undefined;
				}
				return this.conf[scope][key];
			}
			return this.conf[key];
		},

		/**
		 * 设置配置
		 * @param  {String} key
		 * @param  {String} val
		 * @param  {String} scope 上下文，可以用插件名称来规避冲突
		 */
		setConfig: function(key, val, scope){
			if(scope){
				if(!this.conf[scope]){
					this.conf[scope] = {};
				}
				this.conf[scope][key] = val;
			}
			this.conf[key] = val;
		},

		/**
		 * 异常处理
		 * @param  {String} msg		异常message
		 * @param  {String} code 	异常code
 		 * @param  {Mix} data		数据
		 */
		exception: function(msg, code, data){
			var s = new String(msg);
			s.code = code;
			s.data = data;
			this.onError.fire(this, msg, code, data);
			window.console && window.console.log(msg, code, data);
		},

		/**
		 * 创建编辑器iframe
		 * @deprecate 这里区分了domain情况和对ie等浏览器兼容处理
		 **/
		_createIframe: function(){
			console.log('VE start create IFRAME');
			var _this = this;
			this.iframeHTML = (ve.ua.ie && ve.ua.ie < 9 ? '': '<!DOCTYPE html>');
			this.iframeHTML += '<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />';


			console.log('VE config domain:', this.conf.domain);
			//设置了domain
			var frameUrl = 'javascript:;';
			if (this.conf.domain) {
				if (ve.ua.ie){
					frameUrl = 'javascript:(function(){document.open();document.domain="' + this.conf.domain + '";var ed = window.parent.VEditor.get("' + this.id + '");document.write(ed.iframeHTML);document.close();ed._initIframe();})()';
				}
				this.iframeHTML += '<script type="text/javascript">document.domain = "' + this.conf.domain + '";</script>';
			}
			this.iframeHTML += '</head><body></body></html>';

			console.log('VE frameUrl:', frameUrl);
			console.log('VE iframeHTML:', this.iframeHTML);

			//创建<iframe>
			this.iframeElement = ve.dom.create('iframe', {
				id: this.id + '_Iframe',
				//src: frameUrl,
				frameBorder: '0',
				allowTransparency: 'true',
				style: {
					width: '100%',
					height: this.conf.height ? this.conf.height+'px' : 'auto'
				}
			});
			var icWrap = ve.dom.create('div', {'class': 'veIframeContainer editor_iframe_container_' + this.id, 'style': {width: this.conf.width}});
			icWrap.appendChild(this.iframeElement);
			this.iframeContainer.appendChild(icWrap);
			this.iframeElement.src = frameUrl;

			//this.iframeElement.src = '';
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
					var tm = (new Date().getTime()) - t.__startup_time__;
					t.onInitComplete.fire(t, t, tm);
				}, 0);
			}
		},

		//是否需要在initIframe里面执行initComplete事件
		_needFireInitCompleteInInitIframe: false,
		_iframeInited: false,
		_initIframe: function () {
			console.log('VE _iframeInited');
			if(this._iframeInited){
				return;
			}
			var t = this, doc;

			try {
				console.log('VE start to open doc');
				doc = this.getDoc();

				//[chrome] 关闭该选项会导致app页面有时候不触发window.unload事件
				//估计旧版的chrome不会有这个问题
				doc.open();
				doc.write(this.iframeHTML);
				doc.close();

				if(ve.ua.ie){
	                doc.body.disabled = true;
	                doc.body.contentEditable = true;
	                doc.body.disabled = false;
				} else {
					doc.body.contentEditable = true;
	                doc.body.spellcheck = false;
				}

				console.log('VE doc opened');

				if(this.conf.height){
					doc.body.style.height = this.conf.height + 'px';
				}
				if (this.conf.styleWithCSS) {
					try {
						doc.execCommand("styleWithCSS", 0, true);
					} catch (e) {
						try {
							doc.execCommand("useCSS", 0, true);
						} catch (e) {}
					}
				}
				if(this.conf.editorCss){
					ve.dom.insertStyleSheet(null, this.conf.editorCss, doc);
				}
				doc.body.innerHTML = this.conf.placeholder || this.getEmptyHelperHtml();
			} catch(ex){
				t.exception('iframe没有访问权限', VEditor.ERROR.CRASH);
			}

			console.log('VE iframe inited');

			this._iframeInited = true;
			this.onIframeInited.fire(this.iframeElement);	//iframe初始化完成

			if(this._needFireInitCompleteInInitIframe){
				this._fireInitComplete();
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
			} else if(this.hasCommand(cmd)){
				fn = function(){
					_this.execCommand(cmd, false);
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
				this.getWin().focus();
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
			this.execCommand('insertHtml', params.content);
		},

		/**
		 * 插图
		 * @deprecated 如果提供最大宽度或高度，图片将按照等比方式压缩
		 * @param  {Object} imgData   图片属性信息 imgData.src 为必须内容
		 * @param  {Number} maxWidth  最大宽度
		 * @param  {Number} maxHeight 最大高度
		 * @param {Function} callback 图片插入完成回调
		 */
		insertImage: function(imgData, maxWidth, maxHeight, callback){
			var _this = this;
			var _ins = function(data){
				var html = '', attrs = [];
				for(var i in data){
					attrs.push(i+'="'+data[i]+'"');
				}
				html = attrs.join(' ');
				_this.insertHtml({content:'<img '+html+'/>'});
				setTimeout(function(){
					_this.resize();
					callback && callback();
				}, 10);
			};

			if((maxWidth || maxHeight) && !(imgData.width || imgData.height)){
				ve.dom.loadImageQueue([imgData.src], function(itemList){
					var reg = ve.lang.resize(itemList[0].width, itemList[0].height, maxWidth, maxHeight);
					imgData.width = reg[0];
					imgData.height = reg[1];
					_ins(imgData);
				});
			} else {
				_ins(imgData);
			}
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
			html = this.onGetContent.fire(this, html) || '';
			html = html.replace(ve.fillCharReg, '') || '';
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

			if(s.parentNode && s.nodeType == 1){
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
			} else if(s.parentNode &&s.nodeType == 3){
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
		_bindEditorDomEvent: function () {
			var t = this, w = t.getWin(), d = t.getDoc(), b = t.getBody();

			//输入法keyCode监测
			var IMK_MAP = {
				229: true, //mac safari, ie9 chrome
				231: true,
				197: true,	//opera
				0: (ve.ua.firefox ? true: false)
			};

			//输入法检测
			ve.dom.event.add(b, 'keydown', function(e){
				t.usingIM = !!IMK_MAP[e.keyCode];
			});

			ve.dom.event.add(b, 'mousedown', function(){
				t.usingIM = false;
			});

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
				else if(!e.ctrlKey && e.keyCode != 17 && !t.usingIM && !e.shiftKey){
					t.updateLastVERange();
				}
			});

			//更新VERange
			//粘贴后
			t.onAfterPaste.addFirst(function(){
				t.updateLastVERange();
			});

			//执行命令之前，检测当前是否还在输入法状态
			t.onBeforeExecCommand.addFirst(function(){
				if(t.usingIM){
					t.updateLastVERange();
					t.usingIM = false;
				}
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
})(VEditor);
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
			ve.lang.each(['addCommand','removeCommand','hasCommand','execCommand'], function(method){
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
				if(!start || !start.parentNode || !start.parentNode.outerHTML){
					console.log('哎呀，错误发生了，有人在不断的搞焦点');
					return;
				}

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
					t.conf.editor.execCommand(t.conf.cmd);
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
/**
 * default viewer
 */
(function(ve) {
	ve.lang.Class('VEditor.Editor.Def: VEditor.ViewControler', {
		/**
		 * 初始化
		 * @param {Object} editor
		 * @param {String} url
		 **/
		init: function (editor, url) {
			var t = this;
			t.editor = editor;
			t.editor.onInitComplete.add(function() {
				ve.net.loadCss({
					href: ve.getAbsPath('view/' + t.editor.conf.viewer + '/css/content.css'),
					win: t.editor.getWin()
				});
				if(t.editor.conf.contentCSS) {
					ve.net.loadCss({
						href: t.editor.conf.contentCSS,
						win: t.editor.getWin()
					});
				}
			});
			ve.net.loadCss(ve.getAbsPath('view/' + t.editor.conf.viewer + '/css/global.css'));
		},

		/**
		 * 渲染布局
		 * 包括：处理工具条、处理状态条容器、新建tm
		**/
		renderBaseLayout: function(){
			var editor = this.editor;
			editor.toolbarManager = new ve.ui.ToolbarManager(editor, {name: 'default'});

			var tc = editor.toolbarManager.createContainer({'class':'veToolbarContainer editor_toolbar_container_' + editor.id, 'style': {'overflow':'hidden'}});
			editor.toolbarContainer.appendChild(tc);
			editor.toolbarContainer = tc;

			var sc = ve.dom.create('div', {'class': 'veStatusbarContainer editor_statusbar_container_' + editor.id, 'style': {'overflow':'hidden'}});
			editor.statusbarContainer.appendChild(sc);
			editor.statusbarContainer = sc;
		},

		/**
		 * 渲染工具条
		**/
		renderToolbar: function () {
			var t = this, tm = t.editor.toolbarManager, tb, btns = t.editor.conf.buttons;
			var buttonConfig = [];
			if(btns){
				if(ve.lang.getType(btns) == 'string'){
					ve.lang.each(btns.split('|'), function(gp, idx){
						buttonConfig.push({
							group: 'group'+(idx+1),
							buttons:  gp,
							className: 'veToolbar_'+'group'+(idx+1)
						});
					});
				} else if(ve.lang.getType(btns) == 'array'){
					buttonConfig = btns;
				} else {
					throw('buttons config error');
				}
			}

			ve.lang.each(buttonConfig, function(gp, idx){
				var lastTbClass = (idx+1 == buttonConfig.length) ? ' veToolbar_last' : '';
				var tb = tm.createToolbar(gp.group, {'class': gp.className+lastTbClass});
				if(gp.buttons){
					var buttons = gp.buttons.replace(/\s/g,'').split(',');
					ve.lang.each(buttons, function(btnName, idx2){
						var btn = tm.getUIControlFromCollection(btnName);
						if(btn){
							idx2 == (buttons.length - 1) && (btn.normalClass += ' veButton_last');
							tb.add(btn);
						}
					});
				}
			});

			//渲染工具条
			tm.render();
		}
	});
	ve.viewManager.register('def', ve.Editor.Def);
})(VEditor);
/**
 * 换行
 * 当前只针对换行符为 div情况
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.LineTag', {
		editor: null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			var _bind = function(addHistory){
				_this.editor.onKeyDown.add(function(e){
					if(e.keyCode == 13 && !e.ctrlKey){
						_this.editor.updateLastVERange();	//这里需要先update，才能保证addHistory里面的range正确
						addHistory && addHistory();
						_this.insertNewLine();	//这里写这个更新range的原因是：updateLastVERange是在keyup时触发，因此这里keydown管不到
						addHistory && addHistory();
						ve.dom.event.cancel(e);
						return false;
					}
				});
			};
			this.editor.tryIO('addHistory', _bind, _bind);
		},

		insertNewLine: function(){
			var rng = this.editor.getVERange();
			var brNode = rng.doc.createElement('br');

			if (!rng.collapsed) {
				rng.deleteContents();
				start = rng.startContainer;
				if (start.nodeType == 1 && (start = start.childNodes[rng.startOffset])) {
					while (start.nodeType == 1) {
						if (ve.dtd.$empty[start.tagName]) {
							rng.setStartBefore(start);
							rng.select();
							return false;
						}
						if (!start.firstChild) {
							start.appendChild(brNode);
							rng.setStart(start, 0);
							rng.select();
							return false;
						}
						start = start.firstChild
					}
					if (start === rng.startContainer.childNodes[rng.startOffset]) {
						rng.insertNode(brNode);
						rng.select();
					} else {
						rng.setStart(start, 0);
						rng.select();
					}
				} else {
					rng.insertNode(brNode);
					rng.setStartAfter(brNode);
					rng.select();
				}
			} else {
				rng.insertNode(brNode)

				var parent = brNode.parentNode;

				//[!] 这里会出现span过多的情况
				if (parent.lastChild === brNode) {
					var tmpNode = rng.doc.createElement('span');
					tmpNode.innerHTML = '&nbsp;';
					parent.appendChild(tmpNode);
					rng.setStart(tmpNode,0);
					rng.collapse(true);
					rng.select(true);
				} else if(ve.dom.isDisplayBlock(brNode.nextSibling)){
					var ps = brNode.previousSibling;

					//<br/>[brNode]<block> -> <span>&nbsp;</span><div>&nbsp;</div>
					if(ve.dom.isBr(ps)){
						var tmpNode = rng.doc.createElement('span');
						tmpNode.innerHTML = '&nbsp;';
						parent.appendChild(tmpNode);
					}

					//text[brNode]<block> -> <span>text</span><div>&nbsp;</div>
					else if(ps && ps.nodeType == 3){
						var tmpNode = rng.doc.createElement('span');
						ve.dom.insertAfter(tmpNode, ps);
						tmpNode.appendChild(ps);
					}

					//<block>text[brNode]<block>  -> <block>text<div>&nbsp;</div><block>
					if(ve.dom.isDisplayBlock(brNode.parentNode)){
						var div = rng.doc.createElement('div');
						div.innerHTML = '&nbsp;';
						ve.dom.insertBefore(div, brNode);
						ve.dom.remove(brNode);
						rng.setStart(div, 0);
					}

					//<inline>text[brNode]<block>  -> <inline>text<br/><span>&nbsp;</span><block>
					else {
						var span = rng.doc.createElement('span');
						span.innerHTML = '&nbsp;';
						ve.dom.insertBefore(span, brNode);
						ve.dom.insertBefore(brNode.cloneNode(), span);
						rng.setStart(span, 0);
					}
					rng.collapse(true);
					rng.select(true);
				}
				else {
					rng.setStartAfter(brNode)
					rng.select(true);
				}
			}
		}
	});
	ve.plugin.register('linetag', VEditor.plugin.LineTag);
})(VEditor);

/**
 * 保存按钮
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.Save', {
		init: function (editor, url) {
			//额外事件支持
			editor.addIO('onSaveContent', new ve.EventManager(editor));

			//快捷键
			editor.addShortcut('ctrl+s', function(){
				editor.tryIO('onSaveContent', function(ev){
					return ev.fire(editor, editor.getContent());
				});
			});

			//按钮UI
			editor.toolbarManager.createButton('save', {title:'保存(ctrl+s)', 'class':'veSave', cmd:function(){
				editor.tryIO('onSaveContent', function(ev){
					return ev.fire(editor, editor.getContent());
				});
			}});
		}
	});
	ve.plugin.register('save', VEditor.plugin.Save);
})(VEditor);

/**
 * 列表
 */
(function(ve){
	var POS_LEFT = -1,
		POS_MID = 0,
		POS_RIGHT = 1;

	ve.lang.Class('VEditor.plugin.List', {
		editor: null,
		init: function (editor, url) {
			this.editor = editor;
			this.addUIControls();
			this.bindEnterEvent();
		},

		/**
		 * 绑定回车事件
		 **/
		bindEnterEvent: function(){
			var _this = this;
			this.editor.onKeyDown.addFirst(function(e){
				if(e.keyCode == 13 && !e.shiftKey){
					if(_this._handerEnter(e)){
						ve.dom.event.preventDefault(e);
						return false;
					}
				}
			});
			this.editor.onClick.add(function(e){
				var rng = _this.editor.getVERange();
				if((rng.startContainer.tagName == 'UL' || rng.startContainer.tagName == 'OL')){
					rng.startContainer = rng.startContainer.lastChild;
					rng.startOffset = 0;
					rng.collapse(true);
				}
			});
		},

		/**
		 * 处理回车事件
		 * 如果检测到是list需要处理的enter，返回true
		 * @return {Boolean}
		 **/
		_handerEnter: function(){
			var rng = this.editor.getVERange();
			var sc, start, cursorPos;
			var tempSpan = rng.doc.createElement('span');

			if(!this._inList(rng)){
				return;
			}

			this.editor.tryIO('addHistory', function(fn){return fn()});
			if(!rng.collapsed){
				rng.deleteContents();
			}

			var liNode = this.editor.getDoc().createElement('LI');
			var con = this._inList(rng);
			if(!con){
				console.log('处理失败');
				return;
			}

			var bookmark = rng.createBookmark();
			var tmpRng = rng.cloneRange();
			tmpRng.setStartAfter(bookmark.start);
			if(con.childNodes.length > 0){
				tmpRng.setEndAfter(con.childNodes[con.childNodes.length-1]);
			}else{
				tmpRng.setEndAfter(bookmark.start);
			}
			var frag = tmpRng.extractContents();
			if(this.isEmptyNode(frag) || this.isTagNode(frag,'li') || !frag.lastChild.innerHTML){
				tempSpan.innerHTML = '&nbsp;';
				frag.appendChild(tempSpan);
			}
			liNode.appendChild(frag);
			if(this.isEmptyNode(con) || (this.isEmptyNode(con.lastChild) && this.isTagNode(con.lastChild,'span')) || !con.lastChild.innerHTML){
				tempSpan.innerHTML = '&nbsp;';
				con.appendChild(tempSpan);
			}
			ve.dom.insertAfter(liNode, con);
			if(liNode.firstChild){
				rng.setStartBefore(liNode.firstChild);
			}else{
				rng.setStartBefore(liNode);
			}
			rng.collapse(true);
			rng.select();
			return true;
		},

		/**
		 * 检测range包含list
		 **/
		_inList: function(rng){
			var start, end, sc = rng.startContainer,ec = rng.endContainer;
			if(rng.collapsed){
				start = this.findParentByTagName(sc, 'li', true);
			} else {
				end = this.findParentByTagName(ec, 'li', true);
			}
			return start || end;
		},
		
		/**
		 * insertOrDelList插入列表逻辑
		 * @param command string 区分有序还是无序列表
		 * @param style 待扩展功能，设置列表样式
		 *
		 **/
		insertOrDelList: function(command, style){
			if (!style) {
				style = command.toLowerCase() == 'insertorderedlist' ? 'decimal' : 'disc';
			}
			var child,
				filterFn = function (node) {
					return   node.nodeType == 1 ? node.tagName.toLowerCase() != 'br' : (new RegExp('[^ \t\n\r' + this.fillChar + ']').test(node.nodeValue));
				},	//过滤br 及包含制表符，换行，回车和填充字符的元素
				tag = command.toLowerCase() == 'insertorderedlist' ? 'ol' : 'ul',
				veRange = this.editor.getVERange(),
				frag = veRange.doc.createDocumentFragment();
			
			// 不再转换的元素
			var notExchange = {
					'TD':1,
					'PRE':1,
					'BLOCKQUOTE':1
				};
			
			//调整Range边界
            if (!veRange.collapsed) {
                while (!this.isBody(veRange.startContainer) &&
                    veRange.startOffset == veRange.startContainer[veRange.startContainer.nodeType == 3 ? 'nodeValue' : 'childNodes'].length
                    ) {
                    veRange.setStartAfter(veRange.startContainer);
                }
                while (!this.isBody(veRange.endContainer) && !veRange.endOffset) {
                    veRange.setEndBefore(veRange.endContainer);
                }
            }

            while (veRange.startContainer.nodeType == 1 //是element
                && (child = veRange.startContainer.childNodes[veRange.startOffset]) //子节点也是element
                && child.nodeType == 1 
				&& !veRange.isBookmarkNode(child) 
				&& !ve.dtd.$empty[child.tagName] 
				&& !ve.dtd.$nonChild[child.tagName]) {

                veRange.setStart(child, 0);
            }
			
            if (veRange.collapsed) {
				veRange.collapse(true);
            }else{
				while (veRange.endContainer.nodeType == 1//是element
						&& veRange.endOffset > 0 //如果是空元素就退出 endOffset=0那么endOffst-1为负值，childNodes[endOffset]报错
						&& (child = veRange.endContainer.childNodes[veRange.endOffset - 1]) //子节点也是element
						&& child.nodeType == 1 
						&& !veRange.isBookmarkNode(child) 
						&& !ve.dtd.$empty[child.tagName] 
						&& !ve.dtd.$nonChild[child.tagName]) {

					veRange.setEnd(child, child.childNodes.length);
				}
			}
			var bko = veRange.createBookmark(true),
				start = this.findParentByTagName(veRange.doc.getElementById(bko.start), 'li'),
				modifyStart = 0,
				end = this.findParentByTagName(veRange.doc.getElementById(bko.end), 'li'),
				modifyEnd = 0,
				startParent, endParent,
				list, tmp;
			
			/**
			 * 选区父节点中包括列表li元素的情况
			 */
			if (start || end) {
				start && (startParent = start.parentNode);
				if (!bko.end) {
					end = start;
				}
				end && (endParent = end.parentNode);

				//处于同一个ul || ol节点下
				if (startParent === endParent) {
					while (start !== end) {
						tmp = start;
						start = start.nextSibling || null;
						
						if (!ve.dom.isBlock(tmp.firstChild) && tmp.lastChild && tmp.lastChild.nodeName.toLowerCase() !== 'br') {

							tmp.appendChild(veRange.doc.createElement('br')); //为li下的非块元素添加换行
						}
						frag.appendChild(tmp);
						if(!start){
							break;
						}
					}
					
					tmp = veRange.doc.createElement('span');
					startParent.insertBefore(tmp, end);
					
					if (!ve.dom.isBlock(end.firstChild) && end.lastChild && end.lastChild.nodeName.toLowerCase() !== 'br') {

						end.appendChild(veRange.doc.createElement('br')); //为li下的非块元素添加换行
					}
					
					frag.appendChild(end);
					veRange.breakParent(tmp, startParent);
					
					if (this.isEmptyNode(tmp.previousSibling)) {
						ve.dom.remove(tmp.previousSibling);
					}
					if (this.isEmptyNode(tmp.nextSibling)) {
						ve.dom.remove(tmp.nextSibling)
					}
					
					var nodeStyle = ve.dom.getStyle(startParent, 'list-style-type') || (command.toLowerCase() == 'insertorderedlist' ? 'decimal' : 'disc');
					
					if (startParent.tagName.toLowerCase() == tag && nodeStyle == style) {
						for (var i = 0, ci, tmpFrag = veRange.doc.createDocumentFragment(); ci = frag.childNodes[i++];) {
							if(this.isTagNode(ci,'ol ul')){
								ve.lang.each(ci.getElementsByTagName('li'),function(li){
									while(li.firstChild){
										tmpFrag.appendChild(li.firstChild);
									}
								});
							}else{
								while (ci.firstChild) {
									tmpFrag.appendChild(ci.firstChild);
								}
							}
						}
						tmp.parentNode.insertBefore(tmpFrag, tmp);
						
					} else {
						list = veRange.doc.createElement(tag);
						list.style['list-style-type'] = style;
						list.appendChild(frag);
						tmp.parentNode.insertBefore(list, tmp);
					}

					ve.dom.remove(tmp);
					list && this.adjustList(list, tag, style);
					veRange.moveToBookmark(bko).select();
					return;
				}
				//开始
				if (start) {
					while (start) {
						tmp = start.nextSibling;
						if (this.isTagNode(start, 'ol ul')) {
							frag.appendChild(start);
						} else {
							var tmpfrag = veRange.doc.createDocumentFragment(),
								hasBlock = 0;
							while (start.firstChild) {
								if (ve.dom.isBlock(start.firstChild)) {
									hasBlock = 1;
								}
								tmpfrag.appendChild(start.firstChild);
							}
							frag.appendChild(tmpfrag);
							
							if (!hasBlock) {
								frag.appendChild(veRange.doc.createElement('br'));
							}
							ve.dom.remove(start);
						}
						start = tmp;
					}
					startParent.parentNode.insertBefore(frag, startParent.nextSibling);
					if (this.isEmptyNode(startParent)) {
						veRange.setStartBefore(startParent);
						ve.dom.remove(startParent);
					} else {
						veRange.setStartAfter(startParent);
					}
					modifyStart = 1;
				}

				if (end && ve.dom.getNodeRelexPosition(endParent, veRange.doc) == 10 ) {	//10 veRange.doc是endParent的祖先节点
					//结束 
					start = endParent.firstChild;
					while (start && start !== end) {
						tmp = start.nextSibling;
						if (this.isTagNode(start, 'ol ul')) {
							frag.appendChild(start);
						} else {
							tmpfrag = veRange.doc.createDocumentFragment();
							hasBlock = 0;
							while (start.firstChild) {
								if (ve.dom.isBlock(start.firstChild)) {
									hasBlock = 1;
								}
								tmpfrag.appendChild(start.firstChild);
							}
							frag.appendChild(tmpfrag);
							
							if (!hasBlock) {
								frag.appendChild(veRange.doc.createElement('br'));
							}
							ve.dom.remove(start);
						}
						start = tmp;
					}

					this.moveChild(end, frag);

					frag.appendChild(veRange.doc.createElement('br'));
					ve.dom.remove(end);
					endParent.parentNode.insertBefore(frag, endParent);
					veRange.setEndBefore(endParent);
					if (this.isEmptyNode(endParent)) {
						ve.dom.remove(endParent);
					}
					modifyEnd = 1;
				}
			}
			
			if (!modifyStart) {
				veRange.setStartBefore(veRange.doc.getElementById(bko.start));
			}
			if (bko.end && !modifyEnd) {
				veRange.setEndAfter(veRange.doc.getElementById(bko.end));
			}
			this.enlarge(veRange, true, function (node) {
				return notExchange[node.tagName];
			});

			frag = veRange.doc.createDocumentFragment();

			var bk = veRange.createBookmark(),
				current = ve.dom.getNextDomNode(bk.start, false, filterFn),
				tmpRange = veRange.cloneRange(),
				tmpNode;

			while (current && current !== bk.end && (ve.dom.getNodeRelexPosition(current, bk.end) & 4)) {	//位置关系为4||20 current的祖先节点为bk.end的祖先节点的前置节点或current为bk.end的祖先节点

				if (current.nodeType == 3 || ve.dtd.li[current.tagName]) {
					if (current.nodeType == 1 && ve.dtd.$list[current.tagName]) {
						while (current.firstChild) {
							frag.appendChild(current.firstChild);
						}
						tmpNode = ve.dom.getNextDomNode(current, false, filterFn);
						ve.dom.remove(current);
						current = tmpNode;
						continue;
					}
					
					tmpNode = current;
					tmpRange.setStartBefore(current);

					while (current && current !== bk.end && (!ve.dom.isBlock(current) || veRange.isBookmarkNode(current) )) {
						tmpNode = current;
						current = ve.dom.getNextDomNode(current, false, null, function (node) {
							return !notExchange[node.tagName];
						});
					}

					if (current && ve.dom.isBlock(current)) {
						tmp = ve.dom.getNextDomNode(tmpNode, false, filterFn);
						if (tmp && veRange.isBookmarkNode(tmp)) {
							current = ve.dom.getNextDomNode(tmp, false, filterFn);
							tmpNode = tmp;
						}
					}
					tmpRange.setEndAfter(tmpNode);

					current = ve.dom.getNextDomNode(tmpNode, false, filterFn);
					
					var tempContent = tmpRange.extractContents();
			
					this.createLiElements(veRange, tempContent, frag);
					
				} else {
					current = ve.dom.getNextDomNode(current, true, filterFn);
				}
			}
			veRange.moveToBookmark(bk).collapse(true);
			list = veRange.doc.createElement(tag);
			list.style['list-style-type'] = style;
			if(frag.childNodes.length == 0){
				tmpNode = veRange.doc.createElement('span');
				tmpNode.innerHTML = '&nbsp;';
				var tmpLi = veRange.doc.createElement('li');
				tmpLi.appendChild(tmpNode);
				frag.appendChild(tmpLi);
			}
			list.appendChild(frag);
			
			veRange.insertNode(veRange.doc.createElement('br'));//放置一个换行，输入列表外内容
			veRange.insertNode(list);
			//当前list上下看能否合并
			this.adjustList(list, tag, style,true);

			veRange.moveToBookmark(bko).select();
		},
		
		/**
		 * veRange 选区元素传递
		 * tempContent 选区内容传递
		 * frag 文档片段传递
		 */
		createLiElements: function (veRange, tempContent, frag) {
			var li = veRange.doc.createElement('li'),
				tempSpan1,tempSpan2;
			while(tempContent.firstChild){
				if( tempContent.firstChild.nodeName.toLowerCase() == "br" ) {
					if(!this.isEmptyNode(li)) {
					
						frag.appendChild(li);
					}
					li = veRange.doc.createElement('li');
					tempContent.removeChild(tempContent.firstChild);
					continue;
				}
				
				//span标记包含换行的处理
				if(tempContent.firstChild.nodeName.toLowerCase() == "span" && tempContent.firstChild.getElementsByTagName("br").length > 0 ) {
					tempSpan1 = tempContent.firstChild;
					tempSpan2 = ve.dom.clone(tempSpan1);
					while( tempSpan1.firstChild ){
						if( tempSpan1.firstChild.nodeName.toLowerCase() == "br" ){
							
							if(!this.isEmptyNode(tempSpan2)) {
								li.appendChild(tempSpan2);
								frag.appendChild(li);
							}
							li = veRange.doc.createElement('li');
							tempSpan2 = ve.dom.clone(tempSpan1);
							tempSpan1.removeChild(tempSpan1.firstChild);
							continue;
						}
						tempSpan2.appendChild(tempSpan1.firstChild);
					}
					if(!this.isEmptyNode(tempSpan2)) {
						li.appendChild(tempSpan2);
					}
					tempContent.removeChild(tempContent.firstChild);
					continue;
				}
				li.appendChild(tempContent.firstChild);
			}
			if(!this.isEmptyNode(li)) {
				frag.appendChild(li);
			}		
		},

        /**
         * 调整range的边界，使其"放大"到最近的父block节点
         * @name  enlarge
         * @grammar enlarge(range)  =>  Range
         * @example
         * <p><span>xxx</span><b>x[x</b>xxxxx]</p><p>xxx</p> ==> [<p><span>xxx</span><b>xx</b>xxxxx</p>]<p>xxx</p>
         */		
		enlarge: function (range, toBlock, stopFn) {
			var pre, node, tmp = range.doc.createTextNode('');
			if (toBlock) {
				node = range.startContainer;
				if (node.nodeType == 1) {
					if (node.childNodes[range.startOffset]) {
						pre = node = node.childNodes[range.startOffset]
					} else {
						node.appendChild(tmp);
						pre = node = tmp;
					}
				} else {
					pre = node;
				}
				while (node) {
					if (ve.dom.isBlock(node)) {
						node = pre;
						while ((pre = node.previousSibling) && !ve.dom.isBlock(pre)) {
							node = pre;
						}
						range.setStartBefore(node);
						break;
					}
					pre = node;
					node = node.parentNode;
				}
				node = range.endContainer;
				if (node.nodeType == 1) {
					if (pre = node.childNodes[range.endOffset]) {
						node.insertBefore(tmp, pre);
					} else {
						node.appendChild(tmp);
					}
					pre = node = tmp;
				} else {
					pre = node;
				}
				while (node) {
					if (ve.dom.isBlock(node)) {
						node = pre;
						while ((pre = node.nextSibling) && !ve.dom.isBlock(pre)) {
							node = pre;
						}
						range.setEndAfter(node);
						break;
					}
					pre = node;
					node = node.parentNode;
				}
				if (tmp.parentNode === range.endContainer) {
					range.endOffset--;
				}
				ve.dom.remove(tmp);
			}
		},

		/**
		 * 调整list结构
		 */
		adjustList: function(list, tag, style, ignoreEmpty) {
			var nextList = list.nextSibling;
			if (nextList && nextList.nodeType == 1 && nextList.tagName.toLowerCase() == tag && (ve.dom.getStyle(nextList, 'list-style-type') || (tag == 'ol' ? 'decimal' : 'disc')) == style) {
				this.moveChild(nextList, list);
				if (nextList.childNodes.length == 0) {
					ve.dom.remove(nextList);
				}
			}
			if(nextList && this.isFillChar(nextList)){
				ve.dom.remove(nextList);
			}
			var preList = list.previousSibling;
			if (preList && preList.nodeType == 1 && preList.tagName.toLowerCase() == tag && (ve.dom.getStyle(preList, 'list-style-type') || (tag == 'ol' ? 'decimal' : 'disc')) == style) {
				this.moveChild(list, preList);
			}
			if(preList && this.isFillChar(preList)){
				ve.dom.remove(preList);
			}
			!ignoreEmpty && this.isEmptyBlock(list) && ve.dom.remove(list);
		},

		/**
		 * 判断是否为空块元素
		 */
		isEmptyBlock: function (node) {
			var reg = new RegExp('[ \t\r\n' + ve.caretChar + ']', 'g');
			if (node[ve.ua.ie ? 'innerText' : 'textContent'].replace(reg, '').length > 0) {
				return 0;
			}
			for (var n in ve.dtd.$isNotEmpty) {
				if (node.getElementsByTagName(n).length) {
					return 0;
				}
			}
			return 1;
		},
		
		/**
		 * 判断是否为填充字符
		 */
		isFillChar:function (node,isInStart) {
			return node.nodeType == 3 && !node.nodeValue.replace(new RegExp((isInStart ? '^' : '' ) + ve.caretChar), '').length
		},
		
		/**
		 * 把src元素的子节点移到tag元素
		 */
		moveChild: function (src, tag, dir) {
			while (src.firstChild) {
				if (dir && tag.firstChild) {
					tag.insertBefore(src.lastChild, tag.firstChild);
				} else {
					tag.appendChild(src.firstChild);
				}
			}
		},
		
		/**
		 * 判断节点是否为某类节点
		 */
		isTagNode: function (node, tagName) {
			return node.nodeType == 1 && new RegExp(node.tagName,'i').test(tagName)
		},

		/**
		 * 判断节点是否为空节点
		 */
		isEmptyNode: function (node) {
			return !node.firstChild || ve.dom.getChildCount(node) == 0
		},
		
		/**
		 * 将字符串list(以','分隔)或者数组list转成哈希对象
		 * @name listToMap
		 * @grammar listToMap(list)  => Object  //Object形如{test:1,br:1,textarea:1}
		 */
		listToMap:function (list) {
			if (!list)return {};
			list = ve.lang.isArray(list) ? list : list.split(',');
			for (var i = 0, ci, obj = {}; ci = list[i++];) {
				obj[ci.toUpperCase()] = obj[ci] = 1;
			}
			return obj;
		},
		
		/**
		 * 通过tagName查找node节点的祖先节点
		 * @name findParentByTagName
		 * @grammar findParentByTagName(node,tagNames)   =>  Element  //tagNames支持数组，区分大小写
		 * @grammar findParentByTagName(node,tagNames,includeSelf)   =>  Element  //includeSelf指定是否包含自身
		 * @grammar findParentByTagName(node,tagNames,includeSelf,excludeFn)   =>  Element  //excludeFn指定例外过滤条件，返回true时忽略该节点
		 **/
		findParentByTagName: function (node, tagNames, includeSelf, excludeFn) {
			tagNames = this.listToMap(ve.lang.isArray(tagNames) ? tagNames : [tagNames]);
			return this.findParent(node, function (node) {
				return tagNames[node.tagName] && !(excludeFn && excludeFn(node));
			}, includeSelf);
		},
		
		/**
		 * 查找node节点的祖先节点
		 * @name findParent
		 * @grammar findParent(node)  => Element  // 直接返回node节点的父节点
		 * @grammar findParent(node,filterFn)  => Element  //filterFn为过滤函数，node作为参数，返回true时才会将node作为符合要求的节点返回
		 * @grammar findParent(node,filterFn,includeSelf)  => Element  //includeSelf指定是否包含自身
		 */
		findParent:function (node, filterFn, includeSelf) {
			if (node && !this.isBody(node)) {
				node = includeSelf ? node : node.parentNode;
				while (node) {
					if (!filterFn || filterFn(node) || this.isBody(node)) {
						return filterFn && !filterFn(node) && this.isBody(node) ? null : node;
					}
					node = node.parentNode;
				}
			}
			return null;
		},

		/**
		 * 检测node节点是否为body节点
		 **/
		isBody: function (node) {
			return  node && node.nodeType == 1 && node.tagName.toLowerCase() == 'body';
		},

		/**
		 * 添加UI控件
		 **/
		addUIControls: function(){
			var _this = this, t = this.editor, tm = this.editor.toolbarManager;
			tm.createButton('listol', {title: '有序列表', 'class': 'veOrderedList', cmd: 'InsertOrderedList', onInit: function(){
				var btn = this;
				t.onAfterUpdateVERangeLazy.add(function(){
					var act = 'setUnActive';
					try {act = t.getDoc().queryCommandState('InsertOrderedList') ? 'setActive' : 'setUnActive';} catch(ex){};
					btn[act]();
				});
			}});
			
			t.addCommand('InsertOrderedList', function(){
				_this.insertOrDelList('InsertOrderedList');
			});
			
			tm.createButton('listul', {title: '无序列表', 'class': 'veUnorderedList', cmd: 'InsertUnorderedList', onInit: function(){
				var btn = this;
				t.onAfterUpdateVERangeLazy.add(function(){
					var act = 'setUnActive';
					try {act = t.getDoc().queryCommandState('InsertUnorderedList') ? 'setActive' : 'setUnActive';} catch(ex){};
					btn[act]();
				});
			}});
			
			t.addCommand('InsertUnorderedList', function(){
				_this.insertOrDelList('InsertUnorderedList');
			});

		}
	});
	ve.plugin.register('list', VEditor.plugin.List);
})(VEditor);

/**
 * tab
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.Tab', {
		editor: null,
		init: function (editor, url) {
			this.editor = editor;
			this.addUIControls();
			this.bindEvent();
		},

		/**
		 * 绑定击键事件
		 **/
		bindEvent: function(){
			var ed = this.editor;

			//加入tab键制表符逻辑
			if(ed.conf.tab4space){
				var isup = true;
				ed.onKeyDown.add(function(e) {
					if (e.keyCode == 9) {
						ve.dom.event.preventDefault(e);
						if (!isup){
							return;
						}
						ed.insertHtml({content:new Array(1 + ed.conf.tab4space ).join('&nbsp;')});
						isup = false;
					}
				});
				ed.onKeyUp.add(function(e) {
					if (e.keyCode == 9) {
						isup = true;
					}
				});
			}
		},

		/**
		 * 添加按钮控件
		 **/
		addUIControls: function(){
			var t = this.editor, tm = this.editor.toolbarManager;

			tm.createButton('tableft', {title: '向左缩进', 'class': 'veTabLeft', cmd: 'outdent',onInit: function(){
				var btn = this;
				t.onAfterUpdateVERangeLazy.add(function(){
					var act = 'setUnActive';
					try {act = t.getDoc().queryCommandState('veTabLeft') ? 'setActive' : 'setUnActive';} catch(ex){};
					btn[act]();
				});
			}});
			tm.createButton('tabright', {title: '向右缩进', 'class': 'veTabRight', cmd: 'indent', onInit: function(){
				var btn = this;
				t.onAfterUpdateVERangeLazy.add(function(){
					var act = 'setUnActive';
					try {act = t.getDoc().queryCommandState('veTabRight') ? 'setActive' : 'setUnActive';} catch(ex){};
					btn[act]();
			});
			}});
		}
	});
	ve.plugin.register('tab', VEditor.plugin.Tab);
})(VEditor);

(function(ve) {
	var MAX_HISTORY_COUNT = 20;
	var MAX_KEYDOWN_COUNT = 5;
	var CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;

	/**
	 * 历史
	 */
	ve.lang.Class('VEditor.plugin.History', {
		editor:null,
		index: 0,
		data: [],
		maxHistoryCount: 20,	//最大历史记录次数
		onBeforeAdd: null,
		onChange: null,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.onBeforeAdd = new ve.EventManager(this.editor);
			this.onChange = new ve.EventManager(this.editor);

			//初始化
			this.reset();
			this.addCommands();
			this.addUIControls();
			this.bindShortCuts();

			//防止跟 onInitComplete -> setContent冲突，这里提前
			this.editor.onInitComplete.addFirst(function(){
				_this.bindHandlerEvent();
			});
		},

		bindHandlerEvent: function(){
			var _this = this;

			var _COM_SET_FLAG;
			_this.editor.onBeforeSetContent.add(function(params){
				_COM_SET_FLAG = params.addHistory;
				if(params.addHistory){
					_this.add();
				}
			});

			//setContent之后
			_this.editor.onAfterSetContent.add(function(params){
				_COM_SET_FLAG = false;
				if(!params.addHistory){
					_this.reset(_this.editor.getBody().innerHTML);
				}
			});

			//由于当前add的是在 keycount足够的时候执行，所以这里要补一下
			_this.editor.onBeforeExecCommand.add(function(cmd){
				if(cmd == 'insertHtml' && _COM_SET_FLAG){
					//忽略setContent(addHistory:true)情况
					//那边的已经设置了
				} else {
					_this.add();
				}
			});

			//commands绑定
			//保证在 updateLastVERange之后
			_this.editor.onAfterExecCommand.addLast(function(cmd){
				if(cmd != 'undo' && cmd != 'redo'){
					_this.add();
				}
			});

			//clearContent之后
			_this.editor.onAfterClearContent.add(function(){
				_this.add();
			});

			//paste
			//所有粘贴事件插件处理完毕再介入history
			_this.editor.onAfterPaste.addLast(function(){
				_this.add();
			});

			_this.onBeforeAdd.add(function(){
				CURRENT_KEY_COUNT = 0;
			});

			var ignoreKeys = {
				16:1, 17:1, 18:1,	//shift, ctrl, alt
				37:1, 38:1, 39:1, 40:1	//方向键
			};

			//处理添加逻辑
			_this.editor.onKeyUp.addLast(function(e){
				var keyCode = e.keyCode;
				var rng = _this.editor.getVERange();

				//完成切换需要添加历史
				//对于数字选词，这里可能存在用户【多次选词】的情况，所以该项判断被移除：/^[0-9]$/.test(String.fromCharCode(keyCode))
				if(keyCode == 32){
					CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;
				}

				//执行删除操作需要立即记录历史
				if(keyCode == 8){
					CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;
				}

				if(_this.editor.usingIM){
					CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;	//中文输入法结束时，才添加一个history
				} else if(!ignoreKeys[keyCode] && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey ) {
					if(++CURRENT_KEY_COUNT >= MAX_KEYDOWN_COUNT) {
						_this.add();
					}
				}
			});
		},

		/**
		 * 添加编辑器命令
		 **/
		addCommands: function(){
			var _this = this;
			_this.editor.addCommand('undo', function(){_this.undo();});
			_this.editor.addCommand('redo', function(){_this.redo();});

			this.editor.addIO('addHistory', function(){
				return _this.add();
			});
			this.editor.addIO('resetHistory', function(){
				var args = ve.lang.arg2Arr(arguments);
				return _this.reset.apply(_this, args);
			});
		},

		/**
		 * 绑定撤销重做快捷键
		 **/
		bindShortCuts: function(){
			var _this = this;
			this.editor.addShortcut('ctrl+z', function(){_this.undo();});
			this.editor.addShortcut('ctrl+y', function(){_this.redo();});
			//mac 额外支持
			if(ve.ua.mac){
				this.editor.addShortcut('meta+z', function(){_this.undo();});
				this.editor.addShortcut('meta+shift+z', function(){_this.redo();});
			}
		},

		/**
		 * 添加撤销重做UI
		 **/
		addUIControls: function(){
			var _this = this;
			var tm = _this.editor.toolbarManager;
			tm.createButton('undo', {title:'撤销(ctrl+z)', 'class':'veUndo', cmd:'undo', onInit: function(){
				var curBtn = this;
				_this.onChange.add(function(hasUndo, hasRedo){
					curBtn[hasUndo ? 'setEnabled' : 'setDisable']();
				});
			}});
			tm.createButton('redo', {title:'恢复(ctrl+y)', 'class':'veRedo', cmd:'redo', onInit: function(){
				var curBtn = this;
				_this.onChange.add(function(hasUndo, hasRedo){
					curBtn[hasRedo ? 'setEnabled' : 'setDisable']();
				});
			}});
		},

		/**
		 * 更新状态接口
		**/
		updateState: function(){
			this.onChange.fire(this, this.hasUndo(), this.hasRedo());
		},

		/**
		 * 直接获取HTML 提高速度
		 * @return {String}
		**/
		getHtmlContent: function(){
			return ve.string.trim(this.editor.getBody().innerHTML);
		},

		/**
		 * 添加历史
		 * 这里做单线程延迟处理，防止例如keydown连续触发效率问题、
		 * onAfterExecCommand与updateLastVERange逻辑冲突问题
		**/
		add: function() {
			this.onBeforeAdd.fire();

			var currentClip = this.getClip();

			//内容一致，不添加历史步骤
			if(this.data[this.index].content == currentClip.content){
				//console.log('history.add 内容一致，不添加历史步骤');
				return;
			}

			//历史长度超出情况
			if((this.index+1) >= MAX_HISTORY_COUNT){
				this.data = this.data.slice(MAX_HISTORY_COUNT-this.index, MAX_HISTORY_COUNT);
				this.data.push(currentClip);
				//console.log('history.add 历史长度超出情况', this.data);
			}

			//常规情况
			else {
				this.data[++this.index] = currentClip;
				//console.log('history.add 常规情况', this.data, this.getHtmlContent());
			}

			this.updateState();
		},

		/**
		 * 获取当前内容状态
		 * @return {Object}
		**/
		getClip: function(){
			if(ve.ua.safari){
				var content = this.getHtmlContent();
				return {
					content: content,
					fullContent: content
				}
			}

			var content = this.getHtmlContent();

			if(!this.editor.isFocused()){
				this.editor.focus();
			}

			var rng = this.editor.getVERange();
			var bookmark = rng.createBookmark(true, true);
			var fullContent = this.getHtmlContent();
			rng.moveToBookmark(bookmark);
			rng.select(true);

			return {
				fullContent: fullContent,
				content: content
			}
		},

		/**
		 * 恢复指定的历史场景
		 * @param {Object} clip
		**/
		restore: function(clip){
			this.editor.getBody().innerHTML = clip.fullContent;

			if(clip.initState){
				this.editor.getBody().innerHTML = clip.fullContent;
			} else {
				var rng = this.editor.getVERange();
				rng.moveToBookmark();
				rng.select(true);
			}
		},

		/**
		 * 重做
		**/
		redo: function() {
			if(this.hasRedo()){
				var clip = this.data[++this.index];
				this.restore(clip);
				this.updateState();
			}
		},

		/**
		 * 撤销
		**/
		undo: function() {
			if(this.hasUndo()){
				var clip =  this.data[--this.index];
				this.restore(clip);
				this.updateState();
			}
		},

		/**
		 * 是否有undo
		 * @return {Boolean}
		**/
		hasUndo: function() {
			return this.index > 0;
		},

		/**
		 * 是否有redo
		 * @return {Boolean}
		**/
		hasRedo: function() {
			return this.index < (this.data.length - 1);
		},

		/**
		 * reset editor undo system
		 * @param {String} html
		 */
		reset: function(html){
			html = html || '';
			html = ve.string.trim(html);
			CURRENT_KEY_COUNT = MAX_KEYDOWN_COUNT;
			this.index = 0;
			this.data = [{content:html, fullContent:html, initState:true}];
			this.updateState();
		}
	});
	ve.plugin.register('history', VEditor.plugin.History);
})(VEditor);
(function(ve) {
	/**
	 * 字体
	 */
	ve.lang.Class('VEditor.plugin.Font', {
		editor:null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.addCommands();
			this.bindShortcuts();
			this.createFontNameControl('fontname');
			this.createFontSizeControl('fontsize');
			this.createFontStyleControls();
		},

		bindShortcuts: function(){
			this.editor.addShortcut('ctrl+b', 'Bold');
			this.editor.addShortcut('ctrl+i', 'Italic');
			this.editor.addShortcut('ctrl+u', 'Underline');
		},

		/**
		 * 添加字体操作的相关命令
		 **/
		addCommands: function(){
			var _this = this;
			var FONT_OP_HASH = {
				'FontName': ['fontFamily'],
				'FontSize': ['fontSize'],

				'Bold': ['fontWeight', 'bold'],
				'UnBold': ['fontWeight', 'normal'],
				'Italic': ['fontStyle', 'italic'],
				'UnItalic': ['fontStyle', 'normal'],
				'Underline': ['textDecoration', 'underline'],
				'UnUnderline': ['textDecoration', 'none']
			};

			ve.lang.each(FONT_OP_HASH, function(item, cmd){
				_this.editor.addCommand(cmd, function(ui, val){
					var key = item[0],
					styleVal = val || item[1],
					rng = _this.editor.getVERange();

					if(!rng.collapsed){
						var attr = {style:{}};
						attr.style[key] = styleVal;
						rng.setInlineAttr('span', attr);
					} else {
						var curVal = _this.editor.querySelectionStyle(key);
						if(curVal != styleVal){
							var span = rng.doc.createElement('span');
							span.innerHTML = ve.blankChar;
							rng.insertNode(span);

							var node = ve.dom.fixNodeDupParent(span);

							node.style[key] = styleVal;
							rng.selectNodeContents(node);
							rng.collapse(true);
						}
					}
					rng.select();
				});
			});
		},

		createFontNameControl: function(id){
			var _this = this;
			var listBox = this.editor.toolbarManager.createListBox(id, {
				title: '选择字体',
				'class': 'FontName',
				cmd: 'FontName',
				onInit: function(){
					var curList = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						var fontFamily = _this.editor.querySelectionStyle('fontFamily');
						if(fontFamily){
							fontFamily = fontFamily.indexOf('楷体') >= 0 ? '楷体,楷体_GB2312' : fontFamily;
							fontFamily = fontFamily.indexOf('仿宋') >= 0 ? '仿宋,仿宋_GB2312' : fontFamily;
						}
						curList.updateCurrentState(fontFamily);
					});
				},
				onChange: function(val){
					var curList = this;
					_this.editor.execCommand(curList.conf.cmd, curList.conf.ui, val);
				},
				items: [
					['宋体','宋体', 'style=\"font-family:Simson\"'],
					['黑体','黑体', 'style=\"font-family:Simhei\"'],
					['仿宋,仿宋_GB2312','仿宋', 'style=\"font-family:仿宋,仿宋_GB2312\"'],
					['楷体,楷体_GB2312', '楷体', 'style=\"font-family:楷体,楷体_GB2312\"'],
					['隶书','隶书', 'style=\"font-family:隶书\"'],
					['微软雅黑','微软雅黑', 'style=\"font-family:Microsoft Yahei\"'],
					['幼圆','幼圆', 'style=\"font-family:幼圆\"'],
					['Arial','Arial', 'style=\"font-family:Arial\"'],
					['Calibri','Calibri', 'style=\"font-family:Calibri\"'],
					['Tahoma','Tahoma', 'style=\"font-family:Tahoma\"'],
					['Helvetica','Helvetica', 'style=\"font-family:Helvetica\"'],
					['Verdana','Verdana', 'style=\"font-family:Verdana\"']
				]
			});
			return listBox;
		},

		createFontSizeControl: function(id){
			var _this = this;
			this.editor.toolbarManager.createListBox('fontsize', {
				title: '选择字号',
				'class': 'FontSize',
				cmd: 'FontSize',
				onInit: function(){
					var curList = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						var fontSize = _this.editor.querySelectionStyle('fontSize');
						curList.updateCurrentState(fontSize);
					});
				},
				onChange: function(val){
					_this.editor.execCommand(this.conf.cmd, this.conf.ui, val);
				},
				items: [
				['10px','7(10px)', 'style=\"font-size:10px\"', null, 'padding-top:0px'],
				['12px','6(12px)', 'style=\"font-size:12px\"', null, 'padding-top:0px'],
				['14px','5(14px)', 'style=\"font-size:14px\"', null, 'padding-top:0px'],
				['16px','4(16px)', 'style=\"font-size:16px\"', null, 'padding-top:2px'],
				['18px','3(18px)', 'style=\"font-size:18px\"', null, 'padding-top:5px'],
				['24px','2(24px)', 'style=\"font-size:24px\"', null, 'padding-top:8px'],
				['36px','1(36px)', 'style=\"font-size:36px\"', null, 'padding-top:18px']
				]
			})
		},

		createFontStyleControls: function(){
			var _this = this;
			this.editor.toolbarManager.createButton('bold', {title: '加粗(ctrl+b)', 'class': 'veBold',
				onInit: function(){
					var _curControl = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						//这里的fontweight有可能有用数值的情况
						var fontWeight = _this.editor.querySelectionStyle('fontWeight') || '';
						var act;
						if(parseInt(fontWeight, 10)){
							act = fontWeight > 400 ? 'setActive' : 'setUnActive';
						} else {
							act = fontWeight.toLowerCase().indexOf('bold')>=0 ? 'setActive' : 'setUnActive';
						}
						_curControl[act]();
					});
				},
				onClick: function(){
					var cmd = this.toggleActive() ? 'Bold' : 'UnBold';
					_this.editor.execCommand(cmd);
				}
			});

			this.editor.toolbarManager.createButton('italic', {title: '斜体(ctrl+i)', 'class': 'veItalic',
				onInit: function(){
					var _curControl = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						var fontStyle = _this.editor.querySelectionStyle('fontStyle') || '';
						var act = fontStyle.toLowerCase().indexOf('italic')>=0 ? 'setActive' : 'setUnActive';
						_curControl[act]();
					});
				},
				onClick: function(){
					var cmd = this.toggleActive() ? 'Italic' : 'UnItalic';
					_this.editor.execCommand(cmd);
				}
			});

			this.editor.toolbarManager.createButton('underline', {title: '下划线(ctrl+u)', 'class': 'veUnderline',
				onInit: function(){
					var _curControl = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						var underline = _this.editor.querySelectionStyle('textDecoration') || '';
						var act = underline.toLowerCase().indexOf('underline')>=0 ? 'setActive' : 'setUnActive';
						_curControl[act]();
					});
				},
				onClick: function(){
					var cmd = this.toggleActive() ? 'Underline' : 'UnUnderline';
					_this.editor.execCommand(cmd);
				}
			});
		}
	});
	ve.plugin.register('font', VEditor.plugin.Font);
})(VEditor);
(function(ve){
	ve.lang.Class('VEditor.plugin.TextJustify', {
		editor: null,
		helperTag: 'div',

		init: function(editor, url){
			var _this = this;
			this.editor = editor;
			this.addCommands();
			this.bindShortcuts();
			this.createControls();
		},

		/**
		 * 创建命令按钮
		 **/
		createControls: function(){
			var _this = this;
			var tm = this.editor.toolbarManager;
			tm.createButton('justifyleft', {title: '左对齐(ctrl+alt+l)', 'class': 'veJustifyLeft', cmd: 'justifyleft', onInit: function(){
				var _btn = this;
				_this.editor.onAfterUpdateVERangeLazy.add(function(){
					var align = _this.editor.querySelectionStyle('textAlign') || '';
					var act = align.toLowerCase() == 'left' ? 'setActive' : 'setUnActive';
					_btn[act]();
				});
			}});
			tm.createButton('justifycenter', {title: '居中对齐(ctrl+alt+c)', 'class': 'veJustifyCenter', cmd: 'justifycenter', onInit: function(){
				var _btn = this;
				_this.editor.onAfterUpdateVERangeLazy.add(function(){
					var align = _this.editor.querySelectionStyle('textAlign') || '';
					var act = align.toLowerCase() == 'center' ? 'setActive' : 'setUnActive';
					_btn[act]();
				});
			}});
			tm.createButton('justifyright', {title: '右对齐(ctrl+alt+r)', 'class': 'veJustifyRight', cmd: 'justifyright', onInit: function(){
				var _btn = this;
				_this.editor.onAfterUpdateVERangeLazy.add(function(){
					var align = _this.editor.querySelectionStyle('textAlign') || '';
					var act = align.toLowerCase() == 'right' ? 'setActive' : 'setUnActive';
					_btn[act]();
				});
			}});
			tm.createButton('justifyfull', {title: '默认对齐', 'class': 'veJustifyFull', cmd: 'justifyfull', onInit: function(){
				var _btn = this;
				_this.editor.onAfterUpdateVERangeLazy.add(function(){
					var align = _this.editor.querySelectionStyle('textAlign') || 'justify';
					align = align.toLowerCase();
					var act = (align == 'justify' || align == 'start') ? 'setActive' : 'setUnActive';
					_btn[act]();
				});
			}});
		},

		/**
		 * 添加文本操作的相关命令
		**/
		addCommands: function(){
			var _this = this;
			var TEXT_OP_HASH =  {
				'justifycenter': 'center',
				'justifyleft': 'left',
				'justifyright': 'right',
				'justifyfull': 'justify'
			};
			ve.lang.each(TEXT_OP_HASH, function(val, cmd){
				_this.editor.addCommand(cmd, function(){
					return _this.setTextAlign(val);
				});
			});
		},

		/**
		 * 绑定快捷键
		 **/
		bindShortcuts: function(){
			this.editor.addShortcut('ctrl+alt+l', 'justifyleft');
			this.editor.addShortcut('ctrl+alt+c', 'justifycenter');
			this.editor.addShortcut('ctrl+alt+r', 'justifyright');
		},

		/**
		 * 设置选取内容排列
		 * @param {String} align 取值：left,center,right,justifyfull
		 **/
		setTextAlign: function(align){
			var txt, bookmark,
				attr = {style:{'textAlign':align}},
				rng = this.editor.getVERange();

			if(!ve.dtd.$block[this.helperTag.toUpperCase()]){
				attr.style.display = 'block';
			}

			if(rng.collapsed){
				txt = this.editor.getDoc().createElement('span');
				rng.insertNode(txt);
			}

			bookmark = rng.createBookmark();
			_maxRng(rng, bookmark.start, bookmark.end);

			rng.setInlineAttr(this.helperTag, attr);
			rng.moveToBookmark(bookmark);

			if(txt){
				rng.setStartBefore(txt);
				rng.collapse(true);
				ve.dom.remove(txt);
			}
			rng.select();
		}
	});

	/**
	 * 移除重叠的节点
	 * @param {Range} rng
	 * @param  {DOM} node
	 * @return {DOM}
	 */
	var _clearParent = function(rng, node){
		var p = node.parentNode;

		if(p.tagName != node.tagName || node.nodeType != 1){
			return node;
		}

		var _childCount = 0;
		ve.lang.each(p.childNodes, function(node){
			if(!ve.isHelperNode(node) && !rng.isBookmarkNode(node)){
				_childCount++;
				if(_childCount>1){
					return true;
				}
			}
		});

		//设置parent span display block
		if(node.style.display == 'block'){
			ve.dom.getParent(node, function(p){
				if(p.tagName == 'span' && p.style.display != 'block'){
					p.style.display = 'block';
				}
				if(p.tagName != 'span'){
					return true;
				}
			});
		}

		if(_childCount == 1){
			ve.dom.setStyles(p, style);
			ve.dom.remove(node, true);
			return p;
		} else {
			return node;
		}
	};

	/**
	 * 检测边界终止点
	 * @param {DOM} n
	 **/
	var _stopFn = function(n){
		if(ve.dom.isBr(n) || ve.dom.isDisplayBlock(n)){
			return true;
		}
		return false;
	};

	/**
	 * 获取block元素
	 * @param   {DOM} node
	 * @param {String} ltr
	 * @param   {Function} stopFn
	 * @return  {Mix}
	 */
	var _getBlockIn = function(node, ltr, stopFn){
		if(node.childNodes.length){
			var found;
			if(ltr == 'nextSibling'){
				for(var i=0; i<node.childNodes.length; i++){
					found = _getBlockIn(node.childNodes[i], ltr, stopFn);
					if(found){
						return found;
					}
				}
			} else {
				for(var i=node.childNodes.length-1; i>=0; i--){
					found = _getBlockIn(node.childNodes[i], ltr, stopFn);
					if(found){
						return found;
					}
				}
			}
		} else {
			return stopFn(node) ? node : null;
		}
	};

	/**
	 * 扩散节点,在block或者br处终止扩散
	 * 该方法操作过后，实际需要做排版的区域应该是正确+唯一的
	 * @param {VERange} rng
	 * @param {DOM} start
	 * @param {DOM} end
	 **/
	var _maxRng = function(rng, start, end){
		var _start, _end;

		_start = _max(start, 'previousSibling', function(node){return _stopFn(node);});
		_end = _max(end, 'nextSibling', function(node){return _stopFn(node);});

		if(_start){
			while(_start.parentNode && _start.parentNode.lastChild === _start && !ve.dom.contains(_start.parentNode, start)){
				_start = _start.parentNode;
			}
			if(ve.dom.contains(_start, start)){
				rng.setStart(_start, 0);
			} else {
				rng.setStartAfter(_start);
			}
		}
		if(_end){
			//锁定 _end在_start同一级别
			var tmp = _end;
			while(tmp.lastChild){
				if(tmp.lastChild == _start.parentNode){
					rng.setEnd(_start.parentNode, _start.parentNode.childNodes.length);
					return;
				}
				tmp = tmp.lastChild;
			}

			while(_end.parentNode && _end.parentNode.firstChild === _end && !ve.dom.contains(_end.parentNode, end)){
				_end = _end.parentNode;
			}
			if(ve.dom.contains(_end, end)){
				rng.setEnd(_end, _end.childNodes.length);
			} else {
				rng.setEndBefore(_end);
			}
		}
	};

	/**
	 * 延伸节点
	 * @param   {DOM} node
	 * @param   {String} ltr
	 * @param   {Function} stopFn
	 * @return  {Mix}
	 */
	var _max = function(node, ltr, stopFn){
		var tmpNode = node, _blockNode;
		while(tmpNode){
			if(tmpNode[ltr]){
				if(stopFn(tmpNode[ltr])){
					return tmpNode[ltr];
				} else if(_blockNode = _getBlockIn(tmpNode[ltr], ltr, stopFn)){
					return _blockNode;
				} else {
					tmpNode = tmpNode[ltr];
				}
			}
			else if(tmpNode.parentNode){
				if(stopFn(tmpNode.parentNode)){
					return tmpNode.parentNode;
				}
				tmpNode = tmpNode.parentNode;
			}
			else {
				return null;
			}
		}
	};

	ve.plugin.register('textjustify', VEditor.plugin.TextJustify);
})(VEditor);


/**
 * QZONE媒体基础应用类(图片、音乐、影集、视频、flash)
 * 该插件必须运行在qzone环境下面，且先加载当前类
 * 当前类继承存在BUG。父类属性会被删除
 */
(function(ve){
	var QZONE = window.QZONE = window.QZONE || {};
	QZONE.FP = QZONE.FP || {};
	QZONE.FP._t = QZONE.FP._t || top;
	QZONE.FP.getQzoneConfig = QZONE.FP.getQzoneConfig || function(){
		return {loginUin: window.g_iUin};
	};
	QZONE.FP.closePopup = QZONE.FP.closePopup || function(){
		return ve.ui.closePopup();
	};

	var CACHE_DATA_LIST = [];
	var TOP_WIN = QZONE.FP._t;
	var LOGIN_UIN = QZONE.FP.getQzoneConfig().loginUin;
	var IMGCACHE_DOMAIN = window.IMGCACHE_DOMAIN || 'qzs.qq.com';

	ve.lang.Class('VEditor.plugin.QzoneMedia', {
		topWin: TOP_WIN,
		loginUin: LOGIN_UIN,
		IMGCACHE_DOMAIN: IMGCACHE_DOMAIN,

		/**
		 * 初始化
		 * @param {Object} editor
		 * @param {String} url
		 */
		init: function (editor, url) {
			this.editor = editor;
		},

		/**
		 * 显示插入面板
		 */
		showPanel: function(){
			var _this = this;
			var panelConfig = this.config.panel;

			var dlg = ve.ui.showPopup(panelConfig.name,{src:panelConfig.url},panelConfig.width, panelConfig.height);
			if(this.popupCallback){
				ve.ui.appendPopupFn(function(){
					return _this.popupCallback();
				});
			}
		},

		/**
		 * 关闭插入面板
		 */
		closePanel: function(){
			ve.ui.closePopup();
		},

		/**
		 * 获取编辑器内部document对象相对于外部的位置
		 * @param {object} tag
		 */
		getEditorEleFrameRegion: function(tag){
			var region = {left:0, top:0, width:0, height:0};

			var innerPos = ve.dom.getXY(tag);
			var iframePos = ve.dom.getXY(this.editor.iframeElement);

			//console.log('TODO 这里要针对滚动情况debug一下');
			var iframeScrollTop = this.editor.getBody().scrollTop;
			var iframeScrollLeft = this.editor.getBody().scrollLeft;

			region.left = iframePos[0] + innerPos[0] + iframeScrollLeft;
			region.top = iframePos[1] + innerPos[1] + iframeScrollTop;
			region.width = tag.offsetWidth;
			region.height = tag.offsetHeight;
			return region;
		},

		/**
		 * 资源白名单
		 * @param {String} url
		 * @return {Boolean}
		 **/
		isInWhiteList: function(url) {
			var isQQVideo = /^http:\/\/((\w+\.|)(video|v|tv)).qq.com/i.test(url);
			var isImgCache = /^http:\/\/(?:cnc.|edu.|ctc.)?imgcache.qq.com/i.test(url) || /^http:\/\/(?:cm.|cn.|os.|ctc.|cnc.|edu.)?qzs.qq.com/i.test(url);
			var isComic = /^http:\/\/comic.qq.com/i.test(url);

			return (isQQVideo || isImgCache || isComic);
		},

		/**
		 * 设置cache
		 * @param {Object} data
		 * @return {Number} cacheId
		 **/
		setCache: function(data){
			CACHE_DATA_LIST.push(data);
			return CACHE_DATA_LIST.length-1;
		},

		/**
		 * 获取cache
		 * @param {Number} id
		 * @return {Object}
		 **/
		getCache: function(id){
			return CACHE_DATA_LIST[id] || null;
		}
	});
	ve.plugin.register('qzonemedia', VEditor.plugin.QzoneMedia);
})(VEditor);
(function(ve) {
	var WYSIWYG_STATE = 0;
	var HTML_CODE_STATE = 1;
	var STATE_TEXT = {
		0: '切换到HTML代码编辑模式',
		1: '返回所见即所得编辑模式'
	};

	/**
	 * HTML编辑器
	 */
	ve.lang.Class('VEditor.plugin.HtmlEditor', {
		editor: null,
		btn: null,
		curState: WYSIWYG_STATE,
		copyState: false,
		htmlElement: null,
		config: {
			className: 'veHtmlEditor'
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.editor.addIO('onBeforeToggleHtmlState', new ve.EventManager(this.editor));
			this.editor.addIO('onAfterToggleHtmlState', new ve.EventManager(this.editor));
			this.editor.addIO('toggleHtmlEditor', function(){
				return _this.toggleHtmlEditor();
			});
            this.btn = this.editor.createButton('html', {
                'class': 'veHtml',
                title: STATE_TEXT[WYSIWYG_STATE],
                cmd: function(){
					_this.toggleHtmlEditor();
				}
            });

			this.createHtmlContainer();
			this.bindEditorEvent();
			this._tmp_fn = ve.lang.bind(this, this.listenSetContentEvent);
			this.editor.onSetContent.add(this._tmp_fn);
		},

		_tmp_fn: null,

		/**
		 * 绑定处于HTML代码编辑状态的内容填充事件
		 */
		listenSetContentEvent: function(html){
			//非html状态
			if(this.curState == WYSIWYG_STATE){
				return;
			}

			//这里不严谨，如果页面处于HTML模式，其他插件向编辑器插入内容，则这部分内容会丢失
			//应该使用 getContent() 获取为准确，
			//但是编辑器核心那边涉及到隐藏body无法setContent的bug，
			//换句话说，处于HTML模式的编辑器是无法向iframe那边插入内容的（其他任何插件都无法插入）
			this.setCode(this.htmlElement.value + html);
			return html;
		},

		/**
		 * 切换编辑器
		 **/
		toggleHtmlEditor: function(){
			var _this = this;
			var ctrl;
			this.editor.tryIO('onBeforeToggleHtmlState', function(ev){
				ctrl = ev.fire(_this.editor, _this.curState);
			});
			if(ctrl === false){
				return;
			}

			var TO_HTML_CODE_STATE = this.curState == WYSIWYG_STATE;
			this.btn[TO_HTML_CODE_STATE ? 'setActive' : 'setUnActive']();

			//显示切换
			this.editor.iframeElement.style.display = TO_HTML_CODE_STATE ? 'none' : '';
			this.htmlElement.style.display = TO_HTML_CODE_STATE ? '' : 'none';

			try {
				if(window._VE_QZONE_SIDE_ALBUM_OBJ){
					window._VE_QZONE_SIDE_ALBUM_OBJ.panel.style.display = TO_HTML_CODE_STATE ? 'none' : '';
				}
			} catch(ex){}


			//前景色、边框色配合body（信纸）
			this.htmlElement.style.color = this.editor.getBody().style.color;
			this.htmlElement.style.borderColor = this.editor.getBody().style.color;

			//设置工具条状态
			this.setOtherToolbarButtonsState(TO_HTML_CODE_STATE);

			//值传递
			if(TO_HTML_CODE_STATE){
				this.setCode(this.editor.getContent());
			} else {
				this.setHTML(this.htmlElement.value);
			}
			this.curState = TO_HTML_CODE_STATE ? HTML_CODE_STATE : WYSIWYG_STATE;

			this.editor.tryIO('onAfterToggleHtmlState', function(ev){
				_this.btn.getDom().title = STATE_TEXT[_this.curState];
				return ev.fire(_this.editor, TO_HTML_CODE_STATE);
			});
		},

		/**
		 * 设置工具条其他按钮状态
		 * @param {Boolean} TO_HTML_CODE_STATE
		 **/
		setOtherToolbarButtonsState: function(toHtml){
			var _this = this;
			var controls = this.editor.toolbarManager.getAllToolbarUIControls();
			var getId = function(id){return _this.editor.toolbarManager.generateId(id);};
			ve.lang.each(controls, function(control){
				if(control.id != getId('html') &&
					control.id != getId('save') &&
					control.id != getId('submit')){
					control[toHtml ? 'setDisable' : 'setEnabled']();
				}
			});
		},

		/**
		 * 创建textarea，绑定事件
		 * @return {Object}
		 **/
		createHtmlContainer: function(){
			this.htmlElement = ve.dom.create('textarea', {
				allowtransparency: 'true',
				spellcheck: 'false',
				style: {
					width : '100%',
					height : '500px',
					border: '1px solid #ccc',
					fontSize: '14px',
					backgroundColor:'transparent',
					color: '#345',
					wordBreak: 'break-all',
					display: 'none'
				}
			},null, this.editor.iframeContainer);
			this.htmlElement.className = this.config.className;
		},

		//绑定获取内容事件
		bindEditorEvent: function(){
			var _this = this;
			_this.editor.onGetContent.addFirst(function(html){
				if(_this.curState == HTML_CODE_STATE){
					return _this.htmlElement.value;
				} else {
					return html;
				}
			}, true);
			_this.editor.onAfterClearContent.add(function(){
				if(_this.curState == HTML_CODE_STATE){
					_this.setCode('');
				}
			});
			return this.htmlElement;
		},

		/**
		 * 设置html代码回可视化编辑框
		 */
		setHTML: function(html){
			this.editor.onSetContent.remove(this._tmp_fn);	//这里要过滤掉本身的onSetContent监控（监听编辑日志填充内容动作）
			if(this.editor.cleanString){
				html = this.editor.cleanString(html);
			}
			this.editor.setContent({content:html, useParser:true});
			this.editor.onSetContent.add(this._tmp_fn);
		},

		/**
		 * 设置code到html代码编辑器
		 */
		setCode: function(html){
			html = this.formatHTML(html);
			this.htmlElement.value = html;
		},

		formatHTML: function(html){
			var str;
			str = html.replace(/<br(\s*?)\/{0,1}>/ig, "<br/>\r\n");
			str = str.replace(/<\/p>/ig, "</p>\r\n");

			str = str.replace(/<div([^>]*?)>/ig, "\r\n<div$1>");
			str = str.replace(/<\/div>/ig, "</div>\r\n");

			str = str.replace(/<table([^>]*?)>/ig,"\r\n<table$1>\r\n");
			str = str.replace(/<\/table>/ig, "\r\n</table>\r\n");
			return str.replace(/^\r\n/g,'');
		}
	});
	ve.plugin.register('htmleditor', VEditor.plugin.HtmlEditor);
}) (VEditor);
/**
 * 工具栏模式切换
 */
(function(ve) {
	var _ADV_CSS_LINK_URL;

	ve.lang.Class('VEditor.plugin.ToolbarSwitcher', {
		editor:null,
		curState: '',	//normal | advance
		advToolbarClass: '',
		advToolbarText: '',
		normalToolbarText: '',

		btn: null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.curState = editor.conf.toolbarMode || 'normal';
			this.advToolbarClass = editor.conf.advToolbarClass || 'veToolbarAdvMode';
			this.advToolbarText = editor.conf.advToolbarText || '基本功能';
			this.normalToolbarText = editor.conf.normalToolbarText || '高级功能';

			this.btn = this.editor.createButton('toolbarswitcher', {
				'class': 'veToolbarSwitcher',
				title: '切换到 '+this.normalToolbarText,
				text: this.normalToolbarText+'<b></b>',
				cmd:  function(){
					_this.switchToolbar();
				}
			});

			//添加工具条模式
			this.editor.onInitComplete.add(
				function(){
					_this.switchToolbar(_this.curState);
				}
			);

			//普通模式下面的样式
			ve.dom.insertCSSLink(url+'base.css');
			_ADV_CSS_LINK_URL = url+'advance.css';
			editor.addIO('onAfterSwitchToolbar', new ve.EventManager(editor));
		},

		switchToolbar: function(targetState){
			var targetState = targetState === undefined ? (this.curState == 'advance' ? 'normal' : 'advance') : targetState;
			ve.dom[targetState == 'advance' ? 'addClass' : 'removeClass'](this.editor.toolbarContainer, this.advToolbarClass)
			this.btn.getDom().innerHTML = (targetState == 'advance' ? this.advToolbarText : this.normalToolbarText) +'<b></b>';
			this.btn.getDom().title = '切换到 '+(targetState == 'advance' ? this.advToolbarText : this.normalToolbarText);
			this.curState = targetState;
			this.editor.tryIO('onAfterSwitchToolbar', function(ev){
				ev.fire(targetState == 'advance');
			});
			if(_ADV_CSS_LINK_URL && targetState == 'advance'){
				ve.dom.insertCSSLink(_ADV_CSS_LINK_URL);
				_ADV_CSS_LINK_URL = null;
			}
		}
	});
	ve.plugin.register('toolbarswitcher', VEditor.plugin.ToolbarSwitcher);
}) (VEditor);
/**
 * 超链接
 */
(function(ve) {
	var isMail = function(str){
		return /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(str);
	};
	ve.lang.Class('VEditor.plugin.link', {
		editor: null,
		pop: null,
		node: null,
		init: function(editor, url){
			var _this = this;
			this.editor = editor;

			this.btn = this.editor.createButton('link', {
				'class': 'veLink',
				title: '设置链接',
				cmd: function(){
					_this.showPanel(null, _this.btn.getDom());
				}
			});

			//添加到编辑器命令集合中
			ve.lang.each(['removeLink', 'addLink', 'adjustLink'], function(method){
				_this.editor.addCommand(method, function(){
					return _this[method].apply(_this, ve.lang.arg2Arr(arguments));
				});
			});

			//隐藏panel处理
			ve.dom.event.add(document.body, 'click', function(e){
				var target = ve.dom.event.getTarget(e);
				if(_this.pop){
					var popPanel = _this.pop.getDom();
					if(!ve.dom.contains(_this.editor.iframeContainer, target) &&
						!ve.dom.contains(popPanel, target) &&
						!ve.dom.contains(_this.btn.getDom(), target)
					){
						_this.closePanel();
					}
				}
			});

			//点击文档链接处，出现设置链接对话框
			this.editor.onClick.add(function(e){
				var link = ve.dom.event.getTarget(e);
				if(link.tagName == 'IMG'){
					_this.closePanel();
					return;
				}
				var aLink = ve.dom.getParent(link, function(node){
					if(node.tagName == 'A' && !(node.getAttribute('uin') || node.getAttribute('link'))){
						return true;
					}
				});
				if(!ve.dom.isLinkNode(aLink)){
					_this.closePanel();
				} else {
					_this.node = aLink;
					var href = aLink.href;
					var _fixTop = 3;	//修正行高
					var region = ve.dom.getRegion(aLink);
					var iframeRegion = ve.dom.getRegion(_this.editor.iframeContainer);
					var scrollTop = parseInt(_this.editor.getBody().scrollTop, 10) || 0;
					_this.showPanel(href, null, {top:region.top+iframeRegion.top+region.height-scrollTop+_fixTop, left:region.left+iframeRegion.left});
					ve.dom.event.preventDefault(e);
					return false;
				}
			});
		},

		/**
		 * 显示面板
		 * @param {String} link
		 * @param {Object} node
		 * @param {Object} config
		 */
		showPanel: function(link, node, config){
			var config = ve.lang.extend({left:0,top:0}, config || {});
			var html = ([
				'<div id="ed-insert-link-panel"><strong>设置超链接</strong>',
				'<div>',
					'<input type="text" id="link-val" style="padding:2px 1px; border:1px solid #bbb; border-right-color:#ddd; border-bottom-color:#ddd; border-radius:3px"/>',
					'<input type="button" value="设置" id="link-submit-btn" style="height:20px; width:40px; margin-left:5px;" title="设置链接"/>',
					'<input type="button" value="删除" id="link-remove-btn" style="height:20px; width:40px; margin-left:5px;" title="删除链接"/>',
				'</div></div>'
			]).join('');

			if(!this.pop){
				this.pop = ve.ui.showSimplePopup(this.editor, node, {content: html, height:70, width:320});
				this.setupEvent(this.pop.getDom());
			}
			ve.dom.get('link-val').value = link || 'http://';
			this.pop.show();
			if(node){
				var region = ve.dom.getRegion(node);
				config = ve.lang.extend(config||{},{left:region.left, top:region.top+region.height});
			}

			//避免iframe遮蔽
			var editorWidth = ve.dom.getSize(this.editor.iframeContainer)[0];
			var editorLeft = ve.dom.getXY(this.editor.iframeContainer)[0];
			var popWidth = ve.dom.getSize(this.pop.getDom())[0];

			if((editorWidth - (config.left - editorLeft)) < popWidth){
				config.left = editorLeft + editorWidth - popWidth;
			}
			this.pop.show(config);
		},

		/**
		 * 关闭面板
		 */
		closePanel: function(){
			this.node = null;
			if(this.pop){
				this.pop.hide();
			}
		},

		/**
		 * 添加链接
		 * @param {String} link 链接地址，必须是protocol://开始
		 * @param {String} text 链接文字
		 */
		addLink: function(link, text){
			text = text || link;

			var rng = this.editor.getVERange();

			if(ve.ua.ie == 6){
				var start, end;
				var start = rng.startContainer.nodeType == 3 ? rng.startContainer.parentNode : rng.startContainer.childNodes[rng.startOffset];
					start = start || rng.startContainer;
				var end = rng.endContainer.nodeType == 3 ? rng.endContainer.parentNode : rng.endContainer.childNodes[rng.endOffset-1];

				start = start.nodeType == 3 ? start.parentNode : start;
				end = end.nodeType == 3 ? end.parentNode : end;

				if(start.parentNode == end.parentNode && start.parentNode.tagName == 'A'){
					start = start.parentNode;
					end = end.parentNode;
				}

				if(start == end && start.tagName == 'A'){
					start.href = link;
					start.title = text;
					return;
				}
			}

			this._enlargeRngToA(rng);
			rng.removeInlineStyle('a');
			if(rng.collapsed){
				var a = this.editor.getDoc().createElement('a');
					a.href = link;
					a.title = text;
					a.innerHTML = text;
				rng.insertNode(a);
				rng.selectNode(a);
			} else {
				rng.setInlineAttr('a', {href:link, title:text});
			}

			rng.collapse();
			rng.select();
			this.editor.showStatusbar('链接设置成功', 3);
		},

		/**
		 * 找父节点A
		 * @param {Rang} rng
		 **/
		_enlargeRngToA: function(rng){
			ve.dom.getParent(rng.startContainer, function(node){
				if(node.nodeType == 1 && node.tagName == 'A'){
					rng.setStartBefore(node);
					return true;
				}
			});
			ve.dom.getParent(rng.endContainer, function(node){
				if(node.nodeType == 1 && node.tagName == 'A'){
					rng.setEndAfter(node);
					return true;
				}
			});
			rng.removeBookmark();
		},

		/**
		 * 删除链接
		 * @deprecate 删除链接之后，会选中改链接的文本区域
		 **/
		removeLink: function(){
			var rng = this.editor.getVERange();
			this._enlargeRngToA(rng);

			//特殊情况处理
			if(rng.startContainer == rng.endContainer){
				var start = rng.startContainer.childNodes[rng.startOffset];
				var end = rng.endContainer.childNodes[rng.endOffset];
				var startIndex = ve.dom.nodeIndex(start);
				var endIndex = ve.dom.nodeIndex(end);
				var as = [];

				if(ve.dom.isLinkNode(start)){
					as.push(start);
				}
				if(ve.dom.isLinkNode(end) && start != end){
					as.push(end);
				}
				for(var i=startIndex; i<endIndex; i++){
					var tmp = rng.startContainer.childNodes[i].getElementsByTagName('A') || [];
					as.concat(tmp);
				}

				var bookmark = rng.createBookmark();
				ve.lang.each(as, function(a){
					ve.dom.remove(a, true);
				});
				rng.moveToBookmark(bookmark);
			} else {
				try {
					var bookmark = rng.createBookmark();
					rng.removeInlineStyle(['a']);
					rng.moveToBookmark(bookmark);
				} catch(ex){};
			}

			rng.collapse();
			rng.select();
			this.editor.showStatusbar('链接删除成功', 3);
		},

		/**
		 * 添加、删除链接
		 **/
		adjustLink: function(link){
			if(!link || link.toLowerCase() == 'http://' || link.toLowerCase() == 'mailto:'){
				this.removeLink();
			} else {
				text = link;
				if(link.indexOf('://') > 0 || link.toLowerCase().indexOf('mailto:') == 0){
					//正常行为
				} else if(isMail(link)){
					link = 'mailto:'+link;
				} else {
					link = 'http://' + link;
				}
				this.addLink(link, text);
			}
		},

		/**
		 * 设置面板元素事件
		 * @param {Object} container
		 */
		setupEvent: function(container){
			var _this = this;
			ve.dom.event.add(ve.dom.get('link-val'), 'keydown', function(e){
				var e = e || window.event;
				if(e.keyCode == ve.dom.event.KEYS.RETURN){
					ve.dom.event.preventDefault(e);
					_this.editor.execCommand('adjustLink', ve.dom.get('link-val').value);
					_this.closePanel();
				}
			});

			ve.dom.event.add(ve.dom.get('link-submit-btn'), 'click', function(e){
				_this.editor.execCommand('adjustLink', ve.dom.get('link-val').value);
				_this.closePanel();
			});

			ve.dom.event.add(ve.dom.get('link-remove-btn'), 'click', function(e){
				_this.editor.execCommand('adjustLink');
				_this.closePanel();
			});
		}
	});
	ve.plugin.register('link', VEditor.plugin.link);
}) (VEditor);
(function(ve) {
	var insertedCssLink;
	var _CUR_COLOR = '#000000';

	function loadColorPicker(url, node, editor, onChangeColor, callback){
		var option = {
			defaultTab: 0,
			needFloat: true,
			realtime: false,
			cssText : ''
		};

		var handler = function(){
			var picker = new ColorPicker(node, onChangeColor, option);
			editor.onClick.add(function(){
				picker.hide();
			});

			editor.onBeforeOpenListBox.add(function(){
				picker.hide();
			});

			callback(picker);
		};

		if(window.ColorPicker){
			handler();
		} else {
			ve.net.loadScript(url, handler);
		}
	}

	/**
	 * 前景色
	 */
	ve.lang.Class('VEditor.plugin.Color', {
		init: function (editor, url) {
			var _this = this,
				pickerUrl = ve.getAbsPath('resource/colorpicker/colorpicker.js'),
				pickerCss = ve.getAbsPath('resource/colorpicker/colorpicker.css'),
				colorPicker;

			this.editor = editor;
			this.addCommand();
			this.btn = this.editor.createButton('color', {
				'class': 'veForeColor',
				title: '设置文本颜色'
			});

			this.editor.onInitComplete.add(function(){
				var btnDom = _this.btn.getDom();
				btnDom.innerHTML = '<span class="veColorDropBtn_main"><span class="veColorDropBtn_color" style="background-color:'+_CUR_COLOR+'"></span></span>'+'<span class="veColorDropBtn_drop"></span>';

				var mBtn = btnDom.firstChild, lBtn = btnDom.lastChild;

				ve.dom.event.add(mBtn, 'mouseover', function(){ve.dom.addClass(btnDom, 'veColorDropBtn_hover_main');});
				ve.dom.event.add(mBtn, 'mouseout', function(){ve.dom.removeClass(btnDom, 'veColorDropBtn_hover_main');});
				ve.dom.event.add(mBtn, 'click', function(){_this.editor.execCommand('color', _CUR_COLOR);});

				ve.dom.event.add(lBtn, 'mouseover', function(){ve.dom.addClass(btnDom, 'veColorDropBtn_hover_drop');});
				ve.dom.event.add(lBtn, 'mouseout', function(){ve.dom.removeClass(btnDom, 'veColorDropBtn_hover_drop');});
				ve.dom.event.add(lBtn, 'click', function(){
					if(!colorPicker){
						loadColorPicker(pickerUrl, btnDom, _this.editor, function(color){
							_this.updateControlColor(color);
							_this.editor.execCommand('color', color);
						},
						function(picker){
							colorPicker = picker;
							colorPicker.show();
						}
						);
					} else {
						colorPicker.show();
					}
					if(!insertedCssLink){
						insertedCssLink = true;
						ve.dom.insertCSSLink(pickerCss);
					}
				});
			});
		},

		updateControlColor: function(color){
			_CUR_COLOR = color;
			ve.dom.setStyle(this.btn.getDom().firstChild.firstChild, 'backgroundColor', color);
		},

		addCommand: function(){
			var _this = this;
			_this.editor.addCommand('color', function(color){
				var key = 'color',
					styleVal = color,
					rng = _this.editor.getVERange();

				if(!rng.collapsed){
					var attr = {style:{}};
					attr.style[key] = styleVal;
					rng.setInlineAttr('span', attr);
				} else {
					var curVal = _this.editor.querySelectionStyle(key);
					if(curVal != styleVal){
						var span = rng.doc.createElement('span');
						span.innerHTML = ve.blankChar;
						rng.insertNode(span);

						var node = ve.dom.fixNodeDupParent(span);

						node.style[key] = styleVal;
						rng.selectNodeContents(node);
						rng.collapse(true);
					}
				}
				rng.select();
			});
		}
	});
	ve.plugin.register('color', VEditor.plugin.Color);
})(VEditor);
/**
 * 粘贴处理
 * TODO 里面的大部分的正则都没有做严格匹配，部分代码包含空间逻辑
 * 例如：<\w+[^>]+\s+style=" 这个里面的 ^>是不太准的
 */
(function(ve) {
	//清理内容CACHE，提高速度
	var FILTED_CONTENT_CACHE = {};

	//可移除标签（包含内容）
	var REMOVEABLE_TAGS_N_CONTENT = /^(style|comment|select|option|script|title|head|button)/i;

	//可移除标签（不包含内容）
	var REMOVEABLE_TAGS = /^(!doctype|html|link|base|body|pre|input|frame|frameset|iframe|ilayer|layer|meta|textarea|form|area|bgsound|player|applet|xml)/i;

	//内联方法
	var HIGHT_RISK_INLINE_EVENT = /^(onmouseover|onclick|onload|onmousemove|onmouseout)/i;

	//word class命中
	var WORD_CLASS = /(MsoListParagraph|MsoNormal|msocomoff|MsoCommentReference|MsoCommentText|msocomtxt|blog_details_)/i;

	//class白名单
	var CLASS_WHITELIST = /^(blog_video|blog_music|blog_music_multiple|blog_flash|blog_album)$/i;

	//ID白名单
	var ID_WHITELIST = /^(musicFlash\w*)$/i;

	//内部ID
	var INNER_ID_LIST = /^(veditor_\w*)$/i;

	//内联样式
	var REMOVEABLE_STYLE_KEY = /^(text-autospace|background-color|mso-|layout-grid)/i;
	var REMOVEABLE_STYLE_VAL = /expression/i;

	//忽略过滤属性的标签
	var IGNORE_ATTR_BY_TAG = /^(param|embed|object|video|audio)/i;

	//属性清理
	var REMOVEABLE_ATTR_KEY = /^(lang|eventsListUID)/i;

	//标签判定，该判定不严谨，仅用于标签的内容判定，对于多层嵌套的没有处理
	var TAG_JUDGE = /<([^>\s]+)([^>]*)>([\s\S]*?)<\/\2>(.*)/g;

	//属性切割
	//TODO: 这个切割隔不了 <a title="<img src=Rz!>" contentEditable="false" href="http://user.qzone.qq.com/528968/" target="_blank" uin="528968" unselectable="on">
	var ATTR_SEP_EXP = /([\w\-:.]+)(?:(?:\s*=\s*(?:(?:"([^"]*)")|(?:'([^']*)')|([^\s>]+)))|(?=\s|$))/g;

	//是否清除行高
	var SW_CLEAR_LINE_HEIGHT = false;

	//是否清理id
	var SW_CLEAR_INNER_ID = true;

	//隐藏标签（待清理）
	var COLL_HIDDEN_TAGS = {};

	//是否保留背景色
	//hardcode
	var KEEP_BGC = window.getParameter ? (window.getParameter('synDataKey') == 't2bContent' || window.getParameter('isUgcBlog')) : false;

	ve.lang.Class('VEditor.plugin.XPaste', {
		editor:null,
		url: null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			//添加clearContent外部接口
			editor.cleanString = function(str){
				str = _this.cleanString(str);
				return str;
			};

			//绑定getContent
			editor.onGetContent.add(function(str){
				SW_CLEAR_LINE_HEIGHT = true;
				COLL_HIDDEN_TAGS = {'img':true};
				str = _this.cleanString(str);
				SW_CLEAR_LINE_HEIGHT = false;
				str = filteElement(COLL_HIDDEN_TAGS, str)
				COLL_HIDDEN_TAGS = {};
				return str;
			}, true);

			//绑定粘贴，粘贴时不处理行高
			editor.onAfterPaste.add(function(){
				SW_CLEAR_INNER_ID = false;
				_this.onAfterPasteHandler();
				SW_CLEAR_INNER_ID = true;
			});
		},

		onAfterPasteHandler: function(){
			var body = this.editor.getBody();
			var rng = this.editor.getVERange();
			var bookmark = rng.createBookmark(true, true);
			var str = this.cleanString(body.innerHTML) || this.editor.getEmptyHelperHtml();
			body.innerHTML = str;
			rng.moveToBookmark(bookmark);
			rng.select(true);

			this.editor.updateLastVERange();
		},

		/**
		 * HTML5
		 * 这里禁用webkit是因为webkit如果调用粘贴数据，会被认作为外部调用，
		 * 粘贴内容自动啪上浏览器computed样式
		 *
		onPaste: function(e){
			if(e && e.clipboardData && !ve.ua.webkit){
				str = e.clipboardData.getData('text/html');
				if(str){
					str = this.cleanString(str);
					this.editor.insertHtml({content:str});
					ve.dom.event.preventDefault(e);
				}
			}
		},
		**/

		/**
		 * 清理内容
		 * @param {String} source
		 * @return {String}
		 **/
		cleanString: function(source){
			var _this = this;
			if(FILTED_CONTENT_CACHE[source] !== undefined){
				return FILTED_CONTENT_CACHE[source];
			}

			//临时控制
			KEEP_BGC = this.editor.conf.keepBGC || KEEP_BGC;

			//去换行、去评论、去ie条件方法、去xml标记
			var str = processStrByReg(source, [
				/[\r]/gi,
				/[\n]/gi,
				/<![^>]+>/g,
				/<\??xml[^>]*>/gi,
				/<\/xml>/gi,
				/(\&nbsp;)*$/gi
			]);

			//清理配对标签
			str = this.cleanPairTags(str);

			//office图片保留
			//这里只有ie6需要，其他浏览器已经自动生成了<img>标签
			if(ve.ua.ie){
				str = processStrByReg(str, [[/<v\:imagedata\s([^>]*)>/gi]], this.convOfficeImg);
			}

			//单标签过滤
			str = processStrByReg(str, [[/<\/?([\w|\:]+)[^>]*>/gi]], this.cleanTag);

			//属性清理
			str = processStrByReg(str, [[/<(\w+)\s+([^>]+)>/gi]], function(){
				var args = ve.lang.arg2Arr(arguments);
				return _this.onAttrMatch.apply(_this, args);
			});

			FILTED_CONTENT_CACHE[source] = str;
			return str;
		},

		/**
		 * 清理标签对
		 * @param {String} str
		 * @return {String}
		**/
		cleanPairTags: function(str){
			var _this = this;
			str = str.replace(TAG_JUDGE, function(){
				var args = arguments;
				var match = args[0],
					tag = args[1],
					attr = args[2],
					content = args[3],
					res = args[4];

				if(!ve.dtd[tag.toLowerCase()]){
					return match;
				}

				if(regClone(TAG_JUDGE, 'g').test(res)){
					res = _this.cleanPairTags(res);
				}

				if(REMOVEABLE_TAGS_N_CONTENT.test(tag)){
					//console.log('标签+内容被删除', tag);
					return res;
				} else {
					if(regClone(TAG_JUDGE, 'g').test(content)){
						content = _this.cleanPairTags(content);
					}
					return '<'+tag+attr+'>'+content+'</'+tag+'>'+res;
				}
			});

			//移除没有style属性且没有内容的空div
			str = str.replace(/(<div)([^>]*)(><\/div>)/gi, function(match, p1, attr, p2){
				if(!attr || attr.indexOf('style') < 0){
					//console.log('空div被移除', match);
					return '<br/>';
				} else {
					return p1 + attr + p2;
				}
			});
			return str;
		},

		/**
		 * 修正office图片标签内容
		 * @param {String} match
		 * @param {String} props
		 * @return {String}
		 **/
		convOfficeImg: function(match, props){
			var tmp = /(^|\s)o\:title="([^"]*)"/i.exec(props);
			var title = tmp ? tmp[2] : '';
			var tmp = /(^|\s)src="([^"]*)"/i.exec(props);
			var src = tmp ? tmp[2] : '';
			if(src){
				return '<img src="'+src+'"'+(title ? ' title="'+title+'">' : '>');
			}
			return '';	//match 无法转换的就删除
		},

		/**
		 * 清理标签
		 * @param {String} match
		 * @param {String} tag
		 * @return {String}
		 **/
		cleanTag: function(match, tag){
			if(REMOVEABLE_TAGS.test(tag)){
				//console.log('指定标签被删除', tag);
				return '';
			}
			if(tag.substring(0, 1) != '$' && !ve.dtd[tag.toLowerCase()] && tag.toLowerCase() != 'marquee'){
				//console.log('非html标签被删除',tag);
				return '';
			}
			return match;
		},

		/**
		 * 属性匹配
		 * @param {String} match 命中整个字串
		 * @param {String} tag 标签
		 * @param {String} attrStr 属性字串
		 * @return {String}
		 **/
		onAttrMatch: function(match, tag, attrStr){
			if(IGNORE_ATTR_BY_TAG.test(tag)){
				//console.log('>>>>>>>属性不过滤', tag);
				return match;
			}

			var arr = (' '+attrStr).match(ATTR_SEP_EXP);
			var keepAttrs = {};

			if(arr && arr.length){
				for(var i=0; i<arr.length; i++){
					var spos = arr[i].indexOf('=');
					var key = arr[i].substring(0, spos);
					var val = trimAttr(arr[i].substring(spos+1)) || '';

					switch(key.toLowerCase()){
						case 'id':
							val = this.onIdFilter(tag, val);
							break;

						case 'class':
							val = this.onClassFilter(tag, val);
							break;

						case 'style':
							val = this.onStyleFilter(tag, val);
							break;

						default:
							val = this.onCustomAttrFilter(tag, key.toLowerCase(), val);
					}
					keepAttrs[key] = val;
				}
			}
			var newAttrStr = buildAttrStr(keepAttrs);
			return '<'+tag+newAttrStr+'>';
		},

		/**
		 * 自定义属性过滤
		 * 需要对额外属性进行过滤的，可以放到这里来做
		 * @deprecated 这里居然为了空间的架构，做了表情域名矫正
		 * @param {String} tag
		 * @param {String} key
		 * @param {String} val
		 * @return {String}
		 **/
		onCustomAttrFilter: function(tag, key, val){
			//直出页表情粘贴矫正!
			if(tag.toLowerCase() == 'img' && key.toLowerCase() == 'src'){
				if(val.toLowerCase().indexOf('http://user.qzone.qq.com/qzone/em/') == 0){
					return val.replace(/(http:\/\/)([\w\.]+)(\/)/ig, function($0, $1, $2, $3){
						return $1 + 'i.gtimg.cn'+$3;
					});
				}
			}

			if(HIGHT_RISK_INLINE_EVENT.test(key) || //内联事件过滤
				REMOVEABLE_ATTR_KEY.test(key)		//额外属性过滤
			){
				//console.log('自定义属性被删除', key);
				return null;
			}
			return val;
		},

		/**
		 * id过滤
		 * @param {String} tag 标签
		 * @param {String} id
		 * @return {Mix}
		 **/
		onIdFilter: function(tag, id){
			id = ve.string.trim(id);
			if(INNER_ID_LIST.test(id)){
				return SW_CLEAR_INNER_ID ? null : id;
			}
			if(ID_WHITELIST.test(id)){
				return id;
			}
			return null;
		},

		/**
		 * class过滤
		 * @param {String} tag 标签
		 * @param {String} id
		 * @return {Mix}
		**/
		onClassFilter: function(tag, classStr){
			var clsArr = classStr.split(' ');
			var result = [];
			ve.lang.each(clsArr, function(cls){
				if(CLASS_WHITELIST.test(ve.string.trim(cls))){
					result.push(cls);
				}
			});
			return result.length ? result.join(' ') : null;
		},

		/**
		 * 内联样式过滤
		 * @param {String} tag 标签
		 * @param {String} id
		 * @return {Mix}
		**/
		onStyleFilter: function(tag, styleStr){
			if(!ve.string.trim(styleStr)){
				return styleStr;
			}

			var keepStyles = {};
			var a = splitStyleStr(styleStr);

			//构造style字串
			var _buildStyleStr = function(styles){
				var a = [];
				for(var i in styles){
					if(styles[i]){
						a.push(i + ':'+styles[i]+'');
					}
				}
				return a.join(';');
			};

			var addBGTransparent;
			for(var i=0; i<a.length; i++){
				var str = ve.string.trim(a[i]);
				var pos = str.indexOf(':');
				var key = ve.string.trim(str.substring(0, pos));
				var val = ve.string.trim(str.substring(pos+1));

				//fix 引号在ie下面的转义问题
				if(key.toLowerCase().indexOf('background') == 0){
					val = val.replace(/\"/g, '');
				}

				//只过滤背景色
				if(key.toLowerCase() == 'background' && !KEEP_BGC){
					if(/url|position|repeat/i.test(val)){
						addBGTransparent = true;
					} else {
						val = null;
					}
				}

				//过滤none的结构
				if(key.toLowerCase() == 'display' && val.toLowerCase().indexOf('none') >=0){
					COLL_HIDDEN_TAGS[tag] = true;
				}

				//过滤overflow*:auto, scroll
				if(key.toLowerCase().indexOf('overflow')>=0 && (val.toLowerCase().indexOf('auto') >= 0 || val.toLowerCase().indexOf('scroll') >=0)){
					val = null;
				}

				else if(REMOVEABLE_STYLE_KEY.test(key)||
					REMOVEABLE_STYLE_VAL.test(val) ||
					(SW_CLEAR_LINE_HEIGHT && /^line-height/i.test(key))
				){
					//console.log('删除样式 ',key);
					val = null;
				}
				keepStyles[key] = val;
			}
			if(addBGTransparent){
				keepStyles['background-color'] = 'transparent';
			}
			return _buildStyleStr(keepStyles);
		}
	});
	ve.plugin.register('xpaste', VEditor.plugin.XPaste);

	/**
	 * 去除属性两边的引号、空白字符
	 * @param {String} attr
	 * @return {String}
	 */
	var trimAttr = function(attr){
		attr = ve.string.trim(attr);
		if(/^["|'](.*)['|"]$/.test(attr)){
			return attr.substring(1, attr.length-1);
		}
		return attr;
	};

	/**
	 * 构造attr字串
	 * @param {Array} attrs
	 * @return {String}
	 */
	var buildAttrStr = function(attrs){
		var a = [];
		for(var i in attrs){
			if((i.toLowerCase() != 'class' || i.toLowerCase() != 'style') && !attrs[i]){
				//class、style不允许空串
			}
			else if(attrs[i] === null || attrs[i] === undefined){
				a.push(i);
			} else {
				a.push(i + '="'+attrs[i].replace(/([^\\])"/g, '$1\\"')+'"');
			}
		}
		return (a.length ? ' ' : '')+a.join(' ');
	};

	/**
	 * 处理正则规则
	 * @param {String} str
	 * @param {Array} regItems
	 * @param {Function} onMatch
	 **/
	var processStrByReg = function(str, regItems, onMatch){
		var _this = this;
		for(var i=0; i<regItems.length; i++){
			var v = regItems[i];
			if (v.constructor == RegExp){
				str = str.replace(v, function(){
					if(onMatch){
						return onMatch.apply(_this, arguments);
					}
					return '';
				});
			} else {
				str = str.replace(v[0], function(){
					if(onMatch){
						var arg = arguments;
						return onMatch.apply(_this, arg);
					}
					return arguments[v[1].substring(1)];
					//return v[1]; 这里有点问题。 如果返回$1这种格式貌似不生效
				});
			}
		}
		return str;
	};

	/**
	 * 正则克隆
	 * @param {RegExp} reg
	 * @param {String} option
	 * @return {RegExp}
	 **/
	var regClone = function(reg, option){
		return new RegExp(reg.source, option);
	};

	/**
	 * 分隔属性字符串
	 * @param {String} str
	 * @return {String}
	 **/
	var splitStyleStr = function(str){
		str = str.replace(/&amp;/g, '_veditor_sep_');
		var arr = str.split(';');
		var result = [];
		ve.lang.each(arr, function(item){
			result.push(item.replace(/_veditor_sep_/g, '&amp;'));
		});
		return result;
	};

	/**
	 * 过滤元素：去除隐藏元素，修正本地图片
	 * @param object tags
	 * @param {String} str source string
	 * @return {String};
	 **/
	var filteElement = (function(){
		var _TMP_DIV;
		return function(tags, str){
			if(!_TMP_DIV){
				_TMP_DIV = document.createElement('div');
			}
			_TMP_DIV.innerHTML = str;
			var hit = false;
			ve.lang.each(tags, function(val, tag){
				var nodeList = _TMP_DIV.getElementsByTagName(tag);
				for(var i=nodeList.length-1; i>=0; i--){
					var n = nodeList[i];
					if(n && n.parentNode){
						if(isLocalImg(n) || isSafariTmpImg(n)){
							n.removeAttribute('src');
							n.title = '';
							n.alt = isSafariTmpImg(n) ? '本地图片':'本地图片，请重新上传';
							hit = true;
						}
						else if(n.style.display.toLowerCase() == 'none'){
							ve.dom.remove(n);
							hit = true;
						}
					}
				}
			});
			return hit ? _TMP_DIV.innerHTML : str;
		}
	})();

	/**
	 * safari tmp file
	 * @param {DOM} node
	 * @return {Boolean}
	 */
	var isSafariTmpImg = function(node){
		return node && node.tagName == 'IMG' && /^webkit-fake-url\:/i.test(node.src);
	};

	/**
	 * 本地图片
	 * @param {DOM} node
	 * @return {Boolean}
	 **/
	var isLocalImg = function(node){
		return node && node.tagName == 'IMG' && /^file\:/i.test(node.src);
	};
}) (VEditor);
(function(ve) {
	/**
	 * HTML编辑器
	 */
	ve.lang.Class('VEditor.plugin.Code', {
		editor: null,
		btn: null,
		codeEditorUrl: '',

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.codeEditorUrl = url + 'ace-builds-master/editor.html';
            this.btn = this.editor.createButton('code', {
                'class': 'veCode',
                title: '插入代码',
                cmd: function(){
					_this.showCodeEdtior();
				}
            });
		},

		showCodeEdtior: function(){
			var _this = this;
			var dlg = ve.ui.showPopup('插入代码',{src:this.codeEditorUrl}, 860, 520);
			if(this.popupCallback){
				ve.ui.appendPopupFn(function(){
					return _this.popupCallback();
				});
			}
		},

		popupCallback: function(html, code){
			if(top.VEDITOR_CODE_HTML_CONTENT){
				this.editor.insertHtml({content:top.VEDITOR_CODE_HTML_CONTENT});
				this.editor.conf.keepBGC = true;
			}
		}
	});
	ve.plugin.register('code', VEditor.plugin.Code);
}) (VEditor);
(function(ve) {
	//样式过滤对象规则
	var STYLE_FILTE_KEYS = ['class="blog_music"','class="blog_music_multiple"','class="blog_video"'];

	/**
	 * 一键排版
	 */
	ve.lang.Class('VEditor.plugin.AutoComposing', {
		editor:null,
		btn : null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.btn = editor.toolbarManager.createButton('midCompoing', {
				title: '一键美化排版',
				'class': 'veComposingMiddle',
				"cmd" : function(){_this.composing("middle");}
			});
		},

		processStrByReg: function(str, regItems, onMatch){
			var _this = this;
			for(var i=0; i<regItems.length; i++){
				var v = regItems[i];
				if (v.constructor == RegExp){
					str = str.replace(v, function(){
						if(onMatch){
							return onMatch.apply(_this, arguments);
						}
						return '';
					});
				} else {
					str = str.replace(v[0], function(){
						if(onMatch){
							var arg = arguments;
							return onMatch.apply(_this, arg);
						}
						return arguments[v[1].substring(1)];
					});
				}
			}
			return str;
		},

		clearDom : function(){
			var shell = ve.dom.selector('.autoComposing',this.editor.getBody());
			for(var i = 0;i < shell.length;i ++){
				ve.dom.remove(shell[i],true)
			}
		},

		checkKeyWord : function(str){
			var result = false;
			ve.lang.each(STYLE_FILTE_KEYS, function(key){
				if(str.indexOf(key) >= 0){
					result = true;
					return false;
				}
			});
			return result;
		},

		composing : function(key){
			var _this = this;
			var _width = ve.dom.getSize(_this.editor.getBody())[0];
			var str = _this.editor.getBody().innerHTML;
			//dom清理
			_this.clearDom();
			//属性清理
			str = _this.processStrByReg(str, [[/<(\w+)\s+([^>]+)>/gi]], function(){
				var args = ve.lang.arg2Arr(arguments);
				return _this.onAttrMatch.apply(this, args);
			});
			if(key == "middle"){
				var oriHTML = str;
				var targetHTML = '<div class="autoComposing middle" style="text-align:left;margin:auto;padding:0px 22px 0px 22px;">' + oriHTML + '</div>';
				_this.editor.setContent({content:targetHTML,addHistory:true});
			}
		},

		onAttrMatch: function(match, tag, attrStr){
			var _this = this;
			if(!(_this.checkKeyWord(match))){
				match = match.replace(/style="[^"]*"/i,function(){
					var result = '';
					var _tag = tag.toUpperCase();
					if(_tag == 'I'){
						result = 'style="font-style:normal"';
					}else if(_tag == 'B' || _tag == "STRONG"){
						result = 'style="font-weight:normal"';
					}else if(_tag == 'CENTER'){
					}
					return result;
				});
			}
			if(tag.toUpperCase() == "IMG"){
				if(!isEM(match)){
					match = [
						'<div style="text-align:center">',match,'</div>'
					].join("");
				}
			}
			return match;
		}
	});
	ve.plugin.register('autocomposing', VEditor.plugin.AutoComposing);

	var isEM = function(img){
		var src = /src="([^"]+)"/.exec(img);
		if(src && src[0] && /\/qzone\/em\/[^\"]*/i.test(src[0])){
			return true;
		}
		return false;
	};
})(VEditor);
(function(ve) {
	//匹配要移除的标记
	var REMOVE_TAG_REG = /^(?:B|BIG|CODE|DEL|DFN|EM|FONT|I|INS|KBD|Q|SAMP|SMALL|SPAN|STRIKE|STRONG|SUB|SUP|TT|U|VAR)$/i;
	//要移除的属性样式
	var REMOVE_FORMAT_ATTRIBUTES = ["class", "style", "lang", "width", "height", "align", "hspace", "valign"];
	/**
	 * 移除格式
	 */
	ve.lang.Class('VEditor.plugin.RemoveFormat', {
		editor : null,
		curToolbarMode : 'default',
		init: function ( editor, url ) {

			var _this = this;
			this.editor = editor;
			editor.addCommand('removeformat', function(){
				_this.removeFormat();
			});
			editor.toolbarManager.createButton('removeformat', {
				'class': 'veRemoveFormat',
				title: '清除格式',
				text: '',
				cmd: 'removeformat'
			});
		},
		//执行去格式主函数
		removeFormat : function(){
			var bookmark, node, parent;
			var veRange = this.editor.getVERange();
			bookmark = veRange.createBookmark();
			node = bookmark.start;
			
			/**
			 * 切开始部分
			 * <div>xxx<span>xxxx|xx</span>xxx</div>
			 * 在最近的块元素下切开
			 * <div>xxx<span>xxxx</span>|<span>xx</span></div>
			 */
			while(( parent = node.parentNode ) && !ve.dom.isBlock( parent )){
				veRange.breakParent( node,parent );
				clearEmptySibling( node );
			}
			
			if( bookmark.end ){
				/**
				 * 切结束部分
				 * <div>xxx<span>xxxx|xx</span>xxx</div>
				 * 在最近的块元素下切开
				 * <div>xxx<span>xxxx</span>|<span>xx</span></div>
				 */
				node = bookmark.end;
				
				while(( parent = node.parentNode ) && !ve.dom.isBlock( parent )){
					veRange.breakParent( node, parent );
					clearEmptySibling( node );
				}

				//开始去除样式
				var current = ve.dom.getNextDomNode( bookmark.start, false, filter ),
					next;
				while ( current ) {
					if ( current == bookmark.end ) {
						break;
					}
					next = ve.dom.getNextDomNode( current, true, filter ); //true表示从当前节点的第一个子节点开始找符合条件的节点,false的话从当前节点的下一个节点开始判断
					//ve.dtd.$empty : area:1,base:1,br:1,col:1,hr:1,img:1,input:1,link:1,meta:1,param:1,embed:1,wbr:1
					if ( !ve.dtd.$empty[current.tagName.toUpperCase()] && !veRange.isBookmarkNode( current ) ) {
						if ( REMOVE_TAG_REG.test( current.tagName.toUpperCase() ) ) {
							ve.dom.remove( current, true );
						} else {
							//不能把list上的样式去掉
							if(!ve.dtd.$tableContent[current.tagName.toUpperCase()] && !ve.dtd.$list[current.tagName.toUpperCase()]){
								removeAttributes( current, REMOVE_FORMAT_ATTRIBUTES );
							}
							if ( isRedundantSpan( current ) ){
								ve.dom.remove( current, true );
							}
						}
					}
					current = next;
				}
			}
			var pN = bookmark.start.parentNode;
			
			if( ve.dom.isBlock(pN) && !ve.dtd.$tableContent[pN.tagName.toUpperCase()] && !ve.dtd.$list[pN.tagName.toUpperCase()] ){
				removeAttributes(  pN,REMOVE_FORMAT_ATTRIBUTES );
			}

			if( bookmark.end && ve.dom.isBlock( pN = bookmark.end.parentNode ) && !ve.dtd.$tableContent[pN.tagName.toUpperCase()] && !ve.dtd.$list[pN.tagName.toUpperCase()] ){
				removeAttributes(  pN,REMOVE_FORMAT_ATTRIBUTES );
			}
			veRange.moveToBookmark( bookmark );
			//清除冗余的代码 <b><bookmark></b>
			var node = veRange.startContainer,
				tmp,
				collapsed = veRange.collapsed;
			while( node.nodeType == 1  && ve.dtd.$removeEmpty[node.tagName.toUpperCase()] ){
				tmp = node.parentNode;
				veRange.setStartBefore(node);
				//更新结束边界
				if( veRange.startContainer === veRange.endContainer ){
					veRange.endOffset--;
				}
				ve.dom.remove(node);
				node = tmp;
			}

			if( !collapsed ){
				node = veRange.endContainer;
				while( node.nodeType == 1  && ve.dtd.$removeEmpty[node.tagName.toUpperCase()] ){
					tmp = node.parentNode;
					veRange.setEndBefore(node);
					ve.dom.remove(node);
					node = tmp;
				}
			}
			veRange.select();
		}
	});
	ve.plugin.register('removeformat', VEditor.plugin.RemoveFormat);

	/**
	 * 过滤元素节点
	 */
	var filter = function( node ) {
		return node.nodeType == 1;
	};
	
	/**
	 * @parame next下一个将要删除的元素，当前元素的上一个或者下一个兄弟节点
	 * @parame dir 指定删除前兄弟节点还是后兄弟节点'nextSibling' or 'previousSibling'
	 */
	var clear = function(next, dir) {
		var tmpNode;
		//该节点不是添加的书签，不是列表元素，或者是制表符换行辅助符号
		while (next && !isBookmarkNode(next) && (isEmptyInlineElement(next)
			|| new RegExp('[\t\n\r' + ve.caretChar + ']').test(next.nodeValue) )) {
			tmpNode = next[dir];
			ve.dom.remove(next);
			next = tmpNode;
		}
	};
	/**
	 * 清除node节点左右兄弟为空的inline节点
	 * @name clearEmptySibling
	 * @grammar clearEmptySibling(node)
	 * @grammar clearEmptySibling(node,ignoreNext)  //ignoreNext指定是否忽略右边空节点
	 * @grammar clearEmptySibling(node,ignoreNext,ignorePre)  //ignorePre指定是否忽略左边空节点
	 * @example
	 * <b></b><i></i>xxxx<b>bb</b> --> xxxx<b>bb</b>
	 */
	var	clearEmptySibling = function (node, ignoreNext, ignorePre) {
		!ignoreNext && clear(node.nextSibling, 'nextSibling');
		!ignorePre && clear(node.previousSibling, 'previousSibling');
	};
	/**
	 * 删除节点node上的属性attrNames，attrNames为属性名称数组
	 * @name  removeAttributes
	 * @grammar removeAttributes(node,attrNames)
	 * @example
	 * //Before remove
	 * <span style="font-size:14px;" id="test" name="followMe">xxxxx</span>
	 * //Remove
	 * removeAttributes(node,["id","name"]);
	 * //After remove
	 * <span style="font-size:14px;">xxxxx</span>
	 */
	var	removeAttributes = function ( node, attrNames ) {
		//需要修正属性名的属性
		var attrFix = ve.ua.ie && ve.ua.ie < 9 ? {
				tabindex:"tabIndex",
				readonly:"readOnly",
				"for":"htmlFor",
				"class":"className",
				maxlength:"maxLength",
				cellspacing:"cellSpacing",
				cellpadding:"cellPadding",
				rowspan:"rowSpan",
				colspan:"colSpan",
				usemap:"useMap",
				frameborder:"frameBorder"
			} : {
				tabindex:"tabIndex",
				readonly:"readOnly"
			},
		attrNames = ve.lang.isArray( attrNames ) ? attrNames : ve.string.trim( attrNames ).replace(/[ ]{2,}/g,' ').split(' ');
		for (var i = 0, ci; ci = attrNames[i++];) {
			ci = attrFix[ci] || ci;
			switch (ci) {
				case 'className':
					node[ci] = '';
					break;
				case 'style':
					node.style.cssText = '';
					!ve.ua.ie && node.removeAttributeNode(node.getAttributeNode('style'))
			}
			node.removeAttribute(ci);
		}
	};
	/**
	 * 检查节点node是否是空inline节点
	 * @name  isEmptyInlineElement
	 * @grammar   isEmptyInlineElement(node)  => true|false
	 * @example
	 * <b><i></i></b> => true
	 * <b><i></i><u></u></b> => true
	 * <b></b> => true
	 * <b>xx<i></i></b> => false
	 */
	var	isEmptyInlineElement = function ( node ) {
		if (node.nodeType != 1 || ve.dtd.$removeEmpty[ node.tagName.toUpperCase() ]) {
			return false;
		}
		node = node.firstChild;
		while (node) {
			//如果是创建的bookmark就跳过
			if (isBookmarkNode(node)) {
				return false;
			}
			if (node.nodeType == 1 && !isEmptyInlineElement(node) ||
				node.nodeType == 3 && !isWhitespace(node)
				) {
				return false;
			}
			node = node.nextSibling;
		}
		return true;
	};
	/**
	 * 检测节点node是否为空节点（包括空格、换行、占位符等字符）
	 * @name  isWhitespace
	 * @grammar  isWhitespace(node)  => true|false
	 */
	var	isWhitespace = function ( node ) {
		return !new RegExp('[^ \t\n\r' + ve.caretChar + ']').test(node.nodeValue);
	};
	/**
	 * 检测节点node是否属于bookmark节点
	 * @name isBookmarkNode
	 * @grammar isBookmarkNode(node)  => true|false
	 */
	var	isBookmarkNode = function ( node ) {
		return node.nodeType == 1 && node.id && /^veditor_bookmark_/i.test(node.id);
	};
	/**
	 * 判断node是否为多余的节点
	 * @name isRenundantSpan
	 */
	var	isRedundantSpan = function( node ) {
		if (node.nodeType == 3 || node.tagName.toUpperCase() != 'SPAN'){
			return false;
		}
		if (ve.ua.ie) {
			//ie 下判断失效，所以只能简单用style来判断
			//return node.style.cssText == '' ? 1 : 0;
			var attrs = node.attributes;
			if ( attrs.length ) {
				for ( var i = 0,l = attrs.length; i<l; i++ ) {
					if ( attrs[i].specified ) {
						return false;
					}
				}
				return true;
			}
		}
		return !node.attributes.length;
	};
}) (VEditor);
/**
 * 空间默认表情
 * @author sasumi
 * @build 20110321
 */
(function(ve){
	function getPos(obj) {
	    var obj1 = obj2 = obj;
	    var l =obj.offsetLeft; var t = obj.offsetTop;
	    while (obj1=obj1.offsetParent)
	    	l += obj1.offsetLeft;
	    while (obj2=obj2.offsetParent)
	    	t += obj2.offsetTop;

	    var rg = QZFL.dom.getPosition(obj);
	    return {
	    	top: t,
	    	left: l,
	    	width: rg.width,
	    	height: rg.height
	    };
	}

	/**
	 * 表情库选择器
		*
	 * @namespace
	 * @type
	 */
	var QzoneEmotion = {
		/**
		 * 表情风格存放路径 <br/> 通常显示表情后,都回加载以下路径的表情风格 <br/> themePath + theme + ".js"
			*
		 * @type String
		 */
		_themePath : "http://imgcache.qq.com/qzone/em/theme",

		_emotionList : {},

		/**
		 * 绑定表情按钮
			*
		 * @param {string|element} element 对象或则对象的id
		 * @return QzoneEmotionObject
		 * @see QzoneEmotionObject
		 *      @example
		 *      <br/>
			*
		 * QzoneEmotion.bind("div");<br/>
		 * @return QzoneEmotionPanel
		 */
		bind : function(element, theme, editor) {
			/**
			 * @default "defalut"
			 */
			theme = theme || "default";
			return new QzoneEmotionPanel(element, theme, this._themePath, editor);
		},

		/**
		 * 设置表情风格的主要路径 皮肤的主路径只要设置一次即可,默认是空值 通常QZFL的皮肤都是放在
		 * http://imgcache.qq.com/qzone/em/theme 目录下.
			*
		 * @param {string} path 表情风格主要路径
		 */
		setThemeMainPath : function(path) {
			this._themePath = path;
		},

		/**
		 * 添加表情
			*
		 * @param {string} emotionName 表情名称
		 * @param {object} emotionPackage 表情包
		 */
		addEmotionList : function(emotionName, emotionPackage) {
			this._emotionList[emotionName] = emotionPackage;
		},

		/**
		 * 获取表情包
			*
		 * @param {string} emotionName 表情名称
		 */
		getEmotionPackage : function(emotionName) {
			return this._emotionList[emotionName];
		}
	};

	/**
	 * 表情面板对象
		*
	 * @deprecated 不要直接使用这个构造函数创建对象
	 * @constructor
	 */
	var QzoneEmotionPanel = function(element, theme, themePath, editor) {
		/**
		 * 编辑器对象
		 */
		this.editor = editor;

		/**
		 * 触发表情选择器的按钮对象
		 */
		this.element = element;

		/**
		 * 表情包名称
		 */
		this.theme = theme;

		/**
		 * 表情面板
		 */
		this.panel = null;

		/**
		 * 表情包
		 */
		this.package = null;

		/**
		 * 表情库路径
			*
		 * @ignore
		 * @private
		 */
		this._jsPath = themePath + "/" + this.theme + ".js";

		/**
		 * 表情样式路径
			*
		 * @private
		 */
		this._cssPath = themePath + "/" + this.theme + ".css";

		/**
		 * @private
		 */
		this._emPreview = null;

		/**
		 * @private
		 */
		this._init();

		/**
		 * 选择表情
			*
		 * @event
		 */
		this.onSelect = function(){};

		/**
		 * 当表情框显示后
			*
		 * @param {element} panel 表情面板
		 * @param {element} target 激活表情框的对象
		 * @event
		 */
		this.onShow = function(){};

		/**
		 * 是否隐藏
			*
		 * @type boolean
		 */
		this._isHide = true;
	};

	/**
	 * 初始化表情面板
	 */
	QzoneEmotionPanel.prototype._init = function() {
		this.panel = document.createElement('div');
		this.panel.style.cssText = 'display:none;position:absolute;border:1px solid #999;padding:3px;background:#fff;font-size:12px;;z-index:10001';
		this.panel.className = "qzfl_emotion_panel";
		document.body.appendChild(this.panel);
		ve.dom.event.add(this.element, "click", ve.lang.bind(this, this.show));
		ve.dom.event.add(this.panel, "click", ve.lang.bind(this, this.select));
	};

	/**
	 * 加载表情
	 */
	QzoneEmotionPanel.prototype._loadTheme = function() {
		if (this.package) { // 如果表情包已经添加则直接显示
			this._show();
		} else { // 如果表情包没有加载则自动加载
			this.panel.innerHTML = "正在加载表情...";
			this.panel.style.display = "";
			this.panel.style.position = "absolute";

			var _this = this;
			ve.net.loadScript(this._jsPath, function(){
				_this.package = QzoneEmotion.getEmotionPackage(_this.theme);
				_this._show();
			});
			ve.net.loadCss(this._cssPath);
		}
	};

	/**
	 * 显示表情
		*
	 */
	QzoneEmotionPanel.prototype.show = function(e) {
		this._loadTheme();
		ve.dom.event.preventDefault(e);
	};

	QzoneEmotionPanel.prototype._show = function() {
		// 坐标修正
		this._build();

		var targetPos = getPos(this.element);
		var panelSize = ve.dom.getSize(this.panel);

		var left = targetPos.left,
			top = targetPos.top + targetPos.height;

		//防止iframe覆盖
		if(window.frameElement){
			var frameSize = ve.dom.getSize(frameElement);
			if(targetPos.left + panelSize[0] > frameSize[0]){
				left = frameSize[0] - panelSize[0];
			}
			if(targetPos.top + panelSize[1] > frameSize[1]){
				top = frameSize[1] - panelSize[1];
			}
		}
		this.panel.style.top = top + 'px';
		this.panel.style.left = left + 'px';

		if (!this._bindD) {
			this._bindD = ve.lang.bind(this, this.hide);
			this._bindM = ve.lang.bind(this, this._mousemove);

			ve.dom.event.add(document, "mousedown", this._bindD);
			ve.dom.event.add(document, "mousemove", this._bindM);
		}

		this._isHide = false
		this.onShow(this.panel, this.element);
	};

	/**
	 * 建立表情面板
	 */
	QzoneEmotionPanel.prototype._build = function() {
		var html = ['<div id="emPreview_' + this.theme + '" class="qzfl_emotion_preview_' + this.theme + '" style="display:none"><img src=""/><span></span></div>', '<ul style="width:470px;" class="qzfl_emotion_' + this.theme + '">'];
		for (var i = 0; i < this.package.length; i++) {
			html.push('<li><a href="javascript:;" emotionid="' + i + '" onclick="return false;"><div emotionid="' + i + '" class="icon emotion_' + this.theme + '_' + i + '"></div></a></li>')
		}
		html.push('</ul>');

		this.panel.innerHTML = html.join("");
		this.panel.style.display = "";
		this._lastEmotion = null;
		this._emPreview = ve.dom.get("emPreview_" + this.theme);
		this._emPreImg = this._emPreview.getElementsByTagName("img")[0];
		this._emPreText = this._emPreview.getElementsByTagName("span")[0];
		this._panelPosition = getPos(this.panel);
	};

	/**
	 * 隐藏表情框
	 */
	QzoneEmotionPanel.prototype.select = function(e) {
		var target = ve.dom.event.getTarget(e);
		var _eID = target.getAttribute("emotionid");
		if (_eID) {

			this.onSelect({
				id : _eID,
				fileName : this.package.filename[_eID],
				package : this.package
			});

			this._hide();
		}

		//取消浏览器的默认事件
		ve.dom.event.preventDefault(e);
	};

	/**
	 * 鼠标移动
	 */
	QzoneEmotionPanel.prototype._mousemove = function(e) {
		var target = ve.dom.event.getTarget(e);
		var _eID = target.getAttribute("emotionid");

		if (ve.dom.isAncestor(this.panel, target)) {
			if (_eID && this._lastEmotion != _eID) {
				this._emPreview.style.display = "";
				this._lastEmotion = _eID;

				// 修正预览框位置
				if (ve.dom.event.mouseX(e) < this._panelPosition.left + this._panelPosition.width / 2) {
					this._emPreview.style.left = "";
					this._emPreview.style.right = "3px";
				} else {
					this._emPreview.style.left = "3px";
					this._emPreview.style.right = "";
				}

				this._emPreImg.src = this.package.filename[_eID];
				this._emPreText.innerHTML = this.package.titles[_eID] || "";
			}
		} else {
			this._lastEmotion = null;
			this._emPreview.style.display = "none";
		}
	};

	/**
	 * 隐藏表情框
	 */
	QzoneEmotionPanel.prototype.hide = function(e) {
		if (this._isHide) {
			return;
		}

		var target = ve.dom.event.getTarget(e);
		if (target == this.panel || ve.dom.isAncestor(this.panel, target)) {

		} else {
			this._hide();
		}
	};

	/**
	 * 隐藏表情框
		*
	 * @ignore
	 * @see QzoneEmotionPanel.prototype.hide
	 */
	QzoneEmotionPanel.prototype._hide = function() {
		this.panel.style.display = "none";
		this._emPreview = null;
		ve.dom.event.remove(document, "mousedown", this._bindD);
		ve.dom.event.remove(document, "mousemove", this._bindM);
		delete this._bindD;
		delete this._bindM;
		this._isHide = true;
	};

	//非QZONE环境适配
	window.QZONE = window.QZONE || {widget:{}};
	if(!QZONE.widget){
		QZONE.widget = {emotion:QzoneEmotion};
	} else {
		QZONE.widget.emotion = QzoneEmotion;
	}

	var HOST = 'http://i.gtimg.cn';
	if(!window.imgcacheDomain){
		window.imgcacheDomain = 'i.gtimg.cn';
	}

	if(window.imgcacheDomain){
		if(imgcacheDomain.indexOf('http://') == 0){
			HOST = imgcacheDomain;
		} else {
			HOST = 'http://'+imgcacheDomain;
		}
	}

	ve.lang.Class('VEditor.plugin.Emotion', {
		bEmotionLoaded: false,
		editor: null,
		emotionPanel: null,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.btn = this.editor.createButton('emotion', {
				'class': 'veEmotion',
				title: '表情',
				cmd: function(){
					if(!_this.emotionPanel){
						_this.emotionPanel = QzoneEmotion.bind(_this.btn.getDom(), null, _this.editor);
						_this.emotionPanel.onSelect = function(imgObj){
							_this.execute(imgObj);
						};
						_this.emotionPanel.show();
					}
				}
			});
			this.editor.onClick.add(function(){_this.hide()});
		},

		execute: function(emoObj){
			if(emoObj){
				var src = emoObj.fileName;
				if(src.indexOf('/') == 0){
					src = HOST + src;
				}
				var title = emoObj.package.titles[emoObj.id];
				var html = '<img src="'+src+'" alt="'+title+'" />&nbsp;';
				this.editor.insertHtml({content:html});
			}
		},

		show: function(){
			_this._waitingPanel.style.display = "none";

		},

		hide: function(){
			if(this.emotionPanel){
				this.emotionPanel.hide();
			}
		}
	});
	ve.plugin.register('emotion', VEditor.plugin.Emotion);
})(VEditor);
/**
 * SOSO表情插件
 * @author sasumi
 * @build 20110321
 */
(function(ve){
	var HOST = 'http://i.gtimg.cn';
	if(window.imgcacheDomain){
		if(imgcacheDomain.indexOf('http://') == 0){
			HOST = imgcacheDomain;
		} else {
			HOST = 'http://'+imgcacheDomain;
		}
	}

	ve.lang.Class('VEditor.plugin.SOSOEmotion', {
		bEmotionLoaded: false,
		btnElement: null,
		editor: null,
		//jsPath: 'http://image.soso.com/js/sosoexp_platform.js',
		jsPath: 'http://pic.sogou.com/js/sosoexp_platform.js',

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.btn = this.editor.createButton('emotion', {
				'class': 'veEmotion',
				title: '表情',
				cmd: function(){
					_this.btnElement = _this.btn.getDom();
					_this.show();
				}
			});

			this.editor.onClick.add(function(){_this.hide()});
		},

		show: function(){
			var _this = this;

			//木有加载过文件
			if(typeof SOSO_EXP !== "object"){
				QZFL.imports(this.jsPath, function(){
					if(typeof SOSO_EXP === "object") {
						SOSO_EXP.Register(30001, 'qzone', _this.btnElement, 'bottom', _this.editor, function(a,b){
							_this.insertEmotion(b);
						});
						_this.btnElement.setAttribute('binded', '1');
						SOSO_EXP.Platform.popupBox(_this.btnElement);
					}
				});
			}

			//木有绑定过事件
			else if(!_this.btnElement.getAttribute('binded')){
				SOSO_EXP.Register(30001, 'qzone', _this.btnElement, 'bottom', _this.editor, function(a,b){
					_this.insertEmotion(b);
				});
				SOSO_EXP.Platform.popupBox(_this.btnElement);
			}
		},

		/**
		 * 插入soso表情
		 * @param {String} sosoEmotionUrl soso表情地址
		 **/
		insertEmotion: function(sosoEmotionUrl){
			sosoEmotionUrl = sosoEmotionUrl.replace(/^http:\/\/cache.soso.com\/img\/img\/e(\d{1,3}).gif/gi, "/qzone/em/e$1.gif");  // 替换默认表情
			if(sosoEmotionUrl.indexOf('/') == 0){
				sosoEmotionUrl = HOST + sosoEmotionUrl;
			}
			var html = '<img src="'+sosoEmotionUrl+'"/>&nbsp;';
			this.editor.insertHtml({content:html});
		},

		/**
		 * 隐藏表情，由于表情那边木有提供相关关闭窗口的接口，
		 * 当前只能这么干干了。
		 */
		hide: function(){
			if(typeof(SOSO_EXP) == 'object'){
				SOSO_EXP.Platform.hideBox();
			}
		}
	});
	ve.plugin.register('sosoemotion', VEditor.plugin.SOSOEmotion);
})(VEditor);
(function(ve){
	var IN_PENGYOU = QZBlog.Logic.isInPengyou;
	var TOP_WIN = QZONE.FP._t;
	var TOP_DOC = TOP_WIN.document;
	var pQZFL = TOP_WIN.QZFL;
	var LAST_TOOLBAR_TOP = 0;

	var FAKE_MASK_ID = 'qzoneblog_veditor_fake_mask';
	var TOP_EDITOR_CSS_LNKID = 'qzoneblog_veditor_css_link';
	var TOP_EDITOR_BASE_TB_LNKID = 'qzoneblog_base_tb_link';
	var TOP_EDITOR_ADV_TB_LNKID = 'qzoneblog_adv_tb_link';

	var GLOBAL_CSS = '/qzone/veditor/release/view/def/css/global.css';
	var BASE_TB_CSS = '/qzone/veditor/release/plugins/toolbarswitcher/base.css';
	var ADV_TB_CSS = '/qzone/veditor/release/plugins/toolbarswitcher/advance.css';

	//原有css保存
	var toolbarContainerOriCss;
	var toolbarOriCss;
	var statusBarOriCss;
	var statusBarTimer;

	/**
	 * 工具条滚动功能
	 * @deprecated 该插件仅在空间·日志应用内有效
	 */
	ve.lang.Class('VEditor.plugin.QzoneBlogToolbarPin', {
		editor: null,

		_toolbarMode: false,
		_isFullScreen: false,
		_isPreivewing: false,
		_isInHtmlMode: false,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			if(!editor.conf.toolbarPin){
				return;
			}

			//小窝模式, iphone & ipad下不滚动
			if(getSpaceMode() == 1 || isOldXWMode() || ve.ua.isiPhone || ve.ua.isiPad){
				return;
			}

			if(QZFL.css.hasClassName(document.body, 'mode_page_app_fullscreen')){	//全屏模式下面不需要滚动功能
				return;
			}

			PageScheduler.addEvent('doSubmitBlog', function(){
				_this.updateFakeMaskState();
			});

			PageScheduler.addEvent('afterDoPreviewBlog', function(){
				_this._isPreivewing = true;
				_this.updateFakeMaskState();
			});

			PageScheduler.addEvent('cancelpreview', function(){
				_this._isPreivewing = false;
				_this.updateFakeMaskState();
			});

			PageScheduler.addEvent('pageunload', function(){
				_this._removeFakeMask();
			});

			editor.tryIO('onAfterToggleScreen', function(ev){
				ev.add(function(toFull){
					_this._isFullScreen = toFull;
					_this.updateFakeMaskState();
				})
			});

			editor.tryIO('onAfterSwitchToolbar', function(ev){
				ev.add(function(toAdv){
					_this._toolbarMode = toAdv;
					_this.updateFakeMaskState();
				});
			});

			editor.tryIO('onAfterToggleHtmlState', function(ev){
				ev.add(function(toHtml){
					_this._isInHtmlMode = toHtml;
					_this.updateFakeMaskState();
				});
			});

			editor.onClick.add(function(){
				_this.hideFakeMask();
				_this.showToolbar();
			});

			editor.onInitComplete.add(function(){
				setTimeout(function(){
					if(!parent.VEDITOR_TOOLBAR_PIN){
						var loader = new parent.QZFL.JsLoader();	//这里只能用loader，需要强制重新加载一次
						loader.onload = function(){
							if(parent.VEDITOR_TOOLBAR_PIN){
								parent.VEDITOR_TOOLBAR_PIN.onScroll = function(ev){
									_this.startToolbarScroll(ev, _this);
								};
								parent.VEDITOR_TOOLBAR_PIN.start();
							};
						};
						loader.load(url+'scroll.js', null, {"charset":"utf-8"});
					} else {
						parent.VEDITOR_TOOLBAR_PIN.start();
					}
				}, 300);
			});
		},

		/**
		 * 更新假工具条的状态
		 * @return {Boolean} false表示假工具条停止
		 */
		updateFakeMaskState: function(){
			if(this._isInHtmlMode || this._isPreivewing || this._isFullScreen){
				this.hideFakeMask();
				this.restoreToolbar();
				return false;
			} else {
				this._updateFakeMask();
			}
		},

		_fakeMask: null,
		_createFakeMask: function(){
			var _this = this;
			if(this._fakeMask){
				this._updateFakeMask();
				return this._fakeMask;
			}

			this._fakeMask = TOP_DOC.createElement('DIV');
			this._fakeMask.id = FAKE_MASK_ID;
			this._fakeMask.style.cssText = 'border-bottom:1px solid #ccc; background-color:#eee';
			frameElement.parentNode.appendChild(this._fakeMask);

			TOP_WIN.QZFL.css.insertCSSLink(GLOBAL_CSS+'?r='+Math.random(), TOP_EDITOR_CSS_LNKID);

			this.editor.tryIO('onAfterSwitchToolbar', function(ev){
				TOP_WIN.QZFL.css.insertCSSLink(BASE_TB_CSS+'?r='+Math.random(), TOP_EDITOR_BASE_TB_LNKID);
				TOP_WIN.QZFL.css.insertCSSLink(ADV_TB_CSS+'?r='+Math.random(), TOP_EDITOR_ADV_TB_LNKID);
			});

			ve.dom.setStyle(this._fakeMask, {
				position:'fixed',
				left: '50%',
				marginLeft: '-'+(886/2)+'px',
				width: 886,
				display:'none'
			});
			this._updateFakeMask();

			ve.dom.event.addEvent(this._fakeMask, 'mouseover', function(){
				_this.hideFakeMask();
				_this.showToolbar();
			});

			return this._fakeMask;
		},

		_removeFakeMask: function(){
			if(this._fakeMask){
				ve.dom.remove(this._fakeMask);
				ve.dom.remove(TOP_WIN.$(TOP_EDITOR_CSS_LNKID));
				ve.dom.remove(TOP_WIN.$(TOP_EDITOR_BASE_TB_LNKID));
				ve.dom.remove(TOP_WIN.$(TOP_EDITOR_ADV_TB_LNKID));
			}
		},

		/**
		 * 更新假工具条，包括位置、样式和内容
		 */
		_updateFakeMask: function(){
			if(this._fakeMask){
				var _tmp = TOP_DOC.getElementById('QZ_Toolbar_Container');	//这里不是很好， 但是平台没有提供方法
				var _t = 41;
				if(_tmp){
					_t = ve.dom.getSize(_tmp)[1] + (parseInt(_tmp.style.marginTop) || 0);
				}

				var _bg_pos = this._toolbarMode ? '0 0' : '0 -62px';
				ve.dom.setStyle(this._fakeMask, {
					top: _t,
					backgroundPosition: _bg_pos
				});

				//update content
				while(this._fakeMask.lastChild){
					ve.dom.remove(this._fakeMask.lastChild);
				}
				var toolbarContainer = this.editor.toolbarContainer.parentNode.parentNode;
				var newTC = toolbarContainer.cloneNode(true);
				var toolbar = newTC.getElementsByTagName('DIV')[0];
				toolbar.style.top = '';
				toolbar.style.visibility = '';
				toolbar.style.position = '';
				toolbar.style.zIndex = '';
				newTC.style.borderBottom = '1px solid white';
				try {
					this._fakeMask.appendChild(newTC);
				} catch(ex){
					//ie7
				}
			}
		},

		hideFakeMask: function(){
			if(this._fakeMask){
				this._fakeMask.style.display = 'none';
			}
		},

		showFakeMask: function(){
			if(this._fakeMask){
				this._fakeMask.style.display = '';
			}
		},

		showToolbar: function(){
			var toolbar = this.editor.toolbarContainer.parentNode;
			var statusBar = ve.dom.get('blog-editor-status');
			toolbar.style.visibility = 'visible';
			statusBar.style.visibility ='visible';
		},

		hideToolbar: function(){
			var toolbar = this.editor.toolbarContainer.parentNode;
			toolbar.style.visibility = 'hidden';
		},

		restoreToolbar: function(){
			var toolbar = this.editor.toolbarContainer.parentNode,
			toolbarContainer = toolbar.parentNode,
			editorContainer = this.editor.iframeContainer.parentNode,
			statusBar = ve.dom.get('blog-editor-status');

			if(toolbarContainerOriCss !== undefined){
				toolbarContainer.style.cssText = toolbarContainerOriCss;
			}

			if(toolbarOriCss !== undefined){
				toolbar.style.cssText = toolbarOriCss;
			}

			if(statusBarOriCss !== undefined){
				statusBar.style.cssText = statusBarOriCss;
			}
		},

		startToolbarScroll: function(ev, _this){
			var fakeMask;
			var toolbar = _this.editor.toolbarContainer.parentNode,
				statusBar = ve.dom.get('blog-editor-status'),
				toolbarContainer = toolbar.parentNode,
				editorContainer = _this.editor.iframeContainer.parentNode;

			if(_this.updateFakeMaskState() === false){
				return;
			}

			var toolbarContainerSize = ve.dom.getSize(toolbarContainer),
				toolbarContainerPos = ve.dom.getXY(toolbarContainer),
				toolbarSize = ve.dom.getSize(toolbar),
				editorContainerSize = ve.dom.getSize(editorContainer),
				editorContainerPos = ve.dom.getXY(editorContainer),
				xy = ve.dom.getXY(IN_PENGYOU ? frameElement : frameElement.parentNode.parentNode);

			if(statusBarOriCss === undefined){
				statusBarOriCss = statusBar.style.cssText || '';
			}

			if(toolbarContainerOriCss === undefined){
				toolbarContainerOriCss = toolbarContainer.style.cssText || '';
			}
			if(toolbarOriCss === undefined){
				toolbarOriCss = toolbar.style.cssText || '';
			}

			//ie6 不提供遮罩假工具条
			if(ve.ua.ie != 6 && TOP_WIN.QZONE.navigationBar){
				fakeMask = _this._createFakeMask();
				fakeMask.style.display = '';
			}

			//防止页面切换等不可见情况
			if(!!toolbarContainerSize && toolbarContainerSize[1] && toolbarContainerSize[0] && !_this.isPreviewing){
				var initTop = toolbarContainerPos[1] + xy[1];			//初始高度 = 工具条容器位置
				var maxTop = editorContainerPos[1] + editorContainerSize[1] + xy[1] - toolbarSize[1] - 80;	//最大高度

				//固定toolbar宽度，防止100%扩展
				ve.dom.setStyle(toolbar, {width:toolbarSize[0]});

				var curScrollTop = getScrollTop();
				//console.log('curScrollTop,',curScrollTop, 'initTop,',initTop, 'maxTop', maxTop);
				if(curScrollTop > initTop && curScrollTop < maxTop){
					if(LAST_TOOLBAR_TOP != curScrollTop){
						if(fakeMask){
							_this.hideToolbar();
							_this.showFakeMask();
							fakeMask.style.display = '';
						}
					}
					LAST_TOOLBAR_TOP = curScrollTop;

					//固定toolbarcontainer的宽度和高度：占位
					ve.dom.setStyle(toolbarContainer, {width:toolbarContainerSize[0], height:toolbarContainerSize[1]});
					ve.dom.setStyle(toolbar, {position:'absolute',zIndex: 12,top:(curScrollTop-xy[1])});
					ve.dom.setStyle(statusBar, {position:'absolute', visibility:'hidden', width:'886px', zIndex:11, top:(curScrollTop-xy[1]) + ve.dom.getSize(toolbar)[1]});
					clearTimeout(statusBarTimer);
					statusBarTimer = setTimeout(function(){
						ve.dom.setStyle(statusBar, 'visibility', 'visible');
					}, 1000);
				} else {
					ve.dom.setStyle(toolbarContainer, {height:'auto'});
					ve.dom.setStyle(toolbar, {position:'relative',top:'auto'});
					statusBar.style.cssText = statusBarOriCss;
					if(fakeMask){
						_this.showToolbar();
						_this.hideFakeMask();
					}
				}
			} else {
				if(fakeMask){
					_this.hideFakeMask();
				}
				statusBar.style.cssText = statusBarOriCss;
			}
		}
	});
	ve.plugin.register('qzoneblogtoolbarpin', VEditor.plugin.QzoneBlogToolbarPin);

	/**
	 * 获取上滚top
	 * @return {Number}
	 */
	var getScrollTop = function(){
		var curScrollTop = QZONE.FP.getScrollTop();
		if(!IN_PENGYOU) {
			if(ve.ua.ie != 6){
				var _tmp = TOP_DOC.getElementById('QZ_Toolbar_Container');	//这里不是很好， 但是平台没有提供方法
				var _tp = 41;
				if(_tmp){
					_tp = ve.dom.getSize(_tmp)[1] + (parseInt(_tmp.style.marginTop) || 0);
				}
				curScrollTop = QZONE.FP.getScrollTop() + _tp;	//加上置顶工具条高度(IE6顶部工具条不滚动)
			} else {
				if(getSpaceMode() == 4){
					curScrollTop += 32;
				}
			}
		}
		return curScrollTop;
	}

	/**
	 * 获取空间模式
	 * @return {Number}
	 */
	var getSpaceMode = function(){
		var q = QZONE.FP.getQzoneConfig();
		if (TOP_WIN.g_OFPLite || TOP_WIN.g_isLite) {
			return 4;
		}
		if(!q.full){
			return 1;
		}
		if(q.wide){
			return 3;
		}
		return 2
	};

	/**
	 * 是否为旧版的小窝模式
	 * @return {Boolean}
	 */
	var isOldXWMode = function(){
		var v6xws = false;
		try {v6xws = !!TOP_WIN.QZONE.dressDataCenter.isOldXWMode();} catch(ex){}
		return v6xws;
	}
})(VEditor);

(function(ve){
	var KEYS = ve.dom.event.KEYS;
	var UTF8_SPACE = decodeURI('%C2%A0');
	var LINE_HEIGHT = 20;
	var TIP_CLASS = 'veditor_mention_tips';
	var LINK_CLASS = 'q_namecard c_tx';

	ve.dom.insertStyleSheet(null, [
			'.veditor_mention_tips .current {background-color:#CCE5FA} ',
			'.veditor_mention_tips img {vertical-align:middle; height:30px; width:30px; margin-right:5px}',
			'.veditor_mention_tips li {cursor:pointer;padding:2px 5px; margin:0; white-space:nowrap}'
		].join(''));

	/**
	 * Qzone @功能，该插件仅在qzone环境下有效，其他独立环境（包括朋友网）未部署相应的后台cgi
	 * @deprecated @功能采用按键输入上下文检测，因此不能输入空格作为检测的一部分，@标记为链接，识别字段为uin
	 */
	ve.lang.Class('VEditor.plugin.QzoneMention', {
		editor: null,
		maxFilterCount: 5,
		tip: null,
		inputing: false,
		className: 'qzone_mention_user',

		friendList: [],
		lastRegion: null,

		/**
		 * 插件初始化
		 * @param {object} editor
		 * @param {string} url
		 */
		init: function (editor, url) {
			if(!QZONE.FP.getFriendList){
				throw("qzonemention require QZONE.FP.getFriendList");
			}
			var _this = this;
			this.editor = editor;

			//[fix] ie下会将 abc@a这种转换成为邮箱地址,关闭IE地址自动转换功能
			if(ve.ua.ie && ve.ua.ie >= 9){
				this.editor.onInitComplete.add(function(){
					_this.editor.getDoc().execCommand("AutoUrlDetect", false, false);
				});
			}

			//对外方法
			this.editor.addIO('onAddMentionUsers', new ve.EventManager(this.editor));
			this.editor.addIO('onRemoveMentionUsers', new ve.EventManager(this.editor));
			this.editor.addIO('onInsertMentionUser', new ve.EventManager(this.editor));
			this.editor.addIO('getMentionUinList', function(){return _this.getMentionUinList();});
			this.editor.addIO('getMentionUserList', function(callback){return _this.getMentionUserList(callback);});
			this.editor.addIO('getUsersInfoFromUins', function(uins, callback){
				if(!uins.length){
					callback([]);
					return;
				}
				_this.getFriendList(function(){
					var result = [];
					ve.lang.each(uins, function(uin){
						var info = _this.getUserInfoFromCache(uin);
						if(info){
							result.push(info);
						}
					});
					callback(result);
				})
			});

			var _lastUserList = [];
			var _settingContent = false;

			this.editor.onAfterSetContent.addLast(function(str){
				_lastUserList = _this.getMentionUinList();
				_settingContent = true;
			});

			this.editor.onAfterUpdateVERangeLazy.add(function(){
				if(_settingContent){
					_settingContent = false;
					return;
				}
				var userList = _this.getMentionUinList();
				var removedUserList = getRemovedUserList(userList,_lastUserList);
				var addedUserList = getAddedUserList(userList,_lastUserList);
				_this.editor.tryIO('onAddMentionUsers', function(ev){ev.fire(_this, addedUserList);});
				_this.editor.tryIO('onRemoveMentionUsers', function(ev){ev.fire(_this, removedUserList);});
				_lastUserList = userList;
			});

			//首次输入@字符
			var _firstInsAt;

			//在好友列表里面进行键盘快捷操作，如方向键和回车键
			//这里把控制事件放入keyDown, 提前到其他类似updaterange, history前面
			this.editor.onKeyDown.addFirst(function(e){
				if(e.keyCode == 50 && e.shiftKey){
					_firstInsAt = true;
					return;
				}

				//up, down, tab
				if(_this.inputing){
					if(e.keyCode == KEYS.UP || e.keyCode == KEYS.DOWN || e.keyCode == KEYS.TAB){
						_this.movePanelIndex(e.keyCode == KEYS.DOWN || e.keyCode == KEYS.TAB);
						ve.dom.event.preventDefault(e);
						return false;
					} else if(e.keyCode == KEYS.RETURN){
						var lis = _this.tip.getElementsByTagName('li');
						var uin;
						ve.lang.each(lis, function(li){
							if(ve.dom.hasClass(li, 'current')){
								uin = li.getAttribute('uin');
								return false;
							}
						})
						if(uin){
							var userInfo = _this.getUserInfoFromCache(uin);
							if(userInfo){
								_this.insertMetionUser(userInfo);
								_this.hideTip();
								ve.dom.event.preventDefault(e);
								return false;
							}
						}
					}
				}
			});

			//KEY KEYS.UP
			this.editor.onKeyUp.addLast(function(e){
				//输入@的时候获取@的位置信息
				if(_firstInsAt){
					var rng = _this.editor.getVERange();
					var bookmark = rng.createBookmark();
					var st = bookmark['start'];
					st.style.cssText = 'inline-block;width:1px; height:1px; padding:1px;';
					var r = ve.dom.getRegion(st);
					_this.lastRegion = {left:r.left, top:r.top};
					rng.moveToBookmark(bookmark);
					_firstInsAt = false;
					return;
				}

				if(!e.ctrlKey && !e.shiftKey &&
					e.keyCode != 17 &&
					e.keyCode != KEYS.UP &&
					e.keyCode != KEYS.DOWN &&
					e.keyCode != KEYS.RETURN &&
					e.keyCode != KEYS.TAB &&
					e.keyCode != KEYS.ESC){
					_this.detectStr();
				} else if(e.keyCode == KEYS.ESC){
					_this.hideTip();
				}
			});

			//PASTE
			this.editor.onAfterPaste.addLast(function(){
				_this.detectStr();
			});

			//鼠标点击，关闭tip
			this.editor.onMouseDown.add(function(){
				_firstInsAt = false;
				_this.lastRegion = null;
				_this.hideTip();
			});

			//MOUSE UP
			this.editor.onMouseUp.addLast(function(ev){
				//[fix 右键使得ie range混乱]
				if(ve.dom.event.getButton(ev) == 0){
					setTimeout(function(){
						_this.detectStr();
					}, 50);
				}
			});

			//打开菜单
			this.editor.onBeforeOpenListBox.add(function(){
				_this.hideTip();
			});

			//before toggle html state
			this.editor.tryIO('onBeforeToggleHtmlState', function(ev){
				ev.add(function(){
					_this.hideTip();
				});
			});
		},

		/**
		 * 获取当前@用户号码列表
		 * @return {Array}
		 */
		getMentionUinList: function(){
			var _this = this, result = [], uinList = [],
				as = this.editor.getDoc().getElementsByTagName('A');
			ve.lang.each(as, function(a){
				var linkAttr = a.getAttribute('link');
				var uin = a.getAttribute('uin');
				if(!uin && linkAttr){
					var linkTxt = a.innerHTML.replace(ve.fillCharReg, '');
					if(linkTxt.substring(0,1) == '@'){
						uin = linkAttr.replace(/namecard_/ig, '');
					}
				}
				if(uin){
					uinList.push(uin);
				}
			});
			return uinList;
		},

		/**
		 * 获取当前编辑器插入@用户列表
		 * @param {Function} callback
		 */
		getMentionUserList: function(callback){
			var _this = this,
				uinList = this.getMentionUinList();
			if(uinList.length){
				this.getFriendList(function(){
					ve.lang.each(uinList, function(uin){
						var info = _this.getUserInfoFromCache(uin);
						if(info){
							result.push(info);
						}
					});
					callback(result);
				})
			} else {
				callback([]);
			}
		},

		/**
		 * 检测@字串
		 */
		detectStr: function(){
			var _this = this;
			var aStr = this.getMentionStr();
			if(aStr == '@'){
				this.inputing = true;
				this.getFriendList(function(){
					_this.showTip('请输入好友号码、昵称或备注');
				});
			} else if(aStr){
				this.inputing = true;
				this.getFriendList(function(friendList){
					var html = _this.srchFriendList(aStr.substring(1), friendList);
					if(html){
						_this.showTip(html, true);
					}
				});
			} else {
				this.hideTip();
			}
		},

		/**
		 * 获取当前焦点所在文本的@字串
		 * @return {String}
		 */
		getMentionStr: function(){
			var rng = this.editor.getVERange();
			if(!rng.collapsed || ignoreLinkNode(rng)){
				return '';
			}
			var pStr = _getStrLeft(rng);
			var nStr = ''; //暂不支持
			return _parseMentionStr(pStr, nStr);
		},

		/**
		 * 插入@用户
		 * @param  {Object} userInfo
		 */
		insertMetionUser: function(userInfo){
			var rng = this.editor.getVERange();
			var bookmark = rng.createBookmark();
			this.editor.tryIO('addHistory', function(fn){return fn()});

			var sc = rng.startContainer,
				so = rng.startOffset,
				link;

			if(sc.nodeType == 1){
				if(!so){
					link = sc.tagName == 'A' ? sc : null;
				} else {
					var n = sc.childNodes[so-1];
					if(n.nodeType == 3){
						link = sc.tagName == 'A' ? sc : null;
					}
				}
			} else if(sc.nodeType == 3){
				link = sc.parentNode.tagName == 'A' ? sc.parentNode : null;
			}

			var foundLink = link;
			if(!link){
				cutStr(bookmark.start, 'previousSibling');
				link = rng.doc.createElement('A');
			}

			link.href = 'http://user.qzone.qq.com/'+userInfo.uin+'/';
			link.className = LINK_CLASS;
			link.target = '_blank';
			link.setAttribute('uin', userInfo.uin);
			link.setAttribute('link', 'nameCard_'+userInfo.uin);
			link.innerHTML = '@'+(userInfo.name || userInfo.memo);

			//当前节点非link，则插入一个
			if(!foundLink){
				ve.dom.insertBefore(link, bookmark.start);
				var sep = rng.doc.createElement('span');
				sep.innerHTML = '&nbsp;';
				ve.dom.insertBefore(sep, bookmark.start);
				ve.dom.remove(sep, true);
				rng.moveToBookmark(bookmark);
				rng.select();
			} else {
				rng.setStartAfter(link);
				rng.collapse(true);
				rng.select();
			}
			this.editor.updateLastVERange();
			this.editor.tryIO('onInsertMentionUser', function(ev){
				return ev.fire(this.editor, userInfo);
			});
		},

		/**
		 * 获取当前光标位置
		 * @return {[type]} [description]
		 */
		getCurrentCaretRegion: function(){
			var region = this.lastRegion;
			var left = 0, top = 0;

			if(!region){
				var rng = this.editor.getVERange();
				if(rng.collapsed){
					var bookmark = rng.createBookmark();
					bookmark.start.style.display = 'inline-block';
					region = ve.dom.getRegion(bookmark.start);
					top = region.top;
					left = region.left;
					rng.moveToBookmark(bookmark);
					rng.select(true);
					this.lastRegion = region;
				}
			} else {
				left = region.left;
				top = region.top;
			}

			if(this.editor.iframeElement){
				var frameRegion = ve.dom.getRegion(this.editor.iframeElement);
				if(frameRegion){
					top += frameRegion.top
					left += frameRegion.left;
				}
			}
			return {left:left, top:top};
		},

		/**
		 * 显示@的tip
		 * @param  {String} str
		 * @param  {Boolean} bList 是否显示为列表
		 */
		showTip: function(str, bList){
			this.inputing = bList;
			var _this = this;
			if(!this.tip) {
				this.tip = document.createElement("div");
				this.tip.className = TIP_CLASS;
				this.tip.style.cssText = "position:absolute;display:none;border:1px solid #71c3f2;background-color:#d7ecff;background-color:rgba(215,236,255,0.9);-moz-border-radius: 3px;	-webkit-border-radius: 3px; color:#000A11;font-size:12px;z-index:9999;";
				document.body.appendChild(this.tip);

				ve.dom.event.add(this.tip, 'click', function(e){
					var tag = ve.dom.event.getTarget(e);
					var li = ve.dom.getParent(tag, function(n){
						return n.tagName == 'LI';
					});
					if(li){
						var uin = li.getAttribute('uin');
						if(uin){
							var userInfo = _this.getUserInfoFromCache(uin);
							if(userInfo){
								_this.insertMetionUser(userInfo);
								_this.hideTip();
							}
						}
					}
					ve.dom.event.preventDefault();
				})
			}

			this.tip.style.display = "";
			this.tip.innerHTML = str;

			var posInfo = this.getCurrentCaretRegion();
			var tipSize = ve.dom.getSize(this.tip);

			if(window.frameElement){
				var frameSize = ve.dom.getSize(window.frameElement);
				if(posInfo){
					var left = (posInfo.left + tipSize[0] > frameSize[0]) ? (frameSize[0] - tipSize[0]) : posInfo.left;
					var top = (posInfo.top + tipSize[1] > frameSize[1]) ? (posInfo.top - tipSize[1] - 5) : posInfo.top+LINE_HEIGHT;

					this.tip.style.left = left+ "px";
					this.tip.style.top = top+ "px";
				}
			} else {
				if(posInfo){
					this.tip.style.left = posInfo.left + "px";
					this.tip.style.top = (posInfo.top + LINE_HEIGHT) + "px";
				}
			}
		},

		/**
		 * 隐藏tip
		 */
		hideTip: function(){
			if(this.tip){
				this.tip.style.display = 'none';
				this.inputing = false;
			}
		},

		/**
		 * 移动面板聚焦index
		 * @param  {Boolean} bDown 是否为向下
		 */
		movePanelIndex: function(bDown){
			if(this.tip){
				var lis = this.tip.getElementsByTagName('LI');
				var idx;
				ve.lang.each(lis, function(li, i){
					if(ve.dom.hasClass(li, 'current')){
						idx = i;
						return false;
					}
				});

				ve.dom.removeClass(lis[idx], 'current');

				var nextIdx = 0;
				if(bDown){
					nextIdx = idx == (lis.length-1) ? 0 : (idx+1);
				} else {
					nextIdx = idx == 0 ? (lis.length-1) : idx - 1;
				}
				ve.dom.addClass(lis[nextIdx], 'current');
			}
		},

		/**
		 * 从cache里面获取用户信息
		 * @param {Number} uin
		 * @param {String} userName 用户昵称
		 * @return {Object}
		 */
		getUserInfoFromCache: function(uin, userName){
			if(!uin && !userName){
				return null;
			}
			userName = ve.string.trim(userName) || '';
			var userInfo = null;
			ve.lang.each(this.friendList, function(user){
				//UIN 判定 || 用户名（需要去除头尾空格，因为QQ昵称是可以插入空格的，所以这里就不再做更严格的校验了
				if(user.uin == uin || (userName && ve.string.trim(user.name) == userName)){
					userInfo = user;
					return false;
				}
			});
			return userInfo;
		},

		/**
		 * 查询好友关键字命中
		 * @param  {String} srchKey
		 * @param  {Object} friendList
		 * @return {String}
		 */
		srchFriendList: function(srchKey, allFriendList){
			var _this = this;
			var friendList = [];
			var _tmp = {};
			ve.lang.each(allFriendList, function(friend){
				if(friendList.length == _this.maxFilterCount) {
					return false;
				}
				if([friend["uin"],friend["name"].toRealStr(),(friend["memo"] || "")].join("").toLowerCase().indexOf(srchKey.toLowerCase()) != -1){
					_tmp[friend.uin] = true;
					friendList.push(friend);
				}
			});
			ve.lang.each(allFriendList, function(friend){
				if(friendList.length == _this.maxFilterCount) {
					return false;
				}
				if(!_tmp[friend.uin] && [(friend["namePY"] || '').toRealStr(),(friend["memoPY"] || '').toRealStr()].join("").toLowerCase().indexOf(srchKey.toLowerCase()) != -1) {
					_tmp[friend.uin] = true;
					friendList.push(friend);
				}
			});

			if(!friendList.length){
				this.hideTip();
				return;
			}

			var strHTML = '<ul>';
			for(var i=0; i<friendList.length; ++i) {
				strHTML += '<li uin="'+friendList[i].uin+'"'+(i==0?'class="current"' :'')+'>';
				strHTML += '<img alt="用户头像" src="'+QZBlog.Util.PortraitManager.getPortraitUrl(friendList[i]["uin"],30)+'" />';

				if(friendList[i]["memo"]) {
					pos = friendList[i]["memo"].toRealStr().indexOf(srchKey);
					if(pos != -1) {
						strHTML += '<span>' + friendList[i]["memo"].toRealStr().substr(0, pos).toInnerHTML() +
							"<b>" + srchKey.toInnerHTML() + "</b>" + friendList[i]["memo"].toRealStr().substr(pos+srchKey.length).toInnerHTML() + '</span>';
					}
					else {
						strHTML += '<span>'+friendList[i]["memo"].toRealStr().toInnerHTML()+'</span>';
					}
				}

				var pos = friendList[i]["name"].toRealStr().indexOf(srchKey);
				if(pos != -1) {
					strHTML += '<span>' + (friendList[i]["memo"] ? '[' : '') + friendList[i]["name"].toRealStr().substr(0, pos).toInnerHTML() +
						"<b>" + srchKey.toInnerHTML() + "</b>" + friendList[i]["name"].toRealStr().substr(pos+srchKey.length).toInnerHTML() + (friendList[i]["memo"] ? ']' : '') +  '</span>';
				} else {
					strHTML += '<span>'+ (friendList[i]["memo"] ? '[' : '') + friendList[i]["name"]+ (friendList[i]["memo"] ? ']' : '') + '</span>';
				}

				strHTML += '(<span>'+(friendList[i]["uin"]+"").replace(srchKey, "<b>"+srchKey+"</b>")+'</span>)';
				strHTML += '</li>';
			}
			strHTML += '</ul>';
			return strHTML;
		},

		/**
		 * 获取好友列表
		 * @param  {Function} callback
		 */
		_getting: false,
		_lastResult: 0,
		getFriendList: function(callback){
			var _this = this;

			if(this._getting){
				this.showTip('正在加载好友信息');
				setTimeout(function(){
					_this.getFriendList(callback);
				}, 100);
				return;
			}
			if(this._lastResult === -1){
				this.hideTip();
				return;
			} else if(this._lastResult == 1){
				callback(this.friendList);
				return;
			}

			this._getting = true;
			QZONE.FP.getFriendList(QZONE.FP.getQzoneConfig().loginUin, function(data){
				_this.hideTip();
				_this._getting = false;
				if(!data) {
					_this._lastResult = -1;
					_this.showTip('网络繁忙，暂时无法加载好友信息');
					return;
				}
				_this._lastResult = 1;
				for(var i=0; i<data.items.length; i++){	//转换到memo字段
					data.items[i].memo = data.items[i].realname;
				}
				counvertMemoToPinYin(data.items, function(result){
					_this.friendList = result;
					callback(result);
				});
			});
		}
	});
	ve.plugin.register('qzonemention', VEditor.plugin.QzoneMention);

	/**
	 * 转换用户数据到拼音字段
	 * @param  {Array}   userList
	 * @param  {Function} callback
	 */
	var counvertMemoToPinYin = function(userList, callback){
		var handler = function(){
			for(var i=0; i<userList.length; i++){
				userList[i]['namePY'] = QZFL.widget.pinyin.convertPYs(userList[i]["name"]).join("\n");
				userList[i]['memoPY'] = QZFL.widget.pinyin.convertPYs(userList[i]["memo"]).join("\n");
			}
			callback(userList);
		}
		if(QZFL.widget.pinyin) {
			handler();
		} else {
			var jsLoader = new QZFL.JsLoader();
			jsLoader.onload = function(){handler();};
			jsLoader.load('http://' + parent.siDomain + '/qzone/v5/qzonesoso/js/pinyin.js', document, 'UTF-8');
			jsLoader = null;
		}
	};


	/**
	 * 检测空格的索引号，包括UTF8空格
	 * @param  {String} str
	 * @return {Number}
	 */
	var indexOfSpace = function(str){
		var p1 = str.indexOf(' ');
		var p2 = str.indexOf(UTF8_SPACE);

		if(p1 >=0 && p2 >= 0){
			return Math.min(p1, p2);
		} else {
			return Math.max(p1, p2);
		}
	};

	/**
	 * 是否忽略当前链接节点
	 * @param  {Range} rng
	 * @return {Boolean}
	 */
	var ignoreLinkNode = function(rng){
		var sc = rng.startContainer,
			so = rng.startOffset,
			chkNode = null;

		if(sc.nodeType == 1){
			chkNode = !so ? sc : sc.childNodes[so];
		} else if(sc.nodeType == 3){
			chkNode = sc.parentNode;
		}
		while(chkNode && chkNode.nodeType == 3){
			chkNode = chkNode.previousSibling || chkNode.parentNode;
		}
		return ve.dom.isLinkNode(chkNode);
	};

	//非分隔节点
	var isTextNode = function(n){
		return n && (n.nodeType == 3 || n.style.display.toLowerCase() == 'none');
	};

	/**
	 * 是否为@链接
	 * @param  {DOM}  n
	 * @return {Boolean}
	 */
	var isMentionLink = function(n){
		return n && n.nodeType == 1 && n.getAttribute('uin');
	}

	/**
	 * 从Range左边获取字符串
	 * @param {Range} rng
	 * @return {String}
	 */
	var _getStrLeft = function(rng){
		var sc = rng.startContainer,
			so = rng.startOffset,
			bn = null,
			retVal = '';

		if(sc.nodeType == 1){
			if(!so){
				return '';
			} else {
				var n = sc.childNodes[so-1];
				while(n && n.nodeType == 3){
					retVal = n.nodeValue + retVal;
					n = n.previousSibling;
				}
			}
		} else if(sc.nodeType == 3){
			retVal = sc.nodeValue.substring(0, so);
			var n = sc.previousSibling;
			while(n && n.nodeType == 3){
				retVal = n.nodeValue + retVal;
				n = n.previousSibling;
			}
		}
		return retVal;
	};

	/**
	 * 从左右字符串里面获取@字符串
	 * @param  {String} pStr 左边字符串
	 * @param  {String} nStr 右边字符串
	 * @return {String}
	 */
	var _parseMentionStr = function(pStr, nStr){
		var atIdx = pStr.lastIndexOf('@');
		pStr = pStr.substring(atIdx);
		if(atIdx >=0 && indexOfSpace(pStr) < 0){	//前置字串不需要检测空格
			var endIdx = nStr.length;
			var _s;
			var p1 = indexOfSpace(nStr),
				p2 = nStr.indexOf('@');
			if(p1>=0 && p2>=0){
				_s = Math.min(p1, p2);
			} else {
				_s = Math.max(p1, p2);
			}
			if(_s >= 0){
				endIdx = _s;
			}
			//这里trim是为了去除 blankChar
			//去除'主要是为了QQ拼音输入这种，会插入单引号
			return ve.string.trim(pStr + nStr.substring(0, endIdx)).replace(/\'/g,'');
		}
		return '';
	};

	/**
	 * 清理非@功能需要的字符
	 * @param  {DOM} start 开始节点
	 * @param  {String} ltr   方向
	 */
	var cutStr = function(start, ltr){
		var node = start[ltr];
		while(node){
			if(node.nodeType == 3){
				if(node.nodeValue.lastIndexOf('@') >= 0){
					var pos = node.nodeValue.lastIndexOf('@');
					node.nodeValue = node.nodeValue.substring(0,pos);
					break;
				} else {
					if(ltr == 'nextSibling' && indexOfSpace(node.nodeValue) >= 0){
						node.nodeValue = node.nodeValue.substring(0, indexOfSpace(node.nodeValue));
						break;
					} else {
						var tmp = node[ltr];
						ve.dom.remove(node);
						node = tmp;
					}
				}
			} else {
				break;
			}
		}
	};


	/** 获取用户删除的@用户列表
	 * @param  {Array} curUserList
	 * @param  {Array} _lastUserList
	 * @return {Array}
	 */
	var getRemovedUserList = function(curUserList, _lastUserList){
		var result = [];
		for(var i=0; i<_lastUserList.length; i++){
			var found = false;
			for(var j=0; j<curUserList.length; j++){
				if(curUserList[j] == _lastUserList[i]){
					found = true;
					break;
				}
			}
			if(!found){
				result.push(_lastUserList[i]);
			}
		}
		return result;
	}

	/**
	 * 获取用户添加的@用户列表
	 * @param  {Array} curUserList
	 * @param  {Array} _lastUserList
	 * @return {Array}
	 */
	var getAddedUserList = function(curUserList, _lastUserList){
		var result = [];
		for(var i=0; i<curUserList.length; i++){
			var found = false;
			for(var j=0; j<_lastUserList.length; j++){
				if(curUserList[i] == _lastUserList[j]){
					found = true;
					break;
				}
			}
			if(!found){
				result.push(curUserList[i]);
			}
		}
		return result;
	};
})(VEditor);
(function(ve){
	var NORMAL = 0;
	var FULLSCREEN = 1;
	var IN_FULL_PREVIEW = false;
	var TOFULL_TXT = '进入全屏模式';
	var TONORMAL_TXT = '退出全屏';

	var TOP_WIN = QZONE.FP._t;
	var TOP_HTML = TOP_WIN.document.body.parentNode;
	var TOP_HTML_STYLE_STR_CACHE = '';
	var TOP_WIN_RESIZE_BINDED;

	var ORI_AUTO_ADJUST_FN;
	var ORI_PREVIEW_DIV_STYLE;
	var ORI_PAGECONTAINER_STYLE;

	var IE6_HANDLER = function(){
		QZBlog.Util.popupDialog('浏览器升级', {src:'/qzone/app/blog/dialog/browserupdate.html'},  450, 210);
	};

	/**
	 * 空间日志全屏插件
	 * 依赖FP全屏方法
	 */
	ve.lang.Class('VEditor.plugin.QzoneFullScreen', {
		editor: null,
		button: null,
		curState: NORMAL,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.button = this.editor.createButton('fullscreen', {
				'class': 'veFullScreen',
				title: TOFULL_TXT,
				text: '<b>'+TOFULL_TXT+'</b>',
				cmd: function(){
					if(ve.ua.ie == 6){
						IE6_HANDLER();
					} else {
						_this.toggleFullScreen();
					}
				}
			});

			if(ve.ua.ie == 6){
				return;
			}

			editor.addIO('toggleScreen', function(bFullScreen, callback){
				_this.toggleFullScreen(bFullScreen ? FULLSCREEN : NORMAL, callback);
			});
			editor.addIO('onAfterToggleScreen', new ve.EventManager(editor));

			editor.tryIO('onAfterSwitchToolbar', function(ev){
				ev.add(function(){
					if(_this.curState == FULLSCREEN){
						_this.toggleFullScreen(FULLSCREEN);
					}
				});
			});

			PageScheduler.addEvent('pageunload', function(){
				if(_this.curState == FULLSCREEN){
					_this.toggleFullScreen(NORMAL);
				}
			});

			PageScheduler.addEvent('afterDoPreviewBlog', function(){
				if(_this.curState == FULLSCREEN){
					_this._toPreviewState();
				}
			});

			PageScheduler.addEvent('cancelpreview', function(){
				IN_FULL_PREVIEW = false;
				if(_this.curState == FULLSCREEN){
					_this.toggleFullScreen(FULLSCREEN);
					_this._exitPreviewState();
				}
			});

		},

		/**
		 * 全屏切换
		 * @param  {Boolean}   toState
		 * @param  {Function} callback
		 */
		toggleFullScreen: function(toState, callback){
			var _this = this;
			callback = callback || function(){};
			toState = toState === undefined ? (_this.curState == NORMAL ? FULLSCREEN : NORMAL) : toState;
			var toFull = toState == FULLSCREEN;
			var dom = _this.button.getDom();
			var txt = dom.getElementsByTagName('B')[0];

			ve.dom[toFull ? 'addClass' : 'removeClass'](dom, 'veToNormalScreen');
			dom.title = toFull ? TONORMAL_TXT : TOFULL_TXT;
			txt.innerHTML = toFull ? TONORMAL_TXT : TOFULL_TXT;
			ve.dom[toFull ? 'addClass' : 'removeClass'](document.body, 'veditor_fullscreen');
			_this.curState = toState;

			//cache editor origional resize method
			if(!ORI_AUTO_ADJUST_FN){
				ORI_AUTO_ADJUST_FN = _this.editor.resize;
			}

			_this._toggleAppFullScreen(toFull, function(){
				if(!IN_FULL_PREVIEW){
					_this.editor.resize = toFull ? function(){return _this._editorResize();} : ORI_AUTO_ADJUST_FN;
					_this[toFull ? '_editorResize' : '_editorRestore']();
				}
				callback(toState);

				_this.editor.tryIO('onAfterToggleScreen', function(ev){
					ev.fire(_this.editor, toState);
				})
			});
		},

		/**
		 * 恢复编辑器初始高度
		 */
		_editorRestore: function(){
			var contentHeight = this.editor.getContentHeight();
			this.editor.setHeight(contentHeight);
		},

		/**
		 * 编辑器在全屏下的resize方法
		 */
		_editorResize: function(){
			var t = this.editor, b = t.getBody();

			t.iframeContainer.style.height = 'auto';	//这个已经没有作用。 高度完全有iframe自身决定
			b.style.overflow = 'hidden';

			var h = this._getEditorAreaHeight();
			t.setHeight(h);
		},

		/**
		 * 全屏下切换到预览状态
		 */
		_toPreviewState: function(){
			IN_FULL_PREVIEW = true;
			var previewDiv = ve.dom.get('previewDiv');
			document.body.style.paddingTop = '0';

			if(ORI_PREVIEW_DIV_STYLE === undefined){
				ORI_PREVIEW_DIV_STYLE = previewDiv.style.cssText || '';
			}
			previewDiv.style.cssText = 'padding: 10px 0; height:'+(this._getScreenHeight(true)-25) + 'px; overflow-y:auto; overflow-x:hidden';
		},

		/**
		 * 全屏下退出预览状态
		 */
		_exitPreviewState: function(){
			var previewDiv = ve.dom.get('previewDiv');
			previewDiv.style.cssText = ORI_PREVIEW_DIV_STYLE + '; display:none';
		},

		/**
		 * 获取全屏编辑器下，编辑区域的最小高度，以保证填满整个屏幕
		 * @return {Number}
		 */
		_getEditorAreaHeight: function(){
			var pageContainer =  ve.dom.get('pageContainer');
			var editorFrame = this.editor.iframeElement;

			//编辑器内容iframe高度
			var frameHeight = ve.dom.getSize(editorFrame)[1];

			//编辑器内容iframe距离顶部高度
			var frameTop = ve.dom.getXY(editorFrame)[1];

			//编辑器内容高度
			var contentHeight = this.editor.getContentHeight();

			//页面内容高度
			var conHeight = ve.dom.getSize(pageContainer.getElementsByTagName('div')[0])[1];

			//底部“设置”那一坨的高度
			var bottomHeight = conHeight - frameTop - frameHeight;

			//页面屏幕高度
			var pageHeight = this._getScreenHeight();

			//console.log('pageHeight:', pageHeight, ' conHeight:', conHeight, ' contentHeight:',contentHeight, ' frameHeight:', frameHeight);

			//真实内容页面高度
			var realHeight = conHeight + contentHeight - frameHeight;
			if(realHeight > pageHeight){
				return contentHeight;
			} else {
				return pageHeight - frameTop - bottomHeight - 5;
			}
		},

		/**
		 * 屏幕高度
		 * @deprecated 这里需要剪掉为工具条滚动预留位置的高度
		 * @param {Boolean} ignoreToolbarHeight 是否忽略工具条高度
		 * @return {Number}
		 */
		_getScreenHeight: function(ignoreToolbarHeight){
			return QZONE.FP._t.QZFL.dom.getClientHeight() - (ignoreToolbarHeight ? 0 : this._getToolbarHeight());
		},

		_getToolbarHeight: function(){
			return ve.dom.getSize(this.editor.toolbarContainer)[1];
		},

		_topWinResizeHandler: function(ev, _this){
			if(_this.curState == FULLSCREEN){
				_this.toggleFullScreen(FULLSCREEN);
			}
		},

		/**
		 * 切换APP的到全屏状态
		 * @param  {Boolean} toFull
		 * @param {Function} callback
		 */
		_toggleAppFullScreen: function(toFull, callback){
			var _this = this;
			var pageContainer = ve.dom.get('pageContainer');

			if(ORI_PAGECONTAINER_STYLE === undefined){
				ORI_PAGECONTAINER_STYLE = pageContainer.style.cssText || '';
			}

			if(toFull){
				TOP_WIN.scrollTo(0);
				QZBlog.Util.showMsgbox('正在切换到全屏模式', 0,1000);
				QZONE.FP.enterFullScreenMode(function(){
					QZBlog.Util.hideMsgbox();

					if(!IN_FULL_PREVIEW){
						pageContainer.style.cssText = 'height:'+_this._getScreenHeight() + 'px; overflow-x:auto; overflow-y:scroll';
						document.body.style.paddingTop = _this._getToolbarHeight() + 'px';
					} else {
						ve.dom.get('previewDiv').style.height = (_this._getScreenHeight(true)-25) + 'px';
					}

					if(TOP_HTML_STYLE_STR_CACHE === undefined){
						TOP_HTML_STYLE_STR_CACHE = TOP_HTML.style.cssText || '';
					}
					TOP_HTML.style.cssText = 'overflow:hidden';

					if(!TOP_WIN_RESIZE_BINDED){
						TOP_WIN_RESIZE_BINDED = true;
						TOP_WIN.QZFL.event.addEvent(TOP_WIN, 'resize', _this._topWinResizeHandler, [_this]);
					}
					callback();
				});
			} else {
				//debug
				QZONE.FP.withdrawFullScreenMode();
				pageContainer.style.cssText = ORI_PAGECONTAINER_STYLE;

				document.body.style.paddingTop = '0';

				TOP_HTML.style.cssText = TOP_HTML_STYLE_STR_CACHE;
				TOP_WIN.QZFL.event.removeEvent(TOP_WIN, 'resize', _this._topWinResizeHandler);
				TOP_WIN_RESIZE_BINDED = false;
				callback();
			}
		}
	});
	ve.plugin.register('qzonefullscreen', VEditor.plugin.QzoneFullScreen);
})(VEditor);
/**
 * 图片工具条插件
 * 包括图片混排，插入图片链接
 * TIPS: 当前图文混排结构在IE6下面有点问题
 * @author sasumi
 * @build 20110321
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.ImageTools', {
		toolbar: null,
		editor: null,
		curImg: null,

		init: function(editor, url){
			var _this = this;
			this.editor = editor;

			//这里使用mouseup，因为VERange是在mouseup的时候更新的，
			//因为理论上这里也有可能在update之前生效的功能，
			this.editor.onMouseUp.addLast(function(e){
				var tag = ve.dom.event.getTarget(e);
				if(tag.tagName != 'IMG'){
					_this.curImg = null;
					_this.hideTools();
					return;
				}
				if(!_this.checkImageEditAviable(tag)){
					ve.dom.event.preventDefault(e);
					_this.hideTools();
					return;
				}
				_this.curImg = tag;
				_this.showTools();
			});

			ve.dom.event.add(document.body, 'click', function(){
				_this.hideTools();
			});

			this.editor.onKeyDown.add(function(e){
				_this.hideTools();
			});

			//去除多余的自定义属性
			//这块数据前期还是需要保留的。
			/**
			this.editor.onGetContent.add(function(str){
				str = str.replace(/<img([^>]+)>/ig, function(){
					try{
						var att = arguments[1].replace(/originHeight=[^\s^>]+/gi, '');
							att = att.replace(/originWidth=[^\s^>]+/gi, '');
						return '<img'+att+'>';
					} catch(err){
						console.log('err', err);
					}
				});
				return str;
			}, true);
			**/
		},

		/**
		 * 过滤可编辑图片格式
		 * @param {Object} node
		 * @return {Object}
		 */
		checkImageEditAviable: function(node){
			if( !node.tagName == 'IMG' ||
				/em\/e(\d{1,3}).gif/i.test(node.src) ||	//表情
				/blog_music/i.test(node.className) || 	//音乐
				/blog_video/i.test(node.className) ||
				/blog_flash/i.test(node.className)
			){
				return false;
			}
			return true;
		},

		/**
		 * 显示工具条
		 */
		showTools: function(){
			var _this = this;
			if(!this.toolbar){
				this.toolbar = document.createElement('div');
				document.body.appendChild(this.toolbar);
				this.toolbar.className = 'qzEditor_tips pic_tips';
				this.toolbar.innerHTML = ([
					'<ul class="pic_function" id="qzEditor_tips_pic_function">',
						'<li class="father_button pic_position">',
							'<a title="编辑图片位置" class="main_btn first" href="javascript:;">',
								'<span class="icon_sprite icon_pic_position"></span><em class="none">编辑图片位置</em>',
							'</a>',
							'<ol class="dropdown_functions">',
								'<li><a href="javascript:;" id="_pic_func_align_reset"><span class="icon_sprite icon_pic_reset"></span><em class="text_intro">默认</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_left"><span class="icon_sprite icon_pic_left"></span><em class="text_intro">居左</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_center"><span class="icon_sprite icon_pic_center"></span><em class="text_intro">居中</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_right"><span class="icon_sprite icon_pic_right"></span><em class="text_intro">居右</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_round_left"><span class="icon_sprite icon_pic_left_round"></span><em class="text_intro">居左环绕</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_round_right"><span class="icon_sprite icon_pic_right_round"></span><em class="text_intro">居右环绕</em></a></li>',
							'</ol>',
						'</li>',
						'<li class="father_button pic_size">',
							'<a title="编辑图片大小" class="main_btn first" href="javascript:;">',
								'<span class="icon_sprite icon_pic_size"></span><em class="none">编辑图片大小</em>',
							'</a>',
							'<ol class="dropdown_functions">',
								'<li><a href="javascript:;" id="_pic_func_original"><span class="icon_sprite icon_size_default"></span><em class="text_intro">默认</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_big"><span class="icon_sprite icon_size_full"></span><em class="text_intro">大</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_middle"><span class="icon_sprite icon_size_bigger"></span><em class="text_intro">中</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_small"><span class="icon_sprite icon_size_smaller"></span><em class="text_intro">小</em></a></li>',
							'</ol>',
						'</li>',
						'<li class="father_button pic_link ">',
							'<a class="main_btn" title="插入图片链接地址" href="javascript:;">',
								'<span class="icon_sprite icon_pic_link"></span><span class="none">插入图片链接地址</span>',
							'</a>',
							'<div class="dropdown_functions pic_link_item ">',
								'<strong class="title">链接地址:</strong>',
								'<input type="text" class="url"  style="padding:2px 1px; border:1px solid #bbb; border-right-color:#ddd; border-bottom-color:#ddd; border-radius:3px" id="_pic_func_link" value="http://"/>',
								'<input type="button" style="height:20px; width:40px; margin-left:5px;" value="设置" id="_pic_func_setLink_btn" />',
								'<input type="button" style="height:20px; width:40px; margin-left:5px;" value="删除" id="_pic_func_removeLink_btn" />',
							'</div>',
						'</li>',
					'</ul>'
				]).join('');
				var btns = ve.dom.get('qzEditor_tips_pic_function').getElementsByTagName('A');
				for(var i=0; i<btns.length; i++){
					if(ve.dom.hasClass(btns[i], 'main_btn')){
						var li = btns[i].parentNode;
						ve.dom.event.add(li, 'mouseover', function(){
							ve.dom.addClass(this, 'current');
							this.setAttribute('_hover', '1');
						});
						ve.dom.event.add(li, 'mouseout', function(){
							var _this = this;
							setTimeout(function(){
								if(!_this.getAttribute('_hover')){
									ve.dom.removeClass(_this, 'current');
								}
							},500);
							_this.removeAttribute('_hover', '1');
						});
						ve.dom.event.add(li, 'click', function(e){
							this.setAttribute('_hover', '1');
							ve.dom.event.cancel(e);
							return false;
						});
					}
				}

				//绑定调整位置事件
				ve.dom.event.add(ve.dom.get('_pic_func_align_reset'), 'click', function(){_this.setImgAlign(_this.curImg, 'full');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_left'), 'click', function(){_this.setImgAlign(_this.curImg, 'left');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_center'), 'click', function(){_this.setImgAlign(_this.curImg, 'center');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_right'), 'click', function(){_this.setImgAlign(_this.curImg, 'right');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_round_left'), 'click', function(){_this.setImgRound(_this.curImg, 'roundLeft');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_round_right'), 'click', function(){_this.setImgRound(_this.curImg, 'roundRight');});

				//调整大小
				ve.dom.event.add(ve.dom.get('_pic_func_original'), 'click', function(){_this.setImgSize(_this.curImg);});
				ve.dom.event.add(ve.dom.get('_pic_func_big'), 'click', function(){_this.setImgSize(_this.curImg, 800);});
				ve.dom.event.add(ve.dom.get('_pic_func_middle'), 'click', function(){_this.setImgSize(_this.curImg, 500);});
				ve.dom.event.add(ve.dom.get('_pic_func_small'), 'click', function(){_this.setImgSize(_this.curImg, 300);});

				ve.dom.event.add(ve.dom.get('_pic_func_link'), 'keydown', function(e){
					if(e.keyCode == 13 && _this.curImg){
						_this.editor.execCommand('adjustLink',ve.dom.get('_pic_func_link').value);
						_this.hideTools();
					}
				});

				ve.dom.event.add(ve.dom.get('_pic_func_setLink_btn'), 'click', function(){
					if(_this.curImg){
						_this.editor.execCommand('adjustLink', ve.dom.get('_pic_func_link').value);
					}
					_this.hideTools();
				});
				ve.dom.event.add(ve.dom.get('_pic_func_removeLink_btn'), 'click', function(){
					if(_this.curImg){
						_this.editor.execCommand('adjustLink', '');
					}
					_this.hideTools();
				});
			}

			//初始化链接事件
			setTimeout(function(){
				_this.initLink();
			}, 10);
			this.updateToolsPosition(this.curImg);
		},

		/**
		 * 设置图片大小
		 * @param {object} img 图片对象
		 * @param {integer} boxSize 缩放容器的大小
		 */
		setImgSize: function(img, boxSize){
			this.editor.tryIO('addHistory', function(fn){return fn()});

			var oriH = img.getAttribute('originHeight') || img.height;
				oriH = parseInt(oriH, 10);
			var oriW = img.getAttribute('originWidth') || img.width;
				oriW = parseInt(oriW, 10);

			if(!boxSize){
				img.style.height = oriH + 'px';
				img.style.width = oriW + 'px';
			} else {
				img.style.width = boxSize + 'px';
				img.style.height = Math.ceil(boxSize*oriH/oriW) + 'px';
			}

			img.setAttribute('originHeight', oriH);
			img.setAttribute('originWidth', oriW);

			this.editor.tryIO('addHistory', function(fn){return fn()});

			this.updateToolsPosition(img);
			this.editor.resize();
			ve.dom.event.preventDefault();
		},

		/**
		 * 初始化链接事件
		 * @param {Object} img
		 */
		initLink: function(){
			var img = this.curImg;
			var link = ve.dom.getParent(img, function(node){
				if(node.tagName == 'A'){return true;}
			});

			if(ve.dom.isLinkNode(link)){
				ve.dom.get('_pic_func_link').value = link.href;
			} else {
				ve.dom.get('_pic_func_link').value = 'http://';
			}
		},

		/**
		 * 设置图片排版方式
		 * @param {Object} img
		 * @param {String} align
		 */
		setImgRound: function(img, align){
			var STYLE_HASH = {
				'roundLeft': {'float':'left'},
				'roundRight': {'float':'right'}
			};

			this.editor.tryIO('addHistory', function(fn){return fn()});
			ve.dom.setStyles(img,STYLE_HASH[align]);
			this.editor.tryIO('addHistory', function(fn){return fn()});

			this.updateToolsPosition(img);
			ve.dom.event.preventDefault();
		},

		/**
		 * 设置图片排版方式
		 * @param {DOM} img
		 * @param {String} align, left, right, center, full
		 **/
		setImgAlign: function(img, align){
			ve.dom.setStyles(img, {'float':'none'});
			this.editor.execCommand('justify'+align);
			this.updateToolsPosition(img);
			ve.dom.event.preventDefault();
		},

		/**
		 * 隐藏工具条
		 */
		hideTools: function(){
			if(this.toolbar){
				this.toolbar.style.display = 'none';
			}
		},

		/**
		 * 更新工具条位置
		 */
		updateToolsPosition: function(img){
			var toolbarRegion = ve.dom.getRegion(this.toolbar),
				iframeRegion = ve.dom.getRegion(this.editor.iframeElement);
			try {
				var imgRegion = ve.dom.getRegion(img);
				var styles = {
					display:'block',
					top: iframeRegion.top+imgRegion.top,
					left: iframeRegion.left+imgRegion.left
				};
				for(var i in styles){
					ve.dom.setStyle(this.toolbar, i, styles[i]);
				}
			} catch(ex){
				ve.dom.setStyle(this.toolbar, 'display', 'none');
			}
		}
	});
	ve.plugin.register('imagetools', VEditor.plugin.ImageTools);
})(VEditor);
/**
 * 插入文档插件
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneDoc', {
		editor: null,
		btn: null,
		panelUrl: null,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.btn = this.editor.createButton('qzonedoc', {
				'class': 'veUploadWord',
				title: '插入文档',
				cmd: function(){
					_this.showPanel();
				}
			});
			this.panelUrl = url + 'upload.html';
		},

		showPanel: function(){
			var _this = this;
			var dlg = ve.ui.showPopup('上传文档',{src: this.panelUrl}, 400, 242);
			ve.ui.appendPopupFn(function(){
				return _this.popupCallback();
			});
		},

		/**
		 * 关闭窗口、插入数据回调
		 */
		popupCallback: function(){
			var data = PAGE_CACHE.get('BlogDocHtml');
			if (data){
				data = data.trim();
				this.editor.insertHtml({'content':data, 'useParser':true});
				PAGE_CACHE.remove('BlogDocHtml');
			}
		}
	});
	ve.plugin.register('qzonedoc', VEditor.plugin.QzoneDoc);
})(VEditor);

/**
 * FLASH
 * 由媒体基础类扩展获取
 */
(function(ve){
	//这部分是针对空间额外处理的
	var isVip = false;
	try {
		isVip = QZONE.FP.getBitMapFlag(27) == 1;
	} catch(ex){}

	ve.lang.Class('VEditor.plugin.QzoneFlash:VEditor.plugin.QzoneMedia', {
		editor: null,

		config: {
			panel: {
				url: null,
				name: '插入Flash动画',
				width: 430,
				height: (isVip ? 235 : 275)
			},
			pUrl: '',
			pAlbumId: '',
			cssClassName: 'blog_flash',
			defaultFlashWidth: 500,
			defaultFlashHeight: 425,
			disableScale: false
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.config.baseURL = 'http://'+this.IMGCACHE_DOMAIN+'/qzone/newblog/v5/editor/dialog/flash.html';
			this.config.panel.url = this.config.baseURL + '?editorid='+this.editor.id;

			this.editor.createButton('flash', {
				'class': 'veInsertFlash',
				title: '插入Flash动画',
				cmd: function(){
					_this.showPanel();
				}
			});

			this.editor.onMouseDown.add(function(ev){
				_this.toggleflashInfoPanel(ev);
			});

			this.editor.onKeyDown.add(function(ev){
				_this.toggleflashInfoPanel(ev, true);
			});

			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);

			this.editor.onGetContent.add(function(html){
				return _this.onGetContent(html);
			}, true);

			ve.dom.event.add(document.body, 'click', function(ev){
				var tag = ve.dom.event.getTarget(ev);
				if(_this.flashInfoPanel && (tag == _this.flashInfoPanel || ve.dom.contains(_this.flashInfoPanel, tag))){
				} else {
					_this.toggleflashInfoPanel(ev, true);
				}
			});
		},

		popupCallback: function() {
			var _this = this;
			var id = _this.editor.id;
			if(QZONE.FP._t.g_arrQZEditorReturnVal && QZONE.FP._t.g_arrQZEditorReturnVal[id]){
				var data = QZONE.FP._t.g_arrQZEditorReturnVal[id];
				//透明
				if(data[4]){
					data[5] = parseInt(data[5], 10) || 0;
					data[6] = parseInt(data[6], 10) || 0;
				} else {
					data[6] = data[5] = undefined;
				}
				var FlashData = _this._fixFlashData(data[0], data[3], data[2], data[6], data[5]);
				var cache_id = _this.setCache(FlashData);
				var style = FlashData.abs ? ';position:absolute; top:'+FlashData.top+'px'+';left:'+FlashData.left+'px;' : '';
				html = '<img src="/ac/b.gif" alt="flash" class="'+_this.config.cssClassName+'" style="width:'+FlashData.width+'px;height:'+FlashData.height+'px;'+style+'" cache_id="'+cache_id+'" />';
				_this.editor.insertHtml({content:html});
			}
			try{QZONE.FP._t.g_arrQZEditorReturnVal[id] = null;} catch(e){};
		},

		onSetContent: function(str){
			var _this = this;
			str = str.replace(/<object([^>]+)>(.*?)<\/object>/ig, function(){
				try {
					if(/class=("|')*blog_flash/i.test(arguments[1])) {
						var res = /(<embed([^>]+)>)/ig.exec(arguments[2]);
						if(!!res) {
							return res[1];
						}
					}
				} catch(err){}
				return arguments[0];
			});

			str = str.replace(/<embed([^>]+)>/ig,function(){
				try{
					if(/class=("|')*blog_flash/i.test(arguments[1])) {
						var width = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var height = /height="([^"]+)"/i.exec(arguments[1]) || [];
						var src = /src="([^"]+)"/i.exec(arguments[1]) || [];
						var _top = /top\:([^px]+)/i.exec(arguments[1]) || [];
						var left = /left:([^px]+)/i.exec(arguments[1]) || [];

						var FlashData = _this._fixFlashData(src[1], width[1], height[1], _top[1], left[1]);
						var absStyle = FlashData.abs ? ';position:absolute; top:'+FlashData.top+'px'+';left:'+FlashData.left+'px;' : '';
						var cache_id = _this.setCache(FlashData);
						return '<img src="/ac/b.gif" class="blog_flash'+'" style="width:'+FlashData.width+'px;height:'+FlashData.height+'px;'+ absStyle+'" cache_id="'+cache_id+'" />';
					}
				} catch(err){
					//console.log('error', err);
				}
				return arguments[0];
			 });
			 return str;
		},

		/**
		 * 切换Flash面板
		 * @param {object} node
		 * @param {boolean} hide
		 * @deprecate 当node为空，或者node不是Flash img时，则隐藏面板
		 */
		toggleflashInfoPanel: function(ev, hide){
			var tag;
			if(!ev || (!ev.target && !ev.srcElement)){
				tag = ve.dom.event.getTarget();
			} else {
				tag = ev.target || ev.srcElement;
			}

			if(!hide && tag && tag.tagName == 'IMG' && ve.dom.hasClass(tag, 'blog_flash')){
				if(!this.flashInfoPanel){
					var html = ['<strong>Flash地址：</strong><br/>',
								'<input type="text" value="" readonly="readonly"/><br/>',
								'<strong>大小：<span></span></strong>'
								].join('');
					this.flashInfoPanel = document.createElement('div');
					this.flashInfoPanel.className = 've_video_info_tip';
					this.flashInfoPanel.style.display = 'none';
					this.flashInfoPanel.innerHTML = html;
					document.body.appendChild(this.flashInfoPanel);
				}
				var FlashData = this.getCache(tag.getAttribute('cache_id'));
					FlashData.width = parseInt((tag.width || tag.style.width), 10) || FlashData.width;			//使用实际占位图大小
					FlashData.height = parseInt((tag.height || tag.style.height), 10) || FlashData.height;
				var imgReg = this.getEditorEleFrameRegion(tag);

				var left = imgReg.width > 300 ? (imgReg.left+imgReg.width-265)+'px' : (imgReg.left+imgReg.width+3)+'px';
				var top = imgReg.height > 100 ? (imgReg.top+imgReg.height-75)+'px' : (imgReg.top + imgReg.height+3)+'px';
				this.flashInfoPanel.style.left = left;
				this.flashInfoPanel.style.top = top;
				this.flashInfoPanel.style.display = '';
				this.flashInfoPanel.getElementsByTagName('span')[0].innerHTML = FlashData.width + 'x' + FlashData.height;
				this.flashInfoPanel.getElementsByTagName('input')[0].value = FlashData.source;
			} else if(this.flashInfoPanel){
				this.flashInfoPanel.style.display = 'none';
			}
		},


		/**
		 * 格式化、修正Flash数据
		 */
		_fixFlashData: function(source, width, height, top, left){
			var Data = {
				'source': source,
				'width': parseInt(width, 10) || this.config.defaultFlashWidth,
				'height': parseInt(height, 10) || this.config.defaultFlashHeight,
				'top': top || 0,
				'left': left || 0,
				'abs': !(top === undefined)
			}
			return Data;
		},

		onGetContent: function(str){
			var _this = this;
			str = str.replace(/<img([^>]+)>/ig, function(){
				try{
					if(/class=("|')*blog_flash/i.test(arguments[1])) {
						var cache_id = /cache_id="([^"]+)"/i.exec(arguments[1]);
						var FlashData = _this.getCache(cache_id[1]);

						//调整后的高宽
						var w = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var h = /height="([^"]+)"/i.exec(arguments[1]) || [];
						FlashData.width = (w && w[1]) ? w[1] : FlashData.width;
						FlashData.height = (h && h[1]) ? h[1] : FlashData.height;

						if(FlashData.source) {
							var flag = _this.isInWhiteList(FlashData.source);
							var isQQSound = /qzone\/flashmod\/ivrplayer\/ivrplayer.swf/i.test(FlashData.source);
							var style = FlashData.abs ? ' style="position:absolute;left:'+FlashData.left+'px; top:'+FlashData.top+'px"' : '';

							var embed_html = '<embed class="blog_flash" id="'+Math.random()+'" menu="false" invokeURLs="false" allowNetworking="'+(flag?'all':'internal')+'" allowFullScreen="'+
								(flag?'true':'false')+'" allowscriptaccess="'+(flag?'always':'never')+'"'+((isQQSound&&flag) ? (' flashvars="autoplay=1"') : '')+' wmode="transparent" src="'+FlashData.source+'" height="'+FlashData.height+'" width="'+FlashData.width+'"'+style+'/>';
							return embed_html;
						}
					}
				} catch(err){
					//console.log('onGetContent ERR',err);
				}
				return arguments[0];
			 });
			 return str;
		}
	});
	ve.plugin.register('qzoneflash', VEditor.plugin.QzoneFlash);
})(VEditor);

/**
 * 插入图片插件
 * 由媒体基础类扩展获取
 */
(function(ve){
	//是否使用QZONE版本的弹窗
	//这里为bbs.qun.qq.com这种qq.com下的站点服务，如果遇到其他站点接入，这里条件需要扩展
	var QZONE_VER = location.host.indexOf('bbs.qun.qq.com') < 0;

	//新相册放量
	ve.lang.Class('VEditor.plugin.QzoneImage:VEditor.plugin.QzoneMedia', {
		editor: null,
		lastBlogAlbumId: null,

		config: {
			blogType: null,
			panel: {
				url: null,
				name: '插入图片',
				width: 610,
				height: 490
			},
			cssClassName: '',
			disableScale: false,
			IMG_MAX_WIDTH: 870,
			IMG_MAX_HEIGHT: null
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.config.blogType = 7; //为私密日志传图做准备

			this.config.baseURL = QZONE_VER ? 'http://'+this.IMGCACHE_DOMAIN+'/qzone/app/photo/insert_photo.html#appid=2&refer=blog' :
				'http://'+this.IMGCACHE_DOMAIN+ "/qzone/client/photo/pages/qzone_v4/insert_photo.html#appid=2&refer=blog&uin=" + this.loginUin;
			this.topWin.insertPhotoContent = null;

			var goLastAid = 0;
			this.editor.createButton('image', {
				'class': 'veInsertImage',
				title: '插入图片',
				cmd: function(){
					_this.topWin.insertPhotoContent = null;
					//业务参数
					_this.config.panel.url = ([_this.config.baseURL,'&uploadHD=1','&blog_type=',_this.blogType,'&uin=', _this.loginUin,'&goLastAid='+goLastAid]).join('');
					goLastAid = 1;
					_this.showPanel();
				}
			});

			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);
		},

		/**
		 * 关闭窗口、插入数据回调
		 */
		popupCallback: function(){
			var _this = this;
			var data = this.topWin.insertPhotoContent;
			if(data && data.photos && data.photos.length){
				this.lastBlogAlbumId = data.lastAlbumId;
				var len = data.photos.length;
				var queue = [];
				this.editor.showStatusbar('正在插入图片...', 20)
				ve.lang.each(data.photos, function(photo){
					queue.push(photo.url);
				});

				ve.dom.loadImageQueue(queue, function(itemList){
					var htmls = [len > 1 ? '<br/>' : ''];
					ve.lang.each(itemList, function(item, index){
						if(item.src){
							var photoData = data.photos[index];
							var reg = ve.lang.resize(item.width, item.height, _this.config.IMG_MAX_WIDTH, _this.config.IMG_MAX_HEIGHT);
							var style = 'width:'+reg[0]+'px; height:'+reg[1]+'px';
							htmls.push('<img src="',ve.string.trim(item.src),'" alt="图片" style="'+style+'"/>');

							if(data.needPhotoName && photoData.name){
								htmls.push('<br/>照片名称：'+photoData.name);
							}
							if(data.needAlbumName && photoData.albumName){
								htmls.push('<br/>所属相册：'+'<a href="'+photoData.albumUrl+'">'+photoData.albumName+'</a>');
							}
							if(data.needPhotoDesc && photoData.desc){
								htmls.push('<br/>照片描述：'+photoData.desc);
							}
							if(len > 1){
								htmls.push('<br/><br/>');
							}
						}
					});
					_this.editor.insertHtml({content:htmls.join('')});
					setTimeout(function(){
						_this.editor.resize();
						_this.editor.hideStatusbar();
					}, 100);
				});
			}
			this.topWin.insertPhotoContent = null;
		},

		/**
		 * 设置内容，兼容原来的 orgsrc | originsrc形式
		 * @param {String} str
		 * @return {String}
		 */
		onSetContent: function(str){
			var result;
			result = str.replace(/<img([^>]+)>/ig, function() {
				try {
					var str = arguments[1];

					var orgSrc = /orgsrc="([^"]+)"/i.exec(str);
						orgSrc = orgSrc && orgSrc[1] ? orgSrc[1] : '';

					var osrc = /ORIGINSRC="([^"]+)"/i.exec(str);
						osrc = osrc && osrc[1] ? osrc[1] : '';

					if(orgSrc || osrc){
						str = str.replace(/(\bsrc=["|'](.*?)["|'])/ig, function(){
							return ' src="'+(osrc||orgSrc)+'"';
						});
						str = str.replace(/\borgsrc=["|'](.*?)["|']/ig, '');
						str = str.replace(/\bORIGINSRC=["|'](.*?)["|']/ig, '');
					}
					return '<img'+str+'/>';
				} catch (err) {
				}
				return arguments[0];
			});
			return result || str;
		}
	});
	ve.plugin.register('qzoneimage', VEditor.plugin.QzoneImage);
})(VEditor);

/**
 * QQ音乐
 * 由媒体基础类扩展获取
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneMusic:VEditor.plugin.QzoneMedia', {
		editor: null,

		config: {
			panel: {
				url: null,
				name: '插入音乐',
				width: 640,
				height: 330
			},
			pUrl: '',
			pAlbumId: '',
			cssClassName1: 'blog_music',
			cssClassName2: 'blog_music_multiple',

			disableScale: true
		},

		/**
		 * 初始化
		 * @param {Object} editor
		 * @param {String} url
		 */
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.config.baseURL = 'http://'+this.IMGCACHE_DOMAIN+'/music/musicbox_v2_1/doc/blog_add_song.html';
			this.config.panel.url = this.config.baseURL + '?editorid='+this.editor.id;

			this.editor.createButton('music', {
				'class': 'veInsertMusic',
				title: '插入音乐',
				cmd: function(){
					_this.showPanel();
				}
			});

			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);

			this.editor.onGetContent.add(function(html){
				return _this.onGetContent(html);
			}, true);
		},

		popupCallback: function(){
			var _this = this;
			var id = _this.editor.id;
			if(top.g_arrQZEditorReturnVal && top.g_arrQZEditorReturnVal[id]){
				var data = top.g_arrQZEditorReturnVal[id];
				var arr = data.split("|");
				var cache_id = _this.setCache(data);
				var html = '<img src="/ac/b.gif" alt="音乐" cache_id="'+cache_id+'" class="'+(arr.length>7?_this.config.cssClassName2:_this.config.cssClassName1)+'" onresizestart="return false;"/>';
				_this.editor.insertHtml({content:html});
			}
			try {
				top.g_arrQZEditorReturnVal[id] = null;
				} catch(ex){
				window.console && console.log(ex);
			};
		},

		/**
		 * 日志原文HTML转换到编辑状态
		 * @param {String} html
		 * @return {String}
		 */
		onSetContent: function(html){
			var _this = this;
			try {
				str = html.replace(/<object([^>]+)>(.*?)<\/object>/ig, function(){
					try{
						if(/class=("|')*blog_music/i.test(arguments[1])) {
							var data = / ubb="([^"]+)"/i.exec(arguments[1]);
							var arr = data[1].split("|");
							var cache_id = _this.setCache(data[1]);
							return '<img src="/ac/b.gif" alt="音乐" cache_id="'+cache_id+'" class="'+(arr.length>7?_this.config.cssClassName2:_this.config.cssClassName1)+'" onresizestart="return false;"/> ';
						}
					} catch(err){
						console.log('qzonemusic onSetContent err ', err);
					}
					return arguments[0];
				 });
			} catch(e){
				console.log('qzonemusic onSetContent err', e);
			}
			return str || html;
		},

		/**
		 * 转换IMG标签到FLASH标签,
		 * 主要提供给预览和内容存储的时候使用
		 * @param {String} str
		 * @return {String}
		 *
		 */
		onGetContent: function(str){
			var _this = this;
			var count = 0;
			str = str.replace(/<img([^>]+)>/ig, function(){
				try {
					if(/class=("|')*blog_music/i.test(arguments[1])) {
						var cache_id = /cache_id="([^"]+)"/i.exec(arguments[1]);
						var data = _this.getCache(cache_id[1]);
						++count;
						var arr = data.split("|");

						var src = 'http://'+IMGCACHE_DOMAIN+'/music/musicbox_v2_1/img/MusicFlash.swf';
						var height = (arr.length>7) ? 190 : 100;
						var width = (arr.length>7 ? 440:410);
						var id = "musicFlash"+(count-1);
						var name = "musicFlash**";
						var _class = "blog_music";
						var ubb = data;

						return '<object'+
								' codeBase="http://fpdownload.macromedia.com/get/flashplayer/current/swflash.cab#version=8,0,0,0" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="'+width+'"'+
								' height="'+height+'"'+
								' src="'+src+'"'+
								' bgcolor="#ffffff" menu="true" allowScriptAccess="always" name="'+name+'" id="'+id+'" ubb="'+ubb+'" class="'+_class+'">'+
									'<param name="movie" value="'+src+'" />'+
									'<param name="data" value="'+src+'" />'+
									'<param name="bgColor" value="#ffffff" />'+
									'<param name="wmode" value="transparent" />'+
									'<param name="menu" value="true" />' +
									'<param name="allowScriptAccess" value="always" />'+
								'</object>';
					}
				} catch(err) {
					//console.log('qzone music ongetContent error', err);
				}
				return arguments[0];
			});
			return str;
		}
	});
	ve.plugin.register('qzonemusic', VEditor.plugin.QzoneMusic);
})(VEditor);
/**
 * QQ秀泡泡
 * 由媒体基础类扩展获取
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneQQShowBubble:VEditor.plugin.QzoneMedia', {
		editor: null,

		config: {
			baseURL: 'http://ptlogin2.qq.com/showbub?uin='+QZONE.cookie.get('zzpaneluin')+'&clientkey='+QZONE.cookie.get('zzpanelkey'),
			panel: {
				url: null,
				name: '插入QQ秀泡泡',
				width: 900,
				height: 505
			},
			pUrl: '',
			pAlbumId: '',
			cssClassName: '',
			disableScale: true,
			cacheKeyPre: 'image_'
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			//添加按钮
			this.editor.createButton('QQShowBubbleButton', {
				'class': 'veInsertQQShowBubble',
				title: '插入QQ秀泡泡',
				cmd: function(){
					_this.config.panel.url = _this.config.baseURL + (!!_this.config.pUrl ? ('&url='+_this.config.pUrl.URLencode()) : '')+(!!_this.config.pAlbumId ? ("&albid="+_this.config.pAlbumId) : '');

					/**
					 * 业务回调
					 * @param {String} url 		泡泡图片URL
					 * @param {Integer} width	图片宽度
					 * @param {Integer} height	图片高度
					 * @param {String} sContent	泡泡文字内容
					 */
					parent._tempQFCallback = function(url, width, height, sContent){
						var html = '<img src="'+url+'" transimg="1" alt="'+sContent+'" style="height:'+height+'px; width:'+width+'px"/>'
						_this.editor.insertHtml({content:html});
					};
					_this.showPanel();
				}
			});
		}
	});
	ve.plugin.register('qzoneqqshowbubble', VEditor.plugin.QzoneQQShowBubble);
})(VEditor);
/**
 * QQ视频
 * 由媒体基础类扩展获取
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneVideo:VEditor.plugin.QzoneMedia', {
		editor: null,
		videoInfoPanel: null,

		config: {
			panel: {
				url: null,
				name: '插入视频',
				width: 526,
				height: 450
			},
			cssClassName: 'blog_video',
			disableScale: false,
			defaultVideoWidth: 500,
			defaultVideoHeight: 425
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.config.baseURL = 'http://'+IMGCACHE_DOMAIN+'/qzone/app/video/htmlout/blog.html';
			this.config.panel.url = this.config.baseURL + '?editorid='+this.editor.id;

			this.editor.createButton('video', {
				'class': 'veInsertVideo',
				title: '插入视频',
				cmd: function(){
					_this.showPanel();
				}
			});

			this.editor.onMouseDown.add(function(ev){
				_this.toggleVideoInfoPanel();
			});

			this.editor.onKeyDown.add(function(ev){
				_this.toggleVideoInfoPanel(ev, true);
			});

			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);

			this.editor.onGetContent.add(function(html){
				return _this.onGetContent(html);
			}, true);

			ve.dom.event.add(document.body, 'click', function(ev){
				var tag = ve.dom.event.getTarget(ev);
				if(_this.videoInfoPanel && (tag == _this.videoInfoPanel || ve.dom.isAncestor(_this.videoInfoPanel, tag))){
				} else {
					_this.toggleVideoInfoPanel(ev, true);
				}
			});
		},

		popupCallback: function(){
			var _this = this;
			try {
				var id = _this.editor.id;
				var data = QZONE.FP._t.insertVideoContent[id];
				if(data){
					var VideoData = _this._fixVideoData(data);
					var cache_id = _this.setCache(VideoData);

					var html = '<img src="'+(VideoData.thumb || '/ac/b.gif')+'" alt="视频" cache_id="'+cache_id+'" class="'+_this.config.cssClassName+'" style="width:'+VideoData.width+'px; height:'+VideoData.height+'px"/>';
					_this.editor.insertHtml({content:html});
				}
				QZONE.FP._t.insertVideoContent[id] = null;
			} catch(ex){};
		},

		onSetContent: function(str){
			var result, _this = this;
			result = str.replace(/<object([^>]+)>(.*?)<\/object>/ig, function(){
				try {
					if(/class=("|')*(blog_video|blog_qqVideo)/i.test(arguments[1])) {
						var res = /(<embed([^>]+)>)/ig.exec(arguments[2]);
						if(!!res) {
							return res[1];
						}
					}
				} catch(err){
					//console.log('err', err);
				}
				return arguments[0];
			});

			result = result.replace(/<embed([^>]+)>/ig, function(){
				try{
					if(/class=("|')*(blog_video|blog_qqVideo)/i.test(arguments[1])) {
						var w = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var h = /height="([^"]+)"/i.exec(arguments[1]) || [];
						var loop = /loop="([^"]+)"/i.exec(arguments[1]) || [];
						var autostart = /autostart="([^"]+)"/i.exec(arguments[1]) || [];
						var videoThumb = /videothumb="([^"]+)"/i.exec(arguments[1]) || [];
						var videoTitle = /videotitle="([^"]+)"/i.exec(arguments[1]) || [];
						var videosource = /videosource="([^"]+)"/i.exec(arguments[1]) || [];
						var src = /src="([^"]+)"/i.exec(arguments[1]) || [];
						var count = 0;

						var VideoData = _this._fixVideoData({
							pre: videoThumb[1],
							pageUrl: videosource[1],
							title: decodeURI(videoTitle[1] || '').replace(/\%2b/ig, '+'),
							width: w[1],
							height: h[1],
							playerUrl: src[1],
							autostart: autostart[1],
							loop: loop[1]
						});
						var cache_id = _this.setCache(VideoData);
						return '<img src="'+(VideoData.thumb || '/ac/b.gif')+'" class="blog_video" style="width:'+VideoData.width+'px;height:'+VideoData.height+'px;" cache_id="'+cache_id+'" />';
					}
				} catch(err){
					console.log('set content err', err);
				}
				return arguments[0];
			});
			return result || str;
		},

		onGetContent: function(html){
			var _this = this;
			str = html.replace(/<img([^>]+)>/ig, function(){
				try {
					if(/class=("|')*(blog_video|blog_qqVideo)/i.test(arguments[1])) {
						var cache_id = /cache_id="([^"]+)"/i.exec(arguments[1]);
						VideoData = _this.getCache(cache_id[1]);

						//调整后的高宽
						var w = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var h = /height="([^"]+)"/i.exec(arguments[1]) || [];
						VideoData.width = (w && w[1]) ? w[1] : VideoData.width;
						VideoData.height = (h && h[1]) ? h[1] : VideoData.height;

						if(VideoData) {
							var isQQVideo = /^http:\/\/((\w+\.|)(video|v|tv)).qq.com/i.test(VideoData.source);
							var embed_html = ([
								'<embed class="blog_video" type="application/x-shockwave-flash" ',
								'allownetworking="',(_this.isInWhiteList(VideoData.source) ? 'all" allowScriptAccess="always" ' : 'internal" '),
								'id="blog_video_',(new Date()).getTime(),'" enablecontextmenu="False" ',
								'width="',VideoData.width,'" ',
								(VideoData.thumb ? ('videothumb="'+VideoData.thumb+'" ') : ''),
								(VideoData.title ? ('videotitle="'+URIencode(VideoData.title).replace(/\+/g, '%2b')+'" '): ''),
								(VideoData.videosource ? ('videosource="'+VideoData.videosource+'" '): ''),
								'height="',VideoData.height,'" ',
								'loop="',VideoData.loop,'" autostart="',VideoData.autostart,'" wmode="opaque" showstatusbar="1" invokeurls="false" allowfullscreen="true" ',
								'src="',VideoData.source,'"/>'
							]).join('');

							if(!isQQVideo) {
								return embed_html;
							}

							var html = (['<object class="blog_video" type="application/x-shockwave-flash" id="blog_video_o_',(new Date()).getTime(),'" data="',VideoData.source,'"',
										'codeBase="http://fpdownload.macromedia.com/get/flashplayer/current/swflash.cab#version=8,0,0,0" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" ',
										'width="',VideoData.width,'" height="',VideoData.height,'">',
										'<param name="loop" value="',VideoData.loop,'" />',
										'<param name="autostart" value="',VideoData.autostart,'" />',
										'<param name="movie" value="',VideoData.source,'" />',
										'<param name="allowFullScreen" value="true" />',
										'<param name="wmode" value="opaque" />',
										'<param name="allowScriptAccess" value="always" />',
										'<param name="allownetworking" value="all" />',embed_html,
									'</object>']).join('');
							return html;
						}
					}
				} catch(err){
					console && console.log('qzonevideo onGetContent', err);
				}
				return arguments[0];
			 });
			return str;
		},

		/**
		 * 格式化、修正视频数据
		 * @param  {string} source          影片source
		 * @param  {integer} width          宽度
		 * @param  {integer} height         高度
		 * @param  {boolean} loop           是否循环播放
		 * @param  {boolean} autostart      是否自动开始
		 * @param  {boolean} allowfullscreen 允许全屏
		 * @param  {string} thumb           缩略图
		 * @param  {string} title			视频标题
		 * @param {String} videosource 			视频页面url
		 */
		_fixVideoData: function(data){
			var vD = {
				'source': data.playerUrl,
				'width': parseInt(data.width, 10) || this.config.defaultVideoWidth,
				'height': parseInt(data.height, 10) || this.config.defaultVideoHeight,
				'autoplay': data.autoplay,
				'loop': (data.loop || data.autoecho) ? 'true' : 'false',
				'autostart': (data.autoplay || data.autostart) ? 'true' : 'false',
				'allowfullscreen': data.allowfullscreen ? 'true' : 'false',
				'thumb': data.pre || '',
				'title': data.title || '',
				'videosource': data.pageUrl || ''
			}
			return vD;
		},

		/**
		 * 切换视频面板
		 * @param {object} node
		 * @param {boolean} hide
		 * @deprecate 当node为空，或者node不是视频img时，则隐藏面板
		 */
		toggleVideoInfoPanel: function(ev, hide){
			var tag;
			if(!ev || (!ev.target && !ev.srcElement)){
				tag = ve.dom.event.getTarget();
			} else {
				tag = ev.target || ev.srcElement;
			}

			if(!hide && tag && tag.tagName == 'IMG' && ve.dom.hasClass(tag, 'blog_video')){
				if(!this.videoInfoPanel){
					var html = ['<strong>视频地址：</strong><br/>',
								'<input type="text" value="" readonly="readonly"/><br/>',
								'<strong>大小：<span></span></strong>'
								].join('');
					this.videoInfoPanel = document.createElement('div');
					this.videoInfoPanel.className = 've_video_info_tip';
					this.videoInfoPanel.style.display = 'none';
					this.videoInfoPanel.innerHTML = html;
					document.body.appendChild(this.videoInfoPanel);
				}

				var VideoData = this.getCache(tag.getAttribute('cache_id'));
					VideoData.width = parseInt((tag.width || tag.style.width), 10) || VideoData.width;			//使用实际占位图大小
					VideoData.height = parseInt((tag.height || tag.style.height), 10) || VideoData.height;

				var imgReg = this.getEditorEleFrameRegion(tag);

				var left = imgReg.width > 300 ? (imgReg.left+imgReg.width-265)+'px' : (imgReg.left+imgReg.width+3)+'px';
				var top = imgReg.height > 100 ? (imgReg.top+imgReg.height-75)+'px' : (imgReg.top + imgReg.height+3)+'px';
				this.videoInfoPanel.style.left = left;
				this.videoInfoPanel.style.top = top;
				this.videoInfoPanel.style.display = '';
				this.videoInfoPanel.getElementsByTagName('span')[0].innerHTML = VideoData.width + 'x' + VideoData.height;
				this.videoInfoPanel.getElementsByTagName('input')[0].value = VideoData.source;
			} else if(this.videoInfoPanel){
				this.videoInfoPanel.style.display = 'none';
			}
		}
	});
	ve.plugin.register('qzonevideo', VEditor.plugin.QzoneVideo);
})(VEditor);

(function(ve) {
	var insertedCssLink;
	function loadColorPicker(url, node, editor, onChangeColor, callback){
		var option = {
			defaultTab: 0,
			needFloat: true,
			realtime: false,
			cssText : ''
		};

		var handler = function(){
			var picker = new ColorPicker(node, onChangeColor, option);
			editor.onClick.add(function(){
				picker.hide();
			});

			editor.onBeforeOpenListBox.add(function(){
				picker.hide();
			});

			callback(picker);
		};

		if(window.ColorPicker){
			handler();
		} else {
			ve.net.loadScript(url, handler);
		}
	}

	/**
	 * 发光字体
	 */
	ve.lang.Class('VEditor.plugin.GlowFont', {
		init: function (editor, url) {
			var _this = this,
				pickerUrl = ve.getAbsPath('resource/colorpicker/colorpicker.js'),
				pickerCss = ve.getAbsPath('resource/colorpicker/colorpicker.css'),
				colorPicker;
			this.editor = editor;

			this.btn = _this.editor.createButton('glowfont', {
				'class': 'veGlowFont',
				title: '设置发光字体',
				cmd: function(){
					if(!colorPicker){
						loadColorPicker(pickerUrl, _this.btn.getDom(), _this.editor, function(color){
								_this.editor.execCommand('glowfont', color);
							}, function(picker){
								colorPicker = picker;
								colorPicker.show();
							});
					} else {
						colorPicker.show();
					}

					if(!insertedCssLink){
						insertedCssLink = true;
						ve.dom.insertCSSLink(pickerCss);
					}
				}
			});

			this.addCommand();

			//这里将glowfont属性直接替换进入span.style属性
			//做这步的原因是cssText不支持使用js写入浏览器不支持的属性
			_this.editor.onGetContent.add(function(html){
				var str = html.replace(/<span([^>]+)>/ig,function(){
					try {
						var match = arguments[1];
						if(/glowfont=/i.test(match)) {
							var tmp = /glowfont="([^"]+)"/i.exec(match);
							var glowFontCss = tmp[1] || '';
							if(glowFontCss){
								match = match.replace(/\bglowfont="([^"]+)"/i, function(){
									return '';
								});
								if(/style=/i.test(match)){
									var rp = /style="([^"]+)"/i.exec(match);
									if(rp[1]){
										rp[1] = _removeStyle(rp[1], ['display', 'filter', 'color', 'text-shadow']);
										match = ' style="'+(rp[1] ? rp[1]+';': '')+glowFontCss + '" ';
									}
								} else {
									return '<span'+match + ' style="'+glowFontCss+'">';
								}
							}
						}
						return '<span'+match+'>';
					} catch(ex){
						return arguments[0];
					}
				});
				return str || html;
			}, true);
		},

		addCommand: function(){
			var _this = this;
			this.editor.addCommand('glowfont', function(color){
				var ed = _this.editor;
				var cssText = 'display:inline-block; '+
					'color:white; '+
					'text-shadow:'+'1px 0 4px '+color+',0 1px 4px '+color+',0 -1px 4px '+color+',-1px 0 4px '+color+';'+
					'filter:glow(color='+color+',strength=3)';
				var rng = ed.getVERange();
				if(rng.startContainer === rng.endContainer &&
					rng.startContainer.tagName != 'BODY' &&
					ve.dtd.$empty[rng.startContainer.tagName]){
					//return;
				} else if(!rng.collapsed){
					rng.setInlineAttr('span', {style:cssText, glowfont:cssText});
					rng.collapse();
					rng.select();
				} else {
					ed.showStatusbar('您需要选中文字之后再设定发光字', 3);
				}
			});
		}
	});
	ve.plugin.register('glowfont', VEditor.plugin.GlowFont);

	/**
	 * 移除样式
	 * @param  {String} str   样式style
	 * @param  {Array} finds 需要去除的样式name
	 * @return {String}
	 */
	var _removeStyle = function(str, finds){
		str = ';' + str + ';';
		ve.lang.each(finds, function(key){
			var reg = new RegExp(';\\s*'+key+'\\s*:[^;]+;', 'ig');
			str = str.replace(reg, ';');
		});
		return str.replace(/^\s*;\s*/g, '').replace(/\s*;\s*$/g,'');
	};
}) (VEditor);
/**
 * 插入文档插件
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneVipFont', {
		editor: null,
		isVip: !!QZONE.FP.getBitMapFlag(27),
		selectListFontEotSrc: '/qzonestyle/act/font/eot/SELECT0.eot',
		selectListFontTTFSrc: '/qzonestyle/act/font/ttf/selectf.ttf',
		specialFontList: [
			{
				id: 'dou',
				name: '豆豆体',
				classPrefix: 'qzone_font_dou',
				eotSrc: '/qzonestyle/act/font/eot/TCDOU0.eot',
				ttfSrc: ''
			},
			{
				id: 'tao',
				name: '桃心体',
				classPrefix: 'qzone_font_tao',
				eotSrc: '/qzonestyle/act/font/eot/TCLOVE0.eot',
				ttfSrc: ''
			},
			{
				id: 'xiaohua',
				name: '小花体',
				classPrefix: 'qzone_font_xiaohua',
				eotSrc: '/qzonestyle/act/font/eot/TCHUAYU0.eot',
				ttfSrc: ''
			},
			{
				id: 'qingxiu',
				name: '清秀体',
				classPrefix: 'qzone_font_qingxiu',
				eotSrc: '/qzonestyle/act/font/eot/TCQINGX0.eot',
				ttfSrc: ''
			},
			{
				id: 'huajuan',
				name: '花卷体',
				classPrefix: 'qzone_font_huajuan',
				eotSrc: '/qzonestyle/act/font/eot/TCHUAJU0.eot',
				ttfSrc: ''
			},
			{
				id: 'fountainpen',
				name: '钢笔体',
				classPrefix: 'qzone_font_pen',
				eotSrc: '/qzonestyle/act/font/eot/TCGANGB0.eot',
				ttfSrc: ''
			}
		],

		init: function (editor, url) {
			this.editor = editor;
			var _this = this;
			this.editor.onInitComplete.add(function(){
				fontList = _this.editor.toolbarManager.getUIControlFromCollection('fontname');
				for(var i=0; i<_this.specialFontList.length; i++){
					var key = _this.specialFontList[i].id;
					var name = _this.specialFontList[i].name;
					fontList.addItem({
						item: [key,name+'<img src="/ac/b.gif" class="icon_vip_yl_s"/>', 'style=\"font-family:sefont\"'],
						pos:'last'
					});
				}
			});

			//绑定特殊字体命令
			this.editor.onAfterExecCommand.add(function(cmd, ui, val){
				if(cmd == 'FontName'){
					for(var i=0; i<_this.specialFontList.length; i++){
						if(_this.specialFontList[i].id == val){
							_this.loadFontSource(_this.specialFontList[i]);
							return;
						}
					}
				}
			});

			//填充内容检测特殊字体
			this.editor.onSetContent.add(function(str){
				var fontObjList = _this.getSpecialFontListFromStr(str);
				for(var i=0; i<fontObjList.length; i++){
					_this.loadFontSource(fontObjList[i]);
				}
			});

			//菜单字体着色
			if(ve.ua.ie){
				this.insertStyleSheet('pagestyle',  '@font-face { font-family: sefont; font-style: normal;font-weight: normal;src: url('+this.selectListFontEotSrc+');}');
			} else {
				this.insertStyleSheet(null,'@font-face {font-style: normal; font-weight: normal; font-family: sefont; src: url('+this.selectListFontTTFSrc+') format("opentype");}');
			}
		},

		/**
		 * 从字符串里面识别特殊字体
		 * @param  {string} strHtml
		 * @return {array}
		 */
		getSpecialFontListFromStr: function(strHtml){
			var arr = [];
			var _this = this;
			strHtml = strHtml.replace(/<(font|span)([^>]+)>/ig, function(){
				var res = /face=("|)([^"\s]+)("|)/.exec(arguments[2]);
				if(res && res[2]) {
					for(var i=0; i<_this.specialFontList.length; i++){
						if(res[2].indexOf(_this.specialFontList[i].id) != -1){
							arr.push(_this.specialFontList[i]);
						}
					}
				}
				return arguments[0];
			});

			strHtml = strHtml.replace(/<(div|span)([^>]+)>/ig, function() {
				var res = /font-family:([^;^"]+)/ig.exec(arguments[2]);
				if(res && res[1]) {
					for(var i=0; i<_this.specialFontList.length; i++){
						if(res[1].indexOf(_this.specialFontList[i].id) != -1){
							arr.push(_this.specialFontList[i]);
						}
					}
				}
				return arguments[0];
			});

			var result = [], found = false;
			for(var i=0; i<arr.length; i++){
				found = false;
				for(var j=0; j<result.length; j++){
					if(result[j].id == arr[i].id){
						found = true;
						break;
					}
				}
				if(!found){
					result.push(arr[i]);
				}
			}
			return result;
		},

		/**
		 * 加载字体资源
		 * @param  {object}   fontObj   字体
		 * @param  {Function} callback 回调
		 */
		loadFontSource: function(fontObj, callback){
			var doc = this.editor.getDoc();
			var _this = this;
			if(!ve.ua.ie){
				this.editor.showStatusbar('<a target="_blank" class="unline c_tx" href="http://qzone.qq.com/helpcenter/yellow_info.htm?56">个性字体</a>仅在IE浏览器下才可查看效果，请更换浏览器或选择其它字体。');
			} else if(!this.isVip){
				this.editor.showStatusbar('个性字体仅限黄钻用户使用，普通用户发表日志后无法显示个性效果。\
					<a class="unline c_tx" href="http://pay.qq.com/qzone/index.shtml?aid=zone.font" target="_blank">加入黄钻贵族</a>\
					<a target="_blank" class="unline c_tx" href="http://qzone.qq.com/helpcenter/yellow_info.htm?56" target="_blank">个性字体使用帮助</a>');
			} else {
				this.editor.showStatusbar('正在加载个性字体...', 4);
			}
			var id = 'pagestyle_qzone_vip_font'+fontObj.id;
			if(doc.getElementById(id)){
				return;
			}

			//插入样式到编辑器和页面
			var rules = '@font-face { font-family: '+fontObj.id+'; font-style: normal;font-weight: normal;src: url('+fontObj.eotSrc+');}';
			setTimeout(function(){
				_this.insertStyleSheet(id, rules, doc);			//到编辑器iframe页面
			}, 50);
		},

		/**
		 * 插入关联样式
		 * @param {String} sheetId
		 * @param {String} rules
		 * @param {DOM} doc
		 */
		insertStyleSheet: function(sheetId, rules, doc){
			doc = doc || document;
			var styleNode = doc.getElementById(sheetId);
			if(!styleNode){
				var styleNode = doc.createElement("style");
					styleNode.type = 'text/css';
				if(sheetId){
					styleNode.id = sheetId;
				}
				doc.getElementsByTagName("head")[0].appendChild(styleNode);
			}
			var sheet = styleNode.sheet || doc.styleSheets[sheetId];

			if(ve.ua.ie) {
				sheet.cssText += rules;
			} else {
				sheet.insertRule(rules, 0);
			}
            return styleNode.sheet || styleNode;
		}
	});
	ve.plugin.register('qzonevipfont', ve.plugin.QzoneVipFont);
})(VEditor);
/**
 * 动感影集，当前没有支持按钮
 * 由媒体基础类扩展获取
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneVphoto:VEditor.plugin.QzoneMedia', {
		editor: null,

		config: {
			defaultVideoWidth: 520,
			defaultVideoHeight: 390
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);

			this.editor.onGetContent.add(function(html){
				return _this.onGetContent(html);
			}, true);
		},

		onSetContent: function(str){
			var _this = this;
			str = str.replace(/<object([^>]+)>(.*?)<\/object>/ig, function(){
				try {
					if(/class=("|')*blog_album/i.test(arguments[1])) {
						var res = /(<embed([^>]+)>)/ig.exec(arguments[2]);
						if(!!res) {
							return res[1];
						}
					}
				} catch(err){}
				return arguments[0];
			});

			str = str.replace(/<embed([^>]+)>/ig, function(){
				try{
					if(/class=("|')*blog_album/i.test(arguments[1])) {
						var w = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var h = /height="([^"]+)"/i.exec(arguments[1]) || [];
						var loop = /loop="([^"]+)"/i.exec(arguments[1]) || [];
						var autostart = /autostart="([^"]+)"/i.exec(arguments[1]) || [];
						var autoplay = /autoplay="([^"]+)"/i.exec(arguments[1]) || [];
						var src = /src="([^"]+)"/i.exec(arguments[1]);
						var imgurl = /imgurl="([^"]+)"/i.exec(arguments[1]);
						var count = 0;
						var VideoData = _this._fixVideoData(src[1], w[1], h[1], loop[1], autostart[1], autoplay[1], null, imgurl[1]);
						var cache_id = _this.setCache(VideoData);

						return (['<img src="',VideoData.imgurl,'" class="blog_album" style="width:',VideoData.width,'px;height:',VideoData.height,'px;" cache_id="',cache_id,'" />']).join('');
					}
				} catch(err){
					//console.log('set content err', err);
				}
				return arguments[0];
			});
			return str;
		},

		onGetContent: function(html){
			var _this = this;
			str = html.replace(/<img([^>]+)>/ig, function(){
				try {
					if(/class=("|')*blog_album/i.test(arguments[1])) {
						var cache_id = /cache_id="([^"]+)"/i.exec(arguments[1]);
						VideoData = _this.getCache(cache_id[1]);
						if(VideoData) {
							var embed_html = ([
								'<embed class="blog_album" type="application/x-shockwave-flash" ',
								'allownetworking="',(_this.isInWhiteList(VideoData.source) ? 'all" allowScriptAccess="always" ' : 'internal" '),
								'id="blog_album_',(new Date()).getTime(),'" enablecontextmenu="False" ',
								'width="',VideoData.width,'" ',
								'height="',VideoData.height,'" ',
								(VideoData.imgurl ? 'imgurl="'+VideoData.imgurl+'" ' : ''),
								'loop="',VideoData.loop,'" autostart="',VideoData.autostart,'" showstatusbar="1" invokeurls="false" allowfullscreen="true" ',
								'src="',VideoData.source,'"/>'
							]).join('');

							return embed_html;
							/**

							var html = (['<object class="blog_album" type="application/x-shockwave-flash" id="blog_album_o_',(new Date()).getTime(),'" data="',VideoData.source,'"',
										'codeBase="http://fpdownload.macromedia.com/get/flashplayer/current/swflash.cab#version=8,0,0,0" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" ',
										'width="',VideoData.width,'" height="',VideoData.height,'">',
										'<param name="loop" value="',VideoData.loop,'" />',
										'<param name="autostart" value="',VideoData.autostart,'" />',
										'<param name="movie" value="',VideoData.source,'" />',
										'<param name="allowFullScreen" value="true" />',
										'<param name="wmode" value="transparent" />',
										'<param name="allowScriptAccess" value="always" />',
										'<param name="imgurl" value="',VideoData.imgurl,'" />',
										'<param name="allownetworking" value="all" />',embed_html,
									'</object>']).join('');
							return html;
							**/
						}
					}
				} catch(err){
					//console.log('qzonevideo onGetContent', err);
				}
				return arguments[0];
			 });
			return str;
		},

		/**
		 * 格式化、修正视频数据
		 * autoplay针对视频没有什么意义
		 */
		_fixVideoData: function(source, width, height, loop, autostart, autoplay, allowfullscreen, imgurl){
			var vD = {
				'source': source,
				'width': parseInt(width, 10) || this.config.defaultVideoWidth,
				'height': parseInt(height, 10) || this.config.defaultVideoHeight,
				'loop': (loop && (loop == 1 || loop.toLowerCase()=='true')) ? 'true' : 'false',
				'autostart': (autostart && (autostart == 1 || autostart.toLowerCase()=='true')) ? 'true' : 'false',
				'allowfullscreen': (allowfullscreen && (allowfullscreen == 1 || allowfullscreen.toLowerCase()=='true')) ? 'true' : 'false',
				'autoplay': (autoplay && (autoplay == 1 || autoplay.toLowerCase()=='true')) ? 'true' : 'false',
				'imgurl': imgurl
			}
			return vD;
		}
	});
	ve.plugin.register('qzonevphoto', VEditor.plugin.QzoneVphoto);
})(VEditor);

/**
 * 截屏功能（依赖控件）
 * @author sasumi
 * @build 20130506
 */
(function(ve){
	var LOGIN_UIN = QZONE.FP._t.g_iLoginUin,		//登录用户UIN
		BLOG_TYPE = 7,								//传输到私密相册
		PLUGIN_INSTALL_URL = 'http://mail.qq.com/cgi-bin/readtemplate?t=browser_addon&check=false',

		IMG_MAX_WIDTH = 870,
		IMG_MAX_HEIGHT = null,

		UPLOADING_CLASS = 'image_uploading',		//上传中 img class
		UPLOAD_REPEAT_CLASS= 'image_reupload',		//重新上传

		SW_UPLOADING = false,			//是否正在上床中
		MAX_UPLOAD_TIME = 20000,		//最大上传时间
		UPLOAD_QUEUE = 1,				//队列中
		UPLOAD_SENDING = 2,				//上传中
		UPLOAD_DONE = 3,				//上传成功
		UPLOAD_ERROR = 4,				//上传错误
		UPLOAD_TIMEOUT = 5,				//上传超时

		UPLOAD_TIMER,					//上传计时器
		SW_QUEUE_UPLOADING = false,		//队列还在上床中
		QUEUE_UPLOAD_HASH = {};			//队列

	var uin = LOGIN_UIN+'';
	var IS_RELEASE = QZONE.FP.isAlphaUser() || uin.substring(uin.length-1,1) == 0;		//放量 10%

	ve.lang.Class('VEditor.plugin.ScreenShot', {
		editor: null,						//编辑器对象
		DIYClipBoardImg: 0,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.editor.createButton('screen', {
				'class': 'veScreen',
				title: '截屏',
				cmd: function(){_this.doCapture();}
			});

			//粘贴截图
			this.editor.onPaste.add(function(e){
				_this.pasteEvent(e);
			});

			//右键
			this.editor.onInitComplete.add(function(){
				ve.dom.event.add(_this.editor.getDoc(), 'contextmenu', function(){
					_this.updateContextMenu();
				});
				_this.editor.onKeyDown.add(function(e) {
					_this.pasteEvent(e);
				});
			});

			//图片重新上传
			this.editor.onClick.add(function(e){
				var tag = ve.dom.event.getTarget(e);
				if(tag.nodeName == 'IMG' && ve.dom.hasClass(tag, UPLOAD_REPEAT_CLASS)){
					_this.uploadOne(tag);
				}
			});

			//上传本地图片
			this.editor.onAfterPaste.addLast(function(){
				var localImgs = _this.getLocalImages();
				if(!localImgs.length){
					return;
				}
				_this.editor.tryIO('onPasteLocalImage', function(ev){
					ev.fire(_this.editor, localImgs)
				});
				_this.uploadTempFile();
			});

			//IO接口：判断是否正在上传图片
			this.editor.addIO('isUploadingPic', function(){
				return _this.isUploading();
			});

			//IO接口：粘贴本地图片
			this.editor.addIO('onPasteLocalImage', new ve.EventManager(this.editor));

			//IO接口：正在上传本地图片
			this.editor.addIO('onUploadingLocalImage', new ve.EventManager(this.editor));
		},

		/**
		 * 获取内容中的本地图片
		 * @return {Array} 
		 */
		getLocalImages: function(){
			var imgs = this.editor.getDoc().getElementsByTagName('img');
			var result = [];
			ve.lang.each(imgs, function(img){
				if(isLocalFile(img.src)){
					result.push(img);
				}
			});
			return result;
		},

		/**
		 * 更新上传队列 QUEUE_UPLOAD_HASH
		 * @descrption 这里做了去重了（根据 全局_UNIQUIE_HASH），和更新已经上传的文件的状态
		**/
		updateUploadHash: function(){
			var _this = this;
			var _isDone = function(eventType){
				return eventType && eventType != UPLOAD_QUEUE && eventType != UPLOAD_SENDING;
			};

			var localImgs = this.getLocalImages();
			ve.lang.each(localImgs, function(img){
				var item = QUEUE_UPLOAD_HASH[img.src];
				var state = _isDone(item) ? UPLOAD_DONE : UPLOAD_QUEUE;
				_this.updateOneImgUploadState(img, item, state);
				if(!item){
					QUEUE_UPLOAD_HASH[img.src] = UPLOAD_QUEUE;
				}
			});
		},

		/**
		 * 更新一个图片状态
		 * @param dom img
		 * @param string succSrc
		 * @param number eventType
		 **/
		updateOneImgUploadState: function(img, succSrc, eventType, p1, p2, p3){
			switch(eventType){
				case UPLOAD_DONE:
					img.title = '';
					img.src = succSrc;
					img.className = '';
					img.alt = '';
					break;

				case UPLOAD_ERROR:
					img.title = '上传失败';
					img.alt = '';
					img.className = UPLOAD_REPEAT_CLASS;
					break;

				default:
					img.className = UPLOADING_CLASS;
					img.title = '正在上传中,请稍候...';
					img.alt = '';
					break;
			}
		},

		/**
		 * 更新图片上传状态
		 * @param string localSrc
		 * @param string succSrc
		 * @param number eventType
		 **/
		updateImgUploadState: function(localSrc, succSrc, eventType, p1, p2, p3){
			var _this = this;
			ve.lang.each(getImgsBySrc(localSrc, this.editor.getDoc()), function(img){
				_this.updateOneImgUploadState(img, succSrc, eventType, p1, p2, p3);
			});
		},

		/**
		 * 上传temp中的文件
		 **/
		uploadTempFile: function(){
			if(!IS_RELEASE){
				return;
			}
			
			var uploader = getCaptureObject('Uploader');
			if(!uploader){
				this.showInstallCaptureObjectGuild();
				return;
			}

			//ie报错，所以和这里需要try
			if(verComp(uploader.Version, '1.0.1.54') < 0){
				this.editor.showStatusbar('安装最新版截屏插件可以自动上传word里面的图片，<a href="'+PLUGIN_INSTALL_URL+'" target="_blank" rel="install-new-screenshot">请点击这里进行安装</a>');
				return;
			}

			this.updateUploadHash();

			//队列还在跑
			if(SW_QUEUE_UPLOADING){
				return;
			}

			this._uploadTempFileQueue();
		},

		/**
		 * 是否正在上传中
		 **/
		isUploading: function(){
			return SW_UPLOADING;
		},

		/**
		 * 只更新一张图
		 * @param dom img
		 **/
		uploadOne: function(img){
			var src = img.src,
				_this = this;

			this.updateImgUploadState(src, null, UPLOAD_SENDING);

			if(isLocalFile(src)){
				_this.uploadPic(src, function(uploader, succSrc, eventType, p1, p2, p3){
					_this.updateImgUploadState(src, succSrc, eventType, p1, p2, p3);
					if(eventType != UPLOAD_QUEUE){
						QUEUE_UPLOAD_HASH[src] = succSrc || eventType;
					}
				});
			}
		},

		/**
		 * 进行队列
		 **/
		_uploadTempFileQueue: function(){
			var _this = this;

			//get one
			var src = null;
			ve.lang.each(QUEUE_UPLOAD_HASH, function(item, k){
				if(item == UPLOAD_QUEUE){
					src = k;
					return false;
				}
			});
			if(src){
				_this.uploadPic(src, function(uploader, succSrc, eventType, p1, p2, p3){
					_this.updateImgUploadState(src, succSrc, eventType, p1, p2, p3);
					if(eventType != UPLOAD_QUEUE){
						QUEUE_UPLOAD_HASH[src] = succSrc || eventType;
						_this._uploadTempFileQueue();		//upload rest
					}
				});
			} else {
				SW_QUEUE_UPLOADING = false;
			}
		},

		/**
		 * 截屏
		 */
		doCapture: function(){
			var _this = this;
			var capObj = getCaptureObject('ScreenCapture');
			if(!capObj){
				this.showInstallCaptureObjectGuild();
				return;
			}

			capObj.OnCaptureFinished = function(){
				capObj.BringToFront(window);
				var fileID = capObj.SaveClipBoardBmpToFile(1);
				_this.uploadPic(fileID, ve.lang.bind(_this,_this.onPastingImg));
			};
			capObj.DoCapture();
		},

		/**
		 * 安装插件
		 */
		showInstallCaptureObjectGuild: function(){
			this.editor.showStatusbar('您的浏览器还没有安装截屏插件，<a href="'+PLUGIN_INSTALL_URL+'" target="_blank">请点击这里进行安装</a>');
		},

		/**
		 * 更新右键菜单
		 * 这里针对IE有效
		 */
		updateContextMenu: function(){
			var capObj = getCaptureObject('ScreenCapture');
			if(!capObj){
				return;
			}

			var fileID = capObj.SaveClipBoardBmpToFile(1);
			if(fileID){
				this._tempFileID = fileID;
			}
			if(capObj.IsClipBoardImage && window.clipboardData){//系统剪切板有图片
				window.clipboardData.setData("Text","TencentMailPlugin_QZONE");
				this.DIYClipBoardImg = 1;
			}
		},

		/**
		 * 绑定粘贴事件
		 * 这里要接收两种事件，一种是keydown(ctrl+v)，另外一种是粘贴事件（鼠标右键粘贴）
		 * @param {Object} e
		 */
		pasteEvent: function(e){
			e = e || window.event;

			//第一次是只有一个ctrl，需要跳过
			if(e.ctrlKey && e.keyCode == 17 && e.type != 'paste'){
				return;
			}

			if (e.ctrlKey && (e.keyCode == 86)||(e.keyCode == 118) || (e.keyCode == 59)){
				var capObj = getCaptureObject('ScreenCapture');
				if(!!capObj && capObj.IsClipBoardImage){//系统剪切板有图片
					this.editorPaste(e);
					return false;
				}else{
					return true;
				}
		    } else if(e.type == 'paste'){
				var capObj = getCaptureObject('ScreenCapture');
				//这里的capObj对象有可能IsClipBoardImage==0， 因此加上一个 _tmpFileID作为判断
				if(!!capObj && (capObj.IsClipBoardImage || this._tempFileID)){//系统剪切板有图片
					this.editorPaste(e);
					return false;
				}else{
					return true;
				}
			}

			if (e.ctrlKey && (e.keyCode == 67)||(e.keyCode == 99)){
				this.DIYClipBoardImg = 0;
		    }
		},

		doPaste: function(){
			var capObj = getCaptureObject('ScreenCapture');
			if(!capObj){
				return;
			}

			if(capObj.IsClipBoardImage){
				capObj.BringToFront(window);
				var fileID = capObj.SaveClipBoardBmpToFile(1);
				this.uploadPic(fileID, ve.lang.bind(this, this.onPastingImg));
			}

			else if(this.DIYClipBoardImg==1){
				capObj.BringToFront(window);
				var fileID = this._tempFileID;
				this.uploadPic(fileID, ve.lang.bind(this, this.onPastingImg));
			}

			return true;
		},

		/**
		 * 粘贴图片处理回调
		 * @param string srcStr 源数据
		 * @param string succSrc 成功的图片src
		 * @param number eventType 事件类型
		 * @param number p1 百分比
		 * @param number p2 百分比
		 * @param number p3 待扩展
		 **/
		onPastingImg: function(srcStr, succSrc, eventType, p1, p2, p3){
			switch(eventType){
				//上传失败
				case UPLOAD_ERROR:
					QZONE.FP.showMsgbox('处理截图预览时遇到错误，请稍后再试。',5,3000);
					break;

				//上传中
				case UPLOAD_SENDING:
					QZONE.FP.showMsgbox('正在处理图片预览，请稍候 : ' + Math.round(p1/p2*100) + '%',6, 3000);
					break;

				//上传完成
				case UPLOAD_DONE:
					QZONE.FP.showMsgbox('正在插入图片，请稍候',6, 3000);
					this.editor.insertImage({src:succSrc}, IMG_MAX_WIDTH, IMG_MAX_HEIGHT, function(){
						QZONE.FP.hideMsgbox();
					});
			}
		},

		/**
		 * 上传图片
		 * @param string fileID
		 * @param function callback 上传回调，参数：fileID, succSrc, eventType, p1, p2, p3
		 */
		uploadPic: function(fileID, callback){
			if(!fileID){
				return;
			}

			var _this = this;
			var uploader = getCaptureObject('Uploader');
			if(!uploader){
				this.showInstallCaptureObjectGuild();
				return;
			}

			//获取上传路径
			getUploadUrl(function(uploadUrl){
				if(SW_UPLOADING){
					_this.editor.showStatusbar('正在上传文件，请稍候...');
					return;
				}
				SW_UPLOADING = true;

				var _reset = function(){
					uploader.StopUpload();
					clearTimeout(UPLOAD_TIMER);
					SW_UPLOADING = false;
				};

				//超时
				UPLOAD_TIMER = setTimeout(function(){
					_reset();
					callback(fileID, null, UPLOAD_TIMEOUT);
				}, MAX_UPLOAD_TIME);

				uploader.OnEvent = function(_tmp, eventType, p1, p2, p3){
					var succSrc = '';
					if(eventType == UPLOAD_DONE){
						var succSrc = _this.getUploadedSrc(uploader);
						if(!succSrc){
							eventType = UPLOAD_ERROR;
						};
					}
					if(eventType == UPLOAD_DONE || eventType == UPLOAD_ERROR){
						_this.editor.hideStatusbar();
						_reset();
					}
					callback(fileID, succSrc, eventType, p1, p2, p3);
				};

				uploader.URL = uploadUrl;
				uploader.StopUpload();
				uploader.ClearHeaders();
				uploader.ClearFormItems();
				uploader.AddHeader('cookie',document.cookie);

				if(isLocalFile(fileID)){
					fileID = convWinDS(fileID);
					var s = uploader.AddTempFileItem('picname2', fileID);	//非合法tmp文件
					if(!s){
						_reset();
						return;
					}
					_this.editor.tryIO('onUploadingLocalImage', function(ev){
						ev.fire(_this.editor, fileID);
					});
				} else {
					uploader.AddFormItem('picname2', 1, 0, fileID);
				}

				uploader.AddFormItem('blogtype',0,0, BLOG_TYPE);
				uploader.AddFormItem('json',0,0,"1");
				uploader.AddFormItem('refer',0,0,'blog');
				uploader.StartUpload();
			}, function(){
				_this.editor.showStatusbar('暂时无法获取您当前的地理位置，请稍后再试。', 3);
			});
		},

		/**
		 * 判断是否上传成功
		 * @param string str
		 * @return mix
		 **/
		getUploadedSrc: function(uploader){
			if(!uploader || !uploader.Response){
				return null;
			}

			var str = uploader.Response;
			var _r = /{.*}/ig;
			if(!str.match(_r)){
				return null;
			}

			var strMsg = '';
			var o = eval("("+str+")");
			if(o.error!=null){
				strMsg = o.error;
				return null;
			}
			return o.url;
		},

		/**
		 * 截图粘贴
		 */
		editorPaste: function(e){
			var capObj = getCaptureObject('ScreenCapture');
			if(!capObj){
				return;
			}

			if(capObj.IsClipBoardImage || (this.DIYClipBoardImg==1 && window.clipboardData.getData("Text") == "TencentMailPlugin_QZONE")){
				this.doPaste();
				ve.dom.event.preventDefault(e);
				return false;
			}
		}
	});
	ve.plugin.register('screenshot', VEditor.plugin.ScreenShot);

	/**
	 * 获取用户上传图片的地址
	 * @param function succCb 成功回调
	 * @param function errCb 失败回调
	 **/
	var getUploadUrl = (function(){
		var uploadUrl = '';
		var checking = false;

		//用户路由信息
		var userLocation = (function(){
			try {
				var cfg = parent.QZONE.dataCenter.get('user_domain_'+LOGIN_UIN);
				return cfg[cfg.domain['default']].u;
			} catch (ex){}
		})();

		/**
		 * 第一道检测
		 * @param function succCb
		 * @param function errCb
		 **/
		var check1 = function(succCb, errCb){
			if(uploadUrl){
				succCb(uploadUrl);
				return;
			} else if(checking){
				setTimeout(function(){check1(succCb, errCb);}, 1000);
				return;
			}

			checking = true;
			if(!userLocation){
				var url = 'http://route.store.qq.com/GetRoute?UIN='+LOGIN_UIN+"&type=json&version=2";
				var JG = new QZFL.JSONGetter(url, void(0), null, "GB2312");
				JG.onSuccess = function(data) {
					checking = false;
					try {userLocation = data[data.domain['default']].u;} catch(e){}
					if(userLocation){
						uploadUrl = "http://"+userLocation+"/cgi-bin/upload/cgi_upload_illustrated";
						succCb(uploadUrl);
					} else {
						check2(succCb, errCb);
					}
				};
				JG.onError = JG.onTimeout = function() {
					checking = false;
					check2(succCb, errCb);
				};
				JG.send('photoDomainNameCallback');
			} else {
				uploadUrl = "http://"+userLocation+"/cgi-bin/upload/cgi_upload_illustrated"
				succCb(uploadUrl);
			}
		}

		/**
		 * 第二道检测
		 * @param function succCb
		 * @param function errCb
		**/
		var check2 = function(succCb, errCb){
			if(uploadUrl){
				succCb(uploadUrl);
				return;
			}
			if(checking){
				setTimeout(function(){check2(succCb, errCb);}, 1000);
				return;
			}

			checking = true;
			var url = 'http://rb.store.qq.com/GetRoute?UIN='+LOGIN_UIN+"&type=json&version=2";
			var JG = new QZFL.JSONGetter(url, void(0), null, "GB2312");
			JG.onSuccess = function(data) {
				checking = false;
				try {userLocation = data[data.domain['default']].u;} catch(e){}
				if(userLocation){
					uploadUrl = "http://"+userLocation+"/cgi-bin/upload/cgi_upload_illustrated";
					succCb(uploadUrl);
				} else {
					errCb();
				}
			};
			JG.onError = JG.onTimeout = function() {
				checking = false;
				errCb();
			};
			JG.send('photoDomainNameCallback');
		};
		return check1;
	})();

	/**
	 * 转换windows路径中的斜杠为反斜杠
	 * @param string path
	 * @return string
	 **/
	var convWinDS = function(path){
		return path.replace(/^file\:\/\/\//i,'__FILE__').replace(/\//g,'\\').replace(/^__FILE__/, 'file:///');
	};

	/**
	 * 根据图片src获取图片dom
	 * @param string src
	 * @return array
	**/
	var getImgsBySrc = function(src, doc){
		var tmp = doc.getElementsByTagName('img');
		var imgs = [];
		ve.lang.each(tmp, function(img){
			if(img.src == src){
				imgs.push(img);
			}
		});
		return imgs;
	};

	/**
	 * 是否为本地文件
	 * 检测格式：file:, C:, D:
	 * @param string filePath
	 * @return bool
	 **/
	var isLocalFile = function(filePath){
		return /^file\:/i.test(filePath) || /^[a-z]\:/i.test(filePath);
	};

	/**
	 * 获取截屏控件对象(单例)
	 * @param string id 支持 Uploader, ScreenCapture
	 * @return object
	 */
	var getCaptureObject = (function(){
		var CAP_HASH = {};
		return function(id){
			if(CAP_HASH[id]){
				return CAP_HASH[id];
			}

			var obj = null;
			try{
				if(ve.ua.ie) {
					obj = new ActiveXObject('TXGYMailActiveX.' + id);
				} else {
					if(!document.getElementById("ffScreenPlugin")) {
						var oDiv = document.createElement('div');
						document.body.appendChild(oDiv);
						if(ve.ua.firefox){	//Firefox用这个type
							oDiv.innerHTML = '<embed id="ffScreenPlugin" type="application/x-tencent-qmail" hidden="true"></embed>';
						} else {
							oDiv.innerHTML = '<embed id="ffScreenPlugin" type="application/x-tencent-qmail-webkit" hidden="true"></embed>';
						}
					}
					var pluginObject = document.getElementById('ffScreenPlugin');
					if(id == "ScreenCapture") {
						obj = pluginObject.CreateScreenCapture();
					}
					else if(id == "Uploader") {
						obj = pluginObject.CreateUploader();
					}
				}
			} catch(ex){
				obj = null;
			}

			CAP_HASH[id] = obj;
			return obj;
		}
	})();

	/**
	 * 版本比较
	 * 规则：1.0 = 1, 1.01 = 1.1, 1.0.2 > 1.0, 1.0.3 < 1.0.3.1，跟国际版本号标准不一致
	 * @param string tagVer
	 * @param string srcVer
	 * @return number 大于0 表示 版本比srcVer大，小于0表示小于，等于表示等于
	 **/
	var verComp = function(tagVer, srcVer){
		var tv = tagVer.split('.');
		var sv = srcVer.split('.');

		for(var i=0, j=Math.max(tv.length, sv.length); i<j; i++){
			var a = parseInt(tv[i] || 0, 10),
				b = parseInt(sv[i] || 0, 10);
			if(a > b){
				return 1;
			} else if(a < b){
				return -1;
			}
		}
		return 0;
	};
})(VEditor);
(function(ve) {
	var IMG_MAX_WIDTH = 870,
		IMG_MAX_HEIGHT = null;

	/**
	 * 侧栏插相册图片
	 * 依赖相册前台脚本环境
	 */
	ve.lang.Class('VEditor.plugin.QzoneSideAlbum', {
		lazyTm: 0,
		editor: null,
		fullState: false,

		init: function(editor, url){
			if(window.screen.width < 1280 || window.screen.height < 720 || QZBlog.Util.isOldXWMode()){
				return;
			}

			var _this = this;
			this.editor = editor;
			this.editor.onInitComplete.add(function(){
				if(!parent.VEDITOR_SIDEALBUM){
					setTimeout(function(){
						var loader = new parent.QZFL.JsLoader();	//这里只能用loader，需要强制重新加载一次
						loader.onload = function(){
							if(parent.VEDITOR_SIDEALBUM){
								_this._onSidealbumLoaded(parent.VEDITOR_SIDEALBUM);
							};
						};
						loader.load(url+'side.js', null, {"charset":"utf-8"});
					}, _this.lazyTm);
				} else {
					_this._onSidealbumLoaded(parent.VEDITOR_SIDEALBUM);
				}
			});
		},

		_loadImage: function(src, succCb){
			var img = new Image();
			img.onload = succCb;
			img.src = src;
		},

		_onSidealbumLoaded: function(VS){
			var _this = this;
			var body = _this.editor.getBody();

			VS.start();
			VS.onSetImage = function(imgSrc){
				_this.editor.showStatusbar('正在插入图片...', 5);
				_this.editor.insertImage({src:imgSrc}, IMG_MAX_WIDTH, IMG_MAX_HEIGHT, function(){
					_this.editor.hideStatusbar();
				});
			};

			var handle = function(drop){
				if(!VS.hasDrag){
					return;
				}
				VS.hasDrag = false;
				setTimeout(function(){
					var imgs = body.getElementsByTagName('IMG');
					for(var i=0; i<imgs.length; i++){
						var rel = imgs[i].getAttribute('rel');
						if(rel && rel.indexOf('http://') == 0){
							_this.editor.showStatusbar('正在插入图片...', 5);
							_this._loadImage(rel, function(){
								_this.editor.hideStatusbar();
								imgs[i].src = rel;
								imgs[i].removeAttribute('rel');
								_this.editor.resize();
							});
						}
						if(QZFL.css.hasClassName(imgs[i].parentNode, 'list_item')){
							QZFL.dom.swapNode(imgs[i].parentNode, imgs[i]);
						}
					}
					if(drop){
						QZBlog.Logic.TCISDClick('picsidebar.dragevent', '/BlogEditer');	//拖动事件统计
					}
				}, 0);
			};
			ve.dom.event.add(body, 'drop', function(){handle(true);});
			ve.dom.event.add(body, 'mousemove', function(){handle();});

			_this.editor.tryIO('onBeforeToggleHtmlState', function(ev){
				ev.add(function(orgiState){
					VS[orgiState ? 'show': 'hide']();
				});
			});

			_this.editor.tryIO('onAfterToggleScreen', function(ev){
				ev.add(function(toFull){
					VS.updatePanelPos(toFull);
					_this.fullState = toFull;
				});
			});

			//预览时隐藏面板
			PageScheduler.addEvent('afterDoPreviewBlog', function(){
				VS.hide();
			});

			//取消预览显示面板
			PageScheduler.addEvent('cancelpreview', function(){
				VS.show();
			});
		}
	});
	ve.plugin.register('qzonesidealbum', VEditor.plugin.QzoneSideAlbum);
}) (VEditor);
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneBlogSave', {
		editor: null,

		init: function (editor, url) {
			this.editor = editor;
			var ev = new ve.EventManager(editor);
			editor.addIO('onSubmit', ev);

			//快捷键
			editor.addShortcut('ctrl+enter', function(){
				ev.fire(editor, true);
			});

			//按钮UI
			editor.toolbarManager.createButton('submit', {title:'发表日志(ctrl+enter)', 'text':'发 表','class':'veSubmitBlog', cmd:function(){
				ev.fire(editor);
			}});
		}
	});
	ve.plugin.register('qzoneblogsave', VEditor.plugin.QzoneBlogSave);
})(VEditor);

/**
 * 外域图片自动转存空间
 * @deprecate 该插件仅在空间日志下面的环境可以运行
 * 依赖登录态、QZFL、QZBlog
 */
(function(ve){
	var CHECK_TIMER;
	ve.lang.Class('VEditor.plugin.QzoneImageAutoSaver', {
		editor: null,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.editor.onAfterPaste.addLast(function(){
				_this.checkQuoteExternalImage();
			});
			this.editor.onKeyDown.add(function(){
				_this.checkQuoteExternalImage();
			});
		},

		/**
		 * 检测外域图片
		 */
		checkQuoteExternalImage: function(){
			var _this = this;
			clearTimeout(CHECK_TIMER);
			CHECK_TIMER = setTimeout(function(){
				var _html = _this.editor.getBody().innerHTML;
				var extImgs = _this.getExternalImages(_html);
				if(extImgs && extImgs.length > 0){
					_this.editor.showStatusbar('您日志中的网络图片将在发表后缓存。', 10);
				}
			}, 3000);
		},

		/**
		 * 获取外域图片数组
		 * @param {string} html
		 * @return {array}
		 */
		getExternalImages: function(html){
			var arr = [];
			if(!html){
				return arr;
			}
			html = html.replace(/<img([^>]+)>/ig,function(){
				try {
					var em = /em\/e(\d{1,3}).gif/i.exec(arguments[1]);	//表情
					if(em){
						return;
					}
					var src = /orgSrc="([^"]+)"/i.exec(arguments[1]) || /src="([^"]+)"/i.exec(arguments[1]);
					if(!src || /ac\/b\.gif/i.test(src[1])) {
						return;
					}
					if( !/^http:\/\/[^\s]*photo.store.qq.com/i.test(src[1]) &&
						!/^file:/i.test(src[1]) &&
						!/.qq.com\//i.test(src[1]) &&
						!/.soso.com\//i.test(src[1]) &&
						!/.paipaiimg.com\//i.test(src[1]) &&
						!/.qpic.cn\//i.test(src[1]) &&
						!/.paipai.com\//i.test(src[1]) ) {
						arr.push(src[1]);
					}
				} catch(err) {
					console.log('err',err);
				}
				return arguments[0];
			});
			return this._uniqueArray(arr);
		},

		_uniqueArray: function(arr){
			if(!arr || !arr.length){
				return arr;
			}
			var flag = {},index = 0;
			while (index < arr.length) {
				if (flag[arr[index]] == typeof(arr[index])) {
					arr.splice(index, 1);
					continue;
				}
				flag[arr[index].toString()] = typeof(arr[index]);
				++index;
			}
			return arr;
		}
	});
	ve.plugin.register('qzoneimageas', VEditor.plugin.QzoneImageAutoSaver);
})(VEditor);

