(function(ve) {
	//样式过滤对象规则
	var STYLE_FILTE_KEYS = ['class="blog_music"','class="blog_music_multiple"','class="blog_video"'];

	/**
	 * 一键排版
	 */
	ve.lang.Class('VEditor.plugin.AutoComposing', {
		editor:null,
		btn : null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			this.btn = editor.toolbarManager.createButton('midCompoing', {
				title: '一键美化排版',
				'class': 'veComposingMiddle',
				"cmd" : function(){_this.composing("middle");}
			});
		},

		processStrByReg: function(str, regItems, onMatch){
			var _this = this;
			for(var i=0; i<regItems.length; i++){
				var v = regItems[i];
				if (v.constructor == RegExp){
					str = str.replace(v, function(){
						if(onMatch){
							return onMatch.apply(_this, arguments);
						}
						return '';
					});
				} else {
					str = str.replace(v[0], function(){
						if(onMatch){
							var arg = arguments;
							return onMatch.apply(_this, arg);
						}
						return arguments[v[1].substring(1)];
					});
				}
			}
			return str;
		},

		clearDom : function(){
			var shell = ve.dom.selector('.autoComposing',this.editor.getBody());
			for(var i = 0;i < shell.length;i ++){
				ve.dom.remove(shell[i],true)
			}
		},

		checkKeyWord : function(str){
			var result = false;
			ve.lang.each(STYLE_FILTE_KEYS, function(key){
				if(str.indexOf(key) >= 0){
					result = true;
					return false;
				}
			});
			return result;
		},

		composing : function(key){
			var _this = this;
			var _width = ve.dom.getSize(_this.editor.getBody())[0];
			var str = _this.editor.getBody().innerHTML;
			//dom清理
			_this.clearDom();
			//属性清理
			str = _this.processStrByReg(str, [[/<(\w+)\s+([^>]+)>/gi]], function(){
				var args = ve.lang.arg2Arr(arguments);
				return _this.onAttrMatch.apply(this, args);
			});
			if(key == "middle"){
				var oriHTML = str;
				var targetHTML = '<div class="autoComposing middle" style="text-align:left;margin:auto;padding:0px 22px 0px 22px;">' + oriHTML + '</div>';
				_this.editor.setContent({content:targetHTML,addHistory:true});
			}
		},

		onAttrMatch: function(match, tag, attrStr){
			var _this = this;
			if(!(_this.checkKeyWord(match))){
				match = match.replace(/style="[^"]*"/i,function(){
					var result = '';
					var _tag = tag.toUpperCase();
					if(_tag == 'I'){
						result = 'style="font-style:normal"';
					}else if(_tag == 'B' || _tag == "STRONG"){
						result = 'style="font-weight:normal"';
					}else if(_tag == 'CENTER'){
					}
					return result;
				});
			}
			if(tag.toUpperCase() == "IMG"){
				if(!isEM(match)){
					match = [
						'<div style="text-align:center">',match,'</div>'
					].join("");
				}
			}
			return match;
		}
	});
	ve.plugin.register('autocomposing', VEditor.plugin.AutoComposing);

	var isEM = function(img){
		var src = /src="([^"]+)"/.exec(img);
		if(src && src[0] && /\/qzone\/em\/[^\"]*/i.test(src[0])){
			return true;
		}
		return false;
	};
})(VEditor);