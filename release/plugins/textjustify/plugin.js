(function(ve){
	ve.lang.Class('VEditor.plugin.TextJustify', {
		editor: null,
		helperTag: 'div',

		init: function(editor, url){
			var _this = this;
			this.editor = editor;
			this.addCommands();
			this.bindShortcuts();
			this.createControls();
		},

		/**
		 * 创建命令按钮
		 **/
		createControls: function(){
			var _this = this;
			var tm = this.editor.toolbarManager;
			tm.createButton('justifyleft', {title: '左对齐(ctrl+alt+l)', 'class': 'veJustifyLeft', cmd: 'justifyleft', onInit: function(){
				var _btn = this;
				_this.editor.onAfterUpdateVERangeLazy.add(function(){
					var align = _this.editor.querySelectionStyle('textAlign') || '';
					var act = align.toLowerCase() == 'left' ? 'setActive' : 'setUnActive';
					_btn[act]();
				});
			}});
			tm.createButton('justifycenter', {title: '居中对齐(ctrl+alt+c)', 'class': 'veJustifyCenter', cmd: 'justifycenter', onInit: function(){
				var _btn = this;
				_this.editor.onAfterUpdateVERangeLazy.add(function(){
					var align = _this.editor.querySelectionStyle('textAlign') || '';
					var act = align.toLowerCase() == 'center' ? 'setActive' : 'setUnActive';
					_btn[act]();
				});
			}});
			tm.createButton('justifyright', {title: '右对齐(ctrl+alt+r)', 'class': 'veJustifyRight', cmd: 'justifyright', onInit: function(){
				var _btn = this;
				_this.editor.onAfterUpdateVERangeLazy.add(function(){
					var align = _this.editor.querySelectionStyle('textAlign') || '';
					var act = align.toLowerCase() == 'right' ? 'setActive' : 'setUnActive';
					_btn[act]();
				});
			}});
			tm.createButton('justifyfull', {title: '默认对齐', 'class': 'veJustifyFull', cmd: 'justifyfull', onInit: function(){
				var _btn = this;
				_this.editor.onAfterUpdateVERangeLazy.add(function(){
					var align = _this.editor.querySelectionStyle('textAlign') || 'justify';
					align = align.toLowerCase();
					var act = (align == 'justify' || align == 'start') ? 'setActive' : 'setUnActive';
					_btn[act]();
				});
			}});
		},

		/**
		 * 添加文本操作的相关命令
		**/
		addCommands: function(){
			var _this = this;
			var TEXT_OP_HASH =  {
				'justifycenter': 'center',
				'justifyleft': 'left',
				'justifyright': 'right',
				'justifyfull': 'justify'
			};
			ve.lang.each(TEXT_OP_HASH, function(val, cmd){
				_this.editor.addCommand(cmd, function(){
					return _this.setTextAlign(val);
				});
			});
		},

		/**
		 * 绑定快捷键
		 **/
		bindShortcuts: function(){
			this.editor.addShortcut('ctrl+alt+l', 'justifyleft');
			this.editor.addShortcut('ctrl+alt+c', 'justifycenter');
			this.editor.addShortcut('ctrl+alt+r', 'justifyright');
		},

		/**
		 * 设置选取内容排列
		 * @param {String} align 取值：left,center,right,justifyfull
		 **/
		setTextAlign: function(align){
			var txt, bookmark,
				attr = {style:{'textAlign':align}},
				rng = this.editor.getVERange();

			if(!ve.dtd.$block[this.helperTag.toUpperCase()]){
				attr.style.display = 'block';
			}

			if(rng.collapsed){
				txt = this.editor.getDoc().createElement('span');
				rng.insertNode(txt);
			}

			bookmark = rng.createBookmark();
			_maxRng(rng, bookmark.start, bookmark.end);

			rng.setInlineAttr(this.helperTag, attr);
			rng.moveToBookmark(bookmark);

			if(txt){
				rng.setStartBefore(txt);
				rng.collapse(true);
				ve.dom.remove(txt);
			}
			rng.select();
		}
	});

	/**
	 * 移除重叠的节点
	 * @param {Range} rng
	 * @param  {DOM} node
	 * @return {DOM}
	 */
	var _clearParent = function(rng, node){
		var p = node.parentNode;

		if(p.tagName != node.tagName || node.nodeType != 1){
			return node;
		}

		var _childCount = 0;
		ve.lang.each(p.childNodes, function(node){
			if(!ve.isHelperNode(node) && !rng.isBookmarkNode(node)){
				_childCount++;
				if(_childCount>1){
					return true;
				}
			}
		});

		//设置parent span display block
		if(node.style.display == 'block'){
			ve.dom.getParent(node, function(p){
				if(p.tagName == 'span' && p.style.display != 'block'){
					p.style.display = 'block';
				}
				if(p.tagName != 'span'){
					return true;
				}
			});
		}

		if(_childCount == 1){
			ve.dom.setStyles(p, style);
			ve.dom.remove(node, true);
			return p;
		} else {
			return node;
		}
	};

	/**
	 * 检测边界终止点
	 * @param {DOM} n
	 **/
	var _stopFn = function(n){
		if(ve.dom.isBr(n) || ve.dom.isDisplayBlock(n)){
			return true;
		}
		return false;
	};

	/**
	 * 获取block元素
	 * @param   {DOM} node
	 * @param {String} ltr
	 * @param   {Function} stopFn
	 * @return  {Mix}
	 */
	var _getBlockIn = function(node, ltr, stopFn){
		if(node.childNodes.length){
			var found;
			if(ltr == 'nextSibling'){
				for(var i=0; i<node.childNodes.length; i++){
					found = _getBlockIn(node.childNodes[i], ltr, stopFn);
					if(found){
						return found;
					}
				}
			} else {
				for(var i=node.childNodes.length-1; i>=0; i--){
					found = _getBlockIn(node.childNodes[i], ltr, stopFn);
					if(found){
						return found;
					}
				}
			}
		} else {
			return stopFn(node) ? node : null;
		}
	};

	/**
	 * 扩散节点,在block或者br处终止扩散
	 * 该方法操作过后，实际需要做排版的区域应该是正确+唯一的
	 * @param {VERange} rng
	 * @param {DOM} start
	 * @param {DOM} end
	 **/
	var _maxRng = function(rng, start, end){
		var _start, _end;

		_start = _max(start, 'previousSibling', function(node){return _stopFn(node);});
		_end = _max(end, 'nextSibling', function(node){return _stopFn(node);});

		if(_start){
			while(_start.parentNode && _start.parentNode.lastChild === _start && !ve.dom.contains(_start.parentNode, start)){
				_start = _start.parentNode;
			}
			if(ve.dom.contains(_start, start)){
				rng.setStart(_start, 0);
			} else {
				rng.setStartAfter(_start);
			}
		}
		if(_end){
			//锁定 _end在_start同一级别
			var tmp = _end;
			while(tmp.lastChild){
				if(tmp.lastChild == _start.parentNode){
					rng.setEnd(_start.parentNode, _start.parentNode.childNodes.length);
					return;
				}
				tmp = tmp.lastChild;
			}

			while(_end.parentNode && _end.parentNode.firstChild === _end && !ve.dom.contains(_end.parentNode, end)){
				_end = _end.parentNode;
			}
			if(ve.dom.contains(_end, end)){
				rng.setEnd(_end, _end.childNodes.length);
			} else {
				rng.setEndBefore(_end);
			}
		}
	};

	/**
	 * 延伸节点
	 * @param   {DOM} node
	 * @param   {String} ltr
	 * @param   {Function} stopFn
	 * @return  {Mix}
	 */
	var _max = function(node, ltr, stopFn){
		var tmpNode = node, _blockNode;
		while(tmpNode){
			if(tmpNode[ltr]){
				if(stopFn(tmpNode[ltr])){
					return tmpNode[ltr];
				} else if(_blockNode = _getBlockIn(tmpNode[ltr], ltr, stopFn)){
					return _blockNode;
				} else {
					tmpNode = tmpNode[ltr];
				}
			}
			else if(tmpNode.parentNode){
				if(stopFn(tmpNode.parentNode)){
					return tmpNode.parentNode;
				}
				tmpNode = tmpNode.parentNode;
			}
			else {
				return null;
			}
		}
	};

	ve.plugin.register('textjustify', VEditor.plugin.TextJustify);
})(VEditor);

