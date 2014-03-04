/**
 * 插入图片插件
 * 由媒体基础类扩展获取
 */
(function(ve){
	//是否使用QZONE版本的弹窗
	//这里为bbs.qun.qq.com这种qq.com下的站点服务，如果遇到其他站点接入，这里条件需要扩展
	var QZONE_VER = location.host.indexOf('bbs.qun.qq.com') < 0;

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
			IMG_MAX_WIDTH: 870,
			IMG_MAX_HEIGHT: null
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.config.blogType = 7; //为私密日志传图做准备

			this.config.baseURL = QZONE_VER ? 'http://'+this.IMGCACHE_DOMAIN+'/qzone/app/photo/insert_photo.html#appid=2&refer=blog' :
				'http://'+this.IMGCACHE_DOMAIN+ "/qzone/client/photo/pages/qzone_v4/insert_photo.html#appid=2&refer=blog&uin=" + this.loginUin;
			this.topWin.insertPhotoContent = null;

			var goLastAid = 0;
			this.editor.createButton('image', {
				'class': 'veInsertImage',
				title: '插入图片',
				cmd: function(){
					_this.topWin.insertPhotoContent = null;
					//业务参数
					_this.config.panel.url = ([_this.config.baseURL,'&uploadHD=1','&blog_type=',_this.blogType,'&uin=', _this.loginUin,'&goLastAid='+goLastAid]).join('');
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

				ve.dom.loadImageQueue(queue, function(itemList){
					var htmls = [len > 1 ? '<br/>' : ''];
					ve.lang.each(itemList, function(item, index){
						if(item.src){
							var photoData = data.photos[index];
							var reg = ve.lang.resize(item.width, item.height, _this.config.IMG_MAX_WIDTH, _this.config.IMG_MAX_HEIGHT);
							var style = 'width:'+reg[0]+'px; height:'+reg[1]+'px';
							htmls.push('<img src="',ve.string.trim(item.src),'" alt="图片" style="'+style+'"/>');

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
