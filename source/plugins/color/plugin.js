(function(ve) {
	var insertedCssLink;
	var _CUR_COLOR = '#000000';

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
	 * 前景色
	 */
	ve.lang.Class('VEditor.plugin.Color', {
		init: function (editor, url) {
			var _this = this,
				pickerUrl = ve.getAbsPath('resource/colorpicker/colorpicker.js'),
				pickerCss = ve.getAbsPath('resource/colorpicker/colorpicker.css'),
				colorPicker;

			this.editor = editor;
			this.addCommand();
			this.btn = this.editor.createButton('color', {
				'class': 'veForeColor',
				title: '设置文本颜色'
			});

			this.editor.onInitComplete.add(function(){
				var btnDom = _this.btn.getDom();
				btnDom.innerHTML = '<span class="veColorDropBtn_main"><span class="veColorDropBtn_color" style="background-color:'+_CUR_COLOR+'"></span></span>'+'<span class="veColorDropBtn_drop"></span>';

				var mBtn = btnDom.firstChild, lBtn = btnDom.lastChild;

				ve.dom.event.add(mBtn, 'mouseover', function(){ve.dom.addClass(btnDom, 'veColorDropBtn_hover_main');});
				ve.dom.event.add(mBtn, 'mouseout', function(){ve.dom.removeClass(btnDom, 'veColorDropBtn_hover_main');});
				ve.dom.event.add(mBtn, 'click', function(){_this.editor.editorcommands.execCommand('color', _CUR_COLOR);});

				ve.dom.event.add(lBtn, 'mouseover', function(){ve.dom.addClass(btnDom, 'veColorDropBtn_hover_drop');});
				ve.dom.event.add(lBtn, 'mouseout', function(){ve.dom.removeClass(btnDom, 'veColorDropBtn_hover_drop');});
				ve.dom.event.add(lBtn, 'click', function(){
					if(!colorPicker){
						loadColorPicker(pickerUrl, btnDom, _this.editor, function(color){
							_this.updateControlColor(color);
							_this.editor.editorcommands.execCommand('color', color);
						},
						function(picker){
							colorPicker = picker;
							colorPicker.show();
						}
						);
					} else {
						colorPicker.show();
					}
					if(!insertedCssLink){
						insertedCssLink = true;
						ve.dom.insertCSSLink(pickerCss);
					}
				});
			});
		},

		updateControlColor: function(color){
			_CUR_COLOR = color;
			ve.dom.setStyle(this.btn.getDom().firstChild.firstChild, 'backgroundColor', color);
		},

		addCommand: function(){
			var _this = this;
			_this.editor.addCommand('color', function(color){
				var key = 'color',
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
	ve.plugin.register('color', VEditor.plugin.Color);
})(VEditor);