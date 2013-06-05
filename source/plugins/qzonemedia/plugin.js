/**
 * QZONE媒体基础应用类(图片、音乐、影集、视频、flash)
 * 该插件必须运行在qzone环境下面，且先加载当前类
 * 当前类继承存在BUG。父类属性会被删除
 */
(function(ve){
	var QZONE = window.QZONE = window.QZONE || {};
	QZONE.FP = QZONE.FP || {};
	QZONE.FP._t = QZONE.FP._t || top;
	QZONE.FP.getQzoneConfig = QZONE.FP.getQzoneConfig || function(){
		return {loginUin: window.g_iUin};
	};
	QZONE.FP.closePopup = QZONE.FP.closePopup || function(){
		return ve.ui.closePopup();
	};

	var CACHE_DATA_LIST = [];
	var TOP_WIN = QZONE.FP._t;
	var LOGIN_UIN = QZONE.FP.getQzoneConfig().loginUin;
	var IMGCACHE_DOMAIN = window.IMGCACHE_DOMAIN || 'qzs.qq.com';

	ve.lang.Class('VEditor.plugin.QzoneMedia', {
		topWin: TOP_WIN,
		loginUin: LOGIN_UIN,
		IMGCACHE_DOMAIN: IMGCACHE_DOMAIN,

		/**
		 * 初始化
		 * @param {Object} editor
		 * @param {String} url
		 */
		init: function (editor, url) {
			this.editor = editor;
		},

		/**
		 * 显示插入面板
		 */
		showPanel: function(){
			var _this = this;
			var panelConfig = this.config.panel;

			var dlg = ve.ui.showPopup(panelConfig.name,{src:panelConfig.url},panelConfig.width, panelConfig.height);
			if(this.popupCallback){
				ve.ui.appendPopupFn(function(){
					return _this.popupCallback();
				});
			}
		},

		/**
		 * 关闭插入面板
		 */
		closePanel: function(){
			ve.ui.closePopup();
		},

		/**
		 * 获取编辑器内部document对象相对于外部的位置
		 * @param {object} tag
		 */
		getEditorEleFrameRegion: function(tag){
			var region = {left:0, top:0, width:0, height:0};

			var innerPos = ve.dom.getXY(tag);
			var iframePos = ve.dom.getXY(this.editor.iframeElement);

			//console.log('TODO 这里要针对滚动情况debug一下');
			var iframeScrollTop = this.editor.getBody().scrollTop;
			var iframeScrollLeft = this.editor.getBody().scrollLeft;

			region.left = iframePos[0] + innerPos[0] + iframeScrollLeft;
			region.top = iframePos[1] + innerPos[1] + iframeScrollTop;
			region.width = tag.offsetWidth;
			region.height = tag.offsetHeight;
			return region;
		},

		/**
		 * 资源白名单
		 * @param {String} url
		 * @return {Boolean}
		 **/
		isInWhiteList: function(url) {
			var isQQVideo = /^http:\/\/((\w+\.|)(video|v|tv)).qq.com/i.test(url);
			var isImgCache = /^http:\/\/(?:cnc.|edu.|ctc.)?imgcache.qq.com/i.test(url) || /^http:\/\/(?:cm.|cn.|os.|ctc.|cnc.|edu.)?qzs.qq.com/i.test(url);
			var isComic = /^http:\/\/comic.qq.com/i.test(url);

			return (isQQVideo || isImgCache || isComic);
		},

		/**
		 * 设置cache
		 * @param {Object} data
		 * @return {Number} cacheId
		 **/
		setCache: function(data){
			CACHE_DATA_LIST.push(data);
			return CACHE_DATA_LIST.length-1;
		},

		/**
		 * 获取cache
		 * @param {Number} id
		 * @return {Object}
		 **/
		getCache: function(id){
			return CACHE_DATA_LIST[id] || null;
		}
	});
	ve.plugin.register('qzonemedia', VEditor.plugin.QzoneMedia);
})(VEditor);