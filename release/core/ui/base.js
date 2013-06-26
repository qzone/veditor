(function(ve) {
	/**
	 * UI控件基类
	 */
	ve.lang.Class('VEditor.ui.Base', {
		/**
		 * 构造方法
		 * @param {Object} ed 编辑器实例对象
		 * @param {Object} s  配置
		 */
		Base: function(ed, s) {
			var t = this;
			ve.lang.each(['onLoad'], function (n) {
				t[n] = new ve.EventManager(t);
			});
		}
	})
})(VEditor);
