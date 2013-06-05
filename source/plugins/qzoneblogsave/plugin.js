(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneBlogSave', {
		editor: null,

		init: function (editor, url) {
			this.editor = editor;
			var ev = new ve.EventManager(editor);
			editor.addIO('onSubmit', ev);

			//快捷键
			editor.addShortcut('ctrl+enter', function(){
				ev.fire(editor, true);
			});

			//按钮UI
			editor.toolbarManager.createButton('submit', {title:'发表日志(ctrl+enter)', 'text':'发 表','class':'veSubmitBlog', cmd:function(){
				ev.fire(editor);
			}});
		}
	});
	ve.plugin.register('qzoneblogsave', VEditor.plugin.QzoneBlogSave);
})(VEditor);
