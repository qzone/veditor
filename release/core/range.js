(function(ve){
	var EXTRACT = 0,
		CLONE = 1,
		DELETE = 2;

	var FILL_TMP_NODE;

	//bookmark常量
	var BOOKMARK_START_ID = 'veditor_bookmark_start',
		BOOKMARK_END_ID = 'veditor_bookmark_end',
		BOOKMARK_TAG = 'span',
		BOOKMARK_GUID = 0;

	/**
	 * Range对象
	 * 这里抽象w3c range模型和ie range模型，集中采用dom对象进行统一操作，提供统一方法
	 * 其中涉及到浏览器差异主要集中在“获取选区”和“设置选区”上
	 * 其他的方法比较少涉及到浏览器差异
	 **/
	ve.lang.Class('VEditor.Range', {
		win: null,
		doc: null,
		startContainer : null,
		startOffset : 0,
		endContainer : null,
		endOffset : 0,
		collapsed : true,

		/**
		 * 初始化
		 * @param {BOM} win
		 * @param {DOM} doc
		 **/
		Range: function(win, doc){
			this.win = win;
			this.doc = doc;

			this.startContainer = null;
			this.endContainer = null;
			this.startOffset = null;
			this.endOffset = null;
		},

		/**
		 * 转换浏览器range到当前Range对象
		 * @param {Range} nativeRange 浏览器range
		 */
		convertBrowserRange: function(nativeRange){
			var rng = nativeRange || (ve.ua.ie && ve.ua.ie<9 ? _getIERange(this.win, this.doc) : _getW3CRange(this.win, this.doc));
			this._convertBrowserRange(rng);
			//console.log('更新Range:', this.startContainer.nodeType, this.startContainer.tagName, '||', this.startOffset, '||', this.endOffset);
			this._adjustNeighborNode();
			//console.log('更新Range:', this.startContainer.nodeType, this.startContainer.tagName, '||', this.startOffset, '||', this.endOffset);
		},

		/**
		 * 转换浏览器range对象到当前range对象
		 * 此函数主要针对ie选区做转换
		 * @param {Range} browserRange 浏览器原生range对象
		 */
		_convertBrowserRange: function(browserRange){
			if(ve.ua.ie && ve.ua.ie<9){
				if(browserRange.item){
					this.selectNode(browserRange.item(0));
				} else {
					var bi = this._convertIERange(browserRange, true);
					this.setStart(bi.container, bi.offset);
					if(browserRange.compareEndPoints('StartToEnd',browserRange)!= 0){
						bi = this._convertIERange(browserRange, false);
						this.setEnd(bi.container, bi.offset);
					}
				}
			} else {
				var sel = _getW3CSelection(this.win, this.doc);
				if(sel && sel.rangeCount){
					var firstRange = sel.getRangeAt(0);
					var lastRange = sel.getRangeAt(sel.rangeCount - 1);

					this.setStart(firstRange.startContainer, firstRange.startOffset);
					this.setEnd(lastRange.endContainer, lastRange.endOffset);
					this.collapsed = this._isCollapsed();
				} else {
					this.setStart(this.doc.body.firstChild || this.doc.body, 0);
					this.collapse(true);
				}
			}
		},

		/**
		 * 获取ie浏览器range边界信息
		 * @param {Range} range 浏览器range对象
		 * @param {Boolean} isStart 是否为开始节点
		 * @return {Object}
		 **/
		_convertIERange: function(range, isStart){
			range = range.duplicate();
			range.collapse(isStart);

			//这里如果发现parentElement不在doc里面的话，
			//就表明当前编辑器失焦了。一般出现在ie
			var parent = range.parentElement();

			//这里对失焦进行一个“容错”
			if(!parent || parent.document != this.doc){
				console.log('[失焦!]:_convertIERange');
				return {container:this.doc.body, offset:0};
			}

			//如果节点里没有子节点，直接退出
			if(!parent.hasChildNodes()){
				return  {container:parent,offset:0};
			}

			//这里不能使用parent.childNodes，因为里面的textnode不能在moveToElementText使用
			var siblings = parent.children,
				child,
				testRange = range.duplicate(),
				startIndex = 0,endIndex = siblings.length - 1,index = -1,
				distance;

			while(startIndex <= endIndex){
				index = Math.floor((startIndex + endIndex) / 2);
				child = siblings[index];

				//fix ie comment take event
				if(child.nodeType == 8){
					child = child.nextSibling || child.previousSibling;
				}
				testRange.moveToElementText(child);
				var position = testRange.compareEndPoints('StartToStart', range);

				//[fix] ie 8,9 <block>text|<block>....
				//return {block, 1}
				var ps = child.previousSibling;
				var ns = child.nextSibling;
				if(position > 0 && ps && ps.nodeType == 3 && !ns){
					var tmpRange = testRange.duplicate();
					tmpRange.moveStart('character', -1);
					if(tmpRange.compareEndPoints('StartToStart', range) == 0){
						return {container:ps, offset:ps.nodeValue.length};
					}
				}

				if(position > 0){
					endIndex = index - 1;
				} else if(position < 0){
					startIndex = index + 1;
				} else {
					return  {container:parent,offset:ve.dom.nodeIndex(child)};
				}
			}

			if(index == -1){
				testRange.moveToElementText(parent);
				testRange.setEndPoint('StartToStart', range);
				distance = testRange.text.replace(/(\r\n|\r)/g, '\n').length;
				siblings = parent.childNodes;
				if(!distance){
					child = siblings[siblings.length - 1];
					return  {container:child,offset:child.nodeValue.length};
				}

				var i = siblings.length;
				while(distance > 0)
				distance -= siblings[ --i ].nodeValue.length;

				return {container:siblings[i],offset:-distance}
			}

			testRange.collapse(position > 0);
			testRange.setEndPoint(position > 0 ? 'StartToStart' : 'EndToStart', range);
			distance = testRange.text.replace(/(\r\n|\r)/g, (ve.ua.ie == 9 ? '' : '\n')).length;	//ie9 文本长度计算bug
			if(!distance){
				return  (ve.dtd.$empty[child.tagName] || ve.dtd.$nonChild[child.tagName])?
					{container: parent, offset:ve.dom.nodeIndex(child)+ (position > 0 ? 0 : 1)} :
					{container: child, offset:position > 0 ? 0 : child.childNodes.length}
			}

			while(distance > 0){
				try{
					var pre = child;
					child = child[position > 0 ? 'previousSibling' : 'nextSibling'];
					distance -= child.nodeValue.length;
				}catch(e){
					return {container:parent,offset:ve.dom.nodeIndex(pre)};
				}

			}
			return  {container:child, offset: (position>0 ? -distance : child.nodeValue.length + distance)}
		},

		/**
		 * 移动文本节点里面的光标到附近的内联标签中
		 * 不fix: abc|<inline>123</inline> => abc<inline>|123</inline>
		 * fix: abc|<inline></inline> => abc<inline>|</inline>
		 * fix: <inline>123</inline>|abc => <inline>123|</inline>abc
		 * fix: <inline>123</inline>|<tag>abc</tag> => <inline>123|</inline><tag>abc</tag>
		 * @return {Object}
		**/
		_moveTextToSiblingInline: function(){
			if(!this.collapsed){
				return;
			}

			var sc = this.startContainer, so = this.startOffset;
			var _isInlineNode = function(n){
				return n && n.nodeType == 1 && ve.dtd.$inline[n.tagName] && !ve.dtd.$empty[n.tagName] && !ve.dtd.$displayBlock[n.style.display]
			};

			var pre, ps = sc.previousSibling, ns = sc.nextSibling;
			if(sc.nodeType == 3 && so == sc.nodeValue && _isInlineNode(ns) && !ve.string.trim(ns.innerHTML)){
				this.startContainer = ns;
				this.startOffset = 0;
			}
			else if(sc.nodeType == 3 && !so && ps && ps.nodeType == 1 && _isInlineNode(ps)){
				this.startContainer = ps;
				this.startOffset = ps.childNodes.length;
			}
			else if(sc.nodeType == 1 && so && (so < sc.childNodes.length)){
				var p = sc.childNodes[so-1];
				if(_isInlineNode(p)){
					this.startContainer = p;
					this.startOffset = p.childNodes.length;
				}
			}
		},

		/**
		 * 移动光标到标签内部
		 * fix: <tag1>|<tag2> => <tag1><tag2>|
		 * fix: </tag1>|</tag2> => |<tag1></tag2>
		 * @return {Object}
		**/
		_moveCaretToMid: function(){
			if(!this.collapsed){
				return;
			}
			var sc = this.startContainer,
				so = this.startOffset;

			//[fix] ie6 <a><a>text</a></a> 作为startContainer的话,startContainer.childNodes[so-1].tagName 变成 /A
			var fixType = function(n){
				if(n && n.nodeType == 1){
					return n.tagName.indexOf('/') !== 0;
				}
				return true;
			};

			if(sc.nodeType == 1){
				if(!so && sc.childNodes.length && sc.childNodes[0].nodeType == 1 && !ve.dtd.$empty[sc.childNodes[0].tagName]){
					this.startContainer = sc.childNodes[0];
					this.startOffset = 0;
					this._moveCaretToMid();
				} else if(so && so == sc.childNodes.length && sc.childNodes[so-1].nodeType == 1 && !ve.dtd.$empty[sc.childNodes[so-1].tagName] && sc.childNodes[so-1]){
					if(fixType(sc.childNodes[so-1].lastChild)){
						if(sc.childNodes[so-1].childNodes.length == 1 && sc.childNodes[so-1].firstChild != sc.childNodes[so-1].lastChild){
							//[fix] <a mailto>asdfasdf<a>text</a> 这个bug
						} else {
							this.startContainer = sc.childNodes[so-1];
							this.startOffset = sc.childNodes[so-1].childNodes.length;
							this._moveCaretToMid();
						}
					}
				}
			}
		},

		/**
		 * 修正光标点击漂移
		 **/
		_adjustNeighborNode: function(){
			var sc = this.startContainer;
			var so = this.startOffset;
			var ec = this.endContainer;
			var eo = this.endOffset;

			if(this.collapsed){

				//fix ie9 没有办法定位在行尾<br/>之前
				//问题描述：文本使用br换将，光标点击在行尾，其实聚焦的地方是br之后，因此需要识别调整，
				//后尾为BR情况
				//fix: [!]</br>\r\n<inline> => |</br>\r\n|<inline>
				/**
				if(ve.ua.ie == 9 && so > 0){
					var start = sc.nodeType == 1 ? sc.childNodes[so-1] : null;
					if(ve.dom.isBr(start)){
						var evt = this.win.event;
						if(evt){
							var mouseX = evt.pageX || (evt.clientX + (this.doc.documentElement.scrollLeft || this.doc.body.scrollLeft));
							startRegion = ve.dom.gestRegion(start, this.doc);
							if(mouseX > startRegion.left){
								this.setStartAfter(start);
								this.collapse(true);
								this.select(true);
								return;
							}
						}
					}
				}
				**/

				//[fix] <block><img><block>&nbsp;</block>[!]</block>test => <block><img><block>&nbsp;</block>[!]</block>|test
				//[fix] <block><img><block>&nbsp;</block>[!]</block><span>test</span> => <block><img><block>&nbsp;</block>[!]</block><span>|test</span>
				if(ve.ua.ie == 8 && so == sc.childNodes.length){
					var ns = sc.nextSibling;
					if(ve.dom.isDisplayBlock(sc[so-1]) && ns){
						var evt = this.win.event;
						if(evt){
							var mouseY = evt.pageY || (evt.clientY + (this.doc.documentElement.scrollTop || this.doc.body.scrollTop));
							var startRegion = ve.dom.getRegion(sc, this.doc);
							if(mouseY > startRegion.top){
								if(ns.nodeType == 1 && !ve.dtd.$empty[ns.tagName]){
									this.setStart(ns, 0);
								} else {
									this.setStartBefore(ns);
								}
								this.collapse(true);
								this.select(true);
								return;
							}
						}
					}
				}

				this._moveCaretToMid();
				this._moveTextToSiblingInline();
				this.collapse(true);

				if(sc !== this.startContainer || so != this.startOffset){
					this.select();
				}
			} else {
				//[fix] <a>[text]</a> 情况 到 [<a></a>]
				//[fix] <a>[text</a>tet] 情况 到 [<a>text</a>tet]
				var chk = false;
				if(!so){
					chk = adjustBoundaryLink(this, (sc.nodeType == 3 ? sc : sc.parentNode.firstChild), true) || chk;
				}
				if(eo && ((ec.nodeType == 3 && eo == ec.nodeValue.length) || (ec.nodeType == 1 && ec.childNodes.length == eo))){
					chk = adjustBoundaryLink(this, (ec.nodeType == 3 ? ec : ec.parentNode)) || chk;
				}

				//[fix] [text<span>text<br/>] => [text<span>text]<br/>
				if(ec.childNodes[eo] && ve.dom.isBr(ec.childNodes[eo].previousSibling)){
					this.setEndBefore(ec.childNodes[eo].previousSibling);
					chk = true;
				}
				if(chk){
					this.select();
				}
			}
		},

		/**
		 * 创建文档块
		 **/
		createDocumentFragment: function(){
			return this.doc.createDocumentFragment();
		},

		/**
		 * 设置开始节点
		 * @param {DOM} node
		 * @param {Number} offset
		 **/
		setStart: function(node, offset){
			this.setNodePoint(true, node, offset);
		},

		/**
		 * 设置结束节点
		 * @param {DOM} node
		 * @param {Number} offset
		 **/
		setEnd: function(node, offset){
			this.setNodePoint(false, node, offset);
		},

		/**
		 * 设置开始在···节点之前
		 * @param {DOM} node
		 **/
		setStartBefore: function(node){
			this.setStart(node.parentNode, ve.dom.nodeIndex(node));
		},

		/**
		 * 设置开始在···节点之后
		 * @param {DOM} node
		 **/
		setStartAfter: function(node){
			this.setStart(node.parentNode, ve.dom.nodeIndex(node) + 1);
		},

		/**
		 * 设置结束在···节点之前
		 * @param {DOM} node
		 **/
		setEndBefore: function(node){
			this.setEnd(node.parentNode, ve.dom.nodeIndex(node));
		},

		/**
		 * 设置结束在···节点之后
		 * @param {DOM} node
		 **/
		setEndAfter: function(node){
			this.setEnd(node.parentNode, ve.dom.nodeIndex(node) + 1);
		},

		/**
		 * 折叠为光标
		 * @param {Boolean} toStart 折叠到开始节点
		 **/
		collapse: function(toStart){
			if(toStart){
				this.endContainer = this.startContainer;
				this.endOffset = this.startOffset;
			} else {
				this.startContainer = this.endContainer;
				this.startOffset = this.endOffset;
			}
			this.collapsed = true;
		},

		/**
		 * 设置选区内容样式
		 * @param {string} tagName	  标签
		 * @param {[type]} attrs
		 * @param {[type]} list
		 */
		setInlineAttr: function(tagName, attrs, list){
			var _this = this;
			if(this.collapsed){
				return this;
			}

			this.adjustRange();
			this.maxiumRange(false, function(node){
				return ve.dom.isDisplayBlock(node);
			});
			this.adjustRangeBoundary();

			var bookmark = this.createBookmark();
			var end = bookmark.end;

			//如果tagName是block，需要移除两边多余的br
			if(ve.dtd.$block[tagName.toUpperCase()] || (attrs.style && ve.dtd.$displayBlock[attrs.style.display])){
				_clearBr(this, bookmark.start, 'previousSibling');
				_clearBr(this, end, 'nextSibling');
			}

			//DTD 调整
			/**
			var _getLastAdjustParent = function(rng, node, bStart){
				var p = node.parentNode;
				while(!ve.dtd[p.tagName.toLowerCase()][tagName.toUpperCase()] && p.parentNode && p.tagName != 'BODY'){
					p = p.parentNode;
				}

				if(p != node.parentNode){
					var _rng = rng.cloneRange();
					if(bStart){
						_rng.setStart(p, 0);
						_rng.setEndBefore(node);
					} else {
						_rng.setStartAfter(node);
						_rng.setEndBefore(p, p.childNodes.length);
					}
					var frag = _rng.extractContents();
					var _tmpNode = _rng.doc.createElement(tagName);
					_tmpNode.appendChild(frag);
					_rng.insertNode(_tmpNode);
					return true;
				}
			};
			if(_getLastAdjustParent(this, bookmark.start, true)){
				this.setStartBefore(bookmark.start);
			};
			if(_getLastAdjustParent(this, end)){
				this.setEndAfter(end);
			}
			 **/

			/**
			 * stop function
			 * @param  {DOM} node
			 * @return {Boolean}      true > stop
			 */
			var filterFn = function(node){
				return node.nodeType == 1 ? node.tagName.toLowerCase() != 'br' : !ve.isHelperNode(node);
			};
			var current = ve.dom.getNextDomNode(bookmark.start, false, filterFn);

			//这里需要对选中的range扩展，
			//如果ie下面选中的是 img control的话，cloneRange报错
			var node, pre, range = this.cloneRange();

			while (current && (ve.dom.getNodeRelexPosition(current, end) & 4)){
				if(current.nodeType == 3 || ve.dtd[tagName][current.tagName]){
					range.setStartBefore(current);
					node = current;
					while (node && (node.nodeType == 3 || ve.dtd[tagName][node.tagName]) && node !== end){
						pre = node;
						node = ve.dom.getNextDomNode(node, node.nodeType == 1, null, function(n){
							return n.nodeType == 1 ? ve.dtd[tagName][n.tagName] : true;
						})
					}

					//由于getNextDomNode非线性，这里fix最后一个匹配命中的情况
					if(node == end && !ve.dom.contains(pre, node)){
						range.setEndBefore(end);
					} else {
						//fix 跑进去bookmark里面了
						if(pre.nodeType == 3 && range.isBookmarkNode(pre.parentNode)){
							pre = pre.parentNode;
						}

						//[fix]选区就差那么一点
						if(pre.parentNode.lastChild == pre && pre.parentNode == current){
							pre = current;
						}
						range.setEndAfter(pre);
					}

					var frag = range.extractContents(),el;
					if(list && list.length > 0){
						var level,top;
						top = level = list[0].cloneNode(false);
						for(var i=1,ci;ci=list[i++];){
							level.appendChild(ci.cloneNode(false));
							level = level.firstChild;
						}
						el = level;
					} else {
						el = range.doc.createElement(tagName)
					}

					if(attrs){
						ve.dom.setAttrs(el, attrs)
					}

					el.appendChild(frag);
					range.insertNode(list ?  top : el);

					//处理下滑线在a上的情况
					var aNode;
					if(tagName == 'span' && attrs.style && attrs.style.textDecoration && (aNode = findParent(el, 'A'))){
						ve.dom.setAttrs(aNode,attrs);
						ve.dom.remove(el, true);
						el = aNode;
					}

					 //去除子节点相同的
					//this._mergChild(el, tagName,attrs);
					current = ve.dom.getNextDomNode(el, false, filterFn);
					if(el.childNodes.length == 1){
						ve.dom.mergerStyleToParent(el.firstChild);
					}
					ve.dom.mergerStyleToParent(el);
					//ve.dom.fixNodeDupParent(el);

					if(node === end){
						break;
					}
				} else {
					current = ve.dom.getNextDomNode(current, true, filterFn)
				}
			}
			return this.moveToBookmark(bookmark);
		},

		/**
		 * 检测元素是否为空白节点（包括bookmark节点）
		 * @param {DOM} node
		 * @return {Boolean}
		 **/
		_isEmptyNode: function(node){
			var _this = this;
			if(!node || !node.firstChild){
				return true;
			}

			var isEmpty = true;
			ve.lang.each(node.childNodes, function(node){
				if(node.tagName != 'BR' && !_this.isBookmarkNode(node) && !ve.isHelperNode(node)){
					isEmpty = false;
					return true;
				}
			});
			return isEmpty;
		},

		/**
		 * 插入html
		 * @param {String} html
		 **/
		insertHtml: function(html){
			var _this = this;
            var block = this.doc.createElement('div');
				block.style.display = 'inline';
				block.innerHTML = ve.string.trim(html);

            if(!this.collapsed) {
                this.deleteContents();
                if(this.startContainer.nodeType == 1){
                    var child = this.startContainer.childNodes[this.startOffset],pre;
                    if(child && ve.dom.isDisplayBlock(child) && (pre = child.previousSibling) && ve.dom.isDisplayBlock(pre)){
                        this.setEnd(pre,pre.childNodes.length);
						this.collapse();
                        while(child.firstChild){
                            pre.appendChild(child.firstChild);
                        }
                        ve.dom.remove(child);
                    }
                }

            }

            var child,parent,pre,tmp,hadBreak = 0;
            while(child = block.firstChild) {
                this.insertNode(child);
                if(!hadBreak && child.nodeType == 1 && ve.dom.isDisplayBlock(child)){
                    parent = ve.dom.getParent(child,function(node){
						return ve.dom.isDisplayBlock(node) && node != child;
					});
                    if(parent && parent.tagName != 'BODY' && !(ve.dtd[parent.tagName.toLowerCase()][child.nodeName] && child.parentNode === parent)){
                        if(!ve.dtd[parent.tagName.toLowerCase()][child.nodeName]){
                            pre = parent;
						}else{
                            tmp = child.parentNode;
                            while (tmp !== parent){
                                pre = tmp;
                                tmp = tmp.parentNode;
                            }
                        }
                        this.breakParent(child, pre || tmp);
                        var pre = child.previousSibling;
                        //domUtils.trimWhiteTextNode(pre);
                        if(pre && !pre.childNodes.length){
                            ve.dom.remove(pre);
                        }
                        hadBreak = 1;
                    }
                }
                var next = child.nextSibling;
                if(!block.firstChild && next && ve.dom.isDisplayBlock(next)){
                    this.setStart(next,0);
					this.collapse(true);
                    break;
                }
                this.setEndAfter(child);
				this.collapse();
            }

            child = this.startContainer;

            //用chrome可能有空白展位符
            if(ve.dom.isDisplayBlock(child) && this._isEmptyNode(child)){
                child.innerHTML = ve.ua.ie ? '' : '<br/>'
            }

            //加上true因为在删除表情等时会删两次，第一次是删的FILL_TMP_NODE
            this.select(true);
		},

		breakParent : function(node, parent) {
            var tmpNode, parentClone = node, clone = node, leftNodes, rightNodes;
            do {
				if(!parentClone.parentNode){
					break;
				}
				parentClone = parentClone.parentNode;
                if (leftNodes) {
                    tmpNode = parentClone.cloneNode(false);
					if(!tmpNode){
						break;
					}
                    tmpNode.appendChild(leftNodes);
                    leftNodes = tmpNode;

                    tmpNode = parentClone.cloneNode(false);
                    tmpNode.appendChild(rightNodes);
                    rightNodes = tmpNode;

                } else {
                    leftNodes = parentClone.cloneNode(false);
                    rightNodes = leftNodes.cloneNode(false);
                }

                while (tmpNode = clone.previousSibling) {
                    leftNodes.insertBefore(tmpNode, leftNodes.firstChild);
                }

                while (tmpNode = clone.nextSibling) {
                    rightNodes.appendChild(tmpNode);
                }

                clone = parentClone;
            } while (parent !== parentClone && (parentClone.parentNode && parentClone.parentNode.tagName != 'BODY'));

            tmpNode = parent.parentNode;
            tmpNode.insertBefore(leftNodes, parent);
            tmpNode.insertBefore(rightNodes, parent);
            tmpNode.insertBefore(node, rightNodes);
            ve.dom.remove(parent);
            return node;
        },

		/**
		 * 移除内联样式
		 * @param  {Array} tagList tag标签数组
		 */
		removeInlineStyle: function(tagList){
			if(this.collapsed){
				return this;
			}

			this.minifyRange();
			this.adjustRangeBoundary();

			var start = this.startContainer,
				end = this.endContainer;

			while(1){
				if(start.nodeType == 1){
					if(ve.lang.arrayIndex(tagList, start.tagName.toLowerCase())> -1){
						break;
					}
					if(start.tagName == 'BODY'){
						start = null;
						break;
					}
				}
				start = start.parentNode;
			}

			while(1){
				if(end.nodeType == 1){
					if(ve.lang.arrayIndex(tagList, end.tagName.toLowerCase())> -1){
						break;
					}
					if(end.tagName == 'BODY'){
						end = null;
						break;
					}
				}
				end = end.parentNode;
			}

			var bookmark = this.createBookmark(),
				frag,
				tmpRange;
			if(start){
				tmpRange = this.cloneRange();
				tmpRange.setEndBefore(bookmark.start);
				tmpRange.setStartBefore(start);
				frag = tmpRange.extractContents();
				tmpRange.insertNode(frag);
				this._clearEmptySibling(start, true);
				start.parentNode.insertBefore(bookmark.start, start);
			}

			if(end){
				tmpRange = this.cloneRange();
				tmpRange.setStartAfter(bookmark.end);
				tmpRange.setEndAfter(end);
				frag = tmpRange.extractContents();
				tmpRange.insertNode(frag);
				this._clearEmptySibling(end, false, true);
				end.parentNode.insertBefore(bookmark.end, end.nextSibling);
			}

			var current = ve.dom.getNextDomNode(bookmark.start, false, function(node){
				return node.nodeType == 1
			}),next;

			while(current && current !== bookmark.end){
				next = ve.dom.getNextDomNode(current, true, function(node){
					return node.nodeType == 1
				});
				if(ve.lang.arrayIndex(tagList, current.tagName.toLowerCase())> -1){
					ve.dom.remove(current, true);
				}
				current = next;
			}
			return this.moveToBookmark(bookmark);
		},

		/**
		 * 移除bookmark
		 **/
		removeBookmark: function(){
			var _this = this;
			var nodeList = this.doc.getElementsByTagName(BOOKMARK_TAG);
			ve.lang.each(nodeList, function(node){
				if(_this.isBookmarkNode(node)){
					ve.dom.remove(node);
				}
			});
		},

		/**
		 * 创建bookmark
		 * @param {Boolean} bSerialize 是否返回id，而非DOM
		 * @param {Boolean} useStaticBookmarkId 是否使用静态id
		 * @return {Object}
		 */
		createBookmark: function(bSerialize, useStaticBookmarkId){
			var endNode,
				startNode = this.doc.createElement(BOOKMARK_TAG);
				startNode.style.cssText = 'display:none';
				startNode.appendChild(this.doc.createTextNode(ve.blankChar));
				startNode.id = BOOKMARK_START_ID + (useStaticBookmarkId ? '' : ++BOOKMARK_GUID);
				collapsed = this.collapsed;

			if(!collapsed){
				endNode = startNode.cloneNode(true);
				endNode.id = BOOKMARK_END_ID + (useStaticBookmarkId ? '' : BOOKMARK_GUID);
			}
			this.insertNode(startNode);

			if(endNode){
				this.collapse(false);
				this.insertNode(endNode);
				this.setEndBefore(endNode)
			}
			this.setStartAfter(startNode);

			if(collapsed){
				this.collapse(true);
			}

			return {
				start : bSerialize ? startNode.id : startNode,
				end : endNode ? bSerialize ? endNode.id : endNode : null,
				id : bSerialize
			}
		},

		/**
		 * 移动到bookmark
		 * @param {Object} bookmark
		 */
		moveToBookmark: function(bookmark){
			if(!bookmark){
				bookmark = {
					id: true,
					start: BOOKMARK_START_ID,
					end: BOOKMARK_END_ID
				};
			}

			var start = bookmark.id ? this.doc.getElementById(bookmark.start) : bookmark.start,
				end = bookmark.end && bookmark.id ? this.doc.getElementById(bookmark.end) : bookmark.end;
			if(start){
				this.setStartBefore(start);
				ve.dom.remove(start);
			}
			if(end){
				this.setEndBefore(end);
				ve.dom.remove(end);
			} else {
				this.collapse(true);
			}
			return this;
		},

		/**
		 * 判断一个节点是否为bookmark对象
		 * @param {DOM} node
		 * @return {Boolean}
		 **/
		isBookmarkNode: function(node){
			return node && node.id && (node.id.indexOf(BOOKMARK_START_ID) === 0 || node.id.indexOf(BOOKMARK_END_ID) === 0);
		},

		/**
		 * 调整选区边界到合理范围区域
		 */
		adjustRange: function(ignoreEnd){
			this.adjustTextRange();
			var start = this.startContainer,
				offset = this.startOffset,
				collapsed = this.collapsed,
				end = this.endContainer;
			if(start.nodeType == 3){
				if(offset == 0){
					this.setStartBefore(start);
				} else {
					if(offset >= start.nodeValue.length){
						this.setStartAfter(start);
					} else {
						var textNode = _splitTextNode(start, offset);
						if(start === end){
							this.setEnd(textNode, this.endOffset - offset);
						} else if(start.parentNode === end){
							this.endOffset += 1;
						}
						this.setStartBefore(textNode);
					}
				}
				if(collapsed){
					return this.collapse(true);
				}
			}
			if(!ignoreEnd){
				offset = this.endOffset;
				end = this.endContainer;
				if(end.nodeType == 3){
					if(offset == 0){
						this.setEndBefore(end);
					} else {
						if(offset >= end.nodeValue.length){
							this.setEndAfter(end);
						} else {
							_splitTextNode(end, offset);
							this.setEndAfter(end);
						}
					}

				}
			}
			return this;
		},

		/**
		 * 调整range边界container
		 * @example
		 * <b>xx[</b>xxxxx] ==> <b>xx</b>[xxxxx]
		 * <b>[xx</b><i>]xxx</i> ==> <b>[xx]</b><i>xxx</i>
		 */
		adjustRangeBoundary: function(){
			if(!this.collapsed){
				if(!this.startContainer.nodeType != 1){
					return this;
				}
				while(this.startContainer.tagName.toLowerCase() != 'body' && this.startOffset == this.startContainer[this.startContainer.nodeType == 3 ? 'nodeValue' : 'childNodes'].length){
					this.setStartAfter(this.startContainer);
				}
				while(this.endContainer.tagName.toLowerCase() != 'body' && !this.endOffset){
					this.setEndBefore(this.endContainer);
				}
			}
			return this;
		},

		/**
		 * 调整文本边界，避免空置offset，
		 * 或者container没有包含情况
		 **/
		adjustTextRange: function(){
			if(this.collapsed){
				return;
			}
			if(this.startContainer.nodeType == 3){
				if(!this.startOffset){
					this.setStartBefore(this.startContainer);
				} else if(this.startOffset >= this.startContainer.nodeValue.length){
					this.setStartAfter(this.startContainer);
				}
			}
			if(this.endContainer.nodeType == 3){
				if(!this.endOffset){
					this.setEndBefore(this.endContainer);
				} else if(this.endOffset >= this.endContainer.nodeValue.length){
					this.setEndAfter(this.endContainer);
				}
			}
		},

		/**
		 * 缩小边界
		 * @param {Boolean} ignoreEnd
		 */
		minifyRange: function(ignoreEnd){
			var child;
			while(this.startContainer.nodeType == 1
				&& (child = this.startContainer.childNodes[this.startOffset])
				&& child.nodeType == 1 && child.tagName != 'A'  && !this.isBookmarkNode(child)	//去除A的minifiy，A需要外围操作
				&& !ve.dtd.$empty[child.tagName] && !ve.dtd.$nonChild[child.tagName]){
				this.setStart(child, 0);
			}
			if(this.collapsed){
				return this.collapse(true);
			}
			if(!ignoreEnd){
				while(this.endContainer.nodeType == 1
					&& this.endOffset > 0
					&& (child = this.endContainer.childNodes[this.endOffset - 1])
					&& child.nodeType == 1 && child.tagName != 'A' && !this.isBookmarkNode(child)
					&& !ve.dtd.$empty[child.tagName] && !ve.dtd.$nonChild[child.tagName]){
					this.setEnd(child, child.childNodes.length);
				}
			}
		},

		/**
		 * 放大边界
		 * @param {Boolean} toBlock
		 * @param {Function} stopFn
		 */
		maxiumRange: function(toBlock, stopFn){
			var pre,node,
				tmp = this.doc.createTextNode('');
			if(toBlock){
				node = this.startContainer;
				if(node.nodeType == 1){
					if(node.childNodes[this.startOffset]){
						pre = node = node.childNodes[this.startOffset]
					} else {
						node.appendChild(tmp);
						pre = node = tmp;
					}
				} else {
					pre = node;
				}

				while(1){
					if(ve.dom.isDisplayBlock(node)){
						node = pre;
						while((pre = node.previousSibling) && !ve.dom.isDisplayBlock(pre)){
							node = pre;
						}
						this.setStartBefore(node);

						break;
					}
					pre = node;
					node = node.parentNode;
				}
				node = this.endContainer;
				if(node.nodeType == 1){
					if(pre = node.childNodes[this.endOffset]){
						node.insertBefore(tmp, pre);
						}else{
						node.appendChild(tmp)
					}
					pre = node = tmp;
				} else {
					pre = node;
				}

				while(1){
					if(ve.dom.isDisplayBlock(node)){
						node = pre;
						while((pre = node.nextSibling) && !ve.dom.isDisplayBlock(pre)){
							node = pre;
						}
						this.setEndAfter(node);
						break;
					}
					pre = node;
					node = node.parentNode;
				}
				if(tmp.parentNode === this.endContainer){
					this.endOffset--;
				}
				ve.dom.remove(tmp);
			}

			// 扩展边界到最大
			if(!this.collapsed){
				while(this.startOffset == 0){
					if(stopFn && stopFn(this.startContainer)){
						break;
					}
					if(this.startContainer.tagName == 'BODY'){
						break;
					}
					this.setStartBefore(this.startContainer);
				}
				while(this.endOffset == (this.endContainer.nodeType == 1 ? this.endContainer.childNodes.length : this.endContainer.nodeValue.length)){
					if(stopFn && stopFn(this.endContainer)){
						break;
					}
					if(this.endContainer.tagName == 'BODY'){
						break;
					}
					this.setEndAfter(this.endContainer)
				}
			}
			return this;
		},

		/**
		 * 判断节点是否为空的内联元素节点
		 * @param   {DOM}  node
		 * @return  {Boolean}
		 * @private
		 */
		_isEmptyInlineElement: function(node){
			if(node.nodeType != 1 || !ve.dtd.$removeEmpty[ node.tagName ])
				return 0;

			node = node.firstChild;
			while (node){
				if(this.isBookmarkNode(node)){
					return 0;
				}
				if(node.nodeType == 1 && !_isEmptyInlineElement(node) ||
					node.nodeType == 3 && !_isWhitespace(node)){
					return 0;
				}
				node = node.nextSibling;
			}
			return 1;
		},

		_clearEmptySibling: function(node, ingoreNext, ingorePre){
			var _this = this;
			function clear(next, dir){
				var tmpNode;
				while(next && !_this.isBookmarkNode(next) && (_isEmptyInlineElement(next) || _isWhitespace(next))){
					tmpNode = next[dir];
					ve.dom.remove(next);
					next = tmpNode;
				}
			}
			!ingoreNext && clear(node.nextSibling, 'nextSibling');
			!ingorePre && clear(node.previousSibling, 'previousSibling');
		},

		/**
		 * 选中range操作结果
		 * @param {Boolean} notInsertFillData 不插入占位符
		 **/
		select: function(notInsertFillData){
			if(ve.ua.ie && ve.ua.ie < 10){
				var ieRng;
				if (!this.collapsed){
					this.minifyRange();
				}

				//选中control情况
				var node = this.getClosedNode();
				if (node) {
					try {
						ieRng = this.doc.body.createControlRange();
						ieRng.addElement(node);
						ieRng.select();
					} catch(e) {}
					return;
				}

				var bookmark = this.createBookmark(), start = bookmark.start, end;

				ieRng = this.doc.body.createTextRange();
				try {ieRng.moveToElementText(start);} catch(ex){};
				ieRng.moveStart('character', 1);

				if(!this.collapsed){
					var ieRngEnd = this.doc.body.createTextRange();
					end = bookmark.end;
					ieRngEnd.moveToElementText(end);
					ieRng.setEndPoint('EndToEnd', ieRngEnd);
				}

				else if(!notInsertFillData && this.startContainer.nodeType != 3){
					//使用<span>|x<span>固定住光标
					var tmpText = this.doc.createTextNode(ve.blankChar),
                    tmp = this.doc.createElement('span');

					tmp.appendChild(this.doc.createTextNode(ve.blankChar));
					start.parentNode.insertBefore(tmp, start);
					start.parentNode.insertBefore(tmpText, start);

					//当点b,i,u时，不能清除i上边的b
					_removeFillData(tmpText);
					FILL_TMP_NODE = tmpText;

					_mergSibling(tmp,'previousSibling');
					_mergSibling(start,'nextSibling');
					ieRng.moveStart('character', -1);
					ieRng.collapse(true);
				}

				this.moveToBookmark(bookmark);
				tmp && ve.dom.remove(tmp);
				ieRng.select();
			}

			//W3C select方法
			else {
                var sel = _getW3CSelection(this.win, this.doc);
				ve.ua.firefox ? this.doc.body.focus() : this.win.focus();
				if (sel) {
					sel.removeAllRanges();
					var w3cRng = this.doc.createRange();
					w3cRng.setStart(this.startContainer, this.startOffset);
					w3cRng.collapse(this.collapsed);
					w3cRng.setEnd(this.endContainer, this.endOffset);
					sel.addRange(w3cRng);
				}
			}
		},

		/**
         * 得到一个自闭合的节点
		 * @deprecate 这个方法会干扰现有的startContainer的引用，慎用
		 * @return {DOM}
         */
        getClosedNode: function() {
            var node;
            if(!this.collapsed) {
                var range = this.cloneRange();
				range.adjustRange();
				range.minifyRange();
                if(range.startContainer.nodeType == 1 && range.startContainer === range.endContainer && range.endOffset - range.startOffset == 1) {
                    var child = range.startContainer.childNodes[range.startOffset];
                    if(child && child.nodeType == 1 && (ve.dtd.$empty[child.tagName] || ve.dtd.$nonChild[child.tagName])) {
                        node = child;
                    }
                }
            }
            return node;
        },

        /**
         * 选择节点
         * @param  {DOM} node
         */
		selectNode: function(node){
			this.setStartBefore(node);
			this.setEndAfter(node);
		},

		/**
		 * 选择节点内容
		 * @param  {DOM} node
		 */
		selectNodeContents: function(node){
			this.setStart(node, 0);
			this.setEnd(node, node.nodeType === 1 ? node.childNodes.length : node.nodeValue.length);
		},

		compareBoundaryPoints: function(h, r){
			var sc = this.startContainer, so = this.startOffset, ec = this.endContainer, eo = this.endOffset,
			rsc = r.startContainer, rso = r.startOffset, rec = r.endContainer, reo = r.endOffset;

			// Check START_TO_START
			if(h === 0)
				return this._compareBoundaryPoints(sc, so, rsc, rso);

			// Check START_TO_END
			if(h === 1)
				return this._compareBoundaryPoints(ec, eo, rsc, rso);

			// Check END_TO_END
			if(h === 2)
				return this._compareBoundaryPoints(ec, eo, rec, reo);

			// Check END_TO_START
			if(h === 3)
				return this._compareBoundaryPoints(sc, so, rec, reo);
		},

		/**
		 * 删除内容
		 */
		deleteContents: function(){
			this._traverse(DELETE);
		},

		/**
		 * 截取内容
		 * @deprecated 原内容结构将被破坏
		 */
		extractContents: function(){
			return this._traverse(EXTRACT);
		},

		/**
		 * 克隆内容
		 */
		cloneContents: function(){
			return this._traverse(CLONE);
		},

		/**
		 * 插入节点到当前焦点
		 * 同时更新当前offset
		 * @param {DOM} node
		 **/
		insertNode: function(node){
			var first = node,
				length = 1;

			//对documentFragment兼容
            if(node.nodeType == 11) {
                first = node.firstChild;
                length = node.childNodes.length;
            }

            this.adjustRange(true);

            var nextNode = this.startContainer.childNodes[this.startOffset];
			try {
				if(nextNode) {
					//TODO 这里没有进行DTD校验，在ie下面会报错
					this.startContainer.insertBefore(node, nextNode);
				} else {
					this.startContainer.appendChild(node);
				}
			} catch(ex){};
            if(first.parentNode === this.endContainer) {
                this.endOffset = this.endOffset + length;
            }
            this.setStartBefore(first);
		},

		surroundContents: function(n){
			var f = this.extractContents();
			this.insertNode(n);
			n.appendChild(f);
			this.selectNode(n);
		},

		/**
		 * 克隆当前range对象
		 * @deprecate 注意：此方法可能修改startContainer、endContainer等相关引用变量
		 * @return {Range}
		 */
		cloneRange: function(){
			var newRange = new ve.Range(this.win, this.doc);
				newRange.setStart(this.startContainer, this.startOffset);
				newRange.setEnd(this.endContainer, this.endOffset);
			return newRange;
		},

		/**
		 * 获取光标所在位置后面的节点，如果后面没有节点，则返回容器
		 * @param {DOM} container
		 * @param {Number} offset
		 * @return {DOM}
		 **/
		_getSelectedNode: function(container, offset){
			var child;

			if(container.nodeType == 3 /* TEXT_NODE */){
				return container;
			}
			if(offset < 0){
				return container;
			}

			child = container.firstChild;
			while (child && offset > 0){
				--offset;
				child = child.nextSibling;
			}

			if(child){
				return child;
			}
			return container;
		},

		/**
		 * 检测当前Range对象是否为折叠状态
		 * @return  {Boolean}
		 * @private
		 */
		_isCollapsed: function(){
			return this.startContainer && this.endContainer &&
				this.startContainer == this.endContainer &&
				this.startOffset == this.endOffset;
		},

		/**
		 * 比对边界节点位置
		 * @param   {DOM} containerA 容器1
		 * @param   {Number} offsetA 容器1偏离量
		 * @param   {DOM} containerB 容器2
		 * @param   {Number} offsetB 容器2偏离量
		 * @return  {Number}
		 * @private
		 */
		_compareBoundaryPoints: function(containerA, offsetA, containerB, offsetB){
			var c, offsetC, n, cmnRoot, childA, childB;

			if(containerA == containerB){
				if(offsetA == offsetB){
					return 0;
				}
				if(offsetA < offsetB){
					return -1;
				}
				return 1;
			}

			c = containerB;
			while (c && c.parentNode != containerA)
				c = c.parentNode;

			if(c){
				offsetC = 0;
				n = containerA.firstChild;

				while (n != c && offsetC < offsetA && n.nextSibling){
					offsetC++;
					n = n.nextSibling;
				}
				if(offsetA <= offsetC){
					return -1;
				}
				return 1;
			}

			c = containerA;
			while (c && c.parentNode != containerB){
				c = c.parentNode;
			}

			if(c){
				offsetC = 0;
				n = containerB.firstChild;

				while (n != c && offsetC < offsetB && n.nextSibling){
					offsetC++;
					n = n.nextSibling;
				}

				if(offsetC < offsetB){
					return -1; // before
				}
				return 1; // after
			}

			childA = containerA;
			while (childA && childA.parentNode != cmnRoot){
				childA = childA.parentNode;
			}
			if(!childA){
				childA = cmnRoot;
			}
			childB = containerB;
			while (childB && childB.parentNode != cmnRoot)
				childB = childB.parentNode;

			if(!childB){
				childB = cmnRoot;
			}
			if(childA == childB){
				return 0; // equal
			}
			n = cmnRoot.firstChild;
			while (n){
				if(n == childA){
					return -1;
				}
				if(n == childB){
					return 1;
				}
				n = n.nextSibling;
			}
		},

		/**
		 * 设置节点边界信息
		 * @param {Boolean} bStart
		 * @param {DOM} node
		 * @param {Number} offset
		 */
		setNodePoint: function(bStart, node, offset){
			if (node.nodeType == 1 && (ve.dtd.$empty[node.tagName] || ve.dtd.$nonChild[node.tagName])) {
				offset = ve.dom.nodeIndex(node) + (bStart ? 0 : 1);
				node = node.parentNode;
			}
			if (bStart) {
				this.startContainer = node;
				this.startOffset = offset;
				if (!this.endContainer) {
					this.collapse(true);
				}
			} else {
				this.endContainer = node;
				this.endOffset = offset;
				if (!this.startContainer) {
					this.collapse(false);
				}
			}
			this.collapsed = this._isCollapsed();
		},

		/**
		 * 当前Range遍历
		 * @param   {Number} how 遍历方式
		 * @return  {Mix}
		 * @private
		 */
		_traverse: function(how){
			var c, endContainerDepth = 0, startContainerDepth = 0, p, depthDiff, startNode, endNode, sp, ep;

			if(this.startContainer == this.endContainer){
				return this._traverseSameContainer(how);
			}

			for (c = this.endContainer, p = c.parentNode; p; c = p, p = p.parentNode){
				if(p == this.startContainer){
					return this._traverseCommonStartContainer(c, how);
				}
				++endContainerDepth;
			}

			for(c = this.startContainer, p = c.parentNode; p; c = p, p = p.parentNode){
				if(p == this.endContainer){
					return this._traverseCommonEndContainer(c, how);
				}
				++startContainerDepth;
			}

			depthDiff = startContainerDepth - endContainerDepth;

			startNode = this.startContainer;
			while (depthDiff > 0){
				startNode = startNode.parentNode;
				depthDiff--;
			}

			endNode = this.endContainer;
			while (depthDiff < 0){
				endNode = endNode.parentNode;
				depthDiff++;
			}

			// ascend the ancestor hierarchy until we have a common parent.
			for (sp = startNode.parentNode, ep = endNode.parentNode; sp != ep; sp = sp.parentNode, ep = ep.parentNode){
				startNode = sp;
				endNode = ep;
			}

			return this._traverseCommonAncestors(startNode, endNode, how);
		},

		 _traverseSameContainer: function(how){
			var frag, s, sub, n, cnt, sibling, xferNode, start, len;

			if(how != DELETE)
				frag = this.createDocumentFragment();

			// If selection is empty, just return the fragment
			if(this.startOffset == this.endOffset)
				return frag;

			// Text node needs special case handling
			if(this.startContainer.nodeType == 3 /* TEXT_NODE */){
				// get the substring
				s = this.startContainer.nodeValue;
				sub = s.substring(this.startOffset, this.endOffset);

				// set the original text node to its new value
				if(how != CLONE){
					n = this.startContainer;
					start = this.startOffset;
					len = this.endOffset - this.startOffset;

					if(start === 0 && len >= n.nodeValue.length - 1){
						ve.dom.remove(n);
					} else {
						n.deleteData(start, len);
					}

					// Nothing is partially selected, so collapse to start point
					this.collapse(true);
				}

				if(how == DELETE){
					return;
				}
				if(sub.length > 0){
					frag.appendChild(this.doc.createTextNode(sub));
				}
				return frag;
			}

			// Copy nodes between the start/end offsets.
			n = this._getSelectedNode(this.startContainer, this.startOffset);
			cnt = this.endOffset - this.startOffset;

			while (n && cnt > 0){
				sibling = n.nextSibling;
				xferNode = this._traverseFullySelected(n, how);
				if(frag){
					frag.appendChild(xferNode);
				}
				--cnt;
				n = sibling;
			}

			// Nothing is partially selected, so collapse to start point
			if(how != CLONE){
				this.collapse(true);
			}
			return frag;
		},

		_traverseCommonStartContainer: function(endAncestor, how){
			var frag, n, endIdx, cnt, sibling, xferNode;

			if(how != DELETE){
				frag = this.createDocumentFragment();
			}

			n = this._traverseRightBoundary(endAncestor, how);

			//todo
			if(frag){
				frag.appendChild(n);
			}

			endIdx = ve.dom.nodeIndex(endAncestor);
			cnt = endIdx - this.startOffset;
			if(cnt <= 0){
				if(how != CLONE){
					this.setEndBefore(endAncestor);
					this.collapse(false);
				}
				return frag;
			}

			n = endAncestor.previousSibling;
			while (cnt > 0){
				sibling = n.previousSibling;
				xferNode = this._traverseFullySelected(n, how);

				if(frag)
					frag.insertBefore(xferNode, frag.firstChild);

				--cnt;
				n = sibling;
			}

			// Collapse to just before the endAncestor, which
			// is partially selected.
			if(how != CLONE){
				this.setEndBefore(endAncestor);
				this.collapse(false);
			}

			return frag;
		},

		_traverseCommonEndContainer: function(startAncestor, how){
			var frag, startIdx, n, cnt, sibling, xferNode;

			if(how != DELETE)
				frag = this.createDocumentFragment();

			n = this._traverseLeftBoundary(startAncestor, how);
			if(frag)
				frag.appendChild(n);

			startIdx = ve.dom.nodeIndex(startAncestor);
			++startIdx; // Because we already traversed it

			cnt = this.endOffset - startIdx;
			n = startAncestor.nextSibling;
			while (n && cnt > 0){
				sibling = n.nextSibling;
				xferNode = this._traverseFullySelected(n, how);

				if(frag)
					frag.appendChild(xferNode);

				--cnt;
				n = sibling;
			}

			if(how != CLONE){
				this.setStartAfter(startAncestor);
				this.collapse(true);
			}

			return frag;
		},

		_traverseCommonAncestors: function(startAncestor, endAncestor, how){
			var n, frag, commonParent, startOffset, endOffset, cnt, sibling, nextSibling;

			if(how != DELETE)
				frag = this.createDocumentFragment();

			n = this._traverseLeftBoundary(startAncestor, how);
			if(frag)
				frag.appendChild(n);

			commonParent = startAncestor.parentNode;
			startOffset = ve.dom.nodeIndex(startAncestor);
			endOffset = ve.dom.nodeIndex(endAncestor);
			++startOffset;

			cnt = endOffset - startOffset;
			sibling = startAncestor.nextSibling;

			while (cnt > 0){
				nextSibling = sibling.nextSibling;
				n = this._traverseFullySelected(sibling, how);

				if(frag)
					frag.appendChild(n);

				sibling = nextSibling;
				--cnt;
			}

			n = this._traverseRightBoundary(endAncestor, how);

			if(frag)
				frag.appendChild(n);

			if(how != CLONE){
				this.setStartAfter(startAncestor);
				this.collapse(true);
			}

			return frag;
		},

		_traverseRightBoundary: function(root, how){
			var next = this._getSelectedNode(this.endContainer, this.endOffset - 1),
				parent, clonedParent, prevSibling, clonedChild, clonedGrandParent,
				isFullySelected = next != this.endContainer;

			if(next == root){
				return this._traverseNode(next, isFullySelected, false, how);
			}

			parent = next.parentNode;
			clonedParent = this._traverseNode(parent, false, false, how);

			while (parent){
				while (next){
					prevSibling = next.previousSibling;
					clonedChild = this._traverseNode(next, isFullySelected, false, how);

					if(how != DELETE){
						if(clonedParent.firstChild){
							clonedParent.insertBefore(clonedChild, clonedParent.firstChild);
						} else {
							clonedParent.appendChild(clonedChild);
						}
					}

					isFullySelected = true;
					next = prevSibling;
				}

				if(parent == root){
					return clonedParent;
				}

				next = parent.previousSibling;
				parent = parent.parentNode;

				clonedGrandParent = this._traverseNode(parent, false, false, how);

				if(how != DELETE){
					clonedGrandParent.appendChild(clonedParent);
				}
				clonedParent = clonedGrandParent;
			}
		},

		_traverseLeftBoundary: function(root, how){
			var next = this._getSelectedNode(this.startContainer, this.startOffset), isFullySelected = next != this.startContainer, parent, clonedParent, nextSibling, clonedChild, clonedGrandParent;

			if(next == root)
				return this._traverseNode(next, isFullySelected, true, how);

			parent = next.parentNode;
			clonedParent = this._traverseNode(parent, false, true, how);

			while (parent){
				while (next){
					nextSibling = next.nextSibling;
					clonedChild = this._traverseNode(next, isFullySelected, true, how);

					if(how != DELETE)
						clonedParent.appendChild(clonedChild);

					isFullySelected = true;
					next = nextSibling;
				}

				if(parent == root)
					return clonedParent;

				next = parent.nextSibling;
				parent = parent.parentNode;

				clonedGrandParent = this._traverseNode(parent, false, true, how);

				if(how != DELETE)
					clonedGrandParent.appendChild(clonedParent);

				clonedParent = clonedGrandParent;
			}
		},

		/**
         * 找到startContainer和endContainer的公共祖先节点
         * @param {Boolean} includeSelf
         * @param {DOM} ignoreTextNode
         * @return {DOM}
         */
        getCommonAncestor : function(includeSelf, ignoreTextNode) {
            var start = this.startContainer,
                end = this.endContainer;
            if (start === end) {
                if (includeSelf && start.nodeType == 1 && this.startOffset == this.endOffset - 1) {
                    return start.childNodes[this.startOffset];
                }
                return ignoreTextNode && start.nodeType == 3 ? start.parentNode : start;
            }
            return _getCommonAncestor(start, end);
        },

		/**
		 * 节点遍历
		 * @param  {DOM}  n			   dom节点
		 * @param  {Boolean} isFullySelected 是否为全选
		 * @param  {Boolean} isLeft		  [description]
		 * @param  {[type]}  how			 [description]
		 * @return {[type]}				  [description]
		 */
		_traverseNode: function(n, isFullySelected, isLeft, how){
			var txtValue, newNodeValue, oldNodeValue, offset, newNode;

			if(isFullySelected){
				return this._traverseFullySelected(n, how);
			}

			/* TEXT_NODE */
			if(n.nodeType == 3){
				txtValue = n.nodeValue;

				if(isLeft){
					offset = this.startOffset;
					newNodeValue = txtValue.substring(offset);
					oldNodeValue = txtValue.substring(0, offset);
				} else {
					offset = this.endOffset;
					newNodeValue = txtValue.substring(0, offset);
					oldNodeValue = txtValue.substring(offset);
				}

				if(how != CLONE){
					n.nodeValue = oldNodeValue;
				}
				if(how == DELETE){
					return;
				}

				newNode = ve.dom.clone(n, false, this.doc);
				newNode.nodeValue = newNodeValue;
				return newNode;
			}
			if(how == DELETE){
				return;
			}
			return ve.dom.clone(n, false, this.doc);
		},

		_traverseFullySelected: function(n, how){
			if(how != DELETE){
				return how == CLONE ? ve.dom.clone(n, true, this.doc) : n;
			}
			ve.dom.remove(n);
		}
	});

	/**
	 * 查找父级节点
	 * @param  {DOM} node
	 * @param  {String} tagName
	 * @return {DOM}
	 */
	var findParent = function(node, tagName){
		if(node.tagName == tagName){
			return node;
		}
		while((node = node.parentNode) && node.tagName != 'BODY'){
			if(node && node.tagName == tagName){
				return node;
			}
		}
	};

	/**
	 * 判定该节点是否换行
	 * @param {DOM} n
	 * @return {Boolean}
	**/
	var _isNewLineNode = function(n){
		if(n && n.nodeType == 1){
			return ve.dom.isBr(n) ||
				(ve.dtd.$block[n.tagName] && !n.style.display) ||
				ve.dtd.$displayBlock[n.style.display];
		}
		return false;
	};

	/**
	 * 分割文本节点
	 * 返回切割后半部分的节点
	 * @param {DOM} textNode 节点
	 * @param {integer} offset 分割offset
	 * @return {DOM}
	 */
	var _splitTextNode = function(textNode, offset){
		var doc = textNode.ownerDocument;
		if(ve.ua.ie && offset == textNode.nodeValue.length){
			var next = doc.createTextNode('');
			return ve.dom.insertAfter(textNode, next);
		}

		if(ve.ua.ie > 6){
			var node = textNode.cloneNode(false);
			node.deleteData(0, offset)
			textNode.deleteData(offset, textNode.length - offset);
			if(textNode.nextSibling){
				textNode.parentNode.insertBefore(node, textNode.nextSibling);
			} else {
				textNode.parentNode.appendChild(node);
			}
			return node;
		} else {
			return textNode.splitText(offset);
		}
	};

	/**
	 * 移除多余br
	 * [fix] ie8 text<br/>情况，去除br之后，text尾部不能聚焦
	 * @param   {Range} rng
	 * @param   {DOM} node
	 * @param   {String} ltr
	 */
	var _clearBr = function(rng, node, ltr){
		var tmp = node;
		while(tmp = tmp[ltr]){
			var nx = tmp[ltr];
			if(ve.dom.isBr(tmp)){
				if(!ve.dom.isBr(nx)){
					if(nx && nx.nodeType == 3 && ve.string.trim(nx.nodeValue)){
						var span = rng.doc.createElement('span');
						ve.dom.insertBefore(span, nx);
						span.appendChild(nx);
					}
				} else if(ve.dom.isDisplayBlock(nx)){
					//<br/><br/><block>  -> <div>&nbsp;</div><block>
					//这里会给用户产生多一次delete或者backspace才能删除该行
					var div = rng.doc.createElement('div');
					div.innerHTML = '&nbsp;';
					ve.dom.insertBefore(div, tmp);
					ve.dom.remove(nx);
				} else {
					//<inline>text<br/><block>  -> <inline>text<br/><span>&nbsp;</span><block>
					var br = rng.doc.createElement('BR');
					var span = rng.doc.createElement('span');
					span.innerHTML = '&nbsp;';
					ve.dom.insertBefore(span, tmp);
					ve.dom[ltr == 'previousSibling' ? 'insertBefore' : 'insertAfter'](br, span);
					ve.dom.remove(nx);
				}
				ve.dom.remove(tmp);
				break;
			} else if(!rng.isBookmarkNode(tmp)){
				break;
			}
		}
	};

	/**
	 * 从dom node中获取document
	 * @param  {DOM} node
	 * @return {Document}
	 */
	var _getDocFromDom = function(node){
		return ve.ua.ie ? node['document'] : node['ownerDocument'];
	};

	/**
	 * 移除填充节点
	 * @param {DOM} excludeNode 例外节点
	**/
	var _removeFillData = function(excludeNode){
		try{
			if (FILL_TMP_NODE && _getDocFromDom(FILL_TMP_NODE) == this.doc) {
				if(!FILL_TMP_NODE.nodeValue.replace(ve.fillCharReg, '').length){
					var tmpNode = FILL_TMP_NODE.parentNode;
					ve.dom.remove(FILL_TMP_NODE);
					while(tmpNode && _isEmptyInlineElement(tmpNode) && !tmpNode.contains(excludeNode)){
						FILL_TMP_NODE = tmpNode.parentNode;
						ve.dom.remove(tmpNode);
						tmpNode = FILL_TMP_NODE
					}

				}else
				FILL_TMP_NODE.nodeValue = FILL_TMP_NODE.nodeValue.replace(ve.fillCharReg, '')
			}
		}catch(e){}
	};

	/**
	 * 判断节点是否为空的内联节点
	 * @param   {DOM}  node
	 * @return  {Boolean}
	 */
	var _isEmptyInlineElement = function(node){
        if (node.nodeType != 1 || !ve.dtd.$removeEmpty[ node.tagName ]){
			return 0;
		}
        node = node.firstChild;
        while (node) {
            if (this.isBookmarkNode(node)){
				return 0;
			}
            if (node.nodeType == 1 && !_isEmptyInlineElement(node) || node.nodeType == 3 && !_isWhitespace(node)){
                return 0;
            }
            node = node.nextSibling;
        }
        return 1;
	};

	/**
	 * 是否为空白节点
	 * @param   {DOM}  node
	 * @return  {Boolean}
	 */
	var _isWhitespace = function(node){
		return !new RegExp('[^ \t\n\r' + ve.blankChar + ']').test(node.nodeValue);
	};


	/**
	 * 合并兄弟节点
	 * @param   {DOM} node
	 * @param   {String} dir  方向nextSibling|previousSibling
	 */
	var _mergSibling = function(node,dir){
		var tmpNode;
		node = node[dir];
		while(node && node.nodeType == 3 && !node.nodeValue.replace(new RegExp(ve.fillCharReg),'').length){
			tmpNode = node[dir];
			ve.dom.remove(node);
			node = tmpNode;
		}
	};


	/**
	 * 返回n的parent n级链接
	 * 这里会检测n必须为靠A最左或者最右
	 * @param {DOM} n
	 * @param {Boolean} left
	 * @return {DOM|null}
	 */
	var checkBoundaryLink = function(n, left){
		while(n.parentNode){
			if(n.parentNode[left ? 'firstChild' : 'lastChild'] == n){
				n = n.parentNode;
				if(n.tagName == 'A'){
					return n;
				}
			} else {
				return;
			}
		}
		return;
	}

	/**
	 * 调整链接边界
	 * 如 <a><b>[text</b>]</a> -> [<a><b>text</b></a>]
	 * @param  {Range} rng
	 * @param  {DOM} start
	 * @param  {Boolean} left
	 * @return {Boolean} 是否命中
	 */
	var adjustBoundaryLink = function(rng, start, left){
		var n = checkBoundaryLink(start, left);
		if(n){
			rng[left ? 'setStartBefore': 'setEndAfter'](n);
			return true;
		}
		return;
	};

	 /**
	 * 得到公共的祖先节点
	 * @param   {Node}     nodeA      节点A
	 * @param   {Node}     nodeB      节点B
	 * @return {Node} nodeA和nodeB的公共节点
	 */
	var _getCommonAncestor = function(nodeA, nodeB) {
		if (nodeA === nodeB){
			return nodeA;
		}
		var parentsA = [nodeA],
			parentsB = [nodeB],
			parent = nodeA,
			i = -1;
		while (parent = parent.parentNode) {
			if (parent === nodeB){
				return parent;
			}
			parentsA.push(parent)
		}
		parent = nodeB;
		while (parent = parent.parentNode) {
			if (parent === nodeA){
				return parent;
			}
			parentsB.push(parent)
		}
		parentsA.reverse();
		parentsB.reverse();
		while (i++,parentsA[i] === parentsB[i]);
		return i == 0 ? null : parentsA[i - 1];
	};

	/**
	 * 获取ie selection
	 * @return {Selection}
	 **/
	var _getIESelection = function(win, doc){
		return doc.selection;
	};

	/**
	 * 获取w3c selection
	 * @return {Selection}
	 **/
	var _getW3CSelection = function(win, doc){
		return win.getSelection();
	};

	/**
	 * 获取IE Range
	 * @param {DOM} win
	 * @param {DOM} Doc
	 * @return {Range}
	**/
	var _getIERange = function(win, doc){
		var rng, sel = _getIESelection(win, doc);
		try {
			rng = sel.createRange();
		}catch (ex) {};
		if (!rng){
			rng = doc.body.createTextRange();
		}
		return rng;
	};

	/**
	 * 获取W3C Range
	 * @param {DOM} win
	 * @param {DOM} Doc
	 * @return {Range}
	**/
	var _getW3CRange = function(win, doc){
		var rng, sel = _getW3CSelection(win, doc);
		try {
			if(sel){
				rng = sel.rangeCount > 0 ? sel.getRangeAt(0) : doc.createRange();
			}
		} catch(ex){};
		return rng;
	};

	/**
	 * 获取浏览器选区
	 * @param  {BOM} win
	 * @param  {DOM} doc
	 * @return {Selection}
	 */
	VEditor.Range.getNativeSelection = function(win, doc){
		return ve.ua.ie ? _getIESelection(win, doc) : _getW3CSelection(win, doc);
	};

	/**
	 * 获取浏览器范围
	 * @param  {BOM} win
	 * @param  {DOM} doc
	 * @return {Range}
	 */
	VEditor.Range.getNativeRange = function(win, doc){
		return ve.ua.ie ? _getIERange(win, doc) : _getW3CRange(win, doc);
	};
})(VEditor);