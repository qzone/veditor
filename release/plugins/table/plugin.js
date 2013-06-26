(function(ve){
	ve.lang.Class('VEditor.plugin.Table', {
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
			this.btn = tm.createButton('table', {title: '表格', 'class': 'veTable', cmd:function(){
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
				'<div id="ed-insert-table-panel">',
					'<h4><span>插入表格</span></h4>',
					'<div id="ed-insert-symbol-panel-table">',
						'<div id="ed-insert-symbol-panel-tbody"><span class="cell">',(new Array(126)).join('</span><span class="cell">'), '</span></div>',
						'<input type="checkbox" value="" name=""/><label>粗外框</label> ',
						'<span id="table-info"></span>',
						'<input type="button" id="insert-table-btn" value="插入表格">',
					'</div>',
				'</div>'
			]).join('');

			if(!this.pop){
				this.pop = ve.ui.showSimplePopup(this.editor, node, {content: html, height:240, width:400});
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

		setupEvent: function(panel){
			var _this = this;
			ve.dom.event.add(ve.dom.get('ed-insert-symbol-panel-all'), 'click', function(ev){
				var tag = ve.dom.event.getTarget(ev);
				if(tag.tagName == 'SPAN'){
					_this.editor.insertHtml({content:tag.innerHTML});
				}
			});

			var COLS, ROWS;
			ve.dom.event.add(ve.dom.get('insert-table-btn'), 'click', function(){
				resetHightLightBox();
				_this.insertTable(ROWS, COLS);
				ROWS = COLS = 0;
				_this.hidePanel();
			});

			var d = $('ed-insert-symbol-panel-tbody');
			var reg = ve.dom.getRegion(d);
			var cells = $('ed-insert-symbol-panel-tbody').childNodes;
			var cellsM = [];
			var tm = 0;
			var _draging = false;

			for(var i=0; i<cells.length; i++){
				if(!cellsM[Math.floor(i/18)]){
					cellsM[Math.floor(i/18)] = [];
				}
				cellsM[Math.floor(i/18)].push(cells[i]);
			}

			var hightLightBox = function(col, row){
				COLS = col;
				ROWS = row;
				if(col>0 && row>0){
					for(var i=0; i<row; i++){
						for(var j=0; j<col; j++){
							ve.dom.addClass(cellsM[i][j], 'cell-hightlight');
						}
					}
				}
				ve.dom.get('table-info').innerHTML = col+' x ' + row;
			};

			var resetHightLightBox = function(){
				ve.lang.each(cells, function(cell){
					ve.dom.removeClass(cell, 'cell-hightlight');
				});
			};

			var paint = function(ev){
				var x = ve.dom.event.mouseX(ev);
				var y = ve.dom.event.mouseY(ev);
				var offset = {width: Math.max(0, x-reg.left-30),  height:Math.max(0, y-reg.top-142)};
				clearTimeout(tm);
				tm = setTimeout(function(){
					resetHightLightBox();
					hightLightBox(Math.ceil(offset.width / 20), Math.ceil(offset.height/20));
				}, 0);
			};

			ve.dom.event.add(d, 'mousedown', function(ev){
				_draging = true;
			});
			ve.dom.event.add(d, 'mousemove', function(ev){
				if(_draging){
					paint(ev);
				}
			});
			ve.dom.event.add(d, 'mouseup', function(ev){
				_draging = false;
				paint(ev);
			});
		},

		insertTable: function(rows, cols, option){
			var style = ' style="border-spacing:0; border-collapse:collapse; border:1px solid gray"';
			var html = '<table'+style+'><tbody>';
			for(var i=0; i<rows; i++){
				html += '<tr>';
				for(var j=0; j<cols; j++){
					html += '<td'+style+'>&nbsp;&nbsp;&nbsp;&nbsp;</td>';
				}
				html += '</tr>';
			}
			html += '</tbody></table>';
			this.editor.insertHtml({content:html});
		}
	});
	ve.plugin.register('table', VEditor.plugin.Table);
})(VEditor);