/**
 * 列表
 */
(function(ve){
	var POS_LEFT = -1,
		POS_MID = 0,
		POS_RIGHT = 1;

	ve.lang.Class('VEditor.plugin.List', {
		editor: null,
		init: function (editor, url) {
			this.editor = editor;
			this.addUIControls();
			this.bindEnterEvent();
		},

		/**
		 * 绑定回车事件
		 **/
		bindEnterEvent: function(){
			var _this = this;
			this.editor.onKeyDown.addFirst(function(e){
				if(e.keyCode == 13 && !e.shiftKey){
					if(_this._handerEnter(e)){
						ve.dom.event.preventDefault(e);
						return false;
					}
				}
			});
			this.editor.onClick.add(function(e){
				var rng = _this.editor.getVERange();
				if((rng.startContainer.tagName == 'UL' || rng.startContainer.tagName == 'OL')){
					rng.startContainer = rng.startContainer.lastChild;
					rng.startOffset = 0;
					rng.collapse(true);
				}
			});
		},

		/**
		 * 处理回车事件
		 * 如果检测到是list需要处理的enter，返回true
		 * @return {Boolean}
		 **/
		_handerEnter: function(){
			var rng = this.editor.getVERange();
			var sc, start, cursorPos;
			var tempSpan = rng.doc.createElement('span');

			if(!this._inList(rng)){
				return;
			}

			this.editor.tryIO('addHistory', function(fn){return fn()});
			if(!rng.collapsed){
				rng.deleteContents();
			}

			var liNode = this.editor.getDoc().createElement('LI');
			var con = this._inList(rng);
			if(!con){
				console.log('处理失败');
				return;
			}

			var bookmark = rng.createBookmark();
			var tmpRng = rng.cloneRange();
			tmpRng.setStartAfter(bookmark.start);
			if(con.childNodes.length > 0){
				tmpRng.setEndAfter(con.childNodes[con.childNodes.length-1]);
			}else{
				tmpRng.setEndAfter(bookmark.start);
			}
			var frag = tmpRng.extractContents();
			if(this.isEmptyNode(frag) || this.isTagNode(frag,'li') || !frag.lastChild.innerHTML){
				tempSpan.innerHTML = '&nbsp;';
				frag.appendChild(tempSpan);
			}
			liNode.appendChild(frag);
			if(this.isEmptyNode(con) || (this.isEmptyNode(con.lastChild) && this.isTagNode(con.lastChild,'span')) || !con.lastChild.innerHTML){
				tempSpan.innerHTML = '&nbsp;';
				con.appendChild(tempSpan);
			}
			ve.dom.insertAfter(liNode, con);
			if(liNode.firstChild){
				rng.setStartBefore(liNode.firstChild);
			}else{
				rng.setStartBefore(liNode);
			}
			rng.collapse(true);
			rng.select();
			return true;
		},

		/**
		 * 检测range包含list
		 **/
		_inList: function(rng){
			var start, end, sc = rng.startContainer,ec = rng.endContainer;
			if(rng.collapsed){
				start = this.findParentByTagName(sc, 'li', true);
			} else {
				end = this.findParentByTagName(ec, 'li', true);
			}
			return start || end;
		},
		
		/**
		 * insertOrDelList插入列表逻辑
		 * @param command string 区分有序还是无序列表
		 * @param style 待扩展功能，设置列表样式
		 *
		 **/
		insertOrDelList: function(command, style){
			if (!style) {
				style = command.toLowerCase() == 'insertorderedlist' ? 'decimal' : 'disc';
			}
			var child,
				filterFn = function (node) {
					return   node.nodeType == 1 ? node.tagName.toLowerCase() != 'br' : (new RegExp('[^ \t\n\r' + this.fillChar + ']').test(node.nodeValue));
				},	//过滤br 及包含制表符，换行，回车和填充字符的元素
				tag = command.toLowerCase() == 'insertorderedlist' ? 'ol' : 'ul',
				veRange = this.editor.getVERange(),
				frag = veRange.doc.createDocumentFragment();
			
			// 不再转换的元素
			var notExchange = {
					'TD':1,
					'PRE':1,
					'BLOCKQUOTE':1
				};
			
			//调整Range边界
            if (!veRange.collapsed) {
                while (!this.isBody(veRange.startContainer) &&
                    veRange.startOffset == veRange.startContainer[veRange.startContainer.nodeType == 3 ? 'nodeValue' : 'childNodes'].length
                    ) {
                    veRange.setStartAfter(veRange.startContainer);
                }
                while (!this.isBody(veRange.endContainer) && !veRange.endOffset) {
                    veRange.setEndBefore(veRange.endContainer);
                }
            }

            while (veRange.startContainer.nodeType == 1 //是element
                && (child = veRange.startContainer.childNodes[veRange.startOffset]) //子节点也是element
                && child.nodeType == 1 
				&& !veRange.isBookmarkNode(child) 
				&& !ve.dtd.$empty[child.tagName] 
				&& !ve.dtd.$nonChild[child.tagName]) {

                veRange.setStart(child, 0);
            }
			
            if (veRange.collapsed) {
				veRange.collapse(true);
            }else{
				while (veRange.endContainer.nodeType == 1//是element
						&& veRange.endOffset > 0 //如果是空元素就退出 endOffset=0那么endOffst-1为负值，childNodes[endOffset]报错
						&& (child = veRange.endContainer.childNodes[veRange.endOffset - 1]) //子节点也是element
						&& child.nodeType == 1 
						&& !veRange.isBookmarkNode(child) 
						&& !ve.dtd.$empty[child.tagName] 
						&& !ve.dtd.$nonChild[child.tagName]) {

					veRange.setEnd(child, child.childNodes.length);
				}
			}
			var bko = veRange.createBookmark(true),
				start = this.findParentByTagName(veRange.doc.getElementById(bko.start), 'li'),
				modifyStart = 0,
				end = this.findParentByTagName(veRange.doc.getElementById(bko.end), 'li'),
				modifyEnd = 0,
				startParent, endParent,
				list, tmp;
			
			/**
			 * 选区父节点中包括列表li元素的情况
			 */
			if (start || end) {
				start && (startParent = start.parentNode);
				if (!bko.end) {
					end = start;
				}
				end && (endParent = end.parentNode);

				//处于同一个ul || ol节点下
				if (startParent === endParent) {
					while (start !== end) {
						tmp = start;
						start = start.nextSibling || null;
						
						if (!ve.dom.isBlock(tmp.firstChild) && tmp.lastChild && tmp.lastChild.nodeName.toLowerCase() !== 'br') {

							tmp.appendChild(veRange.doc.createElement('br')); //为li下的非块元素添加换行
						}
						frag.appendChild(tmp);
						if(!start){
							break;
						}
					}
					
					tmp = veRange.doc.createElement('span');
					startParent.insertBefore(tmp, end);
					
					if (!ve.dom.isBlock(end.firstChild) && end.lastChild && end.lastChild.nodeName.toLowerCase() !== 'br') {

						end.appendChild(veRange.doc.createElement('br')); //为li下的非块元素添加换行
					}
					
					frag.appendChild(end);
					veRange.breakParent(tmp, startParent);
					
					if (this.isEmptyNode(tmp.previousSibling)) {
						ve.dom.remove(tmp.previousSibling);
					}
					if (this.isEmptyNode(tmp.nextSibling)) {
						ve.dom.remove(tmp.nextSibling)
					}
					
					var nodeStyle = ve.dom.getStyle(startParent, 'list-style-type') || (command.toLowerCase() == 'insertorderedlist' ? 'decimal' : 'disc');
					
					if (startParent.tagName.toLowerCase() == tag && nodeStyle == style) {
						for (var i = 0, ci, tmpFrag = veRange.doc.createDocumentFragment(); ci = frag.childNodes[i++];) {
							if(this.isTagNode(ci,'ol ul')){
								ve.lang.each(ci.getElementsByTagName('li'),function(li){
									while(li.firstChild){
										tmpFrag.appendChild(li.firstChild);
									}
								});
							}else{
								while (ci.firstChild) {
									tmpFrag.appendChild(ci.firstChild);
								}
							}
						}
						tmp.parentNode.insertBefore(tmpFrag, tmp);
						
					} else {
						list = veRange.doc.createElement(tag);
						list.style['list-style-type'] = style;
						list.appendChild(frag);
						tmp.parentNode.insertBefore(list, tmp);
					}

					ve.dom.remove(tmp);
					list && this.adjustList(list, tag, style);
					veRange.moveToBookmark(bko).select();
					return;
				}
				//开始
				if (start) {
					while (start) {
						tmp = start.nextSibling;
						if (this.isTagNode(start, 'ol ul')) {
							frag.appendChild(start);
						} else {
							var tmpfrag = veRange.doc.createDocumentFragment(),
								hasBlock = 0;
							while (start.firstChild) {
								if (ve.dom.isBlock(start.firstChild)) {
									hasBlock = 1;
								}
								tmpfrag.appendChild(start.firstChild);
							}
							frag.appendChild(tmpfrag);
							
							if (!hasBlock) {
								frag.appendChild(veRange.doc.createElement('br'));
							}
							ve.dom.remove(start);
						}
						start = tmp;
					}
					startParent.parentNode.insertBefore(frag, startParent.nextSibling);
					if (this.isEmptyNode(startParent)) {
						veRange.setStartBefore(startParent);
						ve.dom.remove(startParent);
					} else {
						veRange.setStartAfter(startParent);
					}
					modifyStart = 1;
				}

				if (end && ve.dom.getNodeRelexPosition(endParent, veRange.doc) == 10 ) {	//10 veRange.doc是endParent的祖先节点
					//结束 
					start = endParent.firstChild;
					while (start && start !== end) {
						tmp = start.nextSibling;
						if (this.isTagNode(start, 'ol ul')) {
							frag.appendChild(start);
						} else {
							tmpfrag = veRange.doc.createDocumentFragment();
							hasBlock = 0;
							while (start.firstChild) {
								if (ve.dom.isBlock(start.firstChild)) {
									hasBlock = 1;
								}
								tmpfrag.appendChild(start.firstChild);
							}
							frag.appendChild(tmpfrag);
							
							if (!hasBlock) {
								frag.appendChild(veRange.doc.createElement('br'));
							}
							ve.dom.remove(start);
						}
						start = tmp;
					}

					this.moveChild(end, frag);

					frag.appendChild(veRange.doc.createElement('br'));
					ve.dom.remove(end);
					endParent.parentNode.insertBefore(frag, endParent);
					veRange.setEndBefore(endParent);
					if (this.isEmptyNode(endParent)) {
						ve.dom.remove(endParent);
					}
					modifyEnd = 1;
				}
			}
			
			if (!modifyStart) {
				veRange.setStartBefore(veRange.doc.getElementById(bko.start));
			}
			if (bko.end && !modifyEnd) {
				veRange.setEndAfter(veRange.doc.getElementById(bko.end));
			}
			this.enlarge(veRange, true, function (node) {
				return notExchange[node.tagName];
			});

			frag = veRange.doc.createDocumentFragment();

			var bk = veRange.createBookmark(),
				current = ve.dom.getNextDomNode(bk.start, false, filterFn),
				tmpRange = veRange.cloneRange(),
				tmpNode;

			while (current && current !== bk.end && (ve.dom.getNodeRelexPosition(current, bk.end) & 4)) {	//位置关系为4||20 current的祖先节点为bk.end的祖先节点的前置节点或current为bk.end的祖先节点

				if (current.nodeType == 3 || ve.dtd.li[current.tagName]) {
					if (current.nodeType == 1 && ve.dtd.$list[current.tagName]) {
						while (current.firstChild) {
							frag.appendChild(current.firstChild);
						}
						tmpNode = ve.dom.getNextDomNode(current, false, filterFn);
						ve.dom.remove(current);
						current = tmpNode;
						continue;
					}
					
					tmpNode = current;
					tmpRange.setStartBefore(current);

					while (current && current !== bk.end && (!ve.dom.isBlock(current) || veRange.isBookmarkNode(current) )) {
						tmpNode = current;
						current = ve.dom.getNextDomNode(current, false, null, function (node) {
							return !notExchange[node.tagName];
						});
					}

					if (current && ve.dom.isBlock(current)) {
						tmp = ve.dom.getNextDomNode(tmpNode, false, filterFn);
						if (tmp && veRange.isBookmarkNode(tmp)) {
							current = ve.dom.getNextDomNode(tmp, false, filterFn);
							tmpNode = tmp;
						}
					}
					tmpRange.setEndAfter(tmpNode);

					current = ve.dom.getNextDomNode(tmpNode, false, filterFn);
					
					var tempContent = tmpRange.extractContents();
			
					this.createLiElements(veRange, tempContent, frag);
					
				} else {
					current = ve.dom.getNextDomNode(current, true, filterFn);
				}
			}
			veRange.moveToBookmark(bk).collapse(true);
			list = veRange.doc.createElement(tag);
			list.style['list-style-type'] = style;
			if(frag.childNodes.length == 0){
				tmpNode = veRange.doc.createElement('span');
				tmpNode.innerHTML = '&nbsp;';
				var tmpLi = veRange.doc.createElement('li');
				tmpLi.appendChild(tmpNode);
				frag.appendChild(tmpLi);
			}
			list.appendChild(frag);
			
			veRange.insertNode(veRange.doc.createElement('br'));//放置一个换行，输入列表外内容
			veRange.insertNode(list);
			//当前list上下看能否合并
			this.adjustList(list, tag, style,true);

			veRange.moveToBookmark(bko).select();
		},
		
		/**
		 * veRange 选区元素传递
		 * tempContent 选区内容传递
		 * frag 文档片段传递
		 */
		createLiElements: function (veRange, tempContent, frag) {
			var li = veRange.doc.createElement('li'),
				tempSpan1,tempSpan2;
			while(tempContent.firstChild){
				if( tempContent.firstChild.nodeName.toLowerCase() == "br" ) {
					if(!this.isEmptyNode(li)) {
					
						frag.appendChild(li);
					}
					li = veRange.doc.createElement('li');
					tempContent.removeChild(tempContent.firstChild);
					continue;
				}
				
				//span标记包含换行的处理
				if(tempContent.firstChild.nodeName.toLowerCase() == "span" && tempContent.firstChild.getElementsByTagName("br").length > 0 ) {
					tempSpan1 = tempContent.firstChild;
					tempSpan2 = ve.dom.clone(tempSpan1);
					while( tempSpan1.firstChild ){
						if( tempSpan1.firstChild.nodeName.toLowerCase() == "br" ){
							
							if(!this.isEmptyNode(tempSpan2)) {
								li.appendChild(tempSpan2);
								frag.appendChild(li);
							}
							li = veRange.doc.createElement('li');
							tempSpan2 = ve.dom.clone(tempSpan1);
							tempSpan1.removeChild(tempSpan1.firstChild);
							continue;
						}
						tempSpan2.appendChild(tempSpan1.firstChild);
					}
					if(!this.isEmptyNode(tempSpan2)) {
						li.appendChild(tempSpan2);
					}
					tempContent.removeChild(tempContent.firstChild);
					continue;
				}
				li.appendChild(tempContent.firstChild);
			}
			if(!this.isEmptyNode(li)) {
				frag.appendChild(li);
			}		
		},

        /**
         * 调整range的边界，使其"放大"到最近的父block节点
         * @name  enlarge
         * @grammar enlarge(range)  =>  Range
         * @example
         * <p><span>xxx</span><b>x[x</b>xxxxx]</p><p>xxx</p> ==> [<p><span>xxx</span><b>xx</b>xxxxx</p>]<p>xxx</p>
         */		
		enlarge: function (range, toBlock, stopFn) {
			var pre, node, tmp = range.doc.createTextNode('');
			if (toBlock) {
				node = range.startContainer;
				if (node.nodeType == 1) {
					if (node.childNodes[range.startOffset]) {
						pre = node = node.childNodes[range.startOffset]
					} else {
						node.appendChild(tmp);
						pre = node = tmp;
					}
				} else {
					pre = node;
				}
				while (node) {
					if (ve.dom.isBlock(node)) {
						node = pre;
						while ((pre = node.previousSibling) && !ve.dom.isBlock(pre)) {
							node = pre;
						}
						range.setStartBefore(node);
						break;
					}
					pre = node;
					node = node.parentNode;
				}
				node = range.endContainer;
				if (node.nodeType == 1) {
					if (pre = node.childNodes[range.endOffset]) {
						node.insertBefore(tmp, pre);
					} else {
						node.appendChild(tmp);
					}
					pre = node = tmp;
				} else {
					pre = node;
				}
				while (node) {
					if (ve.dom.isBlock(node)) {
						node = pre;
						while ((pre = node.nextSibling) && !ve.dom.isBlock(pre)) {
							node = pre;
						}
						range.setEndAfter(node);
						break;
					}
					pre = node;
					node = node.parentNode;
				}
				if (tmp.parentNode === range.endContainer) {
					range.endOffset--;
				}
				ve.dom.remove(tmp);
			}
		},

		/**
		 * 调整list结构
		 */
		adjustList: function(list, tag, style, ignoreEmpty) {
			var nextList = list.nextSibling;
			if (nextList && nextList.nodeType == 1 && nextList.tagName.toLowerCase() == tag && (ve.dom.getStyle(nextList, 'list-style-type') || (tag == 'ol' ? 'decimal' : 'disc')) == style) {
				this.moveChild(nextList, list);
				if (nextList.childNodes.length == 0) {
					ve.dom.remove(nextList);
				}
			}
			if(nextList && this.isFillChar(nextList)){
				ve.dom.remove(nextList);
			}
			var preList = list.previousSibling;
			if (preList && preList.nodeType == 1 && preList.tagName.toLowerCase() == tag && (ve.dom.getStyle(preList, 'list-style-type') || (tag == 'ol' ? 'decimal' : 'disc')) == style) {
				this.moveChild(list, preList);
			}
			if(preList && this.isFillChar(preList)){
				ve.dom.remove(preList);
			}
			!ignoreEmpty && this.isEmptyBlock(list) && ve.dom.remove(list);
		},

		/**
		 * 判断是否为空块元素
		 */
		isEmptyBlock: function (node) {
			var reg = new RegExp('[ \t\r\n' + ve.caretChar + ']', 'g');
			if (node[ve.ua.ie ? 'innerText' : 'textContent'].replace(reg, '').length > 0) {
				return 0;
			}
			for (var n in ve.dtd.$isNotEmpty) {
				if (node.getElementsByTagName(n).length) {
					return 0;
				}
			}
			return 1;
		},
		
		/**
		 * 判断是否为填充字符
		 */
		isFillChar:function (node,isInStart) {
			return node.nodeType == 3 && !node.nodeValue.replace(new RegExp((isInStart ? '^' : '' ) + ve.caretChar), '').length
		},
		
		/**
		 * 把src元素的子节点移到tag元素
		 */
		moveChild: function (src, tag, dir) {
			while (src.firstChild) {
				if (dir && tag.firstChild) {
					tag.insertBefore(src.lastChild, tag.firstChild);
				} else {
					tag.appendChild(src.firstChild);
				}
			}
		},
		
		/**
		 * 判断节点是否为某类节点
		 */
		isTagNode: function (node, tagName) {
			return node.nodeType == 1 && new RegExp(node.tagName,'i').test(tagName)
		},

		/**
		 * 判断节点是否为空节点
		 */
		isEmptyNode: function (node) {
			return !node.firstChild || ve.dom.getChildCount(node) == 0
		},
		
		/**
		 * 将字符串list(以','分隔)或者数组list转成哈希对象
		 * @name listToMap
		 * @grammar listToMap(list)  => Object  //Object形如{test:1,br:1,textarea:1}
		 */
		listToMap:function (list) {
			if (!list)return {};
			list = ve.lang.isArray(list) ? list : list.split(',');
			for (var i = 0, ci, obj = {}; ci = list[i++];) {
				obj[ci.toUpperCase()] = obj[ci] = 1;
			}
			return obj;
		},
		
		/**
		 * 通过tagName查找node节点的祖先节点
		 * @name findParentByTagName
		 * @grammar findParentByTagName(node,tagNames)   =>  Element  //tagNames支持数组，区分大小写
		 * @grammar findParentByTagName(node,tagNames,includeSelf)   =>  Element  //includeSelf指定是否包含自身
		 * @grammar findParentByTagName(node,tagNames,includeSelf,excludeFn)   =>  Element  //excludeFn指定例外过滤条件，返回true时忽略该节点
		 **/
		findParentByTagName: function (node, tagNames, includeSelf, excludeFn) {
			tagNames = this.listToMap(ve.lang.isArray(tagNames) ? tagNames : [tagNames]);
			return this.findParent(node, function (node) {
				return tagNames[node.tagName] && !(excludeFn && excludeFn(node));
			}, includeSelf);
		},
		
		/**
		 * 查找node节点的祖先节点
		 * @name findParent
		 * @grammar findParent(node)  => Element  // 直接返回node节点的父节点
		 * @grammar findParent(node,filterFn)  => Element  //filterFn为过滤函数，node作为参数，返回true时才会将node作为符合要求的节点返回
		 * @grammar findParent(node,filterFn,includeSelf)  => Element  //includeSelf指定是否包含自身
		 */
		findParent:function (node, filterFn, includeSelf) {
			if (node && !this.isBody(node)) {
				node = includeSelf ? node : node.parentNode;
				while (node) {
					if (!filterFn || filterFn(node) || this.isBody(node)) {
						return filterFn && !filterFn(node) && this.isBody(node) ? null : node;
					}
					node = node.parentNode;
				}
			}
			return null;
		},

		/**
		 * 检测node节点是否为body节点
		 **/
		isBody: function (node) {
			return  node && node.nodeType == 1 && node.tagName.toLowerCase() == 'body';
		},

		/**
		 * 添加UI控件
		 **/
		addUIControls: function(){
			var _this = this, t = this.editor, tm = this.editor.toolbarManager;
			tm.createButton('listol', {title: '有序列表', 'class': 'veOrderedList', cmd: 'InsertOrderedList', onInit: function(){
				var btn = this;
				t.onAfterUpdateVERangeLazy.add(function(){
					var act = 'setUnActive';
					try {act = t.getDoc().queryCommandState('InsertOrderedList') ? 'setActive' : 'setUnActive';} catch(ex){};
					btn[act]();
				});
			}});
			
			t.addCommand('InsertOrderedList', function(){
				_this.insertOrDelList('InsertOrderedList');
			});
			
			tm.createButton('listul', {title: '无序列表', 'class': 'veUnorderedList', cmd: 'InsertUnorderedList', onInit: function(){
				var btn = this;
				t.onAfterUpdateVERangeLazy.add(function(){
					var act = 'setUnActive';
					try {act = t.getDoc().queryCommandState('InsertUnorderedList') ? 'setActive' : 'setUnActive';} catch(ex){};
					btn[act]();
				});
			}});
			
			t.addCommand('InsertUnorderedList', function(){
				_this.insertOrDelList('InsertUnorderedList');
			});

		}
	});
	ve.plugin.register('list', VEditor.plugin.List);
})(VEditor);
