/**
 * tab
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.Tab', {
		editor: null,
		init: function (editor, url) {
			this.editor = editor;
			this.addUIControls();
			this.bindEvent();
		},

		/**
		 * 绑定击键事件
		 **/
		bindEvent: function(){
			var ed = this.editor;

			//加入tab键制表符逻辑
			if(ed.conf.tab4space){
				var isup = true;
				ed.onKeyDown.add(function(e) {
					if (e.keyCode == 9) {
						ve.dom.event.preventDefault(e);
						if (!isup){
							return;
						}
						ed.insertHtml({content:new Array(1 + ed.conf.tab4space ).join('&nbsp;')});
						isup = false;
					}
				});
				ed.onKeyUp.add(function(e) {
					if (e.keyCode == 9) {
						isup = true;
					}
				});
			}
		},

		/**
		 * 添加按钮控件
		 **/
		addUIControls: function(){
			var t = this.editor, tm = this.editor.toolbarManager;

			tm.createButton('tableft', {title: '向左缩进', 'class': 'veTabLeft', cmd: 'outdent',onInit: function(){
				var btn = this;
				t.onAfterUpdateVERangeLazy.add(function(){
					var act = 'setUnActive';
					try {act = t.getDoc().queryCommandState('veTabLeft') ? 'setActive' : 'setUnActive';} catch(ex){};
					btn[act]();
				});
			}});
			tm.createButton('tabright', {title: '向右缩进', 'class': 'veTabRight', cmd: 'indent', onInit: function(){
				var btn = this;
				t.onAfterUpdateVERangeLazy.add(function(){
					var act = 'setUnActive';
					try {act = t.getDoc().queryCommandState('veTabRight') ? 'setActive' : 'setUnActive';} catch(ex){};
					btn[act]();
			});
			}});
		}
	});
	ve.plugin.register('tab', VEditor.plugin.Tab);
})(VEditor);
