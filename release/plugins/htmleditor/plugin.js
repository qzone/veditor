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