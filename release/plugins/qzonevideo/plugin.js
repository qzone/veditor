/**
 * QQ视频
 * 由媒体基础类扩展获取
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneVideo:VEditor.plugin.QzoneMedia', {
		editor: null,
		videoInfoPanel: null,

		config: {
			panel: {
				url: null,
				name: '插入视频',
				width: 526,
				height: 450
			},
			cssClassName: 'blog_video',
			disableScale: false,
			defaultVideoWidth: 500,
			defaultVideoHeight: 425
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.config.baseURL = 'http://'+IMGCACHE_DOMAIN+'/qzone/app/video/htmlout/blog.html';
			this.config.panel.url = this.config.baseURL + '?editorid='+this.editor.id;

			this.editor.createButton('video', {
				'class': 'veInsertVideo',
				title: '插入视频',
				cmd: function(){
					_this.showPanel();
				}
			});

			this.editor.onMouseDown.add(function(ev){
				_this.toggleVideoInfoPanel();
			});

			this.editor.onKeyDown.add(function(ev){
				_this.toggleVideoInfoPanel(ev, true);
			});

			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);

			this.editor.onGetContent.add(function(html){
				return _this.onGetContent(html);
			}, true);

			ve.dom.event.add(document.body, 'click', function(ev){
				var tag = ve.dom.event.getTarget(ev);
				if(_this.videoInfoPanel && (tag == _this.videoInfoPanel || ve.dom.isAncestor(_this.videoInfoPanel, tag))){
				} else {
					_this.toggleVideoInfoPanel(ev, true);
				}
			});
		},

		popupCallback: function(){
			var _this = this;
			try {
				var id = _this.editor.id;
				var data = QZONE.FP._t.insertVideoContent[id];
				if(data){
					var VideoData = _this._fixVideoData(data);
					var cache_id = _this.setCache(VideoData);

					var html = '<img src="'+(VideoData.thumb || '/ac/b.gif')+'" alt="视频" cache_id="'+cache_id+'" class="'+_this.config.cssClassName+'" style="width:'+VideoData.width+'px; height:'+VideoData.height+'px"/>';
					_this.editor.insertHtml({content:html});
				}
				QZONE.FP._t.insertVideoContent[id] = null;
			} catch(ex){};
		},

		onSetContent: function(str){
			var result, _this = this;
			result = str.replace(/<object([^>]+)>(.*?)<\/object>/ig, function(){
				try {
					if(/class=("|')*(blog_video|blog_qqVideo)/i.test(arguments[1])) {
						var res = /(<embed([^>]+)>)/ig.exec(arguments[2]);
						if(!!res) {
							return res[1];
						}
					}
				} catch(err){
					//console.log('err', err);
				}
				return arguments[0];
			});

			result = result.replace(/<embed([^>]+)>/ig, function(){
				try{
					if(/class=("|')*(blog_video|blog_qqVideo)/i.test(arguments[1])) {
						var w = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var h = /height="([^"]+)"/i.exec(arguments[1]) || [];
						var loop = /loop="([^"]+)"/i.exec(arguments[1]) || [];
						var autostart = /autostart="([^"]+)"/i.exec(arguments[1]) || [];
						var videoThumb = /videothumb="([^"]+)"/i.exec(arguments[1]) || [];
						var videoTitle = /videotitle="([^"]+)"/i.exec(arguments[1]) || [];
						var videosource = /videosource="([^"]+)"/i.exec(arguments[1]) || [];
						var src = /src="([^"]+)"/i.exec(arguments[1]) || [];
						var count = 0;

						var VideoData = _this._fixVideoData({
							pre: videoThumb[1],
							pageUrl: videosource[1],
							title: decodeURI(videoTitle[1] || '').replace(/\%2b/ig, '+'),
							width: w[1],
							height: h[1],
							playerUrl: src[1],
							autostart: autostart[1],
							loop: loop[1]
						});
						var cache_id = _this.setCache(VideoData);
						return '<img src="'+(VideoData.thumb || '/ac/b.gif')+'" class="blog_video" style="width:'+VideoData.width+'px;height:'+VideoData.height+'px;" cache_id="'+cache_id+'" />';
					}
				} catch(err){
					console.log('set content err', err);
				}
				return arguments[0];
			});
			return result || str;
		},

		onGetContent: function(html){
			var _this = this;
			str = html.replace(/<img([^>]+)>/ig, function(){
				try {
					if(/class=("|')*(blog_video|blog_qqVideo)/i.test(arguments[1])) {
						var cache_id = /cache_id="([^"]+)"/i.exec(arguments[1]);
						VideoData = _this.getCache(cache_id[1]);

						//调整后的高宽
						var w = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var h = /height="([^"]+)"/i.exec(arguments[1]) || [];
						VideoData.width = (w && w[1]) ? w[1] : VideoData.width;
						VideoData.height = (h && h[1]) ? h[1] : VideoData.height;

						if(VideoData) {
							var isQQVideo = /^http:\/\/((\w+\.|)(video|v|tv)).qq.com/i.test(VideoData.source);
							var embed_html = ([
								'<embed class="blog_video" type="application/x-shockwave-flash" ',
								'allownetworking="',(_this.isInWhiteList(VideoData.source) ? 'all" allowScriptAccess="always" ' : 'internal" '),
								'id="blog_video_',(new Date()).getTime(),'" enablecontextmenu="False" ',
								'width="',VideoData.width,'" ',
								(VideoData.thumb ? ('videothumb="'+VideoData.thumb+'" ') : ''),
								(VideoData.title ? ('videotitle="'+URIencode(VideoData.title).replace(/\+/g, '%2b')+'" '): ''),
								(VideoData.videosource ? ('videosource="'+VideoData.videosource+'" '): ''),
								'height="',VideoData.height,'" ',
								'loop="',VideoData.loop,'" autostart="',VideoData.autostart,'" wmode="opaque" showstatusbar="1" invokeurls="false" allowfullscreen="true" ',
								'src="',VideoData.source,'"/>'
							]).join('');

							if(!isQQVideo) {
								return embed_html;
							}

							var html = (['<object class="blog_video" type="application/x-shockwave-flash" id="blog_video_o_',(new Date()).getTime(),'" data="',VideoData.source,'"',
										'codeBase="http://fpdownload.macromedia.com/get/flashplayer/current/swflash.cab#version=8,0,0,0" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" ',
										'width="',VideoData.width,'" height="',VideoData.height,'">',
										'<param name="loop" value="',VideoData.loop,'" />',
										'<param name="autostart" value="',VideoData.autostart,'" />',
										'<param name="movie" value="',VideoData.source,'" />',
										'<param name="allowFullScreen" value="true" />',
										'<param name="wmode" value="opaque" />',
										'<param name="allowScriptAccess" value="always" />',
										'<param name="allownetworking" value="all" />',embed_html,
									'</object>']).join('');
							return html;
						}
					}
				} catch(err){
					console && console.log('qzonevideo onGetContent', err);
				}
				return arguments[0];
			 });
			return str;
		},

		/**
		 * 格式化、修正视频数据
		 * @param  {string} source          影片source
		 * @param  {integer} width          宽度
		 * @param  {integer} height         高度
		 * @param  {boolean} loop           是否循环播放
		 * @param  {boolean} autostart      是否自动开始
		 * @param  {boolean} allowfullscreen 允许全屏
		 * @param  {string} thumb           缩略图
		 * @param  {string} title			视频标题
		 * @param {String} videosource 			视频页面url
		 */
		_fixVideoData: function(data){
			var vD = {
				'source': data.playerUrl,
				'width': parseInt(data.width, 10) || this.config.defaultVideoWidth,
				'height': parseInt(data.height, 10) || this.config.defaultVideoHeight,
				'autoplay': data.autoplay,
				'loop': (data.loop || data.autoecho) ? 'true' : 'false',
				'autostart': (data.autoplay || data.autostart) ? 'true' : 'false',
				'allowfullscreen': data.allowfullscreen ? 'true' : 'false',
				'thumb': data.pre || '',
				'title': data.title || '',
				'videosource': data.pageUrl || ''
			}
			return vD;
		},

		/**
		 * 切换视频面板
		 * @param {object} node
		 * @param {boolean} hide
		 * @deprecate 当node为空，或者node不是视频img时，则隐藏面板
		 */
		toggleVideoInfoPanel: function(ev, hide){
			var tag;
			if(!ev || (!ev.target && !ev.srcElement)){
				tag = ve.dom.event.getTarget();
			} else {
				tag = ev.target || ev.srcElement;
			}

			if(!hide && tag && tag.tagName == 'IMG' && ve.dom.hasClass(tag, 'blog_video')){
				if(!this.videoInfoPanel){
					var html = ['<strong>视频地址：</strong><br/>',
								'<input type="text" value="" readonly="readonly"/><br/>',
								'<strong>大小：<span></span></strong>'
								].join('');
					this.videoInfoPanel = document.createElement('div');
					this.videoInfoPanel.className = 've_video_info_tip';
					this.videoInfoPanel.style.display = 'none';
					this.videoInfoPanel.innerHTML = html;
					document.body.appendChild(this.videoInfoPanel);
				}

				var VideoData = this.getCache(tag.getAttribute('cache_id'));
					VideoData.width = parseInt((tag.width || tag.style.width), 10) || VideoData.width;			//使用实际占位图大小
					VideoData.height = parseInt((tag.height || tag.style.height), 10) || VideoData.height;

				var imgReg = this.getEditorEleFrameRegion(tag);

				var left = imgReg.width > 300 ? (imgReg.left+imgReg.width-265)+'px' : (imgReg.left+imgReg.width+3)+'px';
				var top = imgReg.height > 100 ? (imgReg.top+imgReg.height-75)+'px' : (imgReg.top + imgReg.height+3)+'px';
				this.videoInfoPanel.style.left = left;
				this.videoInfoPanel.style.top = top;
				this.videoInfoPanel.style.display = '';
				this.videoInfoPanel.getElementsByTagName('span')[0].innerHTML = VideoData.width + 'x' + VideoData.height;
				this.videoInfoPanel.getElementsByTagName('input')[0].value = VideoData.source;
			} else if(this.videoInfoPanel){
				this.videoInfoPanel.style.display = 'none';
			}
		}
	});
	ve.plugin.register('qzonevideo', VEditor.plugin.QzoneVideo);
})(VEditor);
