(function(window, document, undefined) {
	if(window.VEditor){
		throw "VEDITOR NAMESPACE CONFLICT";
	}

	//设定发布目录，缺省为使用source
	var VEDITOR_RELEASE_PATH = window.VEDITOR_RELEASE_PATH === undefined ? './../source/' : window.VEDITOR_RELEASE_PATH;

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
	 * 编辑器主脚本路径
	 * @deprecate 改方法仅判断页面上 script节点里面src包含ve.[*.]js的脚本路径
	 * 因此如果页面上存在类似命名的脚本，将导致调用该变量的功能失效
	 **/
	var SCRIPT_SRC = (function(){
		var scriptList = document.getElementsByTagName('script');
		for (var i=0; i<scriptList.length; i++) {
			var src = scriptList[i].src;
			if (src && /ve\.(\w|\.)*js/.test(src)) {
				return src;
			}
		}
		return null;
	})();

	/**
	 * 编辑器基础URL前缀
	 * 作为veditor的相对路径
	 **/
	var BASE_PATH = (function(){
		if(!SCRIPT_SRC){
			return '';
		}

		var PATH_HOST = location.protocol + '//' +  location.hostname + (location.port ? ':'+location.port : '')+'/';
		var scriptPath = SCRIPT_SRC.replace(/[^\/]*$/, '');

		var forceDomain = '';
		var tmp = document.getElementsByTagName('BASE');
		if(tmp && tmp.length && tmp[0].href){
			forceDomain = tmp[0].href.replace(/\/$/,'')+'/';
		}

		if(/^(\.)*\//.test(scriptPath)){
			return (forceDomain || PATH_HOST) +scriptPath.replace(/^\//, '')+VEDITOR_RELEASE_PATH;
		} else {
			return scriptPath+VEDITOR_RELEASE_PATH;
		}
	})();

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
		version: '2.02',
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
	window.veEditor = window.VEditor = VEditor;
}) (window, document);