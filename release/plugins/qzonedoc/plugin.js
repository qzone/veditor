/**
 * 插入文档插件
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneDoc', {
		editor: null,
		btn: null,
		panelUrl: null,

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.btn = this.editor.createButton('qzonedoc', {
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
			var dlg = ve.ui.showPopup('上传文档',{src: this.panelUrl}, 400, 242);
			ve.ui.appendPopupFn(function(){
				return _this.popupCallback();
			});
		},

		/**
		 * 关闭窗口、插入数据回调
		 */
		popupCallback: function(){
			var data = PAGE_CACHE.get('BlogDocHtml');
			if (data){
				data = data.trim();
				this.editor.insertHtml({'content':data, 'useParser':true});
				PAGE_CACHE.remove('BlogDocHtml');
			}
		}
	});
	ve.plugin.register('qzonedoc', VEditor.plugin.QzoneDoc);
})(VEditor);
