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
