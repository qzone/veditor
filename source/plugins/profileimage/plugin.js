/**
 * 剪贴板
 */
(function(ve) {
	var xExtend = QZONE.FP._t.xExtend || function() {
		var args = arguments, a0 = args[0], a1 = args[1], a2 = args[2];
		// 第一个参数是函数类型，那么此时为类继承，并且第一个参数就是基类
		// 此时需要第二个参数是子类信息
		if (typeof a0 == 'function') { 
			a1 = a1 || {};
			if (/function|number|string|undefined/.test(typeof a1))
				return;
				
			var f, de, c, spargs;

			// 对没有指定constructor的，指定默认的无参空构造函数
			if ('function' != typeof a1['_constructor']) { 
				f = function() {
					a0.apply(this, arguments)
				}
			}
			else {
				// 对用户的构造函数进行一次封装，使其可以自动调用父类的构造函数
				// 这是OO的基础，new子类的时候一定是先调用父类的构造函数
				f = function() {				
					// 保存构造函数的参数
					spargs = arguments;

					//调用父类构造函数
					a0.apply(this, spargs);

					// 调用构造函数
					a1['_constructor'].apply(this, spargs);
				}
			}

			// 加入基类的成员
			// 也可以将prototype方法逐一复制到f的prototype上，此时无法修正instanceof属性
			// 不可以继承父类的非prototype属性和方法
			// 使用for-in复制prototype的好处是避免调用一次父类的构造函数
			// 坏处是无法修正instanceof属性，子类 instanceof 父类居然是false
			for (var i in a0.prototype) {
				f.prototype[i] = a0.prototype[i];
			}
			
			// 父类指针
			f.prototype.base = a0;

			// 加入prototype方法
			var grap = /^name|_constructor|static|base$/;
			for (var i in a1) {
				if (grap.test(i)) 
					continue;
				f.prototype[i] = a1[i];
			}
			
			// 加入有静态成员
			if (a1['static']) {
				for (var i in a1['static']) 
					f[i] = a1['static'][i];
			}
			// 可选参数，向外部环境注册类名。
			// #1。用户需要全局名称并且全局空间不存在
			// #2。如果指定的外部为对象，则将类附加到该对象上
			if ('undefined' != typeof a1['name'] && /^[a-zA-Z]\w*$/.test(a1['name'])) {
				var s = 'object' == typeof a1['scope'] && a1['scope'] || window;
				s[a1['name']] = f;
			}
			return f;
		}
		// 以下走正常的extend逻辑
	};
	var EventManager = QZONE.FP._t.EventManager || xExtend(function(){}, {
		_constructor: function () {
			this.list = [];
		},

		addFirst: function (fn) {
			this.list.unshift(fn);
		},

		add: function (fn) {
			this.list.push(fn);
		},

		fire: function () {
			var a = arguments, r;
			QZFL.object.each(this.list, function (fn) {
				r = fn.apply(a[0] || this, Array.prototype.slice.call(a, 1));
			});
			return r;
		},

		remove: function(fn) {
			var t = this;
			QZFL.object.each(this.list, function (f, i) {
				if (fn == f) {
					t.list.splice(i, 1);
					return false;
				}
			});
		},

		clear: function () {
			this.list = [];
		},

		'name': 'EventManager'
	});

	var PicSelect = xExtend(function(){}, {
		_constructor: function(title) {
			this.onOpenPopup = new EventManager();
			this.onSelectPic = new EventManager();
			this.title = title;
		},

		openPopup: function() {
			var t =this, url = 'http://ctc.qzs.qq.com/qzone/mall/v5/video/upload_diy.htm?tab=1', strHtml = '<iframe id="chose_photo_cover" frameborder="0" src="' + url + '" allowTransparency="true" style="width:490px;height:480px"></iframe>';
			var popupID = QZONE.FP.popupDialog(popupID || "选择自定义" + t.title, strHtml, 490, 480, null, true);
			//QZONE.FrontPage.popupDialog("选择自定义" + (isSkin ? '皮肤' : '标题栏'), strHtml, 490, 480);
	//		QZONE.FP.clearPopupFn(popupID);
			QZONE.FP.appendPopupFn(function(){
				var us, url = QZONE.FP._t.g_XDoc && (us = QZONE.FP._t.g_XDoc["selectPhotos"]) && us.length && us[0] ? QZFL.string.trim(us[0]) : '';
				t.onSelectPic.fire(t, url);
				QZONE.FP._t.g_XDoc["selectPhotos"] = null;
			});
			return false;
		}
	});
	ve.lang.Class('VEditor.plugin.profileimage', {
		editor:null,
		pop: null,
		iframeDoc: null,
		url: null,
		init: function (editor, url) {
			var _this = this;
			
			this.editor = editor;
			this.editor.onInitComplete.add(function(){
				_this.editor.toolbarContainer.className = 'editor_tools simple_mode';
			});

			editor.createButton('selectProfileImage', {
				'class': 'veInsertImage',
				title: '插入图片',
				cmd: function(){
					var ed = _this.editor;
					var pic = new PicSelect('选图片');
					pic.onSelectPic.add(function(url){
						if(url.length != 0){
							ed.insertHtml({content:'<img src="'+url+'"/>'});
						}
					});
					pic.openPopup();
				}
			});
		}
		
	});
	ve.plugin.register('profileimage', VEditor.plugin.profileimage);
}) (VEditor);