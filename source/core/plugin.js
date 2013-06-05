(function(ve){
	var _PLUGINS = {};

	/**
	 * 插件管理器
	 * 主要包含插件的加载功能能
	 */
	ve.lang.Class('VEditor.PluginManager', {
		PluginManager: function(){},

		/**
		 * 加载插件
		 * @param {string} name 插件名称(插件文件夹)
		 * @param {string} folder 插件路径
		 * @param {function} callback
		 */
		add: function (name, folder, callback) {
			if(this.get(name)){
				callback();
			}
			var url = this.parsePluginPath(name, folder);
			ve.net.loadScript(url, callback);
		},

		/**
		 * 解析插件路径
		 * @param  {String} name
		 * @param  {String} folder
		 * @return {String}
		 */
		parsePluginPath: function(name, folder){
			var path = name;
			if (!/^https?\:\/\//.test(name)) {
				path = 'plugins/' + (folder || name) + '/plugin.js';
			}
			return ve.getAbsPath(path);
		},

		/**
		 * 获取插件类
		 * @param  {String} name
		 * @return {Function}
		 */
		get: function(name){
			return _PLUGINS[name];
		},

		/**
		 * 注册插件
		 * @param  {String} n 插件名称
		 * @param  {Function} t 插件类
		 */
		register: function (n, t) {
			t = typeof t == 'string' ? ve.lang.resolve(t): t;
			_PLUGINS[n] = t;
		},

		/**
		 * 取消注册
		 * @param  {String} n
		 */
		unRegister: function(n){
			delete _PLUGINS[n];
		}
	});
	ve.plugin = new VEditor.PluginManager();
})(VEditor);
