/**
 * QQ音乐
 * 由媒体基础类扩展获取
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneMusic:VEditor.plugin.QzoneMedia', {
		editor: null,

		config: {
			panel: {
				url: null,
				name: '插入音乐',
				width: 640,
				height: 330
			},
			pUrl: '',
			pAlbumId: '',
			cssClassName1: 'blog_music',
			cssClassName2: 'blog_music_multiple',

			disableScale: true
		},

		/**
		 * 初始化
		 * @param {Object} editor
		 * @param {String} url
		 */
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.config.baseURL = 'http://'+this.IMGCACHE_DOMAIN+'/music/musicbox_v2_1/doc/blog_add_song.html';
			this.config.panel.url = this.config.baseURL + '?editorid='+this.editor.id;

			this.editor.createButton('music', {
				'class': 'veInsertMusic',
				title: '插入音乐',
				cmd: function(){
					_this.showPanel();
				}
			});

			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);

			this.editor.onGetContent.add(function(html){
				return _this.onGetContent(html);
			}, true);
		},

		popupCallback: function(){
			var _this = this;
			var id = _this.editor.id;
			if(top.g_arrQZEditorReturnVal && top.g_arrQZEditorReturnVal[id]){
				var data = top.g_arrQZEditorReturnVal[id];
				var arr = data.split("|");
				var cache_id = _this.setCache(data);
				var html = '<img src="/ac/b.gif" alt="音乐" cache_id="'+cache_id+'" class="'+(arr.length>7?_this.config.cssClassName2:_this.config.cssClassName1)+'" onresizestart="return false;"/>';
				_this.editor.insertHtml({content:html});
			}
			try {
				top.g_arrQZEditorReturnVal[id] = null;
				} catch(ex){
				window.console && console.log(ex);
			};
		},

		/**
		 * 日志原文HTML转换到编辑状态
		 * @param {String} html
		 * @return {String}
		 */
		onSetContent: function(html){
			var _this = this;
			try {
				str = html.replace(/<object([^>]+)>(.*?)<\/object>/ig, function(){
					try{
						if(/class=("|')*blog_music/i.test(arguments[1])) {
							var data = / ubb="([^"]+)"/i.exec(arguments[1]);
							var arr = data[1].split("|");
							var cache_id = _this.setCache(data[1]);
							return '<img src="/ac/b.gif" alt="音乐" cache_id="'+cache_id+'" class="'+(arr.length>7?_this.config.cssClassName2:_this.config.cssClassName1)+'" onresizestart="return false;"/> ';
						}
					} catch(err){
						console.log('qzonemusic onSetContent err ', err);
					}
					return arguments[0];
				 });
			} catch(e){
				console.log('qzonemusic onSetContent err', e);
			}
			return str || html;
		},

		/**
		 * 转换IMG标签到FLASH标签,
		 * 主要提供给预览和内容存储的时候使用
		 * @param {String} str
		 * @return {String}
		 *
		 */
		onGetContent: function(str){
			var _this = this;
			var count = 0;
			str = str.replace(/<img([^>]+)>/ig, function(){
				try {
					if(/class=("|')*blog_music/i.test(arguments[1])) {
						var cache_id = /cache_id="([^"]+)"/i.exec(arguments[1]);
						var data = _this.getCache(cache_id[1]);
						++count;
						var arr = data.split("|");

						var src = 'http://'+IMGCACHE_DOMAIN+'/music/musicbox_v2_1/img/MusicFlash.swf';
						var height = (arr.length>7) ? 190 : 100;
						var width = (arr.length>7 ? 440:410);
						var id = "musicFlash"+(count-1);
						var name = "musicFlash**";
						var _class = "blog_music";
						var ubb = data;

						return '<object'+
								' codeBase="http://fpdownload.macromedia.com/get/flashplayer/current/swflash.cab#version=8,0,0,0" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="'+width+'"'+
								' height="'+height+'"'+
								' src="'+src+'"'+
								' bgcolor="#ffffff" menu="true" allowScriptAccess="always" name="'+name+'" id="'+id+'" ubb="'+ubb+'" class="'+_class+'">'+
									'<param name="movie" value="'+src+'" />'+
									'<param name="data" value="'+src+'" />'+
									'<param name="bgColor" value="#ffffff" />'+
									'<param name="wmode" value="transparent" />'+
									'<param name="menu" value="true" />' +
									'<param name="allowScriptAccess" value="always" />'+
								'</object>';
					}
				} catch(err) {
					//console.log('qzone music ongetContent error', err);
				}
				return arguments[0];
			});
			return str;
		}
	});
	ve.plugin.register('qzonemusic', VEditor.plugin.QzoneMusic);
})(VEditor);