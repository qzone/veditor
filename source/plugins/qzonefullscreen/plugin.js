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
		QZONE.FP._t.QZFL.dialog.create('温馨提示',
			'<p style="padding:15px;line-height:24px;font-size:14px;">您使用的浏览器版本过低，目前暂不能支持日志编辑器全屏模式。'+
			'立即升级浏览器<br/><a href="http://www.google.com/intl/zh-CN/chrome/browser/" target="_blank">Chrome</a> '+
			'<br/><a href="http://www.microsoft.com/en-us/download/details.aspx?id=43" target="_blank">Internet Explorer8</a> '+
			'<br/><a href="http://www.mozilla.org/en-US/firefox/new/" target="_blank">Firefox</a> <br/>获得完美的空间体验！</p>',
			{
				width:400,
				height:150,
				showMask:true,
				buttonConfig: [{
				   type : QZFL.dialog.BUTTON_TYPE.Cancel,
				   text : '关闭',
				   tips : '关闭'
				}]
		  }
		);
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