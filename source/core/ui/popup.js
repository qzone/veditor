(function(ve){
	/**
	 * 由于getCurrentPopup对于内嵌的popup没有比较好的适配方案（去除对象引用），
	 * 因此Popup暂时不提供内嵌dialog无缝接口
	 */
	ve.dom.insertStyleSheet('VE_WIDGET_POPUP', [
		'.PopupDialog * {margin:0; padding:0}',
		'.PopupDialog {position:absolute; top:20px; left:20px; width:350px; border:1px solid #999; border-top-color:#bbb; border-left-color:#bbb; background-color:white; box-shadow:0 0 8px #aaa; border-radius:3px}',
		'.PopupDialog-hd {height:28px; background-color:white; cursor:move; position:relative; border-radius:3px 3px 0 0}',
		'.PopupDialog-hd h3 {font-size:12px; font-weight:bolder; color:gray; padding-left:10px; line-height:28px;}',
		'.PopupDialog-close {display:block; overflow:hidden; width:28px; height:28px; position:absolute; right:0; top:0; text-align:center; cursor:pointer; font-size:17px; font-family:Verdana; text-decoration:none; color:gray;}',
		'.PopupDialog-close:hover {color:black;}',
		'.PopupDialog-ft {background-color:#f3f3f3; white-space:nowrap; border-top:1px solid #e0e0e0; padding:5px 5px 5px 0; text-align:right; border-radius:0 0 3px 3px}',
		'.PopupDialog-text {padding:20px;}',
		'.PopupDialog-bd-frm {border:none; width:100%}',
		'.PopupDialog-btn {display:inline-block; font-size:12px; cursor:pointer; box-shadow:1px 1px #fff; text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.7); background:-moz-linear-gradient(19% 75% 90deg, #E0E0E0, #FAFAFA); background:-webkit-gradient(linear, left top, left bottom, from(#FAFAFA), to(#E0E0E0)); color:#4A4A4A; background-color:white; text-decoration:none; padding:0 15px; height:20px; line-height:20px; text-align:center; border:1px solid #ccd4dc; white-space:nowrap; border-radius:2px}',
		'.PopupDialog-btn:hover {background-color:#eee}',
		'.PopupDialog-btnDefault {}'].join(''));

	var _guid = 1;
	var emptyFn = function(){};
	var POPUP_COLLECTION = [];

	/**
	 * Popup class
	 * @constructor Popup
	 * @description popup dialog class
	 * @example new YSL.widget.Popup(config);
	 * @param {Object} config
	 */
	var Popup = function(cfg){
		this.container = null;
		this.status = 0;
		this._ios = {};
		this._readyCbList = [];
		this.guid = _guid++;
		this.onShow = emptyFn;
		this.onClose = emptyFn;

		this.config = ve.lang.extend(true, {
			ID_PRE: 'popup-dialog-id-pre',
			title: '对话框',				//标题
			content: '测试',				//content.src content.id
			width: 400,						//宽度
			moveEnable: true,				//框体可移动
			moveTriggerByContainer: false,	//内容可触发移动
			zIndex: 9000,					//高度
			isModal: false,					//模态对话框
			topCloseBtn: true,				//是否显示顶部关闭按钮,如果显示顶部关闭按钮，则支持ESC关闭窗口行为
			showMask: true,
			keepWhileHide: false,			//是否在隐藏的时候保留对象
			cssClass: {
				dialog: 'PopupDialog',
				head: 'PopupDialog-hd',
				body: 'PopupDialog-bd',
				textCon: 'PopupDialog-text',
				iframe: 'PopupDialog-bd-frm',
				container: 'PopupDialog-dom-ctn',
				foot: 'PopupDialog-ft'
			},
			buttons: [/*
				{name:'确定', handler:null},
				{name:'关闭', handler:null, setDefault:true}*/
			],
			sender: emptyFn,	//data sender interface
			reciver: emptyFn	//data reciver interface
		}, cfg);

		init.call(this);

		//ADD TO MONITER COLLECTION
		POPUP_COLLECTION.push(this);
	};

	/**
	 * on content onReady
	 * @param  {Function} callback
	 */
	Popup.prototype.onReady = function(callback) {
		if(this._ready){
			callback();
		} else {
			this._readyCbList.push(callback);
		}
	};

	/**
	 * call ready list
	 */
	Popup.prototype._callReadyList = function() {
		this._ready = true;
		ve.lang.each(this._readyCbList, function(fn){
			fn();
		});
		this._readyCbList = [];
	};

	/**
	 * show popup
	 */
	Popup.prototype.show = function(){
		var _this = this;

		this.onReady(function(){
			//CREATE MASK
			if(_this.config.showMask){
				ve.ui.masklayer.show();
			}

			_this.container.style.display = '';

			//CACULATE REGION INFO
			var region = ve.lang.extend(true, ve.dom.getRegion(_this.container), _this.config);
				region.minHeight = region.minHeight || 78;


			var scroll = {
				top: ve.dom.getScrollTop(),
				left: ve.dom.getScrollLeft()
			};
			var winRegion = ve.dom.getWindowRegion(),
				top = left = 0;

			if(winRegion.visibleHeight > region.height){
				top = scroll.top + (winRegion.visibleHeight - region.height)/4;
			} else if(winRegion.documentHeight > region.height){
				top = scroll.top;
			}

			if(winRegion.visibleWidth > region.width){
				left = winRegion.visibleWidth/2 - region.width/2 - scroll.left;
			} else if(winRegion.documentWidth > region.width){
				left = scroll.left;
			}
			var calStyle = {left:left,top:top,zIndex:_this.config.zIndex};
			ve.dom.setStyles(_this.container, calStyle);

			if(_this.config.height){
				ve.dom.setStyle(ve.dom.selector('.'+_this.config.cssClass.body, _this.container), 'height', _this.config.height);
			}
			if(_this.config.width){
				ve.dom.setStyle(_this.container, 'width', _this.config.width);
			}

			_this.onShow();
			_this.status = 1;

			bindDlgEvent.call(_this);
			bindMoveEvent.call(_this);
			bindEscCloseEvent.call(_this);

			var hasOtherModalPanel = false;

			ve.lang.each(POPUP_COLLECTION, function(dialog){
				//有其他的模态对话框
				//调低当前对话框的z-index
				if(dialog != _this && dialog.status && dialog.config.isModal){
					_this.config.zIndex = dialog.config.zIndex - 1;
					hasOtherModalPanel = true;
					return false;
				} else if(_this != dialog && dialog.status && !dialog.config.isModal){
					if(dialog.config.zIndex > _this.config.zIndex){
						_this.config.zIndex = dialog.config.zIndex + 1;
					} else if(dialog.config.zIndex == _this.config.zIndex){
						_this.config.zIndex += 1;
					}
				}
			});

			ve.dom.setStyle(_this.container, 'zIndex', _this.config.zIndex);
			if(hasOtherModalPanel){
				_this.setDisable();
			} else if(_this.config.isModal){
				//设置除了当前模态对话框的其他对话框所有都为disable
				ve.lang.each(POPUP_COLLECTION, function(dialog){
					if(dialog != _this && dialog.status){
						dialog.setDisable();
					}
				});
				_this.focus();
			} else {
				_this.focus();
			}
		});
	};

	/**
	 * 聚焦到当前对话框第一个按钮
	 */
	Popup.prototype.focus = function() {
		var a = ve.dom.selector('A', this.container)[0];
		if(a){
			a.focus();
		}
	};

	/**
	 * set dialog operate enable
	 **/
	Popup.prototype.setEnable = function() {
		var mask = ve.dom.selector('.PopupDialog-Modal-Mask', this.container)[0];
		if(mask){
			mask.style.display = 'none';
		}
	};

	/**
	 * set dialog operate disable
	 **/
	Popup.prototype.setDisable = function() {
		var size = ve.dom.getSize(this.container);
		var mask = ve.dom.selector('.PopupDialog-Modal-Mask', this.container)[0];
		ve.dom.setStyles(mask, {height:size.height, opacity:0.4});
	};

	/**
	 * close current popup
	 */
	Popup.prototype.close = function(){
		if(this.onClose() === false){
			return;
		}
		this.container.style.display = 'none';
		this.status = 0;

		var _this = this,
			hasDialogLeft = false,
			hasModalPanelLeft = false;

		if(!this.config.keepWhileHide){
			var tmp = [];
			ve.lang.each(POPUP_COLLECTION, function(dialog){
				if(dialog != _this){
					tmp.push(dialog);
				}
			});

			POPUP_COLLECTION = tmp;
			ve.dom.remove(_this.container);
			_this.container = null;
		}

		ve.lang.each(POPUP_COLLECTION, function(dialog){
			if(dialog.status){
				hasDialogLeft = true;
			}
			if(dialog.status && dialog.config.isModal){
				hasModalPanelLeft = true;
				dialog.setEnable();
				dialog.focus();
				return false;
			}
		});

		//没有显示的对话框
		if(!hasDialogLeft){
			ve.ui.masklayer.hide();
		}

		//剩下的都是普通对话框
		if(!hasModalPanelLeft){
			var _lastTopPanel;
			ve.lang.each(POPUP_COLLECTION, function(dialog){
				if(!dialog.status){
					return;
				}
				dialog.setEnable();
				if(!_lastTopPanel){
					_lastTopPanel = dialog;
				} else if(_lastTopPanel.config.zIndex <= dialog.config.zIndex){
					_lastTopPanel = dialog;
				}
			});
			if(_lastTopPanel){
				_lastTopPanel.focus();
			}
		}
	}

	/**
	 * 关闭其他窗口
	 **/
	Popup.prototype.closeOther = function(){
		try {
			var _this = this;
			ve.lang.each(POPUP_COLLECTION, function(pop){
				if(pop != _this){
					pop.close();
				}
			});
		}catch(e){}
	};

	/**
	 * 为当前popup添加一个IO
	 * @param {String} key
	 * @param {Mix} param
	 * @return {Boolean}
	 */
	Popup.prototype.addIO = function(key, param){
		return this._ios[key] = param;
	};

	/**
	 * 获取IO
	 * @param {String} key
	 * @param {Function} callback
	 */
	Popup.prototype.getIO = function(key, callback){
		if(this._ios[key]){
			callback(this._ios[key]);
		}
	};

	/**
	 * search popup by guid
	 * @param  {String} guid
	 * @return {Popup}
	 */
	Popup.getPopupByGuid = function(guid){
		var result;
		ve.lang.each(POPUP_COLLECTION, function(pop){
			if(pop.guid == guid){
				result = pop;
				return false;
			}
		});
		return result;
	};


	/**
	 * close all popup
	 * @see Popup#close
	 */
	Popup.closeAll = function(){
		ve.lang.each(POPUP_COLLECTION, function(pop){
			pop.close();
		});
	};

	//!!以下方法仅在iframe里面提供
	if(window.frameElement){
		/**
		 * 获取当前popup IO
		 * @param {String} key
		 * @param {Function} callback
		 */
		Popup.getIO = function(key, callback){
			var pop = Popup.getCurrentPopup();
			if(pop){
				pop.getIO(key, callback);
			}
		};

		/**
		 * 为当前popup添加一个IO
		 * @param {String} key
		 * @param {Mix} param
		 * @return {Boolean}
		 */
		Popup.addIO = function(key, callback){
			var pop = Popup.getCurrentPopup();
			if(pop){
				return pop.addIO(key, callback);
			}
			return false;
		};

		/**
		 * resize current popup
		 * @deprecated only take effect in iframe mode
		 */
		Popup.resizeCurrentPopup = function(){
			if(!window.frameElement){
				return;
			}
			ve.dom.event.add(window, 'load', function(){
				var wr = ve.dom.getWindowRegion();
				document.body.style.overflow = 'hidden';
				window.frameElement.style.height = wr.documentHeight +'px';
			});
		};

		/**
		 * get current page located popup object
		 * @param  {Dom} win
		 * @return {Mix}
		 */
		Popup.getCurrentPopup = function(win){
			var guid = window.frameElement.getAttribute('guid');
			if(guid){
				return parent.VEditor.ui.Popup.getPopupByGuid(guid);
			}
			return null;
		};

		/**
		 * close current popup
		 * @deprecated only take effect in iframe mode
		 */
		Popup.closeCurrentPopup = function(){
			var curPop = this.getCurrentPopup();
			if(curPop){
				curPop.close();
			}
		};
	}

	/**
	 * contruct popup structure
	 */
	var init = function(){
		var _this = this;

		//DOM Clone Mode
		if(!this.container){
			this.container = document.createElement('div');
			document.body.appendChild(this.container);
			ve.dom.addClass(this.container, this.config.cssClass.dialog);
			ve.dom.setStyle(this.container, 'left', '-9999px');
		}
		this.container.id = this.config.ID_PRE + (_guid++);

		//构建内容容器
		var content = '<div class="'+this.config.cssClass.body+'">';
		if(typeof(this.config.content) == 'string'){
			content += '<p class="'+this.config.cssClass.textCon+'">'+this.config.content+'</p>';
		} else if(this.config.content.src){
			content += '<iframe allowtransparency="true" guid="'+this.guid+'" class="'+this.config.cssClass.iframe+'" frameborder=0></iframe>';
		} else {
			content += '<div class="' + this.config.cssClass.container + '"></div>';
		}
		content += '</div>';

		//构建按钮
		var btn_html = '';
		if(this.config.buttons.length > 0){
			var btn_html = '<div class="'+this.config.cssClass.foot+'">';
			for(var i=0; i<this.config.buttons.length; i++){
				btn_html += '&nbsp;<a href="javascript:;" class="PopupDialog-btn'+(this.config.buttons[i].setDefault?' PopupDialog-btnDefault':'')+'">'+this.config.buttons[i].name+'</a>';
			}
			btn_html += '</div>';
		}

		//构建对话框框架
		var html = ([
				'<div class="PopupDialog-wrap">',
					'<div class="PopupDialog-Modal-Mask" style="position:absolute; height:0px; overflow:hidden; z-index:2; background-color:#ccc; width:100%"></div>',
					'<div class="',this.config.cssClass.head+'">',
						'<h3>',this.config.title,'</h3>',
						(this.config.topCloseBtn ? '<span class="PopupDialog-close" tabindex="0" title="关闭窗口">x</span>' : ''),
					'</div>',content,btn_html,
				'</div>'
			]).join('');
		this.container.innerHTML = html;

		if(this.config.content.src){
			var ifr = this.container.getElementsByTagName('iframe')[0];
			ve.dom.event.add(ifr, 'load', function(){
				try {
					var w = ifr.contentWindow;
					var d = w.document;
					var b = w.document.body;
					w.focus();
				} catch(ex){
					console.log(ex);
				}

				//Iframe+无指定固定宽高时 需要重新刷新size
				if(!_this.config.height && b){
					b.style.overflow = 'hidden';

					var info = {};
					if(w.innerWidth){
						info.visibleHeight = w.innerHeight;
					} else {
						var tag = (d.documentElement && d.documentElement.clientWidth) ?
							d.documentElement : d.body;
						info.visibleHeight = tag.clientHeight;
					}
					var tag = (d.documentElement && d.documentElement.scrollWidth) ?
							d.documentElement : d.body;
					info.documentHeight = Math.max(tag.scrollHeight, info.visibleHeight);

					ifr.style.height = info.documentHeight + 'px';
					ve.dom.setStyle(_this.container, 'height', 'auto');
				} else {
					ve.dom.setStyle(this, 'height', _this.config.height);
				}

				_this._callReadyList();
			});
			ifr.src = this.config.content.src;
		} else {
			//移动ID绑定模式的DOM对象【注意：这里移动之后，原来的元素就被删除了，为了做唯一性，这里只能这么干】
			if(this.config.content.id){
				ve.dom.get('#'+this.config.content.id).style.display = '';
				ve.dom.selector('div.'+this.config.cssClass.container)[0].appendChild(ve.dom.get(this.config.content.id));
			}
			_this._callReadyList();
		}
	};

	/**
	 * bind popup event
	 */
	var bindDlgEvent = function(){
		var _this = this;
		var topCloseBtn = ve.dom.selector('.PopupDialog-close', this.container)[0];

		if(topCloseBtn){
			ve.dom.event.add(topCloseBtn, 'click', function(){
				_this.close();
			});
		}

		ve.lang.each(ve.dom.selector('a.PopupDialog-btn'), function(btn, i){
			ve.dom.event.add(btn, 'click,', function(){
				var hd = _this.config.buttons[i].handler || function(){_this.close();};
				if(typeof(hd) == 'string'){
					_this.getIO(hd, function(fn){fn();});
				} else {
					hd.apply(this, arguments);
				}
			})
		});

		var defBtn = ve.dom.selector('a.PopupDialog-btnDefault')[0];
		if(defBtn){
			defBtn.focus();
		}

		ve.dom.event.add(this.container, 'mousedown', function(){updateZindex.call(_this);});
	}

	/**
	 * update dialog panel z-index property
	 **/
	var updateZindex = function() {
		var _this = this;
		var hasModalPanel = false;
		ve.lang.each(POPUP_COLLECTION, function(dialog){
			if(dialog != _this && dialog.status && dialog.config.isModal){
				hasModalPanel = true;
				return false;
			} else if(dialog != _this && dialog.status){
				if(dialog.config.zIndex >= _this.config.zIndex){
					_this.config.zIndex = dialog.config.zIndex + 1;
				}
			}
		});
		if(hasModalPanel){
			return;
		}
		ve.dom.setStyle(this.container, 'zIndex', this.config.zIndex);
	}

	/**
	 * bind popup moving event
	 */
	var bindMoveEvent = function(){
		if(!this.config.moveEnable){
			return;
		}
		var _this = this;
		var _lastPoint = {X:0, Y:0};
		var _lastRegion = {top:0, left:0};
		var _moving;

		ve.dom.event.add(document, 'mousemove', function(e){
			e = e || window.event;
			if(!_this.container || !_moving || ve.dom.event.getButton(e) !== 0){
				return false;
			}
			offsetX = parseInt(e.clientX - _lastPoint.X, 10);
			offsetY = parseInt(e.clientY - _lastPoint.Y, 10);
			var newLeft = Math.max(_lastRegion.left + offsetX,0);
			var newTop = Math.max(_lastRegion.top + offsetY,0);
			ve.dom.setStyles(_this.container, {top:newTop,left:newLeft});
		});

		ve.dom.event.add(document, 'mousedown', function(e){
			if(!_this.container){
				return;
			}
			var head = _this.config.moveTriggerByContainer ? _this.container : ve.dom.selector('.'+_this.config.cssClass.head, _this.container)[0];
			var tag = ve.dom.event.getTarget();
			if(ve.dom.contains(head, tag)){
				_moving = true;
				_lastRegion = ve.dom.getRegion(_this.container);
				_lastPoint = {X: e.clientX, Y: e.clientY};
				ve.dom.event.preventDefault(e);
			}
		});

		ve.dom.event.add(document, 'mouseup', function(){
			_moving = false;
		});
	};

	/**
	 * bind ESC close event
	 */
	var bindEscCloseEvent = (function(){
		var ESC_BINDED;
		return function(){
			if(ESC_BINDED){
				return;
			}
			ESC_BINDED = true;

			var _this = this;
			ve.dom.event.add(document, 'keyup', function(e){
				if(e.keyCode == ve.dom.event.KEYS.ESC){
					var lastDialog = null;
					ve.lang.each(POPUP_COLLECTION, function(dialog){
						if(dialog.config.isModal && dialog.status && dialog.config.topCloseBtn){
							lastDialog = dialog;
							return false;
						} else if(dialog.status && dialog.config.topCloseBtn){
							if(!lastDialog || lastDialog.config.zIndex <= dialog.config.zIndex){
								lastDialog = dialog;
							}
						}
					});
					if(lastDialog){
						lastDialog.close();
					}
				}
			});
		}
	})();
	ve.ui.Popup = Popup;


	/**
	 * 显示popup
	 * @param  {String} title  标题
	 * @param  {Mix} source 来源
	 * @param  {Number} width  宽度
	 * @param  {Number} height 高度
	 * @return {Object}
	 */
	ve.ui.showPopup = function(title, source, width, height){
		var pop = new ve.ui.Popup({
			title:title,
			content: source,
			width: width,
			height: height
		});
		pop.show();
		return pop;
	};

	/**
	 * 关闭Popup
	 * @param  {Number} guid
	 */
	ve.ui.closePopup = function(guid){
		if(guid){
			var pop = Popup.getPopupByGuid(guid);
			pop.close();
		} else {
			Popup.closeAll();
		}
		if(top.popupCallback){
			top.popupCallback();
		}
	};

	/**
	 * 兼容QZFL··将就
	 * @param  {Function} fn
	 */
	ve.ui.appendPopupFn = function(fn){
		top.popupCallback = fn;
	}
})(VEditor);