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