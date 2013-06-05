(function(ve) {
	/**
	 * 侧栏插相册图片
	 * 依赖相册前台脚本环境
	 */
	var loginUin = QZBlog.Logic.SpaceHostInfo.getLoginUin();
	var parentWin = QZONE.FP._t;
	var parentDoc = QZONE.FP._t.document;
	var inPengyou = QZBlog.Logic.isInPengyou;
	var styleSheetId = 'vepluginqzonesidebaralbum';
	var pQZFL = parentWin.QZFL;
	var photoLogicSrc = '/qzone/client/photo/pages/qzone_v4/script/photo_logic.js';
	var appFrame = window.frameElement;

	var _appWidth = inPengyou ? 920 : (QZFL.dom.getSize(appFrame)[0] || 900);
	var _scrollSwitch = true;

	parentWin.QZFL.css.insertCSSLink('http://qzonestyle.gtimg.cn/qzone_v6/blog_extendbar.css?'+Math.random(), styleSheetId);

	/**
	 * Qzone侧栏插相册
	 */
	ve.lang.Class('VEditor.plugin.QzoneSideAlbum', {
		//unloading: false,			//防手抖开关，如果用户在退出页面，确认是否保存页面的msg的时候不断的滚的话，
									//会导致二级页的对top页面相应的操作全部失败，所以，必须在二级页操作函数之前，
									//先关掉scroll这类型事件，才能成功删除，但是chrome还是有问题。。。
		editor: null,
		panel: null,				//面板
		panelState: true,			//面板折叠状态

		dragTag: null,

		initTop: QZFL.dom.getXY($('blog-editor-toolbar'))[1] + (QZBlog.Logic.isInPengyou ? 15 : 0)+2,	//朋友app具备padding-top:15px

		cache_data: {},

		picListPageSize: 5,			//相册图片分页大小
		picListPageCurIndex: 1,		//当前页码
		picListPageCount: 1,		//页数
		picListCurAlbumId: null,	//当前相册id

		fullState: false,

		init: function(editor, url){
			if(window.screen.width < 1280 || window.screen.height < 720 || QZBlog.Util.isOldXWMode() || (parent['g_version'] != 6)){
				return;
			}

			QZBlog.Logic.TCISDClick('picsidebar.init','/BlogEditer');

			var _this = this;
			window._VE_QZONE_SIDE_ALBUM_OBJ = this;

			this.editor = editor;
			this.editor.onInitComplete.add(function(){
				_this.setupDragEvent();
			});

			this.loadPhotoLogicFile(function(){
				_this.initPanel();
				_this.updatePicList(-1);										//加载最新照片
				setTimeout(function(){_this.updateAlbumList();}, 2000);		//相册列表延后加载（防止阻塞最新照片列表加载）
			});
			this.bindPageUnloadHandle();

			editor.tryIO('onAfterToggleScreen', function(ev){
				ev.add(function(toFull){
					_this.updatePanelPos(toFull);
					_this.fullState = toFull;
				});
			});

			editor.tryIO('onAfterSwitchToolbar', function(ev){
				ev.add(function(toAdv){
					_this.updatePanelPos(_this.fullState);	//todo
				});
			});

			editor.tryIO('onBeforeToggleHtmlState', function(ev){
				ev.add(function(orgiState){
					_this.panel.style.display = orgiState ? 'none' : '';
				});
			});
		},

		updatePanelPos: function(toFull){
			if(!this.panel){
				return;
			}

			_scrollSwitch = !toFull;
			if(toFull){
				this.panel.style.top = '50px';	//todo
				var posInfo = ve.dom.getXY(this.editor.iframeElement);
				var sizeInfo = ve.dom.getSize(this.editor.iframeElement);
				this.panel.style.marginLeft = (posInfo[0] + sizeInfo[0] + 7) + 'px';
			} else {
				this.panel.style.top = this.initTop + 'px';
				this.panel.style.marginLeft =(_appWidth+1) + 'px';
			}
		},

		/**
		 * 初始化相册侧栏
		 */
		initPanel: function(){
			this.panel = parentDoc.createElement('div');
			this.panel.className = 'blog_extendbar';
			this.panel.style.cssText = 'position:absolute; z-index:5; overflow-x:hidden; width:113px; height:550px; top:'+this.initTop+'px; margin-left:'+(_appWidth+1)+'px;';

			this.panel.innerHTML = ([
					'<a class="blog_foldbt" href="javascript:;">收起<b class="ui_trig ui_trig_t"></b></a><input type="text" style="width:1px;height:1px; display:block; position:absolute; left:99999px"/>',
					'<div class="blog_picshow">',
						'<div class="picshow_hd">',
							'<h4><span id="ve_editor_sideablum_panel_album_title" style="cursor:pointer">最新照片</span></h4>',
							'<div class="picshow_menu">',
								'<a class="menu_hd" href="javascript:;" title="点此查看全部相册列表"><b class="ui_trig ui_trig_b"></b></a>',
								'<div class="menu_bd" style="display:none; max-height:410px">',
									'<ul class="menu_list">',
										//'<li><a href="javascript:;">正在拉取相册列表</a></li>',
									'</ul>',
								'</div>',
							'</div>',
						'</div>',
						'<div class="picshow_bd" style="height:420px">',
							'<div class="picshow_list"><div class="list_item"></div></div>',
							'<div class="picshow_nav" style="display:none">',
								'<label class="nav_r" title="下一页"><b class="ui_trig ui_trig_r"></b></label>',
								'<label class="nav_l" title="上一页"><b class="ui_trig ui_trig_l"></b></label>',
							'</div>',
						'</div>',
					'</div>',
				]).join('');
			appFrame.parentNode.insertBefore(this.panel, appFrame);
			this.updatePanelPos();
			this.setupPanelEvent();
			this.setupClickState();
		},

		_getPanelDomBySelector: function(selector){
			return parentWin.$e(selector, this.panel).elements[0];
		},

		/**
		 * 加载相册逻辑文件
		 * @param {function} callback
		 */
		loadPhotoLogicFile: function(callback){
			QZFL.imports(photoLogicSrc, function(data){
				callback && callback();
			});
		},

		/**
		 * 更新相册列表
		 * @param {function} succCallBack
		 * @param {function} errCallBack
		 */
		updateAlbumList: function(succCallBack, errCallBack){
			var _this = this;
			_this._getPanelDomBySelector('.menu_bd').innerHTML = '<ul class="menu_list"><li class="loading">正在加载...</li></ul>';
			PhotoLogic.getAlbumList({
				uin: loginUin,
				type: 15,
				refer: 'blog',
				refresh: false,
				callBack: function (d) {
					var html = '<ul class="menu_list"><li class="loading">相册数据为空</li></ul>';
					if(d.albums.length){
						html = '<ul class="menu_list"><li><a href="javascript:;" albumid="-1">最新照片</a></li>';
						for(var i=0; i<d.albums.length; i++){
							html += '<li><a href="javascript:;" albumid="'+d.albums[i].id+'" title="'+d.albums[i].name.trim()+'">'+d.albums[i].name.trim()+'</a></li>';
						}
						html += '</ul>';
					}
					_this._getPanelDomBySelector('.menu_bd').innerHTML = html;
					if(d.albums.length>14 && QZFL.userAgent.ie==6){
						_this._getPanelDomBySelector('.menu_bd').style.height = '410px';
					}
					succCallBack && succCallBack(d);
				},
				errBack: function(){
					_this._getPanelDomBySelector('.menu_bd').innerHTML = '<ul class="menu_list"><li class="loading_fail"><p>拉取失败</p><i class="ui_ico icon_refresh" rel="refresh-album-list" title="重新拉取"></i></li></ul>';
					errCallBack && errCallBack(d);
				}
			});
		},

		/**
		 * 拉取相册图片列表
		 * @param {string} aid aid=-1表示最新相册
		 * @param {integer} pageIndex
		 * @param {function} succCallBack
		 * @param {function} errCallBack
		 */
		updatePicList: function(aid, pageIndex, succCallBack, errCallBack){
			var _this = this;
			pageIndex = pageIndex > 0 ? pageIndex : 1;
			aid = aid || _this.picListCurAlbumId;
			if(!aid){
				throw "NO ALBUM ID";
			}
			var cache_key = loginUin + '_'+aid;

			_this.picListCurAlbumId = aid;
			_this.picListPageCurIndex = pageIndex;
			_this._getPanelDomBySelector('.picshow_list').innerHTML = '<div class="loading" title="正在加载"></div>';
			QZFL.css.removeClassName(_this._getPanelDomBySelector('.picshow_list'), 'picshow_nopic');
			_this._getPanelDomBySelector('.picshow_nav').style.display = 'none';

			var callback = function(d){
				if(d && d.photos && d.photos.length){
					var html = '';
					_this.cache_data[cache_key] = d;
					_this.picListPageCount = Math.ceil(d.photos.length / _this.picListPageSize);
					for(var i=(pageIndex-1)*_this.picListPageSize; (i<d.photos.length) && (i<pageIndex*_this.picListPageSize); i++){
						html += '<div class="list_item" title="拖动插入到日志"><img src="'+d.photos[i].pre.trim()+'" rel="'+(d.photos[i].origin_url || d.photos[i].url).trim()+'"/></div>';
					}
					_this._getPanelDomBySelector('.picshow_list').innerHTML = html;
					_this._bindImgEffect();
				} else {
					_this.picListPageCount = 1;
					_this._getPanelDomBySelector('.picshow_list').innerHTML = '<span class="no_pic"></span><p>'+(aid==-1 ? '无最新照片' : '本相册无照片')+'</p>';
					QZFL.css.addClassName(_this._getPanelDomBySelector('.picshow_list'), 'picshow_nopic');
				}

				//分页view更新
				_this._getPanelDomBySelector('.picshow_nav').style.display = _this.picListPageCount < 2 ? 'none' : '';
				QZFL.css[pageIndex == 1 ? 'addClassName' : 'removeClassName'](_this._getPanelDomBySelector('.nav_l'), 'disable');
				QZFL.css[pageIndex == _this.picListPageCount ? 'addClassName' : 'removeClassName'](_this._getPanelDomBySelector('.nav_r'), 'disable');
				succCallBack && succCallBack();
			};

			if(_this.cache_data[cache_key]){
				callback(_this.cache_data[cache_key]);
				return;
			}

			_this._getPanelDomBySelector('.picshow_list').innerHTML = '<div class="loading" title="加载中"></div>';
			PhotoLogic[(aid == -1 ? 'getNewPhoto': 'getPhotoList')]({
				refresh: false,
				uin: loginUin,
				contain:1,
				id: aid,
				callBack: callback,
				errBack: function(){
					_this._getPanelDomBySelector('.picshow_list').innerHTML = '<span class="pic_break"></span><p><i class="ui_ico icon_refresh" rel="refresh-pic-list" title="重新拉取"></i></p>';
					QZFL.css.addClassName(_this._getPanelDomBySelector('.picshow_list'), 'picshow_nopic');
					errCallBack && errCallBack();
				}
			});
		},

		_bindImgEffect: function(){
			var _this = this;
			var imgs = $e('.picshow_list img', _this.panel).elements;
			for(var i=0; i<imgs.length; i++){
				QZFL.event.addEvent(imgs[i], 'load', function(){
					var h = this.style.height || this.height || this.naturalHeight,
						w = this.style.width || this.width || this.naturalWidth;
					if(h/w > (60/80)){	//短边压缩
						QZFL.css.addClassName(this.parentNode,'show_width');
					} else {
						QZFL.css.addClassName(this.parentNode,'show_height');
					}
				});
				QZFL.event.addEvent(imgs[i], 'mouseover', function(){
					QZFL.css.addClassName(this.parentNode, 'cur');
				});
				QZFL.event.addEvent(imgs[i], 'mouseout', function(){
					QZFL.css.removeClassName(this.parentNode, 'cur');
				});
			}
		},

		/**
		 * 切换相册侧栏
		 */
		togglePanel: function(state){
			state = state === undefined ? !this.panelState : state;
			this._getPanelDomBySelector('.blog_foldbt').innerHTML = (state ? '收起' : '展开快速插图') + '<b class="ui_trig '+(state ? 'ui_trig_t' : 'ui_trig_b')+'"></b>';
			this._getPanelDomBySelector('.blog_picshow').style.display = state ? '' : 'none';
			this.panelState = state;
		},

		/**
		 * 切换相册选择列表
		 */
		toggleAlbumSelectPanel: function(state){
			state = state === undefined ? (this._getPanelDomBySelector('.menu_bd').style.display == 'none') : state;
			this._getPanelDomBySelector('.menu_bd').style.display = (state ? 'block' : 'none');
			this._getPanelDomBySelector('.menu_bd').parentNode.className = state ? 'picshow_menu cur' : 'picshow_menu';
		},

		/**
		 * 设置面板元素事件
		 * @param {Object} container
		 */
		setupPanelEvent: function(container){
			var _this = this;

			//面板滚动
			pQZFL.event.addEvent(QZONE.FP._t, 'scroll', _this._bindPanelScroll);

			//面板折叠
			pQZFL.event.addEvent(_this._getPanelDomBySelector('.blog_foldbt'), 'click', function(){
				_this.togglePanel();
				pQZFL.event.preventDefault();
				return false;
			});

			//相册选择菜单
			pQZFL.event.addEvent(this._getPanelDomBySelector('.menu_hd'), 'click', function(){
				_this.toggleAlbumSelectPanel();
				pQZFL.event.preventDefault();
				return false;
			});

			//相册选择菜单
			pQZFL.event.addEvent(this._getPanelDomBySelector('#ve_editor_sideablum_panel_album_title'), 'click', function(){
				_this.toggleAlbumSelectPanel();
				pQZFL.event.preventDefault();
				return false;
			});

			//隐藏相册选择
			pQZFL.event.addEvent(parentDoc.body, 'click', _this._hideAlbumSelectPanel);

			//选择相册
			pQZFL.event.addEvent(this._getPanelDomBySelector('.menu_bd'), 'click', function(e){
				var clickTag = parentWin.QZFL.event.getTarget(e);
				var albumid = clickTag.getAttribute('albumid');
				if(albumid){
					_this.updatePicList(albumid);
					_this._getPanelDomBySelector('.picshow_hd h4 span').innerHTML = clickTag.innerHTML;
					_this._getPanelDomBySelector('.picshow_hd h4 span').title = clickTag.innerHTML.toRealStr();;
					_this.toggleAlbumSelectPanel(false);
				}
				pQZFL.event.preventDefault();
			});

			//选择图片
			pQZFL.event.addEvent(this._getPanelDomBySelector('.picshow_list'), 'mousedown', function(e){
				var tag = pQZFL.event.getTarget(e);
				if(tag.tagName == 'IMG'){
					_this.dragTag = tag;
				}
			});

			//插入图片
			pQZFL.event.addEvent(this._getPanelDomBySelector('.picshow_list'), 'click', function(e){
				var tag = pQZFL.event.getTarget(e);
				if(tag.tagName == 'IMG'){
					_this.dragTag = null;

					var id = 'drag_img_'+Math.random();
					_this.editor.insertHtml({content:'<img src="'+tag.getAttribute('rel')+'" id="'+id+'"/>'});
					_this.bindImageResize(id);
					_this.bindImgOnloadEvent();
				}
			});

			//刷新图片列表
			pQZFL.event.addEvent(this._getPanelDomBySelector('.picshow_list'), 'click', function(e){
				var tag = pQZFL.event.getTarget(e);
				if(tag.getAttribute('rel') == 'refresh-pic-list'){
					_this.updatePicList();
					pQZFL.event.preventDefault();
					return false;
				}
			});

			//刷新相册列表
			pQZFL.event.addEvent(this.panel, 'click', function(e){
				var tag = pQZFL.event.getTarget(e);
				if(tag.getAttribute('rel') == 'refresh-album-list'){
					_this.updateAlbumList();
					pQZFL.event.preventDefault();
					return false;
				}
			});

			//上一页
			pQZFL.event.addEvent(this._getPanelDomBySelector('.nav_l'), 'click', function(){
				if(_this.picListPageCurIndex > 1){
					_this.updatePicList(null, _this.picListPageCurIndex-1);
				}
			});

			//下一页
			pQZFL.event.addEvent(this._getPanelDomBySelector('.nav_r'), 'click', function(){
				if(_this.picListPageCurIndex < _this.picListPageCount){
					_this.updatePicList(null, _this.picListPageCurIndex+1);
				}
			});


			_this.editor.tryIO('onBeforeToggleHtmlState', function(ev){
				ev.add(function(orgiState){
					_this.panel.style.display = orgiState ? 'none' : '';
				});
			});
		},

		bindImgOnloadEvent: function(){
			var _this = this;
			var imgs = this.editor.getDoc().getElementsByTagName('IMG');
			for(var i=0; i<imgs.length; i++){
				QZFL.event.addEvent(imgs[i], 'load', function(){
					_this.editor.resize();
				});
			}
		},

		/**
		 * 绑定面板滚动
		 */
		_bindPanelScroll: function(e){
			if(!_scrollSwitch){
				return;
			}

			var _this = window._VE_QZONE_SIDE_ALBUM_OBJ;
			var ie6 = QZFL.userAgent.ie == 6
			var _scrollTop = pQZFL.dom.getScrollTop();

			//顶部滚动工具条需要占位
			var _qzone_toolbar_top = 0;
			var _tmp = parentDoc.getElementById('QZ_Toolbar_Container');
			var _toolbarTop = QZFL.dom.getXY($('blog-editor-toolbar'))[1];
			var _appFrameTop = pQZFL.dom.getXY(appFrame)[1];
			var _appFrameHeight = pQZFL.dom.getSize(appFrame)[1];

			if(_tmp && !ie6){
				_qzone_toolbar_top = QZFL.dom.getSize(_tmp)[1] + (parseInt(_tmp.style.marginTop) || 0);
			}

			var _checkTop = _appFrameTop + _toolbarTop;
				_checkTop -= _qzone_toolbar_top;
			var _maxTop = _qzone_toolbar_top + _appFrameHeight + _appFrameTop - pQZFL.dom.getSize(_this.panel)[1];

			if(_checkTop < _scrollTop){
				if(_maxTop < _scrollTop){
					_this.panel.style.position = 'absolute';
					if(ie6){
						_this.panel.style.marginTop = (_maxTop -  _appFrameTop) + 'px';
						_this.panel.style.top = _this.initTop-100+'px';
					} else {
						_this.panel.style.marginTop = '0px';
						_this.panel.style.top = (_maxTop - _appFrameTop) + 'px';
					}
				} else if(ie6){
					_this.panel.style.top = _this.initTop + 'px';
					_this.panel.style.marginTop = (_scrollTop - _checkTop) + 'px';
				} else {
					_this.panel.style.position = 'fixed';
					_this.panel.style.top = _qzone_toolbar_top+'px';
				}
			} else {
				_this.panel.style.position = 'absolute';
				_this.panel.style.marginTop = 0;
				_this.panel.style.top = _this.initTop+'px';
			}
		},

		/**
		 * 检测top点击事件，隐藏分类选择面板
		 */
		_hideAlbumSelectPanel: function(e){
			var _this = window._VE_QZONE_SIDE_ALBUM_OBJ;
			var clickTag = parentWin.QZFL.event.getTarget(e);
			if(!parentWin.QZFL.dom.isAncestor(_this._getPanelDomBySelector('.menu_bd').parentNode, clickTag) &&
				clickTag != parentDoc.getElementById('ve_editor_sideablum_panel_album_title')){
				_this.toggleAlbumSelectPanel(false);
			};
		},

		/**
		 * 启动拖动事件
		 */
		setupDragEvent: function(){
			var _this = this;
			var _handle = function(){
				if(!_this.dragTag){
					return;
				} else {
					_this.dragTag = null;
					setTimeout(function(){
						var imgs = _this.editor.getBody().getElementsByTagName('IMG');
						for(var i=0; i<imgs.length; i++){
							if(imgs[i].getAttribute('rel')){
								imgs[i].id = 'drag_img_'+Math.random();
								_this.bindImageResize(imgs[i].id);
								imgs[i].setAttribute('src', imgs[i].getAttribute('rel'));
								imgs[i].removeAttribute('rel');
							}
							if(QZFL.css.hasClassName(imgs[i].parentNode, 'list_item')){
								QZFL.dom.swapNode(imgs[i].parentNode, imgs[i]);
							}
						}
						QZBlog.Logic.TCISDClick('picsidebar.dragevent', '/BlogEditer');	//拖动事件统计
					}, 100);
				}
			};

			//编辑页通过mousemove监听是否需要处理
			QZFL.event.addEvent(_this.editor.getDoc(), 'mousemove', _handle);

			//FF处理
			if(QZFL.userAgent.firefox){
				QZFL.event.addEvent(_this.editor.getDoc(), 'drop', function(){
					if(_this.dragTag && _this.editor.getBody().innerHTML.replace('<div>','').replace('</div>','').replace(' ','') == ''){
						var id = 'drag_img_' + Math.random();
						_this.editor.getBody().innerHTML = '<img id="'+id+'" src="'+_this.dragTag.getAttribute('rel')+'"/>';
						_this.bindImageResize(id);
						_this.dragTag = null;
						QZFL.event.preventDefault();
						return false;
					}
				});
			}
		},

		/**
		 * 重新设定图片宽度
		 * @param {String} id
		 */
		bindImageResize: function(id){
			var maxWidth = this.editor.getBody().offsetWidth - 20;	//图片最大宽度
			var img = this.editor.getDoc().getElementById(id);
			if(!img){
				return;
			}
			var width = img.width || img.offsetWidth || img.clientWidth;
			var ed = this.editor;

			if(width && width > maxWidth){
				img.style.width = (maxWidth-20) + 'px';
			} else {
				ve.dom.event.add(img, 'load', function(){
					var w = this.width,
						h = this.height;
					if(w > maxWidth){
						h = parseInt((maxWidth / w) * h,10);
						w = maxWidth;
					}
					this.style.width = w+'px';
					this.style.height = h+'px';
					ed.resize();
				});
			}
			img.removeAttribute('id');
		},

		/**
		 * 统计
		 */
		setupClickState: function(){
			QZBlog.Logic.TCISDClick.batchBind({
				'a.blog_foldbt': 'picsidebar.shouqi',
				'div.picshow_menu a.menu_hd': 'picsidebar.xiangcemingxiala',
				'ul.menu_list a': 'picsidebar.xiangceming',
				'div.picshow_nav label.nav_r': 'picsidebar.fanye',
				'div.picshow_nav label.nav_l': 'picsidebar.fanye',
				'div.picshow_list img': 'picsidebar.imageclick'
			}, {url:'/BlogEditer', prepare:true, container:this.panel, eventType: 'click'});
		},

		/**
		 * 擦屁股
		 * @description 这里主要做一些页面跳开的后续擦屁股工作
		 */
		bindPageUnloadHandle: function(){
			if(PageScheduler){
				var _this = this;

				//绑定页面离开处理，包括去除样式表、去除面板dom， 解除事件绑定
				PageScheduler.addEvent('pageunload', function(){
					try {
						//_this.unloading = true;
						pQZFL.event.removeEvent(QZONE.FP._t, 'scroll', _this._bindPanelScroll);
						pQZFL.dom.removeElement(styleSheetId);
						pQZFL.dom.removeElement(_this.panel);
						pQZFL.event.removeEvent(parentDoc.body, 'click', _this._hideAlbumSelectPanel);
					} catch (ex){
						console.log('侧栏插入图片卸载出错',ex);
					}
				});

				//预览时隐藏面板
				PageScheduler.addEvent('afterDoPreviewBlog', function(){
					_this.panel.style.display = 'none';
				});

				//取消预览显示面板
				PageScheduler.addEvent('cancelpreview', function(){
					_this.panel.style.display = '';
				});
			}
		}
	});
	ve.plugin.register('qzonesidealbum', VEditor.plugin.QzoneSideAlbum);
}) (VEditor);