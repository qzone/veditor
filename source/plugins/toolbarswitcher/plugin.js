/**
 * 工具栏模式切换
 */
(function(ve) {
	var _ADV_CSS_LINK_URL;

	ve.lang.Class('VEditor.plugin.ToolbarSwitcher', {
		editor:null,
		curState: '',	//normal | advance
		advToolbarClass: '',
		advToolbarText: '',
		normalToolbarText: '',

		btn: null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.curState = editor.conf.toolbarMode || 'normal';
			this.advToolbarClass = editor.conf.advToolbarClass || 'veToolbarAdvMode';
			this.advToolbarText = editor.conf.advToolbarText || '基本功能';
			this.normalToolbarText = editor.conf.normalToolbarText || '高级功能';

			this.btn = this.editor.createButton('toolbarswitcher', {
				'class': 'veToolbarSwitcher',
				title: '切换到 '+this.normalToolbarText,
				text: this.normalToolbarText+'<b></b>',
				cmd:  function(){
					_this.switchToolbar();
				}
			});

			//添加工具条模式
			this.editor.onInitComplete.add(
				function(){
					_this.switchToolbar(_this.curState);
				}
			);

			//普通模式下面的样式
			ve.dom.insertCSSLink(url+'base.css');
			_ADV_CSS_LINK_URL = url+'advance.css';
			editor.addIO('onAfterSwitchToolbar', new ve.EventManager(editor));
		},

		switchToolbar: function(targetState){
			var targetState = targetState === undefined ? (this.curState == 'advance' ? 'normal' : 'advance') : targetState;
			ve.dom[targetState == 'advance' ? 'addClass' : 'removeClass'](this.editor.toolbarContainer, this.advToolbarClass)
			this.btn.getDom().innerHTML = (targetState == 'advance' ? this.advToolbarText : this.normalToolbarText) +'<b></b>';
			this.btn.getDom().title = '切换到 '+(targetState == 'advance' ? this.advToolbarText : this.normalToolbarText);
			this.curState = targetState;
			this.editor.tryIO('onAfterSwitchToolbar', function(ev){
				ev.fire(targetState == 'advance');
			});
			if(_ADV_CSS_LINK_URL && targetState == 'advance'){
				ve.dom.insertCSSLink(_ADV_CSS_LINK_URL);
				_ADV_CSS_LINK_URL = null;
			}
		}
	});
	ve.plugin.register('toolbarswitcher', VEditor.plugin.ToolbarSwitcher);
}) (VEditor);