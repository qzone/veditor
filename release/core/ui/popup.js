(function(ve){
	var POP_STYLECSS = [
		'.PopupDialog {position:absolute; top:20px; left:20px; width:350px; border:1px solid #999; background-color:white; box-shadow:0 0 10px #535658}',
		'.PopupDialog-hd {height:28px; background-color:#f3f3f3; border-bottom:1px solid #E5E5E5; cursor:move; position:relative;}',
		'.PopupDialog-hd h3 {font-size:12px; font-weight:bolder; color:gray; padding-left:10px; line-height:28px;}',
		'.PopupDialog-close {display:block; overflow:hidden; width:28px; height:28px; position:absolute; right:0; top:0; text-align:center; cursor:pointer; font-size:17px; font-family:Verdana; text-decoration:none; color:gray;}',
		'.PopupDialog-close:hover {color:blue}',
		'.PopupDialog-ft {background-color:#f3f3f3; white-space:nowrap; border-top:1px solid #e0e0e0; padding:5px 5px 5px 0; text-align:right;}',
		'.PopupDialog-bd {padding:20px;}',
		'.PopupDialog-bd-frm {border:none; width:100%}',
		'.PopupDialog-btn {display:inline-block; cursor:pointer; box-shadow:1px 1px #fff; text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.7); background:-moz-linear-gradient(19% 75% 90deg, #E0E0E0, #FAFAFA); background:-webkit-gradient(linear, left top, left bottom, from(#FAFAFA), to(#E0E0E0)); color:#4A4A4A; background-color:white; text-decoration:none; padding:0 15px; height:20px; line-height:20px; text-align:center; border:1px solid #ccd4dc; white-space:nowrap; border-radius:2px}',
		'.PopupDialog-btn:hover {background-color:#eee}',
		'.PopupDialog-btnDefault {}'].join('');

	var POP_STYLECSS_INSERTED;
	var GUID = 0;
	var POPUP_COLLECTION = [];
	var ESC_BINDED = false;
	var emptyFn = function(){};

	/**
	 * Popup class
	 * @constructor Popup
	 * @description popup dialog class
	 * @example new ve.ui.Popup(config);
	 * @param {Object} config
	 */
	var Popup = function(cfg){
		this.container = null;
		this.status = 0;
		this.moving = false;
		this._constructReady = emptyFn;
		this._constructed = false;
		this.onShow = emptyFn;
		this.onClose = emptyFn;
		this.guid = 'VEDITOR_POPUP_'+ (++GUID);

		this.config = ve.lang.extend(true, {
			ID_PRE: 'popup-dialog-id-pre',
			title: '对话框',				//标题
			content: '测试',				//content.src content.id
			zIndex: 9000,					//高度
			width: 400,						//宽度
			moveEnable: true,				//框体可移动
			isModal: false,					//模态对话框
			topCloseBtn: true,				//是否显示顶部关闭按钮,如果显示顶部关闭按钮，则支持ESC关闭窗口行为
			showMask: true,
			keepWhileHide: false,			//是否在隐藏的时候保留对象
			cssClass: {
				dialog: 'PopupDialog',
				head: 'PopupDialog-hd',
				body: 'PopupDialog-bd',
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

		this.constructStruct();

		//ADD TO MONITER COLLECTION
		POPUP_COLLECTION.push(this);
	};

	/**
	 * contruct popup structure
	 */
	Popup.prototype.constructStruct = function(){
		var _this = this;

		//DOM Clone Mode
		if(!this.container){
			this.container = document.createElement('div');
			document.body.appendChild(this.container);
			ve.dom.addClass(this.container, this.config.cssClass.dialog);
			ve.dom.setStyle(this.container, 'left', '-9999px');

		}
		this.container.id = this.config.ID_PRE + Math.random();

		//构建内容容器
		var content = '';
		if(typeof(this.config.content) == 'string'){
			content = '<div class="'+this.config.cssClass.body+'"'+(this.config.height ? ' style="height:'+this.config.height+'px"':'')+'>'+this.config.content+'</div>';
		} else if(this.config.content.src){
			content = '<iframe allowtransparency="true" guid="'+this.guid+'" src="'+this.config.content.src+'" class="'+this.config.cssClass.iframe+'" frameborder=0'+(this.config.height ? ' style="height:'+this.config.height+'px"':'')+'></iframe>';
		} else {
			content = '<div class="' + this.config.cssClass.container + '"'+(this.config.height ? ' style="height:'+this.config.height+'px"':'')+'></div>';
		}

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
						(this.config.topCloseBtn ? '<a class="PopupDialog-close" href="javascript:;" title="关闭窗口">x</a>' : ''),
					'</div>',content,btn_html,
				'</div>'
			]).join('');
		this.container.innerHTML = html;

		if(this.config.content.src){
			var iframe = this.container.getElementsByTagName('iframe')[0];
			ve.dom.event.add(iframe, 'load', function(){
				try {
					var ifr = this;
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
						//info.visibleWidth = w.innerWidth;
						info.visibleHeight = w.innerHeight;
					} else {
						var tag = (d.documentElement && d.documentElement.clientWidth) ?
							d.documentElement : d.body;
						//info.visibleWidth = tag.clientWidth;
						info.visibleHeight = tag.clientHeight;
					}
					var tag = (d.documentElement && d.documentElement.scrollWidth) ?
							d.documentElement : d.body;
					//info.documentWidth = Math.max(tag.scrollWidth, info.visibleWidth);
					info.documentHeight = Math.max(tag.scrollHeight, info.visibleHeight);

					//this.parentNode.parentNode.style.width = info.documentWidth + 'px';
					//w.frameElement.style.width = info.documentWidth + 'px';
					ifr.style.height = info.documentHeight + 'px';
					ve.dom.setStyle(_this.container, 'height', 'auto');
				}
				_this._constructed = true;
				_this._constructReady();
			});
		} else {
			//移动ID绑定模式的DOM对象【注意：这里移动之后，原来的元素就被删除了，为了做唯一性，这里只能这么干】
			if(this.config.content.id){
				ve.dom.get('#'+this.config.content.id).style.display = '';
				ve.dom.selector('div.'+this.config.cssClass.container)[0].appendChild(Y.dom.get('#'+this.config.content.id));
			}
			_this._constructed = true;
			this._constructReady();
		}
	};

	/**
	 * get dom
	 * @return {DOM}
	 */
	Popup.prototype.getDom = function() {
		return this.container;
	};

	/**
	 * show popup
	 */
	Popup.prototype.show = function(){
		var _this = this;

		if(!POP_STYLECSS_INSERTED){
			POP_STYLECSS_INSERTED = true;
			ve.dom.insertStyleSheet('VEDITOR_POPUP_CSS', POP_STYLECSS);
		}

		if(!this._constructed){
			this._constructReady = function(){
				_this.show();
			};
			return;
		}

		//CREATE MASK
		if(this.config.showMask){
			ve.ui.masklayer.show();
		}

		this.container.style.display = '';

		//CACULATE REGION INFO
		var region = ve.lang.extend(true, ve.dom.getRegion(this.container), this.config);
			region.minHeight = region.minHeight || 78;

		var scrollLeft = ve.dom.getScrollLeft(),
			scrollTop = ve.dom.getScrollTop(),
			winRegion = ve.dom.getWindowRegion(),
			top = left = 0;

		if(winRegion.visibleHeight > region.height){
			top = scrollTop + (winRegion.visibleHeight - region.height)/4;
		} else if(winRegion.documentHeight > region.height){
			top = scrollTop;
		}

		if(winRegion.visibleWidth > region.width){
			left = winRegion.visibleWidth/2 - region.width/2 - scrollLeft;
		} else if(winRegion.documentWidth > region.width){
			left = scrollLeft;
		}
		var calStyle = ve.lang.extend(true, region,{left:left,top:top,zIndex:this.config.zIndex});
		ve.dom.setStyles(this.container, calStyle);

		this.onShow();
		this.status = 1;
		this.bindEvent();
		this.bindMoveEvent();
		this.bindEscCloseEvent();

		var hasOtherModalPanel = false;
		var _this = this;

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

		ve.dom.setStyle(this.container, 'zIndex', this.config.zIndex);
		if(hasOtherModalPanel){
			this.setDisable();
		} else if(_this.config.isModal){
			//设置除了当前模态对话框的其他对话框所有都为disable
			ve.lang.each(POPUP_COLLECTION, function(dialog){
				if(dialog != _this && dialog.status){
					dialog.setDisable();
				}
			});
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
		ve.dom.setStyles(mask, {height:size[1], opacity:0.4});
	};

	/**
	 * bind popup event
	 */
	Popup.prototype.bindEvent = function(){
		var _this = this;
		var topCloseBtn = ve.dom.selector('a.PopupDialog-close', this.container)[0];
		if(topCloseBtn){
			topCloseBtn.onclick = function(){
				_this.close();
			};
		}

		ve.lang.each(ve.dom.selector('a.PopupDialog-btn'), function(btn, i){
			ve.dom.event.add(btn, 'click,', function(){
				if(_this.config.buttons[i].handler){
					_this.config.buttons[i].handler.apply(this, arguments);
				} else {
					_this.close();
				}
			})
		});

		var defBtn = ve.dom.selector('a.PopupDialog-btnDefault')[0];
		if(defBtn){
			defBtn.focus();
		}

		var _this = this;
		ve.dom.event.add(this.container, 'mousedown', function(){_this.updateZindex();});
	}

	/**
	 * update dialog panel z-index property
	 **/
	Popup.prototype.updateZindex = function() {
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
	 * bind ESC close event
	 */
	Popup.prototype.bindEscCloseEvent = function(){
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

	/**
	 * bind popup moving event
	 */
	Popup.prototype.bindMoveEvent = function(){
		if(!this.config.moveEnable){
			return;
		}
		var _this = this;
		var head = ve.dom.selector('.'+this.config.cssClass.head, this.container)[0];

		ve.dom.event.add(document, 'mousedown', function(e){
			var tag = ve.dom.event.getTarget();
			if(!head || !(tag == head || ve.dom.contains(head, tag))){
				return;
			}

			_this.moving = false;

			if((ve.ua.ie && (e.button == 1 || e.button == 0)) || e.button == 0){
				_this.moving = true;
			}

			if(_this.moving && (e.button == 1 || e.button == 0)){
				var conRegion = ve.dom.getRegion(_this.container);
				px = parseInt(e.clientX - conRegion.left);
				py = parseInt(e.clientY - conRegion.top);

				ve.dom.event.add(document, 'mousemove', function(e2){
					if(!_this.moving || ve.dom.event.getButton(e2) !== 0){
						return false;
					}
					e2 = e2 || window.event;
					var newLeft = e2.clientX - px,
						newTop = e2.clientY - py;
					newTop = newTop >= 0 ? newTop : 0;	//限制对话框不能被拖出窗口
					ve.dom.setStyles(_this.container, {top:newTop,left:newLeft});
				});
			}
			ve.dom.event.preventDefault();
			return false;
		});
		ve.dom.event.add(document, 'mouseup', function(){
			_this.moving = false;
		});
	}

	/**
	 * close current popup
	 */
	Popup.prototype.close = function(){
		if(this.onClose() === false || !this.container){
			return;
		}
		this.container.style.display = 'none';
		this.status = 0;

		var _this = this,
			hasDialogLeft = false,
			hasModalPanelLeft = false;

		ve.lang.each(POPUP_COLLECTION, function(dialog){
			if(dialog.status){
				hasDialogLeft = true;
			}
			if(dialog.status && dialog.config.isModal){
				hasModalPanelLeft = true;
				dialog.setEnable();
				return false;
			}
		});

		//没有显示的对话框
		if(!hasDialogLeft){
			ve.ui.masklayer.hide();
		}

		//剩下的都是普通对话框
		if(!hasModalPanelLeft){
			ve.lang.each(POPUP_COLLECTION, function(dialog){
				dialog.setEnable();
			});
		}

		if(!this.config.keepWhileHide){
			var tmp = [];
			ve.lang.each(POPUP_COLLECTION, function(dialog){
				if(dialog != _this){
					tmp.push(dialog);
				}
			});

			POPUP_COLLECTION = tmp;
			_this.container.parentNode.removeChild(_this.container);
			_this.container = null;
			_this = null;
		}
	};

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
	 * close all popup
	 * @see Popup#close
	 */
	Popup.closeAll = function(){
		ve.lang.each(POPUP_COLLECTION, function(pop){
			pop.close();
		});
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