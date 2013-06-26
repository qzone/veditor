(function(ve) {
	/**
	 * 字体
	 */
	ve.lang.Class('VEditor.plugin.Font', {
		editor:null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.addCommands();
			this.bindShortcuts();
			this.createFontNameControl('fontname');
			this.createFontSizeControl('fontsize');
			this.createFontStyleControls();
		},

		bindShortcuts: function(){
			this.editor.addShortcut('ctrl+b', 'Bold');
			this.editor.addShortcut('ctrl+i', 'Italic');
			this.editor.addShortcut('ctrl+u', 'Underline');
		},

		/**
		 * 添加字体操作的相关命令
		 **/
		addCommands: function(){
			var _this = this;
			var FONT_OP_HASH = {
				'FontName': ['fontFamily'],
				'FontSize': ['fontSize'],

				'Bold': ['fontWeight', 'bold'],
				'UnBold': ['fontWeight', 'normal'],
				'Italic': ['fontStyle', 'italic'],
				'UnItalic': ['fontStyle', 'normal'],
				'Underline': ['textDecoration', 'underline'],
				'UnUnderline': ['textDecoration', 'none']
			};

			ve.lang.each(FONT_OP_HASH, function(item, cmd){
				_this.editor.addCommand(cmd, function(ui, val){
					var key = item[0],
					styleVal = val || item[1],
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
			});
		},

		createFontNameControl: function(id){
			var _this = this;
			var listBox = this.editor.toolbarManager.createListBox(id, {
				title: '选择字体',
				'class': 'FontName',
				cmd: 'FontName',
				onInit: function(){
					var curList = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						var fontFamily = _this.editor.querySelectionStyle('fontFamily');
						if(fontFamily){
							fontFamily = fontFamily.indexOf('楷体') >= 0 ? '楷体,楷体_GB2312' : fontFamily;
							fontFamily = fontFamily.indexOf('仿宋') >= 0 ? '仿宋,仿宋_GB2312' : fontFamily;
						}
						curList.updateCurrentState(fontFamily);
					});
				},
				onChange: function(val){
					var curList = this;
					_this.editor.editorcommands.execCommand(curList.conf.cmd, curList.conf.ui, val);
				},
				items: [
					['宋体','宋体', 'style=\"font-family:Simson\"'],
					['黑体','黑体', 'style=\"font-family:Simhei\"'],
					['仿宋,仿宋_GB2312','仿宋', 'style=\"font-family:仿宋,仿宋_GB2312\"'],
					['楷体,楷体_GB2312', '楷体', 'style=\"font-family:楷体,楷体_GB2312\"'],
					['隶书','隶书', 'style=\"font-family:隶书\"'],
					['微软雅黑','微软雅黑', 'style=\"font-family:Microsoft Yahei\"'],
					['幼圆','幼圆', 'style=\"font-family:幼圆\"'],
					['Arial','Arial', 'style=\"font-family:Arial\"'],
					['Calibri','Calibri', 'style=\"font-family:Calibri\"'],
					['Tahoma','Tahoma', 'style=\"font-family:Tahoma\"'],
					['Helvetica','Helvetica', 'style=\"font-family:Helvetica\"'],
					['Verdana','Verdana', 'style=\"font-family:Verdana\"']
				]
			});
			return listBox;
		},

		createFontSizeControl: function(id){
			var _this = this;
			this.editor.toolbarManager.createListBox('fontsize', {
				title: '选择字号',
				'class': 'FontSize',
				cmd: 'FontSize',
				onInit: function(){
					var curList = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						var fontSize = _this.editor.querySelectionStyle('fontSize');
						curList.updateCurrentState(fontSize);
					});
				},
				onChange: function(val){
					_this.editor.editorcommands.execCommand(this.conf.cmd, this.conf.ui, val);
				},
				items: [
				['10px','7(10px)', 'style=\"font-size:10px\"', null, 'padding-top:0px'],
				['12px','6(12px)', 'style=\"font-size:12px\"', null, 'padding-top:0px'],
				['14px','5(14px)', 'style=\"font-size:14px\"', null, 'padding-top:0px'],
				['16px','4(16px)', 'style=\"font-size:16px\"', null, 'padding-top:2px'],
				['18px','3(18px)', 'style=\"font-size:18px\"', null, 'padding-top:5px'],
				['24px','2(24px)', 'style=\"font-size:24px\"', null, 'padding-top:8px'],
				['36px','1(36px)', 'style=\"font-size:36px\"', null, 'padding-top:18px']
				]
			})
		},

		createFontStyleControls: function(){
			var _this = this;
			this.editor.toolbarManager.createButton('bold', {title: '加粗(ctrl+b)', 'class': 'veBold',
				onInit: function(){
					var _curControl = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						//这里的fontweight有可能有用数值的情况
						var fontWeight = _this.editor.querySelectionStyle('fontWeight') || '';
						var act;
						if(parseInt(fontWeight, 10)){
							act = fontWeight > 400 ? 'setActive' : 'setUnActive';
						} else {
							act = fontWeight.toLowerCase().indexOf('bold')>=0 ? 'setActive' : 'setUnActive';
						}
						_curControl[act]();
					});
				},
				onClick: function(){
					var cmd = this.toggleActive() ? 'Bold' : 'UnBold';
					_this.editor.editorcommands.execCommand(cmd);
				}
			});

			this.editor.toolbarManager.createButton('italic', {title: '斜体(ctrl+i)', 'class': 'veItalic',
				onInit: function(){
					var _curControl = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						var fontStyle = _this.editor.querySelectionStyle('fontStyle') || '';
						var act = fontStyle.toLowerCase().indexOf('italic')>=0 ? 'setActive' : 'setUnActive';
						_curControl[act]();
					});
				},
				onClick: function(){
					var cmd = this.toggleActive() ? 'Italic' : 'UnItalic';
					_this.editor.editorcommands.execCommand(cmd);
				}
			});

			this.editor.toolbarManager.createButton('underline', {title: '下划线(ctrl+u)', 'class': 'veUnderline',
				onInit: function(){
					var _curControl = this;
					_this.editor.onAfterUpdateVERangeLazy.add(function(){
						var underline = _this.editor.querySelectionStyle('textDecoration') || '';
						var act = underline.toLowerCase().indexOf('underline')>=0 ? 'setActive' : 'setUnActive';
						_curControl[act]();
					});
				},
				onClick: function(){
					var cmd = this.toggleActive() ? 'Underline' : 'UnUnderline';
					_this.editor.editorcommands.execCommand(cmd);
				}
			});
		}
	});
	ve.plugin.register('font', VEditor.plugin.Font);
})(VEditor);