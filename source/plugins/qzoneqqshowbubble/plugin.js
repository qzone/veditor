/**
 * QQ秀泡泡
 * 由媒体基础类扩展获取
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneQQShowBubble:VEditor.plugin.QzoneMedia', {
		editor: null,

		config: {
			baseURL: 'http://ptlogin2.qq.com/showbub?uin='+QZONE.cookie.get('zzpaneluin')+'&clientkey='+QZONE.cookie.get('zzpanelkey'),
			panel: {
				url: null,
				name: '插入QQ秀泡泡',
				width: 900,
				height: 505
			},
			pUrl: '',
			pAlbumId: '',
			cssClassName: '',
			disableScale: true,
			cacheKeyPre: 'image_'
		},

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			//添加按钮
			this.editor.createButton('QQShowBubbleButton', {
				'class': 'veInsertQQShowBubble',
				title: '插入QQ秀泡泡',
				cmd: function(){
					_this.config.panel.url = _this.config.baseURL + (!!_this.config.pUrl ? ('&url='+_this.config.pUrl.URLencode()) : '')+(!!_this.config.pAlbumId ? ("&albid="+_this.config.pAlbumId) : '');

					/**
					 * 业务回调
					 * @param {String} url 		泡泡图片URL
					 * @param {Integer} width	图片宽度
					 * @param {Integer} height	图片高度
					 * @param {String} sContent	泡泡文字内容
					 */
					parent._tempQFCallback = function(url, width, height, sContent){
						var html = '<img src="'+url+'" transimg="1" alt="'+sContent+'" style="height:'+height+'px; width:'+width+'px"/>'
						_this.editor.insertHtml({content:html});
					};
					_this.showPanel();
				}
			});
		}
	});
	ve.plugin.register('qzoneqqshowbubble', VEditor.plugin.QzoneQQShowBubble);
})(VEditor);