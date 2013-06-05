(function(ve) {
	/**
	 * 移除格式
	 */
	ve.lang.Class('VEditor.plugin.RemoveFormat', {
		editor : null,
		curToolbarMode : 'default',
		button : null,
		fillChar : ve.caretChar,
		//块元素
		block : ve.dtd.$block,
		//没有子元素可以删除的元素
		removeEmpty : ve.dtd.$removeEmpty,
		//子元素为空
		empty : ve.dtd.$empty,
		//在table元素里的元素列表
		tableContent : ve.dtd.$tableContent,
		//列表根元素列表
		list : ve.dtd.$list,
		init: function ( editor, url ) {

			var _this = this;
			this.editor = editor;
			editor.addCommand('removeformat', function(){
				_this.removeFormat();
			});
			var btn = editor.toolbarManager.createButton('removeformat', {
				'class': 'veRemoveFormat',
				title: '清除格式',
				text: '',
				cmd: 'removeformat'
			});
		},
		//执行去格式主函数
		removeFormat : function(){
			var filter = function( node ) {
				return node.nodeType == 1;
			};
			var bookmark, node, parent;
			var tagReg = /^(?:B|BIG|CODE|DEL|DFN|EM|FONT|I|INS|KBD|Q|SAMP|SMALL|SPAN|STRIKE|STRONG|SUB|SUP|TT|U|VAR)$/i;
			var removeFormatAttributes = ["class", "style", "lang", "width", "height", "align", "hspace", "valign"];

			var veRange = this.editor.getVERange();
			bookmark = veRange.createBookmark();
			node = bookmark.start;
			
			//切开始部分
			while(( parent = node.parentNode ) && !ve.dom.isBlock( parent )){
			
				veRange.breakParent( node,parent );
				this.clearEmptySibling( node );
			}
			
			if( bookmark.end ){
				
				//切结束部分
				node = bookmark.end;
				
				while(( parent = node.parentNode ) && !ve.dom.isBlock( parent )){
				
					veRange.breakParent( node, parent );
					this.clearEmptySibling( node );
				}

				//开始去除样式
				var current = ve.dom.getNextDomNode( bookmark.start, false, filter ),
					next;
				while ( current ) {
				
					if ( current == bookmark.end ) {
					
						break;
					}

					next = ve.dom.getNextDomNode( current, true, filter );

					if ( !this.empty[current.tagName.toUpperCase()] && !veRange.isBookmarkNode( current ) ) {
					
						if ( tagReg.test( current.tagName.toUpperCase() ) ) {
						
							ve.dom.remove( current, true );
						} else {

							//不能把list上的样式去掉
							if(!this.tableContent[current.tagName.toUpperCase()] && !this.list[current.tagName.toUpperCase()]){
								this.removeAttributes( current, removeFormatAttributes );
								if ( this.isRedundantSpan( current ) ){
									ve.dom.remove( current, true );
								}
							}
						}
					}
					current = next;
				}
			}
			var pN = bookmark.start.parentNode;
			
			if( ve.dom.isBlock(pN) && !this.tableContent[pN.tagName.toUpperCase()] && !this.list[pN.tagName.toUpperCase()] ){

				this.removeAttributes(  pN,removeFormatAttributes );
			}

			if( bookmark.end && ve.dom.isBlock( pN = bookmark.end.parentNode ) && !this.tableContent[pN.tagName.toUpperCase()] && !this.list[pN.tagName.toUpperCase()] ){
			
				this.removeAttributes(  pN,removeFormatAttributes );
			}
			veRange.moveToBookmark( bookmark );//.moveToBookmark(bookmark1);
			//清除冗余的代码 <b><bookmark></b>
			var node = veRange.startContainer,
				tmp,
				collapsed = veRange.collapsed;
			while( node.nodeType == 1  && this.removeEmpty[node.tagName.toUpperCase()] ){
			
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
				while( node.nodeType == 1  && this.removeEmpty[node.tagName.toUpperCase()] ){
				
					tmp = node.parentNode;
					veRange.setEndBefore(node);
					ve.dom.remove(node);
					node = tmp;
				}
			}
			veRange.select();
		},
		/**
		 * 清除node节点左右兄弟为空的inline节点
		 * @name clearEmptySibling
		 * @grammar this.clearEmptySibling(node)
		 * @grammar this.clearEmptySibling(node,ignoreNext)  //ignoreNext指定是否忽略右边空节点
		 * @grammar this.clearEmptySibling(node,ignoreNext,ignorePre)  //ignorePre指定是否忽略左边空节点
		 * @example
		 * <b></b><i></i>xxxx<b>bb</b> --> xxxx<b>bb</b>
		 */
		clearEmptySibling : function (node, ignoreNext, ignorePre) {
			var _this = this;
			function clear(next, dir) {
				var tmpNode;
				while (next && !_this.isBookmarkNode(next) && (_this.isEmptyInlineElement(next)
					//这里不能把空格算进来会吧空格干掉，出现文字间的空格丢掉了
					|| !new RegExp('[^\t\n\r' + _this.fillChar + ']').test(next.nodeValue) )) {
					tmpNode = next[dir];
					ve.dom.remove(next);
					next = tmpNode;
				}
			}
			!ignoreNext && clear(node.nextSibling, 'nextSibling');
			!ignorePre && clear(node.previousSibling, 'previousSibling');
		},
		/**
		 * 删除节点node上的属性attrNames，attrNames为属性名称数组
		 * @name  removeAttributes
		 * @grammar this.removeAttributes(node,attrNames)
		 * @example
		 * //Before remove
		 * <span style="font-size:14px;" id="test" name="followMe">xxxxx</span>
		 * //Remove
		 * this.removeAttributes(node,["id","name"]);
		 * //After remove
		 * <span style="font-size:14px;">xxxxx</span>
		 */
		removeAttributes : function ( node, attrNames ) {
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
		},
		/**
		 * 将css样式转换为驼峰的形式。如font-size => fontSize
		 * @name cssStyleToDomStyle
		 * @grammar UE.utils.cssStyleToDomStyle(cssName)  => String
		 */
		cssStyleToDomStyle : function () {

			var test = document.createElement('div').style,
				cache = {
					'float':test.cssFloat != undefined ? 'cssFloat' : test.styleFloat != undefined ? 'styleFloat' : 'float'
				};

			return function (cssName) {
				return cache[cssName] || (cache[cssName] = cssName.toUpperCase().replace(/-./g, function (match) {
					return match.charAt(1).toUpperCase();
				}));
			};
		}(),
		/**
		 * 检查节点node是否是空inline节点
		 * @name  isEmptyInlineElement
		 * @grammar   this.isEmptyInlineElement(node)  => 1|0
		 * @example
		 * <b><i></i></b> => 1
		 * <b><i></i><u></u></b> => 1
		 * <b></b> => 1
		 * <b>xx<i></i></b> => 0
		 */
		isEmptyInlineElement : function ( node ) {
			if (node.nodeType != 1 || this.removeEmpty[ node.tagName.toUpperCase() ]) {
				return 0;
			}
			node = node.firstChild;
			while (node) {
				//如果是创建的bookmark就跳过
				if (this.isBookmarkNode(node)) {
					return 0;
				}
				if (node.nodeType == 1 && !this.isEmptyInlineElement(node) ||
					node.nodeType == 3 && !this.isWhitespace(node)
					) {
					return 0;
				}
				node = node.nextSibling;
			}
			return 1;
		},
		/**
		 * 检测节点node是否为空节点（包括空格、换行、占位符等字符）
		 * @name  isWhitespace
		 * @grammar  this.isWhitespace(node)  => true|false
		 */
		isWhitespace : function ( node ) {
			return !new RegExp('[^ \t\n\r' + this.fillChar + ']').test(node.nodeValue);
		},
		/**
		 * 检测节点node是否属于bookmark节点
		 * @name isBookmarkNode
		 * @grammar this.isBookmarkNode(node)  => true|false
		 */
		isBookmarkNode : function ( node ) {
			return node.nodeType == 1 && node.id && /^veditor_bookmark_/i.test(node.id);
		},
		/**
		 * 判断node是否为多余的节点
		 * @name isRenundantSpan
 		 */
		isRedundantSpan : function( node ) {
			if (node.nodeType == 3 || node.tagName.toUpperCase() != 'SPAN'){
			
				return 0;
			}
			if (ve.ua.ie) {
			
				//ie 下判断实效，所以只能简单用style来判断
				//return node.style.cssText == '' ? 1 : 0;
				var attrs = node.attributes;
				if ( attrs.length ) {
					for ( var i = 0,l = attrs.length; i<l; i++ ) {
						if ( attrs[i].specified ) {
							return 0;
						}
					}
					return 1;
				}
			}
			return !node.attributes.length;
		}
	});
	ve.plugin.register('removeformat', VEditor.plugin.RemoveFormat);
}) (VEditor);