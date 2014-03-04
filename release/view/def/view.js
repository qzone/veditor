/**
 * default viewer
 */
(function(ve) {
	ve.lang.Class('VEditor.Editor.Def: VEditor.ViewControler', {
		/**
		 * 初始化
		 * @param {Object} editor
		 * @param {String} url
		 **/
		init: function (editor, url) {
			var t = this;
			t.editor = editor;
			t.editor.onInitComplete.add(function() {
				ve.net.loadCss({
					href: ve.getAbsPath('view/' + t.editor.conf.viewer + '/css/content.css'),
					win: t.editor.getWin()
				});
				if(t.editor.conf.contentCSS) {
					ve.net.loadCss({
						href: t.editor.conf.contentCSS,
						win: t.editor.getWin()
					});
				}
			});
			ve.net.loadCss(ve.getAbsPath('view/' + t.editor.conf.viewer + '/css/global.css'));
		},

		/**
		 * 渲染布局
		 * 包括：处理工具条、处理状态条容器、新建tm
		**/
		renderBaseLayout: function(){
			var editor = this.editor;
			editor.toolbarManager = new ve.ui.ToolbarManager(editor, {name: 'default'});

			var tc = editor.toolbarManager.createContainer({'class':'veToolbarContainer editor_toolbar_container_' + editor.id, 'style': {'overflow':'hidden'}});
			editor.toolbarContainer.appendChild(tc);
			editor.toolbarContainer = tc;

			var sc = ve.dom.create('div', {'class': 'veStatusbarContainer editor_statusbar_container_' + editor.id, 'style': {'overflow':'hidden'}});
			editor.statusbarContainer.appendChild(sc);
			editor.statusbarContainer = sc;
		},

		/**
		 * 渲染工具条
		**/
		renderToolbar: function () {
			var t = this, tm = t.editor.toolbarManager, tb, btns = t.editor.conf.buttons;
			var buttonConfig = [];
			if(btns){
				if(ve.lang.getType(btns) == 'string'){
					ve.lang.each(btns.split('|'), function(gp, idx){
						buttonConfig.push({
							group: 'group'+(idx+1),
							buttons:  gp,
							className: 'veToolbar_'+'group'+(idx+1)
						});
					});
				} else if(ve.lang.getType(btns) == 'array'){
					buttonConfig = btns;
				} else {
					throw('buttons config error');
				}
			}

			ve.lang.each(buttonConfig, function(gp, idx){
				var lastTbClass = (idx+1 == buttonConfig.length) ? ' veToolbar_last' : '';
				var tb = tm.createToolbar(gp.group, {'class': gp.className+lastTbClass});
				if(gp.buttons){
					var buttons = gp.buttons.replace(/\s/g,'').split(',');
					ve.lang.each(buttons, function(btnName, idx2){
						var btn = tm.getUIControlFromCollection(btnName);
						if(btn){
							idx2 == (buttons.length - 1) && (btn.normalClass += ' veButton_last');
							tb.add(btn);
						}
					});
				}
			});

			//渲染工具条
			tm.render();
		}
	});
	ve.viewManager.register('def', ve.Editor.Def);
})(VEditor);