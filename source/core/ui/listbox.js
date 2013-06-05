(function(ve) {
	var dom = ve.dom;

	/**
	 * 一个listbox类
	 * items格式为一个二维数组[[1,'1', 'style', cmdfn]]
	 * 表示索引，显示text，显示样式，执行的自定义命令
	 */
	ve.lang.Class('VEditor.ui.ListBox:VEditor.ui.UIControl', {
		ListBox: function (id, conf) {
			conf = ve.lang.extend(true, {
				cmd: function(){},		//list命令
				ui: false,				//ui项
				items: [],				//菜单子项
				editor: null,			//所属编辑器对象
				onInit: null
			}, conf);

			//菜单面板id
			this.listboxid = id + '_panel';
			this.base(id, conf);

			this.dom = null;			//当前默认态的DOM
			this.panel = null;			//list面板
			this.classPrefix = 'veList';

			this.onChange = new ve.EventManager();
			this._createListPanel();
		},

		/**
		 * 渲染出列表默认态html数据
		 * @return {string}
		 */
		renderHTML: function(){
			var html = ([
				'<div class="',this.classPrefix,' ',this.classPrefix,this.conf['class'],'" id="',this.id,'">',
					'<div class="',this.classPrefix,'_current">',
						'<a href="javascript:;">',this.conf['title'],'</a>',
					'</div>',
					'<div class="',this.classPrefix,'_downicon">',
						'<a href="javascript:;"></a>',
					'</div>',
				'</div>']).join('');
			return html;
		},

		/**
		 * 获取菜单项HTML
		 * @param {array} item 数据[value, name, extAttributeStr, extClassName]
		 * @return {string}
		 */
		getListItemHtml: function(item, pos) {
			var name = item[1] || item[0],
				val = item[0],
				attr = item[2] || '',
				extClass = item[3] || '';
				iconStyle = item[4] || '';

			var html = ([
				'<div class="',this.classPrefix,'_item_con ',extClass,'" seq="',pos,'" value="',val,'">',
					'<a href="javascript:;" class="',this.classPrefix,'Item">',
						'<span class="sel_icon sel_icon_hidden" style="',iconStyle,'"><b>','\u221a','</b></span>',
						'<span class="item_cont" ',attr,'>',name,'</span>',
						'<span class="icon_suffix"></span>',
					'</a>',
				'</div>']).join('');
			return html;
		},

		/**
		 * 添加item
		 * @param {object} params {item:[], pos:'last'} pos支持：last, first, 和数字
		 */
		addItem: function(params) {
			var params = ve.lang.extend(true, {pos:'last'}, params);
			if (!params.item){
				return
			};
			if (params.pos == 'last'){
				params.pos = this.conf.items.length
			};
			if (params.pos == 'first'){
				params.pos = 0;
			};
			params.pos = Math.min(params.pos, this.conf.items.length);
			params.pos = Math.max(params.pos, 0);

			//追加数据到配置数组
			this.conf.items.splice(params.pos, 0, params.item);

			var list = ve.dom.selector('#' + this.listboxid)[0];
			if (list){
				var relItem = ve.dom.selector('>div', list),
					html = this.getListItemHtml(params.item, params.pos),
					item;
				if (!relItem[params.pos]) {
					item = ve.dom.insertHTML(relItem[params.pos - 1], 'afterend', html);
				} else {
					item = ve.dom.insertHTML(relItem[params.pos], 'beforebegin', html);
				}

				if(item){
					this.bindListItemEvent(item);
				}
			}
		},

		/**
		 * 设置caption
		 * @param {String} val
		 **/
		setCaption: function(val){
			var _this = this;
			var name = this.getNameByValue(val);

			//默认
			if(!name){
				name = this.conf.title;
				val = -1;
			}

			//设置菜单标题
			var listCaption = ve.dom.selector('.' + _this.classPrefix + '_current', _this.dom)[0];
			ve.dom.setHTML(listCaption, '<a value="' + val + '" href="javascript:;">' + name + '</a>');
		},

		/**
		 * 获取name
		 * @param {String} val
		 * @return {String}
		 **/
		getNameByValue: function(val){
			if(!val){
				return null;
			}
			var found, name;
			ve.lang.each(this.conf.items, function(item){
				if(item[0] == val){
					found = true;
					name = item[1] || item[0];
					return true;
				}
			});
			return found ? name : null;
		},

		/**
		 * 绑定菜单项事件
		 * 包括菜单项的点击、hover效果
		 * @param {object} listItem 菜单项DOM
		 */
		bindListItemEvent: function(listItem){
			var _this = this;

			ve.dom.event.add(listItem, 'click', function (e) {
				ve.dom.event.preventDefault(e);
				var seq = this.getAttribute('seq');
				var val = this.getAttribute('value');

				if(!seq || !val){
					return '';
				}

				//触发onChange事件
				_this.onChange.fire(_this, val);

				//执行菜单项绑定的处理函数
				if (typeof _this.conf.items[+seq][3] == 'function') {
					_this.conf.items[+seq][3].call(_this, _this.conf, this);
				}

				_this.setCaption(val);

				//标注当前选中菜单项class
				//标注当前菜单sel图标
				ve.dom.addClass(this, 'current');

				//移除当前菜单caption active状态
				ve.dom.removeClass(_this.dom,  _this.classPrefix + '_active');

				//隐藏当前整个菜单
				_this.hidePanel();
			});

			//over效果
			var _lastOverItem;
			var hoverClassName = this.classPrefix + '_item_over';
			ve.dom.event.add(listItem, 'mouseover', function(){
				if (_lastOverItem){
					ve.dom.removeClass(_lastOverItem,hoverClassName);
				}
				ve.dom.addClass(this, hoverClassName);
				_lastOverItem = this;
			});

			//over效果
			ve.dom.event.add(listItem, 'mouseout', function(){
				ve.dom.removeClass(this, hoverClassName);
			});
		},

		/**
		 * 隐藏菜单列表
		 **/
		hidePanel: function(){
			this.panel.style.display = 'none';
		},

		/**
		 * 显示菜单列表
		 **/
		showPanel: function(){
			this.panel.style.display = '';
		},

		/**
		 * 显示、隐藏列表+caption
		 * @param {Mix} show 缺省show，生效toggle功能
		 **/
		toggleList: function(show){
			if(this.disabled){
				return;
			}

			show = show === undefined ? this.panel.style.display == 'none' : !!show;

			if(show){
				var pos = ve.dom.getXY(this.dom);
				var size = ve.dom.getSize(this.dom);
				ve.dom.setStyles(this.panel, {
					display:'',
					top: (pos[1]+size[1]) + 'px',
					left: (pos[0]-1) + 'px'
				});
			} else {
				this.panel.style.display = 'none';
			}

			//菜单caption状态
			ve.dom[show ? 'addClass' : 'removeClass'](this.dom, this.classPrefix+'_active');

			//这个方法将在后续版本不再提供支持
			//没有意义哦哦哦哦哦
			if(show){
				this.conf.editor.onBeforeOpenListBox.fire();
			}
			return show;
		},

		/**
		 * 创建菜单列表面板
		 * 同时绑定菜单项的事件
		 **/
		_createListPanel: function(){
			var _this = this;
			var _class = this.classPrefix + ' ' + this.classPrefix+'_list ' + this.classPrefix+'_'+this.conf['class']+'_list';
			var html = '<div style="position:absolute; display:none" class="'+ _class + '" id="' + this.listboxid + '">';

			//title
			if(this.conf.title){
				html += '<div value="-1" class="veList_item_con"><a href="javascript:;" value="-1" class="' + this.classPrefix + 'Title">' + this.conf.title + '</a></div>';
			}

			//item
			ve.lang.each(this.conf.items, function (item, index) {
				html += _this.getListItemHtml(item, index);
			});
			html += '</div>';

			this.panel = ve.dom.insertHTML(document.body, 'beforeend', html);

			//bind item event
			var al = ve.dom.selector('.'+this.classPrefix+'_item_con', this.panel);
			ve.lang.each(al, function (item) {
				_this.bindListItemEvent(item);
			});
		},

		/**
		 * 更新当前菜单选中项、caption显示值
		 * @param {String} val
		 **/
		updateCurrentState: function(val){
			//更新caption
			this.setCaption(val);

			//更新panel
			var al = ve.dom.selector('.'+this.classPrefix+'_item_con', this.panel);
			ve.lang.each(al, function (item) {
				if(item.getAttribute('value') == val){
					ve.dom.addClass(item, 'current');
				} else {
					ve.dom.removeClass(item, 'current');
				}
			});
		},

		/**
		 * 绑定整个菜单的显示、隐藏关联事件
		 */
		bindHandler: function(){
			var t = this,
				_this = this,
				s = t.conf,
				cp = t.classPrefix,
				ed = s.editor,
				uid = this.listboxid,
				isFirstOpen = false;

			var icon = ve.dom.selector('.' + cp + '_downicon', this.dom),
				curr = ve.dom.selector('.' + cp + '_current', this.dom),
				d = ve.dom.get(uid),
				list = ve.dom.selector('.' + cp + '_list', this.dom);

			//caption hover效果
			ve.dom.event.add(this.dom, 'mouseover', function (e) {
				if(!t.disabled){
					ve.dom.addClass(this, cp + '_' + (s['overSuffix'] || 'over'));
					t.onMouseOver.fire();
				}
			});

			//caption hover效果
			ve.dom.event.add(this.dom, 'mouseout', function (e) {
				if(!t.disabled){
					ve.dom.removeClass(this, cp + '_' + (s['overSuffix'] || 'over'), '');
					t.onMouseOut.fire();
				}
			});

			//绑定caption点击显示、点击隐藏菜单事件
			ve.dom.event.add(this.dom, 'click', function(){
				_this.toggleList();
				ve.dom.event.preventDefault();
				return false;
			});

			//点击其他区域，隐藏菜单
			ve.dom.event.add(document, 'click', function(e){
				var tag = ve.dom.event.getTarget(e);
				if(!ve.dom.contains(_this.panel, tag) && !ve.dom.contains(_this.dom, tag)){
					_this.toggleList(false);
				}
			});

			//点击编辑区域，隐藏菜单
			this.conf.editor.onClick.add(function(){
				_this.toggleList(false);
			});
		}
	});
})(VEditor);