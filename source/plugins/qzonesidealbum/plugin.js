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