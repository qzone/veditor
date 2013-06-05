(function(ve) {
	/**
	 * 工具条管理类
	 * @deprecated 负责工具条创建、管理
	 */
	ve.lang.Class('VEditor.ui.ToolbarManager', {
		/**
		 * 构造方法
		 * @param {Object} ed   当前编辑器实例对象
		 * @param {Object} conf 配置项
		 */
		ToolbarManager: function(ed, conf) {
			var _this = this;
			this.editor = ed;
			this.conf = ve.lang.extend(true, {}, conf);
			this._lookupToolbars = [];
			this._uiControlCollection = {};

			//扩展toolbarManager的方法到editor
			ve.lang.each(['createToolbar','getToolbar','createButton','getButton','addUIControl','getUIControl'], function(method){
				_this.editor[method] = function(){
					return _this[method].apply(_this, ve.lang.arg2Arr(arguments));
				};
			});
		},

		/**
		 * 创建toolbar容器
		 * @param {Object} opt
		 **/
		createContainer: function(opt) {
			opt = opt || {};
			var div = ve.dom.create('div', {
				'class': (opt['class'] || '')+ ' '  + (this.conf['class'] || ''),
				'style': ve.lang.extend(opt['style'] || {}, {'overflow':'hidden'})
			});
			if(this.conf.width){
				ve.dom.setStyle(div, 'width', this.conf.width);
			}
			return div;
		},

		/**
		 * 获取工具条
		 * @param {String} id
		 **/
		getToolbar: function(id) {
			var foundTb;
			id = this.generateId(id);
			ve.lang.each(this._lookupToolbars, function(tb){
				if(tb.id == id){
					foundTb = tb;
					return false;
				}
			});
			return foundTb;
		},

		/**
		 * 查询control, 这里查到的是正在toolbar里面使用的control，
		 * 如果需要查询所有的，请使用getUIControlFromCollection
		 * @param {String} id
		 * @return {UIControl}
		**/
		getUIControl: function(id) {
			var id = this.generateId(id);
			var foundControl;
			ve.lang.each(this._lookupToolbars, function(tb){
				ve.lang.each(tb.uiControls, function(control){
					if(control.id == id){
						foundControl = control;
						return false;
					}
				});
				if(foundControl){
					return false;
				}
			});
			return foundControl;
		},

		/**
		 * alias for getUIControl
		 **/
		get: function(id){
			return this.getUIControl(id);
		},

		/**
		 * 查询所有的UI Control
		 * @deprecate 这里查询到的包含了在当前toolbar sets里面使用的和没有使用的
		 * @param {String} id
		 * @return {Object}
		 **/
		getUIControlFromCollection: function(id){
			return this._uiControlCollection[this.generateId(id)];
		},

		/**
		 * 添加按钮到toolbar
		 * @param {Object} btn 按钮
		 * @param {String} toolbarId
		 **/
		addButton: function(btn, toolbarId) {
			return this.addUIControl(btn, toolbarId);
		},

		/**
		 * 产生控件的别名id
		 * @param {String} id
		 * @return {String}
		**/
		generateId: function(id){
			return this.editor.id + '_' + id;
		},

		/**
		 * 创建Button，同时添加到ui collection集合中
		 * 如果按钮指定了to toolbar的话， 则也加入到相应的toolbar集合中
		 * @param {String} id
		 * @param {Object} option
		 * @return {VEditor.ui.Button}
		**/
		createButton: function(id, option) {
			option = ve.lang.extend(true, {editor: this.editor}, option || {});

			if (this.getUIControlFromCollection(id)){
				throw('BUTTON CONTROL ALREADY EXISTS');
			}

			var btn = new ve.ui.Button(this.generateId(id), option);
			if(option.onClick){
				btn.onClick.add(option.onClick);
			}

			if(option.to){
				this.addUIControl(btn, option.to);
			}
			this._addUIControlToCollection(btn);
			return btn;
		},

		/**
		 * 添加到uicontrolcollection库中
		 * @param {Object} control
		 **/
		_addUIControlToCollection: function(control){
			this._uiControlCollection[control.id] = control;
		},

		/**
		 * 创建toolbar，同时添加到toolbar集合中
		 * @param {String} id
		 * @param {Object} config
		 * @return {ve.UI.Toolbar}
		 **/
		createToolbar: function(id, config){
			var tb = this.getToolbar(id);
			config = config || {};
			if(!tb){
				tb = new ve.ui.Toolbar(this.generateId(id), config);
				this._lookupToolbars.push(tb);
			} else {
				tb.setConfig(config);
			}
			return tb;
		},

		/**
		 * 查询button控件
		 * @param {String} id
		 * @return {UIControl}
		 **/
		getButton: function (id) {
			return this.getUIControl(id);
		},

		/**
		 * 添加一个UIControl实例到指定 toolbar
		 * @param {Object} control
		 * @param {String} to
		 **/
		addUIControl: function(control, toolbarId) {
			var tb = this.getToolbar(toolbarId);
			if (!tb) {
				tb = this.createToolbar(toolbarId);
			}
			return tb.add(control);
		},

		/**
		 * 创建一个listbox，同时添加到ui collection中
		 * 如果按钮指定了to toolbar的话， 则也加入到相应的toolbar集合中
		 * @param {String} name
		 * @param {Object} conf
		 * @return {VEditor.ui.ListBox}
		**/
		createListBox: function(name, conf) {
			if(this.getUIControl(name)){
				return null;
			}

			conf = ve.lang.extend({
				editor: this.editor
			}, conf || {});

			var id = this.generateId(name);

			var list = new ve.ui.ListBox(id, conf);
			if(conf.onChange){
				list.onChange.add(conf.onChange);
			}
			if(conf.to){
				this.addUIControl(list, conf.to);
			}
			this._addUIControlToCollection(list);
			return list;
		},

		/**
		 * 获取所有工具条的uicontrol
		 **/
		getAllToolbarUIControls: function(){
			var arr = [];
			ve.lang.each(this._lookupToolbars, function (tb) {
				ve.lang.each(tb.uiControls, function(control){
					arr.push(control);
				});
			});
			return arr;
		},

		/**
		 * 初始化
		 * @param {Function} grep 过滤函数
		**/
		render: function(grep) {
			var t = this;
			grep = grep || function() {return true;};

			//按照group1, group2这种排序
			this._lookupToolbars.sort(function(a, b){
				var id1 = parseInt(a.id.replace(t.editor.id + '_group', ''), 10);
				var id2 = parseInt(b.id.replace(t.editor.id + '_group', ''), 10);
				if(id1 == id2){
					return 0;
				}
				return id1 > id2 ? 1 : -1;
			});

			ve.lang.each(t._lookupToolbars, function (tb) {
				tb.renderTo(t.editor.toolbarContainer);
				tb.uiControls.sort(function(a, b){		//按照at:0, at:1 这种排序
					var at1 = a.conf.at || 0;
					var at2 = b.conf.at || 0;
					if(at1 == at2){
						return 0;
					}
					return at1 > at2 ? 1 : -1;
				});

				ve.lang.each(tb.uiControls, function (control) {
					var b = grep(control);
					if (b === false){
						return;
					}
					control.renderTo(tb.dom);
				});
			});
		}
	});

	/**
	 * 工具条类
	 */
	ve.lang.Class('VEditor.ui.Toolbar:VEditor.ui.Container', {
		/**
		 * 构造方法
		 * @param {String} id
		 * @param {Object} s 配置项
		 */
		Toolbar: function (id, s) {
			this.base(id, s);
		},

		/**
		 * 渲染工具条结构
		 * @return {String}
		 */
		renderHTML: function () {
			var s = this.conf;
			var h = '<div id="' + this.id + '" class="veToolbar '+ (s['class']||'') + '">'
			return h + '</div>';
		}
	});
})(VEditor);