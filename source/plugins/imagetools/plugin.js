/**
 * 图片工具条插件
 * 包括图片混排，插入图片链接
 * TIPS: 当前图文混排结构在IE6下面有点问题
 * @author sasumi
 * @build 20110321
 */
(function(ve){
	ve.lang.Class('VEditor.plugin.ImageTools', {
		toolbar: null,
		editor: null,
		curImg: null,

		init: function(editor, url){
			var _this = this;
			this.editor = editor;

			//这里使用mouseup，因为VERange是在mouseup的时候更新的，
			//因为理论上这里也有可能在update之前生效的功能，
			this.editor.onMouseUp.addLast(function(e){
				var tag = ve.dom.event.getTarget(e);
				if(tag.tagName != 'IMG'){
					_this.curImg = null;
					_this.hideTools();
					return;
				}
				if(!_this.checkImageEditAviable(tag)){
					ve.dom.event.preventDefault(e);
					_this.hideTools();
					return;
				}
				_this.curImg = tag;
				_this.showTools();
			});

			ve.dom.event.add(document.body, 'click', function(){
				_this.hideTools();
			});

			this.editor.onKeyDown.add(function(e){
				_this.hideTools();
			});

			// 删除图片后的处理
			this.editor.onNodeRemoved.add(function() {
				_this.hideTools();
			});

			//去除多余的自定义属性
			//这块数据前期还是需要保留的。
			/**
			this.editor.onGetContent.add(function(str){
				str = str.replace(/<img([^>]+)>/ig, function(){
					try{
						var att = arguments[1].replace(/originHeight=[^\s^>]+/gi, '');
							att = att.replace(/originWidth=[^\s^>]+/gi, '');
						return '<img'+att+'>';
					} catch(err){
						console.log('err', err);
					}
				});
				return str;
			}, true);
			**/
		},

		/**
		 * 过滤可编辑图片格式
		 * @param {Object} node
		 * @return {Object}
		 */
		checkImageEditAviable: function(node){
			if( !node.tagName == 'IMG' ||
				/em\/e(\d{1,3}).gif/i.test(node.src) ||	//表情
				/blog_music/i.test(node.className) || 	//音乐
				/blog_video/i.test(node.className) ||
				/blog_flash/i.test(node.className)
			){
				return false;
			}
			return true;
		},

		/**
		 * 显示工具条
		 */
		showTools: function(){
			var _this = this;
			if(!this.toolbar){
				this.toolbar = document.createElement('div');
				document.body.appendChild(this.toolbar);
				this.toolbar.className = 'qzEditor_tips pic_tips';
				this.toolbar.innerHTML = ([
					'<ul class="pic_function" id="qzEditor_tips_pic_function">',
						'<li class="father_button pic_position">',
							'<a title="编辑图片位置" class="main_btn first" href="javascript:;">',
								'<span class="icon_sprite icon_pic_position"></span><em class="none">编辑图片位置</em>',
							'</a>',
							'<ol class="dropdown_functions">',
								'<li><a href="javascript:;" id="_pic_func_align_reset"><span class="icon_sprite icon_pic_reset"></span><em class="text_intro">默认</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_left"><span class="icon_sprite icon_pic_left"></span><em class="text_intro">居左</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_center"><span class="icon_sprite icon_pic_center"></span><em class="text_intro">居中</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_right"><span class="icon_sprite icon_pic_right"></span><em class="text_intro">居右</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_round_left"><span class="icon_sprite icon_pic_left_round"></span><em class="text_intro">居左环绕</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_align_round_right"><span class="icon_sprite icon_pic_right_round"></span><em class="text_intro">居右环绕</em></a></li>',
							'</ol>',
						'</li>',
						'<li class="father_button pic_size">',
							'<a title="编辑图片大小" class="main_btn first" href="javascript:;">',
								'<span class="icon_sprite icon_pic_size"></span><em class="none">编辑图片大小</em>',
							'</a>',
							'<ol class="dropdown_functions">',
								'<li><a href="javascript:;" id="_pic_func_original"><span class="icon_sprite icon_size_default"></span><em class="text_intro">默认</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_big"><span class="icon_sprite icon_size_full"></span><em class="text_intro">大</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_middle"><span class="icon_sprite icon_size_bigger"></span><em class="text_intro">中</em></a></li>',
								'<li><a href="javascript:;" id="_pic_func_small"><span class="icon_sprite icon_size_smaller"></span><em class="text_intro">小</em></a></li>',
							'</ol>',
						'</li>',
						'<li class="father_button pic_link ">',
							'<a class="main_btn" title="插入图片链接地址" href="javascript:;">',
								'<span class="icon_sprite icon_pic_link"></span><span class="none">插入图片链接地址</span>',
							'</a>',
							'<div class="dropdown_functions pic_link_item ">',
								'<strong class="title">链接地址:</strong>',
								'<input type="text" class="url"  style="padding:2px 1px; border:1px solid #bbb; border-right-color:#ddd; border-bottom-color:#ddd; border-radius:3px" id="_pic_func_link" value="http://"/>',
								'<input type="button" style="height:20px; width:40px; margin-left:5px;" value="设置" id="_pic_func_setLink_btn" />',
								'<input type="button" style="height:20px; width:40px; margin-left:5px;" value="删除" id="_pic_func_removeLink_btn" />',
							'</div>',
						'</li>',
					'</ul>'
				]).join('');
				var btns = ve.dom.get('qzEditor_tips_pic_function').getElementsByTagName('A');
				for(var i=0; i<btns.length; i++){
					if(ve.dom.hasClass(btns[i], 'main_btn')){
						var li = btns[i].parentNode;
						ve.dom.event.add(li, 'mouseover', function(){
							ve.dom.addClass(this, 'current');
							this.setAttribute('_hover', '1');
						});
						ve.dom.event.add(li, 'mouseout', function(){
							var _this = this;
							setTimeout(function(){
								if(!_this.getAttribute('_hover')){
									ve.dom.removeClass(_this, 'current');
								}
							},500);
							_this.removeAttribute('_hover', '1');
						});
						ve.dom.event.add(li, 'click', function(e){
							this.setAttribute('_hover', '1');
							ve.dom.event.cancel(e);
							return false;
						});
					}
				}

				//绑定调整位置事件
				ve.dom.event.add(ve.dom.get('_pic_func_align_reset'), 'click', function(){_this.setImgAlign(_this.curImg, 'full');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_left'), 'click', function(){_this.setImgAlign(_this.curImg, 'left');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_center'), 'click', function(){_this.setImgAlign(_this.curImg, 'center');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_right'), 'click', function(){_this.setImgAlign(_this.curImg, 'right');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_round_left'), 'click', function(){_this.setImgRound(_this.curImg, 'roundLeft');});
				ve.dom.event.add(ve.dom.get('_pic_func_align_round_right'), 'click', function(){_this.setImgRound(_this.curImg, 'roundRight');});

				//调整大小
				ve.dom.event.add(ve.dom.get('_pic_func_original'), 'click', function(){_this.setImgSize(_this.curImg);});
				ve.dom.event.add(ve.dom.get('_pic_func_big'), 'click', function(){_this.setImgSize(_this.curImg, 800);});
				ve.dom.event.add(ve.dom.get('_pic_func_middle'), 'click', function(){_this.setImgSize(_this.curImg, 500);});
				ve.dom.event.add(ve.dom.get('_pic_func_small'), 'click', function(){_this.setImgSize(_this.curImg, 300);});

				ve.dom.event.add(ve.dom.get('_pic_func_link'), 'keydown', function(e){
					if(e.keyCode == 13 && _this.curImg){
						_this.editor.editorcommands.execCommand('adjustLink',ve.dom.get('_pic_func_link').value);
						_this.hideTools();
					}
				});

				ve.dom.event.add(ve.dom.get('_pic_func_setLink_btn'), 'click', function(){
					if(_this.curImg){
						_this.editor.editorcommands.execCommand('adjustLink', ve.dom.get('_pic_func_link').value);
					}
					_this.hideTools();
				});
				ve.dom.event.add(ve.dom.get('_pic_func_removeLink_btn'), 'click', function(){
					if(_this.curImg){
						_this.editor.editorcommands.execCommand('adjustLink', '');
					}
					_this.hideTools();
				});
			}

			//初始化链接事件
			setTimeout(function(){
				_this.initLink();
			}, 10);
			this.updateToolsPosition(this.curImg);
		},

		/**
		 * 设置图片大小
		 * @param {object} img 图片对象
		 * @param {integer} boxSize 缩放容器的大小
		 */
		setImgSize: function(img, boxSize){
			this.editor.tryIO('addHistory', function(fn){return fn()});

			var oriH = img.getAttribute('originHeight') || img.height;
				oriH = parseInt(oriH, 10);
			var oriW = img.getAttribute('originWidth') || img.width;
				oriW = parseInt(oriW, 10);

			if(!boxSize){
				img.style.height = oriH + 'px';
				img.style.width = oriW + 'px';
			} else {
				img.style.width = boxSize + 'px';
				img.style.height = Math.ceil(boxSize*oriH/oriW) + 'px';
			}

			img.setAttribute('originHeight', oriH);
			img.setAttribute('originWidth', oriW);

			this.editor.tryIO('addHistory', function(fn){return fn()});

			this.updateToolsPosition(img);
			this.editor.resize();
			ve.dom.event.preventDefault();
		},

		/**
		 * 初始化链接事件
		 * @param {Object} img
		 */
		initLink: function(){
			var img = this.curImg;
			var link = ve.dom.getParent(img, function(node){
				if(node.tagName == 'A'){return true;}
			});

			if(ve.dom.isLinkNode(link)){
				ve.dom.get('_pic_func_link').value = link.href;
			} else {
				ve.dom.get('_pic_func_link').value = 'http://';
			}
		},

		/**
		 * 设置图片排版方式
		 * @param {Object} img
		 * @param {String} align
		 */
		setImgRound: function(img, align){
			var STYLE_HASH = {
				'roundLeft': {'float':'left'},
				'roundRight': {'float':'right'}
			};

			this.editor.tryIO('addHistory', function(fn){return fn()});
			ve.dom.setStyles(img,STYLE_HASH[align]);
			this.editor.tryIO('addHistory', function(fn){return fn()});

			this.updateToolsPosition(img);
			ve.dom.event.preventDefault();
		},

		/**
		 * 设置图片排版方式
		 * @param {DOM} img
		 * @param {String} align, left, right, center, full
		 **/
		setImgAlign: function(img, align){
			ve.dom.setStyles(img, {'float':'none'});
			this.editor.editorcommands.execCommand('justify'+align);
			this.updateToolsPosition(img);
			ve.dom.event.preventDefault();
		},

		/**
		 * 隐藏工具条
		 */
		hideTools: function(){
			if(this.toolbar){
				this.toolbar.style.display = 'none';
			}
		},

		/**
		 * 更新工具条位置
		 */
		updateToolsPosition: function(img){
			var toolbarRegion = ve.dom.getRegion(this.toolbar),
				iframeRegion = ve.dom.getRegion(this.editor.iframeElement);
			try {
				var imgRegion = ve.dom.getRegion(img);
				var styles = {
					display:'block',
					top: iframeRegion.top+imgRegion.top,
					left: iframeRegion.left+imgRegion.left
				};
				for(var i in styles){
					ve.dom.setStyle(this.toolbar, i, styles[i]);
				}
			} catch(ex){
				ve.dom.setStyle(this.toolbar, 'display', 'none');
			}
		}
	});
	ve.plugin.register('imagetools', VEditor.plugin.ImageTools);
})(VEditor);