/**
 * SOSO表情插件
 * @author sasumi
 * @build 20110321
 */
(function(ve){
	var HOST = 'http://i.gtimg.cn';
	if(window.imgcacheDomain){
		if(imgcacheDomain.indexOf('http://') == 0){
			HOST = imgcacheDomain;
		} else {
			HOST = 'http://'+imgcacheDomain;
		}
	}

	ve.lang.Class('VEditor.plugin.SOSOEmotion', {
		bEmotionLoaded: false,
		btnElement: null,
		editor: null,
		jsPath: 'http://image.soso.com/js/sosoexp_platform.js',

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.btn = this.editor.createButton('emotion', {
				'class': 'veEmotion',
				title: '表情',
				cmd: function(){
					_this.btnElement = _this.btn.getDom();
					_this.show();
				}
			});

			this.editor.onClick.add(function(){_this.hide()});
		},

		show: function(){
			var _this = this;

			//木有加载过文件
			if(typeof SOSO_EXP !== "object"){
				QZFL.imports(this.jsPath, function(){
					if(typeof SOSO_EXP === "object") {
						SOSO_EXP.Register(30001, 'qzone', _this.btnElement, 'bottom', _this.editor, function(a,b){
							_this.insertEmotion(b);
						});
						_this.btnElement.setAttribute('binded', '1');
						SOSO_EXP.Platform.popupBox(_this.btnElement);
					}
				});
			}

			//木有绑定过事件
			else if(!_this.btnElement.getAttribute('binded')){
				SOSO_EXP.Register(30001, 'qzone', _this.btnElement, 'bottom', _this.editor, function(a,b){
					_this.insertEmotion(b);
				});
				SOSO_EXP.Platform.popupBox(_this.btnElement);
			}
		},

		/**
		 * 插入soso表情
		 * @param {String} sosoEmotionUrl soso表情地址
		 **/
		insertEmotion: function(sosoEmotionUrl){
			sosoEmotionUrl = sosoEmotionUrl.replace(/^http:\/\/cache.soso.com\/img\/img\/e(\d{1,3}).gif/gi, "/qzone/em/e$1.gif");  // 替换默认表情
			if(sosoEmotionUrl.indexOf('/') == 0){
				sosoEmotionUrl = HOST + sosoEmotionUrl;
			}
			var html = '<img src="'+sosoEmotionUrl+'"/>&nbsp;';
			this.editor.insertHtml({content:html});
		},

		/**
		 * 隐藏表情，由于表情那边木有提供相关关闭窗口的接口，
		 * 当前只能这么干干了。
		 */
		hide: function(){
			if(typeof(SOSO_EXP) == 'object'){
				SOSO_EXP.Platform.hideBox();
			}
		}
	});
	ve.plugin.register('sosoemotion', VEditor.plugin.SOSOEmotion);
})(VEditor);