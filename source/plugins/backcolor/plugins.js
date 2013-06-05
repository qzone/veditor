(function(ve) {
	var insertedCssLink;

	function loadColorPicker(url, node, editor, onChangeColor, callback){
		var option = {
			defaultTab: 0,
			needFloat: true,
			realtime: false,
			cssText : ''
		};

		var handler = function(){
			var picker = new ColorPicker(node, onChangeColor, option);
			editor.onClick.add(function(){
				picker.hide();
			});

			editor.onBeforeOpenListBox.add(function(){
				picker.hide();
			});

			callback(picker);
		};

		if(window.ColorPicker){
			handler();
		} else {
			ve.net.loadScript(url, handler);
		}
	}

	/**
	 * 背景色
	 */
	ve.lang.Class('VEditor.plugin.BackColor', {
		init: function (editor, url) {
			var _this = this,
				pickerUrl = ve.getAbsPath('plugins/color/colorpicker.js'),
				pickerCss = ve.getAbsPath('plugins/color/colorpicker.css'),
				colorPicker;

			this.editor = editor;
			this.btn = this.editor.createButton('backcolor', {
				'class': 'veBackColor',
				title: '设置背景颜色',
				cmd: function(){
					if(!colorPicker){
						loadColorPicker(pickerUrl, _this.btn.getDom(), _this.editor, function(color){
							_this.editor.editorcommands.execCommand('BackColor', false, color);
						}, function(picker){
							colorPicker = picker;
							colorPicker.show();
						});
					} else {
						colorPicker.show();
					}
					if(!insertedCssLink){
						insertedCssLink = true;
						ve.dom.insertCSSLink(pickerCss);
					}
				}
			});
		},

		addCommand: function(){
			var _this = this;
			_this.editor.addCommand('BackColor', function(color){
				var key = 'backgroundColor',
				styleVal = color,
				rng = _this.editor.getVERange();

				if(!rng.collapsed){
					var attr = {style:{}};
					attr.style[key] = styleVal;
					rng.setInlineAttr('span', attr);
				} else {
					var curVal = _this.editor.querySelectionStyle(key);
					if(curVal != styleVal){
						var span = rng.doc.createElement('span');
						span.innerHTML = ve.blankChar;
						rng.insertNode(span);

						var node = ve.dom.fixNodeDupParent(span);

						node.style[key] = styleVal;
						rng.selectNodeContents(node);
						rng.collapse(true);
					}
				}
				rng.select();
			});
		}
	});
	ve.plugin.register('backcolor', VEditor.plugin.BackColor);
})(VEditor);