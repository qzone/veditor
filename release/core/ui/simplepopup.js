(function(ve) {
	var GUID = 1;
	ve.lang.Class('VEditor.ui.SimplePopup', {
		SimplePopup: function (ed, el, s) {
			var t = this;
			this.editor = ed;
			this.el = el;
			this.conf = ve.lang.extend({
				src: '',
				content: '',
				width: '300px',
				canClose: true,
				height: '200px'
			}, s || {});
			this.d = this._renderDOM();
		},

		/**
		 *  显示popup
		 * @param {Object} s 样式配置
		 */
		show: function(s) {
			if(s){
				ve.dom.setStyles(this.d, s);
			}
			this.d.style.display = 'block';
		},

		/**
		 * 隐藏popup
		 */
		hide: function () {
			this.d.style.display = 'none';
		},

		/**
		 * 获取当前popup DOM
		 */
		getDom: function(){
			return this.d;
		},

		/**
		 * 渲染DOM结构
		 */
		_renderDOM: function () {
			var t = this, str, attrs,
				id = 'qzonesimplepopup_' + (GUID++), html;
			var top = 0; left = 0;
			if(t.el){
				elpos = ve.dom.getXY(t.el);
				elsize = ve.dom.getSize(t.el);
				top = elpos[1] + elsize[1];
				left = elpos[0];
			}

			attrs = {
				'class': 'simplepopupcon',
				'id': id,
				style: {position: 'absolute', left:left, top:top, width:t.conf.width, height:t.conf.height, display:'none'}
			};
			if (t.conf.canClose) {
				html = '<div class="close_con"><a href="#" class="close_icon">x</a></div>';
			}
			if (t.conf.src) {
				html += '<div class="iframe_con"><iframe src="' + t.conf.src + '" width="' + t.conf.width + '" height="' + t.conf.height + '" frameborder="0"></iframe></div>';
			}
			else if (t.conf.content){
				html += '<div class="content_con">' + t.conf.content + '</div>';
			}
			var popup = ve.dom.create('div', attrs, html);
			ve.dom.event.add(popup, 'click', function(e) {
				ve.dom.event.preventDefault(e);
				return false;
			});
			document.body.appendChild(popup);
			var icons = ve.dom.find('#' + id + ' a.close_icon');
			ve.lang.each(icons, function(icon){
				ve.dom.event.add(icon, 'click', function(e){
					t.hide();
					ve.dom.event.preventDefault(e);
					return false;
				});
			});
			ve.dom.event.add(document.body,'keydown', function(e){
				var e = e || window.event;
				if(e.keyCode == 0x1B){
					t.hide();
					ve.dom.event.preventDefault(e);
				}
			});
			return popup;
		}
	});

	ve.ui.showSimplePopup = function(ed, el, conf) {
		return new VEditor.ui.SimplePopup(ed, el, conf);
	}
})(VEditor);