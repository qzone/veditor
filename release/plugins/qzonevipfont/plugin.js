/**
 * 插入文档插件
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.QzoneVipFont', {
		editor: null,
		isVip: !!QZONE.FP.getBitMapFlag(27),
		selectListFontEotSrc: '/qzonestyle/act/font/eot/SELECT0.eot',
		selectListFontTTFSrc: '/qzonestyle/act/font/ttf/selectf.ttf',
		specialFontList: [
			{
				id: 'dou',
				name: '豆豆体',
				classPrefix: 'qzone_font_dou',
				eotSrc: '/qzonestyle/act/font/eot/TCDOU0.eot',
				ttfSrc: ''
			},
			{
				id: 'tao',
				name: '桃心体',
				classPrefix: 'qzone_font_tao',
				eotSrc: '/qzonestyle/act/font/eot/TCLOVE0.eot',
				ttfSrc: ''
			},
			{
				id: 'xiaohua',
				name: '小花体',
				classPrefix: 'qzone_font_xiaohua',
				eotSrc: '/qzonestyle/act/font/eot/TCHUAYU0.eot',
				ttfSrc: ''
			},
			{
				id: 'qingxiu',
				name: '清秀体',
				classPrefix: 'qzone_font_qingxiu',
				eotSrc: '/qzonestyle/act/font/eot/TCQINGX0.eot',
				ttfSrc: ''
			},
			{
				id: 'huajuan',
				name: '花卷体',
				classPrefix: 'qzone_font_huajuan',
				eotSrc: '/qzonestyle/act/font/eot/TCHUAJU0.eot',
				ttfSrc: ''
			},
			{
				id: 'fountainpen',
				name: '钢笔体',
				classPrefix: 'qzone_font_pen',
				eotSrc: '/qzonestyle/act/font/eot/TCGANGB0.eot',
				ttfSrc: ''
			}
		],

		init: function (editor, url) {
			this.editor = editor;
			var _this = this;
			this.editor.onInitComplete.add(function(){
				fontList = _this.editor.toolbarManager.getUIControlFromCollection('fontname');
				for(var i=0; i<_this.specialFontList.length; i++){
					var key = _this.specialFontList[i].id;
					var name = _this.specialFontList[i].name;
					fontList.addItem({
						item: [key,name+'<img src="/ac/b.gif" class="icon_vip_yl_s"/>', 'style=\"font-family:sefont\"'],
						pos:'last'
					});
				}
			});

			//绑定特殊字体命令
			this.editor.onAfterExecCommand.add(function(cmd, ui, val){
				if(cmd == 'FontName'){
					for(var i=0; i<_this.specialFontList.length; i++){
						if(_this.specialFontList[i].id == val){
							_this.loadFontSource(_this.specialFontList[i]);
							return;
						}
					}
				}
			});

			//填充内容检测特殊字体
			this.editor.onSetContent.add(function(str){
				var fontObjList = _this.getSpecialFontListFromStr(str);
				for(var i=0; i<fontObjList.length; i++){
					_this.loadFontSource(fontObjList[i]);
				}
			});

			//菜单字体着色
			if(ve.ua.ie){
				this.insertStyleSheet('pagestyle',  '@font-face { font-family: sefont; font-style: normal;font-weight: normal;src: url('+this.selectListFontEotSrc+');}');
			} else {
				this.insertStyleSheet(null,'@font-face {font-style: normal; font-weight: normal; font-family: sefont; src: url('+this.selectListFontTTFSrc+') format("opentype");}');
			}
		},

		/**
		 * 从字符串里面识别特殊字体
		 * @param  {string} strHtml
		 * @return {array}
		 */
		getSpecialFontListFromStr: function(strHtml){
			var arr = [];
			var _this = this;
			strHtml = strHtml.replace(/<(font|span)([^>]+)>/ig, function(){
				var res = /face=("|)([^"\s]+)("|)/.exec(arguments[2]);
				if(res && res[2]) {
					for(var i=0; i<_this.specialFontList.length; i++){
						if(res[2].indexOf(_this.specialFontList[i].id) != -1){
							arr.push(_this.specialFontList[i]);
						}
					}
				}
				return arguments[0];
			});

			strHtml = strHtml.replace(/<(div|span)([^>]+)>/ig, function() {
				var res = /font-family:([^;^"]+)/ig.exec(arguments[2]);
				if(res && res[1]) {
					for(var i=0; i<_this.specialFontList.length; i++){
						if(res[1].indexOf(_this.specialFontList[i].id) != -1){
							arr.push(_this.specialFontList[i]);
						}
					}
				}
				return arguments[0];
			});

			var result = [], found = false;
			for(var i=0; i<arr.length; i++){
				found = false;
				for(var j=0; j<result.length; j++){
					if(result[j].id == arr[i].id){
						found = true;
						break;
					}
				}
				if(!found){
					result.push(arr[i]);
				}
			}
			return result;
		},

		/**
		 * 加载字体资源
		 * @param  {object}   fontObj   字体
		 * @param  {Function} callback 回调
		 */
		loadFontSource: function(fontObj, callback){
			var doc = this.editor.getDoc();
			var _this = this;
			if(!ve.ua.ie){
				this.editor.showStatusbar('<a target="_blank" class="unline c_tx" href="http://qzone.qq.com/helpcenter/yellow_info.htm?56">个性字体</a>仅在IE浏览器下才可查看效果，请更换浏览器或选择其它字体。');
			} else if(!this.isVip){
				this.editor.showStatusbar('个性字体仅限黄钻用户使用，普通用户发表日志后无法显示个性效果。\
					<a class="unline c_tx" href="http://pay.qq.com/qzone/index.shtml?aid=zone.font" target="_blank">加入黄钻贵族</a>\
					<a target="_blank" class="unline c_tx" href="http://qzone.qq.com/helpcenter/yellow_info.htm?56" target="_blank">个性字体使用帮助</a>');
			} else {
				this.editor.showStatusbar('正在加载个性字体...', 4);
			}
			var id = 'pagestyle_qzone_vip_font'+fontObj.id;
			if(doc.getElementById(id)){
				return;
			}

			//插入样式到编辑器和页面
			var rules = '@font-face { font-family: '+fontObj.id+'; font-style: normal;font-weight: normal;src: url('+fontObj.eotSrc+');}';
			setTimeout(function(){
				_this.insertStyleSheet(id, rules, doc);			//到编辑器iframe页面
			}, 50);
		},

		/**
		 * 插入关联样式
		 * @param {String} sheetId
		 * @param {String} rules
		 * @param {DOM} doc
		 */
		insertStyleSheet: function(sheetId, rules, doc){
			doc = doc || document;
			var styleNode = doc.getElementById(sheetId);
			if(!styleNode){
				var styleNode = doc.createElement("style");
					styleNode.type = 'text/css';
				if(sheetId){
					styleNode.id = sheetId;
				}
				doc.getElementsByTagName("head")[0].appendChild(styleNode);
			}
			var sheet = styleNode.sheet || doc.styleSheets[sheetId];

			if(ve.ua.ie) {
				sheet.cssText += rules;
			} else {
				sheet.insertRule(rules, 0);
			}
            return styleNode.sheet || styleNode;
		}
	});
	ve.plugin.register('qzonevipfont', ve.plugin.QzoneVipFont);
})(VEditor);