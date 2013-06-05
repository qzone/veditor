(function(ve){
	ve.lang.Class('VEditor.plugin.TextSymbol', {
		editor: null,
		btn: null,
		pop: null,

		init: function(editor){
			var _this = this;
			this.editor = editor;
			this.createControls();
			this.editor.onClick.add(function(){
				_this.hidePanel();
			});

			this.editor.onKeyDown.add(function(){
				_this.hidePanel();
			});
		},

		/**
		 * 创建命令按钮
		 **/
		createControls: function(){
			var _this = this;
			var tm = this.editor.toolbarManager;
			this.btn = tm.createButton('textsymbol', {title: '插入符号', 'class': 'veTextSymbol', cmd:function(){
				_this.showPanel();
			}});
		},

		hidePanel: function(){
			if(this.pop){
				this.pop.hide();
			}
		},

		showPanel: function(){
			var node = this.btn.getDom();
			var html = ([
				'<div id="ed-insert-symbol-panel">',
					'<h4><span class="cur">插入符号</span></h4>',
					'<div id="ed-insert-symbol-panel-all"></div>',
				'</div>'
			]).join('');

			if(!this.pop){
				this.pop = ve.ui.showSimplePopup(this.editor, node, {content: html, height:240, width:400});
				var html = '';
				ve.lang.each(this.getSymbolList(), function(list, cap){
					html += '<p>'+cap+'</p>';
					html += '<span>'+ list.join('</span><span>') + '</span>';
				});
				ve.dom.get('ed-insert-symbol-panel-all').innerHTML = html;
				this.setupEvent(this.pop.getDom());
			}
			this.pop.show();

			var region = ve.dom.getRegion(node);
			var config = {left:region.left, top:region.top+region.height};

			//避免iframe遮蔽
			var editorWidth = ve.dom.getSize(this.editor.iframeContainer)[0];
			var editorLeft = ve.dom.getXY(this.editor.iframeContainer)[0];
			var popWidth = ve.dom.getSize(this.pop.getDom())[0];

			if((editorWidth - (config.left - editorLeft)) < popWidth){
				config.left = editorLeft + editorWidth - popWidth;
			}
			this.pop.show(config);
		},

		getSymbolList: function(){
			var result = {}, item = [];

			result['基本拉丁语'] = _genRng(0x0040, 0x007F);
			result['拉丁语-1 增补'] = _genRng(0x0080, 0x00FF);
			result['拉丁语扩充-A'] = _genRng(0x0100, 0x017F);
			result['拉丁语扩充-B'] = _genRng(0x0180, 0x024F);
			result['国际音标扩充'] = _genRng(0x0250, 0x02AF);
			result['进格的修饰字符'] = _genRng(0x1D00, 0x1D7F);

			result['广义标点'] = _genRng(0x2010, 0x2030);
			result['类字符符号'] = _genRng(0x2100, 0x214F);
			result['带括号的字母数字'] = _genRng(0x2460, 0x24FF);
			result['全角拉丁语'] = _genRng(0xFF00, 0xFFEF);

			result['表格'] = _genRng(0x2500, 0x257F);
			result['方格元素'] = _genRng(0x2581, 0x2595);
			result['几何图形符'] = _genRng(0x25A0, 0x25E5);
			result['几何图形符'] = _genRng(0x25A0, 0x25E5);
			result['其他符号'] = _genRng(0x2605, 0x2642);
			result['汉语符号'] = _genRng(0xFE10, 0xFE5E);

			return result;
		},

		setupEvent: function(panel){
			var _this = this;
			ve.dom.event.add(ve.dom.get('ed-insert-symbol-panel-all'), 'click', function(ev){
				var tag = ve.dom.event.getTarget(ev);
				if(tag.tagName == 'SPAN'){
					_this.editor.insertHtml({content:tag.innerHTML});
				}
			});
		}
	});

	var _genRng = function(min, max){
		var item = [];
		for(var i=min; i<max; i++){
			item.push('&#x'+strPad(Number(i).toString(16)+'')+';');
		}
		return item;
	};

	var strPad = function(str){
		if(str.length == 1){
			return '0' + str;
		}
		return str;
	};

	ve.plugin.register('textsymbol', VEditor.plugin.TextSymbol);
})(VEditor);