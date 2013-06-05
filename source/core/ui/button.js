(function(ve) {
	ve.lang.Class('VEditor.ui.Button:VEditor.ui.UIControl', {
		/**
		 * 按钮基类构造函数
		 * @param {String} id
		 * @param {Object} conf
		 */
		Button: function (id, conf) {
			var t = this;
			conf = ve.lang.extend({toggle: 1}, conf);
			this.base(id, conf)
			this.type = 'button';
			this.dom = document.createElement('span');	//预填充，防止没有render的按钮被执行了getDom的相关初始化操作
			this.classPrefix = 'veButton_';
			this.normalClass = 'veButton';
			this.overClass = 'veButton_over';
			this.enabledClass = 'veButton_enabled';
			this.disabledClass = 'veButton_disabled';
			this.activeClass = 'veButton_active';
			this.onClick = new ve.EventManager();
		},

		/**
		 * 渲染按钮
		 * @return {String}
		 */
		renderHTML: function () {
			var s = this.conf;
			var html = ([
				'<span tabindex="0" id="',this.id,'" class="',this.normalClass,' ',(s.disabled?this.disabledClass:this.enabledClass),' ',this.classPrefix+s['class'],'" title="', (s.title),'">',
					'<span class="veIcon ',s['class'],'">',(s.text||''),'</span>',
				'</span>'
			]).join('');
			return html;
		},

		/**
		 * 设置title
		 * @param {String} str
		 */
		setTitle: function(str){
			this.dom.title = str;
		},

		/**
		 * 绑定处理事件
		 **/
		bindHandler: function () {
			var _this = this;
			var t = this, s = t.conf;
			ve.dom.event.add(this.dom, 'click', function (e) {
				ve.dom.event.preventDefault(e);		//统一所有control出来的button采用preventDefault处理
				if (s.disabled || t.disabled){		//配置禁用，或者后期禁用
					return;
				}
				if(typeof(t.conf.cmd) == 'function'){
					t.conf.cmd.apply(_this);
				} else if(t.conf.cmd){
					t.conf.editor.editorcommands.execCommand(t.conf.cmd);
				}
				_this.onClick.fire(_this);
			});

			ve.dom.event.add(this.dom, 'mousedown', function(e) {
				t.onMouseDown.fire(t, e, s);
			});

			ve.dom.event.add(this.dom, 'mouseup', function(e) {
				t.onMouseUp.fire(t, e);
			});

			//初始态disabled
			if(s.disabled){
				return;
			}

			ve.dom.event.add(this.dom, 'mouseover', function (e) {
				if(!_this.disabled){
					ve.dom.addClass(_this.dom, _this.overClass);
					t.onMouseOver.fire();
				}
			});

			ve.dom.event.add(this.dom, 'mouseout', function (e) {
				if(!_this.disabled){
					ve.dom.removeClass(_this.dom, _this.overClass);
					t.onMouseOut.fire();
				}
			});
		}
	});
})(VEditor);