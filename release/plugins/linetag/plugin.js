/**
 * 换行
 * 当前只针对换行符为 div情况
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.LineTag', {
		editor: null,
		init: function (editor, url) {
			var _this = this;
			this.editor = editor;

			var _bind = function(addHistory){
				_this.editor.onKeyDown.add(function(e){
					if(e.keyCode == 13 && !e.ctrlKey){
						_this.editor.updateLastVERange();	//这里需要先update，才能保证addHistory里面的range正确
						addHistory && addHistory();
						_this.insertNewLine();	//这里写这个更新range的原因是：updateLastVERange是在keyup时触发，因此这里keydown管不到
						addHistory && addHistory();
						ve.dom.event.cancel(e);
						return false;
					}
				});
			};
			this.editor.tryIO('addHistory', _bind, _bind);
		},

		insertNewLine: function(){
			var rng = this.editor.getVERange();
			var brNode = rng.doc.createElement('br');

			if (!rng.collapsed) {
				rng.deleteContents();
				start = rng.startContainer;
				if (start.nodeType == 1 && (start = start.childNodes[rng.startOffset])) {
					while (start.nodeType == 1) {
						if (ve.dtd.$empty[start.tagName]) {
							rng.setStartBefore(start);
							rng.select();
							return false;
						}
						if (!start.firstChild) {
							start.appendChild(brNode);
							rng.setStart(start, 0);
							rng.select();
							return false;
						}
						start = start.firstChild
					}
					if (start === rng.startContainer.childNodes[rng.startOffset]) {
						rng.insertNode(brNode);
						rng.select();
					} else {
						rng.setStart(start, 0);
						rng.select();
					}
				} else {
					rng.insertNode(brNode);
					rng.setStartAfter(brNode);
					rng.select();
				}
			} else {
				rng.insertNode(brNode)

				var parent = brNode.parentNode;

				//[!] 这里会出现span过多的情况
				if (parent.lastChild === brNode) {
					var tmpNode = rng.doc.createElement('span');
					tmpNode.innerHTML = '&nbsp;';
					parent.appendChild(tmpNode);
					rng.setStart(tmpNode,0);
					rng.collapse(true);
					rng.select(true);
				} else if(ve.dom.isDisplayBlock(brNode.nextSibling)){
					var ps = brNode.previousSibling;

					//<br/>[brNode]<block> -> <span>&nbsp;</span><div>&nbsp;</div>
					if(ve.dom.isBr(ps)){
						var tmpNode = rng.doc.createElement('span');
						tmpNode.innerHTML = '&nbsp;';
						parent.appendChild(tmpNode);
					}

					//text[brNode]<block> -> <span>text</span><div>&nbsp;</div>
					else if(ps && ps.nodeType == 3){
						var tmpNode = rng.doc.createElement('span');
						ve.dom.insertAfter(tmpNode, ps);
						tmpNode.appendChild(ps);
					}

					//<block>text[brNode]<block>  -> <block>text<div>&nbsp;</div><block>
					if(ve.dom.isDisplayBlock(brNode.parentNode)){
						var div = rng.doc.createElement('div');
						div.innerHTML = '&nbsp;';
						ve.dom.insertBefore(div, brNode);
						ve.dom.remove(brNode);
						rng.setStart(div, 0);
					}

					//<inline>text[brNode]<block>  -> <inline>text<br/><span>&nbsp;</span><block>
					else {
						var span = rng.doc.createElement('span');
						span.innerHTML = '&nbsp;';
						ve.dom.insertBefore(span, brNode);
						ve.dom.insertBefore(brNode.cloneNode(), span);
						rng.setStart(span, 0);
					}
					rng.collapse(true);
					rng.select(true);
				}
				else {
					rng.setStartAfter(brNode)
					rng.select(true);
				}
			}
		}
	});
	ve.plugin.register('linetag', VEditor.plugin.LineTag);
})(VEditor);
