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