(function(ve) {
	//匹配要移除的标记
	var REMOVE_TAG_REG = /^(?:B|BIG|CODE|DEL|DFN|EM|FONT|I|INS|KBD|Q|SAMP|SMALL|SPAN|STRIKE|STRONG|SUB|SUP|TT|U|VAR)$/i;
	//要移除的属性样式
	var REMOVE_FORMAT_ATTRIBUTES = ["class", "style", "lang", "width", "height", "align", "hspace", "valign"];
	/**
	 * 移除格式
	 */
	ve.lang.Class('VEditor.plugin.RemoveFormat', {
		editor : null,
		curToolbarMode : 'default',
		init: function ( editor, url ) {

			var _this = this;
			this.editor = editor;
			editor.addCommand('removeformat', function(){
				_this.removeFormat();
			});
			editor.toolbarManager.createButton('removeformat', {
				'class': 'veRemoveFormat',
				title: '清除格式',
				text: '',
				cmd: 'removeformat'
			});
		},
		//执行去格式主函数
		removeFormat : function(){
			var bookmark, node, parent;
			var veRange = this.editor.getVERange();
			bookmark = veRange.createBookmark();
			node = bookmark.start;
			
			/**
			 * 切开始部分
			 * <div>xxx<span>xxxx|xx</span>xxx</div>
			 * 在最近的块元素下切开
			 * <div>xxx<span>xxxx</span>|<span>xx</span></div>
			 */
			while(( parent = node.parentNode ) && !ve.dom.isBlock( parent )){
				veRange.breakParent( node,parent );
				clearEmptySibling( node );
			}
			
			if( bookmark.end ){
				/**
				 * 切结束部分
				 * <div>xxx<span>xxxx|xx</span>xxx</div>
				 * 在最近的块元素下切开
				 * <div>xxx<span>xxxx</span>|<span>xx</span></div>
				 */
				node = bookmark.end;
				
				while(( parent = node.parentNode ) && !ve.dom.isBlock( parent )){
					veRange.breakParent( node, parent );
					clearEmptySibling( node );
				}

				//开始去除样式
				var current = ve.dom.getNextDomNode( bookmark.start, false, filter ),
					next;
				while ( current ) {
					if ( current == bookmark.end ) {
						break;
					}
					next = ve.dom.getNextDomNode( current, true, filter ); //true表示从当前节点的第一个子节点开始找符合条件的节点,false的话从当前节点的下一个节点开始判断
					//ve.dtd.$empty : area:1,base:1,br:1,col:1,hr:1,img:1,input:1,link:1,meta:1,param:1,embed:1,wbr:1
					if ( !ve.dtd.$empty[current.tagName.toUpperCase()] && !veRange.isBookmarkNode( current ) ) {
						if ( REMOVE_TAG_REG.test( current.tagName.toUpperCase() ) ) {
							ve.dom.remove( current, true );
						} else {
							//不能把list上的样式去掉
							if(!ve.dtd.$tableContent[current.tagName.toUpperCase()] && !ve.dtd.$list[current.tagName.toUpperCase()]){
								removeAttributes( current, REMOVE_FORMAT_ATTRIBUTES );
							}
							if ( isRedundantSpan( current ) ){
								ve.dom.remove( current, true );
							}
						}
					}
					current = next;
				}
			}
			var pN = bookmark.start.parentNode;
			
			if( ve.dom.isBlock(pN) && !ve.dtd.$tableContent[pN.tagName.toUpperCase()] && !ve.dtd.$list[pN.tagName.toUpperCase()] ){
				removeAttributes(  pN,REMOVE_FORMAT_ATTRIBUTES );
			}

			if( bookmark.end && ve.dom.isBlock( pN = bookmark.end.parentNode ) && !ve.dtd.$tableContent[pN.tagName.toUpperCase()] && !ve.dtd.$list[pN.tagName.toUpperCase()] ){
				removeAttributes(  pN,REMOVE_FORMAT_ATTRIBUTES );
			}
			veRange.moveToBookmark( bookmark );
			//清除冗余的代码 <b><bookmark></b>
			var node = veRange.startContainer,
				tmp,
				collapsed = veRange.collapsed;
			while( node.nodeType == 1  && ve.dtd.$removeEmpty[node.tagName.toUpperCase()] ){
				tmp = node.parentNode;
				veRange.setStartBefore(node);
				//更新结束边界
				if( veRange.startContainer === veRange.endContainer ){
					veRange.endOffset--;
				}
				ve.dom.remove(node);
				node = tmp;
			}

			if( !collapsed ){
				node = veRange.endContainer;
				while( node.nodeType == 1  && ve.dtd.$removeEmpty[node.tagName.toUpperCase()] ){
					tmp = node.parentNode;
					veRange.setEndBefore(node);
					ve.dom.remove(node);
					node = tmp;
				}
			}
			veRange.select();
		}
	});
	ve.plugin.register('removeformat', VEditor.plugin.RemoveFormat);

	/**
	 * 过滤元素节点
	 */
	var filter = function( node ) {
		return node.nodeType == 1;
	};
	
	/**
	 * @parame next下一个将要删除的元素，当前元素的上一个或者下一个兄弟节点
	 * @parame dir 指定删除前兄弟节点还是后兄弟节点'nextSibling' or 'previousSibling'
	 */
	var clear = function(next, dir) {
		var tmpNode;
		//该节点不是添加的书签，不是列表元素，或者是制表符换行辅助符号
		while (next && !isBookmarkNode(next) && (isEmptyInlineElement(next)
			|| new RegExp('[\t\n\r' + ve.caretChar + ']').test(next.nodeValue) )) {
			tmpNode = next[dir];
			ve.dom.remove(next);
			next = tmpNode;
		}
	};
	/**
	 * 清除node节点左右兄弟为空的inline节点
	 * @name clearEmptySibling
	 * @grammar clearEmptySibling(node)
	 * @grammar clearEmptySibling(node,ignoreNext)  //ignoreNext指定是否忽略右边空节点
	 * @grammar clearEmptySibling(node,ignoreNext,ignorePre)  //ignorePre指定是否忽略左边空节点
	 * @example
	 * <b></b><i></i>xxxx<b>bb</b> --> xxxx<b>bb</b>
	 */
	var	clearEmptySibling = function (node, ignoreNext, ignorePre) {
		!ignoreNext && clear(node.nextSibling, 'nextSibling');
		!ignorePre && clear(node.previousSibling, 'previousSibling');
	};
	/**
	 * 删除节点node上的属性attrNames，attrNames为属性名称数组
	 * @name  removeAttributes
	 * @grammar removeAttributes(node,attrNames)
	 * @example
	 * //Before remove
	 * <span style="font-size:14px;" id="test" name="followMe">xxxxx</span>
	 * //Remove
	 * removeAttributes(node,["id","name"]);
	 * //After remove
	 * <span style="font-size:14px;">xxxxx</span>
	 */
	var	removeAttributes = function ( node, attrNames ) {
		//需要修正属性名的属性
		var attrFix = ve.ua.ie && ve.ua.ie < 9 ? {
				tabindex:"tabIndex",
				readonly:"readOnly",
				"for":"htmlFor",
				"class":"className",
				maxlength:"maxLength",
				cellspacing:"cellSpacing",
				cellpadding:"cellPadding",
				rowspan:"rowSpan",
				colspan:"colSpan",
				usemap:"useMap",
				frameborder:"frameBorder"
			} : {
				tabindex:"tabIndex",
				readonly:"readOnly"
			},
		attrNames = ve.lang.isArray( attrNames ) ? attrNames : ve.string.trim( attrNames ).replace(/[ ]{2,}/g,' ').split(' ');
		for (var i = 0, ci; ci = attrNames[i++];) {
			ci = attrFix[ci] || ci;
			switch (ci) {
				case 'className':
					node[ci] = '';
					break;
				case 'style':
					node.style.cssText = '';
					!ve.ua.ie && node.removeAttributeNode(node.getAttributeNode('style'))
			}
			node.removeAttribute(ci);
		}
	};
	/**
	 * 检查节点node是否是空inline节点
	 * @name  isEmptyInlineElement
	 * @grammar   isEmptyInlineElement(node)  => true|false
	 * @example
	 * <b><i></i></b> => true
	 * <b><i></i><u></u></b> => true
	 * <b></b> => true
	 * <b>xx<i></i></b> => false
	 */
	var	isEmptyInlineElement = function ( node ) {
		if (node.nodeType != 1 || ve.dtd.$removeEmpty[ node.tagName.toUpperCase() ]) {
			return false;
		}
		node = node.firstChild;
		while (node) {
			//如果是创建的bookmark就跳过
			if (isBookmarkNode(node)) {
				return false;
			}
			if (node.nodeType == 1 && !isEmptyInlineElement(node) ||
				node.nodeType == 3 && !isWhitespace(node)
				) {
				return false;
			}
			node = node.nextSibling;
		}
		return true;
	};
	/**
	 * 检测节点node是否为空节点（包括空格、换行、占位符等字符）
	 * @name  isWhitespace
	 * @grammar  isWhitespace(node)  => true|false
	 */
	var	isWhitespace = function ( node ) {
		return !new RegExp('[^ \t\n\r' + ve.caretChar + ']').test(node.nodeValue);
	};
	/**
	 * 检测节点node是否属于bookmark节点
	 * @name isBookmarkNode
	 * @grammar isBookmarkNode(node)  => true|false
	 */
	var	isBookmarkNode = function ( node ) {
		return node.nodeType == 1 && node.id && /^veditor_bookmark_/i.test(node.id);
	};
	/**
	 * 判断node是否为多余的节点
	 * @name isRenundantSpan
	 */
	var	isRedundantSpan = function( node ) {
		if (node.nodeType == 3 || node.tagName.toUpperCase() != 'SPAN'){
			return false;
		}
		if (ve.ua.ie) {
			//ie 下判断失效，所以只能简单用style来判断
			//return node.style.cssText == '' ? 1 : 0;
			var attrs = node.attributes;
			if ( attrs.length ) {
				for ( var i = 0,l = attrs.length; i<l; i++ ) {
					if ( attrs[i].specified ) {
						return false;
					}
				}
				return true;
			}
		}
		return !node.attributes.length;
	};
}) (VEditor);