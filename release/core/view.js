(function(ve) {
	/**
	 * 视图管理
	 * 包含对编辑器各大视图组件的布局
	 **/
	ve.lang.Class('VEditor.ViewManager', {
		_lookup: {},
		urls: {},

		/**
		 * 注册一个视图管理器
		 * @param {String} name
		 * @param {Mix} t
		 **/
		register: function (name, t) {
			t = typeof t == 'string' ? ve.lang.resolve(t): t;
			this._lookup[name] = t;
		},

		/**
		 * 取的一个视图管理器
		 * @param {String} name
		 * @return {Object}
		 **/
		get: function(name){
			return this._lookup[name];
		}
	});

	/**
	 * 视图控制器
	 **/
	ve.lang.Class('VEditor.ViewControler', {
		ViewControler: function(){},
		renderUI: function(){}
	});

	ve.viewManager = new VEditor.ViewManager();
})(VEditor);