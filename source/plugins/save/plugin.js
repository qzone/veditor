/**
 * 保存按钮
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.Save', {
		init: function (editor, url) {
			//额外事件支持
			editor.addIO('onSaveContent', new ve.EventManager(editor));

			//快捷键
			editor.addShortcut('ctrl+s', function(){
				editor.tryIO('onSaveContent', function(ev){
					return ev.fire(editor, editor.getContent());
				});
			});

			//按钮UI
			editor.toolbarManager.createButton('save', {title:'保存(ctrl+s)', 'class':'veSave', cmd:function(){
				editor.tryIO('onSaveContent', function(ev){
					return ev.fire(editor, editor.getContent());
				});
			}});
		}
	});
	ve.plugin.register('save', VEditor.plugin.Save);
})(VEditor);
