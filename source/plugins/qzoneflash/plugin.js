/**
 * FLASH
 * 由媒体基础类扩展获取
 */
(function(ve){
	//这部分是针对空间额外处理的
	var isVip = false;
	try {
		isVip = QZONE.FP.getBitMapFlag(27) == 1;
	} catch(ex){}

	ve.lang.Class('VEditor.plugin.QzoneFlash:VEditor.plugin.QzoneMedia', {
		editor: null,

		config: {
			panel: {
				url: null,
				name: '插入Flash动画',
				width: 430,
				height: (isVip ? 235 : 275)
			},
			pUrl: '',
			pAlbumId: '',
			cssClassName: 'blog_flash',
			defaultFlashWidth: 500,
			defaultFlashHeight: 425,
			disableScale: false
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.config.baseURL = 'http://'+this.IMGCACHE_DOMAIN+'/qzone/newblog/v5/editor/dialog/flash.html';
			this.config.panel.url = this.config.baseURL + '?editorid='+this.editor.id;

			this.editor.createButton('flash', {
				'class': 'veInsertFlash',
				title: '插入Flash动画',
				cmd: function(){
					_this.showPanel();
				}
			});

			this.editor.onMouseDown.add(function(ev){
				_this.toggleflashInfoPanel(ev);
			});

			this.editor.onKeyDown.add(function(ev){
				_this.toggleflashInfoPanel(ev, true);
			});

			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);

			this.editor.onGetContent.add(function(html){
				return _this.onGetContent(html);
			}, true);

			ve.dom.event.add(document.body, 'click', function(ev){
				var tag = ve.dom.event.getTarget(ev);
				if(_this.flashInfoPanel && (tag == _this.flashInfoPanel || ve.dom.contains(_this.flashInfoPanel, tag))){
				} else {
					_this.toggleflashInfoPanel(ev, true);
				}
			});
		},

		popupCallback: function() {
			var _this = this;
			var id = _this.editor.id;
			if(QZONE.FP._t.g_arrQZEditorReturnVal && QZONE.FP._t.g_arrQZEditorReturnVal[id]){
				var data = QZONE.FP._t.g_arrQZEditorReturnVal[id];
				//透明
				if(data[4]){
					data[5] = parseInt(data[5], 10) || 0;
					data[6] = parseInt(data[6], 10) || 0;
				} else {
					data[6] = data[5] = undefined;
				}
				var FlashData = _this._fixFlashData(data[0], data[3], data[2], data[6], data[5]);
				var cache_id = _this.setCache(FlashData);
				var style = FlashData.abs ? ';position:absolute; top:'+FlashData.top+'px'+';left:'+FlashData.left+'px;' : '';
				html = '<img src="/ac/b.gif" alt="flash" class="'+_this.config.cssClassName+'" style="width:'+FlashData.width+'px;height:'+FlashData.height+'px;'+style+'" cache_id="'+cache_id+'" />';
				_this.editor.insertHtml({content:html});
			}
			try{QZONE.FP._t.g_arrQZEditorReturnVal[id] = null;} catch(e){};
		},

		onSetContent: function(str){
			var _this = this;
			str = str.replace(/<object([^>]+)>(.*?)<\/object>/ig, function(){
				try {
					if(/class=("|')*blog_flash/i.test(arguments[1])) {
						var res = /(<embed([^>]+)>)/ig.exec(arguments[2]);
						if(!!res) {
							return res[1];
						}
					}
				} catch(err){}
				return arguments[0];
			});

			str = str.replace(/<embed([^>]+)>/ig,function(){
				try{
					if(/class=("|')*blog_flash/i.test(arguments[1])) {
						var width = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var height = /height="([^"]+)"/i.exec(arguments[1]) || [];
						var src = /src="([^"]+)"/i.exec(arguments[1]) || [];
						var _top = /top\:([^px]+)/i.exec(arguments[1]) || [];
						var left = /left:([^px]+)/i.exec(arguments[1]) || [];

						var FlashData = _this._fixFlashData(src[1], width[1], height[1], _top[1], left[1]);
						var absStyle = FlashData.abs ? ';position:absolute; top:'+FlashData.top+'px'+';left:'+FlashData.left+'px;' : '';
						var cache_id = _this.setCache(FlashData);
						return '<img src="/ac/b.gif" class="blog_flash'+'" style="width:'+FlashData.width+'px;height:'+FlashData.height+'px;'+ absStyle+'" cache_id="'+cache_id+'" />';
					}
				} catch(err){
					//console.log('error', err);
				}
				return arguments[0];
			 });
			 return str;
		},

		/**
		 * 切换Flash面板
		 * @param {object} node
		 * @param {boolean} hide
		 * @deprecate 当node为空，或者node不是Flash img时，则隐藏面板
		 */
		toggleflashInfoPanel: function(ev, hide){
			var tag;
			if(!ev || (!ev.target && !ev.srcElement)){
				tag = ve.dom.event.getTarget();
			} else {
				tag = ev.target || ev.srcElement;
			}

			if(!hide && tag && tag.tagName == 'IMG' && ve.dom.hasClass(tag, 'blog_flash')){
				if(!this.flashInfoPanel){
					var html = ['<strong>Flash地址：</strong><br/>',
								'<input type="text" value="" readonly="readonly"/><br/>',
								'<strong>大小：<span></span></strong>'
								].join('');
					this.flashInfoPanel = document.createElement('div');
					this.flashInfoPanel.className = 've_video_info_tip';
					this.flashInfoPanel.style.display = 'none';
					this.flashInfoPanel.innerHTML = html;
					document.body.appendChild(this.flashInfoPanel);
				}
				var FlashData = this.getCache(tag.getAttribute('cache_id'));
					FlashData.width = parseInt((tag.width || tag.style.width), 10) || FlashData.width;			//使用实际占位图大小
					FlashData.height = parseInt((tag.height || tag.style.height), 10) || FlashData.height;
				var imgReg = this.getEditorEleFrameRegion(tag);

				var left = imgReg.width > 300 ? (imgReg.left+imgReg.width-265)+'px' : (imgReg.left+imgReg.width+3)+'px';
				var top = imgReg.height > 100 ? (imgReg.top+imgReg.height-75)+'px' : (imgReg.top + imgReg.height+3)+'px';
				this.flashInfoPanel.style.left = left;
				this.flashInfoPanel.style.top = top;
				this.flashInfoPanel.style.display = '';
				this.flashInfoPanel.getElementsByTagName('span')[0].innerHTML = FlashData.width + 'x' + FlashData.height;
				this.flashInfoPanel.getElementsByTagName('input')[0].value = FlashData.source;
			} else if(this.flashInfoPanel){
				this.flashInfoPanel.style.display = 'none';
			}
		},


		/**
		 * 格式化、修正Flash数据
		 */
		_fixFlashData: function(source, width, height, top, left){
			var Data = {
				'source': source,
				'width': parseInt(width, 10) || this.config.defaultFlashWidth,
				'height': parseInt(height, 10) || this.config.defaultFlashHeight,
				'top': top || 0,
				'left': left || 0,
				'abs': !(top === undefined)
			}
			return Data;
		},

		onGetContent: function(str){
			var _this = this;
			str = str.replace(/<img([^>]+)>/ig, function(){
				try{
					if(/class=("|')*blog_flash/i.test(arguments[1])) {
						var cache_id = /cache_id="([^"]+)"/i.exec(arguments[1]);
						var FlashData = _this.getCache(cache_id[1]);

						//调整后的高宽
						var w = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var h = /height="([^"]+)"/i.exec(arguments[1]) || [];
						FlashData.width = (w && w[1]) ? w[1] : FlashData.width;
						FlashData.height = (h && h[1]) ? h[1] : FlashData.height;

						if(FlashData.source) {
							var flag = _this.isInWhiteList(FlashData.source);
							var isQQSound = /qzone\/flashmod\/ivrplayer\/ivrplayer.swf/i.test(FlashData.source);
							var style = FlashData.abs ? ' style="position:absolute;left:'+FlashData.left+'px; top:'+FlashData.top+'px"' : '';

							var embed_html = '<embed class="blog_flash" id="'+Math.random()+'" menu="false" invokeURLs="false" allowNetworking="'+(flag?'all':'internal')+'" allowFullScreen="'+
								(flag?'true':'false')+'" allowscriptaccess="'+(flag?'always':'never')+'"'+((isQQSound&&flag) ? (' flashvars="autoplay=1"') : '')+' wmode="transparent" src="'+FlashData.source+'" height="'+FlashData.height+'" width="'+FlashData.width+'"'+style+'/>';
							return embed_html;
						}
					}
				} catch(err){
					//console.log('onGetContent ERR',err);
				}
				return arguments[0];
			 });
			 return str;
		}
	});
	ve.plugin.register('qzoneflash', VEditor.plugin.QzoneFlash);
})(VEditor);
