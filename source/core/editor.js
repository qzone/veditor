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