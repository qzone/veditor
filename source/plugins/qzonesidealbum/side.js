(function(){
	if(!window.console){
		window.console = {log:QZFL.emptyFn};
	}

	/**
	 * 侧栏插相册图片
	 * 依赖相册前台脚本环境
	 */
	var EV = QZFL.event,
		ie6 = QZFL.userAgent.ie && QZFL.userAgent.ie == 6,
		SHEED_ID = 'vepluginqzonesidebaralbum',
		photoLogicSrc = 'http://'+window.siDomain+'/qzone/client/photo/pages/qzone_v4/script/photo_logic.js';

	var INIT_TOP = 79,
		PANEL_DOM, APP_WIDTH, APP_FRAME,
		SW_SCROLL = true,
		CACHE_DATA = {},
		loginUin = QZONE.FP.getQzoneConfig('loginUin'),
		PIC_LIST_PAGE_SIZE = 5,			//相册图片分页大小

		PANEL_STATE,
		picListPageCurIndex,		//当前页码
		picListPageCount,			//页数
		picListCurAlbumId;			//当前相册id

	/**
	 * 环境变量重新初始化
	 */
	var resetEnv = function(){
		INIT_TOP = 79;
		PANEL_DOM = APP_WIDTH = APP_FRAME = null;
		SW_SCROLL = true;
		CACHE_DATA = {};
		loginUin = QZONE.FP.getQzoneConfig('loginUin');

		PANEL_STATE = true;
		picListPageCurIndex = 1;		//当前页码
		picListPageCount = 1;			//页数
		picListCurAlbumId = null;		//当前相册id
	};

	var start = function(){
		resetEnv();
		APP_FRAME = getAppFrame();
		if(!APP_WIDTH){
			APP_WIDTH = QZFL.dom.getSize(APP_FRAME)[0];
		}

		loadPhotoLogicFile(function(){
			initPanel();
			//加载最新照片
			updatePicList(-1, null, function(){
				//相册列表延后加载（防止阻塞最新照片列表加载）
				setTimeout(function(){updateAlbumList();}, 0);
			});
		});
	};

	/**
	 * 销毁
	 */
	var destory = function(){
		if(PANEL_DOM){
			if(PANEL_DOM.parentNode){
				PANEL_DOM.parentNode.removeChild(PANEL_DOM);
			}
			PANEL_DOM = null;
		}
		window.VEDITOR_SIDEALBUM = null;
		EV.removeEvent(window, 'scroll', _bindPanelScroll);
		EV.removeEvent(document.body, 'click', _hideAlbumSelectPanel);
	};

	var hide = function(){
		if(PANEL_DOM){
			PANEL_DOM.style.display = 'none';
		}
	};

	var show = function(){
		if(PANEL_DOM){
			PANEL_DOM.style.display = '';
		}
	};

	/**
	 * 初始化相册侧栏
	 */
	var initPanel = function(){
		if(PANEL_DOM){
			PANEL_DOM.style.display = '';
			return;
		}

		QZFL.css.insertCSSLink('http://qzonestyle.gtimg.cn/qzone_v6/blog_extendbar.css?'+Math.random(), SHEED_ID);

		PANEL_DOM = document.createElement('div');
		PANEL_DOM.className = 'blog_extendbar';
		PANEL_DOM.style.cssText = 'position:absolute; z-index:5; overflow-x:hidden; width:113px; height:550px; margin-top:'+INIT_TOP+'px; margin-left:'+APP_WIDTH+'px;';
		PANEL_DOM.innerHTML = ([
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
		APP_FRAME.parentNode.insertBefore(PANEL_DOM, APP_FRAME);
		updatePanelPos();
		setupPanelEvent();
		setupClickState();
	};

	/**
	 * 拉取相册图片列表
	 * @param {string} aid aid=-1表示最新相册
	 * @param {integer} pageIndex
	 * @param {function} succCallBack
	 * @param {function} errCallBack
	 */
	var updatePicList = function(aid, pageIndex, succCallBack, errCallBack){
		pageIndex = pageIndex > 0 ? pageIndex : 1;
		aid = aid || picListCurAlbumId;
		succCallBack = succCallBack || QZFL.emptyFn;
		errCallBack = errCallBack || QZFL.emptyFn;

		if(!aid){
			throw "NO ALBUM ID";
		}

		var cache_key = loginUin + '_'+aid;
		picListCurAlbumId = aid;
		picListPageCurIndex = pageIndex;
		getPEl('.picshow_list').innerHTML = '<div class="loading" title="正在加载"></div>';
		QZFL.css.removeClassName(getPEl('.picshow_list'), 'picshow_nopic');
		getPEl('.picshow_nav').style.display = 'none';

		var callback = function(d){
			if(d && d.photos && d.photos.length){
				var html = '';
				CACHE_DATA[cache_key] = d;
				picListPageCount = Math.ceil(d.photos.length / PIC_LIST_PAGE_SIZE);
				for(var i=(pageIndex-1)*PIC_LIST_PAGE_SIZE; (i<d.photos.length) && (i<pageIndex*PIC_LIST_PAGE_SIZE); i++){
					html += '<div class="list_item" title="拖动插入到日志"><img src="'+QZFL.string.trim(d.photos[i].pre)+'" rel="'+ QZFL.string.trim(d.photos[i].origin_url || d.photos[i].url)+'"/></div>';
				}
				getPEl('.picshow_list').innerHTML = html;
				_bindImgEffect();
			} else {
				picListPageCount = 1;
				getPEl('.picshow_list').innerHTML = '<span class="no_pic"></span><p>'+(aid==-1 ? '无最新照片' : '本相册无照片')+'</p>';
				QZFL.css.addClassName(getPEl('.picshow_list'), 'picshow_nopic');
			}

			//分页view更新
			getPEl('.picshow_nav').style.display = picListPageCount < 2 ? 'none' : '';
			QZFL.css[pageIndex == 1 ? 'addClassName' : 'removeClassName'](getPEl('.nav_l'), 'disable');
			QZFL.css[pageIndex == picListPageCount ? 'addClassName' : 'removeClassName'](getPEl('.nav_r'), 'disable');
			succCallBack();
		};

		if(CACHE_DATA[cache_key]){
			callback(CACHE_DATA[cache_key]);
			return;
		}

		getPEl('.picshow_list').innerHTML = '<div class="loading" title="加载中"></div>';
		PhotoLogic[(aid == -1 ? 'getNewPhoto': 'getPhotoList')]({
			refresh: false,
			uin: loginUin,
			contain:1,
			id: aid,
			callBack: callback,
			errBack: function(){
				getPEl('.picshow_list').innerHTML = '<span class="pic_break"></span><p><i class="ui_ico icon_refresh" rel="refresh-pic-list" title="重新拉取"></i></p>';
				QZFL.css.addClassName(getPEl('.picshow_list'), 'picshow_nopic');
				errCallBack();
			}
		});
	};

	var updatePanelPos = function(toFull){
		if(!PANEL_DOM){
			return;
		}
		SW_SCROLL = !toFull;
		if(toFull){
			var iframeElement = QZONE.FP.getCurrentAppWindow().PageScheduler.editorObj.iframeElement;
			PANEL_DOM.style.marginTop = '50px';	//todo
			var posInfo = QZFL.dom.getXY(iframeElement);
			var sizeInfo = QZFL.dom.getSize(iframeElement);
			PANEL_DOM.style.marginLeft = (posInfo[0] + sizeInfo[0] + 7) + 'px';
		} else {
			PANEL_DOM.style.marginTop = INIT_TOP + 'px';
			PANEL_DOM.style.marginLeft =(APP_WIDTH+1) + 'px';
		}
	};

	/**
	 * 切换相册侧栏
	 */
	var togglePanel = function(state){
		state = state === undefined ? !PANEL_STATE : state;
		getPEl('.blog_foldbt').innerHTML = (state ? '收起' : '展开快速插图') + '<b class="ui_trig '+(state ? 'ui_trig_t' : 'ui_trig_b')+'"></b>';
		getPEl('.blog_picshow').style.display = state ? '' : 'none';
		PANEL_STATE = state;
	};

	/**
	 * 切换相册选择列表
	 */
	var toggleAlbumSelectPanel = function(state){
		state = state === undefined ? (getPEl('.menu_bd').style.display == 'none') : state;
		getPEl('.menu_bd').style.display = (state ? 'block' : 'none');
		getPEl('.menu_bd').parentNode.className = state ? 'picshow_menu cur' : 'picshow_menu';
	};

	/**
	 * 获取页面元素
	 * @param  {String} selector
	 * @return {DOM}
	 */
	var getPEl = function(selector){
		return $e(selector, PANEL_DOM).elements[0];
	};

	/**
	 * 加载相册逻辑文件
	 * @param {function} callback
	 */
	var loadPhotoLogicFile = function(callback){
		QZFL.imports(photoLogicSrc, function(data){
			callback && callback();
		});
	};

	/**
	 * 更新相册列表
	 * @param {function} succCallBack
	 * @param {function} errCallBack
	 */
	var updateAlbumList = function(succCallBack, errCallBack){
		getPEl('.menu_bd').innerHTML = '<ul class="menu_list"><li class="loading">正在加载...</li></ul>';
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
						html += '<li><a href="javascript:;" albumid="'+d.albums[i].id+'" title="'+ QZFL.string.trim(d.albums[i].name)+'">'+QZFL.string.trim(d.albums[i].name)+'</a></li>';
					}
					html += '</ul>';
				}
				getPEl('.menu_bd').innerHTML = html;
				if(d.albums.length>14 && QZFL.userAgent.ie==6){
					getPEl('.menu_bd').style.height = '410px';
				}
				succCallBack && succCallBack(d);
			},
			errBack: function(){
				getPEl('.menu_bd').innerHTML = '<ul class="menu_list"><li class="loading_fail"><p>拉取失败</p><i class="ui_ico icon_refresh" rel="refresh-album-list" title="重新拉取"></i></li></ul>';
				errCallBack && errCallBack(d);
			}
		});
	};

	/**
	 * 图片压缩
	 */
	var _bindImgEffect = function(){
		var imgs = $e('.picshow_list img', PANEL_DOM).elements;
		for(var i=0; i<imgs.length; i++){
			EV.addEvent(imgs[i], 'load', function(){
				var h = this.style.height || this.height || this.naturalHeight,
					w = this.style.width || this.width || this.naturalWidth;
				if(h/w > (60/80)){	//短边压缩
					QZFL.css.addClassName(this.parentNode,'show_width');
				} else {
					QZFL.css.addClassName(this.parentNode,'show_height');
				}
			});
			EV.addEvent(imgs[i], 'mouseover', function(){
				QZFL.css.addClassName(this.parentNode, 'cur');
			});
			EV.addEvent(imgs[i], 'mouseout', function(){
				QZFL.css.removeClassName(this.parentNode, 'cur');
			});
		}
	};

	/**
	 * 切换相册选择列表
	 */
	var toggleAlbumSelectPanel = function(state){
		state = state === undefined ? (getPEl('.menu_bd').style.display == 'none') : state;
		getPEl('.menu_bd').style.display = (state ? 'block' : 'none');
		getPEl('.menu_bd').parentNode.className = state ? 'picshow_menu cur' : 'picshow_menu';
	};

	/**
	 * 检测top点击事件，隐藏分类选择面板
	 */
	var _hideAlbumSelectPanel = function(e){
		var clickTag = EV.getTarget(e);
		if(!QZFL.dom.isAncestor(getPEl('.menu_bd').parentNode, clickTag) &&
			clickTag != document.getElementById('ve_editor_sideablum_panel_album_title')){
			toggleAlbumSelectPanel(false);
		};
	};

	var getAppFrame = function(){
		return QZONE.FP.getCurrentAppWindow().frameElement;
	};

	/**
	 * 绑定面板滚动
	 */
	var _bindPanelScroll = function(e){
		if(!SW_SCROLL){
			return;
		}

		if(!PANEL_DOM){
			destory();
		}

		//最大高度
		var _maxTop = Math.max(QZFL.dom.getSize(APP_FRAME)[1] - QZFL.dom.getSize(PANEL_DOM)[1], INIT_TOP);

		//QZONE导航条高度
		var _qzone_nav_top = !ie6 && $('QZ_Toolbar_Container') ? QZFL.dom.getSize($('QZ_Toolbar_Container'))[1] : 0;

		//由于app给设置了relative，所以这里的top坐标是相对于appframe的
		var _scrollTop = Math.max(QZFL.dom.getScrollTop()-QZFL.dom.getXY(APP_FRAME)[1]+_qzone_nav_top, 0);

		if(_scrollTop > INIT_TOP){
			if(_scrollTop > _maxTop){
				PANEL_DOM.style.position = 'absolute';
				PANEL_DOM.style.marginTop = _maxTop+'px';
				PANEL_DOM.style.top = 'auto';
			} else if(ie6){
				PANEL_DOM.style.position = 'absolute';
				PANEL_DOM.style.marginTop = _scrollTop + 'px';
				PANEL_DOM.style.top = 'auto';
			} else {
				PANEL_DOM.style.position = 'fixed';
				PANEL_DOM.style.marginTop = 0;
				PANEL_DOM.style.top = _qzone_nav_top+'px';
			}
		} else {
			PANEL_DOM.style.position = 'absolute';
			PANEL_DOM.style.marginTop = INIT_TOP + 'px';
			PANEL_DOM.style.top = 'auto';
		}
	};

	var setupPanelEvent = function(){
		//面板滚动
		EV.addEvent(window, 'scroll', _bindPanelScroll);

		//隐藏相册选择
		EV.addEvent(document.body, 'click', _hideAlbumSelectPanel);

		//面板折叠
		EV.addEvent(getPEl('.blog_foldbt'), 'click', function(){
			togglePanel();
			EV.preventDefault();
		});

		//相册选择菜单
		EV.addEvent(getPEl('.menu_hd'), 'click', function(){
			toggleAlbumSelectPanel();
			EV.preventDefault();
		});

		//相册选择菜单
		EV.addEvent(getPEl('#ve_editor_sideablum_panel_album_title'), 'click', function(){
			toggleAlbumSelectPanel();
			EV.preventDefault();
		});

		//选择相册
		EV.addEvent(getPEl('.menu_bd'), 'click', function(e){
			var clickTag = EV.getTarget(e);
			var albumid = clickTag.getAttribute('albumid');
			if(albumid){
				updatePicList(albumid);
				getPEl('.picshow_hd h4 span').innerHTML = clickTag.innerHTML;
				getPEl('.picshow_hd h4 span').title = toRealStr(clickTag.innerHTML);
				toggleAlbumSelectPanel(false);
			}
			EV.preventDefault();
		});

		//选择图片
		EV.addEvent(getPEl('.picshow_list'), 'mousedown', function(e){
			var tag = EV.getTarget(e);
			if(tag.tagName == 'IMG'){
				VEDITOR_SIDEALBUM.hasDrag = true;
			}
		});

		//插入图片
		EV.addEvent(getPEl('.picshow_list'), 'click', function(e){
			var tag = EV.getTarget(e);
			if(tag.tagName == 'IMG'){
				VEDITOR_SIDEALBUM.hasDrag = false;
				var src = tag.getAttribute('rel');
				VEDITOR_SIDEALBUM.onSetImage(src);
			}
		});

		//刷新图片列表
		EV.addEvent(getPEl('.picshow_list'), 'click', function(e){
			var tag = EV.getTarget(e);
			if(tag.getAttribute('rel') == 'refresh-pic-list'){
				updatePicList();
				EV.preventDefault();
				return false;
			}
		});

		//刷新相册列表
		EV.addEvent(PANEL_DOM, 'click', function(e){
			var tag = EV.getTarget(e);
			if(tag.getAttribute('rel') == 'refresh-album-list'){
				updateAlbumList();
				EV.preventDefault();
				return false;
			}
		});

		//上一页
		EV.addEvent(getPEl('.nav_l'), 'click', function(){
			if(picListPageCurIndex > 1){
				updatePicList(null, picListPageCurIndex-1);
			}
		});

		//下一页
		EV.addEvent(getPEl('.nav_r'), 'click', function(){
			if(picListPageCurIndex < picListPageCount){
				updatePicList(null, picListPageCurIndex+1);
			}
		});
	};

	/**
	 * 字符串转换
	 * @param  {[type]} str [description]
	 * @return {[type]}     [description]
	 */
	var toRealStr = function(str) {
		return str.replace(/&quot;/g,"\"").replace(/(?:&#39;)|(?:&apos;)/g,"\'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&#92;/g,"\\");
	};

	/**
	 * 设置APP宽度
	 * @param {Number} w
	 */
	var setAppWidth = function(w){
		APP_WIDTH = w;
	};

	/**
	 * 设置初始化高度
	 * @param {Number} t
	 */
	var setInitTop = function(t){
		INIT_TOP = t;
	};

	/**
	 * 点击统计
	 */
	var setupClickState = function(){

	};

	/**
	 * 自爆装置
	 */
	var onLeave = function(fn){
		setTimeout(function(){
			try {
				var app = QZONE.FP.getCurrentAppWindow();
				if(app && app.PageScheduler && app.PageScheduler.editorObj && !app.isTemplateBlogEditor){
					onLeave(fn);
				} else {
					fn();
				}
			} catch(ex){
				fn();
			}
		}, 1000);
	};

	onLeave(function(){
		window.VEDITOR_SIDEALBUM.destory();
	});

	window.VEDITOR_SIDEALBUM = {
		start: start,
		destory: destory,
		hide: hide,
		show: show,
		updatePanelPos: updatePanelPos,
		onSetImage: QZFL.emptyFn
	};
})();