(function(ve) {
	/**
	 * UIControl 控件基类
	 * @deprecated 按钮、工具条等都有此类派生而来
	 */
	ve.lang.Class('VEditor.ui.UIControl', {
		/**
		 * 构造方法
		 * @param {String} id 控件ID
		 * @param {Object} s  配置项
		 */
		UIControl : function(id, s) {
			var _this = this;
			this.id = id;		//控件ID
			this.dom = null;	//控件DOM
			this.active = 0;	//当前状态
			this.conf = s || {
				toggle: false	//是否可切换状态
			};

			this.disabled = !!this.conf.disabled;
			this.rendered = false;

			//状态类名
			this.normalClass = '';
			this.overClass = 'veControlOver';
			this.enabledClass = 'veControlEnabled';
			this.disabledClass = 'veControlDisabled';
			this.activeClass = 'veControlActive';

			ve.lang.each('onClick,onMouseDown,onKeyDown,onKeyUp,onKeyPress,onMouseOver,onMouseOut,onMouseUp'.split(','), function (n) {
				_this[n] = new ve.EventManager();
			})
		},

		/**
		 * 隐藏
		 */
		hide: function(){
			if (this.dom) {
				ve.dom.setStyle(this.dom, 'display', 'none');
			}
		},

		/**
		 * 显示
		 */
		show: function(){
			if (this.dom) {
				ve.dom.setStyle(this.dom, 'display', 'block');
			}
		},

		/**
		 * 获取DOM
		 * @return {DOM}
		 */
		getDom: function(){
			return this.dom;
		},

		/**
		 * 设置组件disable
		**/
		setDisable: function(){
			if(this.dom){
				ve.dom.removeClass(this.dom, this.enabledClass);
				ve.dom.removeClass(this.dom, this.activeClass);
				ve.dom.addClass(this.dom, this.disabledClass);
				this.disabled = true;
			}
		},

		/**
		 * 设置组件enable
		 **/
		setEnabled: function(){
			if(this.dom){
				ve.dom.addClass(this.dom, this.enabledClass);
				ve.dom.removeClass(this.dom, this.activeClass);
				ve.dom.removeClass(this.dom, this.disabledClass);
				this.disabled = false;
			}
		},

		bindHandler: function(){},
		renderHTML: function(){},
		renderDOM: function(){},

		/**
		 * 渲染控件并绑定处理事件
		 * @param {DOM} n 需要渲染到的容器
		 * @param {String} where 位置
		 * @param {DOM} rela 关联dom
		 **/
		renderTo: function(n, where, rela) {
			if (!n || !n.nodeType ){
				return;
			}

			var html = this.renderHTML(),  node;

			if (!html) {
				node = this.renderDOM();
				this.dom = node;
				if (!node){
					return;
				}
				if (node.nodeType == 1) {
					if (rela && rela.nodeType == 1) {
						switch(where) {
							case 'before':
							case 0:
								n.insertBefore(node, rela);
								break;
							case 'after':
							case 1:
								if (rela.nextSibling) {
									n.insertBefore(node, rela.nextSibling);
								}
								else {
									n.appendChild(node);
								}
								break;
							default:
								break;
						}
					} else {
						n.appendChild(node);
					}
				}
			}

			else {
				var tmpContainer = document.createElement('div'), f;
					tmpContainer.innerHTML = html;

				for (var i = 0; i < tmpContainer.childNodes.length; i++) {
					if (tmpContainer.childNodes[i].nodeType == 3) {
						tn = document.createTextNode(tmpContainer.childNodes[i]);
					} else {
						tn = tmpContainer.childNodes[i];
					}

					if (rela && rela.nodeType == 1) {
						switch(where) {
							case 'before':
							case 0:
								n.insertBefore(tn, rela);
								break;
							case 'after':
							case 1:
								if (rela.nextSibling) {
									n.insertBefore(tn, rela.nextSibling);
								}
								else {
									n.appendChild(tn);
								}
								break;
							default:
								break;
						}
					} else {
						n.appendChild(tn);
					}
					this.dom = tn;
				}
			}
			if(this.conf.onInit){
				this.conf.onInit.apply(this);
			}
			this.bindHandler();
		},

		/**
		 * 删除当前控件
		 * @deprecate 该方法当前未被使用
		 **/
		remove : function() {
			ve.dom.remove(this.dom);
			//this.destroy();
		},

		/**
		 * 切换active状态
		 **/
		toggleActive: function(){
			if(!this.conf.toggle && !this.disabled){
				return;
			}
			this[this.active ? 'setUnActive' : 'setActive']();
			return this.active;
		},

		/**
		 * 设置为active状态
		 **/
		setActive: function(){
			if(!this.conf.toggle && !this.disabled){
				return;
			}
			this.active = 1;
			ve.dom.addClass(this.dom, this.activeClass);
		},

		/**
		 * 设置为unActive状态
		 **/
		setUnActive: function(){
			if(!this.conf.toggle && !this.disabled){
				return;
			}
			this.active = 0;
			ve.dom.removeClass(this.dom, this.activeClass);
		}
	});
})(VEditor);