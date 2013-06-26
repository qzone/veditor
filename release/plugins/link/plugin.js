/**
 * 超链接
 */
(function(ve) {
	ve.lang.Class('VEditor.plugin.link', {
		editor: null,
		pop: null,
		node: null,
		init: function(editor, url){
			var _this = this;
			this.editor = editor;

			this.btn = this.editor.createButton('link', {
				'class': 'veLink',
				title: '设置链接',
				cmd: function(){
					_this.showPanel(null, _this.btn.getDom());
				}
			});
			
			//添加到编辑器命令集合中
			ve.lang.each(['removeLink', 'addLink', 'adjustLink'], function(method){
				_this.editor.addCommand(method, function(){
					return _this[method].apply(_this, ve.lang.arg2Arr(arguments));
				});
			});

			//隐藏panel处理
			ve.dom.event.add(document.body, 'click', function(e){
				var target = ve.dom.event.getTarget(e);
				if(_this.pop){
					var popPanel = _this.pop.getDom();
					if(!ve.dom.contains(_this.editor.iframeContainer, target) &&
						!ve.dom.contains(popPanel, target) &&
						!ve.dom.contains(_this.btn.getDom(), target)
					){
						_this.closePanel();
					}
				}
			});

			//点击文档链接处，出现设置链接对话框
			this.editor.onClick.add(function(e){
				var link = ve.dom.event.getTarget(e);
				if(link.tagName == 'IMG'){
					_this.closePanel();
					return;
				}
				var aLink = ve.dom.getParent(link, function(node){
					if(node.tagName == 'A' && !(node.getAttribute('uin') || node.getAttribute('link'))){
						return true;
					}
				});
				if(!ve.dom.isLinkNode(aLink)){
					_this.closePanel();
				} else {
					_this.node = aLink;
					var href = aLink.href;
					var region = ve.dom.getRegion(aLink);
					var iframeRegion = ve.dom.getRegion(_this.editor.iframeContainer);
					_this.showPanel(href, null, {top:region.top+iframeRegion.top+region.height, left:region.left+iframeRegion.left});
					ve.dom.event.preventDefault(e);
					return false;
				}
			});
		},

		/**
		 * 显示面板
		 * @param {String} link
		 * @param {Object} node
		 * @param {Object} config
		 */
		showPanel: function(link, node, config){
			var config = ve.lang.extend({left:0,top:0}, config || {});
			var html = ([
				'<div id="ed-insert-link-panel"><strong>设置超链接</strong>',
				'<div>',
					'<input type="text" id="link-val" style="padding:2px 1px; border:1px solid #bbb; border-right-color:#ddd; border-bottom-color:#ddd; border-radius:3px"/>',
					'<input type="button" value="设置" id="link-submit-btn" style="height:20px; width:40px; margin-left:5px;" title="设置链接"/>',
					'<input type="button" value="删除" id="link-remove-btn" style="height:20px; width:40px; margin-left:5px;" title="删除链接"/>',
				'</div></div>'
			]).join('');

			if(!this.pop){
				this.pop = ve.ui.showSimplePopup(this.editor, node, {content: html, height:70, width:320});
				this.setupEvent(this.pop.getDom());
			}
			ve.dom.get('link-val').value = link || 'http://';
			this.pop.show();
			if(node){
				var region = ve.dom.getRegion(node);
				config = ve.lang.extend(config||{},{left:region.left, top:region.top+region.height});
			}

			//避免iframe遮蔽
			var editorWidth = ve.dom.getSize(this.editor.iframeContainer)[0];
			var editorLeft = ve.dom.getXY(this.editor.iframeContainer)[0];
			var popWidth = ve.dom.getSize(this.pop.getDom())[0];

			if((editorWidth - (config.left - editorLeft)) < popWidth){
				config.left = editorLeft + editorWidth - popWidth;
			}
			this.pop.show(config);
		},

		/**
		 * 关闭面板
		 */
		closePanel: function(){
			this.node = null;
			if(this.pop){
				this.pop.hide();
			}
		},

		/**
		 * 添加链接
		 * @param {String} link 链接地址，必须是protocol://开始
		 * @param {String} text 链接文字
		 */
		addLink: function(link, text){
			text = text || link;

			var rng = this.editor.getVERange();

			if(ve.ua.ie == 6){
				var start, end;
				var start = rng.startContainer.nodeType == 3 ? rng.startContainer.parentNode : rng.startContainer.childNodes[rng.startOffset];
					start = start || rng.startContainer;
				var end = rng.endContainer.nodeType == 3 ? rng.endContainer.parentNode : rng.endContainer.childNodes[rng.endOffset-1];

				start = start.nodeType == 3 ? start.parentNode : start;
				end = end.nodeType == 3 ? end.parentNode : end;

				if(start.parentNode == end.parentNode && start.parentNode.tagName == 'A'){
					start = start.parentNode;
					end = end.parentNode;
				}

				if(start == end && start.tagName == 'A'){
					start.href = link;
					start.title = text;
					return;
				}
			}

			this._enlargeRngToA(rng);
			rng.removeInlineStyle('a');
			if(rng.collapsed){
				var a = this.editor.getDoc().createElement('a');
					a.href = link;
					a.title = text;
					a.innerHTML = text;
				rng.insertNode(a);
				rng.selectNode(a);
			} else {
				rng.setInlineAttr('a', {href:link, title:text});
			}

			rng.collapse();
			rng.select();
			this.editor.showStatusbar('链接设置成功', 3);
		},

		/**
		 * 找父节点A
		 * @param {Rang} rng
		 **/
		_enlargeRngToA: function(rng){
			ve.dom.getParent(rng.startContainer, function(node){
				if(node.nodeType == 1 && node.tagName == 'A'){
					rng.setStartBefore(node);
					return true;
				}
			});
			ve.dom.getParent(rng.endContainer, function(node){
				if(node.nodeType == 1 && node.tagName == 'A'){
					rng.setEndAfter(node);
					return true;
				}
			});
			rng.removeBookmark();
		},

		/**
		 * 删除链接
		 * @deprecate 删除链接之后，会选中改链接的文本区域
		 **/
		removeLink: function(){
			var rng = this.editor.getVERange();
			this._enlargeRngToA(rng);

			//特殊情况处理
			if(rng.startContainer == rng.endContainer){
				var start = rng.startContainer.childNodes[rng.startOffset];
				var end = rng.endContainer.childNodes[rng.endOffset];
				var startIndex = ve.dom.nodeIndex(start);
				var endIndex = ve.dom.nodeIndex(end);
				var as = [];

				if(ve.dom.isLinkNode(start)){
					as.push(start);
				}
				if(ve.dom.isLinkNode(end) && start != end){
					as.push(end);
				}
				for(var i=startIndex; i<endIndex; i++){
					var tmp = rng.startContainer.childNodes[i].getElementsByTagName('A') || [];
					as.concat(tmp);
				}

				var bookmark = rng.createBookmark();
				ve.lang.each(as, function(a){
					ve.dom.remove(a, true);
				});
				rng.moveToBookmark(bookmark);
			} else {
				try {
					var bookmark = rng.createBookmark();
					rng.removeInlineStyle(['a']);
					rng.moveToBookmark(bookmark);
				} catch(ex){};
			}

			rng.collapse();
			rng.select();
			this.editor.showStatusbar('链接删除成功', 3);
		},

		/**
		 * 添加、删除链接
		 **/
		adjustLink: function(link){
			if(!link || link.toLowerCase() == 'http://'){
				this.removeLink();
			} else {
				text = link;
				link = link.indexOf('://') > 0 ? link : 'http://'+link;
				this.addLink(link, text);
			}
		},

		/**
		 * 设置面板元素事件
		 * @param {Object} container
		 */
		setupEvent: function(container){
			var _this = this;
			ve.dom.event.add(ve.dom.get('link-val'), 'keydown', function(e){
				var e = e || window.event;
				if(e.keyCode == ve.dom.event.KEYS.RETURN){
					ve.dom.event.preventDefault(e);
					_this.editor.editorcommands.execCommand('adjustLink', ve.dom.get('link-val').value);
					_this.closePanel();
				}
			});

			ve.dom.event.add(ve.dom.get('link-submit-btn'), 'click', function(e){
				_this.editor.editorcommands.execCommand('adjustLink', ve.dom.get('link-val').value);
				_this.closePanel();
			});

			ve.dom.event.add(ve.dom.get('link-remove-btn'), 'click', function(e){
				_this.editor.editorcommands.execCommand('adjustLink');
				_this.closePanel();
			});
		}
	});
	ve.plugin.register('link', VEditor.plugin.link);
}) (VEditor);