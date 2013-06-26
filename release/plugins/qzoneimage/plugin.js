/**
 * 插入图片插件
 * 由媒体基础类扩展获取
 */
(function(ve){
	//是否使用QZONE版本的弹窗
	//这里为bbs.qun.qq.com这种qq.com下的站点服务，如果遇到其他站点接入，这里条件需要扩展
	var QZONE_VER = location.host.indexOf('bbs.qun.qq.com') < 0;

	/**
	 * 加载图片队列
	 * @param {Array} imgSrcList
	 * @param {Function} callback
	 **/
	var loadImageQueue = function(imgSrcList, callback){
		var len = imgSrcList.length;
		var count = 0;
		var infoList = {};

		var allDone = function(){
			var result = [];
			ve.lang.each(imgSrcList, function(item, index){
				result.push(infoList[item]);
			});
			callback(result);
		};

		ve.lang.each(imgSrcList, function(src){
			infoList[src] = {width:null, height:null, src:src};
			var img = new Image();
			img.onload = function(){
				infoList[this.src] = {width: this.width, height: this.height, src:this.src};
				if(++count == len){
					allDone();
				}
			};
			img.onerror = function(){
				if(++count == len){
					allDone();
				}
			};
			img.src = src;
		});
	};

	//新相册放量
	ve.lang.Class('VEditor.plugin.QzoneImage:VEditor.plugin.QzoneMedia', {
		editor: null,
		lastBlogAlbumId: null,

		config: {
			blogType: null,
			panel: {
				url: null,
				name: '插入图片',
				width: 610,
				height: 490
			},
			cssClassName: '',
			disableScale: false,
			IMG_MAX_WIDTH: 870
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.config.blogType = 7; //为私密日志传图做准备

			this.config.baseURL = QZONE_VER ? 'http://'+this.IMGCACHE_DOMAIN+'/qzone/app/photo/insert_photo.html#referer=blog_editor' :
				'http://'+this.IMGCACHE_DOMAIN+ "/qzone/client/photo/pages/qzone_v4/insert_photo.html#referer=blog_editor&uin=" + this.loginUin;
			this.topWin.insertPhotoContent = null;

			var goLastAid = 0;
			this.editor.createButton('image', {
				'class': 'veInsertImage',
				title: '插入图片',
				cmd: function(){
					_this.topWin.insertPhotoContent = null;
					//业务参数
					_this.config.panel.url = ([_this.config.baseURL,'&blog_type=',_this.blogType,'&uin=', _this.loginUin,'&goLastAid='+goLastAid]).join('');
					goLastAid = 1;
					_this.showPanel();
				}
			});

			this.editor.onSetContent.add(function(html){
				return _this.onSetContent(html);
			}, true);
		},

		/**
		 * 关闭窗口、插入数据回调
		 */
		popupCallback: function(){
			var _this = this;
			var data = this.topWin.insertPhotoContent;
			if(data && data.photos && data.photos.length){
				this.lastBlogAlbumId = data.lastAlbumId;
				var len = data.photos.length;
				var queue = [];

				this.editor.showStatusbar('正在插入图片...', 20)
				ve.lang.each(data.photos, function(photo){
					queue.push(photo.url);
				});

				loadImageQueue(queue, function(itemList){
					var htmls = [len > 1 ? '<br/>' : ''];
					ve.lang.each(itemList, function(item, index){
						if(item.src){
							var style = '';
							var photoData = data.photos[index];
							if(item.width && item.height){
								var w = item.width, h = item.height;
								if(w > _this.config.IMG_MAX_WIDTH){
									h = parseInt((_this.config.IMG_MAX_WIDTH / w) * h,10);
									w = _this.config.IMG_MAX_WIDTH;
								}
								style += w ? 'width:'+w+'px;' : '';
								style += h ? 'height:'+h+'px' : '';
							}

							htmls.push('<img src="',ve.string.trim(item.src),'" alt="图片"'+ (style ? ' style="'+style+'"' : '') + '/>');
							if(data.needPhotoName && photoData.name){
								htmls.push('<br/>照片名称：'+photoData.name);
							}
							if(data.needAlbumName && photoData.albumName){
								htmls.push('<br/>所属相册：'+'<a href="'+photoData.albumUrl+'">'+photoData.albumName+'</a>');
							}
							if(data.needPhotoDesc && photoData.desc){
								htmls.push('<br/>照片描述：'+photoData.desc);
							}
							if(len > 1){
								htmls.push('<br/><br/>');
							}
						}
					});
					_this.editor.insertHtml({content:htmls.join('')});
					setTimeout(function(){
						_this.editor.resize();
						_this.editor.hideStatusbar();
					}, 100);
				});
			}
			this.topWin.insertPhotoContent = null;
		},

		/**
		 * 设置内容，兼容原来的 orgsrc | originsrc形式
		 * @param {String} str
		 * @return {String}
		 */
		onSetContent: function(str){
			var result;
			result = str.replace(/<img([^>]+)>/ig, function() {
				try {
					var str = arguments[1];

					var orgSrc = /orgsrc="([^"]+)"/i.exec(str);
						orgSrc = orgSrc && orgSrc[1] ? orgSrc[1] : '';

					var osrc = /ORIGINSRC="([^"]+)"/i.exec(str);
						osrc = osrc && osrc[1] ? osrc[1] : '';

					if(orgSrc || osrc){
						str = str.replace(/(\bsrc=["|'](.*?)["|'])/ig, function(){
							return ' src="'+(osrc||orgSrc)+'"';
						});
						str = str.replace(/\borgsrc=["|'](.*?)["|']/ig, '');
						str = str.replace(/\bORIGINSRC=["|'](.*?)["|']/ig, '');
					}
					return '<img'+str+'/>';
				} catch (err) {
				}
				return arguments[0];
			});
			return result || str;
		}
	});
	ve.plugin.register('qzoneimage', VEditor.plugin.QzoneImage);
})(VEditor);
