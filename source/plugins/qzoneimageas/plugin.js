/**
 * 外域图片自动转存空间
 * @deprecate 该插件仅在空间日志下面的环境可以运行
 * 依赖登录态、QZFL、QZBlog
 */
(function(ve){
	var CHECK_TIMER;
	ve.lang.Class('VEditor.plugin.QzoneImageAutoSaver', {
		editor: null,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.editor.onAfterPaste.addLast(function(){
				_this.checkQuoteExternalImage();
			});
			this.editor.onKeyDown.add(function(){
				_this.checkQuoteExternalImage();
			});
		},

		/**
		 * 检测外域图片
		 */
		checkQuoteExternalImage: function(){
			var _this = this;
			clearTimeout(CHECK_TIMER);
			CHECK_TIMER = setTimeout(function(){
				var _html = _this.editor.getBody().innerHTML;
				var extImgs = _this.getExternalImages(_html);
				if(extImgs && extImgs.length > 0){
					_this.editor.showStatusbar('您日志中的网络图片将在发表后缓存。', 10);
				}
			}, 3000);
		},

		/**
		 * 获取外域图片数组
		 * @param {string} html
		 * @return {array}
		 */
		getExternalImages: function(html){
			var arr = [];
			if(!html){
				return arr;
			}
			html = html.replace(/<img([^>]+)>/ig,function(){
				try {
					var em = /em\/e(\d{1,3}).gif/i.exec(arguments[1]);	//表情
					if(em){
						return;
					}
					var src = /orgSrc="([^"]+)"/i.exec(arguments[1]) || /src="([^"]+)"/i.exec(arguments[1]);
					if(!src || /ac\/b\.gif/i.test(src[1])) {
						return;
					}
					if( !/^http:\/\/[^\s]*photo.store.qq.com/i.test(src[1]) &&
						!/^file:/i.test(src[1]) &&
						!/.qq.com\//i.test(src[1]) &&
						!/.soso.com\//i.test(src[1]) &&
						!/.paipaiimg.com\//i.test(src[1]) &&
						!/.qpic.cn\//i.test(src[1]) &&
						!/.paipai.com\//i.test(src[1]) ) {
						arr.push(src[1]);
					}
				} catch(err) {
					console.log('err',err);
				}
				return arguments[0];
			});
			return this._uniqueArray(arr);
		},

		_uniqueArray: function(arr){
			if(!arr || !arr.length){
				return arr;
			}
			var flag = {},index = 0;
			while (index < arr.length) {
				if (flag[arr[index]] == typeof(arr[index])) {
					arr.splice(index, 1);
					continue;
				}
				flag[arr[index].toString()] = typeof(arr[index]);
				++index;
			}
			return arr;
		}
	});
	ve.plugin.register('qzoneimageas', VEditor.plugin.QzoneImageAutoSaver);
})(VEditor);
