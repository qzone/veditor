(function(ve) {
	/**
	 * HTML编辑器
	 */
	ve.lang.Class('VEditor.plugin.Code', {
		editor: null,
		btn: null,
		codeEditorUrl: '',

		init: function (editor, url) {
			var _this = this;
			this.editor = editor;
			this.codeEditorUrl = url + 'ace-builds-master/editor.html';
            this.btn = this.editor.createButton('code', {
                'class': 'veCode',
                title: '插入代码',
                cmd: function(){
					_this.showCodeEdtior();
				}
            });
		},

		showCodeEdtior: function(){
			var _this = this;
			var dlg = ve.ui.showPopup('插入代码',{src:this.codeEditorUrl}, 860, 520);
			if(this.popupCallback){
				ve.ui.appendPopupFn(function(){
					return _this.popupCallback();
				});
			}
		},

		popupCallback: function(html, code){
			if(top.VEDITOR_CODE_HTML_CONTENT){
				this.editor.insertHtml({content:top.VEDITOR_CODE_HTML_CONTENT});
				this.editor.conf.keepBGC = true;
			}
		}
	});
	ve.plugin.register('code', VEditor.plugin.Code);
}) (VEditor);