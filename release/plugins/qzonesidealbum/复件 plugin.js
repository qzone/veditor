(function(ve) {
	/**
	 * 侧栏插相册图片
	 * 依赖相册前台脚本环境
	 */
	ve.lang.Class('VEditor.plugin.QzoneSideAlbum', {
		lazyTm: 0,
		editor: null,
		init: function(editor, url){
			if(window.screen.width < 1280 || window.screen.height < 720 || QZBlog.Util.isOldXWMode()){
				return;
			}

			var _this = this;
			this.editor = editor;
			this.editor.onInitComplete.add(function(){
				setTimeout(function(){
					parent.QZFL.imports(url+'side.js', function(){
						var S = parent.VEDITOR_SIDEALBUM;
						if(S){
							S.start();
						}
					});
				}, _this.lazyTm);
			});
		}
	});
	ve.plugin.register('qzonesidealbum', VEditor.plugin.QzoneSideAlbum);
}) (VEditor);