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
	 * 发光字体
	 */
	ve.lang.Class('VEditor.plugin.GlowFont', {
		init: function (editor, url) {
			var _this = this,
				pickerUrl = ve.getAbsPath('resource/colorpicker/colorpicker.js'),
				pickerCss = ve.getAbsPath('resource/colorpicker/colorpicker.css'),
				colorPicker;
			this.editor = editor;

			this.btn = _this.editor.createButton('glowfont', {
				'class': 'veGlowFont',
				title: '设置发光字体',
				cmd: function(){
					if(!colorPicker){
						loadColorPicker(pickerUrl, _this.btn.getDom(), _this.editor, function(color){
								_this.editor.editorcommands.execCommand('glowfont', color);
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

			this.addCommand();

			//这里将glowfont属性直接替换进入span.style属性
			//做这步的原因是cssText不支持使用js写入浏览器不支持的属性
			_this.editor.onGetContent.add(function(html){
				var str = html.replace(/<span([^>]+)>/ig,function(){
					try {
						var match = arguments[1];
						if(/glowfont=/i.test(match)) {
							var tmp = /glowfont="([^"]+)"/i.exec(match);
							var glowFontCss = tmp[1] || '';
							if(glowFontCss){
								match = match.replace(/\bglowfont="([^"]+)"/i, function(){
									return '';
								});
								if(/style=/i.test(match)){
									var rp = /style="([^"]+)"/i.exec(match);
									if(rp[1]){
										rp[1] = _removeStyle(rp[1], ['display', 'filter', 'color', 'text-shadow']);
										match = ' style="'+(rp[1] ? rp[1]+';': '')+glowFontCss + '" ';
									}
								} else {
									return '<span'+match + ' style="'+glowFontCss+'">';
								}
							}
						}
						return '<span'+match+'>';
					} catch(ex){
						return arguments[0];
					}
				});
				return str || html;
			}, true);
		},

		addCommand: function(){
			var _this = this;
			this.editor.addCommand('glowfont', function(color){
				var ed = _this.editor;
				var cssText = 'display:inline-block; '+
					'color:white; '+
					'text-shadow:'+'1px 0 4px '+color+',0 1px 4px '+color+',0 -1px 4px '+color+',-1px 0 4px '+color+';'+
					'filter:glow(color='+color+',strength=3)';
				var rng = ed.getVERange();
				if(rng.startContainer === rng.endContainer &&
					rng.startContainer.tagName != 'BODY' &&
					ve.dtd.$empty[rng.startContainer.tagName]){
					//return;
				} else if(!rng.collapsed){
					rng.setInlineAttr('span', {style:cssText, glowfont:cssText});
					rng.collapse();
					rng.select();
				} else {
					ed.showStatusbar('您需要选中文字之后再设定发光字', 3);
				}
			});
		}
	});
	ve.plugin.register('glowfont', VEditor.plugin.GlowFont);

	/**
	 * 移除样式
	 * @param  {String} str   样式style
	 * @param  {Array} finds 需要去除的样式name
	 * @return {String}
	 */
	var _removeStyle = function(str, finds){
		str = ';' + str + ';';
		ve.lang.each(finds, function(key){
			var reg = new RegExp(';\\s*'+key+'\\s*:[^;]+;', 'ig');
			str = str.replace(reg, ';');
		});
		return str.replace(/^\s*;\s*/g, '').replace(/\s*;\s*$/g,'');
	};
}) (VEditor);