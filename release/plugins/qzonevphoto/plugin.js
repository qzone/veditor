/**
 * 动感影集，当前没有支持按钮
 * 由媒体基础类扩展获取
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneVphoto:VEditor.plugin.QzoneMedia', {
		editor: null,

		config: {
			defaultVideoWidth: 520,
			defaultVideoHeight: 390
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);

			this.editor.onGetContent.add(function(html){
				return _this.onGetContent(html);
			}, true);
		},

		onSetContent: function(str){
			var _this = this;
			str = str.replace(/<object([^>]+)>(.*?)<\/object>/ig, function(){
				try {
					if(/class=("|')*blog_album/i.test(arguments[1])) {
						var res = /(<embed([^>]+)>)/ig.exec(arguments[2]);
						if(!!res) {
							return res[1];
						}
					}
				} catch(err){}
				return arguments[0];
			});

			str = str.replace(/<embed([^>]+)>/ig, function(){
				try{
					if(/class=("|')*blog_album/i.test(arguments[1])) {
						var w = /width="([^"]+)"/i.exec(arguments[1]) || [];
						var h = /height="([^"]+)"/i.exec(arguments[1]) || [];
						var loop = /loop="([^"]+)"/i.exec(arguments[1]) || [];
						var autostart = /autostart="([^"]+)"/i.exec(arguments[1]) || [];
						var autoplay = /autoplay="([^"]+)"/i.exec(arguments[1]) || [];
						var src = /src="([^"]+)"/i.exec(arguments[1]);
						var imgurl = /imgurl="([^"]+)"/i.exec(arguments[1]);
						var count = 0;
						var VideoData = _this._fixVideoData(src[1], w[1], h[1], loop[1], autostart[1], autoplay[1], null, imgurl[1]);
						var cache_id = _this.setCache(VideoData);

						return (['<img src="',VideoData.imgurl,'" class="blog_album" style="width:',VideoData.width,'px;height:',VideoData.height,'px;" cache_id="',cache_id,'" />']).join('');
					}
				} catch(err){
					//console.log('set content err', err);
				}
				return arguments[0];
			});
			return str;
		},

		onGetContent: function(html){
			var _this = this;
			str = html.replace(/<img([^>]+)>/ig, function(){
				try {
					if(/class=("|')*blog_album/i.test(arguments[1])) {
						var cache_id = /cache_id="([^"]+)"/i.exec(arguments[1]);
						VideoData = _this.getCache(cache_id[1]);
						if(VideoData) {
							var embed_html = ([
								'<embed class="blog_album" type="application/x-shockwave-flash" ',
								'allownetworking="',(_this.isInWhiteList(VideoData.source) ? 'all" allowScriptAccess="always" ' : 'internal" '),
								'id="blog_album_',(new Date()).getTime(),'" enablecontextmenu="False" ',
								'width="',VideoData.width,'" ',
								'height="',VideoData.height,'" ',
								(VideoData.imgurl ? 'imgurl="'+VideoData.imgurl+'" ' : ''),
								'loop="',VideoData.loop,'" autostart="',VideoData.autostart,'" showstatusbar="1" invokeurls="false" allowfullscreen="true" ',
								'src="',VideoData.source,'"/>'
							]).join('');

							return embed_html;
							/**

							var html = (['<object class="blog_album" type="application/x-shockwave-flash" id="blog_album_o_',(new Date()).getTime(),'" data="',VideoData.source,'"',
										'codeBase="http://fpdownload.macromedia.com/get/flashplayer/current/swflash.cab#version=8,0,0,0" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" ',
										'width="',VideoData.width,'" height="',VideoData.height,'">',
										'<param name="loop" value="',VideoData.loop,'" />',
										'<param name="autostart" value="',VideoData.autostart,'" />',
										'<param name="movie" value="',VideoData.source,'" />',
										'<param name="allowFullScreen" value="true" />',
										'<param name="wmode" value="transparent" />',
										'<param name="allowScriptAccess" value="always" />',
										'<param name="imgurl" value="',VideoData.imgurl,'" />',
										'<param name="allownetworking" value="all" />',embed_html,
									'</object>']).join('');
							return html;
							**/
						}
					}
				} catch(err){
					//console.log('qzonevideo onGetContent', err);
				}
				return arguments[0];
			 });
			return str;
		},

		/**
		 * 格式化、修正视频数据
		 * autoplay针对视频没有什么意义
		 */
		_fixVideoData: function(source, width, height, loop, autostart, autoplay, allowfullscreen, imgurl){
			var vD = {
				'source': source,
				'width': parseInt(width, 10) || this.config.defaultVideoWidth,
				'height': parseInt(height, 10) || this.config.defaultVideoHeight,
				'loop': (loop && (loop == 1 || loop.toLowerCase()=='true')) ? 'true' : 'false',
				'autostart': (autostart && (autostart == 1 || autostart.toLowerCase()=='true')) ? 'true' : 'false',
				'allowfullscreen': (allowfullscreen && (allowfullscreen == 1 || allowfullscreen.toLowerCase()=='true')) ? 'true' : 'false',
				'autoplay': (autoplay && (autoplay == 1 || autoplay.toLowerCase()=='true')) ? 'true' : 'false',
				'imgurl': imgurl
			}
			return vD;
		}
	});
	ve.plugin.register('qzonevphoto', VEditor.plugin.QzoneVphoto);
})(VEditor);
