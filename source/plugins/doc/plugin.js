/**
 * 插入文档插件
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.Doc', {
		editor: null,
		btn: null,
		panelUrl: null,

		init: function (editor, url) {
			debugger;
			var _this = this;
			this.editor = editor;
			this.btn = this.editor.createButton('doc', {
				'class': 'veUploadWord',
				title: '插入文档',
				cmd: function(){
					_this.showPanel();
				}
			});
			this.panelUrl = url + 'upload.html';
		},

		showPanel: function(){
			var _this = this;
			var dlg = ve.ui.showPopup('上传文档',{src: this.panelUrl}, 400, 265);
			ve.ui.appendPopupFn(function(){
				return _this.popupCallback();
			});
		},

		/**
		 * 关闭窗口、插入数据回调
		 */
		popupCallback: function(){
			var data = PAGE_CACHE.get('BlogDocHtml');
			if (!!data){
				data = data.trim();
				this.editor.setContent({'content':data, 'useParser':true});
				PAGE_CACHE.remove('BlogDocHtml');
				var docName = PAGE_CACHE.get('BlogDocName');
				if (!!docName && $("blog-title-input")){
					var title = $("blog-title-input").value.trim("R");
					if (title.length == 0 || title == $('blog-title-input').getAttribute('placeholder')) {
						var idx = docName.lastIndexOf('.');
						if (idx > 0){
							docName = docName.substr(0, idx);
						}
						PageScheduler.setBlogTitle(docName);
					}

					PAGE_CACHE.remove('BlogDocName');
				}
			}
		}
	});
	ve.plugin.register('doc', VEditor.plugin.Doc);
})(VEditor);
